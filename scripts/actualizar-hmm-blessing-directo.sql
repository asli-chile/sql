-- Script SQL directo para actualizar HMM BLESSING con los datos más recientes de DataDocked
-- Ejecuta esto directamente en Supabase SQL Editor

-- 1. Actualizar vessel_positions con los datos más recientes
UPDATE vessel_positions
SET
  -- Coordenadas más recientes
  last_lat = -35.65115,
  last_lon = -103.16366,
  last_position_at = '2025-11-17 23:01:00+00',
  last_api_call_at = NOW(),
  
  -- Identificadores
  imo = '9742170',
  mmsi = '440117000',
  name = 'HMM BLESSING',
  
  -- Navegación
  speed = 4.2,
  course = 228.2,
  destination = 'CNHKG',
  navigational_status = '-',
  
  -- Tipo de buque
  ship_type = 'Cargo vessels',
  type_specific = 'Container Ship',
  country = 'Korea',
  country_iso = 'KP',
  
  -- Tiempos
  eta_utc = 'Dec 07, 2025 04:00 UTC',
  atd_utc = 'Nov 14, 2025 10:00 UTC',
  predicted_eta = 'Dec 8, 09:59',
  update_time = 'Nov 17, 2025 23:20 UTC',
  
  -- Puertos
  last_port = 'Valparaiso, Chile',
  unlocode_lastport = 'CLVAP',
  unlocode_destination = 'HKHKG',
  
  -- Distancia
  distance = '8733.34 kn',
  
  -- Dimensiones y capacidades
  length = '330 m',
  beam = '48 m',
  current_draught = '13.3 m',
  gross_tonnage = '114023',
  deadweight = '134869',
  year_of_built = '2018',
  teu = '',
  time_remaining = '20 days',
  
  -- Identificación
  callsign = 'D7EW',
  eni = NULL,
  
  -- Construcción
  hull = '-',
  builder = 'HANJIN SUBIC SHIPYARD',
  material = '-',
  place_of_build = 'OLONGAPO, Philippines',
  
  -- Capacidades de carga
  ballast_water = '30818',
  crude_oil = '0',
  fresh_water = '608',
  gas = '0 m³',
  grain = '0 m³',
  bale = '0 m³',
  
  -- Imagen del buque (IMPORTANTE)
  vessel_image = 'https://static.vesselfinder.net/ship-photo/9742170-538007906-08c0ad7e7dd8431c5f2a219c91dd6419/1?v1',
  
  -- Datos fuente
  data_source = 'satellite',
  
  -- Objetos JSON
  engine = '{"engineBuilder": "HYUNDAI HEAVY INDUSTRIES CO., LTD., ENGINE & MACHINERY DIVISION", "engineType": "8G95ME-C9.2", "enginePower(kW)": "42310", "fuelType": "-", "Propeller": "1"}'::jsonb,
  
  ports = '[
    {"portName": "Valparaiso Chile", "portSign": "CLVAP", "arrived": "Nov 12, 09:37", "departed": "Nov 14, 10:00"},
    {"portName": "San Vicente Chile", "portSign": "CLSVE", "arrived": "Nov 10, 10:23", "departed": "Nov 11, 13:56"},
    {"portName": "Talcahuano Anch. Chile", "portSign": "CLTAL", "arrived": "Nov 9, 14:59", "departed": "Nov 10, 07:07"},
    {"portName": "Mejillones Chile", "portSign": "CLMJS", "arrived": "Nov 6, 00:05", "departed": "Nov 7, 02:02"},
    {"portName": "Iquique Chile", "portSign": "CLIQQ", "arrived": "Nov 3, 11:17", "departed": "Nov 5, 11:31"},
    {"portName": "Callao Peru", "portSign": "PECLL", "arrived": "Oct 29, 05:10", "departed": "Oct 30, 19:31"},
    {"portName": "Callao Anch. Peru", "portSign": "PECLL", "arrived": "Oct 28, 08:58", "departed": "Oct 29, 03:15"},
    {"portName": "Lazaro Cardenas Mexico", "portSign": "MXLZC", "arrived": "Oct 22, 16:54", "departed": "Oct 23, 04:10"},
    {"portName": "Manzanillo Mexico", "portSign": "MXZLO", "arrived": "Oct 20, 14:39", "departed": "Oct 22, 04:36"},
    {"portName": "Busan New Port Korea", "portSign": "KRBNP", "arrived": "Oct 2, 20:49", "departed": "Oct 4, 14:50"},
    {"portName": "Yangshan Deep-Water China", "portSign": "CNYSA", "arrived": "Sep 29, 18:13", "departed": "Oct 1, 07:25"},
    {"portName": "Keelung (Chilung) Taiwan", "portSign": "TWKEL", "arrived": "Sep 27, 22:26", "departed": "Sep 28, 16:27"},
    {"portName": "Yantian China", "portSign": "CNYTN", "arrived": "Sep 25, 12:54", "departed": "Sep 26, 14:39"},
    {"portName": "Hong Kong Hong Kong", "portSign": "HKHKG", "arrived": "Sep 20, 16:25", "departed": "Sep 21, 11:29"},
    {"portName": "San Vicente Chile", "portSign": "CLSVE", "arrived": "Aug 24, 01:14", "departed": "Aug 26, 11:41"}
  ]'::jsonb,
  
  management = '{
    "registeredOwner": "HMM CO LTD",
    "registeredOwnerAddress": "108, Yeoui-daero, Yeongdeungpo-gu, Seoul, 07335, South Korea.",
    "registeredOwnerWebsite": "http://www.hmm21.com",
    "registeredOwnerEmail": "gys@hmm21.com",
    "manager": "HMM CO LTD",
    "ismAddress": "63, Jungang-daero, Jung-gu, Busan, South Korea.",
    "managerAddress": "108, Yeoui-daero, Yeongdeungpo-gu, Seoul, 07335, South Korea.",
    "managerWebsite": "http://www.hmm21.com",
    "managerEmail": "gys@hmm21.com",
    "ism": "HMM OCEAN SERVICE CO LTD",
    "ismWeb": "http://www.hos21.com",
    "ismWebsite": "http://www.hos21.com",
    "ismEmail": "vetting@hos21.com",
    "P&I": "Steamship Mutual Underwriting Association (Bermuda) (inception 2025-09-22)",
    "ClassificationSociety": "KOREAN REGISTER OF SHIPPING"
  }'::jsonb,
  
  -- Timestamp de actualización
  updated_at = NOW()
