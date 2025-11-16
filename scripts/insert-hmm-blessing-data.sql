-- Script para insertar todos los datos de HMM BLESSING desde el JSON proporcionado
-- Este script inserta/actualiza todos los campos con los datos reales del JSON
--
-- PASOS:
-- 1. Ejecuta este script en Supabase SQL Editor
-- 2. Los datos se insertarán/actualizarán en la tabla vessel_positions

-- Insertar/Actualizar todos los datos de HMM BLESSING
INSERT INTO vessel_positions (
  vessel_name,
  imo,
  mmsi,
  last_lat,
  last_lon,
  last_position_at,
  last_api_call_at,
  speed,
  course,
  destination,
  navigational_status,
  ship_type,
  country,
  eta_utc,
  atd_utc,
  last_port,
  unlocode_lastport,
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
  management
)
VALUES (
  'HMM BLESSING',
  '9742170',
  '440117000',
  -35.65407,
  -92.66505,
  '2025-11-16 20:04:00+00'::timestamptz,
  NOW(),
  4.2,
  228.2,
  'CNHKG',
  '-',
  'Buques de carga',
  'Korea',
  '6 de diciembre de 2025, 15:30 UTC',
  '14 de noviembre de 2025, 10:00 UTC',
  'Valparaíso, Chile',
  'CLVAP',
  '9194.02 kn',
  '6 de diciembre, 12:27',
  '13.3 m',
  '330 m',
  '48 m',
  '114023',
  '2018',
  'D7EW',
  'Buque portacontenedores',
  '134869',
  '-',
  'HANJIN SUBIC SHIPYARD',
  '-',
  'OLONGAPO, Filipinas',
  '30818',
  '0',
  '608',
  '0 m³',
  '0 m³',
  '0 m³',
  '19 días',
  '',
  -- Engine (JSON)
  '{
    "engineBuilder": "HYUNDAI HEAVY INDUSTRIES CO., LTD., ENGINE & MACHINERY DIVISION",
    "engineType": "8G95ME-C9.2",
    "enginePower(kW)": "42310",
    "fuelType": "-",
    "Propeller": "1"
  }'::jsonb,
  -- Ports (JSON array)
  '[
    {
      "portName": "Valparaíso, Chile",
      "portSign": "CLVAP",
      "arrived": "12 de noviembre, 09:37",
      "departed": "14 de noviembre, 10:00"
    },
    {
      "portName": "San Vicente, Chile",
      "portSign": "CLSVE",
      "arrived": "10 de noviembre, 10:23",
      "salida": "11 de noviembre, 13:56"
    },
    {
      "Nombre del puerto": "Talcahuano Anchor. Chile",
      "Signo del puerto": "CLTAL",
      "llegada": "9 de noviembre, 14:59",
      "salida": "10 de noviembre, 07:07"
    },
    {
      "Nombre del puerto": "Mejillones, Chile",
      "Signo del puerto": "CLMJS",
      "llegada": "6 de noviembre, 00:05",
      "salida": "7 de noviembre, 02:02"
    },
    {
      "Nombre del puerto": "Iquique, Chile",
      "Signo del puerto": "CLIQQ",
      "llegada": "3 de noviembre, 11:17",
      "salida": "5 de noviembre, 11:31"
    },
    {
      "Nombre del puerto": "Callao, Perú",
      "Signo del puerto": "PECLL",
      "Llegó": "29 de octubre, 05:10",
      "Salió": "30 de octubre, 19:31"
    },
    {
      "Nombre del puerto": "Callao Anchor. Perú",
      "Signo del puerto": "PECLL",
      "Llegó": "28 de octubre, 08:58",
      "Salió": "29 de octubre, 03:15"
    },
    {
      "Nombre del puerto": "Lázaro Cárdenas, México",
      "Signato del puerto": "MXLZC",
      "Llegó": "22 de octubre, 16:54",
      "Salió": "23 de octubre, 04:10"
    },
    {
      "Nombre del puerto": "Manzanillo, México",
      "Signato del puerto": "MXZLO",
      "Llegó": "20 de octubre, 14:39",
      "Salió": "22 de octubre, 04:36"
    },
    {
      "Nombre del puerto": "Nuevo Puerto de Busan, Corea",
      "Signato del puerto": "KRBNP",
      "Llegó": "2 de octubre, 20:49",
      "Salió": "4 de octubre, 14:50"
    },
    {
      "Nombre del puerto": "Aguas profundas de Yangshan, China",
      "Signo del puerto": "CNYSA",
      "Llegó": "29 de septiembre, 18:13",
      "Salió": "1 de octubre, 07:25"
    },
    {
      "Nombre del puerto": "Keelung (Chilung), Taiwán",
      "Signo del puerto": "TWKEL",
      "Llegó": "27 de septiembre, 22:26",
      "salió": "28 de septiembre, 16:27"
    },
    {
      "Nombre del puerto": "Yantian, China",
      "Signo del puerto": "CNYTN",
      "llegó": "25 de septiembre, 12:54",
      "salió": "26 de septiembre, 14:39"
    },
    {
      "Nombre del puerto": "Hong Kong, Hong Kong",
      "Signo del puerto": "HKHKG",
      "llegó": "20 de septiembre, 16:25",
      "salió": "21 de septiembre, 11:29"
    },
    {
      "portName": "San Vicente, Chile",
      "portSign": "CLSVE",
      "llegó": "24 de agosto, 01:14",
      "salió": "26 de agosto, 11:41"
    }
  ]'::jsonb,
  -- Management (JSON)
  '{
    "Propietario registrado": "HMM CO LTD",
    "Dirección del propietario registrado": "108, Yeoui-daero, Yeongdeungpo-gu, Seúl, 07335, Corea del Sur.",
    "Sitio web del propietario registrado": "http://www.hmm21.com",
    "Correo electrónico del propietario registrado": "gys@hmm21.com",
    "Gerente": "HMM CO LTD",
    "Dirección de ism": "63, Jungang-daero, Jung-gu, Busan, Corea del Sur.",
    "Dirección del gerente": "108, Yeoui-daero, Yeongdeungpo-gu, Seúl, 07335, Corea del Sur.",
    "Sitio web del gerente": "http://www.hmm21.com",
    "Correo electrónico del gerente": "gys@hmm21.com",
    "ism": "HMM OCEAN SERVICE CO LTD",
    "ismWeb": "http://www.hos21.com",
    "ismWebsite": "http://www.hos21.com",
    "ismEmail": "vetting@hos21.com",
    "P&I": "Steamship Mutual Underwriting Association (Bermuda) (inicio 2025-09-22)",
    "ClassificationSociety": "KOREAN REGISTER OF SHIPPING"
  }'::jsonb
)
ON CONFLICT (vessel_name) 
DO UPDATE SET 
  imo = EXCLUDED.imo,
  mmsi = EXCLUDED.mmsi,
  last_lat = EXCLUDED.last_lat,
  last_lon = EXCLUDED.last_lon,
  last_position_at = EXCLUDED.last_position_at,
  last_api_call_at = EXCLUDED.last_api_call_at,
  speed = EXCLUDED.speed,
  course = EXCLUDED.course,
  destination = EXCLUDED.destination,
  navigational_status = EXCLUDED.navigational_status,
  ship_type = EXCLUDED.ship_type,
  country = EXCLUDED.country,
  eta_utc = EXCLUDED.eta_utc,
  atd_utc = EXCLUDED.atd_utc,
  last_port = EXCLUDED.last_port,
  unlocode_lastport = EXCLUDED.unlocode_lastport,
  distance = EXCLUDED.distance,
  predicted_eta = EXCLUDED.predicted_eta,
  current_draught = EXCLUDED.current_draught,
  length = EXCLUDED.length,
  beam = EXCLUDED.beam,
  gross_tonnage = EXCLUDED.gross_tonnage,
  year_of_built = EXCLUDED.year_of_built,
  callsign = EXCLUDED.callsign,
  type_specific = EXCLUDED.type_specific,
  deadweight = EXCLUDED.deadweight,
  hull = EXCLUDED.hull,
  builder = EXCLUDED.builder,
  material = EXCLUDED.material,
  place_of_build = EXCLUDED.place_of_build,
  ballast_water = EXCLUDED.ballast_water,
  crude_oil = EXCLUDED.crude_oil,
  fresh_water = EXCLUDED.fresh_water,
  gas = EXCLUDED.gas,
  grain = EXCLUDED.grain,
  bale = EXCLUDED.bale,
  time_remaining = EXCLUDED.time_remaining,
  teu = EXCLUDED.teu,
  engine = EXCLUDED.engine,
  ports = EXCLUDED.ports,
  management = EXCLUDED.management;

-- Guardar la posición actual en el historial para mantener la trayectoria
INSERT INTO vessel_position_history (vessel_name, lat, lon, position_at, source)
VALUES (
  'HMM BLESSING',
  -35.65407,
  -92.66505,
  '2025-11-16 20:04:00+00'::timestamptz,
  'AIS'
)
ON CONFLICT DO NOTHING;

-- Verificar que se guardaron todos los datos
SELECT 
  vessel_name,
  imo,
  mmsi,
  last_lat,
  last_lon,
  speed,
  course,
  destination,
  last_port,
  distance,
  deadweight,
  builder,
  place_of_build,
  length,
  beam,
  gross_tonnage,
  year_of_built,
  callsign,
  type_specific,
  country,
  ship_type,
  navigational_status,
  current_draught,
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
  management
FROM vessel_positions 
WHERE vessel_name = 'HMM BLESSING';

-- Verificar que se guardó en el historial
SELECT COUNT(*) as total_positions
FROM vessel_position_history 
WHERE vessel_name = 'HMM BLESSING';

