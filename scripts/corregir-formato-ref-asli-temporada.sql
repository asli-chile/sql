-- =====================================================
-- CORREGIR FORMATO DE REF_ASLI Y TEMPORADA
-- =====================================================
-- Este script corrige el formato de ref_asli y temporada
-- en los registros existentes para usar guiones consistentemente
-- =====================================================

-- PASO 1: Verificar registros con formato incorrecto (ANTES)
SELECT 
    'ANTES DE LA CORRECCIÓN' as etapa,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN ref_asli ~ ' ' THEN 1 END) as ref_asli_con_espacios,
    COUNT(CASE WHEN temporada ~ '[a-z]' THEN 1 END) as temporada_minusculas,
    COUNT(CASE WHEN temporada ~ ' ' THEN 1 END) as temporada_con_espacios
FROM public.registros
WHERE deleted_at IS NULL
    AND temporada IS NOT NULL;

-- PASO 2: Mostrar ejemplos de registros con formato incorrecto
SELECT 
    id,
    ref_asli as ref_asli_actual,
    temporada as temporada_actual,
    especie,
    shipper
FROM public.registros
WHERE deleted_at IS NULL
    AND temporada IS NOT NULL
    AND (
        ref_asli ~ ' '
        OR temporada ~ '[a-z]'
        OR temporada ~ ' '
    )
ORDER BY temporada, ref_asli
LIMIT 20;

-- PASO 3: Normalizar temporada (mayúsculas y guiones)
UPDATE public.registros
SET 
    temporada = UPPER(REPLACE(REPLACE(REPLACE(temporada, ' ', '-'), '_', '-'), '--', '-')),
    updated_at = NOW()
WHERE deleted_at IS NULL
    AND temporada IS NOT NULL
    AND (
        temporada ~ '[a-z]'
        OR temporada ~ ' '
        OR temporada ~ '_'
    );

-- PASO 4: Corregir ref_asli que tienen espacios en lugar de guiones
-- Reemplazar espacios por guiones en ref_asli para temporadas conocidas
UPDATE public.registros
SET 
    ref_asli = REPLACE(
        REPLACE(
            REPLACE(ref_asli, 'CHERRY 25-26', 'CHERRY-25-26'),
            'POMACEA-CAROZO 2026', 'POMACEA-CAROZO-2026'
        ),
        ' ', '-'
    ),
    updated_at = NOW()
WHERE deleted_at IS NULL
    AND ref_asli ~ ' '
    AND (
        ref_asli ~ '^CHERRY 25-26'
        OR ref_asli ~ '^POMACEA-CAROZO 2026'
        OR ref_asli ~ '^POMACEA CAROZO 2026'
    );

-- PASO 5: Corregir ref_asli genéricamente (reemplazar espacios por guiones antes del número)
-- Esto maneja casos donde hay espacios entre la temporada y el número
UPDATE public.registros
SET 
    ref_asli = REGEXP_REPLACE(
        ref_asli,
        '^([A-Z0-9-]+) +(\d+)$',
        '\1-\2',
        'g'
    ),
    updated_at = NOW()
WHERE deleted_at IS NULL
    AND ref_asli ~ ' '
    AND ref_asli ~ '^[A-Z0-9-]+ +\d+$';

-- PASO 6: Asegurar que ref_asli coincida con temporada normalizada
-- Si el ref_asli no coincide con la temporada, regenerarlo
WITH registros_a_corregir AS (
    SELECT 
        r.id,
        r.temporada,
        r.ref_asli,
        ROW_NUMBER() OVER (
            PARTITION BY r.temporada 
            ORDER BY COALESCE(r.ingresado, r.created_at), r.id
        ) as numero_secuencial
    FROM public.registros r
    WHERE r.deleted_at IS NULL
        AND r.temporada IS NOT NULL
        AND (
            r.ref_asli IS NULL
            OR r.ref_asli !~ ('^' || UPPER(REPLACE(REPLACE(r.temporada, ' ', '-'), '_', '-')) || '-\d+$')
        )
),
ref_asli_corregido AS (
    SELECT 
        id,
        temporada,
        UPPER(REPLACE(REPLACE(temporada, ' ', '-'), '_', '-')) || '-' ||
        LPAD(numero_secuencial::TEXT, 4, '0') as nuevo_ref_asli
    FROM registros_a_corregir
)
UPDATE public.registros r
SET 
    ref_asli = rac.nuevo_ref_asli,
    updated_at = NOW()
FROM ref_asli_corregido rac
WHERE r.id = rac.id
    AND r.deleted_at IS NULL;

-- PASO 7: Verificar registros después de la corrección (DESPUÉS)
SELECT 
    'DESPUÉS DE LA CORRECCIÓN' as etapa,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN ref_asli ~ ' ' THEN 1 END) as ref_asli_con_espacios,
    COUNT(CASE WHEN temporada ~ '[a-z]' THEN 1 END) as temporada_minusculas,
    COUNT(CASE WHEN temporada ~ ' ' THEN 1 END) as temporada_con_espacios
FROM public.registros
WHERE deleted_at IS NULL
    AND temporada IS NOT NULL;

-- PASO 8: Mostrar distribución por temporada después de la corrección
SELECT 
    temporada,
    COUNT(*) as cantidad_registros,
    MIN(ref_asli) as ref_asli_minimo,
    MAX(ref_asli) as ref_asli_maximo,
    COUNT(CASE WHEN ref_asli ~ ' ' THEN 1 END) as con_espacios
FROM public.registros
WHERE deleted_at IS NULL
    AND temporada IS NOT NULL
GROUP BY temporada
ORDER BY temporada;

-- PASO 9: Verificar que no hay duplicados
SELECT 
    ref_asli,
    COUNT(*) as cantidad
FROM public.registros
WHERE deleted_at IS NULL
GROUP BY ref_asli
HAVING COUNT(*) > 1;

-- PASO 10: Mostrar algunos registros corregidos como confirmación
SELECT 
    ref_asli,
    temporada,
    especie,
    shipper,
    estado,
    updated_at
FROM public.registros
WHERE deleted_at IS NULL
    AND temporada IS NOT NULL
ORDER BY temporada, ref_asli
LIMIT 30;

-- =====================================================
-- NOTAS:
-- - Este script normaliza el formato de temporada a mayúsculas con guiones
-- - Corrige ref_asli que tienen espacios reemplazándolos por guiones
-- - Regenera ref_asli que no coinciden con su temporada
-- - Formato esperado: CHERRY-25-26-0001, POMACEA-CAROZO-2026-0001
-- - Solo actualiza registros que NO están eliminados (deleted_at IS NULL)
-- =====================================================
