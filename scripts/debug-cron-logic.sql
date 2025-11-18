-- =====================================================
-- DEBUG: Verificar qué está pasando en la lógica del cron
-- =====================================================

-- 1. Simular exactamente lo que hace el cron job
-- El cron busca registros con estos criterios:
SELECT 
  id,
  nave_inicial,
  estado,
  eta,
  deleted_at,
  CASE 
    WHEN deleted_at IS NOT NULL THEN '❌ Borrado'
    WHEN estado = 'CANCELADO' THEN '❌ Cancelado'
    WHEN eta IS NOT NULL AND eta <= NOW() THEN '❌ ETA pasada'
    ELSE '✅ Debería ser activo'
  END AS razon
FROM registros
WHERE deleted_at IS NULL
  AND estado != 'CANCELADO'
  AND (eta IS NULL OR eta > NOW())
ORDER BY created_at DESC
LIMIT 20;

-- 2. Ver cuántos registros activos hay
SELECT COUNT(*) as total_registros_activos
FROM registros
WHERE deleted_at IS NULL
  AND estado != 'CANCELADO'
  AND (eta IS NULL OR eta > NOW());

-- 3. Ver los nombres parseados que debería encontrar
SELECT DISTINCT
  nave_inicial AS raw_name,
  CASE 
    WHEN nave_inicial ~ '\[.+\]' THEN 
      TRIM(REGEXP_REPLACE(nave_inicial, '\s*\[.+\]$', ''))
    ELSE 
      TRIM(nave_inicial)
  END AS parsed_name
FROM registros
WHERE deleted_at IS NULL
  AND estado != 'CANCELADO'
  AND (eta IS NULL OR eta > NOW())
  AND nave_inicial IS NOT NULL
  AND TRIM(nave_inicial) != ''
ORDER BY parsed_name;

-- 4. Verificar que esos nombres tengan IMO/MMSI en vessel_positions
WITH nombres_activos AS (
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
  na.vessel_name,
  vp.imo,
  vp.mmsi,
  CASE 
    WHEN vp.vessel_name IS NULL THEN '❌ No existe en vessel_positions'
    WHEN vp.imo IS NULL AND vp.mmsi IS NULL THEN '❌ Existe pero sin IMO/MMSI'
    WHEN vp.imo IS NOT NULL OR vp.mmsi IS NOT NULL THEN '✅ Listo para actualizar'
  END AS estado_final
FROM nombres_activos na
LEFT JOIN vessel_positions vp ON na.vessel_name = vp.vessel_name
ORDER BY na.vessel_name;

