-- =====================================================
-- ASIGNAR REF ASLI ÚNICOS A TODOS LOS REGISTROS
-- =====================================================
-- Este script asigna ref_asli únicos a todos los registros
-- empezando desde A0001, asegurando que no haya duplicados
-- =====================================================

-- PASO 1: Verificar estado actual antes de la actualización
SELECT 
    'ANTES DE LA ACTUALIZACIÓN' as etapa,
    COUNT(*) as total_registros,
    COUNT(DISTINCT ref_asli) as ref_asli_unicos,
    COUNT(*) - COUNT(DISTINCT ref_asli) as duplicados
FROM public.registros
WHERE deleted_at IS NULL;

-- PASO 2: Mostrar algunos ejemplos de duplicados (si existen)
SELECT 
    ref_asli,
    COUNT(*) as cantidad_duplicados,
    ARRAY_AGG(id ORDER BY created_at) as ids_duplicados
FROM public.registros
WHERE deleted_at IS NULL
GROUP BY ref_asli
HAVING COUNT(*) > 1
ORDER BY cantidad_duplicados DESC
LIMIT 10;

-- PASO 3: Mostrar algunos registros que se actualizarán
SELECT 
    id,
    ref_asli as ref_asli_actual,
    especie,
    shipper,
    created_at
FROM public.registros
WHERE deleted_at IS NULL
ORDER BY created_at
LIMIT 20;

-- PASO 4: ACTUALIZAR todos los registros con ref_asli únicos
-- Usando ROW_NUMBER para asignar números secuenciales empezando desde 1
WITH registros_ordenados AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (ORDER BY created_at, id) as numero_secuencial
    FROM public.registros
    WHERE deleted_at IS NULL
)
UPDATE public.registros r
SET 
    ref_asli = 'A' || LPAD(ro.numero_secuencial::TEXT, 4, '0'),
    updated_at = NOW()
FROM registros_ordenados ro
WHERE r.id = ro.id
    AND r.deleted_at IS NULL;

-- PASO 5: Verificar estado después de la actualización
SELECT 
    'DESPUÉS DE LA ACTUALIZACIÓN' as etapa,
    COUNT(*) as total_registros,
    COUNT(DISTINCT ref_asli) as ref_asli_unicos,
    COUNT(*) - COUNT(DISTINCT ref_asli) as duplicados
FROM public.registros
WHERE deleted_at IS NULL;

-- PASO 6: Verificar que no hay duplicados
SELECT 
    ref_asli,
    COUNT(*) as cantidad
FROM public.registros
WHERE deleted_at IS NULL
GROUP BY ref_asli
HAVING COUNT(*) > 1;

-- PASO 7: Mostrar el rango de ref_asli asignados
SELECT 
    MIN(ref_asli) as ref_asli_minimo,
    MAX(ref_asli) as ref_asli_maximo,
    COUNT(*) as total_registros
FROM public.registros
WHERE deleted_at IS NULL
    AND ref_asli ~ '^A\d+$';

-- PASO 8: Mostrar algunos registros actualizados como confirmación
SELECT 
    ref_asli,
    especie,
    shipper,
    estado,
    created_at,
    updated_at
FROM public.registros
WHERE deleted_at IS NULL
ORDER BY ref_asli
LIMIT 20;

-- =====================================================
-- NOTAS:
-- - El script asigna ref_asli únicos empezando desde A0001
-- - Los registros se ordenan por created_at y luego por id
-- - Solo actualiza registros que NO están eliminados (deleted_at IS NULL)
-- - Actualiza el campo updated_at automáticamente
-- - El formato es A#### (A seguido de 4 dígitos con ceros a la izquierda)
-- =====================================================
