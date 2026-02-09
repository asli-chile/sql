-- =====================================================
-- AGREGAR CAMPO AREA A ITINERARIO_ESCALAS
-- =====================================================
-- Este script agrega el campo 'area' a la tabla itinerario_escalas
-- para separar los PODs por regiones geográficas
-- =====================================================

-- Agregar columna area si no existe
ALTER TABLE itinerario_escalas
ADD COLUMN IF NOT EXISTS area TEXT DEFAULT 'ASIA';

-- Agregar comentario a la columna
COMMENT ON COLUMN itinerario_escalas.area IS 'Área geográfica: ASIA, EUROPA, AMERICA, INDIA-MEDIOORIENTE';

-- Crear índice para mejorar consultas por área
CREATE INDEX IF NOT EXISTS idx_escalas_area ON itinerario_escalas(area);

-- Actualizar registros existentes con valor por defecto si están vacíos
UPDATE itinerario_escalas
SET area = 'ASIA'
WHERE area IS NULL OR area = '';

-- Verificar que la columna se agregó correctamente
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'itinerario_escalas'
  AND column_name = 'area';
