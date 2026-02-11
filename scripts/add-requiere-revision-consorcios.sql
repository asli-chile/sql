-- =====================================================
-- AGREGAR COLUMNA REQUIERE_REVISION A CONSORCIOS
-- =====================================================
-- Este script agrega la columna requiere_revision si no existe
-- =====================================================

-- Agregar columna requiere_revision si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'consorcios' 
    AND column_name = 'requiere_revision'
  ) THEN
    ALTER TABLE public.consorcios 
    ADD COLUMN requiere_revision BOOLEAN DEFAULT false;
    
    COMMENT ON COLUMN public.consorcios.requiere_revision IS 'Flag si algún servicio único está inactivo';
    
    RAISE NOTICE 'Columna requiere_revision agregada exitosamente';
  ELSE
    RAISE NOTICE 'La columna requiere_revision ya existe';
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
  AND table_name = 'consorcios' 
  AND column_name = 'requiere_revision';
