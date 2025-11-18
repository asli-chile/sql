-- =====================================================
-- AGREGAR CAMPO DE IMAGEN DEL BUQUE
-- =====================================================
-- Este script agrega un campo para guardar la URL de la imagen
-- del buque que devuelve la API de DataDocked
-- =====================================================

-- Agregar columna para la imagen del buque
ALTER TABLE vessel_positions 
ADD COLUMN IF NOT EXISTS vessel_image TEXT;

-- Comentario para documentación
COMMENT ON COLUMN vessel_positions.vessel_image IS 'URL de la imagen del buque obtenida de la API AIS (DataDocked)';

