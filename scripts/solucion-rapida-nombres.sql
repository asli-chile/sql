-- =====================================================
-- SOLUCIÓN RÁPIDA: Verificar y Corregir Nombres
-- =====================================================
-- Este script muestra qué nombres no coinciden y cómo corregirlos
-- =====================================================

-- PASO 1: Ver qué nombres se parsean desde registros activos
SELECT DISTINCT
  CASE 
    WHEN nave_inicial ~ '\[.+\]' THEN 
      TRIM(REGEXP_REPLACE(nave_inicial, '\s*\[.+\]$', ''))
    ELSE 
      TRIM(nave_inicial)
  END AS nombre_que_busca_el_cron
FROM registros
WHERE deleted_at IS NULL
  AND estado != 'CANCELADO'
  AND (eta IS NULL OR eta > NOW())
  AND nave_inicial IS NOT NULL
ORDER BY nombre_que_busca_el_cron;

-- PASO 2: Ver qué nombres hay en vessel_positions con IMO/MMSI
SELECT 
  vessel_name AS nombre_en_vessel_positions,
  imo,
  mmsi
FROM vessel_positions
WHERE imo IS NOT NULL OR mmsi IS NOT NULL
ORDER BY vessel_name;

-- PASO 3: COMPARACIÓN - ¿Coinciden?
WITH nombres_desde_registros AS (
  SELECT DISTINCT
    CASE 
      WHEN nave_inicial ~ '\[.+\]' THEN 
        TRIM(REGEXP_REPLACE(nave_inicial, '\s*\[.+\]$', ''))
      ELSE 
        TRIM(nave_inicial)
    END AS nombre_parseado
  FROM registros
  WHERE deleted_at IS NULL
    AND estado != 'CANCELADO'
    AND (eta IS NULL OR eta > NOW())
    AND nave_inicial IS NOT NULL
)
SELECT 
  r.nombre_parseado AS "Nombre que busca el cron",
  vp.vessel_name AS "Nombre en vessel_positions",
  CASE 
    WHEN r.nombre_parseado = vp.vessel_name THEN '✅ COINCIDEN - Se actualizará'
    WHEN r.nombre_parseado IS NOT NULL AND vp.vessel_name IS NULL THEN '⚠️ Solo en registros'
    WHEN r.nombre_parseado IS NULL AND vp.vessel_name IS NOT NULL THEN '❌ Solo en vessel_positions - NO se actualizará'
    ELSE '❌ NO COINCIDEN - Necesitas corregir el nombre'
  END AS estado,
  vp.imo,
  vp.mmsi
FROM nombres_desde_registros r
FULL OUTER JOIN vessel_positions vp ON r.nombre_parseado = vp.vessel_name
ORDER BY 
  CASE 
    WHEN r.nombre_parseado = vp.vessel_name THEN 1
    WHEN r.nombre_parseado IS NOT NULL AND vp.vessel_name IS NULL THEN 2
    ELSE 3
  END;

-- PASO 4: Si no coinciden, ejecuta esto para corregir (CAMBIA LOS NOMBRES SEGÚN TU CASO)
-- Ejemplo: Si en vessel_positions está "Maersk Bali" pero debería ser "MAERSK BALI"
-- UPDATE vessel_positions
-- SET vessel_name = 'MAERSK BALI'
-- WHERE vessel_name = 'Maersk Bali';

