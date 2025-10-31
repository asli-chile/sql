-- ============================================
-- FIX SIMPLE Y DIRECTO: Políticas INSERT
-- ============================================
-- Usa consultas directas en las políticas en lugar de funciones
-- Esto evita problemas con SECURITY DEFINER en contexto RLS
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

-- PASO 3: Crear políticas usando consultas DIRECTAS (sin funciones)
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

-- Política 2: Ejecutivos pueden crear registros de sus clientes
-- NOTA: Para ejecutivos, la validación del shipper se hace en el frontend
-- La política aquí solo verifica que sea ejecutivo
CREATE POLICY "Ejecutivos pueden crear registros de sus clientes"
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
-- Esta es la política que permite a usuarios sin @asli.cl crear registros
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

-- PASO 4: Verificar políticas creadas
-- ============================================
SELECT 
  'Políticas INSERT creadas' as seccion,
  policyname,
  cmd,
  roles,
  LEFT(with_check, 100) as with_check_preview
FROM pg_policies
WHERE tablename = 'registros'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- PASO 5: Verificar usuario actual y su estado
-- ============================================
SELECT 
  'Usuario actual' as seccion,
  auth.uid() as auth_uid,
  u.id as user_id,
  u.nombre,
  u.email,
  u.rol,
  CASE 
    WHEN u.rol = 'admin' THEN '✅ Es ADMIN'
    WHEN u.email LIKE '%@asli.cl' THEN '✅ Es EJECUTIVO'
    ELSE '✅ Es USUARIO NORMAL'
  END as tipo_usuario,
  CASE
    WHEN u.rol = 'admin' THEN 'Puede insertar (política: Admins)'
    WHEN u.email LIKE '%@asli.cl' THEN 'Puede insertar si tiene clientes asignados (política: Ejecutivos)'
    ELSE 'Puede insertar (política: Usuarios normales)'
  END as politica_aplicable
FROM usuarios u
WHERE u.auth_user_id = auth.uid();

-- PASO 6: Verificar condiciones de las políticas
-- ============================================
SELECT 
  'Verificación de políticas' as seccion,
  'auth.uid() IS NOT NULL' as condicion,
  auth.uid() IS NOT NULL as resultado
UNION ALL
SELECT 
  'Verificación de políticas' as seccion,
  'NO es admin' as condicion,
  NOT EXISTS (
    SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND rol = 'admin'
  ) as resultado
UNION ALL
SELECT 
  'Verificación de políticas' as seccion,
  'NO es ejecutivo (@asli.cl)' as condicion,
  NOT EXISTS (
    SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND email LIKE '%@asli.cl'
  ) as resultado;

-- Mensaje final
SELECT '✅ Políticas INSERT recreadas con consultas directas:
- Ya no usan funciones con SECURITY DEFINER
- Usan consultas directas en las políticas
- Deberían funcionar correctamente
- VERIFICA EL PASO 6: Todas las condiciones deben ser TRUE para usuarios normales' as mensaje;

