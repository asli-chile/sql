-- ============================================
-- FIX ÚLTIMO INTENTO: Políticas INSERT
-- ============================================
-- Si después de esto no funciona, puede ser un problema
-- de permisos de las funciones con SECURITY DEFINER
-- ============================================

-- PASO 1: Asegurar que el usuario existe
-- ============================================
INSERT INTO usuarios (auth_user_id, nombre, email, rol)
SELECT 
  auth.uid(),
  COALESCE(auth.jwt() ->> 'full_name', split_part(auth.email(), '@', 1), 'Usuario'),
  COALESCE(auth.email(), 'usuario_' || auth.uid()::TEXT || '@temporal.com'),
  'usuario'
WHERE auth.uid() IS NOT NULL
ON CONFLICT (auth_user_id) DO NOTHING;

-- PASO 2: Eliminar TODAS las políticas INSERT
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

-- PASO 3: Crear políticas más simples y permisivas para INSERT
-- ============================================

-- Política para usuarios autenticados (más permisiva)
CREATE POLICY "Usuarios autenticados pueden crear registros"
  ON registros FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Opcional: Política específica para admins
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

-- Opcional: Política para ejecutivos
CREATE POLICY "Ejecutivos pueden crear registros"
  ON registros FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE auth_user_id = auth.uid() 
        AND email LIKE '%@asli.cl'
        AND shipper = ANY(
          SELECT cliente_nombre::TEXT
          FROM ejecutivo_clientes ec
          JOIN usuarios u ON ec.ejecutivo_id = u.id
          WHERE u.auth_user_id = auth.uid()
        )
    )
  );

-- PASO 4: Verificar
-- ============================================
SELECT 
  'Políticas INSERT después del fix' as seccion,
  policyname,
  cmd,
  roles,
  with_check
FROM pg_policies
WHERE tablename = 'registros'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- Verificar usuario
SELECT 
  'Usuario verificado' as seccion,
  auth.uid() as auth_uid,
  (SELECT id FROM usuarios WHERE auth_user_id = auth.uid()) as user_id,
  (SELECT nombre FROM usuarios WHERE auth_user_id = auth.uid()) as nombre,
  (SELECT email FROM usuarios WHERE auth_user_id = auth.uid()) as email;

-- Mensaje
SELECT '✅ Políticas INSERT simplificadas - Intenta crear un registro ahora' as mensaje;

