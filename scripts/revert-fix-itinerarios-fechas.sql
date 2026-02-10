-- Script para REVERTIR la corrección de fechas
-- Si ejecutaste fix-itinerarios-fechas.sql y ahora todas las fechas tienen un día de más,
-- ejecuta este script para restar un día y volver al estado anterior

-- Restar 1 día a todas las fechas ETD en la tabla itinerarios
UPDATE public.itinerarios
SET etd = etd - INTERVAL '1 day'
WHERE etd IS NOT NULL;

-- Restar 1 día a todas las fechas ETA en la tabla itinerario_escalas
UPDATE public.itinerario_escalas
SET eta = eta - INTERVAL '1 day'
WHERE eta IS NOT NULL;

-- Verificar los cambios (opcional, comentar después de verificar)
-- SELECT 
--   id, 
--   nave, 
--   viaje, 
--   etd,
--   (SELECT COUNT(*) FROM public.itinerario_escalas WHERE itinerario_id = i.id) as num_escalas
-- FROM public.itinerarios i
-- ORDER BY etd DESC
-- LIMIT 10;

-- SELECT 
--   ie.id,
--   ie.itinerario_id,
--   ie.puerto,
--   ie.eta
-- FROM public.itinerario_escalas ie
-- ORDER BY ie.eta DESC
-- LIMIT 10;
