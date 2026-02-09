-- =====================================================
-- DATOS DE EJEMPLO PARA SERVICIOS
-- =====================================================
-- Este script inserta datos de ejemplo para probar
-- el sistema de servicios y naves
-- =====================================================

-- Insertar servicios de ejemplo
INSERT INTO public.servicios (nombre, consorcio, activo, descripcion)
VALUES 
  ('AX2/AN2', 'MSC + Hapag + ONE', true, 'Servicio Asia-Europa'),
  ('ANDES EXPRESS', 'MSC', true, 'Servicio a Sudamérica'),
  ('PACIFIC EXPRESS', 'Hapag Lloyd', true, 'Servicio Transpacífico')
ON CONFLICT (nombre) DO NOTHING;

-- Insertar naves para el servicio AX2/AN2
INSERT INTO public.servicios_naves (servicio_id, nave_nombre, activo, orden)
SELECT 
  s.id,
  nave,
  true,
  ROW_NUMBER() OVER (ORDER BY nave) as orden
FROM public.servicios s
CROSS JOIN (VALUES 
  ('MSC OSCAR'),
  ('MSC LORETO'),
  ('MSC MARIA ELENA'),
  ('HAPAG LLOYD BERLIN'),
  ('ONE INNOVATION')
) AS naves(nave)
WHERE s.nombre = 'AX2/AN2'
ON CONFLICT (servicio_id, nave_nombre) DO NOTHING;

-- Insertar naves para el servicio ANDES EXPRESS
INSERT INTO public.servicios_naves (servicio_id, nave_nombre, activo, orden)
SELECT 
  s.id,
  nave,
  true,
  ROW_NUMBER() OVER (ORDER BY nave) as orden
FROM public.servicios s
CROSS JOIN (VALUES 
  ('MSC GENEVA'),
  ('MSC LORETO'),
  ('MSC MARIA ELENA')
) AS naves(nave)
WHERE s.nombre = 'ANDES EXPRESS'
ON CONFLICT (servicio_id, nave_nombre) DO NOTHING;

-- Insertar naves para el servicio PACIFIC EXPRESS
INSERT INTO public.servicios_naves (servicio_id, nave_nombre, activo, orden)
SELECT 
  s.id,
  nave,
  true,
  ROW_NUMBER() OVER (ORDER BY nave) as orden
FROM public.servicios s
CROSS JOIN (VALUES 
  ('HAPAG LLOYD BERLIN'),
  ('ONE INNOVATION'),
  ('HAPAG LLOYD MUNICH')
) AS naves(nave)
WHERE s.nombre = 'PACIFIC EXPRESS'
ON CONFLICT (servicio_id, nave_nombre) DO NOTHING;

-- Verificar los datos insertados
SELECT 
  s.nombre as servicio,
  s.consorcio,
  COUNT(sn.nave_nombre) as total_naves,
  STRING_AGG(sn.nave_nombre, ', ' ORDER BY sn.orden) as naves
FROM public.servicios s
LEFT JOIN public.servicios_naves sn ON s.id = sn.servicio_id AND sn.activo = true
WHERE s.activo = true
GROUP BY s.id, s.nombre, s.consorcio
ORDER BY s.nombre;
