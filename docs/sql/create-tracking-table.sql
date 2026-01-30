-- Tipos ENUM para los hitos y estados
DO $$ BEGIN
    CREATE TYPE shipment_milestone AS ENUM (
        'reserva_confirmada', 
        'unidad_asignada', 
        'unidad_en_planta', 
        'despachado_planta', 
        'ingresada_stacking', 
        'unidad_embarcada', 
        'zarpe_nave', 
        'arribo_destino'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE milestone_status AS ENUM ('SI', 'PENDIENTE', 'NO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tabla de eventos de seguimiento
CREATE TABLE IF NOT EXISTS shipment_tracking_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registro_id UUID NOT NULL REFERENCES registros(id) ON DELETE CASCADE,
    milestone shipment_milestone NOT NULL,
    status milestone_status DEFAULT 'PENDIENTE',
    event_date TIMESTAMPTZ,
    observation TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id),
    UNIQUE(registro_id, milestone)
);

-- Habilitar RLS
ALTER TABLE shipment_tracking_events ENABLE ROW LEVEL SECURITY;

-- Índices
CREATE INDEX IF NOT EXISTS idx_tracking_registro_id ON shipment_tracking_events(registro_id);

-- Políticas RLS

-- 1. ADMIN (Ve todo)
CREATE POLICY "Admins have full access on tracking" ON shipment_tracking_events
    FOR ALL TO authenticated
    USING ( (SELECT rol FROM usuarios WHERE auth_user_id = auth.uid()) = 'admin' );

-- 2. EJECUTIVO (Ve clientes asignados)
CREATE POLICY "Executives view assigned clients tracking" ON shipment_tracking_events
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM registros r
            JOIN usuarios u ON u.auth_user_id = auth.uid()
            WHERE r.id = shipment_tracking_events.registro_id
            AND (
                r.shipper = ANY(u.clientes_asignados)
                OR u.rol = 'admin' -- Redundante por la política de arriba pero seguro
            )
        )
    );

-- 3. CLIENTE (Ve sus propios registros)
CREATE POLICY "Clients view own shipments tracking" ON shipment_tracking_events
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM registros r
            JOIN usuarios u ON u.auth_user_id = auth.uid()
            WHERE r.id = shipment_tracking_events.registro_id
            AND r.shipper = u.cliente_nombre
        )
    );
