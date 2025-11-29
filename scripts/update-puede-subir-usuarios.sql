-- ============================================
-- ACTUALIZAR CAMPO 'puede_subir' PARA USUARIOS ESPECÍFICOS
-- ============================================
-- Este script permite actualizar el campo puede_subir para usuarios específicos
-- Ejecuta este script después de agregar el campo con add-puede-subir-field.sql
-- ============================================

-- Ver todos los usuarios y su estado actual de puede_subir
SELECT 
  id,
  nombre,
  email,
  rol,
  puede_subir,
  activo
FROM usuarios
ORDER BY email;

-- Ejemplo: Establecer puede_subir = false para un usuario específico
-- Reemplaza 'email@ejemplo.com' con el email del usuario que NO debe poder subir
-- UPDATE usuarios 
-- SET puede_subir = false
-- WHERE email = 'email@ejemplo.com';

-- Ejemplo: Establecer puede_subir = true para un usuario específico
-- UPDATE usuarios 
-- SET puede_subir = true
-- WHERE email = 'email@ejemplo.com';

-- Establecer puede_subir = false para TODOS los usuarios que NO son admin ni ejecutivos
UPDATE usuarios 
SET puede_subir = false
WHERE (rol != 'admin' OR rol IS NULL)
  AND (email NOT LIKE '%@asli.cl' OR email IS NULL)
  AND puede_subir IS NULL;

-- Verificar cambios
SELECT 
  email,
  rol,
  puede_subir,
  CASE 
    WHEN puede_subir = true THEN '✅ Puede subir'
    WHEN puede_subir = false THEN '❌ Solo descargar'
    ELSE '⚠️ No definido'
  END as estado_permisos
FROM usuarios
ORDER BY email;

