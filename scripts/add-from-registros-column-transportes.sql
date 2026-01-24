-- =====================================================
-- AGREGAR CAMPO from_registros A TABLA transportes
-- =====================================================
-- Este campo identifica si un transporte fue creado desde registros
-- para bloquear la edición de campos con datos

-- Agregar columna from_registros
ALTER TABLE transportes 
ADD COLUMN IF NOT EXISTS from_registros BOOLEAN DEFAULT FALSE;

-- Crear índice para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_transportes_from_registros ON transportes(from_registros);

-- Comentario para documentación
COMMENT ON COLUMN transportes.from_registros IS 'Indica si el transporte fue creado desde registros (TRUE) o manualmente (FALSE)';

-- Actualizar registros existentes a FALSE (por seguridad)
UPDATE transportes 
SET from_registros = FALSE 
WHERE from_registros IS NULL;
