-- ============================================
-- FIX COMPLETO: Usuarios y Políticas INSERT
-- ============================================
-- Soluciona:
-- 1. Los usuarios no pueden crear registros
-- 2. Los nombres de usuarios no se guardan correctamente en la BD
-- ============================================

-- PASO 1: Mejorar función ensure_user_exists() para obtener el nombre correctamente
-- ============================================

CREATE OR REPLACE FUNCTION ensure_user_exists()
RETURNS UUID AS $$
DECLARE
  current_auth_id UUID;
  user_id UUID;
  user_email TEXT;
  user_name TEXT;
  user_metadata JSONB;
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
  
  -- Si existe, devolverlo
  IF user_id IS NOT NULL THEN
    RETURN user_id;
  END IF;
  
  -- Obtener email
  user_email := COALESCE(auth.email(), 'usuario_' || current_auth_id::TEXT || '@temporal.com');
  
  -- Obtener metadata del usuario de Supabase Auth
  user_metadata := auth.jwt();
  
  -- Obtener nombre de múltiples fuentes posibles
  user_name := COALESCE(
    -- Intentar obtener de user_metadata en JWT
    user_metadata->>'full_name',
    user_metadata->>'name',
    -- Intentar obtener de raw_user_meta_data (directo de auth.users)
    (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = current_auth_id),
    (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = current_auth_id),
    -- Como último recurso, usar el email sin dominio
    split_part(user_email, '@', 1),
    'Usuario'
  );
  
  -- Si el nombre es solo el email sin dominio y es muy corto, usar "Usuario"
  IF LENGTH(user_name) < 2 THEN
    user_name := 'Usuario';
  END IF;
  
  -- Crear o actualizar usuario
  INSERT INTO usuarios (auth_user_id, nombre, email, rol)
  VALUES (current_auth_id, user_name, user_email, 'usuario')
  ON CONFLICT (auth_user_id) DO UPDATE
  SET 
    nombre = COALESCE(EXCLUDED.nombre, usuarios.nombre),
    email = COALESCE(EXCLUDED.email, usuarios.email),
    ultimo_acceso = NOW()
  RETURNING id INTO user_id;
  
  RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 2: Actualizar función get_current_user_id()
-- ============================================

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN ensure_user_exists();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 3: Actualizar funciones auxiliares
-- ============================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_id UUID;
BEGIN
  user_id := ensure_user_exists();
  
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN COALESCE((
    SELECT rol = 'admin'
    FROM usuarios
    WHERE id = user_id
    LIMIT 1
  ), false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_ejecutivo()
RETURNS BOOLEAN AS $$
DECLARE
  user_id UUID;
BEGIN
  user_id := ensure_user_exists();
  
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN COALESCE((
    SELECT email LIKE '%@asli.cl'
    FROM usuarios
    WHERE id = user_id
    LIMIT 1
  ), false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 4: Eliminar TODAS las políticas INSERT existentes
-- ============================================

DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'registros'
      AND cmd = 'INSERT'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON registros';
  END LOOP;
END $$;

-- PASO 5: Crear políticas INSERT simples y directas
-- ============================================

-- Política 1: Admins pueden crear cualquier registro
CREATE POLICY "Admins pueden crear cualquier registro"
  ON registros FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE auth_user_id = auth.uid() 
        AND rol = 'admin'
    )
  );

-- Política 2: Ejecutivos pueden crear registros
-- La validación del shipper se hace en el frontend
CREATE POLICY "Ejecutivos pueden crear registros"
  ON registros FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.auth_user_id = auth.uid()
        AND u.email LIKE '%@asli.cl'
    )
  );

-- Política 3: Usuarios normales pueden crear registros
-- Esta es la más importante: permite a CUALQUIER usuario autenticado crear registros
-- si NO es admin ni ejecutivo
CREATE POLICY "Usuarios normales pueden crear registros"
  ON registros FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM usuarios 
      WHERE auth_user_id = auth.uid() 
        AND rol = 'admin'
    )
    AND NOT EXISTS (
      SELECT 1 FROM usuarios 
      WHERE auth_user_id = auth.uid() 
        AND email LIKE '%@asli.cl'
    )
  );

-- PASO 6: Actualizar trigger para usar ensure_user_exists() y obtener nombre correcto
-- ============================================

