-- =====================================================
-- VERIFICAR COLUMNA dia_presentacion
-- =====================================================
-- Ejecutar este SQL manualmente en tu base de datos Supabase
-- Ve a: Database > SQL Editor > pega y ejecuta

-- Verificar si la columna dia_presentacion existe
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'transportes'
  AND column_name = 'dia_presentacion';

-- Si no existe, agregar la columna
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transportes' AND column_name = 'dia_presentacion'
    ) THEN
        ALTER TABLE transportes ADD COLUMN dia_presentacion TEXT;
        RAISE NOTICE 'Columna dia_presentacion agregada correctamente';
    ELSE
        RAISE NOTICE 'La columna dia_presentacion ya existe';
    END IF;
END $$;

-- Verificar estructura final
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'transportes'
  AND column_name = 'dia_presentacion';

-- Mostrar algunos datos de ejemplo para verificar
SELECT id, dia_presentacion, hora_presentacion, fecha_planta
FROM transportes 
WHERE dia_presentacion IS NOT NULL
LIMIT 3;
