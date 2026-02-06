-- =====================================================
-- VERIFICAR MMSIs EN LA BASE DE DATOS
-- =====================================================
-- Este script verifica que los MMSIs estén correctamente
-- configurados en vessel_position
-- =====================================================

-- Ver todos los registros con MMSI
SELECT 
  vessel_name AS "Nombre de la nave",
  mmsi AS "MMSI",
  imo AS "IMO",
  last_lat AS "Última latitud",
  last_lon AS "Última longitud",
  last_position_at AS "Última posición",
  last_api_call_at AS "Última llamada API",
  created_at AS "Creado en",
  updated_at AS "Actualizado en"
FROM vessel_position
WHERE mmsi IS NOT NULL
ORDER BY vessel_name;

-- Ver solo los MMSIs que deberían estar activos en el WebSocket
SELECT 
  vessel_name AS "Nombre de la nave",
  mmsi AS "MMSI",
  CASE 
    WHEN mmsi IS NOT NULL AND mmsi::text != '' THEN '✅ Válido'
    ELSE '❌ Inválido'
  END AS "Estado MMSI",
  CASE 
    WHEN last_lat IS NOT NULL AND last_lon IS NOT NULL THEN '✅ Tiene posición'
    ELSE '⚠️ Sin posición'
  END AS "Estado Posición"
FROM vessel_position
WHERE mmsi IS NOT NULL
ORDER BY vessel_name;

-- Contar cuántos MMSIs válidos hay
SELECT 
  COUNT(*) AS total_naves,
  COUNT(mmsi) AS naves_con_mmsi,
  COUNT(CASE WHEN mmsi IS NOT NULL AND mmsi::text != '' THEN 1 END) AS mmsis_validos,
  COUNT(CASE WHEN last_lat IS NOT NULL AND last_lon IS NOT NULL THEN 1 END) AS naves_con_posicion
FROM vessel_position;

-- Ver los MMSIs que se enviarán al WebSocket (formato string)
SELECT 
  vessel_name,
  mmsi::text AS mmsi_string,
  mmsi AS mmsi_number
FROM vessel_position
WHERE mmsi IS NOT NULL
ORDER BY mmsi;
