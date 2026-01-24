-- Agregar columnas de tiempo que faltan en la tabla transportes

-- Verificar si la columna existe antes de agregarla
DO $$
BEGIN
    -- Agregar llegada_planta si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transportes' AND column_name = 'llegada_planta'
    ) THEN
        ALTER TABLE transportes ADD COLUMN llegada_planta TIME WITHOUT TIME ZONE;
        RAISE NOTICE 'Columna llegada_planta agregada';
    END IF;

    -- Agregar salida_planta si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transportes' AND column_name = 'salida_planta'
    ) THEN
        ALTER TABLE transportes ADD COLUMN salida_planta TIME WITHOUT TIME ZONE;
        RAISE NOTICE 'Columna salida_planta agregada';
    END IF;

    -- Agregar llegada_puerto si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transportes' AND column_name = 'llegada_puerto'
    ) THEN
        ALTER TABLE transportes ADD COLUMN llegada_puerto TIME WITHOUT TIME ZONE;
        RAISE NOTICE 'Columna llegada_puerto agregada';
    END IF;

    -- Verificar hora_presentacion (debería existir)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transportes' AND column_name = 'hora_presentacion'
    ) THEN
        ALTER TABLE transportes ADD COLUMN hora_presentacion TIME WITHOUT TIME ZONE;
        RAISE NOTICE 'Columna hora_presentacion agregada';
    END IF;
END $$;

-- Mostrar las columnas de tiempo agregadas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transportes' 
AND column_name IN ('llegada_planta', 'salida_planta', 'llegada_puerto', 'hora_presentacion')
ORDER BY column_name;
