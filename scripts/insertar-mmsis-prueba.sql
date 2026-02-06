-- =====================================================
-- INSERTAR MMSIs DE PRUEBA EN vessel_positions
-- =====================================================
-- Este script inserta algunos registros de prueba con MMSIs
-- para probar el WebSocket de AIS
-- =====================================================

-- MMSIs reales de buques conocidos que suelen estar transmitiendo AIS
-- Estos son ejemplos de buques grandes que generalmente están activos
-- Puedes cambiarlos por otros MMSIs que quieras probar

-- Opción 1: Insertar con nombres específicos y MMSIs de prueba
-- IMPORTANTE: Estos MMSIs son de ejemplo. Para probar correctamente, necesitas MMSIs reales
-- que estén transmitiendo AIS actualmente. Puedes obtenerlos en marinetraffic.com

INSERT INTO vessel_positions (
  vessel_name,
  mmsi,
  created_at,
  updated_at
) VALUES
  -- Ejemplo 1: MMSI de prueba (cambia por uno real de marinetraffic.com)
  ('NAVE PRUEBA 1', '219000000', NOW(), NOW()),
  
  -- Ejemplo 2: Otro MMSI de prueba
  ('NAVE PRUEBA 2', '228000000', NOW(), NOW()),
  
  -- Ejemplo 3: Otro MMSI de prueba
  ('NAVE PRUEBA 3', '413000000', NOW(), NOW())
ON CONFLICT (vessel_name) DO UPDATE SET
  mmsi = EXCLUDED.mmsi,
  updated_at = NOW();

-- NOTA IMPORTANTE: 
-- Los MMSIs de arriba son ejemplos. Para que el WebSocket funcione correctamente,
-- necesitas MMSIs REALES de buques que estén transmitiendo AIS en este momento.
-- 
-- Cómo obtener MMSIs reales:
-- 1. Ve a https://www.marinetraffic.com
-- 2. Busca un buque activo (verde = transmitiendo AIS)
-- 3. Haz clic en el buque y verás su MMSI
-- 4. Reemplaza los MMSIs de arriba con los reales

-- Opción 2: Si prefieres usar nombres de naves que ya tienes en registros
-- Descomenta y ajusta los nombres según tus registros:
/*
INSERT INTO vessel_positions (
  vessel_name,
  mmsi,
  created_at,
  updated_at
)
SELECT 
  nave_inicial AS vessel_name,
  '219000000' AS mmsi,  -- Cambia por un MMSI real
  NOW() AS created_at,
  NOW() AS updated_at
FROM registros
WHERE deleted_at IS NULL
  AND nave_inicial IS NOT NULL
  AND TRIM(nave_inicial) != ''
  AND nave_inicial NOT IN (SELECT vessel_name FROM vessel_positions)
LIMIT 3  -- Solo los primeros 3
ON CONFLICT (vessel_name) DO UPDATE SET
  mmsi = EXCLUDED.mmsi,
  updated_at = NOW();
*/

-- Verificar los registros insertados
SELECT 
  vessel_name AS "Nombre de la nave",
  mmsi AS "MMSI",
  imo AS "IMO",
  last_lat AS "Latitud",
  last_lon AS "Longitud",
  created_at AS "Creado en"
FROM vessel_positions
WHERE mmsi IN ('219000000', '228000000', '413000000')
ORDER BY vessel_name;

-- =====================================================
-- NOTAS:
-- =====================================================
-- 1. Los MMSIs usados aquí son ejemplos. Debes cambiarlos por MMSIs reales
-- 2. Puedes buscar MMSIs reales en:
--    - https://www.marinetraffic.com
--    - https://www.vesselfinder.com
-- 3. Para probar, usa MMSIs de buques que estén transmitiendo AIS actualmente
-- 4. Después de insertar, inicia el WebSocket y deberías ver actualizaciones
-- =====================================================
