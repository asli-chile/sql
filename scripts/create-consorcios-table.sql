-- =====================================================
-- CREAR TABLAS DE CONSORCIOS
-- =====================================================
-- Este script crea las tablas necesarias para gestionar consorcios
-- que mezclan servicios de diferentes navieras
-- =====================================================

-- Crear extensión gen_random_uuid si no existe
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabla principal de consorcios
CREATE TABLE IF NOT EXISTS public.consorcios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,                    -- Ej: "INCA/AX1/AN1", "Consorcio Asia Express"
  activo BOOLEAN DEFAULT true,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT
);

-- Tabla de relación entre consorcios, navieras y servicios
-- Permite definir qué naviera y servicio participa en cada consorcio
CREATE TABLE IF NOT EXISTS public.consorcios_navieras_servicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consorcio_id UUID NOT NULL REFERENCES public.consorcios(id) ON DELETE CASCADE,
  naviera TEXT NOT NULL,                          -- Nombre de la naviera (ej: "MSC", "ONE", "HAPAGLLOYD")
  servicio_nombre TEXT NOT NULL,                  -- Nombre del servicio de esa naviera (ej: "INCA", "AX1", "AN1")
  orden INTEGER DEFAULT 0,                         -- Orden de visualización
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT,
  
  -- Constraint único: una combinación naviera+servicio no puede estar duplicada en el mismo consorcio
  CONSTRAINT unique_consorcio_naviera_servicio UNIQUE (consorcio_id, naviera, servicio_nombre)
);

-- Índices para mejorar búsquedas
CREATE INDEX IF NOT EXISTS idx_consorcios_nombre ON public.consorcios(nombre);
CREATE INDEX IF NOT EXISTS idx_consorcios_activo ON public.consorcios(activo);
CREATE INDEX IF NOT EXISTS idx_consorcios_navieras_servicios_consorcio_id ON public.consorcios_navieras_servicios(consorcio_id);
CREATE INDEX IF NOT EXISTS idx_consorcios_navieras_servicios_naviera ON public.consorcios_navieras_servicios(naviera);
CREATE INDEX IF NOT EXISTS idx_consorcios_navieras_servicios_activo ON public.consorcios_navieras_servicios(activo);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_consorcios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers si no existen
DROP TRIGGER IF EXISTS update_consorcios_updated_at_trigger ON public.consorcios;
CREATE TRIGGER update_consorcios_updated_at_trigger
    BEFORE UPDATE ON public.consorcios
    FOR EACH ROW
    EXECUTE FUNCTION update_consorcios_updated_at();

DROP TRIGGER IF EXISTS update_consorcios_navieras_servicios_updated_at_trigger ON public.consorcios_navieras_servicios;
CREATE TRIGGER update_consorcios_navieras_servicios_updated_at_trigger
    BEFORE UPDATE ON public.consorcios_navieras_servicios
    FOR EACH ROW
    EXECUTE FUNCTION update_consorcios_updated_at();

-- Habilitar RLS
ALTER TABLE public.consorcios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consorcios_navieras_servicios ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS básicas (permitir lectura y escritura para usuarios autenticados)
DROP POLICY IF EXISTS consorcios_select_policy ON public.consorcios;
CREATE POLICY consorcios_select_policy
ON public.consorcios
FOR SELECT
USING (true);

DROP POLICY IF EXISTS consorcios_insert_policy ON public.consorcios;
CREATE POLICY consorcios_insert_policy
ON public.consorcios
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS consorcios_update_policy ON public.consorcios;
CREATE POLICY consorcios_update_policy
ON public.consorcios
FOR UPDATE
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS consorcios_delete_policy ON public.consorcios;
CREATE POLICY consorcios_delete_policy
ON public.consorcios
FOR DELETE
USING (true);

-- Políticas para consorcios_navieras_servicios
DROP POLICY IF EXISTS consorcios_navieras_servicios_select_policy ON public.consorcios_navieras_servicios;
CREATE POLICY consorcios_navieras_servicios_select_policy
ON public.consorcios_navieras_servicios
FOR SELECT
USING (true);

DROP POLICY IF EXISTS consorcios_navieras_servicios_insert_policy ON public.consorcios_navieras_servicios;
CREATE POLICY consorcios_navieras_servicios_insert_policy
ON public.consorcios_navieras_servicios
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS consorcios_navieras_servicios_update_policy ON public.consorcios_navieras_servicios;
CREATE POLICY consorcios_navieras_servicios_update_policy
ON public.consorcios_navieras_servicios
FOR UPDATE
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS consorcios_navieras_servicios_delete_policy ON public.consorcios_navieras_servicios;
CREATE POLICY consorcios_navieras_servicios_delete_policy
ON public.consorcios_navieras_servicios
FOR DELETE
USING (true);

-- Agregar comentarios
COMMENT ON TABLE public.consorcios IS 'Catálogo de consorcios que mezclan servicios de diferentes navieras';
COMMENT ON COLUMN public.consorcios.nombre IS 'Nombre del consorcio (ej: "INCA/AX1/AN1")';
COMMENT ON COLUMN public.consorcios.activo IS 'Indica si el consorcio está activo';
COMMENT ON COLUMN public.consorcios.descripcion IS 'Descripción adicional del consorcio';

COMMENT ON TABLE public.consorcios_navieras_servicios IS 'Relación entre consorcios, navieras y servicios';
COMMENT ON COLUMN public.consorcios_navieras_servicios.consorcio_id IS 'ID del consorcio';
COMMENT ON COLUMN public.consorcios_navieras_servicios.naviera IS 'Nombre de la naviera (ej: "MSC", "ONE")';
COMMENT ON COLUMN public.consorcios_navieras_servicios.servicio_nombre IS 'Nombre del servicio de esa naviera (ej: "INCA", "AX1")';
COMMENT ON COLUMN public.consorcios_navieras_servicios.orden IS 'Orden de visualización';
COMMENT ON COLUMN public.consorcios_navieras_servicios.activo IS 'Indica si esta relación está activa';

-- Verificar que las tablas se crearon correctamente
SELECT 
  table_name,
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('consorcios', 'consorcios_navieras_servicios')
ORDER BY table_name, ordinal_position;
