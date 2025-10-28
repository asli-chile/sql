-- Script para asegurar que todos los nuevos usuarios se registren con rol 'usuario'
-- Ejecutar en el SQL Editor de Supabase

-- 1. Actualizar función obtener_usuario_actual para garantizar rol 'usuario'
CREATE OR REPLACE FUNCTION obtener_usuario_actual()
RETURNS UUID AS $$
DECLARE
  usuario_id UUID;
  current_auth_id UUID;
BEGIN
  -- Obtener ID del usuario autenticado
  current_auth_id := auth.uid();
  
  -- Si no hay usuario autenticado, devolver null
  IF current_auth_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Buscar usuario existente
  SELECT id INTO usuario_id 
  FROM usuarios 
  WHERE usuarios.auth_user_id = current_auth_id;
  
  -- Si existe, devolverlo
  IF usuario_id IS NOT NULL THEN
    RETURN usuario_id;
  END IF;
  
  -- Si no existe, crear uno nuevo con rol 'usuario' por defecto
  INSERT INTO usuarios (auth_user_id, nombre, email, rol, activo)
  VALUES (
    current_auth_id,
    COALESCE(auth.jwt() ->> 'full_name', 'Usuario'),
    COALESCE(auth.email(), 'usuario_' || current_auth_id::text || '@temporal.com'),
    'usuario', -- ROL POR DEFECTO
    true
  )
  RETURNING id INTO usuario_id;
  
  RETURN usuario_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Crear función para manejar nuevos usuarios automáticamente
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Crear usuario en tabla usuarios con rol 'usuario' por defecto
  INSERT INTO usuarios (auth_user_id, nombre, email, rol, activo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    NEW.email,
    'usuario', -- ROL POR DEFECTO
    true
  )
  ON CONFLICT (email) DO UPDATE SET
    auth_user_id = NEW.id,
    nombre = COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    rol = COALESCE(usuarios.rol, 'usuario'); -- Mantener rol existente o usar 'usuario'
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear trigger para nuevos usuarios
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4. Verificar usuarios existentes sin rol 'usuario' y actualizarlos
UPDATE usuarios 
SET rol = 'usuario' 
WHERE rol IS NULL OR rol = '';

-- 5. Verificar configuración
SELECT 
  'Función obtener_usuario_actual actualizada' as status,
  'Trigger handle_new_user creado' as trigger_status,
  'Usuarios sin rol actualizados' as update_status;

-- 6. Mostrar usuarios actuales
SELECT 
  id,
  nombre,
  email,
  rol,
  activo,
  created_at
FROM usuarios 
ORDER BY created_at DESC
LIMIT 10;
