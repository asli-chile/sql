-- Script para diagnosticar y solucionar el problema del usuario NULL
-- Ejecutar en el SQL Editor de Supabase

-- 1. Verificar si tu usuario existe en auth.users
SELECT 
  id as auth_user_id,
  email,
  raw_user_meta_data->>'full_name' as full_name,
  created_at
FROM auth.users 
WHERE email = 'rodrigo.caceres@asli.cl';

-- 2. Verificar si tu usuario existe en la tabla usuarios
SELECT 
  id,
  auth_user_id,
  nombre,
  email,
  rol,
  created_at
FROM usuarios 
WHERE email = 'rodrigo.caceres@asli.cl';

-- 3. Verificar si hay algún usuario en la tabla usuarios
SELECT COUNT(*) as total_usuarios FROM usuarios;

-- 4. Crear/actualizar tu usuario manualmente
INSERT INTO usuarios (auth_user_id, nombre, email, rol)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'full_name', 'Rodrigo Caceres'),
  email,
  'admin'
FROM auth.users 
WHERE email = 'rodrigo.caceres@asli.cl'
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  nombre = EXCLUDED.nombre,
  rol = 'admin';

-- 5. Verificar que se creó correctamente
SELECT 
  id,
  auth_user_id,
  nombre,
  email,
  rol
FROM usuarios 
WHERE email = 'rodrigo.caceres@asli.cl';

-- 6. Crear función de prueba que funcione sin autenticación
CREATE OR REPLACE FUNCTION obtener_usuario_rodrigo()
RETURNS UUID AS $$
DECLARE
  usuario_id UUID;
BEGIN
  -- Buscar tu usuario específico
  SELECT id INTO usuario_id 
  FROM usuarios 
  WHERE usuarios.email = 'rodrigo.caceres@asli.cl';
  
  RETURN usuario_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Probar la función de prueba
SELECT obtener_usuario_rodrigo() as usuario_rodrigo_id;

-- 8. Crear historial de prueba usando tu usuario
INSERT INTO historial_cambios (
  registro_id, 
  campo_modificado, 
  valor_anterior, 
  valor_nuevo, 
  tipo_cambio, 
  usuario_nombre, 
  usuario_real_id, 
  metadata
)
SELECT 
  r.id,
  'estado',
  'PENDIENTE',
  'CONFIRMADO',
  'UPDATE',
  u.nombre,
  u.id,
  jsonb_build_object('timestamp', NOW(), 'operation', 'test_manual')
FROM registros r
CROSS JOIN usuarios u
WHERE r.ref_asli IS NOT NULL 
  AND u.email = 'rodrigo.caceres@asli.cl'
LIMIT 1;

-- 9. Verificar que se creó el historial
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

-- 10. Mensaje de confirmación
SELECT 'Usuario sincronizado y historial de prueba creado' as resultado;
