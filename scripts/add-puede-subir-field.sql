-- ============================================
-- AGREGAR CAMPO 'puede_subir' A LA TABLA usuarios
-- ============================================
-- Este script agrega un campo booleano 'puede_subir' a la tabla usuarios
-- para controlar si un usuario puede subir archivos (true) o solo descargar (false)
-- ============================================

-- Agregar columna 'puede_subir' si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'usuarios' 
      AND column_name = 'puede_subir'
  ) THEN
    ALTER TABLE usuarios 
    ADD COLUMN puede_subir BOOLEAN DEFAULT false;
    
    -- Por defecto, establecer true solo para admins y ejecutivos
    UPDATE usuarios 
    SET puede_subir = true
    WHERE rol = 'admin' OR email LIKE '%@asli.cl';
    
    -- Los demás usuarios quedan con false (solo pueden descargar)
    
    RAISE NOTICE '✅ Columna "puede_subir" agregada a la tabla usuarios';
  ELSE
    RAISE NOTICE '✅ La columna "puede_subir" ya existe';
  END IF;
END $$;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_usuarios_puede_subir ON usuarios(puede_subir);

-- Agregar comentario
COMMENT ON COLUMN usuarios.puede_subir IS 'Indica si el usuario puede subir archivos (true) o solo descargar (false)';

-- Verificar que se agregó correctamente
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'usuarios'
  AND column_name = 'puede_subir';

