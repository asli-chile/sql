-- Script para solucionar el error de email null
-- Ejecutar en el SQL Editor de Supabase

-- 1. Actualizar la función obtener_usuario_actual para manejar email null
CREATE OR REPLACE FUNCTION obtener_usuario_actual()
RETURNS UUID AS $$
DECLARE
  usuario_id UUID;
  current_auth_id UUID;
  user_email TEXT;
  user_name TEXT;
BEGIN
  -- Obtener el ID del usuario autenticado
  current_auth_id := auth.uid();
  
  -- Verificar que tenemos un usuario autenticado
  IF current_auth_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Obtener email y nombre de forma segura
  user_email := auth.email();
  user_name := COALESCE(auth.jwt() ->> 'full_name', 'Usuario');
  
  -- Si no hay email, usar el ID como identificador temporal
  IF user_email IS NULL THEN
    user_email := 'usuario_' || current_auth_id::text || '@temporal.com';
  END IF;
  
  -- Buscar el usuario en nuestra tabla usuarios
  SELECT id INTO usuario_id 
  FROM usuarios 
  WHERE usuarios.auth_user_id = current_auth_id 
  LIMIT 1;
  
  -- Si no existe, crear un usuario básico
  IF usuario_id IS NULL THEN
    INSERT INTO usuarios (auth_user_id, nombre, email, rol)
    VALUES (
      current_auth_id,
      user_name,
      user_email,
      'usuario'
    )
    RETURNING id INTO usuario_id;
  END IF;
  
  RETURN usuario_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Verificar que la función funciona
SELECT 'Función obtener_usuario_actual actualizada para manejar email null' as resultado;

-- 3. Probar la función (opcional)
-- SELECT obtener_usuario_actual() as usuario_actual_id;
