-- Script para verificar datos en Supabase
-- Ejecutar en el SQL Editor de Supabase

-- Verificar si hay registros en la tabla registros
SELECT COUNT(*) as total_registros FROM registros WHERE deleted_at IS NULL;

-- Verificar si hay registros con REF ASLI
SELECT COUNT(*) as registros_con_ref_asli FROM registros 
WHERE deleted_at IS NULL AND ref_asli IS NOT NULL;

-- Ver algunos registros de ejemplo
SELECT id, ref_asli, shipper, naviera, estado, created_at 
FROM registros 
WHERE deleted_at IS NULL 
ORDER BY created_at DESC 
LIMIT 5;

-- Verificar si hay catálogos
SELECT categoria, COUNT(*) as cantidad_valores 
FROM catalogos 
GROUP BY categoria;
