-- =====================================================
-- TRIGGER PARA ASIGNAR REF_ASLI AUTOMÁTICAMENTE
-- =====================================================
-- Este trigger asigna automáticamente ref_asli y temporada
-- a nuevos registros cuando se insertan
-- =====================================================

-- PASO 1: Asegurar que la columna temporada existe
ALTER TABLE public.registros
ADD COLUMN IF NOT EXISTS temporada TEXT;

-- PASO 2: Función para determinar temporada (reutilizar la misma lógica)
CREATE OR REPLACE FUNCTION determinar_temporada(
    p_especie TEXT,
    p_fecha TIMESTAMPTZ
) RETURNS TEXT AS $$
DECLARE
    v_especie_lower TEXT;
    v_mes INTEGER;
BEGIN
    v_especie_lower := LOWER(TRIM(p_especie));
    
    -- CHERRY 25-26: CEREZA y ARÁNDANOS entre septiembre (9) y enero (1)
    IF v_especie_lower LIKE '%cereza%' 
       OR v_especie_lower LIKE '%cherry%'
       OR v_especie_lower LIKE '%arandano%'
       OR v_especie_lower LIKE '%arándano%' THEN
        IF p_fecha IS NOT NULL THEN
            v_mes := EXTRACT(MONTH FROM p_fecha);
            -- Septiembre (9) a Diciembre (12) o Enero (1)
            IF v_mes >= 9 OR v_mes = 1 THEN
                RETURN 'CHERRY-25-26';
            END IF;
        ELSE
            -- Si no hay fecha, asignar por defecto
            RETURN 'CHERRY-25-26';
        END IF;
    END IF;
    
    -- POMACEA-CAROZO 2026: CIRUELA, MANZANA, KIWI, DURAZNO
    IF v_especie_lower LIKE '%ciruela%' 
       OR v_especie_lower LIKE '%manzana%'
       OR v_especie_lower LIKE '%kiwi%'
       OR v_especie_lower LIKE '%durazno%'
       OR v_especie_lower LIKE '%plum%'
       OR v_especie_lower LIKE '%apple%'
       OR v_especie_lower LIKE '%peach%' THEN
        RETURN 'POMACEA-CAROZO-2026';
    END IF;
    
    -- Si no coincide con ninguna temporada específica, retornar NULL
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- PASO 3: Función que genera el siguiente ref_asli para una temporada
CREATE OR REPLACE FUNCTION obtener_siguiente_ref_asli(
    p_temporada TEXT
) RETURNS TEXT AS $$
DECLARE
    v_ultimo_numero INTEGER;
    v_nuevo_ref_asli TEXT;
    v_temporada_normalizada TEXT;
    v_patron_busqueda TEXT;
BEGIN
    -- Si no hay temporada, retornar NULL
    IF p_temporada IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Normalizar temporada para búsqueda (mayúsculas y guiones)
    v_temporada_normalizada := UPPER(REPLACE(REPLACE(p_temporada, ' ', '-'), '_', '-'));
    
    -- Crear patrón de búsqueda flexible (acepta espacios o guiones)
    v_patron_busqueda := '^' || REPLACE(v_temporada_normalizada, '-', '[- ]') || '[- ]\d+$';
    
    -- Obtener el último número usado para esta temporada
    -- Buscar ref_asli que coincidan con el patrón de la temporada (con espacios o guiones)
    SELECT COALESCE(MAX(
        CAST(
            SUBSTRING(ref_asli FROM '(\d+)$') AS INTEGER
        )
    ), 0) INTO v_ultimo_numero
    FROM public.registros
    WHERE deleted_at IS NULL
        AND (
            UPPER(REPLACE(REPLACE(temporada, ' ', '-'), '_', '-')) = v_temporada_normalizada
        )
        AND (
            ref_asli ~* v_patron_busqueda
        );
    
    -- Generar el nuevo ref_asli con formato normalizado (guiones)
    v_nuevo_ref_asli := v_temporada_normalizada || '-' || 
                        LPAD((v_ultimo_numero + 1)::TEXT, 4, '0');
    
    RETURN v_nuevo_ref_asli;
END;
$$ LANGUAGE plpgsql;

-- PASO 4: Función del trigger que asigna temporada y ref_asli automáticamente
CREATE OR REPLACE FUNCTION asignar_ref_asli_automatico()
RETURNS TRIGGER AS $$
DECLARE
    v_temporada TEXT;
    v_fecha_referencia TIMESTAMPTZ;
