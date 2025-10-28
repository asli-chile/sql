-- Script para crear catálogo de estados en Supabase
-- Ejecutar en el SQL Editor de Supabase

-- Crear tabla de catálogo de estados
CREATE TABLE IF NOT EXISTS catalogo_estados (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(50) NOT NULL,
  descripcion TEXT,
  color VARCHAR(20) DEFAULT 'gray',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar los estados del catálogo
INSERT INTO catalogo_estados (codigo, nombre, descripcion, color) VALUES
('PENDIENTE', 'Pendiente', 'Estado inicial del registro, esperando confirmación', 'yellow'),
('CONFIRMADO', 'Confirmado', 'Registro confirmado y procesado', 'green'),
('CANCELADO', 'Cancelado', 'Registro cancelado o anulado', 'red')
ON CONFLICT (codigo) DO NOTHING;

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_catalogo_estados_updated_at ON catalogo_estados;
CREATE TRIGGER update_catalogo_estados_updated_at
    BEFORE UPDATE ON catalogo_estados
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Agregar comentarios a la tabla
COMMENT ON TABLE catalogo_estados IS 'Catálogo de estados para registros ASLI';
COMMENT ON COLUMN catalogo_estados.codigo IS 'Código único del estado (PENDIENTE, CONFIRMADO, CANCELADO)';
COMMENT ON COLUMN catalogo_estados.nombre IS 'Nombre descriptivo del estado';
COMMENT ON COLUMN catalogo_estados.descripcion IS 'Descripción detallada del estado';
COMMENT ON COLUMN catalogo_estados.color IS 'Color asociado al estado para la UI';
COMMENT ON COLUMN catalogo_estados.activo IS 'Indica si el estado está activo o no';

-- Verificar que los datos se insertaron correctamente
SELECT * FROM catalogo_estados ORDER BY id;
