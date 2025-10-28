-- Script para eliminar la columna cantCont de la tabla registros
-- Esta columna ya no es necesaria porque contamos contenedores únicos directamente

-- Verificar si la columna existe antes de eliminarla
DO $$
BEGIN
    -- Verificar si la columna cantCont existe
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'registros' 
        AND column_name = 'cantCont'
    ) THEN
        -- Eliminar la columna cantCont
        ALTER TABLE registros DROP COLUMN cantCont;
        RAISE NOTICE 'Columna cantCont eliminada exitosamente de la tabla registros';
    ELSE
        RAISE NOTICE 'La columna cantCont no existe en la tabla registros';
    END IF;
END $$;

-- Verificar que la columna fue eliminada
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'registros' 
AND column_name = 'cantCont';

-- Si no devuelve resultados, significa que la columna fue eliminada correctamente
