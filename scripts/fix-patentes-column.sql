-- =====================================================
-- VERIFICAR Y CORREGIR COLUMNAS FALTANTES
-- =====================================================
-- Ejecutar este SQL manualmente en tu base de datos Supabase
-- Ve a: Database > SQL Editor > pega y ejecuta

-- Verificar qué columnas existen actualmente
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'transportes'
  AND column_name IN ('conductor', 'rut', 'rut_conductor', 'telefono', 'celular', 'patentes', 'patente_rem')
ORDER BY ordinal_position;

-- Agregar columnas faltantes una por una
DO $$
BEGIN
    -- Verificar y agregar columna patentes si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transportes' AND column_name = 'patentes'
    ) THEN
        ALTER TABLE transportes ADD COLUMN patentes TEXT;
        RAISE NOTICE 'Columna patentes agregada correctamente';
    END IF;
    
    -- Verificar y agregar columna celular si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transportes' AND column_name = 'celular'
    ) THEN
        ALTER TABLE transportes ADD COLUMN celular TEXT;
        RAISE NOTICE 'Columna celular agregada correctamente';
    END IF;
    
    -- Verificar y agregar columna rut_conductor si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transportes' AND column_name = 'rut_conductor'
    ) THEN
        ALTER TABLE transportes ADD COLUMN rut_conductor TEXT;
        RAISE NOTICE 'Columna rut_conductor agregada correctamente';
    END IF;
END $$;

-- Verificar estructura final (solo columnas que existen)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'transportes'
  AND column_name IN ('conductor', 'rut', 'rut_conductor', 'telefono', 'celular', 'patentes', 'patente_rem')
ORDER BY ordinal_position;

-- Mostrar datos de ejemplo solo de columnas que existen (versión segura)
SELECT id, conductor, 
       CASE 
         WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'transportes' AND column_name = 'rut_conductor') 
         THEN rut_conductor 
         WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'transportes' AND column_name = 'rut') 
         THEN rut 
         ELSE NULL 
       END as rut,
       CASE 
         WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'transportes' AND column_name = 'celular') 
         THEN celular 
         WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'transportes' AND column_name = 'telefono') 
         THEN telefono 
         ELSE NULL 
       END as telefono,
       CASE 
         WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'transportes' AND column_name = 'patentes') 
         THEN patentes 
         ELSE NULL 
       END as patentes,
       CASE 
         WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'transportes' AND column_name = 'patente_rem') 
         THEN patente_rem 
         ELSE NULL 
       END as patente_rem
FROM transportes 
LIMIT 3;
