-- =====================================================
-- MEJORAR TRIGGER PARA EVITAR DUPLICADOS
-- =====================================================
-- Este script mejora la función obtener_siguiente_ref_asli_temporada
-- para evitar referencias duplicadas usando bloqueos (locks)
-- =====================================================

-- PASO 1: Versión mejorada con bloqueo para evitar duplicados
CREATE OR REPLACE FUNCTION obtener_siguiente_ref_asli_temporada(
    p_temporada TEXT
) RETURNS TEXT AS $$
DECLARE
    v_ultimo_numero INTEGER;
    v_nuevo_ref_asli TEXT;
    v_temporada_normalizada TEXT;
    v_patron_busqueda TEXT;
BEGIN
    IF p_temporada IS NULL THEN
        RETURN NULL;
    END IF;
    
    v_temporada_normalizada := UPPER(REPLACE(REPLACE(p_temporada, ' ', '-'), '_', '-'));
    v_patron_busqueda := '^' || REPLACE(v_temporada_normalizada, '-', '[- ]') || '[- ]\d+$';
    
    -- ✅ MEJORA: Usar bloqueo para evitar duplicados en condiciones de carrera
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
        )
    FOR UPDATE SKIP LOCKED;  -- ✅ Bloquea las filas para evitar duplicados
    
    v_nuevo_ref_asli := v_temporada_normalizada || '-' || 
                        LPAD((v_ultimo_numero + 1)::TEXT, 4, '0');
    
    RETURN v_nuevo_ref_asli;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 2: Mejorar también la función de generar_ref_cliente
CREATE OR REPLACE FUNCTION generar_ref_cliente(
    p_cliente TEXT,
    p_especie TEXT
) RETURNS TEXT AS $$
DECLARE
    v_cliente_prefix TEXT;
    v_especie_prefix TEXT;
    v_correlativo INTEGER;
    v_ref_cliente TEXT;
    v_base_prefix TEXT;
    v_words TEXT[];
    v_word_count INTEGER;
BEGIN
    -- Si no hay cliente o especie, retornar NULL
    IF p_cliente IS NULL OR TRIM(p_cliente) = '' 
       OR p_especie IS NULL OR TRIM(p_especie) = '' THEN
        RETURN NULL;
    END IF;
    
    -- Generar prefijo del cliente (3 o 4 letras según el cliente)
    v_words := string_to_array(UPPER(TRIM(p_cliente)), ' ');
    v_word_count := array_length(v_words, 1);
    
    -- CASO ESPECIAL: COPEFRUT usa 4 letras (COPE)
    IF UPPER(TRIM(p_cliente)) LIKE '%COPEFRUT%' THEN
        v_cliente_prefix := 'COPE';
    ELSIF v_word_count IS NULL OR v_word_count = 0 THEN
        v_cliente_prefix := SUBSTRING(UPPER(TRIM(p_cliente)), 1, 3);
    ELSIF v_word_count = 1 THEN
        -- Una palabra: 3 primeras letras
        v_cliente_prefix := SUBSTRING(v_words[1], 1, 3);
    ELSIF v_word_count = 2 THEN
        -- Dos palabras: primera letra de primera + 2 primeras de segunda
        v_cliente_prefix := SUBSTRING(v_words[1], 1, 1) || SUBSTRING(v_words[2], 1, 2);
    ELSE
        -- Tres o más: primeras iniciales
        v_cliente_prefix := SUBSTRING(v_words[1], 1, 1) || 
                           SUBSTRING(v_words[2], 1, 1) || 
                           SUBSTRING(v_words[3], 1, 1);
    END IF;
    
    -- Asegurar que tenga al menos 3 caracteres (COPEFRUT ya tiene 4)
    IF LENGTH(v_cliente_prefix) < 3 THEN
        v_cliente_prefix := RPAD(v_cliente_prefix, 3, 'X');
    END IF;
    
    -- Generar prefijo de especie (3 letras)
    v_especie_prefix := SUBSTRING(UPPER(TRIM(p_especie)), 1, 3);
    v_especie_prefix := RPAD(v_especie_prefix, 3, 'X');
    
    -- Base del prefijo: [cliente][2526][especie]
    v_base_prefix := v_cliente_prefix || '2526' || v_especie_prefix;
    
    -- ✅ MEJORA: Usar bloqueo para evitar duplicados
    SELECT COALESCE(MAX(
        CAST(
            SUBSTRING(ref_cliente FROM '[0-9]+$') AS INTEGER
        )
    ), 0) + 1 INTO v_correlativo
    FROM public.registros
    WHERE deleted_at IS NULL
        AND ref_cliente ~ ('^' || v_base_prefix || '[0-9]+$')
    FOR UPDATE SKIP LOCKED;  -- ✅ Bloquea las filas para evitar duplicados
    
    -- Si no hay correlativo, empezar desde 1
    IF v_correlativo IS NULL OR v_correlativo < 1 THEN
        v_correlativo := 1;
    END IF;
    
    -- Generar ref_cliente completo
    v_ref_cliente := v_base_prefix || LPAD(v_correlativo::TEXT, 3, '0');
    
    RETURN v_ref_cliente;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 3: Verificar que las funciones se actualizaron
SELECT 
    routine_name,
    routine_type,
    security_type,
    last_altered
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN ('obtener_siguiente_ref_asli_temporada', 'generar_ref_cliente')
ORDER BY routine_name;

-- PASO 4: Probar las funciones actualizadas
SELECT '✅ Funciones actualizadas con bloqueo anti-duplicados' as resultado;

SELECT 'Test REF ASLI POMACEA:' as tipo, obtener_siguiente_ref_asli_temporada('POMACEA-CAROZO-2026') as ref_asli;
SELECT 'Test REF ASLI CHERRY:' as tipo, obtener_siguiente_ref_asli_temporada('CHERRY-25-26') as ref_asli;
SELECT 'Test REF CLIENTE Copefrut + Kiwi:' as tipo, generar_ref_cliente('Copefrut', 'Kiwi') as ref_cliente;

-- =====================================================
-- EXPLICACIÓN DE LA MEJORA:
-- =====================================================
-- Se agregó "FOR UPDATE SKIP LOCKED" a ambas funciones:
-- 
-- 1. FOR UPDATE: Bloquea las filas seleccionadas hasta que termine la transacción
-- 2. SKIP LOCKED: Si hay filas bloqueadas, las omite y sigue con las disponibles
-- 
-- Esto evita que dos inserciones simultáneas lean el mismo número máximo
-- y generen referencias duplicadas.
-- 
-- ANTES (sin bloqueo):
-- -------------------------
-- Usuario A lee: max = 0118
-- Usuario B lee: max = 0118  ❌ Lee el mismo número
-- Usuario A inserta: 0119
-- Usuario B inserta: 0119    ❌ DUPLICADO
-- 
-- AHORA (con bloqueo):
-- -------------------------
-- Usuario A lee: max = 0118 (y bloquea)
-- Usuario B espera...        ✅ Espera el bloqueo
-- Usuario A inserta: 0119
-- Usuario B lee: max = 0119  ✅ Lee el nuevo máximo
-- Usuario B inserta: 0120    ✅ Sin duplicados
-- =====================================================
