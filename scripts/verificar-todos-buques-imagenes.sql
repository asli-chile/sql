-- =====================================================
-- VERIFICAR IMÁGENES DE TODOS LOS BUQUES
-- =====================================================
-- Este script muestra el estado de las imágenes para todos los buques
-- y permite identificar cuáles tienen imagen en raw_payload pero no en vessel_image
-- =====================================================

-- Ver todos los buques y su estado de imagen
SELECT 
  vessel_name,
  vessel_image,
  raw_payload->'detail'->>'image' as imagen_en_raw_payload,
  CASE 
    WHEN vessel_image IS NOT NULL THEN '✅ Imagen guardada'
    WHEN raw_payload->'detail'->>'image' IS NOT NULL THEN '⚠️ Imagen solo en raw_payload'
    ELSE '❌ Sin imagen'
  END AS estado
FROM vessel_positions
ORDER BY 
  CASE 
    WHEN vessel_image IS NOT NULL THEN 1
    WHEN raw_payload->'detail'->>'image' IS NOT NULL THEN 2
    ELSE 3
  END,
  vessel_name;

-- Contar cuántos buques tienen imagen guardada vs cuántos solo en raw_payload
SELECT 
  COUNT(*) as total_buques,
  COUNT(vessel_image) as con_imagen_guardada,
  COUNT(raw_payload->'detail'->>'image') as con_imagen_en_raw_payload,
  COUNT(*) - COUNT(vessel_image) as sin_imagen_guardada
FROM vessel_positions;

-- Buscar buques específicos (ejemplo: buscar "HMM" o "MAERSK")
-- Reemplaza el patrón según lo que busques
SELECT 
  vessel_name,
  vessel_image,
  raw_payload->'detail'->>'image' as imagen_en_raw_payload
FROM vessel_positions
WHERE vessel_name ILIKE '%HMM%'  -- Cambia esto por el patrón que buscas
   OR vessel_name ILIKE '%MAERSK%'
ORDER BY vessel_name;

