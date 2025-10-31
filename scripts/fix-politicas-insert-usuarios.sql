-- ============================================
-- FIX: Políticas INSERT para usuarios no-@asli.cl
-- ============================================
-- Este script corrige las políticas INSERT para permitir
-- que usuarios normales (sin @asli.cl) puedan crear registros
-- ============================================

-- PASO 1: Actualizar funciones para devolver FALSE explícitamente
-- ============================================

-- Actualizar is_admin() para devolver FALSE si el usuario no existe
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE((
    SELECT rol = 'admin'
    FROM usuarios
    WHERE auth_user_id = auth.uid()
    LIMIT 1
  ), false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar is_ejecutivo() para devolver FALSE si el usuario no existe
CREATE OR REPLACE FUNCTION is_ejecutivo()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE((
    SELECT email LIKE '%@asli.cl'
    FROM usuarios
    WHERE auth_user_id = auth.uid()
    LIMIT 1
  ), false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 2: Eliminar políticas INSERT existentes
-- ============================================

DROP POLICY IF EXISTS "Admins pueden crear cualquier registro" ON registros;
DROP POLICY IF EXISTS "Ejecutivos pueden crear registros de sus clientes" ON registros;
DROP POLICY IF EXISTS "Usuarios normales pueden crear sus propios registros" ON registros;

-- PASO 3: Recrear políticas INSERT
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
-- la verificación es más simple
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

-- ============================================
-- Verificación
-- ============================================

-- Verificar que las políticas se crearon correctamente
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'registros'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- Verificar que las funciones devuelven valores correctos
SELECT 
  'is_admin()' as funcion,
  is_admin() as resultado,
  CASE 
    WHEN is_admin() IS NULL THEN '❌ NULL (PROBLEMA)'
    WHEN is_admin() = true THEN '✅ TRUE'
    ELSE '✅ FALSE'
  END as estado
UNION ALL
SELECT 
  'is_ejecutivo()' as funcion,
  is_ejecutivo() as resultado,
  CASE 
    WHEN is_ejecutivo() IS NULL THEN '❌ NULL (PROBLEMA)'
    WHEN is_ejecutivo() = true THEN '✅ TRUE'
    ELSE '✅ FALSE'
  END as estado;

-- Verificar usuario actual
SELECT 
  auth.uid() as auth_uid,
  get_current_user_id() as user_id,
  (SELECT nombre FROM usuarios WHERE id = get_current_user_id()) as nombre_usuario,
  (SELECT email FROM usuarios WHERE id = get_current_user_id()) as email_usuario,
  (SELECT rol FROM usuarios WHERE id = get_current_user_id()) as rol_usuario;

-- Mensaje de confirmación
SELECT '✅ Políticas INSERT actualizadas:
- Funciones is_admin() e is_ejecutivo() ahora devuelven FALSE explícitamente
- Usuarios normales ahora pueden crear registros
- Verifica los resultados arriba para confirmar' as resultado;
