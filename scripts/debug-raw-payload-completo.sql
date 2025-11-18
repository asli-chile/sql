-- =====================================================
-- DEBUG: VER ESTRUCTURA COMPLETA DEL RAW_PAYLOAD
-- =====================================================
-- Este script muestra la estructura completa del raw_payload
-- para encontrar dónde está realmente la imagen
-- =====================================================

-- 1. Ver el raw_payload completo de HMM BLESSING (formateado)
SELECT 
  vessel_name,
  jsonb_pretty(raw_payload) as raw_payload_completo
FROM vessel_positions
WHERE vessel_name = 'HMM BLESSING'
LIMIT 1;

-- 2. Ver todas las claves del objeto detail (si existe)
SELECT 
  vessel_name,
  jsonb_object_keys(raw_payload->'detail') as claves_en_detail
FROM vessel_positions
WHERE vessel_name = 'HMM BLESSING'
  AND raw_payload->'detail' IS NOT NULL;

-- 3. Buscar la imagen en TODAS las ubicaciones posibles
SELECT 
  vessel_name,
  -- Intentar desde detail.image
  raw_payload->'detail'->>'image' as detail_image,
  -- Intentar desde el root
  raw_payload->>'image' as root_image,
  -- Ver el raw_payload completo como texto para buscar manualmente
  raw_payload::text as raw_payload_texto
FROM vessel_positions
WHERE vessel_name = 'HMM BLESSING'
LIMIT 1;

-- 3b. Ver todas las claves que contienen "image" o "photo" en detail
SELECT 
  vessel_name,
  key as clave_encontrada,
  raw_payload->'detail'->>key as valor
FROM vessel_positions,
  LATERAL jsonb_object_keys(raw_payload->'detail') as key
WHERE vessel_name = 'HMM BLESSING'
  AND (key ILIKE '%image%' OR key ILIKE '%photo%');

-- 4. Ver TODOS los buques y buscar imagen en cualquier ubicación
SELECT 
  vessel_name,
  raw_payload->'detail'->>'image' as detail_image,
  raw_payload->>'image' as root_image,
  -- Verificar si raw_payload existe
  CASE 
    WHEN raw_payload IS NULL THEN '❌ Sin raw_payload'
    WHEN raw_payload->'detail' IS NULL THEN '⚠️ raw_payload sin detail'
    WHEN raw_payload->'detail'->>'image' IS NOT NULL THEN '✅ Imagen en detail.image'
    WHEN raw_payload->>'image' IS NOT NULL THEN '✅ Imagen en root'
    ELSE '❌ Sin imagen encontrada'
  END AS estado
FROM vessel_positions
WHERE vessel_name IN ('HMM BLESSING', 'MAERSK BALI', 'SALLY MAERSK')
ORDER BY vessel_name;

-- 5. Ver la estructura completa del JSON para entender dónde está la imagen
SELECT 
  vessel_name,
  jsonb_typeof(raw_payload) as tipo_raw_payload,
  jsonb_typeof(raw_payload->'detail') as tipo_detail
FROM vessel_positions
WHERE vessel_name = 'HMM BLESSING'
LIMIT 1;

-- 5b. Ver TODAS las claves disponibles en detail
SELECT 
  vessel_name,
  key as clave_en_detail,
  jsonb_typeof(raw_payload->'detail'->key) as tipo_valor
FROM vessel_positions,
  LATERAL jsonb_object_keys(raw_payload->'detail') as key
WHERE vessel_name = 'HMM BLESSING'
  AND raw_payload->'detail' IS NOT NULL
ORDER BY key;

