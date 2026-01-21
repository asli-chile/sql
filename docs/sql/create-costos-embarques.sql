-- Tabla para almacenar información financiera de embarques
CREATE TABLE IF NOT EXISTS costos_embarques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id UUID REFERENCES registros(id) ON DELETE CASCADE,
  booking TEXT NOT NULL,
  
  -- Costos principales
  flete NUMERIC(15, 2),
  deposito NUMERIC(15, 2),
  tarifas_extra NUMERIC(15, 2),
  
  -- Desglose de tarifas extra (opcional)
  demoras NUMERIC(15, 2),
  almacenaje NUMERIC(15, 2),
  otros NUMERIC(15, 2),
  
  -- Ingresos
  ingresos NUMERIC(15, 2),
  
  -- Metadatos
  moneda TEXT DEFAULT 'USD',
  fecha_actualizacion TIMESTAMP WITH TIME ZONE,
  notas TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_costos_embarques_registro_id ON costos_embarques(registro_id);
CREATE INDEX IF NOT EXISTS idx_costos_embarques_booking ON costos_embarques(booking);
CREATE INDEX IF NOT EXISTS idx_costos_embarques_created_at ON costos_embarques(created_at);

-- Política RLS (Row Level Security)
ALTER TABLE costos_embarques ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios autenticados pueden leer todos los costos
CREATE POLICY "Users can read costos_embarques"
  ON costos_embarques
  FOR SELECT
  TO authenticated
  USING (true);

-- Política: Los usuarios autenticados pueden insertar costos
CREATE POLICY "Users can insert costos_embarques"
  ON costos_embarques
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: Los usuarios autenticados pueden actualizar costos
CREATE POLICY "Users can update costos_embarques"
  ON costos_embarques
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política: Los usuarios autenticados pueden eliminar costos
CREATE POLICY "Users can delete costos_embarques"
  ON costos_embarques
  FOR DELETE
  TO authenticated
  USING (true);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_costos_embarques_updated_at
  BEFORE UPDATE ON costos_embarques
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE costos_embarques IS 'Información financiera (costos e ingresos) por embarque';
COMMENT ON COLUMN costos_embarques.flete IS 'Costo del flete en la moneda especificada';
COMMENT ON COLUMN costos_embarques.deposito IS 'Costo del depósito en la moneda especificada';
COMMENT ON COLUMN costos_embarques.tarifas_extra IS 'Tarifas adicionales (demoras, almacenaje, etc.)';
COMMENT ON COLUMN costos_embarques.ingresos IS 'Ingresos totales del embarque en la moneda especificada';
COMMENT ON COLUMN costos_embarques.moneda IS 'Moneda utilizada (USD, CLP, etc.)';
