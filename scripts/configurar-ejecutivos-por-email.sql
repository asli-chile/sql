-- =====================================================
-- CONFIGURACIÓN POR EMAIL EXACTO (MÁS SEGURO)
-- =====================================================
-- 
-- Usa este script si ya sabes los emails exactos de cada ejecutivo
-- Reemplaza los emails de ejemplo con los emails reales
-- =====================================================

-- PASO 1: Ver emails actuales de ejecutivos
-- =====================================================
SELECT 
  email,
  nombre,
  rol
FROM usuarios
WHERE email LIKE '%@asli.cl'
ORDER BY nombre;

-- PASO 2: Actualizar emails según corresponda
-- Reemplaza 'EMAIL_REAL' con el email real de cada ejecutivo
-- =====================================================

-- MARIO BAZAEZ - Admin, todos los clientes
-- Reemplaza 'mario.bazaez@asli.cl' con el email real
INSERT INTO ejecutivo_clientes (ejecutivo_id, cliente_nombre)
SELECT 
  u.id,
  cliente
FROM usuarios u
CROSS JOIN LATERAL (
  SELECT unnest(valores) as cliente
  FROM catalogos
  WHERE categoria = 'clientes'
) AS clientes_catalogo
WHERE u.email = 'mario.bazaez@asli.cl'  -- ⚠️ CAMBIAR EMAIL
ON CONFLICT (ejecutivo_id, cliente_nombre) DO NOTHING;

UPDATE usuarios
SET rol = 'admin'
WHERE email = 'mario.bazaez@asli.cl';  -- ⚠️ CAMBIAR EMAIL


-- HANS VASQUEZ - Admin, todos los clientes
INSERT INTO ejecutivo_clientes (ejecutivo_id, cliente_nombre)
SELECT 
  u.id,
  cliente
FROM usuarios u
CROSS JOIN LATERAL (
  SELECT unnest(valores) as cliente
  FROM catalogos
  WHERE categoria = 'clientes'
) AS clientes_catalogo
WHERE u.email = 'hans.vasquez@asli.cl'  -- ⚠️ CAMBIAR EMAIL
ON CONFLICT (ejecutivo_id, cliente_nombre) DO NOTHING;

UPDATE usuarios
SET rol = 'admin'
WHERE email = 'hans.vasquez@asli.cl';  -- ⚠️ CAMBIAR EMAIL


-- RODRIGO CACERES - Admin, todos los clientes
INSERT INTO ejecutivo_clientes (ejecutivo_id, cliente_nombre)
SELECT 
  u.id,
  cliente
FROM usuarios u
CROSS JOIN LATERAL (
  SELECT unnest(valores) as cliente
  FROM catalogos
  WHERE categoria = 'clientes'
) AS clientes_catalogo
WHERE u.email = 'rodrigo.caceres@asli.cl'  -- ⚠️ CAMBIAR EMAIL
ON CONFLICT (ejecutivo_id, cliente_nombre) DO NOTHING;

UPDATE usuarios
SET rol = 'admin'
WHERE email = 'rodrigo.caceres@asli.cl';  -- ⚠️ CAMBIAR EMAIL


-- NINA SCOTI - Usuario, solo HILLVILLA y BLOSSOM
INSERT INTO ejecutivo_clientes (ejecutivo_id, cliente_nombre) 
SELECT 
  u.id,
  cliente
FROM usuarios u
CROSS JOIN (VALUES 
  ('HILLVILLA'), 
  ('BLOSSOM')
) AS clientes(cliente)
WHERE u.email = 'nina.scoti@asli.cl'  -- ⚠️ CAMBIAR EMAIL
ON CONFLICT (ejecutivo_id, cliente_nombre) DO NOTHING;

UPDATE usuarios
SET rol = 'usuario'
WHERE email = 'nina.scoti@asli.cl';  -- ⚠️ CAMBIAR EMAIL


-- RICARDO LAZO - Usuario, solo BARON EXPORT, AISIEN, VIF, SIBARIT
INSERT INTO ejecutivo_clientes (ejecutivo_id, cliente_nombre) 
SELECT 
  u.id,
  cliente
