-- =====================================================
-- BUSCAR Y ACTUALIZAR HMM BLESSING ESPECÍFICAMENTE
-- =====================================================

-- 1. Buscar HMM BLESSING específicamente
SELECT 
  vessel_name,
  vessel_image,
  raw_payload->'detail'->>'image' as imagen_en_raw_payload,
  CASE 
    WHEN vessel_image IS NOT NULL THEN '✅ Imagen guardada en vessel_image'
    WHEN raw_payload->'detail'->>'image' IS NOT NULL THEN '⚠️ Imagen solo en raw_payload'
    ELSE '❌ Sin imagen'
  END AS estado
FROM vessel_positions
WHERE vessel_name = 'HMM BLESSING'  -- Búsqueda exacta
   OR vessel_name ILIKE 'HMM BLESSING%'  -- O que comience con "HMM BLESSING"
ORDER BY vessel_name;

-- 2. Si HMM BLESSING tiene imagen en raw_payload pero no en vessel_image, actualizarla
UPDATE vessel_positions
SET vessel_image = NULLIF(TRIM(raw_payload->'detail'->>'image'), '')
WHERE 
  (vessel_name = 'HMM BLESSING' OR vessel_name ILIKE 'HMM BLESSING%')
  AND vessel_image IS NULL 
  AND raw_payload IS NOT NULL
  AND raw_payload->'detail'->>'image' IS NOT NULL
  AND TRIM(raw_payload->'detail'->>'image') != '';

-- 3. Verificar el resultado
SELECT 
  vessel_name,
  vessel_image,
  CASE 
    WHEN vessel_image IS NOT NULL THEN '✅ Imagen actualizada correctamente'
    ELSE '❌ Aún sin imagen'
  END AS estado,
  LENGTH(vessel_image) as longitud_url
FROM vessel_positions
WHERE vessel_name = 'HMM BLESSING' OR vessel_name ILIKE 'HMM BLESSING%';

-- 4. Ver todos los buques que contienen "HMM" para comparar
SELECT 
  vessel_name,
  vessel_image,
  raw_payload->'detail'->>'image' as imagen_en_raw_payload
FROM vessel_positions
WHERE vessel_name ILIKE '%HMM%'
ORDER BY vessel_name;

