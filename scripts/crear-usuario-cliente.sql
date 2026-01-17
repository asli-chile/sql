-- ============================================
-- CREAR USUARIO CLIENTE
-- ============================================
-- Este script crea un usuario cliente (acceso limitado a su propio cliente)
-- IMPORTANTE: El usuario debe existir primero en Supabase Auth
-- ============================================

-- INSTRUCCIONES:
-- 1. Primero crea el usuario en Supabase Auth (Dashboard > Authentication > Users > Add User)
-- 2. Copia el User UID del usuario creado
-- 3. Reemplaza los valores en el INSERT de abajo:
--    - 'AQUI_VA_EL_USER_UID' con el User UID de Supabase Auth
--    - 'contacto@cliente.com' con el email del cliente
--    - 'Nombre Cliente' con el nombre del contacto/cliente
--    - 'NOMBRE DEL CLIENTE' con el nombre exacto del cliente del catálogo
-- 4. Ejecuta este script en el SQL Editor de Supabase

-- ============================================
-- LISTA DE CLIENTES DISPONIBLES
-- ============================================
-- Asegúrate de usar el nombre EXACTO del cliente del catálogo:
-- 'AGRI. INDEPENDENCIA', 'AGROSOL', 'AISIEN', 'ALMAFRUIT', 'BARON EXPORT',
-- 'BLOSSOM', 'COPEFRUT', 'CRISTIAN MUÑOZ', 'EXPORTADORA DEL SUR (XSUR)',
-- 'EXPORTADORA SAN ANDRES', 'FAMILY GROWERS', 'FENIX', 'FRUIT ANDES SUR',
-- 'GF EXPORT', 'HILLVILLA', 'JOTRISA', 'LA RESERVA', 'RINOFRUIT', 'SIBARIT',
-- 'TENO FRUIT', 'THE GROWERS CLUB', 'VIF'

-- ============================================
-- EJEMPLO: Crear usuario cliente
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
  'contacto@exportadorasanandres.com',  -- ⚠️ REEMPLAZAR con el email del cliente
  'Contacto Exportadora San Andres',  -- ⚠️ REEMPLAZAR con el nombre del contacto
  'cliente',  -- Rol: cliente (acceso limitado)
  true,  -- Usuario activo
  ARRAY[]::TEXT[],  -- Array vacío (cliente no usa clientes_asignados)
  'EXPORTADORA SAN ANDRES'  -- ⚠️ REEMPLAZAR con el nombre EXACTO del cliente del catálogo
)
ON CONFLICT (auth_user_id) DO UPDATE SET
  email = EXCLUDED.email,
  nombre = EXCLUDED.nombre,
  rol = 'cliente',
  activo = true,
  clientes_asignados = ARRAY[]::TEXT[],
  cliente_nombre = EXCLUDED.cliente_nombre;

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
WHERE email = 'contacto@exportadorasanandres.com';  -- ⚠️ Cambiar por el email que usaste

-- Mensaje de confirmación
SELECT '✅ Usuario cliente creado exitosamente' as resultado;