BEGIN
    -- Solo procesar si el ref_asli no está asignado o está vacío
    IF NEW.ref_asli IS NULL OR TRIM(NEW.ref_asli) = '' THEN
        -- Determinar la fecha de referencia (ingresado o created_at)
        v_fecha_referencia := COALESCE(NEW.ingresado, NEW.created_at);
        
        -- Determinar la temporada basada en especie y fecha
        v_temporada := determinar_temporada(NEW.especie, v_fecha_referencia);
        
        -- Asignar temporada normalizada (mayúsculas y guiones)
        IF v_temporada IS NOT NULL THEN
            NEW.temporada := UPPER(REPLACE(REPLACE(v_temporada, ' ', '-'), '_', '-'));
        END IF;
        
        -- Si hay temporada, asignar ref_asli
        IF v_temporada IS NOT NULL THEN
            NEW.ref_asli := obtener_siguiente_ref_asli(v_temporada);
        END IF;
        
        -- Actualizar updated_at
        NEW.updated_at := NOW();
    ELSE
        -- Si ya tiene ref_asli, solo actualizar temporada si no está asignada
        IF NEW.temporada IS NULL THEN
            v_fecha_referencia := COALESCE(NEW.ingresado, NEW.created_at);
            v_temporada := determinar_temporada(NEW.especie, v_fecha_referencia);
            IF v_temporada IS NOT NULL THEN
                NEW.temporada := UPPER(REPLACE(REPLACE(v_temporada, ' ', '-'), '_', '-'));
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PASO 5: Crear el trigger antes de INSERT
DROP TRIGGER IF EXISTS trigger_asignar_ref_asli_automatico ON public.registros;

CREATE TRIGGER trigger_asignar_ref_asli_automatico
    BEFORE INSERT ON public.registros
    FOR EACH ROW
    EXECUTE FUNCTION asignar_ref_asli_automatico();

-- PASO 6: Crear trigger también para UPDATE (por si se actualiza la especie o fecha)
CREATE OR REPLACE FUNCTION actualizar_ref_asli_si_cambia()
RETURNS TRIGGER AS $$
DECLARE
    v_temporada TEXT;
    v_fecha_referencia TIMESTAMPTZ;
BEGIN
    -- Si cambió la especie o la fecha, recalcular temporada
    IF (OLD.especie IS DISTINCT FROM NEW.especie) 
       OR (OLD.ingresado IS DISTINCT FROM NEW.ingresado) THEN
        
        v_fecha_referencia := COALESCE(NEW.ingresado, NEW.created_at);
        v_temporada := determinar_temporada(NEW.especie, v_fecha_referencia);
        
        -- Si la temporada cambió, actualizar
        IF v_temporada IS DISTINCT FROM NEW.temporada THEN
            NEW.temporada := v_temporada;
            
            -- Normalizar temporada
        IF v_temporada IS NOT NULL THEN
            v_temporada := UPPER(REPLACE(REPLACE(v_temporada, ' ', '-'), '_', '-'));
        END IF;
        
        -- Si cambió la temporada y no tiene ref_asli válido para la nueva temporada
        -- o el ref_asli actual no corresponde a la nueva temporada, regenerar
        IF v_temporada IS NOT NULL THEN
            IF NEW.ref_asli IS NULL 
               OR NEW.ref_asli !~* ('^' || REPLACE(v_temporada, '-', '[- ]') || '[- ]\d+$') THEN
                NEW.ref_asli := obtener_siguiente_ref_asli(v_temporada);
            END IF;
        END IF;
        END IF;
        
        NEW.updated_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_actualizar_ref_asli_si_cambia ON public.registros;

CREATE TRIGGER trigger_actualizar_ref_asli_si_cambia
    BEFORE UPDATE ON public.registros
    FOR EACH ROW
    WHEN (
        (OLD.especie IS DISTINCT FROM NEW.especie) 
        OR (OLD.ingresado IS DISTINCT FROM NEW.ingresado)
    )
    EXECUTE FUNCTION actualizar_ref_asli_si_cambia();

-- PASO 7: Verificar que los triggers se crearon correctamente
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'registros'
    AND trigger_schema = 'public'
ORDER BY trigger_name;

-- =====================================================
-- NOTAS:
-- - El trigger asigna automáticamente temporada y ref_asli al insertar
-- - También actualiza si cambia la especie o fecha en un UPDATE
-- - Formato: TEMPORADA-#### (ej: CHERRY-25-26-0001, POMACEA-CAROZO-2026-0001)
-- - CHERRY 25-26: CEREZA entre septiembre y enero
-- - POMACEA-CAROZO 2026: CIRUELA, MANZANA, KIWI, DURAZNO
-- - Solo asigna si el ref_asli está vacío o NULL
-- - Si ya tiene ref_asli, solo actualiza la temporada si no está asignada
-- =====================================================
