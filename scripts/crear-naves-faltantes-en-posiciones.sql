-- Script para crear entradas en vessel_positions para naves que están en registros activos
-- pero que no tienen entrada en vessel_positions
-- 
-- Esto asegura que todas las naves activas aparezcan en el mapa, aunque no tengan coordenadas aún

-- 1. Identificar naves activas en registros que no están en vessel_positions
WITH naves_activas AS (
  SELECT DISTINCT
    -- Parsear el nombre de la nave (remover [VIAJE] si existe)
    TRIM(REGEXP_REPLACE(nave_inicial, '\s*\[.*?\]\s*$', '')) AS vessel_name_parsed,
    nave_inicial AS nave_inicial_original
  FROM registros
  WHERE 
    deleted_at IS NULL
    AND estado != 'CANCELADO'
    AND nave_inicial IS NOT NULL
    AND TRIM(nave_inicial) != ''
),
naves_faltantes AS (
  SELECT 
    na.vessel_name_parsed AS vessel_name,
    na.nave_inicial_original
  FROM naves_activas na
  LEFT JOIN vessel_positions vp ON na.vessel_name_parsed = vp.vessel_name
  WHERE vp.vessel_name IS NULL
)
-- 2. Insertar las naves faltantes en vessel_positions (sin coordenadas inicialmente)
INSERT INTO vessel_positions (
  vessel_name,
  last_lat,
  last_lon,
  last_position_at,
  last_api_call_at,
  created_at,
  updated_at
)
SELECT 
  vessel_name,
  NULL AS last_lat,  -- Sin coordenadas inicialmente
  NULL AS last_lon,  -- Sin coordenadas inicialmente
  NULL AS last_position_at,
  NULL AS last_api_call_at,
  NOW() AS created_at,
  NOW() AS updated_at
FROM naves_faltantes
ON CONFLICT (vessel_name) DO NOTHING  -- Si ya existe, no hacer nada
RETURNING vessel_name, created_at;

-- 3. Mostrar resumen de lo que se creó
SELECT 
  '✅ Naves creadas en vessel_positions' AS mensaje,
  COUNT(*) AS total_creadas
FROM (
  WITH naves_activas AS (
    SELECT DISTINCT
      TRIM(REGEXP_REPLACE(nave_inicial, '\s*\[.*?\]\s*$', '')) AS vessel_name_parsed
    FROM registros
    WHERE 
      deleted_at IS NULL
      AND estado != 'CANCELADO'
      AND nave_inicial IS NOT NULL
      AND TRIM(nave_inicial) != ''
  ),
  naves_faltantes AS (
    SELECT 
      na.vessel_name_parsed AS vessel_name
    FROM naves_activas na
    LEFT JOIN vessel_positions vp ON na.vessel_name_parsed = vp.vessel_name
    WHERE vp.vessel_name IS NULL
  )
  SELECT vessel_name FROM naves_faltantes
) AS creadas;

-- 4. Mostrar todas las naves activas y su estado en vessel_positions
WITH naves_activas AS (
  SELECT DISTINCT
    TRIM(REGEXP_REPLACE(nave_inicial, '\s*\[.*?\]\s*$', '')) AS vessel_name_parsed,
    COUNT(*) AS total_registros
  FROM registros
  WHERE 
    deleted_at IS NULL
    AND estado != 'CANCELADO'
    AND nave_inicial IS NOT NULL
    AND TRIM(nave_inicial) != ''
  GROUP BY TRIM(REGEXP_REPLACE(nave_inicial, '\s*\[.*?\]\s*$', ''))
)
SELECT 
  na.vessel_name_parsed AS vessel_name,
  na.total_registros,
  CASE 
    WHEN vp.vessel_name IS NOT NULL THEN '✅ En vessel_positions'
    ELSE '❌ FALTA en vessel_positions'
  END AS estado,
  vp.last_lat,
  vp.last_lon,
  vp.last_position_at,
  vp.imo,
  vp.mmsi
FROM naves_activas na
LEFT JOIN vessel_positions vp ON na.vessel_name_parsed = vp.vessel_name
ORDER BY na.vessel_name_parsed;

