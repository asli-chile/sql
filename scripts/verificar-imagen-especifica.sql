-- =====================================================
-- VERIFICAR Y ACTUALIZAR IMAGEN DE UN BUQUE ESPECÍFICO
-- =====================================================
-- Este script permite buscar y actualizar la imagen de un buque específico
-- =====================================================

-- Buscar un buque específico (ejemplo: HMM BLESSING)
-- Reemplaza 'HMM BLESSING' con el nombre del buque que buscas
SELECT 
  vessel_name,
  vessel_image,
  CASE 
    WHEN vessel_image IS NOT NULL THEN '✅ Tiene imagen'
    ELSE '❌ Sin imagen'
  END AS estado_imagen,
  -- Verificar si la imagen está en raw_payload
  raw_payload->'detail'->>'image' as imagen_en_raw_payload,
  CASE 
    WHEN raw_payload->'detail'->>'image' IS NOT NULL THEN '✅ Imagen en raw_payload'
    ELSE '❌ Sin imagen en raw_payload'
  END AS estado_raw_payload
FROM vessel_positions
WHERE vessel_name ILIKE '%HMM%'  -- Buscar buques que contengan "HMM"
ORDER BY vessel_name;

-- Si la imagen está en raw_payload pero no en vessel_image, actualizarla
UPDATE vessel_positions
SET vessel_image = NULLIF(TRIM(raw_payload->'detail'->>'image'), '')
WHERE 
  vessel_name ILIKE '%HMM%'  -- Buscar buques que contengan "HMM"
  AND vessel_image IS NULL 
  AND raw_payload IS NOT NULL
  AND raw_payload->'detail'->>'image' IS NOT NULL
  AND TRIM(raw_payload->'detail'->>'image') != '';

-- Verificar el resultado después de la actualización
SELECT 
  vessel_name,
  vessel_image,
  CASE 
    WHEN vessel_image IS NOT NULL THEN '✅ Imagen actualizada'
    ELSE '❌ Aún sin imagen'
  END AS estado
FROM vessel_positions
WHERE vessel_name ILIKE '%HMM%'
ORDER BY vessel_name;

