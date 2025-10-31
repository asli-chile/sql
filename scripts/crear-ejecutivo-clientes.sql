-- Script para crear tabla de relación ejecutivo-clientes
-- Ejecutar en el SQL Editor de Supabase

-- Crear tabla ejecutivo_clientes (relación muchos a muchos)
CREATE TABLE IF NOT EXISTS ejecutivo_clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ejecutivo_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  cliente_nombre TEXT NOT NULL, -- Nombre del cliente (debe coincidir con el campo shipper en registros)
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Evitar duplicados: un ejecutivo no puede tener el mismo cliente dos veces
  UNIQUE(ejecutivo_id, cliente_nombre)
);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_ejecutivo_clientes_ejecutivo ON ejecutivo_clientes(ejecutivo_id);
CREATE INDEX IF NOT EXISTS idx_ejecutivo_clientes_cliente ON ejecutivo_clientes(cliente_nombre);
CREATE INDEX IF NOT EXISTS idx_ejecutivo_clientes_activo ON ejecutivo_clientes(activo);

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_ejecutivo_clientes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para updated_at
DROP TRIGGER IF EXISTS trigger_update_ejecutivo_clientes_updated_at ON ejecutivo_clientes;
CREATE TRIGGER trigger_update_ejecutivo_clientes_updated_at
  BEFORE UPDATE ON ejecutivo_clientes
  FOR EACH ROW
  EXECUTE FUNCTION update_ejecutivo_clientes_updated_at();

-- Agregar comentarios
COMMENT ON TABLE ejecutivo_clientes IS 'Relación muchos a muchos entre ejecutivos (usuarios @asli.cl) y sus clientes asignados';
COMMENT ON COLUMN ejecutivo_clientes.ejecutivo_id IS 'ID del usuario ejecutivo (debe ser @asli.cl)';
COMMENT ON COLUMN ejecutivo_clientes.cliente_nombre IS 'Nombre del cliente (debe coincidir con shipper en registros)';

-- Verificar que la tabla se creó correctamente
SELECT 'Tabla ejecutivo_clientes creada exitosamente' as resultado;

-- Ejemplo de uso: Asignar clientes a un ejecutivo
-- INSERT INTO ejecutivo_clientes (ejecutivo_id, cliente_nombre) 
-- SELECT u.id, 'NOMBRE_CLIENTE'
-- FROM usuarios u 
-- WHERE u.email = 'ejecutivo@asli.cl';

