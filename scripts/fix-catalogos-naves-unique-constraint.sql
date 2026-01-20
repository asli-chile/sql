-- =====================================================
-- CORREGIR RESTRICCIÓN UNIQUE EN CATALOGOS_NAVES
-- =====================================================
-- Este script modifica la restricción UNIQUE para permitir
-- el mismo nombre de nave con diferentes navieras, pero
-- evita duplicar la combinación (nombre, naviera_nombre)
-- =====================================================

-- 1. Eliminar la restricción UNIQUE existente en 'nombre' si existe
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Buscar el nombre de la restricción UNIQUE en la columna 'nombre'
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'catalogos_naves'::regclass
      AND contype = 'u'
      AND array_length(conkey, 1) = 1
      AND conkey[1] = (
          SELECT attnum
          FROM pg_attribute
          WHERE attrelid = 'catalogos_naves'::regclass
            AND attname = 'nombre'
      );

    -- Si existe, eliminarla
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE catalogos_naves DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Restricción UNIQUE eliminada: %', constraint_name;
    ELSE
        RAISE NOTICE 'No se encontró restricción UNIQUE en la columna nombre';
    END IF;
END $$;

-- 2. Crear nueva restricción UNIQUE en la combinación (nombre, naviera_nombre)
-- Solo si no existe ya
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'catalogos_naves'::regclass
          AND contype = 'u'
          AND conname = 'unique_nombre_naviera'
    ) THEN
        ALTER TABLE catalogos_naves
        ADD CONSTRAINT unique_nombre_naviera UNIQUE (nombre, naviera_nombre);
        
        RAISE NOTICE 'Restricción UNIQUE creada: unique_nombre_naviera (nombre, naviera_nombre)';
    ELSE
        RAISE NOTICE 'La restricción unique_nombre_naviera ya existe';
    END IF;
END $$;

-- 3. Verificar que la restricción esté correctamente aplicada
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'catalogos_naves'::regclass
  AND contype = 'u'
ORDER BY conname;
