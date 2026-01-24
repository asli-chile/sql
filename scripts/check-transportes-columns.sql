-- =====================================================
-- VERIFICAR Y CORREGIR COLUMNAS DE TRANSPORTES
-- =====================================================
-- Ejecutar este SQL manualmente en tu base de datos Supabase
-- Ve a: Database > SQL Editor > pega y ejecuta

-- Verificar estructura actual de la tabla transportes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'transportes'
  AND column_name IN ('fono', 'celular', 'rut', 'rut_conductor', 'patentes')
ORDER BY ordinal_position;

-- Si fono existe pero celular no, renombrar la columna
DO $$
BEGIN
    -- Verificar si la columna fono existe
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transportes' AND column_name = 'fono'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transportes' AND column_name = 'celular'
    ) THEN
        -- Renombrar fono a celular
        ALTER TABLE transportes RENAME COLUMN fono TO celular;
        RAISE NOTICE 'Columna fono renombrada a celular';
    END IF;
    
    -- Verificar si la columna rut existe pero rut_conductor no
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transportes' AND column_name = 'rut'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transportes' AND column_name = 'rut_conductor'
    ) THEN
        -- Renombrar rut a rut_conductor
        ALTER TABLE transportes RENAME COLUMN rut TO rut_conductor;
        RAISE NOTICE 'Columna rut renombrada a rut_conductor';
    END IF;
END $$;

-- Verificar estructura final
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'transportes'
  AND column_name IN ('celular', 'rut_conductor', 'patentes')
ORDER BY ordinal_position;

-- Verificar algunos datos de ejemplo
SELECT id, conductor, rut_conductor, celular, patentes
FROM transportes 
LIMIT 5;
