-- Script para actualizar vessel_positions con los datos más recientes de vessel_position_history
-- Este script sincroniza las posiciones actuales con el historial más reciente

-- Primero, mostrar qué buques tienen datos más recientes en el historial que en vessel_positions
WITH latest_history AS (
  SELECT DISTINCT ON (vessel_name)
    vessel_name,
    lat,
    lon,
    position_at,
    imo,
    mmsi,
    name,
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
    eni,
    source
  FROM vessel_position_history
  ORDER BY vessel_name, position_at DESC NULLS LAST
)
SELECT 
  vp.vessel_name,
  vp.last_position_at as posicion_actual_en_vessel_positions,
  lh.position_at as posicion_mas_reciente_en_historial,
  CASE 
    WHEN lh.position_at > vp.last_position_at THEN '✅ Historial es más reciente'
    WHEN lh.position_at = vp.last_position_at THEN '➡️ Misma fecha'
    WHEN lh.position_at < vp.last_position_at THEN '⚠️ vessel_positions es más reciente'
    ELSE '❓ Sin comparar'
  END as estado,
  vp.last_lat as lat_actual,
  vp.last_lon as lon_actual,
  lh.lat as lat_historial,
  lh.lon as lon_historial
FROM vessel_positions vp
INNER JOIN latest_history lh ON vp.vessel_name = lh.vessel_name
WHERE 
  (lh.position_at > vp.last_position_at)
  OR (lh.position_at IS NOT NULL AND vp.last_position_at IS NULL)
ORDER BY lh.position_at DESC NULLS LAST;

-- Ahora, actualizar vessel_positions con los datos más recientes del historial
-- Solo actualiza si el historial tiene una fecha más reciente o si vessel_positions está vacío
WITH latest_history AS (
  SELECT DISTINCT ON (vessel_name)
    vessel_name,
    lat,
    lon,
    position_at,
    imo,
    mmsi,
    name,
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
  FROM vessel_position_history
  ORDER BY vessel_name, position_at DESC NULLS LAST
)
UPDATE vessel_positions vp
SET
  last_lat = COALESCE(lh.lat, vp.last_lat),
  last_lon = COALESCE(lh.lon, vp.last_lon),
  last_position_at = COALESCE(lh.position_at, vp.last_position_at),
  imo = COALESCE(NULLIF(TRIM(lh.imo), ''), vp.imo),
  mmsi = COALESCE(NULLIF(TRIM(lh.mmsi), ''), vp.mmsi),
  name = COALESCE(NULLIF(TRIM(lh.name), ''), vp.name),
  speed = COALESCE(lh.speed, vp.speed),
  course = COALESCE(lh.course, vp.course),
  destination = COALESCE(NULLIF(TRIM(lh.destination), ''), vp.destination),
  navigational_status = COALESCE(NULLIF(TRIM(lh.navigational_status), ''), vp.navigational_status),
  ship_type = COALESCE(NULLIF(TRIM(lh.ship_type), ''), vp.ship_type),
  country = COALESCE(NULLIF(TRIM(lh.country), ''), vp.country),
  country_iso = COALESCE(NULLIF(TRIM(lh.country_iso), ''), vp.country_iso),
  eta_utc = COALESCE(NULLIF(TRIM(lh.eta_utc), ''), vp.eta_utc),
  atd_utc = COALESCE(NULLIF(TRIM(lh.atd_utc), ''), vp.atd_utc),
  last_port = COALESCE(NULLIF(TRIM(lh.last_port), ''), vp.last_port),
  unlocode_lastport = COALESCE(NULLIF(TRIM(lh.unlocode_lastport), ''), vp.unlocode_lastport),
  unlocode_destination = COALESCE(NULLIF(TRIM(lh.unlocode_destination), ''), vp.unlocode_destination),
  distance = COALESCE(NULLIF(TRIM(lh.distance), ''), vp.distance),
  predicted_eta = COALESCE(NULLIF(TRIM(lh.predicted_eta), ''), vp.predicted_eta),
  current_draught = COALESCE(NULLIF(TRIM(lh.current_draught), ''), vp.current_draught),
  length = COALESCE(NULLIF(TRIM(lh.length), ''), vp.length),
  beam = COALESCE(NULLIF(TRIM(lh.beam), ''), vp.beam),
  gross_tonnage = COALESCE(NULLIF(TRIM(lh.gross_tonnage), ''), vp.gross_tonnage),
  year_of_built = COALESCE(NULLIF(TRIM(lh.year_of_built), ''), vp.year_of_built),
  callsign = COALESCE(NULLIF(TRIM(lh.callsign), ''), vp.callsign),
  type_specific = COALESCE(NULLIF(TRIM(lh.type_specific), ''), vp.type_specific),
  deadweight = COALESCE(NULLIF(TRIM(lh.deadweight), ''), vp.deadweight),
  hull = COALESCE(NULLIF(TRIM(lh.hull), ''), vp.hull),
  builder = COALESCE(NULLIF(TRIM(lh.builder), ''), vp.builder),
  material = COALESCE(NULLIF(TRIM(lh.material), ''), vp.material),
  place_of_build = COALESCE(NULLIF(TRIM(lh.place_of_build), ''), vp.place_of_build),
  ballast_water = COALESCE(NULLIF(TRIM(lh.ballast_water), ''), vp.ballast_water),
  crude_oil = COALESCE(NULLIF(TRIM(lh.crude_oil), ''), vp.crude_oil),
  fresh_water = COALESCE(NULLIF(TRIM(lh.fresh_water), ''), vp.fresh_water),
  gas = COALESCE(NULLIF(TRIM(lh.gas), ''), vp.gas),
  grain = COALESCE(NULLIF(TRIM(lh.grain), ''), vp.grain),
  bale = COALESCE(NULLIF(TRIM(lh.bale), ''), vp.bale),
  time_remaining = COALESCE(NULLIF(TRIM(lh.time_remaining), ''), vp.time_remaining),
  teu = COALESCE(NULLIF(TRIM(lh.teu), ''), vp.teu),
  engine = COALESCE(lh.engine, vp.engine),
  ports = COALESCE(lh.ports, vp.ports),
  management = COALESCE(lh.management, vp.management),
  vessel_image = COALESCE(NULLIF(TRIM(lh.vessel_image), ''), vp.vessel_image),
  update_time = COALESCE(NULLIF(TRIM(lh.update_time), ''), vp.update_time),
  data_source = COALESCE(NULLIF(TRIM(lh.data_source), ''), vp.data_source),
  eni = COALESCE(NULLIF(TRIM(lh.eni), ''), vp.eni),
  updated_at = NOW()
FROM latest_history lh
WHERE 
  vp.vessel_name = lh.vessel_name
  AND (
    -- Actualizar si el historial tiene una fecha más reciente
    (lh.position_at > vp.last_position_at)
    -- O si vessel_positions no tiene fecha pero el historial sí
    OR (lh.position_at IS NOT NULL AND vp.last_position_at IS NULL)
    -- O si las coordenadas son diferentes (por si acaso)
    OR (lh.lat IS NOT NULL AND lh.lon IS NOT NULL AND (lh.lat != vp.last_lat OR lh.lon != vp.last_lon))
  );

-- Mostrar resumen de actualizaciones
SELECT 
  vessel_name,
  last_lat,
  last_lon,
  last_position_at,
  updated_at
FROM vessel_positions
ORDER BY updated_at DESC
LIMIT 10;

