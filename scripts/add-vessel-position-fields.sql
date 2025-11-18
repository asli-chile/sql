-- Agregar campos adicionales a vessel_positions para guardar datos de la API AIS
-- Estos campos permiten consultar velocidad, rumbo, destino, etc. sin parsear el JSON cada vez

-- Agregar columnas si no existen
DO $$
BEGIN
  -- Velocidad en nudos
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'speed'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN speed DOUBLE PRECISION;
  END IF;

  -- Rumbo/curso en grados
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'course'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN course DOUBLE PRECISION;
  END IF;

  -- Destino (código UN/LOCODE)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'destination'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN destination TEXT;
  END IF;

  -- Estado de navegación (Moored, Underway, etc.)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'navigational_status'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN navigational_status TEXT;
  END IF;

  -- Tipo de buque
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'ship_type'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN ship_type TEXT;
  END IF;

  -- País del buque
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'country'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN country TEXT;
  END IF;

  -- ETA desde la API AIS
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'eta_utc'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN eta_utc TEXT;
  END IF;

  -- ATD desde la API AIS
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'atd_utc'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN atd_utc TEXT;
  END IF;

  -- Puerto anterior
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'last_port'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN last_port TEXT;
  END IF;

  -- Código UN/LOCODE del puerto anterior
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'unlocode_lastport'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN unlocode_lastport TEXT;
  END IF;

  -- Distancia al destino
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'distance'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN distance TEXT;
  END IF;

  -- ETA predicho
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'predicted_eta'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN predicted_eta TEXT;
  END IF;

  -- Calado actual
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'current_draught'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN current_draught TEXT;
  END IF;

  -- Longitud del buque
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'length'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN length TEXT;
  END IF;

  -- Manga del buque
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'beam'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN beam TEXT;
  END IF;

  -- Tonelaje bruto
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'gross_tonnage'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN gross_tonnage TEXT;
  END IF;

  -- Año de construcción
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'year_of_built'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN year_of_built TEXT;
  END IF;

  -- Callsign
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'callsign'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN callsign TEXT;
  END IF;

  -- Tipo específico
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'type_specific'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN type_specific TEXT;
  END IF;

  -- Peso muerto (deadweight)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'deadweight'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN deadweight TEXT;
  END IF;

  -- Casco (hull)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'hull'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN hull TEXT;
  END IF;

  -- Astillero (builder)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'builder'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN builder TEXT;
  END IF;

  -- Material
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'material'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN material TEXT;
  END IF;

  -- Lugar de construcción
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'place_of_build'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN place_of_build TEXT;
  END IF;

  -- Agua de lastre
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'ballast_water'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN ballast_water TEXT;
  END IF;

  -- Petróleo crudo
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'crude_oil'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN crude_oil TEXT;
  END IF;

  -- Agua dulce
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'fresh_water'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN fresh_water TEXT;
  END IF;

  -- Gas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'gas'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN gas TEXT;
  END IF;

  -- Grano
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'grain'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN grain TEXT;
  END IF;

  -- Fardos
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'bale'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN bale TEXT;
  END IF;

  -- Tiempo restante
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'time_remaining'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN time_remaining TEXT;
  END IF;

  -- TEU (Twenty-foot Equivalent Unit)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'teu'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN teu TEXT;
  END IF;

  -- Motor (objeto JSON)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'engine'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN engine JSONB;
  END IF;

  -- Puertos (array JSON)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'ports'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN ports JSONB;
  END IF;

  -- Gestión/Management (objeto JSON)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'management'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN management JSONB;
  END IF;

  -- Código ISO del país
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'country_iso'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN country_iso TEXT;
  END IF;

  -- Código UN/LOCODE del destino
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'unlocode_destination'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN unlocode_destination TEXT;
  END IF;

  -- Hora de actualización de la API
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'update_time'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN update_time TEXT;
  END IF;

  -- Fuente de datos (Satellite, AIS, etc.)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'data_source'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN data_source TEXT;
  END IF;

  -- Número ENI (European Number of Identification)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'eni'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN eni TEXT;
  END IF;

  -- Nombre del buque según la API (puede diferir de vessel_name)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'name'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN name TEXT;
  END IF;

  -- Imagen del buque
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'vessel_image'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN vessel_image TEXT;
  END IF;
END $$;

-- Crear índices para búsquedas comunes
CREATE INDEX IF NOT EXISTS idx_vessel_positions_destination 
  ON vessel_positions (destination) 
  WHERE destination IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vessel_positions_navigational_status 
  ON vessel_positions (navigational_status) 
  WHERE navigational_status IS NOT NULL;

