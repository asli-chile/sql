-- Script para recuperar la trayectoria perdida de HMM BLESSING
-- Este script inserta la posición actual en el historial si no existe
--
-- PASOS:
-- 1. Ejecuta este script en Supabase SQL Editor
-- 2. Esto insertará la posición actual en el historial para mantener la trayectoria

-- Insertar la posición actual de HMM BLESSING en el historial
INSERT INTO vessel_position_history (vessel_name, lat, lon, position_at, source)
SELECT 
  vessel_name,
  last_lat,
  last_lon,
  last_position_at,
  'AIS'
FROM vessel_positions
WHERE vessel_name = 'HMM BLESSING'
  AND last_lat IS NOT NULL
  AND last_lon IS NOT NULL
  AND last_position_at IS NOT NULL
  -- Solo insertar si no existe ya esta posición en el historial
  AND NOT EXISTS (
    SELECT 1 
    FROM vessel_position_history vph
    WHERE vph.vessel_name = vessel_positions.vessel_name
      AND vph.lat = vessel_positions.last_lat
      AND vph.lon = vessel_positions.last_lon
      AND vph.position_at = vessel_positions.last_position_at
  );

-- Verificar cuántas posiciones hay en el historial
SELECT 
  vessel_name,
  COUNT(*) as total_positions,
  MIN(position_at) as primera_posicion,
  MAX(position_at) as ultima_posicion
FROM vessel_position_history
WHERE vessel_name = 'HMM BLESSING'
GROUP BY vessel_name;

-- Ver las últimas 10 posiciones del historial
SELECT 
  vessel_name,
  lat,
  lon,
  position_at,
  source
FROM vessel_position_history
WHERE vessel_name = 'HMM BLESSING'
ORDER BY position_at DESC
LIMIT 10;