CREATE OR REPLACE FUNCTION set_user_fields()
RETURNS TRIGGER AS $$
DECLARE
  user_nombre TEXT;
  user_id UUID;
  user_metadata JSONB;
BEGIN
  -- Asegurar que el usuario existe (se creará automáticamente si no existe)
  user_id := ensure_user_exists();
  
  IF user_id IS NULL THEN
    NEW.created_by := 'Usuario';
    NEW.updated_by := 'Usuario';
    RETURN NEW;
  END IF;
  
  -- Obtener el nombre del usuario de la tabla usuarios (que ya tiene el nombre correcto)
  SELECT nombre INTO user_nombre
  FROM usuarios
  WHERE id = user_id
  LIMIT 1;
  
  -- Si aún no tiene nombre, intentar obtenerlo de auth
  IF user_nombre IS NULL OR user_nombre = 'Usuario' THEN
    user_metadata := auth.jwt();
    user_nombre := COALESCE(
      user_metadata->>'full_name',
      user_metadata->>'name',
      (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = auth.uid()),
      (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = auth.uid()),
      split_part(COALESCE(auth.email(), ''), '@', 1),
      'Usuario'
    );
    
    -- Actualizar el nombre en la tabla usuarios
    UPDATE usuarios
    SET nombre = user_nombre
    WHERE id = user_id;
  END IF;
  
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := COALESCE(user_nombre, 'Usuario');
    NEW.updated_by := NEW.created_by;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_by := COALESCE(user_nombre, 'Usuario');
    NEW.created_by := OLD.created_by;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 7: Actualizar usuarios existentes sin nombre correcto
-- ============================================

-- Actualizar usuarios existentes que tengan nombre genérico o incorrecto
UPDATE usuarios u
SET nombre = COALESCE(
  (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = u.auth_user_id),
  (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = u.auth_user_id),
  split_part(u.email, '@', 1),
  u.nombre
)
WHERE u.nombre IS NULL 
   OR u.nombre = 'Usuario'
   OR u.nombre = 'usuario'
   OR LENGTH(TRIM(u.nombre)) < 2;

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar usuario actual
SELECT 
  '1. Usuario Actual' as paso,
  auth.uid() as auth_uid,
  ensure_user_exists() as user_id,
  (SELECT nombre FROM usuarios WHERE id = ensure_user_exists()) as nombre,
  (SELECT email FROM usuarios WHERE id = ensure_user_exists()) as email,
  (SELECT rol FROM usuarios WHERE id = ensure_user_exists()) as rol;

-- Verificar funciones
SELECT 
  '2. Funciones' as paso,
  'is_admin()' as funcion,
  is_admin()::TEXT as resultado
UNION ALL
SELECT 
  '2. Funciones' as paso,
  'is_ejecutivo()' as funcion,
  is_ejecutivo()::TEXT as resultado;

-- Verificar políticas
SELECT 
  '3. Políticas INSERT' as paso,
  policyname,
  LEFT(with_check, 150) as with_check_preview
FROM pg_policies
WHERE tablename = 'registros'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- Verificar si puede insertar
SELECT 
  '4. ¿Puede Insertar?' as paso,
  auth.uid() IS NOT NULL as autenticado,
  NOT EXISTS (SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND rol = 'admin') as no_es_admin,
  NOT EXISTS (SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND email LIKE '%@asli.cl') as no_es_ejecutivo,
  CASE
    WHEN auth.uid() IS NULL THEN '❌ NO - No autenticado'
    WHEN EXISTS (SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND rol = 'admin') THEN '✅ SÍ - Es admin'
    WHEN EXISTS (SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND email LIKE '%@asli.cl') THEN '⚠️ Puede - Es ejecutivo'
    ELSE '✅ SÍ - Usuario normal'
  END as resultado;

-- Ver todos los usuarios y sus nombres
SELECT 
  '5. Usuarios en BD' as paso,
  id,
  nombre,
  email,
  rol,
  auth_user_id,
  created_at
FROM usuarios
ORDER BY created_at DESC;

-- Mensaje final
SELECT '✅ FIX COMPLETO APLICADO:
- Función ensure_user_exists() mejorada para obtener nombres correctamente
- Funciones auxiliares actualizadas
- Políticas INSERT recreadas (permisivas para usuarios normales)
- Trigger actualizado para guardar nombres correctos
- Usuarios existentes actualizados
- Cualquier usuario autenticado debería poder crear registros ahora' as mensaje;

