-- ============================================
-- AGREGAR COLUMNAS DE STACKING A REGISTROS
-- ============================================
-- Este script agrega las columnas inicio_stacking, fin_stacking y cut_off
-- a la tabla registros y crea triggers para sincronización bidireccional
-- con la tabla transportes
-- ============================================

-- Agregar columna inicio_stacking (TIMESTAMPTZ)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'registros' 
        AND column_name = 'inicio_stacking'
    ) THEN
        ALTER TABLE public.registros
        ADD COLUMN inicio_stacking TIMESTAMPTZ;
        
        COMMENT ON COLUMN public.registros.inicio_stacking IS 'Fecha y hora de inicio de stacking (sincronizado con transportes.stacking)';
    END IF;
END $$;

-- Agregar columna fin_stacking (TIMESTAMPTZ)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'registros' 
        AND column_name = 'fin_stacking'
    ) THEN
        ALTER TABLE public.registros
        ADD COLUMN fin_stacking TIMESTAMPTZ;
        
        COMMENT ON COLUMN public.registros.fin_stacking IS 'Fecha y hora de fin de stacking (sincronizado con transportes.fin_stacking)';
    END IF;
END $$;

-- Agregar columna cut_off (TIMESTAMPTZ)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'registros' 
        AND column_name = 'cut_off'
    ) THEN
        ALTER TABLE public.registros
        ADD COLUMN cut_off TIMESTAMPTZ;
        
        COMMENT ON COLUMN public.registros.cut_off IS 'Fecha y hora de cut off (sincronizado con transportes.cut_off)';
    END IF;
END $$;

-- ============================================
-- FUNCIONES DE SINCRONIZACIÓN
-- ============================================

-- Función para sincronizar desde transportes a registros
CREATE OR REPLACE FUNCTION sync_stacking_from_transportes()
RETURNS TRIGGER AS $$
DECLARE
    current_inicio TIMESTAMPTZ;
    current_fin TIMESTAMPTZ;
    current_cut_off TIMESTAMPTZ;
BEGIN
    -- Solo sincronizar si hay registro_id
    IF NEW.registro_id IS NOT NULL THEN
        -- Obtener valores actuales del registro
        SELECT inicio_stacking, fin_stacking, cut_off
        INTO current_inicio, current_fin, current_cut_off
        FROM public.registros
        WHERE id = NEW.registro_id;
        
        -- Comparar valores usando EXTRACT para comparar fecha y hora exactas
        -- Esto evita problemas con zonas horarias
        IF (COALESCE(current_inicio, '1970-01-01'::TIMESTAMPTZ) IS DISTINCT FROM COALESCE(NEW.stacking, '1970-01-01'::TIMESTAMPTZ)) OR
           (COALESCE(current_fin, '1970-01-01'::TIMESTAMPTZ) IS DISTINCT FROM COALESCE(NEW.fin_stacking, '1970-01-01'::TIMESTAMPTZ)) OR
           (COALESCE(current_cut_off, '1970-01-01'::TIMESTAMPTZ) IS DISTINCT FROM COALESCE(NEW.cut_off, '1970-01-01'::TIMESTAMPTZ)) THEN
            -- Actualizar preservando la hora exacta (sin conversión de zona horaria)
            UPDATE public.registros
            SET 
                inicio_stacking = NEW.stacking,
                fin_stacking = NEW.fin_stacking,
                cut_off = NEW.cut_off,
                updated_at = NOW()
            WHERE id = NEW.registro_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para sincronizar desde registros a transportes
CREATE OR REPLACE FUNCTION sync_stacking_from_registros()
RETURNS TRIGGER AS $$
DECLARE
    current_stacking TIMESTAMPTZ;
    current_fin TIMESTAMPTZ;
    current_cut_off TIMESTAMPTZ;
    has_changes BOOLEAN := FALSE;
