-- =====================================================
-- AGREGAR TODOS LOS CAMPOS DE LA API DATADOCKED
-- =====================================================
-- Este script agrega TODOS los campos que devuelve la API de DataDocked
-- para guardar toda la información disponible
-- =====================================================

-- Campos básicos de posición (ya existen, pero los listamos para referencia)
-- vessel_name, imo, mmsi, last_lat, last_lon, last_position_at, last_api_call_at, raw_payload

-- Campos de navegación
ALTER TABLE vessel_positions 
ADD COLUMN IF NOT EXISTS speed DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS course DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS destination TEXT,
ADD COLUMN IF NOT EXISTS navigational_status TEXT,
ADD COLUMN IF NOT EXISTS distance TEXT;

-- Información del buque
ALTER TABLE vessel_positions 
ADD COLUMN IF NOT EXISTS ship_type TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS country_iso TEXT,
ADD COLUMN IF NOT EXISTS callsign TEXT,
ADD COLUMN IF NOT EXISTS type_specific TEXT;

-- Dimensiones y capacidades
ALTER TABLE vessel_positions 
ADD COLUMN IF NOT EXISTS length TEXT,
ADD COLUMN IF NOT EXISTS beam TEXT,
ADD COLUMN IF NOT EXISTS current_draught TEXT,
ADD COLUMN IF NOT EXISTS deadweight TEXT,
ADD COLUMN IF NOT EXISTS gross_tonnage TEXT,
ADD COLUMN IF NOT EXISTS teu TEXT;

-- Fechas y tiempos
ALTER TABLE vessel_positions 
ADD COLUMN IF NOT EXISTS eta_utc TEXT,
ADD COLUMN IF NOT EXISTS atd_utc TEXT,
ADD COLUMN IF NOT EXISTS predicted_eta TEXT,
ADD COLUMN IF NOT EXISTS time_remaining TEXT,
ADD COLUMN IF NOT EXISTS update_time TEXT;

-- Puertos
ALTER TABLE vessel_positions 
ADD COLUMN IF NOT EXISTS last_port TEXT,
ADD COLUMN IF NOT EXISTS unlocode_lastport TEXT,
ADD COLUMN IF NOT EXISTS unlocode_destination TEXT;

-- Información de construcción
ALTER TABLE vessel_positions 
ADD COLUMN IF NOT EXISTS year_of_built TEXT,
ADD COLUMN IF NOT EXISTS hull TEXT,
ADD COLUMN IF NOT EXISTS builder TEXT,
ADD COLUMN IF NOT EXISTS material TEXT,
ADD COLUMN IF NOT EXISTS place_of_build TEXT;

-- Capacidades (m³)
ALTER TABLE vessel_positions 
ADD COLUMN IF NOT EXISTS ballast_water TEXT,
ADD COLUMN IF NOT EXISTS crude_oil TEXT,
ADD COLUMN IF NOT EXISTS fresh_water TEXT,
ADD COLUMN IF NOT EXISTS gas TEXT,
ADD COLUMN IF NOT EXISTS grain TEXT,
ADD COLUMN IF NOT EXISTS bale TEXT;

-- Objetos complejos (guardados como JSON)
ALTER TABLE vessel_positions 
ADD COLUMN IF NOT EXISTS engine JSONB,
ADD COLUMN IF NOT EXISTS ports JSONB,
ADD COLUMN IF NOT EXISTS management JSONB;

-- Imagen del buque
ALTER TABLE vessel_positions 
ADD COLUMN IF NOT EXISTS vessel_image TEXT;

-- Campos adicionales de la API
ALTER TABLE vessel_positions 
ADD COLUMN IF NOT EXISTS country_iso TEXT,
ADD COLUMN IF NOT EXISTS unlocode_destination TEXT,
ADD COLUMN IF NOT EXISTS update_time TEXT,
ADD COLUMN IF NOT EXISTS data_source TEXT,
ADD COLUMN IF NOT EXISTS eni TEXT,
ADD COLUMN IF NOT EXISTS name TEXT; -- Nombre que devuelve la API (puede diferir de vessel_name)

