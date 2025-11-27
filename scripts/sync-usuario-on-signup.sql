-- ============================================
-- Sincronizar creación de usuario en tabla usuarios
-- ============================================
-- Este script crea/actualiza un trigger que sincroniza automáticamente
-- la creación del usuario en la tabla usuarios cuando se crea en auth.users
-- ============================================

-- Función para crear usuario en tabla usuarios cuando se crea en auth.users
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
BEGIN
  -- Obtener nombre del usuario desde metadata
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'Usuario'
  );
  
  -- Si el nombre es muy corto, usar "Usuario"
  IF LENGTH(user_name) < 2 THEN
    user_name := 'Usuario';
  END IF;
  
  -- Crear usuario en tabla usuarios
  INSERT INTO public.usuarios (auth_user_id, nombre, email, rol, activo)
  VALUES (
    NEW.id,
    user_name,
    NEW.email,
    'usuario', -- Rol por defecto
    true -- Activo por defecto
  )
  ON CONFLICT (auth_user_id) DO UPDATE SET
    nombre = COALESCE(EXCLUDED.nombre, usuarios.nombre),
    email = COALESCE(EXCLUDED.email, usuarios.email),
    activo = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar trigger anterior si existe
DROP TRIGGER IF EXISTS on_auth_user_created_usuarios ON auth.users;

-- Crear trigger para sincronizar con tabla usuarios
CREATE TRIGGER on_auth_user_created_usuarios
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_auth_user();

-- Mensaje de confirmación
SELECT 
  '✅ Trigger para sincronizar usuarios creado exitosamente' as resultado,
  'Los nuevos usuarios se crearán automáticamente en la tabla usuarios' as descripcion;

