-- =====================================================
-- ACTUALIZAR REF CLIENTE DE COPEFRUT A 4 LETRAS
-- =====================================================
-- Este script actualiza SOLO los registros de Copefrut
-- para usar 4 letras (COPE) en lugar de 3 (COP)
-- =====================================================

-- PASO 1: Ver registros actuales de Copefrut
SELECT 
    'REGISTROS ACTUALES DE COPEFRUT' as etapa,
    COUNT(*) as total_registros,
    COUNT(DISTINCT ref_cliente) as ref_cliente_unicos
FROM public.registros
WHERE deleted_at IS NULL
    AND UPPER(TRIM(shipper)) LIKE '%COPEFRUT%';

-- PASO 2: Ver algunos ejemplos de los ref_cliente actuales
SELECT 
    id,
    ref_asli,
    ref_cliente as ref_cliente_actual,
    shipper,
    especie,
    created_at
FROM public.registros
WHERE deleted_at IS NULL
    AND UPPER(TRIM(shipper)) LIKE '%COPEFRUT%'
ORDER BY especie, ref_cliente
LIMIT 20;

-- PASO 3: Función para generar ref_cliente con 4 letras para Copefrut
CREATE OR REPLACE FUNCTION generar_ref_cliente_copefrut(
    p_especie TEXT
) RETURNS TEXT AS $$
DECLARE
    v_especie_prefix TEXT;
    v_correlativo INTEGER;
    v_ref_cliente TEXT;
    v_base_prefix TEXT;
BEGIN
    -- Si no hay especie, retornar NULL
    IF p_especie IS NULL OR TRIM(p_especie) = '' THEN
        RETURN NULL;
    END IF;
    
    -- Prefijo de Copefrut: COPE (4 letras)
    v_base_prefix := 'COPE';
    
    -- Generar prefijo de especie (3 letras)
    v_especie_prefix := SUBSTRING(UPPER(TRIM(p_especie)), 1, 3);
    v_especie_prefix := RPAD(v_especie_prefix, 3, 'X');
    
    -- Base del prefijo: COPE2526[especie]
    v_base_prefix := 'COPE2526' || v_especie_prefix;
    
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

-- PASO 4: ACTUALIZAR todos los registros de Copefrut
-- Agrupar por especie y asignar correlativos secuenciales
WITH registros_copefrut AS (
    SELECT 
        id,
        especie,
        ref_cliente as ref_cliente_viejo,
        ROW_NUMBER() OVER (
            PARTITION BY especie 
            ORDER BY COALESCE(ingresado, created_at), id
        ) as row_num
    FROM public.registros
    WHERE deleted_at IS NULL
        AND UPPER(TRIM(shipper)) LIKE '%COPEFRUT%'
),
ref_cliente_nuevo AS (
    SELECT 
        id,
        especie,
        ref_cliente_viejo,
        'COPE2526' || 
        RPAD(SUBSTRING(UPPER(TRIM(especie)), 1, 3), 3, 'X') || 
        LPAD(row_num::TEXT, 3, '0') as ref_cliente_nuevo
    FROM registros_copefrut
)
UPDATE public.registros r
SET 
    ref_cliente = rcn.ref_cliente_nuevo,
    updated_at = NOW()
FROM ref_cliente_nuevo rcn
WHERE r.id = rcn.id
    AND r.deleted_at IS NULL;

-- PASO 5: Verificar el resultado
SELECT 
    'DESPUÉS DE LA ACTUALIZACIÓN' as etapa,
    COUNT(*) as total_registros,
    COUNT(DISTINCT ref_cliente) as ref_cliente_unicos
FROM public.registros
WHERE deleted_at IS NULL
    AND UPPER(TRIM(shipper)) LIKE '%COPEFRUT%';

-- PASO 6: Ver ejemplos de los ref_cliente actualizados
SELECT 
    id,
    ref_asli,
    ref_cliente as ref_cliente_nuevo,
    shipper,
    especie,
    updated_at
FROM public.registros
WHERE deleted_at IS NULL
    AND UPPER(TRIM(shipper)) LIKE '%COPEFRUT%'
ORDER BY especie, ref_cliente
LIMIT 20;

-- PASO 7: Comparación ANTES vs DESPUÉS
SELECT 
    'COMPARACIÓN' as tipo,
    'COP2526XXX###' as formato_anterior,
    'COPE2526XXX###' as formato_nuevo,
    'Ejemplo: COP2526CER001 → COPE2526CER001' as ejemplo;

-- PASO 8: Verificar que no hay duplicados
SELECT 
    ref_cliente,
    COUNT(*) as cantidad,
    STRING_AGG(id::TEXT, ', ') as ids
FROM public.registros
WHERE deleted_at IS NULL
    AND UPPER(TRIM(shipper)) LIKE '%COPEFRUT%'
GROUP BY ref_cliente
HAVING COUNT(*) > 1;

-- PASO 9: Distribución por especie
SELECT 
    especie,
    COUNT(*) as cantidad_registros,
    MIN(ref_cliente) as primer_ref_cliente,
    MAX(ref_cliente) as ultimo_ref_cliente
FROM public.registros
WHERE deleted_at IS NULL
    AND UPPER(TRIM(shipper)) LIKE '%COPEFRUT%'
GROUP BY especie
ORDER BY especie;

-- =====================================================
-- NOTAS:
-- - Este script actualiza SOLO registros de Copefrut
-- - Cambia de COP (3 letras) a COPE (4 letras)
-- - Formato nuevo: COPE2526[especie][001]
-- - Ejemplos:
--   * Copefrut + Cereza: COP2526CER001 → COPE2526CER001
--   * Copefrut + Kiwi: COP2526KIW001 → COPE2526KIW001
--   * Copefrut + Manzana: COP2526MAN001 → COPE2526MAN001
-- - Los correlativos se mantienen secuenciales por especie
-- - Usa SECURITY DEFINER para ignorar RLS
-- =====================================================

-- PASO 10: Mensaje final
SELECT '✅ REF CLIENTE de Copefrut actualizados a 4 letras (COPE)' as resultado;
SELECT 
    'Total actualizado: ' || COUNT(*) as mensaje
FROM public.registros
WHERE deleted_at IS NULL
    AND UPPER(TRIM(shipper)) LIKE '%COPEFRUT%'
    AND ref_cliente LIKE 'COPE2526%'
    AND updated_at > NOW() - INTERVAL '1 minute';
