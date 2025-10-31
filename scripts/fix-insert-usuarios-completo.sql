-- ============================================
-- FIX COMPLETO: Políticas INSERT para usuarios no-@asli.cl
-- ============================================
-- Este script asegura que usuarios normales puedan crear registros
-- Incluye: funciones actualizadas, creación automática de usuarios y políticas correctas
-- ============================================

-- PASO 1: Asegurar que el usuario existe en tabla usuarios
-- ============================================
-- Crear función que asegure que el usuario existe antes de insertar

CREATE OR REPLACE FUNCTION ensure_user_exists()
RETURNS UUID AS $$
DECLARE
  current_auth_id UUID;
  user_id UUID;
  user_email TEXT;
  user_name TEXT;
BEGIN
  -- Obtener ID del usuario autenticado
  current_auth_id := auth.uid();
  
  -- Si no hay usuario autenticado, devolver NULL
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
  
  -- Si no existe, crearlo
  user_email := COALESCE(auth.email(), 'usuario_' || current_auth_id::TEXT || '@temporal.com');
  user_name := COALESCE(
    auth.jwt() ->> 'full_name',
    auth.jwt() ->> 'name',
    split_part(user_email, '@', 1),
    'Usuario'
  );
  
  INSERT INTO usuarios (auth_user_id, nombre, email, rol)
  VALUES (current_auth_id, user_name, user_email, 'usuario')
  ON CONFLICT (auth_user_id) DO UPDATE
  SET nombre = EXCLUDED.nombre,
      email = EXCLUDED.email
  RETURNING id INTO user_id;
  
  RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 2: Actualizar funciones para devolver FALSE explícitamente
-- ============================================

-- Actualizar is_admin() para devolver FALSE si el usuario no existe
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Asegurar que el usuario existe primero
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

-- Actualizar is_ejecutivo() para devolver FALSE si el usuario no existe
CREATE OR REPLACE FUNCTION is_ejecutivo()
RETURNS BOOLEAN AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Asegurar que el usuario existe primero
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

-- Actualizar get_current_user_id() para crear usuario si no existe
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN ensure_user_exists();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 3: Eliminar políticas INSERT existentes
-- ============================================

DROP POLICY IF EXISTS "Admins pueden crear cualquier registro" ON registros;
DROP POLICY IF EXISTS "Ejecutivos pueden crear registros de sus clientes" ON registros;
DROP POLICY IF EXISTS "Usuarios normales pueden crear sus propios registros" ON registros;

-- PASO 4: Recrear políticas INSERT
-- ============================================

-- 1. Admins pueden crear cualquier registro
CREATE POLICY "Admins pueden crear cualquier registro"
  ON registros FOR INSERT
  WITH CHECK (
    is_admin() = true
  );

-- 2. Ejecutivos pueden crear registros de sus clientes asignados
CREATE POLICY "Ejecutivos pueden crear registros de sus clientes"
  ON registros FOR INSERT
  WITH CHECK (
    is_ejecutivo() = true
    AND shipper = ANY(
      get_assigned_clientes(get_current_user_id())
    )
  );

-- 3. Usuarios normales pueden crear registros
-- IMPORTANTE: Ahora que las funciones devuelven FALSE explícitamente,
-- y el usuario se crea automáticamente, esto debería funcionar
CREATE POLICY "Usuarios normales pueden crear sus propios registros"
  ON registros FOR INSERT
  WITH CHECK (
    -- Usuario debe estar autenticado
    auth.uid() IS NOT NULL
    -- Y NO debe ser ejecutivo
    AND is_ejecutivo() = false
    -- Y NO debe ser admin
    AND is_admin() = false
    -- El created_by se establecerá automáticamente por el trigger
  );

-- PASO 5: Actualizar trigger para usar ensure_user_exists()
-- ============================================

CREATE OR REPLACE FUNCTION set_user_fields()
RETURNS TRIGGER AS $$
DECLARE
  user_nombre TEXT;
  user_id UUID;
BEGIN
  -- Asegurar que el usuario existe
  user_id := ensure_user_exists();
  
  IF user_id IS NULL THEN
    -- Si no hay usuario, usar valores por defecto
    NEW.created_by := 'Usuario';
    NEW.updated_by := 'Usuario';
    RETURN NEW;
  END IF;
  
  -- Obtener el NOMBRE del usuario
  SELECT nombre INTO user_nombre
  FROM usuarios
  WHERE id = user_id
  LIMIT 1;
  
  -- Si es INSERT, establecer created_by con el NOMBRE
  IF TG_OP = 'INSERT' THEN
    IF user_nombre IS NOT NULL THEN
      NEW.created_by := user_nombre;
    ELSE
      NEW.created_by := 'Usuario';
    END IF;
    NEW.updated_by := NEW.created_by;
  END IF;
  
  -- Si es UPDATE, establecer updated_by con el NOMBRE
  IF TG_OP = 'UPDATE' THEN
    IF user_nombre IS NOT NULL THEN
      NEW.updated_by := user_nombre;
    ELSE
      NEW.updated_by := 'Usuario';
    END IF;
    -- Mantener created_by original
    NEW.created_by := OLD.created_by;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Verificación
-- ============================================

-- Verificar que las políticas se crearon correctamente
SELECT 
  'Políticas INSERT' as seccion,
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'registros'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- Verificar usuario actual
SELECT 
  'Estado del Usuario' as seccion,
  auth.uid() as auth_uid,
  ensure_user_exists() as user_id_creado,
  (SELECT nombre FROM usuarios WHERE id = ensure_user_exists()) as nombre_usuario,
  (SELECT email FROM usuarios WHERE id = ensure_user_exists()) as email_usuario,
  (SELECT rol FROM usuarios WHERE id = ensure_user_exists()) as rol_usuario;

-- Verificar funciones
SELECT 
  'Funciones' as seccion,
  'is_admin()' as funcion,
  is_admin() as resultado,
  CASE 
    WHEN is_admin() IS NULL THEN '❌ NULL'
    WHEN is_admin() = true THEN '✅ TRUE (Admin)'
    ELSE '✅ FALSE (No admin)'
  END as estado
UNION ALL
SELECT 
  'Funciones' as seccion,
  'is_ejecutivo()' as funcion,
  is_ejecutivo() as resultado,
  CASE 
    WHEN is_ejecutivo() IS NULL THEN '❌ NULL'
    WHEN is_ejecutivo() = true THEN '✅ TRUE (Ejecutivo)'
    ELSE '✅ FALSE (No ejecutivo)'
  END as estado;

-- Simulación de INSERT
SELECT 
  'Simulación INSERT' as seccion,
  auth.uid() IS NOT NULL as autenticado,
  is_admin() = false as no_es_admin,
  is_ejecutivo() = false as no_es_ejecutivo,
  CASE
    WHEN auth.uid() IS NULL THEN '❌ NO puede insertar - No autenticado'
    WHEN is_admin() = true THEN '✅ SÍ puede insertar - Es admin'
    WHEN is_ejecutivo() = true THEN '⚠️ Puede insertar - Si tiene clientes asignados'
    WHEN is_ejecutivo() = false AND is_admin() = false THEN '✅ SÍ puede insertar - Usuario normal'
    ELSE '❌ NO puede insertar - Condiciones no cumplidas'
  END as puede_insertar;

-- Mensaje de confirmación
SELECT '✅ Fix completo aplicado:
- Función ensure_user_exists() creada - usuarios se crean automáticamente
- Funciones is_admin() e is_ejecutivo() actualizadas
- Políticas INSERT recreadas
- Trigger actualizado
- Verifica los resultados arriba' as resultado;

