-- =====================================================
-- CREAR TABLAS DE SERVICIOS Y RELACIÓN CON NAVES
-- =====================================================
-- Este script crea las tablas necesarias para gestionar servicios
-- y su relación con naves, permitiendo asignar múltiples naves a un servicio
-- y luego seleccionar el servicio al crear un itinerario
-- =====================================================

-- Crear extensión gen_random_uuid si no existe
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabla principal de servicios
CREATE TABLE IF NOT EXISTS public.servicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,                    -- Ej: "AX2/AN2", "ANDES EXPRESS"
  consorcio TEXT,                                 -- Ej: "MSC + Hapag + ONE"
  activo BOOLEAN DEFAULT true,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT
);

-- Tabla de relación muchos a muchos entre servicios y naves
-- Permite asignar múltiples naves a un servicio
CREATE TABLE IF NOT EXISTS public.servicios_naves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servicio_id UUID NOT NULL REFERENCES public.servicios(id) ON DELETE CASCADE,
  nave_nombre TEXT NOT NULL,                      -- Nombre de la nave (debe coincidir con vessel_name en vessel_positions o nave en itinerarios)
  activo BOOLEAN DEFAULT true,
  orden INTEGER DEFAULT 0,                       -- Orden de prioridad/visualización
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT,
  
  -- Constraint único: una nave no puede estar duplicada en el mismo servicio
  CONSTRAINT unique_servicio_nave UNIQUE (servicio_id, nave_nombre)
);

-- Índices para mejorar búsquedas
CREATE INDEX IF NOT EXISTS idx_servicios_nombre ON public.servicios(nombre);
CREATE INDEX IF NOT EXISTS idx_servicios_activo ON public.servicios(activo);
CREATE INDEX IF NOT EXISTS idx_servicios_naves_servicio_id ON public.servicios_naves(servicio_id);
CREATE INDEX IF NOT EXISTS idx_servicios_naves_nave_nombre ON public.servicios_naves(nave_nombre);
CREATE INDEX IF NOT EXISTS idx_servicios_naves_activo ON public.servicios_naves(activo);
CREATE INDEX IF NOT EXISTS idx_servicios_naves_orden ON public.servicios_naves(servicio_id, orden);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_servicios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers si no existen
DROP TRIGGER IF EXISTS update_servicios_updated_at_trigger ON public.servicios;
CREATE TRIGGER update_servicios_updated_at_trigger
    BEFORE UPDATE ON public.servicios
    FOR EACH ROW
    EXECUTE FUNCTION update_servicios_updated_at();

DROP TRIGGER IF EXISTS update_servicios_naves_updated_at_trigger ON public.servicios_naves;
CREATE TRIGGER update_servicios_naves_updated_at_trigger
    BEFORE UPDATE ON public.servicios_naves
    FOR EACH ROW
    EXECUTE FUNCTION update_servicios_updated_at();

-- Habilitar RLS
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios_naves ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS básicas (permitir lectura y escritura para usuarios autenticados)
DROP POLICY IF EXISTS servicios_select_policy ON public.servicios;
CREATE POLICY servicios_select_policy
ON public.servicios
FOR SELECT
USING (true);

DROP POLICY IF EXISTS servicios_insert_policy ON public.servicios;
CREATE POLICY servicios_insert_policy
ON public.servicios
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS servicios_update_policy ON public.servicios;
CREATE POLICY servicios_update_policy
ON public.servicios
FOR UPDATE
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS servicios_delete_policy ON public.servicios;
CREATE POLICY servicios_delete_policy
ON public.servicios
FOR DELETE
USING (true);

-- Políticas para servicios_naves
DROP POLICY IF EXISTS servicios_naves_select_policy ON public.servicios_naves;
CREATE POLICY servicios_naves_select_policy
ON public.servicios_naves
FOR SELECT
USING (true);

DROP POLICY IF EXISTS servicios_naves_insert_policy ON public.servicios_naves;
CREATE POLICY servicios_naves_insert_policy
ON public.servicios_naves
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS servicios_naves_update_policy ON public.servicios_naves;
CREATE POLICY servicios_naves_update_policy
ON public.servicios_naves
FOR UPDATE
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS servicios_naves_delete_policy ON public.servicios_naves;
CREATE POLICY servicios_naves_delete_policy
ON public.servicios_naves
FOR DELETE
USING (true);

-- Agregar comentarios
COMMENT ON TABLE public.servicios IS 'Catálogo de servicios marítimos para itinerarios';
COMMENT ON COLUMN public.servicios.nombre IS 'Nombre del servicio (ej: "AX2/AN2", "ANDES EXPRESS")';
COMMENT ON COLUMN public.servicios.consorcio IS 'Consorcio o navieras que operan el servicio';
COMMENT ON COLUMN public.servicios.activo IS 'Indica si el servicio está activo';
COMMENT ON COLUMN public.servicios.descripcion IS 'Descripción adicional del servicio';

COMMENT ON TABLE public.servicios_naves IS 'Relación muchos a muchos entre servicios y naves';
COMMENT ON COLUMN public.servicios_naves.servicio_id IS 'ID del servicio';
COMMENT ON COLUMN public.servicios_naves.nave_nombre IS 'Nombre de la nave asignada al servicio';
COMMENT ON COLUMN public.servicios_naves.activo IS 'Indica si la nave está activa en este servicio';
COMMENT ON COLUMN public.servicios_naves.orden IS 'Orden de prioridad/visualización de la nave en el servicio';

-- Verificar que las tablas se crearon correctamente
SELECT 
  table_name,
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('servicios', 'servicios_naves')
ORDER BY table_name, ordinal_position;
