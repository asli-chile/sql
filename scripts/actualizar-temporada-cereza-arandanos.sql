-- =====================================================
-- ACTUALIZAR TEMPORADA PARA CEREZA Y ARÁNDANOS
-- =====================================================
-- Este script actualiza todos los registros que tienen
-- especie "cereza" o "arándanos" (con variaciones) 
-- a la temporada "cherry 25-26"
-- =====================================================

-- PASO 1: Asegurar que la columna temporada existe
ALTER TABLE public.registros
ADD COLUMN IF NOT EXISTS temporada TEXT;

-- PASO 2: Verificar cuántos registros se van a actualizar (ANTES)
SELECT 
    especie,
    COUNT(*) as cantidad,
    temporada as temporada_actual
FROM public.registros
WHERE deleted_at IS NULL
    AND (
        LOWER(especie) LIKE '%cereza%' 
        OR LOWER(especie) LIKE '%arandano%'
        OR LOWER(especie) LIKE '%arándano%'
        OR LOWER(especie) LIKE '%cherry%'
    )
GROUP BY especie, temporada
ORDER BY especie;

-- PASO 3: Mostrar algunos ejemplos de registros que se actualizarán
SELECT 
    ref_asli,
    especie,
    temporada as temporada_actual,
    shipper,
    estado
FROM public.registros
WHERE deleted_at IS NULL
    AND (
        LOWER(especie) LIKE '%cereza%' 
        OR LOWER(especie) LIKE '%arandano%'
        OR LOWER(especie) LIKE '%arándano%'
        OR LOWER(especie) LIKE '%cherry%'
    )
ORDER BY especie, ref_asli
LIMIT 20;

-- PASO 4: ACTUALIZAR los registros
-- Actualizar registros con especie cereza o arándanos a temporada "cherry 25-26"
UPDATE public.registros
SET 
    temporada = 'cherry 25-26',
    updated_at = NOW()
WHERE deleted_at IS NULL
    AND (
        LOWER(especie) LIKE '%cereza%' 
        OR LOWER(especie) LIKE '%arandano%'
        OR LOWER(especie) LIKE '%arándano%'
        OR LOWER(especie) LIKE '%cherry%'
    );

-- PASO 5: Verificar cuántos registros se actualizaron (DESPUÉS)
SELECT 
    COUNT(*) as total_actualizados,
    temporada
FROM public.registros
WHERE deleted_at IS NULL
    AND temporada = 'cherry 25-26'
GROUP BY temporada;

-- PASO 6: Verificar por especie después de la actualización
SELECT 
    especie,
    COUNT(*) as cantidad,
    temporada
FROM public.registros
WHERE deleted_at IS NULL
    AND temporada = 'cherry 25-26'
GROUP BY especie, temporada
ORDER BY especie;

-- PASO 7: Mostrar algunos registros actualizados como confirmación
SELECT 
    ref_asli,
    especie,
    temporada,
    shipper,
    estado,
    updated_at
FROM public.registros
WHERE deleted_at IS NULL
    AND temporada = 'cherry 25-26'
ORDER BY updated_at DESC, especie, ref_asli
LIMIT 20;

-- =====================================================
-- NOTAS:
-- - El script busca variaciones de "cereza" y "arándanos"
--   (con y sin acento, mayúsculas/minúsculas)
-- - También busca "cherry" por si hay registros en inglés
-- - Solo actualiza registros que NO están eliminados (deleted_at IS NULL)
-- - Actualiza el campo updated_at automáticamente
-- =====================================================