WHERE vessel_name = 'HMM BLESSING';

-- 2. Insertar también en el historial
INSERT INTO vessel_position_history (
  vessel_name,
  imo,
  mmsi,
  name,
  lat,
  lon,
  position_at,
  source,
  speed,
  course,
  destination,
  navigational_status,
  ship_type,
  country,
  country_iso,
  eta_utc,
  atd_utc,
  last_port,
  unlocode_lastport,
  unlocode_destination,
  distance,
  predicted_eta,
  current_draught,
  length,
  beam,
  gross_tonnage,
  year_of_built,
  callsign,
  type_specific,
  deadweight,
  hull,
  builder,
  material,
  place_of_build,
  ballast_water,
  crude_oil,
  fresh_water,
  gas,
  grain,
  bale,
  time_remaining,
  teu,
  engine,
  ports,
  management,
  vessel_image,
  update_time,
  data_source,
  eni
) VALUES (
  'HMM BLESSING',
  '9742170',
  '440117000',
  'HMM BLESSING',
  -35.65115,
  -103.16366,
  '2025-11-17 23:01:00+00',
  'AIS',
  4.2,
  228.2,
  'CNHKG',
  '-',
  'Cargo vessels',
  'Korea',
  'KP',
  'Dec 07, 2025 04:00 UTC',
  'Nov 14, 2025 10:00 UTC',
  'Valparaiso, Chile',
  'CLVAP',
  'HKHKG',
  '8733.34 kn',
  'Dec 8, 09:59',
  '13.3 m',
  '330 m',
  '48 m',
  '114023',
  '2018',
  'D7EW',
  'Container Ship',
  '134869',
  '-',
  'HANJIN SUBIC SHIPYARD',
  '-',
  'OLONGAPO, Philippines',
  '30818',
  '0',
  '608',
  '0 m³',
  '0 m³',
  '0 m³',
  '20 days',
  '',
  '{"engineBuilder": "HYUNDAI HEAVY INDUSTRIES CO., LTD., ENGINE & MACHINERY DIVISION", "engineType": "8G95ME-C9.2", "enginePower(kW)": "42310", "fuelType": "-", "Propeller": "1"}'::jsonb,
  '[
    {"portName": "Valparaiso Chile", "portSign": "CLVAP", "arrived": "Nov 12, 09:37", "departed": "Nov 14, 10:00"},
    {"portName": "San Vicente Chile", "portSign": "CLSVE", "arrived": "Nov 10, 10:23", "departed": "Nov 11, 13:56"},
    {"portName": "Talcahuano Anch. Chile", "portSign": "CLTAL", "arrived": "Nov 9, 14:59", "departed": "Nov 10, 07:07"},
    {"portName": "Mejillones Chile", "portSign": "CLMJS", "arrived": "Nov 6, 00:05", "departed": "Nov 7, 02:02"},
    {"portName": "Iquique Chile", "portSign": "CLIQQ", "arrived": "Nov 3, 11:17", "departed": "Nov 5, 11:31"},
    {"portName": "Callao Peru", "portSign": "PECLL", "arrived": "Oct 29, 05:10", "departed": "Oct 30, 19:31"},
    {"portName": "Callao Anch. Peru", "portSign": "PECLL", "arrived": "Oct 28, 08:58", "departed": "Oct 29, 03:15"},
    {"portName": "Lazaro Cardenas Mexico", "portSign": "MXLZC", "arrived": "Oct 22, 16:54", "departed": "Oct 23, 04:10"},
    {"portName": "Manzanillo Mexico", "portSign": "MXZLO", "arrived": "Oct 20, 14:39", "departed": "Oct 22, 04:36"},
    {"portName": "Busan New Port Korea", "portSign": "KRBNP", "arrived": "Oct 2, 20:49", "departed": "Oct 4, 14:50"},
    {"portName": "Yangshan Deep-Water China", "portSign": "CNYSA", "arrived": "Sep 29, 18:13", "departed": "Oct 1, 07:25"},
    {"portName": "Keelung (Chilung) Taiwan", "portSign": "TWKEL", "arrived": "Sep 27, 22:26", "departed": "Sep 28, 16:27"},
    {"portName": "Yantian China", "portSign": "CNYTN", "arrived": "Sep 25, 12:54", "departed": "Sep 26, 14:39"},
    {"portName": "Hong Kong Hong Kong", "portSign": "HKHKG", "arrived": "Sep 20, 16:25", "departed": "Sep 21, 11:29"},
    {"portName": "San Vicente Chile", "portSign": "CLSVE", "arrived": "Aug 24, 01:14", "departed": "Aug 26, 11:41"}
  ]'::jsonb,
  '{
    "registeredOwner": "HMM CO LTD",
    "registeredOwnerAddress": "108, Yeoui-daero, Yeongdeungpo-gu, Seoul, 07335, South Korea.",
    "registeredOwnerWebsite": "http://www.hmm21.com",
    "registeredOwnerEmail": "gys@hmm21.com",
    "manager": "HMM CO LTD",
    "ismAddress": "63, Jungang-daero, Jung-gu, Busan, South Korea.",
    "managerAddress": "108, Yeoui-daero, Yeongdeungpo-gu, Seoul, 07335, South Korea.",
    "managerWebsite": "http://www.hmm21.com",
    "managerEmail": "gys@hmm21.com",
    "ism": "HMM OCEAN SERVICE CO LTD",
    "ismWeb": "http://www.hos21.com",
    "ismWebsite": "http://www.hos21.com",
    "ismEmail": "vetting@hos21.com",
    "P&I": "Steamship Mutual Underwriting Association (Bermuda) (inception 2025-09-22)",
    "ClassificationSociety": "KOREAN REGISTER OF SHIPPING"
  }'::jsonb,
  'https://static.vesselfinder.net/ship-photo/9742170-538007906-08c0ad7e7dd8431c5f2a219c91dd6419/1?v1',
  'Nov 17, 2025 23:20 UTC',
  'satellite',
  NULL
);

-- 3. Verificar que se actualizó correctamente
SELECT 
  vessel_name,
  last_lat,
  last_lon,
  last_position_at,
  vessel_image,
  speed,
  course,
  destination,
  updated_at
FROM vessel_positions
WHERE vessel_name = 'HMM BLESSING';

