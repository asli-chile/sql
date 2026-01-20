-- =====================================================
-- AGREGAR CAMPO EMISIÓN A TABLA REGISTROS
-- =====================================================
-- Este script agrega el campo emision a la tabla registros
-- con un CHECK constraint para las opciones específicas
-- Ejecutar en el SQL Editor de Supabase
-- =====================================================

-- Agregar columna emision con CHECK constraint
ALTER TABLE public.registros
ADD COLUMN IF NOT EXISTS emision TEXT 
  CHECK (emision IS NULL OR emision IN ('TELEX RELEASE', 'BILL OF LADING', 'SEA WAY BILL', 'EXPRESS RELEASE'));

-- Agregar comentario
COMMENT ON COLUMN public.registros.emision IS 'Tipo de emisión del BL: TELEX RELEASE, BILL OF LADING, SEA WAY BILL, EXPRESS RELEASE';

-- Verificar que la columna se agregó correctamente
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'registros'
  AND column_name = 'emision';

-- Mensaje de confirmación
SELECT 'Campo emision agregado exitosamente' as resultado;
