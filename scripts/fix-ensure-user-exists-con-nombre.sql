-- ============================================
-- FIX: Mejorar ensure_user_exists() para obtener nombres correctos
-- ============================================
-- Actualiza la función para obtener el nombre desde auth.users
-- directamente desde raw_user_meta_data en lugar de solo JWT
-- ============================================

CREATE OR REPLACE FUNCTION ensure_user_exists()
RETURNS UUID AS $$
DECLARE
  current_auth_id UUID;
  user_id UUID;
  user_email TEXT;
  user_name TEXT;
BEGIN
  current_auth_id := auth.uid();
  
  IF current_auth_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Buscar usuario existente
  SELECT id INTO user_id
  FROM usuarios
  WHERE auth_user_id = current_auth_id
  LIMIT 1;
  
  -- Si existe, verificar y actualizar nombre si es necesario
  IF user_id IS NOT NULL THEN
    -- Verificar si el nombre necesita actualización
    SELECT nombre INTO user_name
    FROM usuarios
    WHERE id = user_id;
    
    -- Si el nombre es genérico, intentar actualizarlo desde auth.users
    IF user_name = split_part((SELECT email FROM usuarios WHERE id = user_id), '@', 1)
       OR user_name = 'Usuario' 
       OR user_name = 'usuario'
       OR LENGTH(TRIM(user_name)) < 3 THEN
      
      -- Obtener nombre desde auth.users
      SELECT COALESCE(
        (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = current_auth_id),
        (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = current_auth_id),
        user_name
      ) INTO user_name;
      
      -- Actualizar el nombre si es diferente
      IF user_name IS NOT NULL AND user_name != (SELECT nombre FROM usuarios WHERE id = user_id) THEN
        UPDATE usuarios
        SET nombre = user_name
        WHERE id = user_id;
      END IF;
    END IF;
    
    RETURN user_id;
  END IF;
  
  -- Si no existe, crearlo
  user_email := COALESCE(auth.email(), 'usuario_' || current_auth_id::TEXT || '@temporal.com');
  
  -- Obtener nombre desde auth.users.raw_user_meta_data (más confiable que JWT)
  SELECT COALESCE(
    (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = current_auth_id),
    (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = current_auth_id),
    auth.jwt() ->> 'full_name',
    auth.jwt() ->> 'name',
    split_part(user_email, '@', 1),
    'Usuario'
  ) INTO user_name;
  
  -- Si el nombre es muy corto o parece ser un email, usar 'Usuario'
  IF LENGTH(TRIM(user_name)) < 2 OR user_name LIKE '%@%' THEN
    user_name := 'Usuario';
  END IF;
  
  -- Crear o actualizar usuario
  INSERT INTO usuarios (auth_user_id, nombre, email, rol)
  VALUES (current_auth_id, user_name, user_email, 'usuario')
  ON CONFLICT (auth_user_id) DO UPDATE
  SET 
    nombre = COALESCE(
      EXCLUDED.nombre,
      usuarios.nombre,
      (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = current_auth_id),
      (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = current_auth_id)
    ),
    email = COALESCE(EXCLUDED.email, usuarios.email),
    ultimo_acceso = NOW()
  RETURNING id INTO user_id;
  
  RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Probar la función
SELECT 
  'Función actualizada' as resultado,
  ensure_user_exists() as user_id,
  (SELECT nombre FROM usuarios WHERE id = ensure_user_exists()) as nombre_obtenido;

-- Ver usuarios y sus nombres
SELECT 
  'Todos los usuarios' as tipo,
  id,
  nombre,
  email,
  rol,
  auth_user_id,
  (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = usuarios.auth_user_id) as nombre_en_auth
FROM usuarios
ORDER BY created_at DESC;

