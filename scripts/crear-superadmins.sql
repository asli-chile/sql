-- =====================================================
-- CREAR PERFILES DE SUPERADMIN PARA RODRIGO Y HANS
-- =====================================================
-- Este script crea o actualiza los perfiles de superadmin
-- para Rodrigo Caceres y Hans Vasquez con rol 'admin'
-- y acceso completo a todas las funcionalidades del sistema.
-- =====================================================

-- PASO 1: Verificar usuarios actuales
-- =====================================================
SELECT 
  id,
  nombre,
  email,
  rol,
  activo,
  auth_user_id,
  created_at,
  updated_at
FROM usuarios
WHERE email IN ('rodrigo.caceres@asli.cl', 'hans.vasquez@asli.cl')
ORDER BY email;

-- PASO 2: Crear o actualizar Rodrigo Caceres
-- =====================================================
INSERT INTO usuarios (nombre, email, rol, activo, updated_at)
VALUES (
  'Rodrigo Caceres',
  'rodrigo.caceres@asli.cl',
  'admin',
  true,
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  rol = 'admin',
  activo = true,
  updated_at = NOW();

-- PASO 3: Crear o actualizar Hans Vasquez
-- =====================================================
INSERT INTO usuarios (nombre, email, rol, activo, updated_at)
VALUES (
  'Hans Vasquez',
  'hans.vasquez@asli.cl',
  'admin',
  true,
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  rol = 'admin',
  activo = true,
  updated_at = NOW();

-- PASO 4: Verificar que se crearon/actualizaron correctamente
-- =====================================================
SELECT 
  id,
  nombre,
  email,
  rol,
  activo,
  auth_user_id,
  created_at,
  updated_at,
  CASE 
    WHEN rol = 'admin' AND activo = true THEN '✅ Superadmin configurado correctamente'
    WHEN rol = 'admin' AND activo = false THEN '⚠️ Admin pero inactivo'
    WHEN rol != 'admin' THEN '❌ No es admin'
    ELSE '⚠️ Estado desconocido'
  END as estado
FROM usuarios
WHERE email IN ('rodrigo.caceres@asli.cl', 'hans.vasquez@asli.cl')
ORDER BY email;

-- PASO 5: Verificar permisos de admin en el sistema
-- =====================================================
-- Nota: Los superadmins (Rodrigo y Hans) tienen acceso a:
-- - Mantenimiento
-- - Finanzas
-- - Reportes
-- - Todas las funcionalidades administrativas
-- 
-- Esto se controla en el código de la aplicación verificando:
-- - email === 'rodrigo.caceres@asli.cl' OR email === 'hans.vasquez@asli.cl'
-- - O rol === 'admin' (para acceso general de admin)

-- Mensaje de confirmación
SELECT 
  '✅ Perfiles de superadmin creados/actualizados correctamente' as resultado,
  COUNT(*) as total_superadmins
FROM usuarios
WHERE email IN ('rodrigo.caceres@asli.cl', 'hans.vasquez@asli.cl')
  AND rol = 'admin'
  AND activo = true;

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================
-- 1. Este script crea o actualiza los usuarios en la tabla 'usuarios'
-- 2. Si los usuarios ya existen, solo actualiza el rol a 'admin'
-- 3. Si los usuarios no existen, los crea con rol 'admin'
-- 4. El campo 'auth_user_id' se puede vincular después si es necesario
-- 5. Los superadmins tienen acceso completo verificando su email
--    en el código de la aplicación (isSuperAdmin check)
-- =====================================================
