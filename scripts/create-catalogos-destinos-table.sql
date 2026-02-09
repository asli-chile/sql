-- =====================================================
-- CREAR TABLA CATALOGOS_DESTINOS
-- =====================================================
-- Este script crea la tabla catalogos_destinos si no existe
-- Ejecutar en el SQL Editor de Supabase
-- =====================================================

-- Crear tabla catalogos_destinos si no existe
CREATE TABLE IF NOT EXISTS public.catalogos_destinos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índice para mejorar búsquedas
CREATE INDEX IF NOT EXISTS idx_catalogos_destinos_nombre ON public.catalogos_destinos(nombre);
CREATE INDEX IF NOT EXISTS idx_catalogos_destinos_activo ON public.catalogos_destinos(activo);

-- Crear trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_catalogos_destinos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS update_catalogos_destinos_updated_at_trigger ON public.catalogos_destinos;
CREATE TRIGGER update_catalogos_destinos_updated_at_trigger
    BEFORE UPDATE ON public.catalogos_destinos
    FOR EACH ROW
    EXECUTE FUNCTION update_catalogos_destinos_updated_at();

-- Habilitar RLS
ALTER TABLE public.catalogos_destinos ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS básicas (permitir lectura y escritura para usuarios autenticados)
DROP POLICY IF EXISTS catalogos_destinos_select_policy ON public.catalogos_destinos;
CREATE POLICY catalogos_destinos_select_policy
ON public.catalogos_destinos
FOR SELECT
USING (true);

DROP POLICY IF EXISTS catalogos_destinos_insert_policy ON public.catalogos_destinos;
CREATE POLICY catalogos_destinos_insert_policy
ON public.catalogos_destinos
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS catalogos_destinos_update_policy ON public.catalogos_destinos;
CREATE POLICY catalogos_destinos_update_policy
ON public.catalogos_destinos
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Agregar comentarios
COMMENT ON TABLE public.catalogos_destinos IS 'Catálogo de destinos (PODs) para itinerarios y registros';
COMMENT ON COLUMN public.catalogos_destinos.nombre IS 'Nombre del puerto de destino (POD)';
COMMENT ON COLUMN public.catalogos_destinos.activo IS 'Indica si el destino está activo';

-- Verificar que la tabla se creó correctamente
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'catalogos_destinos'
ORDER BY ordinal_position;
