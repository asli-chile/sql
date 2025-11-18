-- =====================================================
-- VERIFICAR POR QUÉ NO SE GUARDA LA IMAGEN
-- =====================================================
-- Este script verifica paso a paso por qué la imagen no se guarda
-- =====================================================

-- 1. Verificar que el campo vessel_image existe
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'vessel_positions' 
  AND column_name = 'vessel_image';

-- 2. Verificar si hay raw_payload y si tiene detail
SELECT 
  vessel_name,
  CASE 
    WHEN raw_payload IS NULL THEN '❌ Sin raw_payload'
    WHEN raw_payload->'detail' IS NULL THEN '⚠️ Sin detail'
    ELSE '✅ Tiene raw_payload con detail'
  END AS estado_raw_payload,
  jsonb_typeof(raw_payload) as tipo_raw_payload,
  jsonb_typeof(raw_payload->'detail') as tipo_detail
FROM vessel_positions
WHERE vessel_name = 'HMM BLESSING';

-- 3. Verificar si la imagen está en raw_payload
SELECT 
  vessel_name,
  raw_payload->'detail'->>'image' as imagen_en_detail_image,
  raw_payload->>'image' as imagen_en_root,
  CASE 
    WHEN raw_payload->'detail'->>'image' IS NOT NULL THEN '✅ Imagen encontrada en detail.image'
    WHEN raw_payload->>'image' IS NOT NULL THEN '✅ Imagen encontrada en root'
    ELSE '❌ Imagen NO encontrada en raw_payload'
  END AS estado_imagen
FROM vessel_positions
WHERE vessel_name = 'HMM BLESSING';

-- 4. Ver el raw_payload completo para inspección manual
SELECT 
  vessel_name,
  jsonb_pretty(raw_payload) as raw_payload_completo
FROM vessel_positions
WHERE vessel_name = 'HMM BLESSING'
LIMIT 1;

-- 5. Intentar actualizar manualmente desde raw_payload
-- (Solo si la imagen existe en raw_payload)
UPDATE vessel_positions
SET vessel_image = NULLIF(TRIM(raw_payload->'detail'->>'image'), '')
WHERE 
  vessel_name = 'HMM BLESSING'
  AND raw_payload->'detail'->>'image' IS NOT NULL
  AND TRIM(raw_payload->'detail'->>'image') != '';

-- 6. Verificar el resultado
SELECT 
  vessel_name,
  vessel_image,
  CASE 
    WHEN vessel_image IS NOT NULL THEN '✅ Imagen guardada'
    ELSE '❌ Aún sin imagen'
  END AS estado_final
FROM vessel_positions
WHERE vessel_name = 'HMM BLESSING';

