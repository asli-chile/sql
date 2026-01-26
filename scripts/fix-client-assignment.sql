-- Corregir asignación de clientes en tabla usuarios
-- Cada usuario debe ver solo los datos de su propio cliente

-- Verificar usuarios actuales y sus clientes asignados
SELECT nombre, cliente_nombre, clientes_asignados FROM usuarios 
WHERE nombre IN ('AlmaFruit Export', 'Leandro Mariscal', 'Hans Vasquez');

-- Verificar que existan transportes para cada cliente
SELECT exportacion, COUNT(*) as cantidad_transportes 
FROM transportes 
WHERE deleted_at IS NULL 
GROUP BY exportacion 
ORDER BY cantidad_transportes DESC;
