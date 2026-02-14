-- Script para migrar las preferencias de 'tablas-personalizadas' a 'registros'
-- Este script copiará las preferencias de usuarios que tengan configuraciones guardadas

-- 1. Ver las preferencias actuales de 'tablas-personalizadas'
SELECT 
    u.email,
    p.pagina,
    p.clave,
    p.updated_at
FROM preferencias_usuario p
JOIN auth.users u ON u.id = p.usuario_id
WHERE p.pagina = 'tablas-personalizadas'
ORDER BY u.email, p.clave;

-- 2. Migrar las preferencias de 'tablas-personalizadas' a 'registros'
-- EJECUTAR: Descomentar las siguientes líneas para ejecutar

-- Copiar preferencias de column-order
-- INSERT INTO preferencias_usuario (usuario_id, pagina, clave, valor, created_at, updated_at)
-- SELECT 
--     usuario_id, 
--     'registros' as pagina, 
--     clave, 
--     valor, 
--     created_at, 
--     NOW() as updated_at
-- FROM preferencias_usuario
-- WHERE pagina = 'tablas-personalizadas' 
-- AND clave = 'column-order'
-- ON CONFLICT (usuario_id, pagina, clave) 
-- DO UPDATE SET 
--     valor = EXCLUDED.valor,
--     updated_at = EXCLUDED.updated_at;

-- Copiar preferencias de sort-order
-- INSERT INTO preferencias_usuario (usuario_id, pagina, clave, valor, created_at, updated_at)
-- SELECT 
--     usuario_id, 
--     'registros' as pagina, 
--     clave, 
--     valor, 
--     created_at, 
--     NOW() as updated_at
-- FROM preferencias_usuario
-- WHERE pagina = 'tablas-personalizadas' 
-- AND clave = 'sort-order'
-- ON CONFLICT (usuario_id, pagina, clave) 
-- DO UPDATE SET 
--     valor = EXCLUDED.valor,
--     updated_at = EXCLUDED.updated_at;

-- 3. Verificar que se copiaron correctamente
SELECT 
    u.email,
    p.pagina,
    p.clave,
    p.updated_at
FROM preferencias_usuario p
JOIN auth.users u ON u.id = p.usuario_id
WHERE p.pagina = 'registros'
ORDER BY u.email, p.clave;

-- 4. OPCIONAL: Eliminar las preferencias antiguas de 'tablas-personalizadas'
-- Descomentar SOLO después de verificar que la migración fue exitosa
-- DELETE FROM preferencias_usuario WHERE pagina = 'tablas-personalizadas';

-- 5. Verificar que se eliminaron
-- SELECT COUNT(*) as preferencias_restantes
-- FROM preferencias_usuario
-- WHERE pagina = 'tablas-personalizadas';
