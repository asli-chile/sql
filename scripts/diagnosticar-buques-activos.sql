-- =====================================================
-- DIAGNÓSTICO: Por qué el cron job no encuentra buques activos
-- =====================================================
-- Este script ayuda a identificar por qué el cron job
-- no encuentra buques activos aunque existan en vessel_positions
-- =====================================================

-- IMPORTANTE: El cron job busca buques activos desde la tabla REGISTROS,
-- no desde vessel_positions. Los buques deben estar en registros
-- para que el cron job los encuentre.

-- 1. Ver todos los registros y su estado
SELECT 
  id,
  nave_inicial AS "Nave Inicial (Raw)",
  CASE 
    WHEN nave_inicial ~ '\[.+\]' THEN 
      TRIM(REGEXP_REPLACE(nave_inicial, '\s*\[.+\]$', ''))
    ELSE 
      TRIM(nave_inicial)
  END AS "Nombre del Buque (Parsed)",
  estado AS "Estado",
  eta AS "ETA",
  deleted_at AS "Borrado",
  CASE 
    WHEN deleted_at IS NOT NULL THEN '❌ Está borrado'
    WHEN estado = 'CANCELADO' THEN '❌ Está cancelado'
    WHEN eta IS NOT NULL AND eta <= NOW() THEN '❌ ETA ya pasó'
    WHEN nave_inicial IS NULL OR TRIM(nave_inicial) = '' THEN '❌ Sin nombre de nave'
    ELSE '✅ Debería ser activo'
  END AS "Razón"
FROM registros
ORDER BY created_at DESC
LIMIT 50;

-- 2. Contar registros por estado
SELECT 
  COUNT(*) as total_registros,
  COUNT(*) FILTER (WHERE deleted_at IS NULL) as no_borrados,
  COUNT(*) FILTER (WHERE estado != 'CANCELADO') as no_cancelados,
  COUNT(*) FILTER (WHERE deleted_at IS NULL AND estado != 'CANCELADO') as activos_sin_filtro_eta,
  COUNT(*) FILTER (WHERE deleted_at IS NULL 
                    AND estado != 'CANCELADO' 
                    AND (eta IS NULL OR eta > NOW())) as activos_con_filtro_eta
FROM registros;

-- 3. Buques únicos que deberían ser activos (según criterios del cron)
WITH active_vessels_from_registros AS (
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
    AND nave_inicial IS NOT NULL
    AND TRIM(nave_inicial) != ''
)
SELECT 
  vessel_name AS "Buque Activo (desde registros)",
  '✅ Debería ser encontrado por el cron' AS "Estado"
FROM active_vessels_from_registros
ORDER BY vessel_name;

-- 4. Comparar buques en vessel_positions vs buques activos en registros
WITH active_vessels_from_registros AS (
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
    AND nave_inicial IS NOT NULL
    AND TRIM(nave_inicial) != ''
),
vessels_in_positions AS (
  SELECT vessel_name, imo, mmsi
  FROM vessel_positions
)
SELECT 
  COALESCE(av.vessel_name, vp.vessel_name) AS "Nombre del Buque",
  CASE 
    WHEN av.vessel_name IS NOT NULL AND vp.vessel_name IS NOT NULL THEN '✅ En ambos (se actualizará)'
    WHEN av.vessel_name IS NOT NULL AND vp.vessel_name IS NULL THEN '⚠️ Solo en registros (se creará en vessel_positions)'
    WHEN av.vessel_name IS NULL AND vp.vessel_name IS NOT NULL THEN '❌ Solo en vessel_positions (NO se actualizará - no está en registros activos)'
  END AS "Estado",
  vp.imo AS "IMO",
  vp.mmsi AS "MMSI",
  CASE 
    WHEN vp.imo IS NULL AND vp.mmsi IS NULL THEN '❌ Sin IMO/MMSI'
    WHEN vp.imo IS NOT NULL OR vp.mmsi IS NOT NULL THEN '✅ Tiene IMO/MMSI'
  END AS "Identificadores"
FROM active_vessels_from_registros av
FULL OUTER JOIN vessels_in_positions vp ON av.vessel_name = vp.vessel_name
ORDER BY 
  CASE 
    WHEN av.vessel_name IS NOT NULL AND vp.vessel_name IS NOT NULL THEN 1
    WHEN av.vessel_name IS NOT NULL AND vp.vessel_name IS NULL THEN 2
    ELSE 3
  END,
  COALESCE(av.vessel_name, vp.vessel_name);

-- 5. Ver registros específicos que deberían hacer que un buque sea activo
SELECT 
  id,
  ref_asli,
  nave_inicial,
  estado,
  eta,
  deleted_at,
  created_at,
  CASE 
    WHEN deleted_at IS NULL 
     AND estado != 'CANCELADO' 
     AND (eta IS NULL OR eta > NOW())
     AND nave_inicial IS NOT NULL
     AND TRIM(nave_inicial) != ''
    THEN '✅ Este registro hace que el buque sea activo'
    ELSE '❌ Este registro NO hace que el buque sea activo'
  END AS "Efecto"
FROM registros
WHERE nave_inicial IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;

