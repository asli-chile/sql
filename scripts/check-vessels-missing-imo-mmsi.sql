-- =====================================================
-- CONSULTA: BUQUES SIN IMO/MMSI CONFIGURADO
-- =====================================================
-- Este script identifica los buques activos que necesitan
-- tener IMO/MMSI configurado para que el cron job pueda
-- actualizar sus posiciones desde la API AIS.
-- =====================================================

-- 1. Buques activos (desde registros) que NO tienen IMO/MMSI en vessel_positions
WITH active_vessels AS (
  SELECT DISTINCT
    CASE 
      WHEN nave_inicial ~ '\[.+\]' THEN 
        TRIM(REGEXP_REPLACE(nave_inicial, '\s*\[.+\]$', ''))
      ELSE 
        TRIM(nave_inicial)
    END AS vessel_name
  FROM registros
  WHERE deleted_at IS NULL
    AND estado != 'CANCELADO'
    AND (eta IS NULL OR eta > NOW())
),
vessels_with_positions AS (
  SELECT 
    vessel_name,
    imo,
    mmsi,
    last_lat,
    last_lon,
    last_position_at,
    last_api_call_at
  FROM vessel_positions
)
SELECT 
  av.vessel_name AS "Nombre del Buque",
  vp.imo AS "IMO Actual",
  vp.mmsi AS "MMSI Actual",
  CASE 
    WHEN vp.vessel_name IS NULL THEN 'No existe en vessel_positions'
    WHEN vp.imo IS NULL AND vp.mmsi IS NULL THEN 'Falta IMO y MMSI'
    WHEN vp.imo IS NULL THEN 'Falta IMO'
    WHEN vp.mmsi IS NULL THEN 'Falta MMSI'
    ELSE 'Tiene ambos'
  END AS "Estado",
  vp.last_position_at AS "Última Posición",
  vp.last_api_call_at AS "Última Llamada API"
FROM active_vessels av
LEFT JOIN vessels_with_positions vp ON av.vessel_name = vp.vessel_name
WHERE vp.vessel_name IS NULL 
   OR vp.imo IS NULL 
   OR vp.mmsi IS NULL
ORDER BY av.vessel_name;

-- 2. Resumen: Cantidad de buques que necesitan configuración
WITH active_vessels AS (
  SELECT DISTINCT
    CASE 
      WHEN nave_inicial ~ '\[.+\]' THEN 
        TRIM(REGEXP_REPLACE(nave_inicial, '\s*\[.+\]$', ''))
      ELSE 
        TRIM(nave_inicial)
    END AS vessel_name
  FROM registros
  WHERE deleted_at IS NULL
    AND estado != 'CANCELADO'
    AND (eta IS NULL OR eta > NOW())
),
vessels_with_positions AS (
  SELECT 
    vessel_name,
    imo,
    mmsi
  FROM vessel_positions
)
SELECT 
  COUNT(*) AS "Total de buques que necesitan IMO/MMSI",
  COUNT(CASE WHEN vp.vessel_name IS NULL THEN 1 END) AS "No existen en vessel_positions",
  COUNT(CASE WHEN vp.vessel_name IS NOT NULL AND vp.imo IS NULL AND vp.mmsi IS NULL THEN 1 END) AS "Existen pero sin IMO ni MMSI",
  COUNT(CASE WHEN vp.vessel_name IS NOT NULL AND vp.imo IS NULL AND vp.mmsi IS NOT NULL THEN 1 END) AS "Tienen MMSI pero falta IMO",
  COUNT(CASE WHEN vp.vessel_name IS NOT NULL AND vp.imo IS NOT NULL AND vp.mmsi IS NULL THEN 1 END) AS "Tienen IMO pero falta MMSI"
FROM active_vessels av
LEFT JOIN vessels_with_positions vp ON av.vessel_name = vp.vessel_name
WHERE vp.vessel_name IS NULL 
   OR vp.imo IS NULL 
   OR vp.mmsi IS NULL;

-- 3. Buques que fallaron en el último cron job (ejemplo basado en el mensaje)
-- Reemplaza estos nombres con los que aparecen en el mensaje de error
SELECT 
  vessel_name AS "Nombre del Buque",
  imo AS "IMO",
  mmsi AS "MMSI",
  CASE 
    WHEN imo IS NULL AND mmsi IS NULL THEN '❌ Falta IMO y MMSI'
    WHEN imo IS NULL THEN '⚠️ Falta IMO'
    WHEN mmsi IS NULL THEN '⚠️ Falta MMSI'
    ELSE '✅ Configurado'
  END AS "Estado"
FROM vessel_positions
WHERE vessel_name IN (
  'MANZANILLO EXPRESS',
  'MSC ANS',
  'SALLY MAERSK',
  'MAERSK BALI',
  'HMM BLESSING'
)
ORDER BY vessel_name;

