-- Script para aplicar los nuevos anchos de columnas en la página de registros
-- Este script eliminará las preferencias guardadas para que se usen los anchos del archivo de configuración

-- VER preferencias actuales
SELECT 
    u.email,
    p.clave,
    LENGTH(p.valor::text) as tamaño_datos,
    p.updated_at
FROM preferencias_usuario p
JOIN auth.users u ON u.id = p.usuario_id
WHERE p.pagina = 'registros'
AND p.clave = 'column-order'
ORDER BY p.updated_at DESC;

-- EJECUTAR: Eliminar TODAS las preferencias de orden de columnas
-- Descomentar la siguiente línea para ejecutar:
-- DELETE FROM preferencias_usuario WHERE pagina = 'registros' AND clave = 'column-order';

-- Verificar que se eliminaron
SELECT COUNT(*) as preferencias_restantes
FROM preferencias_usuario
WHERE pagina = 'registros'
AND clave = 'column-order';
