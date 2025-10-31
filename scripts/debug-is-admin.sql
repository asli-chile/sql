-- =====================================================
-- DEBUG: Verificar función is_admin()
-- =====================================================

-- Ver tu usuario actual
SELECT 
  u.id,
  u.email,
  u.rol,
  u.auth_user_id,
  auth.uid() as "Current Auth UID"
FROM usuarios u
WHERE u.auth_user_id = auth.uid();

-- Probar función is_admin()
SELECT 
  is_admin() as "¿Es Admin?",
  is_ejecutivo() as "¿Es Ejecutivo?",
  get_current_user_id() as "User ID Actual";

-- Ver todos los admins
SELECT 
  id,
  email,
  rol,
  activo
FROM usuarios
WHERE rol = 'admin'
ORDER BY email;

-- Verificar si tu usuario tiene rol admin
SELECT 
  CASE 
    WHEN rol = 'admin' THEN '✅ Es Admin'
    ELSE '❌ NO es Admin (rol actual: ' || rol || ')'
  END as estado,
  email,
  rol
FROM usuarios
WHERE auth_user_id = auth.uid();

