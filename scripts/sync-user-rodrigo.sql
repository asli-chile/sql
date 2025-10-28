-- Script para sincronizar usuario de Supabase Auth con tabla usuarios
-- Ejecutar en el SQL Editor de Supabase

-- 1. Verificar si tu usuario existe en auth.users
SELECT 
  id as auth_user_id,
  email,
  raw_user_meta_data->>'full_name' as full_name,
  created_at
FROM auth.users 
WHERE email = 'rodrigo.caceres@asli.cl';

-- 2. Crear el usuario en la tabla usuarios si no existe
INSERT INTO usuarios (auth_user_id, nombre, email, rol)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'full_name', 'Rodrigo Caceres'),
  email,
  'admin' -- Te asigno rol de admin
FROM auth.users 
WHERE email = 'rodrigo.caceres@asli.cl'
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  nombre = EXCLUDED.nombre,
  rol = EXCLUDED.rol;

-- 3. Verificar que se creó correctamente
SELECT 
  u.id,
  u.auth_user_id,
  u.nombre,
  u.email,
  u.rol,
  u.created_at
FROM usuarios u
WHERE u.email = 'rodrigo.caceres@asli.cl';

-- 4. Crear función para sincronizar automáticamente usuarios futuros
CREATE OR REPLACE FUNCTION sync_auth_user_to_usuarios()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO usuarios (auth_user_id, nombre, email, rol)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    NEW.email,
    'usuario'
  )
  ON CONFLICT (email) DO UPDATE SET
    auth_user_id = NEW.id,
    nombre = COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Crear trigger para sincronización automática
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_auth_user_to_usuarios();

-- 6. Mensaje de confirmación
SELECT 'Usuario sincronizado exitosamente' as resultado;
