-- Script para corregir el error de ambigüedad en auth_user_id
-- Ejecutar en el SQL Editor de Supabase

-- Actualizar la función obtener_usuario_actual para resolver la ambigüedad
CREATE OR REPLACE FUNCTION obtener_usuario_actual()
RETURNS UUID AS $$
DECLARE
  usuario_id UUID;
  auth_user_id UUID;
BEGIN
  -- Obtener el ID del usuario autenticado desde Supabase Auth
  auth_user_id := auth.uid();
  
  -- Buscar el usuario en nuestra tabla usuarios por el auth.uid()
  SELECT id INTO usuario_id FROM usuarios WHERE usuarios.auth_user_id = auth_user_id LIMIT 1;
  
  -- Si no existe, crear un usuario básico
  IF usuario_id IS NULL THEN
    INSERT INTO usuarios (auth_user_id, nombre, email, rol)
    VALUES (
      auth_user_id,
      COALESCE(auth.jwt() ->> 'full_name', 'Usuario'),
      auth.email(),
      'usuario'
    )
    RETURNING id INTO usuario_id;
  END IF;
  
  RETURN usuario_id;
END;
$$ LANGUAGE plpgsql;

-- Verificar que la función se actualizó correctamente
SELECT 'Función obtener_usuario_actual actualizada exitosamente' as resultado;
