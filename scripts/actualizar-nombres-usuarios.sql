-- ============================================
-- ACTUALIZAR NOMBRES DE USUARIOS DESDE AUTH
-- ============================================
-- Este script actualiza los nombres de usuarios en la tabla usuarios
-- usando el nombre real que se guardó en Supabase Auth (raw_user_meta_data)
-- ============================================

-- Actualizar nombres de usuarios que tengan nombres genéricos
UPDATE usuarios u
SET nombre = COALESCE(
  -- Intentar obtener el nombre de auth.users.raw_user_meta_data
  (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = u.auth_user_id),
  (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = u.auth_user_id),
  -- Si no hay nombre en metadata, mantener el actual
  u.nombre
)
WHERE u.auth_user_id IS NOT NULL
  AND (
    -- Solo actualizar usuarios que tengan nombres genéricos o del email
    u.nombre = split_part(u.email, '@', 1)
    OR u.nombre LIKE '%@%'
    OR LENGTH(TRIM(u.nombre)) < 3
    OR u.nombre = 'Usuario'
    OR u.nombre = 'usuario'
  );

-- Ver los resultados
SELECT 
  'Usuarios actualizados' as tipo,
  u.id,
  u.auth_user_id,
  u.nombre as nombre_anterior,
  COALESCE(
    (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = u.auth_user_id),
    (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = u.auth_user_id),
    u.nombre
  ) as nombre_nuevo,
  u.email,
  u.rol
FROM usuarios u
WHERE u.auth_user_id IS NOT NULL
ORDER BY u.created_at DESC;

-- Ver todos los usuarios y sus nombres en auth.users
SELECT 
  'Nombres en Auth' as tipo,
  au.id as auth_user_id,
  au.email,
  au.raw_user_meta_data->>'full_name' as full_name_auth,
  au.raw_user_meta_data->>'name' as name_auth,
  u.id as usuario_id,
  u.nombre as nombre_en_usuarios
FROM auth.users au
LEFT JOIN usuarios u ON u.auth_user_id = au.id
ORDER BY au.created_at DESC;

-- Verificar usuarios que necesitan actualización
SELECT 
  'Usuarios que necesitan actualización' as tipo,
  u.id,
  u.nombre as nombre_actual,
  u.email,
  (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = u.auth_user_id) as nombre_en_auth,
  CASE 
    WHEN (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = u.auth_user_id) IS NOT NULL 
         AND (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = u.auth_user_id) != u.nombre
    THEN '✅ Necesita actualización'
    ELSE '✅ Nombre correcto o no hay nombre en auth'
  END as estado
FROM usuarios u
WHERE u.auth_user_id IS NOT NULL
ORDER BY u.created_at DESC;

