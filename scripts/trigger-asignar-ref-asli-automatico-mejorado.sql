-- =====================================================
-- TRIGGER MEJORADO PARA ASIGNAR REF_ASLI AUTOMÁTICAMENTE
-- =====================================================
-- Este trigger asigna automáticamente ref_asli y temporada
-- a TODOS los registros cuando se insertan
-- - Con temporada: TEMPORADA-#### (ej: CHERRY-25-26-0001)
-- - Sin temporada: A#### (ej: A0001)
-- =====================================================

-- PASO 1: Asegurar que la columna temporada existe
ALTER TABLE public.registros
ADD COLUMN IF NOT EXISTS temporada TEXT;

-- PASO 2: Función para determinar temporada
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
CREATE OR REPLACE FUNCTION obtener_siguiente_ref_asli_temporada(
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 4: Función que genera el siguiente ref_asli formato A#### (sin temporada)
CREATE OR REPLACE FUNCTION obtener_siguiente_ref_asli_simple()
RETURNS TEXT AS $$
DECLARE
    v_siguiente_numero INTEGER;
    v_nuevo_ref_asli TEXT;
BEGIN
    -- Buscar el primer número disponible (rellena huecos)
    SELECT gs.candidate INTO v_siguiente_numero
    FROM (
        SELECT generate_series(
            1,
            COALESCE((
                SELECT COALESCE(MAX(
                    CASE 
                        WHEN ref_asli ~ '^A\d+$' THEN 
                            CAST(SUBSTRING(ref_asli FROM '^A(\d+)$') AS INTEGER)
                        ELSE 0
                    END
                ), 0)
                FROM registros
                WHERE ref_asli ~ '^A\d+$'
                  AND deleted_at IS NULL
            ), 0) + 1
        ) AS candidate
    ) AS gs
    LEFT JOIN (
        SELECT DISTINCT CAST(SUBSTRING(ref_asli FROM '^A(\d+)$') AS INTEGER) AS existente
        FROM registros
        WHERE ref_asli ~ '^A\d+$'
          AND deleted_at IS NULL
    ) AS existentes
    ON existentes.existente = gs.candidate
    WHERE existentes.existente IS NULL
    ORDER BY gs.candidate
    LIMIT 1;
    
    -- Si no se encontró número, empezar desde 1
    IF v_siguiente_numero IS NULL OR v_siguiente_numero < 1 THEN
        v_siguiente_numero := 1;
    END IF;
    
    -- Generar el ref_asli con formato A####
    v_nuevo_ref_asli := 'A' || LPAD(v_siguiente_numero::TEXT, 4, '0');
    
    RETURN v_nuevo_ref_asli;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 5: Función del trigger que asigna temporada y ref_asli automáticamente
CREATE OR REPLACE FUNCTION asignar_ref_asli_automatico()
RETURNS TRIGGER AS $$
DECLARE
    v_temporada TEXT;
    v_fecha_referencia TIMESTAMPTZ;
BEGIN
    -- Solo procesar si el ref_asli no está asignado o está vacío
    IF NEW.ref_asli IS NULL OR TRIM(NEW.ref_asli) = '' THEN
        -- Determinar la fecha de referencia (ingresado o created_at)
        v_fecha_referencia := COALESCE(NEW.ingresado, NEW.created_at, NOW());
        
        -- Determinar la temporada basada en especie y fecha
        v_temporada := determinar_temporada(NEW.especie, v_fecha_referencia);
        
        -- Asignar temporada normalizada (mayúsculas y guiones)
        IF v_temporada IS NOT NULL THEN
            NEW.temporada := UPPER(REPLACE(REPLACE(v_temporada, ' ', '-'), '_', '-'));
            -- Generar ref_asli con formato de temporada
            NEW.ref_asli := obtener_siguiente_ref_asli_temporada(v_temporada);
        ELSE
            -- Sin temporada: generar ref_asli formato A####
            NEW.temporada := NULL;
            NEW.ref_asli := obtener_siguiente_ref_asli_simple();
        END IF;
        
        -- Actualizar updated_at
        NEW.updated_at := NOW();
    ELSE
        -- Si ya tiene ref_asli, solo actualizar temporada si no está asignada
        IF NEW.temporada IS NULL THEN
            v_fecha_referencia := COALESCE(NEW.ingresado, NEW.created_at, NOW());
            v_temporada := determinar_temporada(NEW.especie, v_fecha_referencia);
            IF v_temporada IS NOT NULL THEN
                NEW.temporada := UPPER(REPLACE(REPLACE(v_temporada, ' ', '-'), '_', '-'));
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PASO 6: Crear el trigger antes de INSERT
DROP TRIGGER IF EXISTS trigger_asignar_ref_asli_automatico ON public.registros;

CREATE TRIGGER trigger_asignar_ref_asli_automatico
    BEFORE INSERT ON public.registros
    FOR EACH ROW
    EXECUTE FUNCTION asignar_ref_asli_automatico();

-- PASO 7: Crear trigger también para UPDATE (por si se actualiza la especie o fecha)
CREATE OR REPLACE FUNCTION actualizar_ref_asli_si_cambia()
RETURNS TRIGGER AS $$
DECLARE
    v_temporada TEXT;
    v_fecha_referencia TIMESTAMPTZ;
BEGIN
    -- Si cambió la especie o la fecha, recalcular temporada
    IF (OLD.especie IS DISTINCT FROM NEW.especie) 
       OR (OLD.ingresado IS DISTINCT FROM NEW.ingresado) THEN
        
        v_fecha_referencia := COALESCE(NEW.ingresado, NEW.created_at, NOW());
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
                    NEW.ref_asli := obtener_siguiente_ref_asli_temporada(v_temporada);
                END IF;
            ELSE
                -- Si ya no tiene temporada, regenerar con formato A####
                IF NEW.ref_asli IS NULL OR NEW.ref_asli !~ '^A\d+$' THEN
                    NEW.ref_asli := obtener_siguiente_ref_asli_simple();
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

-- PASO 8: Verificar que los triggers se crearon correctamente
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'registros'
    AND trigger_schema = 'public'
ORDER BY trigger_name;

-- PASO 9: Probar las funciones
SELECT '✅ Funciones creadas exitosamente' as resultado;
SELECT 'Siguiente REF ASLI simple:' as tipo, obtener_siguiente_ref_asli_simple() as ref_asli;
SELECT 'Siguiente REF ASLI CHERRY:' as tipo, obtener_siguiente_ref_asli_temporada('CHERRY-25-26') as ref_asli;
SELECT 'Siguiente REF ASLI POMACEA:' as tipo, obtener_siguiente_ref_asli_temporada('POMACEA-CAROZO-2026') as ref_asli;

-- =====================================================
-- NOTAS:
-- - El trigger asigna automáticamente temporada y ref_asli al insertar
-- - También actualiza si cambia la especie o fecha en un UPDATE
-- - Formato con temporada: TEMPORADA-#### (ej: CHERRY-25-26-0001)
-- - Formato sin temporada: A#### (ej: A0001)
-- - CHERRY 25-26: CEREZA y ARÁNDANOS entre septiembre y enero
-- - POMACEA-CAROZO 2026: CIRUELA, MANZANA, KIWI, DURAZNO
-- - Solo asigna si el ref_asli está vacío o NULL
-- - Si ya tiene ref_asli, solo actualiza la temporada si no está asignada
-- - Usa SECURITY DEFINER para ignorar RLS y ver todos los registros
-- =====================================================
