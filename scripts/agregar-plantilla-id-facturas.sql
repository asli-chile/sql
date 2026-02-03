-- Agregar campo plantilla_id a la tabla facturas
-- Esto permite guardar qué plantilla se usó al crear la factura

-- Agregar columna si no existe
ALTER TABLE facturas 
ADD COLUMN IF NOT EXISTS plantilla_id UUID;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_facturas_plantilla_id ON facturas(plantilla_id);

-- Comentario
COMMENT ON COLUMN facturas.plantilla_id IS 'ID de la plantilla personalizada usada para generar esta factura';
