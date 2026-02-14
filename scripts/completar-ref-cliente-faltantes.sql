-- =====================================================
-- COMPLETAR REF CLIENTE FALTANTES
-- =====================================================
-- Este script completa los ref_cliente para todos los registros
-- que no tienen uno asignado
-- =====================================================

-- PASO 1: Verificar cuántos registros no tienen ref_cliente
SELECT 
    'ANTES DE LA ACTUALIZACIÓN' as etapa,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN ref_cliente IS NULL OR TRIM(ref_cliente) = '' THEN 1 END) as sin_ref_cliente,
    COUNT(CASE WHEN ref_cliente IS NOT NULL AND TRIM(ref_cliente) != '' THEN 1 END) as con_ref_cliente
FROM public.registros
WHERE deleted_at IS NULL;

-- PASO 2: Ver algunos ejemplos de registros sin ref_cliente
SELECT 
    id,
    ref_asli,
    shipper,
    especie,
    ref_cliente,
    created_at
FROM public.registros
WHERE deleted_at IS NULL
    AND (ref_cliente IS NULL OR TRIM(ref_cliente) = '')
    AND shipper IS NOT NULL 
    AND especie IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;

-- PASO 3: Asegurarse de que la función generar_ref_cliente existe
-- (Si ya ejecutaste el script anterior, esta función ya existe)
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
    
    -- Obtener el siguiente correlativo para este prefijo
    SELECT COALESCE(MAX(
        CAST(
            SUBSTRING(ref_cliente FROM '[0-9]+$') AS INTEGER
        )
    ), 0) + 1 INTO v_correlativo
    FROM public.registros
    WHERE deleted_at IS NULL
        AND ref_cliente ~ ('^' || v_base_prefix || '[0-9]+$');
    
    -- Si no hay correlativo, empezar desde 1
    IF v_correlativo IS NULL OR v_correlativo < 1 THEN
        v_correlativo := 1;
    END IF;
    
    -- Generar ref_cliente completo
    v_ref_cliente := v_base_prefix || LPAD(v_correlativo::TEXT, 3, '0');
    
    RETURN v_ref_cliente;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 4: ACTUALIZAR todos los registros sin ref_cliente
-- Usando un CTE para generar los ref_cliente de forma secuencial
WITH registros_sin_ref AS (
    SELECT 
        id,
        shipper,
        especie,
        ROW_NUMBER() OVER (
            PARTITION BY shipper, especie 
            ORDER BY COALESCE(ingresado, created_at), id
        ) as row_num
    FROM public.registros
    WHERE deleted_at IS NULL
        AND (ref_cliente IS NULL OR TRIM(ref_cliente) = '')
        AND shipper IS NOT NULL 
        AND TRIM(shipper) != ''
        AND especie IS NOT NULL 
        AND TRIM(especie) != ''
),
ref_cliente_generado AS (
    SELECT 
        id,
        shipper,
        especie,
        generar_ref_cliente(shipper, especie) as nuevo_ref_cliente
    FROM registros_sin_ref
)
UPDATE public.registros r
SET 
    ref_cliente = rcg.nuevo_ref_cliente,
    updated_at = NOW()
FROM ref_cliente_generado rcg
WHERE r.id = rcg.id
    AND r.deleted_at IS NULL;

-- PASO 5: Verificar el resultado
SELECT 
    'DESPUÉS DE LA ACTUALIZACIÓN' as etapa,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN ref_cliente IS NULL OR TRIM(ref_cliente) = '' THEN 1 END) as sin_ref_cliente,
    COUNT(CASE WHEN ref_cliente IS NOT NULL AND TRIM(ref_cliente) != '' THEN 1 END) as con_ref_cliente
FROM public.registros
WHERE deleted_at IS NULL;

-- PASO 6: Ver algunos ejemplos de registros actualizados
SELECT 
    id,
    ref_asli,
    ref_cliente,
    shipper,
    especie,
    created_at,
    updated_at
FROM public.registros
WHERE deleted_at IS NULL
    AND ref_cliente IS NOT NULL 
    AND TRIM(ref_cliente) != ''
ORDER BY updated_at DESC
LIMIT 20;

-- PASO 7: Verificar que no hay duplicados en ref_cliente
SELECT 
    ref_cliente,
    COUNT(*) as cantidad,
    STRING_AGG(id::TEXT, ', ') as ids
FROM public.registros
WHERE deleted_at IS NULL
    AND ref_cliente IS NOT NULL
GROUP BY ref_cliente
HAVING COUNT(*) > 1;

-- PASO 8: Mostrar distribución por cliente y especie
SELECT 
    shipper,
    especie,
    COUNT(*) as cantidad_registros,
    MIN(ref_cliente) as primer_ref_cliente,
    MAX(ref_cliente) as ultimo_ref_cliente
FROM public.registros
WHERE deleted_at IS NULL
    AND ref_cliente IS NOT NULL
GROUP BY shipper, especie
ORDER BY shipper, especie;

-- PASO 9: Mostrar registros que NO pudieron actualizarse (sin cliente o especie)
SELECT 
    id,
    ref_asli,
    shipper,
    especie,
    ref_cliente,
    'Falta cliente o especie' as motivo
FROM public.registros
WHERE deleted_at IS NULL
    AND (ref_cliente IS NULL OR TRIM(ref_cliente) = '')
    AND (shipper IS NULL OR TRIM(shipper) = '' OR especie IS NULL OR TRIM(especie) = '')
ORDER BY created_at DESC
LIMIT 20;

-- =====================================================
-- NOTAS:
-- - Este script completa TODOS los ref_cliente faltantes
-- - Formato: [3 letras cliente][2526][3 letras especie][001]
-- - Ejemplos:
--   * Fruit Andes Sur + Kiwi = FAS2526KIW001
--   * Copefrut + Cereza = COP2526CER001
--   * San Andres + Manzana = SAN2526MAN001
-- - Solo actualiza registros que tienen cliente Y especie
-- - Los registros sin cliente o especie quedan sin ref_cliente
-- - Usa SECURITY DEFINER para ignorar RLS
-- =====================================================

-- PASO 10: Mensaje final
SELECT '✅ REF CLIENTE completados exitosamente' as resultado;
SELECT 
    'Total actualizado: ' || COUNT(*) as mensaje
FROM public.registros
WHERE deleted_at IS NULL
    AND ref_cliente IS NOT NULL 
    AND TRIM(ref_cliente) != ''
    AND updated_at > NOW() - INTERVAL '1 minute';
