-- ============================================
-- DIAGNÓSTICO PROFUNDO: Por qué falla INSERT
-- ============================================

-- 1. Verificar que el usuario existe
SELECT 
  '1. Usuario en tabla usuarios' as paso,
  CASE 
    WHEN EXISTS (SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid()) 
    THEN '✅ Existe'
    ELSE '❌ NO existe'
  END as resultado,
  (SELECT nombre FROM usuarios WHERE auth_user_id = auth.uid()) as nombre,
  (SELECT email FROM usuarios WHERE auth_user_id = auth.uid()) as email,
  (SELECT rol FROM usuarios WHERE auth_user_id = auth.uid()) as rol;

-- 2. Verificar auth.uid()
SELECT 
  '2. auth.uid()' as paso,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN '✅ Tiene valor: ' || auth.uid()::TEXT
    ELSE '❌ Es NULL'
  END as resultado;

-- 3. Verificar todas las políticas INSERT
SELECT 
  '3. Políticas INSERT' as paso,
  policyname,
  with_check
FROM pg_policies
WHERE tablename = 'registros'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- 4. Evaluar cada política manualmente
SELECT 
  '4. Evaluación Política: Admins' as paso,
  EXISTS (
    SELECT 1 FROM usuarios 
    WHERE auth_user_id = auth.uid() 
      AND rol = 'admin'
  ) as resultado,
  CASE 
    WHEN EXISTS (SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND rol = 'admin') 
    THEN '✅ Cumple - Es admin'
    ELSE '❌ No cumple - No es admin'
  END as estado;

SELECT 
  '4. Evaluación Política: Ejecutivos' as paso,
  EXISTS (
    SELECT 1 FROM usuarios u
    WHERE u.auth_user_id = auth.uid()
      AND u.email LIKE '%@asli.cl'
  ) as resultado,
  CASE 
    WHEN EXISTS (SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND email LIKE '%@asli.cl') 
    THEN '✅ Cumple - Es ejecutivo'
    ELSE '❌ No cumple - No es ejecutivo'
  END as estado;

SELECT 
  '4. Evaluación Política: Usuarios Normales' as paso,
  (
    auth.uid() IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND rol = 'admin')
    AND NOT EXISTS (SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND email LIKE '%@asli.cl')
  ) as resultado,
  CASE 
    WHEN auth.uid() IS NULL THEN '❌ No cumple - No autenticado'
    WHEN EXISTS (SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND rol = 'admin') THEN '❌ No cumple - Es admin'
    WHEN EXISTS (SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND email LIKE '%@asli.cl') THEN '❌ No cumple - Es ejecutivo'
    ELSE '✅ Cumple - Es usuario normal'
  END as estado;

-- 5. Verificar si RLS está habilitado
SELECT 
  '5. RLS Habilitado' as paso,
  rowsecurity as rls_habilitado,
  CASE 
    WHEN rowsecurity THEN '✅ SÍ - RLS está habilitado'
    ELSE '❌ NO - RLS no está habilitado'
  END as resultado
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'registros';

-- 6. Ver si hay políticas que bloquean todo
SELECT 
  '6. Total políticas INSERT' as paso,
  COUNT(*) as cantidad_politicas,
  CASE 
    WHEN COUNT(*) = 0 THEN '❌ NO hay políticas - Nada puede insertarse'
    WHEN COUNT(*) > 0 THEN '✅ Hay ' || COUNT(*) || ' política(s)'
    ELSE '❌ Error'
  END as resultado
FROM pg_policies
WHERE tablename = 'registros'
  AND cmd = 'INSERT';

