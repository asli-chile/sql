-- Agregar columna viaje a la tabla registros si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'registros' 
        AND column_name = 'viaje'
    ) THEN
        ALTER TABLE public.registros
        ADD COLUMN viaje TEXT;
        
        -- Comentario para documentar la columna
        COMMENT ON COLUMN public.registros.viaje IS 'Número de viaje de la nave';
    END IF;
END $$;
