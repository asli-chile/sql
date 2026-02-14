-- =====================================================
-- TRIGGER PARA ASIGNAR REF_ASLI SOLO CON FORMATO TEMPORADA
-- =====================================================
-- Este trigger asigna automáticamente ref_asli con formato TEMPORADA-####
-- TODAS las especies usan formato de temporada (NO se usa A####)
-- =====================================================

-- PASO 1: Asegurar que la columna temporada existe
ALTER TABLE public.registros
ADD COLUMN IF NOT EXISTS temporada TEXT;

-- PASO 2: Función para determinar temporada (TODAS las especies tienen temporada)
CREATE OR REPLACE FUNCTION determinar_temporada(
    p_especie TEXT,
    p_fecha TIMESTAMPTZ
) RETURNS TEXT AS $$
DECLARE
    v_especie_lower TEXT;
    v_mes INTEGER;
    v_anio INTEGER;
BEGIN
    v_especie_lower := LOWER(TRIM(p_especie));
    v_anio := EXTRACT(YEAR FROM COALESCE(p_fecha, NOW()));
    
    -- CHERRY 25-26: CEREZA y ARÁNDANOS entre septiembre (9) y enero (1)
    IF v_especie_lower LIKE '%cereza%' 
       OR v_especie_lower LIKE '%cherry%'
       OR v_especie_lower LIKE '%arandano%'
       OR v_especie_lower LIKE '%arándano%'
       OR v_especie_lower LIKE '%blueberr%' THEN
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
       OR v_especie_lower LIKE '%peach%'
       OR v_especie_lower LIKE '%nectarin%' THEN
        RETURN 'POMACEA-CAROZO-2026';
    END IF;
    
    -- UVA: Temporada específica
    IF v_especie_lower LIKE '%uva%' 
       OR v_especie_lower LIKE '%grape%' THEN
        RETURN 'UVA-2026';
    END IF;
    
    -- PALTA: Temporada específica
    IF v_especie_lower LIKE '%palta%' 
       OR v_especie_lower LIKE '%avocado%'
       OR v_especie_lower LIKE '%aguacate%' THEN
        RETURN 'PALTA-2026';
    END IF;
    
    -- CITRICOS: Limón, Naranja, Mandarina
    IF v_especie_lower LIKE '%limon%'
       OR v_especie_lower LIKE '%limón%'
       OR v_especie_lower LIKE '%lemon%'
       OR v_especie_lower LIKE '%naranja%'
       OR v_especie_lower LIKE '%orange%'
       OR v_especie_lower LIKE '%mandarina%'
       OR v_especie_lower LIKE '%tangerine%'
       OR v_especie_lower LIKE '%pomelo%'
       OR v_especie_lower LIKE '%grapefruit%' THEN
        RETURN 'CITRICOS-2026';
    END IF;
    
    -- BERRIES: Frutillas, Frambuesas, etc.
    IF v_especie_lower LIKE '%frutilla%'
       OR v_especie_lower LIKE '%frambuesa%'
       OR v_especie_lower LIKE '%mora%'
       OR v_especie_lower LIKE '%strawberr%'
       OR v_especie_lower LIKE '%raspberr%'
       OR v_especie_lower LIKE '%blackberr%' THEN
        RETURN 'BERRIES-2026';
    END IF;
    
    -- TROPICAL: Piña, Mango, Papaya
    IF v_especie_lower LIKE '%piña%'
       OR v_especie_lower LIKE '%pina%'
       OR v_especie_lower LIKE '%pineapple%'
       OR v_especie_lower LIKE '%mango%'
       OR v_especie_lower LIKE '%papaya%'
       OR v_especie_lower LIKE '%maracuya%'
       OR v_especie_lower LIKE '%maracuyá%' THEN
        RETURN 'TROPICAL-2026';
    END IF;
    
    -- GENERAL: Para cualquier otra especie no clasificada
    -- Usar el año de la fecha o el año actual
    RETURN 'GENERAL-' || v_anio::TEXT;
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
    -- Si no hay temporada, retornar NULL (no debería pasar)
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
        v_fecha_referencia := COALESCE(NEW.ingresado, NEW.created_at, NOW());
        
        -- Determinar la temporada basada en especie y fecha
        -- TODAS las especies tienen temporada ahora
        v_temporada := determinar_temporada(NEW.especie, v_fecha_referencia);
        
        -- Asignar temporada normalizada (mayúsculas y guiones)
        IF v_temporada IS NOT NULL THEN
            NEW.temporada := UPPER(REPLACE(REPLACE(v_temporada, ' ', '-'), '_', '-'));
            -- Generar ref_asli con formato de temporada
            NEW.ref_asli := obtener_siguiente_ref_asli_temporada(v_temporada);
        ELSE
            -- Fallback: si por alguna razón no se determinó temporada, usar GENERAL
            NEW.temporada := 'GENERAL-' || EXTRACT(YEAR FROM v_fecha_referencia)::TEXT;
            NEW.ref_asli := obtener_siguiente_ref_asli_temporada(NEW.temporada);
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

-- PASO 8: Probar las funciones
SELECT '✅ Funciones creadas exitosamente' as resultado;
SELECT 'Siguiente REF ASLI CHERRY:' as tipo, obtener_siguiente_ref_asli_temporada('CHERRY-25-26') as ref_asli;
SELECT 'Siguiente REF ASLI POMACEA:' as tipo, obtener_siguiente_ref_asli_temporada('POMACEA-CAROZO-2026') as ref_asli;
SELECT 'Siguiente REF ASLI UVA:' as tipo, obtener_siguiente_ref_asli_temporada('UVA-2026') as ref_asli;
SELECT 'Siguiente REF ASLI PALTA:' as tipo, obtener_siguiente_ref_asli_temporada('PALTA-2026') as ref_asli;
SELECT 'Siguiente REF ASLI GENERAL:' as tipo, obtener_siguiente_ref_asli_temporada('GENERAL-2026') as ref_asli;

-- =====================================================
-- NOTAS:
-- - TODAS las especies usan formato TEMPORADA-####
-- - NO se usa el formato A####
-- - Especies clasificadas:
--   * CHERRY-25-26: Cereza, Arándano (Sep-Ene)
--   * POMACEA-CAROZO-2026: Ciruela, Manzana, Kiwi, Durazno
--   * UVA-2026: Uva
--   * PALTA-2026: Palta, Avocado
--   * CITRICOS-2026: Limón, Naranja, Mandarina
--   * BERRIES-2026: Frutilla, Frambuesa, Mora
--   * TROPICAL-2026: Piña, Mango, Papaya
--   * GENERAL-2026: Cualquier otra especie
-- - Formato: TEMPORADA-#### (ej: CHERRY-25-26-0001, UVA-2026-0001)
-- - Solo asigna si el ref_asli está vacío o NULL
-- - Usa SECURITY DEFINER para ignorar RLS
-- =====================================================