FROM usuarios u
CROSS JOIN (VALUES 
  ('BARON EXPORT'), 
  ('AISIEN'),
  ('VIF'),
  ('SIBARIT')
) AS clientes(cliente)
WHERE u.email = 'ricardo.lazo@asli.cl'  -- ⚠️ CAMBIAR EMAIL
ON CONFLICT (ejecutivo_id, cliente_nombre) DO NOTHING;

UPDATE usuarios
SET rol = 'usuario'
WHERE email = 'ricardo.lazo@asli.cl';  -- ⚠️ CAMBIAR EMAIL


-- ROCIO VILLARROEL - Usuario, todos los clientes
INSERT INTO ejecutivo_clientes (ejecutivo_id, cliente_nombre)
SELECT 
  u.id,
  cliente
FROM usuarios u
CROSS JOIN LATERAL (
  SELECT unnest(valores) as cliente
  FROM catalogos
  WHERE categoria = 'clientes'
) AS clientes_catalogo
WHERE u.email = 'rocio.villarroel@asli.cl'  -- ⚠️ CAMBIAR EMAIL
ON CONFLICT (ejecutivo_id, cliente_nombre) DO NOTHING;

UPDATE usuarios
SET rol = 'usuario'
WHERE email = 'rocio.villarroel@asli.cl';  -- ⚠️ CAMBIAR EMAIL


-- ALEX CARDENAS - Lector, todos los clientes
INSERT INTO ejecutivo_clientes (ejecutivo_id, cliente_nombre)
SELECT 
  u.id,
  cliente
FROM usuarios u
CROSS JOIN LATERAL (
  SELECT unnest(valores) as cliente
  FROM catalogos
  WHERE categoria = 'clientes'
) AS clientes_catalogo
WHERE u.email = 'alex.cardenas@asli.cl'  -- ⚠️ CAMBIAR EMAIL
ON CONFLICT (ejecutivo_id, cliente_nombre) DO NOTHING;

UPDATE usuarios
SET rol = 'lector'
WHERE email = 'alex.cardenas@asli.cl';  -- ⚠️ CAMBIAR EMAIL


-- STEFANIE CORDOVA - Lector, todos los clientes
INSERT INTO ejecutivo_clientes (ejecutivo_id, cliente_nombre)
SELECT 
  u.id,
  cliente
FROM usuarios u
CROSS JOIN LATERAL (
  SELECT unnest(valores) as cliente
  FROM catalogos
  WHERE categoria = 'clientes'
) AS clientes_catalogo
WHERE u.email = 'stefanie.cordova@asli.cl'  -- ⚠️ CAMBIAR EMAIL
ON CONFLICT (ejecutivo_id, cliente_nombre) DO NOTHING;

UPDATE usuarios
SET rol = 'lector'
WHERE email = 'stefanie.cordova@asli.cl';  -- ⚠️ CAMBIAR EMAIL


-- POLIANA CISTERNA - Usuario (puede crear), todos los clientes
INSERT INTO ejecutivo_clientes (ejecutivo_id, cliente_nombre)
SELECT 
  u.id,
  cliente
FROM usuarios u
CROSS JOIN LATERAL (
  SELECT unnest(valores) as cliente
  FROM catalogos
  WHERE categoria = 'clientes'
) AS clientes_catalogo
WHERE u.email = 'poliana.cisterna@asli.cl'  -- ⚠️ CAMBIAR EMAIL
ON CONFLICT (ejecutivo_id, cliente_nombre) DO NOTHING;

UPDATE usuarios
SET rol = 'usuario'  -- 'usuario' permite crear registros
WHERE email = 'poliana.cisterna@asli.cl';  -- ⚠️ CAMBIAR EMAIL


-- =====================================================
-- VERIFICACIÓN
-- =====================================================
SELECT 
  u.email,
  u.nombre,
  u.rol,
  COUNT(ec.id) as total_clientes
FROM usuarios u
LEFT JOIN ejecutivo_clientes ec ON ec.ejecutivo_id = u.id AND ec.activo = true
WHERE u.email LIKE '%@asli.cl'
GROUP BY u.id, u.email, u.nombre, u.rol
ORDER BY u.nombre;

