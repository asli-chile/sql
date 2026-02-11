-- =====================================================
-- AGREGAR COLUMNA NAVIERA A ITINERARIOS
-- =====================================================
-- Este script agrega la columna naviera si no existe
-- =====================================================

-- Agregar columna naviera si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'itinerarios' 
    AND column_name = 'naviera'
  ) THEN
    ALTER TABLE public.itinerarios 
    ADD COLUMN naviera TEXT;
    
    COMMENT ON COLUMN public.itinerarios.naviera IS 'Naviera seleccionada para el itinerario';
    
    RAISE NOTICE 'Columna naviera agregada exitosamente';
  ELSE
    RAISE NOTICE 'La columna naviera ya existe';
  END IF;
END $$;

-- Verificar que la columna existe
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'itinerarios' 
  AND column_name = 'naviera';
