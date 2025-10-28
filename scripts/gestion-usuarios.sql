-- Script para gestionar usuarios (activar/desactivar)
-- Ejecutar en el SQL Editor de Supabase

-- 1. Función para desactivar usuario
CREATE OR REPLACE FUNCTION desactivar_usuario(email_usuario TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  usuario_encontrado BOOLEAN := false;
BEGIN
  -- Desactivar usuario
  UPDATE usuarios 
  SET activo = false, updated_at = NOW()
  WHERE email = email_usuario;
  
  -- Verificar si se actualizó
  IF FOUND THEN
    usuario_encontrado := true;
  END IF;
  
  RETURN usuario_encontrado;
END;
$$ LANGUAGE plpgsql;

-- 2. Función para activar usuario
CREATE OR REPLACE FUNCTION activar_usuario(email_usuario TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  usuario_encontrado BOOLEAN := false;
BEGIN
  -- Activar usuario
  UPDATE usuarios 
  SET activo = true, updated_at = NOW()
  WHERE email = email_usuario;
  
  -- Verificar si se actualizó
  IF FOUND THEN
    usuario_encontrado := true;
  END IF;
  
  RETURN usuario_encontrado;
END;
$$ LANGUAGE plpgsql;

-- 3. Función para cambiar nombre de usuario
CREATE OR REPLACE FUNCTION cambiar_nombre_usuario(email_usuario TEXT, nuevo_nombre TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  usuario_encontrado BOOLEAN := false;
BEGIN
  -- Cambiar nombre
  UPDATE usuarios 
  SET nombre = nuevo_nombre, updated_at = NOW()
  WHERE email = email_usuario;
  
  -- Verificar si se actualizó
  IF FOUND THEN
    usuario_encontrado := true;
  END IF;
  
  RETURN usuario_encontrado;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION cambiar_rol_usuario(email_usuario TEXT, nuevo_rol TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  usuario_encontrado BOOLEAN := false;
BEGIN
  -- Validar rol
  IF nuevo_rol NOT IN ('admin', 'supervisor', 'usuario', 'lector') THEN
    RAISE EXCEPTION 'Rol inválido: %', nuevo_rol;
  END IF;
  
  -- Cambiar rol
  UPDATE usuarios 
  SET rol = nuevo_rol, updated_at = NOW()
  WHERE email = email_usuario;
  
  -- Verificar si se actualizó
  IF FOUND THEN
    usuario_encontrado := true;
  END IF;
  
  RETURN usuario_encontrado;
END;
$$ LANGUAGE plpgsql;

-- 4. Función para listar usuarios
CREATE OR REPLACE FUNCTION listar_usuarios()
RETURNS TABLE (
  id UUID,
  nombre TEXT,
  email TEXT,
  rol TEXT,
  activo BOOLEAN,
  ultimo_acceso TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.nombre,
    u.email,
    u.rol,
    u.activo,
    u.ultimo_acceso,
    u.created_at
  FROM usuarios u
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 5. Función para obtener información de usuario
CREATE OR REPLACE FUNCTION obtener_info_usuario(email_usuario TEXT)
RETURNS TABLE (
  id UUID,
  nombre TEXT,
  email TEXT,
  rol TEXT,
  activo BOOLEAN,
  ultimo_acceso TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.nombre,
    u.email,
    u.rol,
    u.activo,
    u.ultimo_acceso,
    u.created_at
  FROM usuarios u
  WHERE u.email = email_usuario;
END;
$$ LANGUAGE plpgsql;

-- 6. Actualizar función obtener_usuario_actual para verificar si está activo
CREATE OR REPLACE FUNCTION obtener_usuario_actual()
RETURNS UUID AS $$
DECLARE
  usuario_id UUID;
  current_auth_id UUID;
  user_email TEXT;
  user_full_name TEXT;
  usuario_activo BOOLEAN;
BEGIN
  -- Obtener ID del usuario autenticado
  current_auth_id := auth.uid();
  
  -- Si no hay usuario autenticado, devolver null
  IF current_auth_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Buscar usuario existente en la tabla 'usuarios'
  SELECT u.id, u.activo INTO usuario_id, usuario_activo
  FROM usuarios u
  WHERE u.auth_user_id = current_auth_id;
  
  -- Si existe y está activo, devolverlo
  IF usuario_id IS NOT NULL AND usuario_activo = true THEN
    -- Actualizar último acceso
    UPDATE usuarios 
    SET ultimo_acceso = NOW() 
    WHERE id = usuario_id;
    
    RETURN usuario_id;
  END IF;
  
  -- Si existe pero está inactivo, devolver null
  IF usuario_id IS NOT NULL AND usuario_activo = false THEN
    RETURN NULL;
  END IF;
  
  -- Si no existe en la tabla 'usuarios', obtener datos de auth.users
  SELECT email, raw_user_meta_data->>'full_name' INTO user_email, user_full_name
  FROM auth.users
  WHERE id = current_auth_id;

  -- Si no se encuentra el email, usar un valor temporal
  IF user_email IS NULL THEN
    user_email := 'usuario_' || current_auth_id::text || '@temporal.com';
  END IF;

  -- Si no se encuentra el nombre, usar 'Usuario'
  IF user_full_name IS NULL THEN
    user_full_name := 'Usuario';
  END IF;

  -- Crear uno nuevo en la tabla 'usuarios' con rol 'usuario' por defecto
  INSERT INTO usuarios (auth_user_id, nombre, email, rol, activo)
  VALUES (
    current_auth_id,
    user_full_name,
    user_email,
    'usuario', -- Rol por defecto
    true -- Activo por defecto
  )
  ON CONFLICT (email) DO UPDATE SET
    auth_user_id = EXCLUDED.auth_user_id,
    nombre = EXCLUDED.nombre,
    rol = EXCLUDED.rol,
    activo = true -- Asegurar que esté activo
  RETURNING id INTO usuario_id;
  
  RETURN usuario_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Ejemplos de uso
-- Desactivar usuario
-- SELECT desactivar_usuario('usuario@ejemplo.com');

-- Activar usuario
-- SELECT activar_usuario('usuario@ejemplo.com');

-- Cambiar nombre
-- SELECT cambiar_nombre_usuario('usuario@ejemplo.com', 'Nuevo Nombre');

-- Listar usuarios
-- SELECT * FROM listar_usuarios();

-- Obtener información de usuario
-- SELECT * FROM obtener_info_usuario('usuario@ejemplo.com');

-- 8. Verificar usuarios actuales
SELECT 
  id,
  nombre,
  email,
  rol,
  activo,
  ultimo_acceso,
  created_at
FROM usuarios 
ORDER BY created_at DESC;

-- Mensaje de confirmación
SELECT 'Sistema de gestión de usuarios creado exitosamente' as resultado;
