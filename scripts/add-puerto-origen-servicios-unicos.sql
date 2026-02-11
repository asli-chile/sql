-- =====================================================
-- AGREGAR CAMPO PUERTO_ORIGEN A SERVICIOS_UNICOS
-- =====================================================
-- Este script agrega el campo puerto_origen a la tabla servicios_unicos
-- ya que los servicios siempre salen del mismo puerto
-- =====================================================

-- Agregar columna puerto_origen si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'servicios_unicos' 
    AND column_name = 'puerto_origen'
  ) THEN
    ALTER TABLE public.servicios_unicos 
    ADD COLUMN puerto_origen TEXT;
    
    COMMENT ON COLUMN public.servicios_unicos.puerto_origen IS 'Puerto de origen del servicio (siempre el mismo para cada servicio)';
  END IF;
END $$;
