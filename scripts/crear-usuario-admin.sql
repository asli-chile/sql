-- ============================================
-- CREAR USUARIO ADMINISTRADOR
-- ============================================
-- Este script crea un usuario administrador en la tabla usuarios
-- IMPORTANTE: El usuario debe existir primero en Supabase Auth
-- ============================================

-- INSTRUCCIONES:
-- 1. Primero crea el usuario en Supabase Auth (Dashboard > Authentication > Users > Add User)
-- 2. Copia el User UID del usuario creado
-- 3. Reemplaza los valores en el INSERT de abajo:
--    - 'AQUI_VA_EL_USER_UID' con el User UID de Supabase Auth
--    - 'nombre.apellido@asli.cl' con el email del usuario
--    - 'Nombre Apellido' con el nombre completo
-- 4. Ejecuta este script en el SQL Editor de Supabase

-- ============================================
-- EJEMPLO: Crear usuario admin
-- ============================================
INSERT INTO usuarios (
  auth_user_id,
  email,
  nombre,
  rol,
  activo,
  clientes_asignados,
  cliente_nombre
)
VALUES (
  'AQUI_VA_EL_USER_UID',  -- ⚠️ REEMPLAZAR con el User UID de Supabase Auth
  'rodrigo.caceres@asli.cl',  -- ⚠️ REEMPLAZAR con el email del usuario
  'Rodrigo Caceres',  -- ⚠️ REEMPLAZAR con el nombre completo
  'admin',  -- Rol: admin (acceso total)
  true,  -- Usuario activo
  ARRAY[]::TEXT[],  -- Array vacío (admin no necesita clientes_asignados)
  NULL  -- NULL (admin no tiene cliente_nombre)
)
ON CONFLICT (auth_user_id) DO UPDATE SET
  email = EXCLUDED.email,
  nombre = EXCLUDED.nombre,
  rol = 'admin',
  activo = true,
  clientes_asignados = ARRAY[]::TEXT[],
  cliente_nombre = NULL;

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT 
  id,
  auth_user_id,
  email,
  nombre,
  rol,
  activo,
  clientes_asignados,
  cliente_nombre,
  created_at
FROM usuarios
WHERE email = 'rodrigo.caceres@asli.cl';  -- ⚠️ Cambiar por el email que usaste

-- Mensaje de confirmación
SELECT '✅ Usuario admin creado exitosamente' as resultado;
