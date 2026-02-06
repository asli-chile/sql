-- =====================================================
-- BORRAR TODOS LOS DATOS DE vessel_positions
-- =====================================================
-- Este script elimina TODOS los registros de vessel_positions
-- pero mantiene la estructura de la tabla (columnas, índices, etc.)
-- =====================================================
-- ⚠️ ADVERTENCIA: Esta operación NO se puede deshacer
-- ⚠️ Asegúrate de hacer un backup antes de ejecutar
-- =====================================================

-- Ver cuántos registros se van a eliminar (solo para información)
SELECT 
  COUNT(*) AS total_registros_a_eliminar,
  COUNT(DISTINCT vessel_name) AS naves_unicas
FROM vessel_positions;

-- BORRAR TODOS LOS DATOS
-- Descomenta la siguiente línea cuando estés listo:
-- TRUNCATE TABLE vessel_positions RESTART IDENTITY CASCADE;

-- O si prefieres usar DELETE (más lento pero más control):
-- DELETE FROM vessel_positions;

-- Verificar que la tabla esté vacía
-- Ejecuta esto después del TRUNCATE/DELETE:
/*
SELECT 
  COUNT(*) AS registros_restantes
FROM vessel_positions;
-- Debe mostrar 0
*/

-- =====================================================
-- NOTAS:
-- =====================================================
-- - TRUNCATE es más rápido que DELETE y resetea los contadores
-- - RESTART IDENTITY resetea los secuenciales (si los hay)
-- - CASCADE también borra datos relacionados en otras tablas si hay foreign keys
-- - Si solo quieres borrar datos pero mantener la estructura, usa TRUNCATE
-- =====================================================
