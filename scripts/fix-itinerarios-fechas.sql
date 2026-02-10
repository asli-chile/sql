-- Script para corregir fechas de itinerarios
-- Si ejecutaste el script anterior y ahora todas tienen un día de más, ejecuta este para revertir

-- REVERTIR: Restar 1 día a todas las fechas ETD y ETA
-- Ejecuta esto si ya sumaste un día a todo y necesitas volver atrás
UPDATE public.itinerarios
SET etd = etd - INTERVAL '1 day'
WHERE etd IS NOT NULL;

UPDATE public.itinerario_escalas
SET eta = eta - INTERVAL '1 day'
WHERE eta IS NOT NULL;

-- NOTA: Después de ejecutar este script, el código nuevo debería guardar las fechas correctamente
-- usando mediodía (12:00) en lugar de medianoche para evitar problemas de zona horaria

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
