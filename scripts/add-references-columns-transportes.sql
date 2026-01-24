-- =====================================================
-- AGREGAR COLUMNAS DE REFERENCIAS A TABLA TRANSPORTES
-- =====================================================
-- Este script agrega los campos ref_cliente y ref_asli
-- para almacenar las referencias desde la tabla registros

-- Agregar columna ref_cliente
ALTER TABLE transportes 
ADD COLUMN IF NOT EXISTS ref_cliente TEXT;

-- Agregar columna ref_asli  
ALTER TABLE transportes 
ADD COLUMN IF NOT EXISTS ref_asli TEXT;

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_transportes_ref_cliente ON transportes(ref_cliente);
CREATE INDEX IF NOT EXISTS idx_transportes_ref_asli ON transportes(ref_asli);

-- Comentarios para documentación
COMMENT ON COLUMN transportes.ref_cliente IS 'Referencia del cliente desde registros';
COMMENT ON COLUMN transportes.ref_asli IS 'Referencia ASLI desde registros';