-- Comentarios para documentación
COMMENT ON COLUMN vessel_positions.speed IS 'Velocidad del buque en nudos';
COMMENT ON COLUMN vessel_positions.course IS 'Rumbo del buque en grados';
COMMENT ON COLUMN vessel_positions.destination IS 'Código del puerto de destino';
COMMENT ON COLUMN vessel_positions.navigational_status IS 'Estado de navegación (Moored, Underway, etc.)';
COMMENT ON COLUMN vessel_positions.distance IS 'Distancia al destino';
COMMENT ON COLUMN vessel_positions.ship_type IS 'Tipo de buque (Cargo vessels, Container Ship, etc.)';
COMMENT ON COLUMN vessel_positions.country IS 'País del buque';
COMMENT ON COLUMN vessel_positions.country_iso IS 'Código ISO del país (ej: IT, KP)';
COMMENT ON COLUMN vessel_positions.callsign IS 'Señal de llamada del buque';
COMMENT ON COLUMN vessel_positions.type_specific IS 'Tipo específico del buque';
COMMENT ON COLUMN vessel_positions.length IS 'Eslora del buque (ej: "330 m")';
COMMENT ON COLUMN vessel_positions.beam IS 'Manga del buque (ej: "48 m")';
COMMENT ON COLUMN vessel_positions.current_draught IS 'Calado actual (ej: "13.3 m")';
COMMENT ON COLUMN vessel_positions.deadweight IS 'Peso muerto en toneladas';
COMMENT ON COLUMN vessel_positions.gross_tonnage IS 'Arqueo bruto';
COMMENT ON COLUMN vessel_positions.teu IS 'Capacidad en TEU (Twenty-foot Equivalent Unit)';
COMMENT ON COLUMN vessel_positions.eta_utc IS 'ETA estimada en UTC';
COMMENT ON COLUMN vessel_positions.atd_utc IS 'ATD (Actual Time of Departure) en UTC';
COMMENT ON COLUMN vessel_positions.predicted_eta IS 'ETA predicha';
COMMENT ON COLUMN vessel_positions.time_remaining IS 'Tiempo restante hasta destino';
COMMENT ON COLUMN vessel_positions.update_time IS 'Hora de última actualización de la API';
COMMENT ON COLUMN vessel_positions.last_port IS 'Último puerto visitado';
COMMENT ON COLUMN vessel_positions.unlocode_lastport IS 'Código UN/LOCODE del último puerto';
COMMENT ON COLUMN vessel_positions.unlocode_destination IS 'Código UN/LOCODE del destino';
COMMENT ON COLUMN vessel_positions.year_of_built IS 'Año de construcción';
COMMENT ON COLUMN vessel_positions.hull IS 'Tipo de casco (SINGLE HULL, DOUBLE HULL, etc.)';
COMMENT ON COLUMN vessel_positions.builder IS 'Astillero constructor';
COMMENT ON COLUMN vessel_positions.material IS 'Material de construcción';
COMMENT ON COLUMN vessel_positions.place_of_build IS 'Lugar de construcción';
COMMENT ON COLUMN vessel_positions.ballast_water IS 'Capacidad de agua de lastre (m³)';
COMMENT ON COLUMN vessel_positions.crude_oil IS 'Capacidad de petróleo crudo (m³)';
COMMENT ON COLUMN vessel_positions.fresh_water IS 'Capacidad de agua dulce (m³)';
COMMENT ON COLUMN vessel_positions.gas IS 'Capacidad de gas (m³)';
COMMENT ON COLUMN vessel_positions.grain IS 'Capacidad de grano (m³)';
COMMENT ON COLUMN vessel_positions.bale IS 'Capacidad de fardos (m³)';
COMMENT ON COLUMN vessel_positions.engine IS 'Información del motor (JSON)';
COMMENT ON COLUMN vessel_positions.ports IS 'Historial de puertos visitados (JSON)';
COMMENT ON COLUMN vessel_positions.management IS 'Información de gestión y propietario (JSON)';
COMMENT ON COLUMN vessel_positions.vessel_image IS 'URL de la imagen del buque';
COMMENT ON COLUMN vessel_positions.country_iso IS 'Código ISO del país (ej: IT, KP)';
COMMENT ON COLUMN vessel_positions.unlocode_destination IS 'Código UN/LOCODE del puerto de destino';
COMMENT ON COLUMN vessel_positions.update_time IS 'Hora de última actualización de la API';
COMMENT ON COLUMN vessel_positions.data_source IS 'Fuente de datos (Satellite, AIS, etc.)';
COMMENT ON COLUMN vessel_positions.eni IS 'Número ENI (European Number of Identification)';
COMMENT ON COLUMN vessel_positions.name IS 'Nombre del buque según la API (puede diferir de vessel_name)';

