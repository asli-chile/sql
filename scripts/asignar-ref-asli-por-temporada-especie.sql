-- =====================================================
-- ASIGNAR REF ASLI ÚNICOS POR TEMPORADA-ESPECIE
-- =====================================================
-- Este script asigna ref_asli únicos agrupados por temporada y especie
-- - CHERRY 25-26: CEREZA entre septiembre y enero
-- - POMACEA-CAROZO 2026: CIRUELA, MANZANA, KIWI, DURAZNO
-- =====================================================

-- PASO 1: Asegurar que la columna temporada existe
ALTER TABLE public.registros
ADD COLUMN IF NOT EXISTS temporada TEXT;

-- PASO 2: Función auxiliar para determinar temporada basada en especie y fecha
-- Esta función determina la temporada según la especie y la fecha
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

-- PASO 3: Verificar estado actual antes de la actualización
SELECT 
    'ANTES DE LA ACTUALIZACIÓN' as etapa,
    COUNT(*) as total_registros,
    COUNT(DISTINCT ref_asli) as ref_asli_unicos,
    COUNT(*) - COUNT(DISTINCT ref_asli) as duplicados,
    COUNT(CASE WHEN temporada IS NOT NULL THEN 1 END) as registros_con_temporada
FROM public.registros
WHERE deleted_at IS NULL;

-- PASO 4: Mostrar distribución por especie y temporada (ANTES)
SELECT 
    especie,
    determinar_temporada(especie, COALESCE(ingresado, created_at)) as temporada_calculada,
    COUNT(*) as cantidad,
    MIN(COALESCE(ingresado, created_at)) as fecha_minima,
    MAX(COALESCE(ingresado, created_at)) as fecha_maxima
FROM public.registros
WHERE deleted_at IS NULL
GROUP BY especie, determinar_temporada(especie, COALESCE(ingresado, created_at))
ORDER BY temporada_calculada, especie;

-- PASO 5: Mostrar algunos ejemplos de registros que se actualizarán
SELECT 
    id,
    ref_asli as ref_asli_actual,
    especie,
    COALESCE(ingresado, created_at) as fecha_referencia,
    EXTRACT(MONTH FROM COALESCE(ingresado, created_at)) as mes,
    determinar_temporada(especie, COALESCE(ingresado, created_at)) as temporada_calculada,
    shipper,
    created_at
FROM public.registros
WHERE deleted_at IS NULL
    AND determinar_temporada(especie, COALESCE(ingresado, created_at)) IS NOT NULL
ORDER BY temporada_calculada, especie, created_at
LIMIT 30;

-- PASO 6: ACTUALIZAR temporada en todos los registros
-- Normalizar temporada a formato estándar (mayúsculas y guiones)
UPDATE public.registros
SET 
    temporada = UPPER(REPLACE(REPLACE(
        determinar_temporada(especie, COALESCE(ingresado, created_at)),
        ' ', '-'), '_', '-')),
    updated_at = NOW()
WHERE deleted_at IS NULL
    AND determinar_temporada(especie, COALESCE(ingresado, created_at)) IS NOT NULL;

-- PASO 7: ACTUALIZAR ref_asli agrupado por temporada
-- Para cada temporada, asignar números secuenciales
WITH registros_por_temporada AS (
    SELECT 
        id,
        temporada,
        especie,
        ROW_NUMBER() OVER (
            PARTITION BY temporada 
            ORDER BY COALESCE(ingresado, created_at), id
        ) as numero_secuencial
    FROM public.registros
    WHERE deleted_at IS NULL
        AND temporada IS NOT NULL
),
ref_asli_generado AS (
    SELECT 
        id,
        temporada,
        especie,
        numero_secuencial,
        -- Generar ref_asli: TEMPORADA-####
        -- Ejemplo: CHERRY-25-26-0001, POMACEA-CAROZO-2026-0001
        UPPER(temporada) || '-' ||
        LPAD(numero_secuencial::TEXT, 4, '0') as nuevo_ref_asli
    FROM registros_por_temporada
)
UPDATE public.registros r
SET 
    ref_asli = rag.nuevo_ref_asli,
    updated_at = NOW()
FROM ref_asli_generado rag
WHERE r.id = rag.id
    AND r.deleted_at IS NULL;

-- PASO 8: Verificar estado después de la actualización
SELECT 
    'DESPUÉS DE LA ACTUALIZACIÓN' as etapa,
    COUNT(*) as total_registros,
    COUNT(DISTINCT ref_asli) as ref_asli_unicos,
    COUNT(*) - COUNT(DISTINCT ref_asli) as duplicados,
    COUNT(CASE WHEN temporada IS NOT NULL THEN 1 END) as registros_con_temporada
FROM public.registros
WHERE deleted_at IS NULL;

-- PASO 9: Verificar que no hay duplicados
SELECT 
    ref_asli,
    COUNT(*) as cantidad
FROM public.registros
WHERE deleted_at IS NULL
GROUP BY ref_asli
HAVING COUNT(*) > 1;

-- PASO 10: Mostrar distribución por temporada después de la actualización
SELECT 
    temporada,
    COUNT(*) as cantidad_registros,
    COUNT(DISTINCT especie) as especies_distintas,
    STRING_AGG(DISTINCT especie, ', ' ORDER BY especie) as especies,
    MIN(ref_asli) as ref_asli_minimo,
    MAX(ref_asli) as ref_asli_maximo
FROM public.registros
WHERE deleted_at IS NULL
    AND temporada IS NOT NULL
GROUP BY temporada
ORDER BY temporada;

-- PASO 11: Mostrar algunos registros actualizados como confirmación
SELECT 
    ref_asli,
    temporada,
    especie,
    shipper,
    estado,
    COALESCE(ingresado, created_at) as fecha_referencia,
    created_at,
    updated_at
FROM public.registros
WHERE deleted_at IS NULL
    AND temporada IS NOT NULL
ORDER BY temporada, especie, ref_asli
LIMIT 30;

-- PASO 12: Mostrar registros que NO tienen temporada asignada (para revisión)
SELECT 
    ref_asli,
    especie,
    COALESCE(ingresado, created_at) as fecha_referencia,
    EXTRACT(MONTH FROM COALESCE(ingresado, created_at)) as mes,
    shipper,
    estado
FROM public.registros
WHERE deleted_at IS NULL
    AND temporada IS NULL
ORDER BY especie, created_at
LIMIT 20;

-- =====================================================
-- NOTAS:
-- - El script asigna ref_asli únicos agrupados por temporada-especie
-- - Formato: TEMPORADA-#### (ej: CHERRY-25-26-0001, POMACEA-CAROZO-2026-0001)
-- - CHERRY 25-26: CEREZA entre septiembre y enero
-- - POMACEA-CAROZO 2026: CIRUELA, MANZANA, KIWI, DURAZNO
-- - Los registros se ordenan por fecha (ingresado o created_at) dentro de cada grupo
-- - Solo actualiza registros que NO están eliminados (deleted_at IS NULL)
-- - Actualiza el campo updated_at automáticamente
-- - Los registros que no coinciden con ninguna temporada quedan sin temporada asignada
-- =====================================================