BEGIN
    -- Obtener valores actuales del primer transporte asociado
    SELECT stacking, fin_stacking, cut_off
    INTO current_stacking, current_fin, current_cut_off
    FROM public.transportes
    WHERE registro_id = NEW.id
    LIMIT 1;
    
    -- Comparar valores usando COALESCE para manejar NULLs correctamente
    -- Esto preserva la hora exacta sin problemas de zona horaria
    has_changes := (COALESCE(current_stacking, '1970-01-01'::TIMESTAMPTZ) IS DISTINCT FROM COALESCE(NEW.inicio_stacking, '1970-01-01'::TIMESTAMPTZ)) OR
                   (COALESCE(current_fin, '1970-01-01'::TIMESTAMPTZ) IS DISTINCT FROM COALESCE(NEW.fin_stacking, '1970-01-01'::TIMESTAMPTZ)) OR
                   (COALESCE(current_cut_off, '1970-01-01'::TIMESTAMPTZ) IS DISTINCT FROM COALESCE(NEW.cut_off, '1970-01-01'::TIMESTAMPTZ));
    
    -- Solo actualizar si hay cambios reales (evitar bucle infinito)
    IF has_changes THEN
        -- Actualizar preservando la hora exacta (sin conversión de zona horaria)
        UPDATE public.transportes
        SET 
            stacking = NEW.inicio_stacking,
            fin_stacking = NEW.fin_stacking,
            cut_off = NEW.cut_off,
            updated_at = NOW()
        WHERE registro_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger para sincronizar desde transportes a registros
DROP TRIGGER IF EXISTS sync_transportes_to_registros_stacking ON public.transportes;
CREATE TRIGGER sync_transportes_to_registros_stacking
    AFTER INSERT OR UPDATE OF stacking, fin_stacking, cut_off, registro_id
    ON public.transportes
    FOR EACH ROW
    WHEN (NEW.registro_id IS NOT NULL)
    EXECUTE FUNCTION sync_stacking_from_transportes();

-- Trigger para sincronizar desde registros a transportes
DROP TRIGGER IF EXISTS sync_registros_to_transportes_stacking ON public.registros;
CREATE TRIGGER sync_registros_to_transportes_stacking
    AFTER INSERT OR UPDATE OF inicio_stacking, fin_stacking, cut_off
    ON public.registros
    FOR EACH ROW
    EXECUTE FUNCTION sync_stacking_from_registros();

-- ============================================
-- SINCRONIZACIÓN INICIAL DE DATOS EXISTENTES
-- ============================================

-- Deshabilitar temporalmente los triggers para evitar bucles durante la sincronización inicial
ALTER TABLE public.registros DISABLE TRIGGER sync_registros_to_transportes_stacking;
ALTER TABLE public.transportes DISABLE TRIGGER sync_transportes_to_registros_stacking;

-- Sincronizar datos existentes desde transportes hacia registros
-- Esto actualiza los registros con los valores de stacking que ya existen en transportes
UPDATE public.registros r
SET 
    inicio_stacking = t.stacking,
    fin_stacking = t.fin_stacking,
    cut_off = t.cut_off,
    updated_at = NOW()
FROM public.transportes t
WHERE t.registro_id = r.id
  AND t.deleted_at IS NULL
  AND (
    t.stacking IS NOT NULL 
    OR t.fin_stacking IS NOT NULL 
    OR t.cut_off IS NOT NULL
  );

-- Rehabilitar los triggers después de la sincronización inicial
ALTER TABLE public.registros ENABLE TRIGGER sync_registros_to_transportes_stacking;
ALTER TABLE public.transportes ENABLE TRIGGER sync_transportes_to_registros_stacking;

-- Mostrar cuántos registros fueron actualizados
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count
    FROM public.registros r
    INNER JOIN public.transportes t ON t.registro_id = r.id
    WHERE t.deleted_at IS NULL
      AND (
        t.stacking IS NOT NULL 
        OR t.fin_stacking IS NOT NULL 
        OR t.cut_off IS NOT NULL
      );
    
    RAISE NOTICE 'Registros actualizados con datos de stacking: %', updated_count;
END $$;

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar que las columnas fueron creadas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'registros'
AND column_name IN ('inicio_stacking', 'fin_stacking', 'cut_off')
ORDER BY column_name;

-- Verificar cuántos registros tienen datos de stacking
SELECT 
    COUNT(*) FILTER (WHERE inicio_stacking IS NOT NULL) as con_inicio_stacking,
    COUNT(*) FILTER (WHERE fin_stacking IS NOT NULL) as con_fin_stacking,
    COUNT(*) FILTER (WHERE cut_off IS NOT NULL) as con_cut_off,
    COUNT(*) as total_registros
FROM public.registros
WHERE deleted_at IS NULL;
