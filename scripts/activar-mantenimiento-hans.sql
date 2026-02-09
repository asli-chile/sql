-- =====================================================
-- CONFIGURAR SUPERADMINS: HANS Y RODRIGO
-- =====================================================
-- Este script configura a Hans Vasquez y Rodrigo Caceres
-- como superadmins con acceso completo a:
-- - Mantenimiento
-- - Finanzas
-- - Reportes
-- =====================================================

-- Verificar usuarios actuales
SELECT 
  id,
  nombre,
  email,
  rol,
  activo,
  created_at
FROM usuarios
WHERE email IN ('hans.vasquez@asli.cl', 'rodrigo.caceres@asli.cl')
ORDER BY email;

-- Actualizar Hans Vasquez a admin
UPDATE usuarios
SET 
  rol = 'admin',
  updated_at = NOW()
WHERE email = 'hans.vasquez@asli.cl';

-- Actualizar Rodrigo Caceres a admin (por si acaso)
UPDATE usuarios
SET 
  rol = 'admin',
  updated_at = NOW()
WHERE email = 'rodrigo.caceres@asli.cl';

-- Verificar que se actualizaron correctamente
SELECT 
  id,
  nombre,
  email,
  rol,
  activo,
  updated_at
FROM usuarios
WHERE email IN ('hans.vasquez@asli.cl', 'rodrigo.caceres@asli.cl')
ORDER BY email;

-- Si el usuario no existe, crearlo (descomentar si es necesario)
-- INSERT INTO usuarios (nombre, email, rol, activo)
-- VALUES ('Hans Vasquez', 'hans.vasquez@asli.cl', 'admin', true)
-- ON CONFLICT (email) DO UPDATE SET
--   rol = 'admin',
--   updated_at = NOW();

COMMENT ON TABLE usuarios IS 'Tabla de usuarios del sistema. El campo rol controla los permisos de acceso.';
