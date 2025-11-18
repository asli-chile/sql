-- =====================================================
-- EXTRAER IMAGEN DESDE TODAS LAS UBICACIONES POSIBLES
-- =====================================================
-- Este script intenta extraer la imagen desde todas las
-- ubicaciones posibles en el JSON y actualizar vessel_image
-- =====================================================

-- 1. Primero, verificar qué buques tienen raw_payload
SELECT 
  vessel_name,
  CASE 
    WHEN raw_payload IS NULL THEN '❌ Sin raw_payload'
    WHEN raw_payload->'detail' IS NULL THEN '⚠️ Sin detail'
    ELSE '✅ Tiene raw_payload con detail'
  END AS estado_raw_payload
FROM vessel_positions
WHERE vessel_name IN ('HMM BLESSING', 'MAERSK BALI', 'SALLY MAERSK', 'MSC ANS', 'MANZANILLO EXPRESS')
ORDER BY vessel_name;

-- 2. Intentar extraer imagen desde TODAS las ubicaciones posibles
-- y actualizar vessel_image con la primera que encontremos
UPDATE vessel_positions
SET vessel_image = COALESCE(
  -- Intentar desde detail.image (ubicación estándar)
  NULLIF(TRIM(raw_payload->'detail'->>'image'), ''),
  -- Intentar desde detail.Image (con mayúscula)
  NULLIF(TRIM(raw_payload->'detail'->>'Image'), ''),
  -- Intentar desde detail.vesselImage
  NULLIF(TRIM(raw_payload->'detail'->>'vesselImage'), ''),
  -- Intentar desde detail.vessel_image
  NULLIF(TRIM(raw_payload->'detail'->>'vessel_image'), ''),
  -- Intentar desde detail.photo
  NULLIF(TRIM(raw_payload->'detail'->>'photo'), ''),
  -- Intentar desde detail.Photo
  NULLIF(TRIM(raw_payload->'detail'->>'Photo'), ''),
  -- Intentar desde el root
  NULLIF(TRIM(raw_payload->>'image'), ''),
  NULLIF(TRIM(raw_payload->>'Image'), ''),
  -- Mantener el valor actual si existe
  vessel_image
)
WHERE 
  vessel_image IS NULL 
  AND raw_payload IS NOT NULL
  AND (
    -- Verificar que existe alguna de estas claves
    raw_payload->'detail'->>'image' IS NOT NULL
    OR raw_payload->'detail'->>'Image' IS NOT NULL
    OR raw_payload->'detail'->>'vesselImage' IS NOT NULL
    OR raw_payload->'detail'->>'vessel_image' IS NOT NULL
    OR raw_payload->'detail'->>'photo' IS NOT NULL
    OR raw_payload->'detail'->>'Photo' IS NOT NULL
    OR raw_payload->>'image' IS NOT NULL
    OR raw_payload->>'Image' IS NOT NULL
  );

-- 3. Mostrar cuántos registros se actualizaron
DO $$
DECLARE
  registros_actualizados INTEGER;
BEGIN
  GET DIAGNOSTICS registros_actualizados = ROW_COUNT;
  RAISE NOTICE 'Registros actualizados: %', registros_actualizados;
END $$;

-- 4. Verificar resultados
SELECT 
  vessel_name,
  vessel_image,
  raw_payload->'detail'->>'image' as detail_image,
  CASE 
    WHEN vessel_image IS NOT NULL THEN '✅ Imagen extraída y guardada'
    WHEN raw_payload->'detail'->>'image' IS NOT NULL THEN '⚠️ Imagen en raw_payload pero no se pudo extraer'
    ELSE '❌ Sin imagen'
  END AS estado
FROM vessel_positions
WHERE vessel_name IN ('HMM BLESSING', 'MAERSK BALI', 'SALLY MAERSK', 'MSC ANS', 'MANZANILLO EXPRESS')
ORDER BY vessel_name;

-- 5. Si aún no hay imagen, mostrar el raw_payload completo para inspección manual
SELECT 
  vessel_name,
  jsonb_pretty(raw_payload) as raw_payload_completo
FROM vessel_positions
WHERE vessel_name = 'HMM BLESSING'
  AND vessel_image IS NULL
LIMIT 1;

