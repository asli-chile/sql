-- ============================================
-- DIAGNÓSTICO: Error de INSERT en registros
-- ============================================
-- Ejecuta este script para diagnosticar por qué
-- un usuario no puede crear registros
-- ============================================

-- 1. Verificar usuario actual
SELECT 
  'Usuario Actual' as seccion,
  auth.uid() as auth_uid,
  get_current_user_id() as user_id_en_usuarios;

-- 2. Verificar si el usuario existe en tabla usuarios
SELECT 
  'Usuario en tabla usuarios' as seccion,
  id,
  nombre,
  email,
  rol,
  auth_user_id,
  activo
FROM usuarios
WHERE auth_user_id = auth.uid();

-- 3. Verificar funciones auxiliares
SELECT 
  'Funciones Auxiliares' as seccion,
  is_admin() as es_admin,
  is_ejecutivo() as es_ejecutivo,
  get_current_user_id() as user_id;

-- 4. Verificar si las funciones devuelven NULL
SELECT 
  'Verificación de NULL' as seccion,
  CASE 
    WHEN is_admin() IS NULL THEN '❌ is_admin() devuelve NULL'
    WHEN is_admin() = true THEN '✅ es ADMIN'
    ELSE '✅ NO es admin'
  END as estado_admin,
  CASE 
    WHEN is_ejecutivo() IS NULL THEN '❌ is_ejecutivo() devuelve NULL'
    WHEN is_ejecutivo() = true THEN '✅ es EJECUTIVO'
    ELSE '✅ NO es ejecutivo'
  END as estado_ejecutivo;

-- 5. Verificar políticas INSERT existentes
SELECT 
  'Políticas INSERT' as seccion,
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'registros'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- 6. Probar si el usuario puede insertar (simulación)
-- Esto mostrará qué política debería aplicarse
SELECT 
  'Simulación de INSERT' as seccion,
  'auth.uid() IS NOT NULL' as condicion1,
  auth.uid() IS NOT NULL as resultado1,
  'is_ejecutivo() = false' as condicion2,
  is_ejecutivo() = false as resultado2,
  'is_admin() = false' as condicion3,
  is_admin() = false as resultado3,
  'Puede insertar?' as pregunta,
  CASE
    WHEN auth.uid() IS NULL THEN '❌ NO - No autenticado'
    WHEN is_admin() = true THEN '✅ SÍ - Es admin (política: Admins)'
    WHEN is_ejecutivo() = true THEN '⚠️ Puede - Si tiene clientes asignados (política: Ejecutivos)'
    WHEN is_ejecutivo() = false AND is_admin() = false THEN '✅ SÍ - Usuario normal (política: Usuarios normales)'
    ELSE '❌ NO - No cumple ninguna condición'
  END as respuesta;

-- 7. Si el usuario no existe, mostrar cómo crearlo
SELECT 
  'Acción Requerida' as seccion,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid()) 
    THEN '❌ Usuario no existe en tabla usuarios. Ejecuta el trigger o crea manualmente.'
    WHEN is_admin() IS NULL OR is_ejecutivo() IS NULL
    THEN '⚠️ Funciones devuelven NULL. Actualiza las funciones con COALESCE.'
    ELSE '✅ Todo parece correcto. Revisa las políticas INSERT.'
  END as mensaje;

