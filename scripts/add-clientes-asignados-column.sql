-- ============================================
-- AGREGAR COLUMNA clientes_asignados A TABLA usuarios
-- ============================================
-- Este script agrega la columna clientes_asignados si no existe
-- Ejecutar en el SQL Editor de Supabase
-- ============================================

-- Agregar columna clientes_asignados (array de texto)
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS clientes_asignados TEXT[] DEFAULT '{}';

-- Agregar columna cliente_nombre si no existe (para usuarios tipo cliente)
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS cliente_nombre TEXT;

-- Actualizar el CHECK constraint del rol para incluir 'ejecutivo' y 'cliente'
-- Primero eliminar el constraint antiguo si existe
ALTER TABLE public.usuarios 
DROP CONSTRAINT IF EXISTS usuarios_rol_check;

-- Crear nuevo constraint con todos los roles
ALTER TABLE public.usuarios 
ADD CONSTRAINT usuarios_rol_check 
CHECK (rol IN ('admin', 'supervisor', 'usuario', 'lector', 'ejecutivo', 'cliente'));

-- Agregar comentarios
COMMENT ON COLUMN public.usuarios.clientes_asignados IS 'Array de nombres de clientes asignados al ejecutivo';
COMMENT ON COLUMN public.usuarios.cliente_nombre IS 'Nombre del cliente asignado (para usuarios tipo cliente)';

-- Verificar que la columna se agregó correctamente
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'usuarios' 
  AND column_name IN ('clientes_asignados', 'cliente_nombre');

-- Mensaje de confirmación
SELECT 'Columnas agregadas exitosamente' as resultado;
