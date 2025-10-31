-- =====================================================
-- CONFIGURACIÓN COMPLETA DE EJECUTIVOS Y CLIENTES
-- =====================================================
-- 
-- Ejecutivos del catálogo:
-- - ALEX CARDENAS
-- - HANS VASQUEZ
-- - MARIO BAZAEZ
-- - NINA SCOTI
-- - POLIANA CISTERNA
-- - RICARDO LAZO
-- - ROCIO VILLARROEL
-- - RODRIGO CACERES
-- - STEFANIE CORDOVA
--
-- Clientes del catálogo:
-- - AGRI. INDEPENDENCIA, AGROSOL, AISIEN, ALMAFRUIT, BARON EXPORT,
--   BLOSSOM, COPEFRUT, CRISTIAN MUÑOZ, EXPORTADORA DEL SUR (XSUR),
--   EXPORTADORA SAN ANDRES, FAMILY GROWERS, FENIX, FRUIT ANDES SUR,
--   GF EXPORT, HILLVILLA, JOTRISA, LA RESERVA, RINOFRUIT, SIBARIT,
--   TENO FRUIT, THE GROWERS CLUB, VIF
-- =====================================================

-- PASO 1: Verificar que los ejecutivos existen en la tabla usuarios
-- =====================================================
SELECT 
  email,
  nombre,
  rol
FROM usuarios
WHERE email LIKE '%@asli.cl'
ORDER BY email;

-- Si no existen, necesitas crearlos primero en Supabase Auth
-- y luego se sincronizarán con la tabla usuarios


-- PASO 2: MARIO BAZAEZ - Acceso Total (Admin)
-- =====================================================
-- Asignar TODOS los clientes del catálogo a Mario
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
WHERE u.email = (SELECT email FROM usuarios WHERE nombre LIKE '%MARIO%BAZAEZ%' AND email LIKE '%@asli.cl' LIMIT 1)
  OR u.email LIKE '%mario%bazaez%@asli.cl'
ON CONFLICT (ejecutivo_id, cliente_nombre) DO NOTHING;

-- Actualizar rol a admin (si no lo es)
UPDATE usuarios
SET rol = 'admin'
WHERE (nombre LIKE '%MARIO%BAZAEZ%' OR email LIKE '%mario%bazaez%@asli.cl')
  AND email LIKE '%@asli.cl';


-- PASO 3: HANS VASQUEZ - Acceso Total (Admin)
-- =====================================================
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
WHERE u.email LIKE '%hans%vasquez%@asli.cl'
  OR u.email LIKE '%hans%@asli.cl'
ON CONFLICT (ejecutivo_id, cliente_nombre) DO NOTHING;

UPDATE usuarios
SET rol = 'admin'
WHERE (nombre LIKE '%HANS%VASQUEZ%' OR email LIKE '%hans%vasquez%@asli.cl')
  AND email LIKE '%@asli.cl';


-- PASO 4: RODRIGO CACERES - Acceso Total (Admin)
-- =====================================================
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
WHERE u.email LIKE '%rodrigo%caceres%@asli.cl'
  OR u.email LIKE '%rodrigo%@asli.cl'
ON CONFLICT (ejecutivo_id, cliente_nombre) DO NOTHING;

UPDATE usuarios
SET rol = 'admin'
WHERE (nombre LIKE '%RODRIGO%CACERES%' OR email LIKE '%rodrigo%caceres%@asli.cl')
  AND email LIKE '%@asli.cl';


-- PASO 5: NINA SCOTI - Acceso Limitado: HILLVILLA, BLOSSOM
-- =====================================================
INSERT INTO ejecutivo_clientes (ejecutivo_id, cliente_nombre) 
SELECT 
  u.id,
  cliente
FROM usuarios u
CROSS JOIN (VALUES 
  ('HILLVILLA'), 
  ('BLOSSOM')
) AS clientes(cliente)
WHERE u.email LIKE '%nina%scoti%@asli.cl'
  OR u.email LIKE '%nina%@asli.cl'
ON CONFLICT (ejecutivo_id, cliente_nombre) DO NOTHING;

UPDATE usuarios
SET rol = 'usuario'
WHERE (nombre LIKE '%NINA%SCOTI%' OR email LIKE '%nina%scoti%@asli.cl')
  AND email LIKE '%@asli.cl';


-- PASO 6: RICARDO LAZO - Acceso Limitado: BARON EXPORT, AISIEN, VIF, SIBARIT
-- =====================================================
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
WHERE u.email LIKE '%ricardo%lazo%@asli.cl'
  OR u.email LIKE '%ricardo%@asli.cl'
