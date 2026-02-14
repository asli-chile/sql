-- =====================================================
-- COMPLETAR REF CLIENTE FALTANTES (VERSIÓN SIMPLE)
-- =====================================================
-- Script rápido para completar ref_cliente en registros que no lo tienen
-- =====================================================

-- Ver cuántos registros necesitan ref_cliente
SELECT 
    COUNT(*) as registros_sin_ref_cliente
FROM public.registros
WHERE deleted_at IS NULL
    AND (ref_cliente IS NULL OR TRIM(ref_cliente) = '')
    AND shipper IS NOT NULL 
    AND especie IS NOT NULL;

-- ACTUALIZAR todos los registros sin ref_cliente
UPDATE public.registros
SET 
    ref_cliente = (
        -- Generar prefijo del cliente (3 letras)
        CASE 
            -- Tres o más palabras: primeras iniciales
            WHEN array_length(string_to_array(UPPER(TRIM(shipper)), ' '), 1) >= 3 THEN
                SUBSTRING(string_to_array(UPPER(TRIM(shipper)), ' ')[1], 1, 1) ||
                SUBSTRING(string_to_array(UPPER(TRIM(shipper)), ' ')[2], 1, 1) ||
                SUBSTRING(string_to_array(UPPER(TRIM(shipper)), ' ')[3], 1, 1)
            -- Dos palabras: primera letra de primera + 2 primeras de segunda
            WHEN array_length(string_to_array(UPPER(TRIM(shipper)), ' '), 1) = 2 THEN
                SUBSTRING(string_to_array(UPPER(TRIM(shipper)), ' ')[1], 1, 1) ||
                SUBSTRING(string_to_array(UPPER(TRIM(shipper)), ' ')[2], 1, 2)
            -- Una palabra: 3 primeras letras
            ELSE
                SUBSTRING(UPPER(TRIM(shipper)), 1, 3)
        END ||
        '2526' ||
        -- Prefijo de especie (3 letras)
        SUBSTRING(UPPER(TRIM(especie)), 1, 3) ||
        -- Correlativo (001, 002, etc.)
        LPAD(
            (
                SELECT COALESCE(MAX(
                    CAST(SUBSTRING(r2.ref_cliente FROM '[0-9]+$') AS INTEGER)
                ), 0) + 1
                FROM public.registros r2
                WHERE r2.deleted_at IS NULL
                    AND r2.shipper = registros.shipper
                    AND r2.especie = registros.especie
                    AND r2.ref_cliente IS NOT NULL
                    AND r2.ref_cliente ~ '^[A-Z]{3}2526[A-Z]{3}[0-9]+$'
            )::TEXT, 
            3, 
            '0'
        )
    ),
    updated_at = NOW()
WHERE deleted_at IS NULL
    AND (ref_cliente IS NULL OR TRIM(ref_cliente) = '')
    AND shipper IS NOT NULL 
    AND TRIM(shipper) != ''
    AND especie IS NOT NULL 
    AND TRIM(especie) != '';

-- Verificar el resultado
SELECT 
    'Registros actualizados:' as mensaje,
    COUNT(*) as cantidad
FROM public.registros
WHERE deleted_at IS NULL
    AND ref_cliente IS NOT NULL 
    AND TRIM(ref_cliente) != ''
    AND updated_at > NOW() - INTERVAL '1 minute';

-- Ver algunos ejemplos
SELECT 
    ref_asli,
    ref_cliente,
    shipper,
    especie
FROM public.registros
WHERE deleted_at IS NULL
    AND ref_cliente IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;

-- =====================================================
-- NOTAS:
-- - Este script actualiza SOLO los registros sin ref_cliente
-- - Formato: [3 letras cliente][2526][3 letras especie][001]
-- - Ejemplos:
--   * Fruit Andes Sur + Kiwi = FAS2526KIW001
--   * Copefrut + Cereza = COP2526CER001
-- =====================================================
