-- ============================================
-- AGREGAR COLUMNAS deleted_at y deleted_by A TABLA TRANSPORTES
-- ============================================
-- Este script agrega las columnas necesarias para soft delete
-- Ejecutar en el SQL Editor de Supabase
-- ============================================

-- Agregar columna deleted_at (timestamp)
ALTER TABLE public.transportes
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Agregar columna deleted_by (text, referencia al usuario que eliminó)
ALTER TABLE public.transportes
ADD COLUMN IF NOT EXISTS deleted_by TEXT;

-- Agregar comentarios
COMMENT ON COLUMN public.transportes.deleted_at IS 'Fecha y hora de eliminación (soft delete)';
COMMENT ON COLUMN public.transportes.deleted_by IS 'ID del usuario que eliminó el transporte';

-- Crear índice para mejorar consultas de papelera
CREATE INDEX IF NOT EXISTS idx_transportes_deleted_at ON public.transportes(deleted_at);

-- Verificar que las columnas se agregaron correctamente
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'transportes'
  AND column_name IN ('deleted_at', 'deleted_by');

-- Mensaje de confirmación
SELECT 'Columnas agregadas exitosamente' as resultado;
