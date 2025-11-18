-- =====================================================
-- CREACIÓN DE TABLA DE ITINERARIOS
-- =====================================================
-- Tabla para gestionar itinerarios de servicios marítimos
-- con seguimiento de naves, viajes y escalas (PODs)
-- =====================================================

-- Crear extensión gen_random_uuid si no existe
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabla principal de itinerarios (viajes)
CREATE TABLE IF NOT EXISTS itinerarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servicio TEXT NOT NULL,                    -- Ej: "AX2/AN2", "ANDES EXPRESS"
  consorcio TEXT,                            -- Ej: "MSC + Hapag + ONE"
  nave TEXT NOT NULL,                        -- Nombre de la nave
  viaje TEXT NOT NULL,                      -- Código del viaje (ej: "FA532R")
  semana INTEGER,                           -- Semana del año
  pol TEXT NOT NULL,                        -- Puerto de origen
  etd TIMESTAMPTZ,                          -- Fecha estimada de zarpe
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT,
  
  -- Constraint único: un viaje de una nave es único
  CONSTRAINT unique_nave_viaje UNIQUE (nave, viaje)
);

-- Tabla de escalas (PODs) de cada itinerario
CREATE TABLE IF NOT EXISTS itinerario_escalas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerario_id UUID NOT NULL REFERENCES itinerarios(id) ON DELETE CASCADE,
  puerto TEXT NOT NULL,                     -- Código del puerto (ej: "YOKO", "NING", "HKG")
  puerto_nombre TEXT,                       -- Nombre completo del puerto
  eta TIMESTAMPTZ,                          -- Fecha estimada de arribo
  dias_transito INTEGER,                    -- Días de tránsito desde POL
  orden INTEGER NOT NULL,                   -- Orden de la escala (1, 2, 3...)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint único: un puerto no puede repetirse en el mismo itinerario
  CONSTRAINT unique_itinerario_puerto UNIQUE (itinerario_id, puerto)
);

-- Índices para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_itinerarios_servicio ON itinerarios(servicio);
CREATE INDEX IF NOT EXISTS idx_itinerarios_nave ON itinerarios(nave);
CREATE INDEX IF NOT EXISTS idx_itinerarios_semana ON itinerarios(semana);
CREATE INDEX IF NOT EXISTS idx_itinerarios_pol ON itinerarios(pol);
CREATE INDEX IF NOT EXISTS idx_itinerarios_etd ON itinerarios(etd);
CREATE INDEX IF NOT EXISTS idx_escalas_itinerario_id ON itinerario_escalas(itinerario_id);
CREATE INDEX IF NOT EXISTS idx_escalas_orden ON itinerario_escalas(itinerario_id, orden);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_itinerarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_itinerarios_updated_at
  BEFORE UPDATE ON itinerarios
  FOR EACH ROW
  EXECUTE FUNCTION update_itinerarios_updated_at();

CREATE TRIGGER update_escalas_updated_at
  BEFORE UPDATE ON itinerario_escalas
  FOR EACH ROW
  EXECUTE FUNCTION update_itinerarios_updated_at();

-- Habilitar RLS
ALTER TABLE itinerarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerario_escalas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS básicas (ajustar según necesidades)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'itinerarios'
    AND policyname = 'Enable all operations for authenticated users on itinerarios'
  ) THEN
    CREATE POLICY "Enable all operations for authenticated users on itinerarios"
      ON itinerarios
      FOR ALL
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'itinerario_escalas'
    AND policyname = 'Enable all operations for authenticated users on itinerario_escalas'
  ) THEN
    CREATE POLICY "Enable all operations for authenticated users on itinerario_escalas"
      ON itinerario_escalas
      FOR ALL
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- Comentarios para documentación
COMMENT ON TABLE itinerarios IS 'Itinerarios de servicios marítimos con información de naves y viajes';
COMMENT ON TABLE itinerario_escalas IS 'Escalas (PODs) de cada itinerario con fechas ETA y días de tránsito';

