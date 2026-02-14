-- Script para completar el campo temporada en registros que no lo tienen
-- Los registros recientes deberían tener temporada 2025-2026

-- 1. Ver cuántos registros no tienen temporada
SELECT 
    COUNT(*) as registros_sin_temporada,
    MIN(created_at) as primer_registro,
    MAX(created_at) as ultimo_registro
FROM registros
WHERE temporada IS NULL OR temporada = '';

-- 2. Ver algunos ejemplos de registros sin temporada
SELECT 
    id,
    ref_asli,
    especie,
    shipper,
    created_at,
    temporada
FROM registros
WHERE temporada IS NULL OR temporada = ''
ORDER BY created_at DESC
LIMIT 10;

-- 3. Actualizar registros sin temporada creados en 2026 a temporada 2025-2026
-- Descomentar para ejecutar:
/*
UPDATE registros
SET 
    temporada = '2025-2026',
    updated_at = NOW()
WHERE (temporada IS NULL OR temporada = '')
AND EXTRACT(YEAR FROM created_at) = 2026;
*/

-- 4. Verificar la actualización
SELECT 
    temporada,
    COUNT(*) as cantidad
FROM registros
GROUP BY temporada
ORDER BY temporada;

-- 5. Ver los registros actualizados
SELECT 
    id,
    ref_asli,
    especie,
    shipper,
    temporada,
    created_at,
    updated_at
FROM registros
WHERE temporada = '2025-2026'
ORDER BY created_at DESC
LIMIT 20;
