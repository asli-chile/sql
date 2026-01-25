-- Convertir columnas de stacking a TIMESTAMP (fecha y hora)

-- Convertir ingreso_stacking a TIMESTAMP si es boolean o text
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transportes' AND column_name = 'ingreso_stacking'
    ) THEN
        -- Obtener el tipo actual
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transportes' 
            AND column_name = 'ingreso_stacking' 
            AND data_type = 'boolean'
        ) THEN
            -- Convertir de boolean a TIMESTAMP
            ALTER TABLE transportes ADD COLUMN ingreso_stacking_new TIMESTAMP;
            UPDATE transportes SET ingreso_stacking_new = NULL WHERE ingreso_stacking IS NOT NULL;
            ALTER TABLE transportes DROP COLUMN ingreso_stacking;
            ALTER TABLE transportes RENAME COLUMN ingreso_stacking_new TO ingreso_stacking;
            RAISE NOTICE 'Columna ingreso_stacking convertida de boolean a TIMESTAMP';
        ELSIF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transportes' 
            AND column_name = 'ingreso_stacking' 
            AND data_type = 'text'
        ) THEN
            -- Convertir de text a TIMESTAMP
            ALTER TABLE transportes ADD COLUMN ingreso_stacking_new TIMESTAMP;
            UPDATE transportes SET ingreso_stacking_new = NULL WHERE ingreso_stacking IS NOT NULL;
            ALTER TABLE transportes DROP COLUMN ingreso_stacking;
            ALTER TABLE transportes RENAME COLUMN ingreso_stacking_new TO ingreso_stacking;
            RAISE NOTICE 'Columna ingreso_stacking convertida de text a TIMESTAMP';
        ELSE
            RAISE NOTICE 'Columna ingreso_stacking ya existe con tipo compatible';
        END IF;
    ELSE
        -- Crear como TIMESTAMP si no existe
        ALTER TABLE transportes ADD COLUMN ingreso_stacking TIMESTAMP;
        RAISE NOTICE 'Columna ingreso_stacking creada como TIMESTAMP';
    END IF;
END $$;

-- Convertir fin_stacking a TIMESTAMP si es text
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transportes' AND column_name = 'fin_stacking'
    ) THEN
        -- Obtener el tipo actual
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transportes' 
            AND column_name = 'fin_stacking' 
            AND data_type = 'text'
        ) THEN
            -- Convertir de text a TIMESTAMP
            ALTER TABLE transportes ADD COLUMN fin_stacking_new TIMESTAMP;
            UPDATE transportes SET fin_stacking_new = NULL WHERE fin_stacking IS NOT NULL;
            ALTER TABLE transportes DROP COLUMN fin_stacking;
            ALTER TABLE transportes RENAME COLUMN fin_stacking_new TO fin_stacking;
            RAISE NOTICE 'Columna fin_stacking convertida de text a TIMESTAMP';
        ELSE
            RAISE NOTICE 'Columna fin_stacking ya existe con tipo compatible';
        END IF;
    ELSE
        -- Crear como TIMESTAMP si no existe
        ALTER TABLE transportes ADD COLUMN fin_stacking TIMESTAMP;
        RAISE NOTICE 'Columna fin_stacking creada como TIMESTAMP';
    END IF;
END $$;

-- Convertir cut_off a TIMESTAMP si es text
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transportes' AND column_name = 'cut_off'
    ) THEN
        -- Obtener el tipo actual
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transportes' 
            AND column_name = 'cut_off' 
            AND data_type = 'text'
        ) THEN
            -- Convertir de text a TIMESTAMP
            ALTER TABLE transportes ADD COLUMN cut_off_new TIMESTAMP;
            UPDATE transportes SET cut_off_new = NULL WHERE cut_off IS NOT NULL;
            ALTER TABLE transportes DROP COLUMN cut_off;
            ALTER TABLE transportes RENAME COLUMN cut_off_new TO cut_off;
            RAISE NOTICE 'Columna cut_off convertida de text a TIMESTAMP';
        ELSE
            RAISE NOTICE 'Columna cut_off ya existe con tipo compatible';
        END IF;
    ELSE
        -- Crear como TIMESTAMP si no existe
        ALTER TABLE transportes ADD COLUMN cut_off TIMESTAMP;
        RAISE NOTICE 'Columna cut_off creada como TIMESTAMP';
    END IF;
END $$;

-- Verificar el tipo final de las columnas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transportes' 
AND column_name IN ('ingreso_stacking', 'fin_stacking', 'cut_off')
ORDER BY column_name;
