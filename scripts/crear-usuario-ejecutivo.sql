-- ============================================
-- CREAR USUARIO EJECUTIVO
-- ============================================
-- Este script crea un usuario ejecutivo con clientes asignados
-- IMPORTANTE: El usuario debe existir primero en Supabase Auth
-- ============================================

-- INSTRUCCIONES:
-- 1. Primero crea el usuario en Supabase Auth (Dashboard > Authentication > Users > Add User)
-- 2. Copia el User UID del usuario creado
-- 3. Reemplaza los valores en el INSERT de abajo:
--    - 'AQUI_VA_EL_USER_UID' con el User UID de Supabase Auth
--    - 'nombre.apellido@asli.cl' con el email del usuario
--    - 'Nombre Apellido' con el nombre completo
--    - Los nombres de clientes en el array clientes_asignados
-- 4. Ejecuta este script en el SQL Editor de Supabase

-- ============================================
-- LISTA DE CLIENTES DISPONIBLES
-- ============================================
-- Puedes usar cualquiera de estos nombres de clientes:
-- 'AGRI. INDEPENDENCIA', 'AGROSOL', 'AISIEN', 'ALMAFRUIT', 'BARON EXPORT',
-- 'BLOSSOM', 'COPEFRUT', 'CRISTIAN MUÑOZ', 'EXPORTADORA DEL SUR (XSUR)',
-- 'EXPORTADORA SAN ANDRES', 'FAMILY GROWERS', 'FENIX', 'FRUIT ANDES SUR',
-- 'GF EXPORT', 'HILLVILLA', 'JOTRISA', 'LA RESERVA', 'RINOFRUIT', 'SIBARIT',
-- 'TENO FRUIT', 'THE GROWERS CLUB', 'VIF'

-- ============================================
-- EJEMPLO 1: Ejecutivo con clientes específicos
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
  'hans.vasquez@asli.cl',  -- ⚠️ REEMPLAZAR con el email del usuario
  'Hans Vasquez',  -- ⚠️ REEMPLAZAR con el nombre completo
  'ejecutivo',  -- Rol: ejecutivo
  true,  -- Usuario activo
  ARRAY[  -- ⚠️ REEMPLAZAR con los nombres de clientes asignados
    'EXPORTADORA DEL SUR (XSUR)',
    'EXPORTADORA SAN ANDRES',
    'FAMILY GROWERS'
  ]::TEXT[],
  NULL  -- NULL (ejecutivo no tiene cliente_nombre)
)
ON CONFLICT (auth_user_id) DO UPDATE SET
  email = EXCLUDED.email,
  nombre = EXCLUDED.nombre,
  rol = 'ejecutivo',
  activo = true,
  clientes_asignados = EXCLUDED.clientes_asignados,
  cliente_nombre = NULL;

-- ============================================
-- EJEMPLO 2: Ejecutivo con TODOS los clientes
-- ============================================
-- Si quieres asignar TODOS los clientes del catálogo:
INSERT INTO usuarios (
  auth_user_id,
  email,
  nombre,
  rol,
  activo,
  clientes_asignados,
  cliente_nombre
)
SELECT 
  'AQUI_VA_EL_USER_UID',  -- ⚠️ REEMPLAZAR con el User UID de Supabase Auth
  'nina.scoti@asli.cl',  -- ⚠️ REEMPLAZAR con el email del usuario
  'Nina Scoti',  -- ⚠️ REEMPLAZAR con el nombre completo
  'ejecutivo',
  true,
  ARRAY(
    SELECT unnest(valores) 
    FROM catalogos 
    WHERE categoria = 'clientes'
  )::TEXT[],  -- Todos los clientes del catálogo
  NULL
ON CONFLICT (auth_user_id) DO UPDATE SET
  email = EXCLUDED.email,
  nombre = EXCLUDED.nombre,
  rol = 'ejecutivo',
  activo = true,
  clientes_asignados = EXCLUDED.clientes_asignados,
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
  array_length(clientes_asignados, 1) as total_clientes,
  created_at
FROM usuarios
WHERE email = 'hans.vasquez@asli.cl';  -- ⚠️ Cambiar por el email que usaste

-- Mensaje de confirmación
SELECT '✅ Usuario ejecutivo creado exitosamente' as resultado;
