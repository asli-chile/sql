-- Verificar si GF EXPORT existe en la tabla clientes
SELECT * FROM clientes WHERE nombre = 'GF EXPORT';

-- Verificar todos los clientes que contienen "GF" o "EXPORT"
SELECT * FROM clientes WHERE nombre ILIKE '%GF%' OR nombre ILIKE '%EXPORT%';

-- Mostrar todos los clientes disponibles
SELECT nombre FROM clientes ORDER BY nombre;
