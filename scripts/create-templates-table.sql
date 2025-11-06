-- Crear tabla para almacenar información de templates de Excel
CREATE TABLE IF NOT EXISTS report_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_reporte TEXT NOT NULL CHECK (tipo_reporte IN ('factura', 'guia-despacho', 'zarpe', 'arribo', 'reserva-confirmada')),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  archivo_path TEXT NOT NULL, -- Ruta del archivo en Supabase Storage
  activo BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  campos_config JSONB, -- Configuración de campos a rellenar: { "campo1": "A1", "campo2": "B2", ... }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(tipo_reporte, version)
);

-- Crear índice para búsquedas rápidas
CREATE INDEX idx_report_templates_tipo ON report_templates(tipo_reporte);
CREATE INDEX idx_report_templates_activo ON report_templates(activo);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_report_templates_updated_at 
  BEFORE UPDATE ON report_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;

-- Política: Solo usuarios autenticados pueden ver templates
CREATE POLICY "Enable read for authenticated users" ON report_templates
  FOR SELECT USING (auth.role() = 'authenticated');

-- Política: Solo admins pueden insertar/actualizar/eliminar templates
CREATE POLICY "Enable insert for admins" ON report_templates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE usuarios.id = auth.uid()::text 
      AND usuarios.rol = 'admin'
    )
  );

CREATE POLICY "Enable update for admins" ON report_templates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE usuarios.id = auth.uid()::text 
      AND usuarios.rol = 'admin'
    )
  );

CREATE POLICY "Enable delete for admins" ON report_templates
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE usuarios.id = auth.uid()::text 
      AND usuarios.rol = 'admin'
    )
  );

