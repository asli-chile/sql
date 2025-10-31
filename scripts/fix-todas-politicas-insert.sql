-- ============================================
-- FIX: Eliminar TODAS las políticas y crear una simple
-- ============================================
-- Este script elimina TODAS las políticas de registros
-- (incluyendo las del esquema original)
-- y crea políticas nuevas y simples
-- ============================================

-- PASO 1: Ver qué políticas existen ANTES de eliminarlas
-- ============================================
SELECT 
  'Políticas ANTES del fix' as estado,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'registros'
ORDER BY cmd, policyname;

-- PASO 2: Eliminar TODAS las políticas de registros
-- ============================================
-- IMPORTANTE: Esto elimina políticas de INSERT, SELECT, UPDATE, DELETE
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'registros'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON registros';
  END LOOP;
END $$;

-- PASO 3: Crear políticas simples y permisivas
-- ============================================

-- SELECT: Todos los autenticados pueden ver registros activos
CREATE POLICY "Todos pueden ver registros activos"
  ON registros FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- INSERT: Todos los autenticados pueden crear registros
CREATE POLICY "Todos pueden crear registros"
  ON registros FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Todos los autenticados pueden actualizar registros
-- (Las restricciones de permisos se manejan en el frontend)
CREATE POLICY "Todos pueden actualizar registros"
  ON registros FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- DELETE: Solo soft delete (actualizar deleted_at)
-- Esto ya está cubierto por UPDATE, pero por si acaso:
-- (El soft delete se hace con UPDATE, no DELETE físico)

-- PASO 4: Asegurar que el usuario actual existe
-- ============================================
INSERT INTO usuarios (auth_user_id, nombre, email, rol)
SELECT 
  auth.uid(),
  COALESCE(
    (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = auth.uid()),
    (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = auth.uid()),
    split_part(COALESCE(auth.email(), ''), '@', 1),
    'Usuario'
  ),
  COALESCE(auth.email(), 'usuario_' || auth.uid()::TEXT || '@temporal.com'),
  'usuario'
WHERE auth.uid() IS NOT NULL
ON CONFLICT (auth_user_id) DO NOTHING;

-- PASO 5: Verificar políticas creadas
-- ============================================
SELECT 
  'Políticas DESPUÉS del fix' as estado,
  policyname,
  cmd,
  roles,
  LEFT(with_check, 100) as with_check_preview
FROM pg_policies
WHERE tablename = 'registros'
ORDER BY cmd, policyname;

-- PASO 6: Verificar usuario
-- ============================================
SELECT 
  'Usuario verificado' as paso,
  auth.uid() as auth_uid,
  (SELECT id FROM usuarios WHERE auth_user_id = auth.uid()) as user_id,
  (SELECT nombre FROM usuarios WHERE auth_user_id = auth.uid()) as nombre,
  (SELECT email FROM usuarios WHERE auth_user_id = auth.uid()) as email;

-- PASO 7: Verificar si puede insertar
-- ============================================
SELECT 
  '¿Puede insertar?' as paso,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN '✅ SÍ - Usuario autenticado'
    ELSE '❌ NO - No autenticado'
  END as resultado;

-- Mensaje final
SELECT '✅ POLÍTICAS SIMPLIFICADAS:
- Todas las políticas antiguas eliminadas
- Nuevas políticas simples creadas
- Cualquier usuario autenticado puede crear registros
- Intenta crear un registro ahora' as mensaje;

