-- Script para configurar el IMO/MMSI de un buque manualmente
-- Esto permite que el sistema use estos identificadores para buscar en la API AIS
--
-- USO:
-- 1. Reemplaza 'NOMBRE_DEL_BUQUE' con el nombre exacto del buque
-- 2. Reemplaza 'IMO_NUMBER' con el IMO (o deja NULL si no lo tienes)
-- 3. Reemplaza 'MMSI_NUMBER' con el MMSI (o deja NULL si no lo tienes)
-- 4. Ejecuta el script en Supabase SQL Editor

-- Ejemplo para HMM BLESSING (IMO: 9742170, MMSI: 440117000)
INSERT INTO vessel_positions (vessel_name, imo, mmsi)
VALUES ('HMM BLESSING', '9742170', '440117000')
ON CONFLICT (vessel_name) 
DO UPDATE SET 
  imo = EXCLUDED.imo,
  mmsi = EXCLUDED.mmsi;

-- Para actualizar solo el IMO de un buque existente:
-- UPDATE vessel_positions 
-- SET imo = '9742170', mmsi = '440117000'
-- WHERE vessel_name = 'HMM BLESSING';

-- Para verificar que se guardó correctamente:
-- SELECT vessel_name, imo, mmsi, last_api_call_at 
-- FROM vessel_positions 
-- WHERE vessel_name = 'HMM BLESSING';

