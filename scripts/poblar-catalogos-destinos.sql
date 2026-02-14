-- =====================================================
-- POBLAR CATÁLOGO DE DESTINOS (PODs)
-- =====================================================
-- Este script inserta destinos comunes en catalogos_destinos
-- POD = Port of Discharge (Puerto de Descarga/Destino)
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de crear la tabla
-- =====================================================

-- Verificar si ya hay destinos
SELECT COUNT(*) as total_destinos FROM catalogos_destinos;

-- Insertar destinos internacionales comunes
INSERT INTO catalogos_destinos (nombre, activo) VALUES
  -- Estados Unidos
  ('Los Angeles, CA', true),
  ('Long Beach, CA', true),
  ('Oakland, CA', true),
  ('Seattle, WA', true),
  ('Miami, FL', true),
  ('New York, NY', true),
  ('Houston, TX', true),
  ('Savannah, GA', true),
  
  -- Europa
  ('Rotterdam, Netherlands', true),
  ('Hamburg, Germany', true),
  ('Antwerp, Belgium', true),
  ('Le Havre, France', true),
  ('Southampton, UK', true),
  ('Felixstowe, UK', true),
  
  -- Asia
  ('Shanghai, China', true),
  ('Hong Kong', true),
  ('Singapore', true),
  ('Tokyo, Japan', true),
  ('Busan, South Korea', true),
  ('Dubai, UAE', true),
  
  -- América Latina
  ('Buenos Aires, Argentina', true),
  ('Santos, Brazil', true),
  ('Callao, Peru', true),
  ('Guayaquil, Ecuador', true),
  ('Cartagena, Colombia', true),
  ('Panama City, Panama', true),
  ('Veracruz, Mexico', true)
ON CONFLICT (nombre) DO NOTHING;

-- Verificar destinos insertados
SELECT nombre, activo, created_at 
FROM catalogos_destinos 
ORDER BY nombre;

-- =====================================================
-- NOTAS:
-- =====================================================
-- - POD (Port of Discharge): Puerto de destino
-- - POL (Port of Loading): Puerto de origen (se maneja en catalogos categoria='pols')
-- 
-- Para agregar un destino nuevo:
-- INSERT INTO catalogos_destinos (nombre, activo) 
-- VALUES ('NUEVO_DESTINO', true)
-- ON CONFLICT (nombre) DO NOTHING;
--
-- Para desactivar un destino (sin eliminarlo):
-- UPDATE catalogos_destinos 
-- SET activo = false 
-- WHERE nombre = 'DESTINO_A_DESACTIVAR';
--
-- Para reactivar un destino:
-- UPDATE catalogos_destinos 
-- SET activo = true 
-- WHERE nombre = 'DESTINO_A_REACTIVAR';
