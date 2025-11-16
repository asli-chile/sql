-- Crear tabla para cachear posiciones de buques obtenidas desde API AIS externa
-- Esta tabla permite limitar las consultas pagadas a la API a un máximo de 1 vez cada 3 días por buque.

CREATE TABLE IF NOT EXISTS vessel_positions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vessel_name TEXT NOT NULL,
  imo TEXT,
  mmsi TEXT,
  last_lat DOUBLE PRECISION,
  last_lon DOUBLE PRECISION,
  last_position_at TIMESTAMPTZ,
  last_api_call_at TIMESTAMPTZ,
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Un buque se identifica de forma lógica por su nombre dentro del sistema ASLI.
-- Si en tu implementación real necesitas distinguir por IMO/MMSI, puedes ajustar este índice único.
CREATE UNIQUE INDEX IF NOT EXISTS idx_vessel_positions_vessel_name
  ON vessel_positions (vessel_name);

-- Índices de apoyo para consultas por fecha de última llamada y última posición
CREATE INDEX IF NOT EXISTS idx_vessel_positions_last_api_call
  ON vessel_positions (last_api_call_at);

CREATE INDEX IF NOT EXISTS idx_vessel_positions_last_position_at
  ON vessel_positions (last_position_at);

-- Reutilizar función estándar para mantener updated_at al día (ya existe en el esquema principal).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_vessel_positions_updated_at'
  ) THEN
    CREATE TRIGGER update_vessel_positions_updated_at
      BEFORE UPDATE ON vessel_positions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Habilitar RLS para mantener consistencia con el resto del proyecto.
ALTER TABLE vessel_positions ENABLE ROW LEVEL SECURITY;

-- Política básica: solo usuarios autenticados pueden leer y escribir posiciones.
-- Si en tu instalación actual tienes políticas más estrictas, ajusta estas reglas.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE tablename = 'vessel_positions'
      AND policyname = 'Enable all operations for authenticated users on vessel_positions'
  ) THEN
    CREATE POLICY "Enable all operations for authenticated users on vessel_positions"
      ON vessel_positions
      FOR ALL
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

--------------------------------------------------------------------------------
-- HISTORIAL DE POSICIONES (RUTA DEL BUQUE)
--------------------------------------------------------------------------------

-- Tabla liviana para guardar cada posición histórica recibida desde la API AIS.
-- Esto permite dibujar la ruta recorrida sin afectar la lógica de cache principal.
CREATE TABLE IF NOT EXISTS vessel_position_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vessel_name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  position_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL DEFAULT 'AIS',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vessel_position_history_vessel_name
  ON vessel_position_history (vessel_name);

CREATE INDEX IF NOT EXISTS idx_vessel_position_history_position_at
  ON vessel_position_history (position_at);

ALTER TABLE vessel_position_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE tablename = 'vessel_position_history'
      AND policyname = 'Enable all operations for authenticated users on vessel_position_history'
  ) THEN
    CREATE POLICY "Enable all operations for authenticated users on vessel_position_history"
      ON vessel_position_history
      FOR ALL
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

