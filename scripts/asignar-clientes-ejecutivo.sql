-- =====================================================
-- GUÍA PASO A PASO: Asignar Clientes a Ejecutivos
-- =====================================================
-- 
-- IMPORTANTE: Los nombres de clientes deben venir del CATÁLOGO
--             No uses nombres de registros, usa los valores del catálogo
-- =====================================================

-- PASO 1: Ver qué clientes hay en el catálogo
-- =====================================================
-- Ejecuta esto primero para ver todos los clientes disponibles
SELECT 
  categoria,
  valores
FROM catalogos
WHERE categoria = 'clientes';

-- Esto te mostrará un array con todos los clientes disponibles
-- Ejemplo de resultado: ['Cliente A', 'Cliente B', 'Cliente C']


-- PASO 2: Ver qué ejecutivos hay en el catálogo
-- =====================================================
SELECT 
  categoria,
  valores
FROM catalogos
WHERE categoria = 'ejecutivos';

-- Esto te mostrará un array con todos los ejecutivos disponibles


-- PASO 3: Ver los usuarios ejecutivos (@asli.cl) en la tabla usuarios
-- =====================================================
SELECT 
  id,
  email,
  nombre,
  rol
FROM usuarios
WHERE email LIKE '%@asli.cl'
ORDER BY email;

-- Guarda el EMAIL del ejecutivo que quieres asignar


-- PASO 4: Asignar UN cliente a UN ejecutivo
-- =====================================================
-- Reemplaza 'ejecutivo@asli.cl' con el email real del ejecutivo
-- Reemplaza 'NOMBRE_CLIENTE_DEL_CATALOGO' con el nombre exacto del catálogo

INSERT INTO ejecutivo_clientes (ejecutivo_id, cliente_nombre) 
SELECT 
  u.id,  -- ID del ejecutivo
  'NOMBRE_CLIENTE_DEL_CATALOGO'  -- Nombre EXACTO del catálogo
FROM usuarios u 
WHERE u.email = 'ejecutivo@asli.cl'  -- Email del ejecutivo
ON CONFLICT (ejecutivo_id, cliente_nombre) DO NOTHING;

-- Ejemplo real:
-- INSERT INTO ejecutivo_clientes (ejecutivo_id, cliente_nombre) 
-- SELECT u.id, 'Frutas del Sur'
-- FROM usuarios u 
-- WHERE u.email = 'juan.perez@asli.cl'
-- ON CONFLICT (ejecutivo_id, cliente_nombre) DO NOTHING;


-- PASO 5: Asignar MÚLTIPLES clientes a UN ejecutivo
-- =====================================================
-- Reemplaza los nombres de clientes con los nombres EXACTOS del catálogo
-- Reemplaza 'ejecutivo@asli.cl' con el email real

INSERT INTO ejecutivo_clientes (ejecutivo_id, cliente_nombre) 
SELECT 
  u.id,
  cliente
FROM usuarios u 
CROSS JOIN (VALUES 
  ('CLIENTE_1_DEL_CATALOGO'), 
  ('CLIENTE_2_DEL_CATALOGO'), 
  ('CLIENTE_3_DEL_CATALOGO')
) AS clientes(cliente)
WHERE u.email = 'ejecutivo@asli.cl'
ON CONFLICT (ejecutivo_id, cliente_nombre) DO NOTHING;

-- Ejemplo real con varios clientes:
-- INSERT INTO ejecutivo_clientes (ejecutivo_id, cliente_nombre) 
-- SELECT u.id, cliente
-- FROM usuarios u 
-- CROSS JOIN (VALUES 
--   ('Frutas del Sur'), 
--   ('Exportaciones Chile'), 
--   ('Agrícola Los Andes')
-- ) AS clientes(cliente)
-- WHERE u.email = 'juan.perez@asli.cl'
-- ON CONFLICT (ejecutivo_id, cliente_nombre) DO NOTHING;


-- PASO 6: Asignar TODOS los clientes del catálogo a un ejecutivo
-- =====================================================
-- Esto toma todos los clientes del catálogo y los asigna al ejecutivo
-- Útil si un ejecutivo debe ver todos los clientes

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
WHERE u.email = 'ejecutivo@asli.cl'
ON CONFLICT (ejecutivo_id, cliente_nombre) DO NOTHING;


-- PASO 7: Verificar qué clientes están asignados a un ejecutivo
-- =====================================================
SELECT 
  u.email as ejecutivo_email,
  u.nombre as ejecutivo_nombre,
  ec.cliente_nombre,
  ec.activo,
  ec.created_at
FROM ejecutivo_clientes ec
JOIN usuarios u ON u.id = ec.ejecutivo_id
WHERE u.email = 'ejecutivo@asli.cl'
ORDER BY ec.cliente_nombre;


-- PASO 8: Ver TODOS los ejecutivos y sus clientes asignados
-- =====================================================
SELECT 
  u.email,
  u.nombre,
  COUNT(ec.id) as total_clientes,
  STRING_AGG(ec.cliente_nombre, ', ' ORDER BY ec.cliente_nombre) as clientes_asignados
FROM usuarios u
LEFT JOIN ejecutivo_clientes ec ON ec.ejecutivo_id = u.id AND ec.activo = true
WHERE u.email LIKE '%@asli.cl'
GROUP BY u.id, u.email, u.nombre
ORDER BY u.nombre;


-- PASO 9: Eliminar asignación de un cliente a un ejecutivo
-- =====================================================
-- Para desactivar (más seguro que eliminar)
UPDATE ejecutivo_clientes
SET activo = false
WHERE ejecutivo_id = (SELECT id FROM usuarios WHERE email = 'ejecutivo@asli.cl')
  AND cliente_nombre = 'NOMBRE_CLIENTE_DEL_CATALOGO';

-- Para eliminar completamente (si es necesario)
-- DELETE FROM ejecutivo_clientes
-- WHERE ejecutivo_id = (SELECT id FROM usuarios WHERE email = 'ejecutivo@asli.cl')
--   AND cliente_nombre = 'NOMBRE_CLIENTE_DEL_CATALOGO';


-- PASO 10: Comparar clientes del catálogo vs clientes asignados
-- =====================================================
-- Ver qué clientes del catálogo NO están asignados a ningún ejecutivo
SELECT 
  cliente_catalogo,
  CASE 
    WHEN ec.cliente_nombre IS NULL THEN '❌ NO asignado'
    ELSE '✅ Asignado'
  END as estado
FROM (
  SELECT unnest(valores) as cliente_catalogo
  FROM catalogos
  WHERE categoria = 'clientes'
) AS catalogos_clientes
LEFT JOIN ejecutivo_clientes ec ON ec.cliente_nombre = catalogos_clientes.cliente_catalogo AND ec.activo = true
ORDER BY cliente_catalogo;