ON CONFLICT (ejecutivo_id, cliente_nombre) DO NOTHING;

UPDATE usuarios
SET rol = 'usuario'
WHERE (nombre LIKE '%RICARDO%LAZO%' OR email LIKE '%ricardo%lazo%@asli.cl')
  AND email LIKE '%@asli.cl';


-- PASO 7: ROCIO VILLARROEL - Acceso a TODOS los clientes
-- =====================================================
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
WHERE u.email LIKE '%rocio%villarroel%@asli.cl'
  OR u.email LIKE '%rocio%@asli.cl'
ON CONFLICT (ejecutivo_id, cliente_nombre) DO NOTHING;

UPDATE usuarios
SET rol = 'usuario'
WHERE (nombre LIKE '%ROCIO%VILLARROEL%' OR email LIKE '%rocio%villarroel%@asli.cl')
  AND email LIKE '%@asli.cl';


-- PASO 8: ALEX CARDENAS - Acceso Total como LECTOR
-- =====================================================
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
WHERE u.email LIKE '%alex%cardenas%@asli.cl'
  OR u.email LIKE '%alex%@asli.cl'
ON CONFLICT (ejecutivo_id, cliente_nombre) DO NOTHING;

UPDATE usuarios
SET rol = 'lector'
WHERE (nombre LIKE '%ALEX%CARDENAS%' OR email LIKE '%alex%cardenas%@asli.cl')
  AND email LIKE '%@asli.cl';


-- PASO 9: STEFANIE CORDOVA - Acceso Total como LECTOR
-- =====================================================
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
WHERE u.email LIKE '%stefanie%cordova%@asli.cl'
  OR u.email LIKE '%stefanie%@asli.cl'
  OR u.email LIKE '%stefania%@asli.cl'
ON CONFLICT (ejecutivo_id, cliente_nombre) DO NOTHING;

UPDATE usuarios
SET rol = 'lector'
WHERE (nombre LIKE '%STEFANIE%CORDOVA%' OR nombre LIKE '%STEFANIA%CORDOVA%' 
  OR email LIKE '%stefanie%cordova%@asli.cl' OR email LIKE '%stefania%cordova%@asli.cl')
  AND email LIKE '%@asli.cl';


-- PASO 10: POLIANA CISTERNA - Acceso Total como LECTOR + puede CREAR registros
-- =====================================================
-- Nota: Como lector puede ver todo, pero necesita poder crear registros
-- Esto requiere un rol especial. Por ahora la dejamos como 'usuario' para que pueda crear
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
WHERE u.email LIKE '%poliana%cisterna%@asli.cl'
  OR u.email LIKE '%poliana%@asli.cl'
ON CONFLICT (ejecutivo_id, cliente_nombre) DO NOTHING;

UPDATE usuarios
SET rol = 'usuario'  -- 'usuario' permite crear registros
WHERE (nombre LIKE '%POLIANA%CISTERNA%' OR email LIKE '%poliana%cisterna%@asli.cl')
  AND email LIKE '%@asli.cl';


-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

-- Ver resumen de todas las asignaciones
SELECT 
  u.email,
  u.nombre,
  u.rol,
  COUNT(ec.id) as total_clientes,
  STRING_AGG(ec.cliente_nombre, ', ' ORDER BY ec.cliente_nombre) as clientes_asignados
FROM usuarios u
LEFT JOIN ejecutivo_clientes ec ON ec.ejecutivo_id = u.id AND ec.activo = true
WHERE u.email LIKE '%@asli.cl'
GROUP BY u.id, u.email, u.nombre, u.rol
ORDER BY u.nombre;

-- Verificar que todos los clientes del catálogo están asignados al menos a alguien
SELECT 
  cliente_catalogo as "Cliente",
  COUNT(DISTINCT ec.ejecutivo_id) as "Número de Ejecutivos",
  STRING_AGG(u.nombre, ', ' ORDER BY u.nombre) as "Asignado a"
FROM (
  SELECT unnest(valores) as cliente_catalogo
  FROM catalogos
  WHERE categoria = 'clientes'
) AS catalogos_clientes
LEFT JOIN ejecutivo_clientes ec ON ec.cliente_nombre = catalogos_clientes.cliente_catalogo AND ec.activo = true
LEFT JOIN usuarios u ON u.id = ec.ejecutivo_id
GROUP BY cliente_catalogo
ORDER BY cliente_catalogo;

