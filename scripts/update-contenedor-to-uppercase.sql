-- ============================================
-- CONVERTIR CONTENEDOR A MAYÚSCULAS EN REGISTROS
-- ============================================
-- Este script actualiza todos los valores del campo contenedor
-- en la tabla registros para que estén en mayúsculas
-- Ejecutar en el SQL Editor de Supabase
-- ============================================

-- Actualizar todos los registros existentes
-- Convierte el campo contenedor a mayúsculas
UPDATE public.registros
SET contenedor = UPPER(contenedor)
WHERE contenedor IS NOT NULL 
  AND contenedor != UPPER(contenedor);

-- Verificar que se actualizaron correctamente
-- Esta consulta muestra cuántos registros tienen contenedor en mayúsculas
SELECT 
  COUNT(*) as total_registros,
  COUNT(CASE WHEN contenedor = UPPER(contenedor) OR contenedor IS NULL THEN 1 END) as en_mayusculas,
  COUNT(CASE WHEN contenedor != UPPER(contenedor) THEN 1 END) as pendientes
FROM public.registros
WHERE deleted_at IS NULL;

-- Mensaje de confirmación
SELECT 'Actualización completada. Todos los contenedores ahora están en mayúsculas.' as resultado;
