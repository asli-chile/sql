-- Crear tabla de facturas
CREATE TABLE IF NOT EXISTS facturas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registro_id UUID REFERENCES registros(id) ON DELETE CASCADE,
  ref_asli TEXT NOT NULL,
  
  -- Información del exportador (JSONB)
  exportador JSONB NOT NULL DEFAULT '{}',
  
  -- Información del consignatario (JSONB)
  consignatario JSONB NOT NULL DEFAULT '{}',
  
  -- Detalles de embarque (JSONB)
  embarque JSONB NOT NULL DEFAULT '{}',
  
  -- Productos (JSONB array)
  productos JSONB NOT NULL DEFAULT '[]',
  
  -- Totales (JSONB)
  totales JSONB NOT NULL DEFAULT '{}',
  
  -- Cliente/Plantilla
  cliente_plantilla TEXT NOT NULL DEFAULT 'ALMAFRUIT',
  
  -- Metadatos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_facturas_registro_id ON facturas(registro_id);
CREATE INDEX IF NOT EXISTS idx_facturas_ref_asli ON facturas(ref_asli);
CREATE INDEX IF NOT EXISTS idx_facturas_cliente_plantilla ON facturas(cliente_plantilla);
CREATE INDEX IF NOT EXISTS idx_facturas_created_at ON facturas(created_at DESC);

-- Comentarios
COMMENT ON TABLE facturas IS 'Tabla para almacenar facturas generadas desde registros';
COMMENT ON COLUMN facturas.exportador IS 'Información del exportador (nombre, RUT, giro, dirección)';
COMMENT ON COLUMN facturas.consignatario IS 'Información del consignatario (nombre, dirección, contacto, etc.)';
COMMENT ON COLUMN facturas.embarque IS 'Detalles del embarque (fechas, naves, puertos, etc.)';
COMMENT ON COLUMN facturas.productos IS 'Array de productos de la factura';
COMMENT ON COLUMN facturas.totales IS 'Totales calculados (cantidad, valor, texto)';
COMMENT ON COLUMN facturas.cliente_plantilla IS 'Plantilla utilizada (ALMAFRUIT, etc.)';

-- Habilitar RLS
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;

-- Política SELECT: Los usuarios pueden ver facturas de registros que pueden ver
CREATE POLICY "Los usuarios pueden ver facturas de registros que pueden ver"
  ON facturas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM registros r
      WHERE r.id = facturas.registro_id
      AND r.deleted_at IS NULL
    )
  );

-- Política INSERT: Los usuarios pueden crear facturas para registros que pueden ver
CREATE POLICY "Los usuarios pueden crear facturas para registros que pueden ver"
  ON facturas
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM registros r
      WHERE r.id = facturas.registro_id
      AND r.deleted_at IS NULL
    )
  );

-- Política UPDATE: Los usuarios pueden actualizar facturas que crearon
CREATE POLICY "Los usuarios pueden actualizar facturas que crearon"
  ON facturas
  FOR UPDATE
  USING (
    created_by = (SELECT email FROM auth.users WHERE id = auth.uid())::TEXT
    OR EXISTS (
      SELECT 1 FROM registros r
      WHERE r.id = facturas.registro_id
      AND r.deleted_at IS NULL
    )
  )
  WITH CHECK (
    created_by = (SELECT email FROM auth.users WHERE id = auth.uid())::TEXT
    OR EXISTS (
      SELECT 1 FROM registros r
      WHERE r.id = facturas.registro_id
      AND r.deleted_at IS NULL
    )
  );

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_facturas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_facturas_updated_at
  BEFORE UPDATE ON facturas
  FOR EACH ROW
  EXECUTE FUNCTION update_facturas_updated_at();

