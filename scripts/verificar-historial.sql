-- Script para verificar el historial en la base de datos
-- Ejecutar en el SQL Editor de Supabase

-- 1. Verificar si hay registros en historial_cambios
SELECT COUNT(*) as total_cambios FROM historial_cambios;

-- 2. Ver los últimos cambios
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
LIMIT 10;

-- 3. Verificar si tu usuario existe
SELECT 
  u.id,
  u.nombre,
  u.email,
  u.rol,
  u.auth_user_id
FROM usuarios u
WHERE u.email = 'rodrigo.caceres@asli.cl';

-- 4. Verificar si la función obtener_usuario_actual funciona
SELECT obtener_usuario_actual() as usuario_actual_id;
