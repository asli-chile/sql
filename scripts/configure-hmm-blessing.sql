-- Script para configurar IMO/MMSI de HMM BLESSING y forzar actualización
-- Este script configura el IMO y MMSI, y resetea last_api_call_at para forzar una actualización inmediata
--
-- PASOS:
-- 1. Ejecuta este script en Supabase SQL Editor
-- 2. Ve a la página de seguimiento en la web
-- 3. Haz clic en "Actualizar posiciones"
-- 4. Los datos deberían guardarse correctamente

-- Configurar IMO/MMSI para HMM BLESSING
INSERT INTO vessel_positions (vessel_name, imo, mmsi, last_api_call_at)
VALUES ('HMM BLESSING', '9742170', '440117000', NULL)
ON CONFLICT (vessel_name) 
DO UPDATE SET 
  imo = EXCLUDED.imo,
  mmsi = EXCLUDED.mmsi,
  last_api_call_at = NULL;  -- Resetear para forzar actualización inmediata

-- Verificar que se guardó correctamente
SELECT 
  vessel_name, 
  imo, 
  mmsi, 
  last_api_call_at,
  last_lat,
  last_lon,
  speed,
  course,
  destination,
  last_port,
  distance,
  deadweight,
  builder,
  place_of_build
FROM vessel_positions 
WHERE vessel_name = 'HMM BLESSING';

