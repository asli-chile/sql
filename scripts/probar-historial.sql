-- Script para probar el historial directamente
-- Ejecutar en el SQL Editor de Supabase

-- 1. Hacer un cambio de prueba en un registro
UPDATE registros 
SET estado = 'CONFIRMADO' 
WHERE ref_asli IS NOT NULL 
LIMIT 1;

-- 2. Verificar si se creó el historial
SELECT 
  h.id,
  h.registro_id,
  h.campo_modificado,
  h.valor_anterior,
  h.valor_nuevo,
  h.usuario_nombre,
  h.fecha_cambio,
  r.ref_asli
FROM historial_cambios h
LEFT JOIN registros r ON h.registro_id = r.id
ORDER BY h.fecha_cambio DESC
LIMIT 5;

-- 3. Verificar la función obtener_usuario_actual
SELECT obtener_usuario_actual() as usuario_actual_id;

-- 4. Verificar si hay usuarios en la tabla usuarios
SELECT COUNT(*) as total_usuarios FROM usuarios;

-- 5. Verificar si hay registros en historial_cambios
SELECT COUNT(*) as total_historial FROM historial_cambios;
