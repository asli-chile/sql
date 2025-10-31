-- ============================================
-- FIX DEFINITIVO FINAL: INSERT para todos los usuarios
-- ============================================
-- Esta es la solución más simple y directa
-- Permite a CUALQUIER usuario autenticado crear registros
-- ============================================

-- PASO 1: Asegurar que el usuario existe
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

-- PASO 3: Crear UNA política simple y permisiva
-- ============================================
-- Esta política permite a CUALQUIER usuario autenticado crear registros
CREATE POLICY "Todos los usuarios autenticados pueden crear registros"
  ON registros FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- PASO 4: Verificar que se creó
-- ============================================
SELECT 
  'Política INSERT creada' as resultado,
  policyname,
  cmd,
  roles,
  with_check
FROM pg_policies
WHERE tablename = 'registros'
  AND cmd = 'INSERT';

-- PASO 5: Verificar usuario
-- ============================================
SELECT 
  'Usuario verificado' as resultado,
  auth.uid() as auth_uid,
  (SELECT id FROM usuarios WHERE auth_user_id = auth.uid()) as user_id,
  (SELECT nombre FROM usuarios WHERE auth_user_id = auth.uid()) as nombre,
  (SELECT email FROM usuarios WHERE auth_user_id = auth.uid()) as email;

-- PASO 6: Verificar si puede insertar
-- ============================================
SELECT 
  '¿Puede insertar?' as resultado,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN '✅ SÍ - Usuario autenticado'
    ELSE '❌ NO - No autenticado'
  END as estado;

-- Mensaje final
SELECT '✅ FIX DEFINITIVO FINAL APLICADO:
- Política simple y permisiva creada
- Cualquier usuario autenticado puede crear registros
- Intenta crear un registro ahora' as mensaje;

