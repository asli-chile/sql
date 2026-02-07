-- =====================================================
-- ACTUALIZAR TEMPORADA PARA CIRUELA
-- =====================================================
-- Este script actualiza todos los registros que tienen
-- especie "ciruela" (con variaciones) 
-- a la temporada "2025-2026"
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
        LOWER(especie) LIKE '%ciruela%'
        OR LOWER(especie) LIKE '%plum%'
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
        LOWER(especie) LIKE '%ciruela%'
        OR LOWER(especie) LIKE '%plum%'
    )
ORDER BY especie, ref_asli
LIMIT 20;

-- PASO 4: ACTUALIZAR los registros
-- Actualizar registros con especie ciruela a temporada "2025-2026"
UPDATE public.registros
SET 
    temporada = '2025-2026',
    updated_at = NOW()
WHERE deleted_at IS NULL
    AND (
        LOWER(especie) LIKE '%ciruela%'
        OR LOWER(especie) LIKE '%plum%'
    );

-- PASO 5: Verificar cuántos registros se actualizaron (DESPUÉS)
SELECT 
    COUNT(*) as total_actualizados,
    temporada
FROM public.registros
WHERE deleted_at IS NULL
    AND temporada = '2025-2026'
    AND (
        LOWER(especie) LIKE '%ciruela%'
        OR LOWER(especie) LIKE '%plum%'
    )
GROUP BY temporada;

-- PASO 6: Verificar por especie después de la actualización
SELECT 
    especie,
    COUNT(*) as cantidad,
    temporada
FROM public.registros
WHERE deleted_at IS NULL
    AND temporada = '2025-2026'
    AND (
        LOWER(especie) LIKE '%ciruela%'
        OR LOWER(especie) LIKE '%plum%'
    )
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
    AND temporada = '2025-2026'
    AND (
        LOWER(especie) LIKE '%ciruela%'
        OR LOWER(especie) LIKE '%plum%'
    )
ORDER BY updated_at DESC, especie, ref_asli
LIMIT 20;

-- =====================================================
-- NOTAS:
-- - El script busca variaciones de "ciruela"
--   (mayúsculas/minúsculas)
-- - También busca "plum" por si hay registros en inglés
-- - Solo actualiza registros que NO están eliminados (deleted_at IS NULL)
-- - Actualiza el campo updated_at automáticamente
-- =====================================================
