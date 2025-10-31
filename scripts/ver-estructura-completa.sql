-- ============================================
-- VER ESTRUCTURA COMPLETA DE LA BASE DE DATOS
-- ============================================

-- 1. Ver TODAS las políticas de registros (no solo INSERT)
SELECT 
  'TODAS las políticas de registros' as tipo,
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'registros'
ORDER BY cmd, policyname;

-- 2. Ver si RLS está habilitado
SELECT 
  'Estado de RLS' as tipo,
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('registros', 'usuarios', 'catalogos')
ORDER BY tablename;

-- 3. Ver estructura de tabla registros
SELECT 
  'Estructura de registros' as tipo,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'registros'
ORDER BY ordinal_position;

-- 4. Ver estructura de tabla usuarios
SELECT 
  'Estructura de usuarios' as tipo,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'usuarios'
ORDER BY ordinal_position;

-- 5. Ver funciones relacionadas
SELECT 
  'Funciones' as tipo,
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'ensure_user_exists',
    'get_current_user_id',
    'is_admin',
    'is_ejecutivo',
    'get_assigned_clientes',
    'set_user_fields'
  )
ORDER BY routine_name;

-- 6. Ver triggers de registros
SELECT 
  'Triggers de registros' as tipo,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'registros'
ORDER BY trigger_name;

-- 7. Ver usuarios actuales
SELECT 
  'Usuarios en BD' as tipo,
  id,
  nombre,
  email,
  rol,
  auth_user_id,
  activo,
  created_at
FROM usuarios
ORDER BY created_at DESC
LIMIT 10;

