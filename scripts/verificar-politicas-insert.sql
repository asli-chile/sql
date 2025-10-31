-- ============================================
-- VERIFICAR POLÍTICAS INSERT DE REGISTROS
-- ============================================

-- 1. Ver todas las políticas INSERT de registros
SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'registros'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- 2. Verificar si RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'registros';

-- 3. Probar las funciones en contexto de RLS
SELECT 
  'auth.uid()' as funcion,
  auth.uid()::TEXT as resultado
UNION ALL
SELECT 
  'get_current_user_id()' as funcion,
  COALESCE(get_current_user_id()::TEXT, 'NULL') as resultado
UNION ALL
SELECT 
  'is_admin()' as funcion,
  is_admin()::TEXT as resultado
UNION ALL
SELECT 
  'is_ejecutivo()' as funcion,
  is_ejecutivo()::TEXT as resultado;

-- 4. Verificar usuario actual
SELECT 
  u.id,
  u.nombre,
  u.email,
  u.rol,
  u.auth_user_id,
  auth.uid() as current_auth_uid
FROM usuarios u
WHERE u.auth_user_id = auth.uid();

-- 5. Simular evaluación de políticas
SELECT 
  'Evaluación de Políticas' as tipo,
  'Admin' as politica,
  is_admin() = true as cumple_condicion
UNION ALL
SELECT 
  'Evaluación de Políticas' as tipo,
  'Ejecutivo' as politica,
  (is_ejecutivo() = true AND 'test' = ANY(get_assigned_clientes(get_current_user_id()))) as cumple_condicion
UNION ALL
SELECT 
  'Evaluación de Políticas' as tipo,
  'Usuario Normal' as politica,
  (auth.uid() IS NOT NULL AND is_ejecutivo() = false AND is_admin() = false) as cumple_condicion;

