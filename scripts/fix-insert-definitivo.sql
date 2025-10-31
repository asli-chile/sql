-- ============================================
-- FIX DEFINITIVO: Políticas INSERT - Solución Completa
-- ============================================
-- Este script resuelve el problema de INSERT para usuarios normales
-- PASO 1: Asegurar que el usuario actual existe
-- PASO 2: Crear función ensure_user_exists()
-- PASO 3: Actualizar funciones auxiliares
-- PASO 4: Recrear políticas INSERT
-- ============================================

-- PASO 1: Crear el usuario actual si no existe
-- ============================================
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
  'usuario' as rol
WHERE auth.uid() IS NOT NULL
ON CONFLICT (auth_user_id) DO UPDATE
SET 
  nombre = COALESCE(EXCLUDED.nombre, usuarios.nombre),
  email = COALESCE(EXCLUDED.email, usuarios.email),
  ultimo_acceso = NOW();

-- PASO 2: Crear función ensure_user_exists()
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
  
  SELECT id INTO user_id
  FROM usuarios
  WHERE auth_user_id = current_auth_id
  LIMIT 1;
  
  IF user_id IS NOT NULL THEN
    RETURN user_id;
  END IF;
  
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

-- PASO 3: Actualizar funciones auxiliares
-- ============================================

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN ensure_user_exists();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- PASO 5: Recrear políticas INSERT (en orden de prioridad)
-- ============================================

-- Política 1: Admins pueden crear cualquier registro
CREATE POLICY "Admins pueden crear cualquier registro"
  ON registros FOR INSERT
  WITH CHECK (is_admin() = true);

-- Política 2: Ejecutivos pueden crear registros de sus clientes
CREATE POLICY "Ejecutivos pueden crear registros de sus clientes"
  ON registros FOR INSERT
  WITH CHECK (
    is_ejecutivo() = true
    AND shipper = ANY(
      get_assigned_clientes(get_current_user_id())
    )
  );

-- Política 3: Usuarios normales pueden crear registros
-- IMPORTANTE: Esta es la política que permite a usuarios sin @asli.cl crear registros
CREATE POLICY "Usuarios normales pueden crear sus propios registros"
  ON registros FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND is_ejecutivo() = false
    AND is_admin() = false
  );

-- PASO 6: Actualizar trigger para usar ensure_user_exists()
-- ============================================

CREATE OR REPLACE FUNCTION set_user_fields()
RETURNS TRIGGER AS $$
DECLARE
  user_nombre TEXT;
  user_id UUID;
BEGIN
  user_id := ensure_user_exists();
  
  IF user_id IS NULL THEN
    NEW.created_by := 'Usuario';
    NEW.updated_by := 'Usuario';
    RETURN NEW;
  END IF;
  
  SELECT nombre INTO user_nombre
  FROM usuarios
  WHERE id = user_id
  LIMIT 1;
  
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

-- ============================================
-- VERIFICACIÓN FINAL
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
  is_admin() as resultado,
  CASE WHEN is_admin() IS NULL THEN '❌ NULL' WHEN is_admin() = true THEN '✅ TRUE' ELSE '✅ FALSE' END as estado
UNION ALL
SELECT 
  '2. Funciones' as paso,
  'is_ejecutivo()' as funcion,
  is_ejecutivo() as resultado,
  CASE WHEN is_ejecutivo() IS NULL THEN '❌ NULL' WHEN is_ejecutivo() = true THEN '✅ TRUE' ELSE '✅ FALSE' END as estado;

-- Verificar políticas
SELECT 
  '3. Políticas INSERT' as paso,
  policyname,
  with_check
FROM pg_policies
WHERE tablename = 'registros'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- Verificar si puede insertar
SELECT 
  '4. ¿Puede Insertar?' as paso,
  auth.uid() IS NOT NULL as autenticado,
  is_admin() = false as no_es_admin,
  is_ejecutivo() = false as no_es_ejecutivo,
  CASE
    WHEN auth.uid() IS NULL THEN '❌ NO - No autenticado'
    WHEN is_admin() = true THEN '✅ SÍ - Es admin'
    WHEN is_ejecutivo() = true THEN '⚠️ Puede - Si tiene clientes asignados'
    WHEN is_ejecutivo() = false AND is_admin() = false THEN '✅ SÍ - Usuario normal'
    ELSE '❌ NO - Condiciones no cumplidas'
  END as resultado;

-- Mensaje final
SELECT '✅ FIX DEFINITIVO APLICADO:
- Usuario creado/verificado
- Función ensure_user_exists() creada
- Funciones auxiliares actualizadas
- Políticas INSERT recreadas
- Trigger actualizado
- VERIFICA EL PASO 4: Debe decir "✅ SÍ - Usuario normal"' as mensaje;

