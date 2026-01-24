-- Corregir tipo de dato de columnas de tiempo a TIME WITHOUT TIME ZONE

-- Convertir llegada_planta a TIME WITHOUT TIME ZONE si es DATE
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transportes' AND column_name = 'llegada_planta'
        AND data_type = 'date'
    ) THEN
        -- Crear columna temporal como TIME WITHOUT TIME ZONE
        ALTER TABLE transportes ADD COLUMN llegada_planta_new TIME WITHOUT TIME ZONE;
        
        -- Mover datos (convertir DATE a TIME si hay datos)
        UPDATE transportes SET llegada_planta_new = NULL WHERE llegada_planta IS NOT NULL;
        
        -- Eliminar columna original
        ALTER TABLE transportes DROP COLUMN llegada_planta;
        
        -- Renombrar nueva columna
        ALTER TABLE transportes RENAME COLUMN llegada_planta_new TO llegada_planta;
        
        RAISE NOTICE 'Columna llegada_planta convertida a TIME WITHOUT TIME ZONE';
    END IF;
END $$;

-- Convertir salida_planta a TIME WITHOUT TIME ZONE si es DATE
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transportes' AND column_name = 'salida_planta'
        AND data_type = 'date'
    ) THEN
        -- Crear columna temporal como TIME WITHOUT TIME ZONE
        ALTER TABLE transportes ADD COLUMN salida_planta_new TIME WITHOUT TIME ZONE;
        
        -- Mover datos (convertir DATE a TIME si hay datos)
        UPDATE transportes SET salida_planta_new = NULL WHERE salida_planta IS NOT NULL;
        
        -- Eliminar columna original
        ALTER TABLE transportes DROP COLUMN salida_planta;
        
        -- Renombrar nueva columna
        ALTER TABLE transportes RENAME COLUMN salida_planta_new TO salida_planta;
        
        RAISE NOTICE 'Columna salida_planta convertida a TIME WITHOUT TIME ZONE';
    END IF;
END $$;

-- Verificar el tipo final de las columnas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transportes' 
AND column_name IN ('llegada_planta', 'salida_planta', 'hora_presentacion')
ORDER BY column_name;
