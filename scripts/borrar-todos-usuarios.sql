-- ============================================
-- SCRIPT PARA BORRAR TODOS LOS REGISTROS DE LA TABLA usuarios
-- ============================================
-- ⚠️ ADVERTENCIA: Este script eliminará TODOS los usuarios de la tabla usuarios
-- Las tablas relacionadas (como sesiones_activas) se eliminarán automáticamente
-- gracias a las restricciones ON DELETE CASCADE
-- 
-- Ejecutar en el SQL Editor de Supabase
-- ============================================

-- Verificar cuántos registros se van a eliminar
SELECT 
  'Registros a eliminar' as accion,
  COUNT(*) as cantidad
FROM public.usuarios;

-- Borrar todos los registros de la tabla usuarios
DELETE FROM public.usuarios;

-- Verificar que la tabla esté vacía
SELECT 
  'Registros restantes' as accion,
  COUNT(*) as cantidad
FROM public.usuarios;

-- Mensaje de confirmación
SELECT 'Todos los usuarios han sido eliminados exitosamente' as resultado;
