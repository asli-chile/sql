-- =====================================================
-- VERIFICAR COINCIDENCIA DE NOMBRES DE BUQUES
-- =====================================================
-- Este script verifica si los nombres parseados de registros
-- coinciden exactamente con los nombres en vessel_positions
-- =====================================================

-- 1. Ver cómo se parsean los nombres desde registros
SELECT DISTINCT
  nave_inicial AS "Nave Inicial (Raw)",
  CASE 
    WHEN nave_inicial ~ '\[.+\]' THEN 
      TRIM(REGEXP_REPLACE(nave_inicial, '\s*\[.+\]$', ''))
    ELSE 
      TRIM(nave_inicial)
  END AS "Nombre Parseado",
  COUNT(*) as cantidad_registros
FROM registros
WHERE deleted_at IS NULL
  AND estado != 'CANCELADO'
  AND (eta IS NULL OR eta > NOW())
  AND nave_inicial IS NOT NULL
  AND TRIM(nave_inicial) != ''
GROUP BY nave_inicial
ORDER BY 
  CASE 
    WHEN nave_inicial ~ '\[.+\]' THEN 
      TRIM(REGEXP_REPLACE(nave_inicial, '\s*\[.+\]$', ''))
    ELSE 
      TRIM(nave_inicial)
  END;

-- 2. Ver nombres en vessel_positions
SELECT 
  vessel_name AS "Nombre en vessel_positions",
  imo,
  mmsi,
  CASE 
    WHEN imo IS NULL AND mmsi IS NULL THEN '❌ Sin IMO/MMSI'
    WHEN imo IS NOT NULL OR mmsi IS NOT NULL THEN '✅ Tiene IMO/MMSI'
  END AS "Estado Identificadores"
FROM vessel_positions
ORDER BY vessel_name;

-- 3. COMPARACIÓN DIRECTA: ¿Coinciden los nombres?
WITH parsed_vessels_from_registros AS (
  SELECT DISTINCT
    CASE 
      WHEN nave_inicial ~ '\[.+\]' THEN 
        TRIM(REGEXP_REPLACE(nave_inicial, '\s*\[.+\]$', ''))
      ELSE 
        TRIM(nave_inicial)
    END AS parsed_vessel_name,
    nave_inicial AS raw_nave_inicial
  FROM registros
  WHERE deleted_at IS NULL
    AND estado != 'CANCELADO'
    AND (eta IS NULL OR eta > NOW())
    AND nave_inicial IS NOT NULL
    AND TRIM(nave_inicial) != ''
),
vessels_in_positions AS (
  SELECT vessel_name, imo, mmsi
  FROM vessel_positions
)
SELECT 
  pv.parsed_vessel_name AS "Nombre desde registros (parsed)",
  pv.raw_nave_inicial AS "Nave inicial (raw)",
  vp.vessel_name AS "Nombre en vessel_positions",
  CASE 
    WHEN pv.parsed_vessel_name = vp.vessel_name THEN '✅ COINCIDEN - Se actualizará'
    WHEN pv.parsed_vessel_name IS NOT NULL AND vp.vessel_name IS NULL THEN '⚠️ Solo en registros - Se creará en vessel_positions'
    WHEN pv.parsed_vessel_name IS NULL AND vp.vessel_name IS NOT NULL THEN '❌ Solo en vessel_positions - NO se actualizará'
    ELSE '❌ NO COINCIDEN - Verificar diferencias'
  END AS "Estado Coincidencia",
  vp.imo AS "IMO",
  vp.mmsi AS "MMSI",
  CASE 
    WHEN pv.parsed_vessel_name = vp.vessel_name AND (vp.imo IS NOT NULL OR vp.mmsi IS NOT NULL) 
    THEN '✅ Listo para actualizar'
    WHEN pv.parsed_vessel_name = vp.vessel_name AND vp.imo IS NULL AND vp.mmsi IS NULL
    THEN '⚠️ Coincide pero falta IMO/MMSI'
    ELSE '❌ No se actualizará'
  END AS "Resultado Final"
FROM parsed_vessels_from_registros pv
FULL OUTER JOIN vessels_in_positions vp ON pv.parsed_vessel_name = vp.vessel_name
ORDER BY 
  CASE 
    WHEN pv.parsed_vessel_name = vp.vessel_name THEN 1
    WHEN pv.parsed_vessel_name IS NOT NULL AND vp.vessel_name IS NULL THEN 2
    ELSE 3
  END,
  COALESCE(pv.parsed_vessel_name, vp.vessel_name);

-- 4. Ver diferencias de mayúsculas/minúsculas o espacios
WITH parsed_vessels_from_registros AS (
  SELECT DISTINCT
    CASE 
      WHEN nave_inicial ~ '\[.+\]' THEN 
        TRIM(REGEXP_REPLACE(nave_inicial, '\s*\[.+\]$', ''))
      ELSE 
        TRIM(nave_inicial)
    END AS parsed_vessel_name
  FROM registros
  WHERE deleted_at IS NULL
    AND estado != 'CANCELADO'
    AND (eta IS NULL OR eta > NOW())
    AND nave_inicial IS NOT NULL
    AND TRIM(nave_inicial) != ''
)
SELECT 
  pv.parsed_vessel_name AS "Desde registros",
  vp.vessel_name AS "En vessel_positions",
  LENGTH(pv.parsed_vessel_name) AS "Longitud registros",
  LENGTH(vp.vessel_name) AS "Longitud vessel_positions",
  pv.parsed_vessel_name = vp.vessel_name AS "¿Coinciden exactamente?",
  UPPER(TRIM(pv.parsed_vessel_name)) = UPPER(TRIM(vp.vessel_name)) AS "¿Coinciden ignorando mayúsculas?",
  CASE 
    WHEN pv.parsed_vessel_name = vp.vessel_name THEN '✅ Coinciden exactamente'
    WHEN UPPER(TRIM(pv.parsed_vessel_name)) = UPPER(TRIM(vp.vessel_name)) THEN '⚠️ Coinciden pero con diferencias de mayúsculas/espacios'
    ELSE '❌ NO coinciden'
  END AS "Diagnóstico"
FROM parsed_vessels_from_registros pv
FULL OUTER JOIN vessel_positions vp ON UPPER(TRIM(pv.parsed_vessel_name)) = UPPER(TRIM(vp.vessel_name))
WHERE pv.parsed_vessel_name IS NOT NULL OR vp.vessel_name IS NOT NULL
ORDER BY "Diagnóstico";

