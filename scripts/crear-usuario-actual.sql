-- ============================================
-- CREAR USUARIO ACTUAL EN TABLA usuarios
-- ============================================
-- Este script crea el usuario actual en la tabla usuarios
-- si no existe, usando la información de Supabase Auth
-- ============================================

-- Crear o actualizar el usuario actual
INSERT INTO usuarios (auth_user_id, nombre, email, rol)
SELECT 
  auth.uid() as auth_user_id,
  COALESCE(
    auth.jwt() ->> 'full_name',
    auth.jwt() ->> 'name',
    split_part(auth.email(), '@', 1),
    'Usuario'
  ) as nombre,
  COALESCE(
    auth.email(),
    'usuario_' || auth.uid()::TEXT || '@temporal.com'
  ) as email,
  CASE
    WHEN auth.email() LIKE '%@asli.cl' THEN 'usuario'
    ELSE 'usuario'
  END as rol
WHERE auth.uid() IS NOT NULL
ON CONFLICT (auth_user_id) DO UPDATE
SET 
  nombre = COALESCE(EXCLUDED.nombre, usuarios.nombre),
  email = COALESCE(EXCLUDED.email, usuarios.email),
  ultimo_acceso = NOW();

-- Verificar que el usuario se creó correctamente
SELECT 
  'Usuario Creado/Actualizado' as resultado,
  id,
  nombre,
  email,
  rol,
  auth_user_id,
  activo
FROM usuarios
WHERE auth_user_id = auth.uid();

-- Mensaje de confirmación
SELECT '✅ Usuario creado/actualizado exitosamente. Ahora puedes crear registros.' as mensaje;

