-- Script para resetear el orden de columnas guardado en la página de registros
-- NOTA: Ahora solo se guarda la POSICIÓN de las columnas, NO los anchos
-- Los anchos siempre se toman del archivo: src/config/registros-columnas.ts

-- Ver las preferencias actuales (opcional)
SELECT 
    u.email,
    p.pagina,
    p.clave,
    p.updated_at
FROM preferencias_usuario p
JOIN auth.users u ON u.id = p.usuario_id
WHERE p.pagina = 'registros'
AND p.clave = 'column-order';

-- OPCIÓN 1: Eliminar TODAS las preferencias de orden de columnas
-- (Todos los usuarios volverán al orden por defecto)
-- DELETE FROM preferencias_usuario
-- WHERE pagina = 'registros'
-- AND clave = 'column-order';

-- OPCIÓN 2: Eliminar solo para un usuario específico
-- Reemplaza 'tu@email.com' con el email del usuario
-- DELETE FROM preferencias_usuario
-- WHERE pagina = 'registros'
-- AND clave = 'column-order'
-- AND usuario_id = (
--   SELECT id FROM auth.users WHERE email = 'tu@email.com'
-- );

-- Verificar que se eliminaron (opcional)
SELECT 
    COUNT(*) as preferencias_restantes
FROM preferencias_usuario
WHERE pagina = 'registros'
AND clave = 'column-order';

-- NOTA: 
-- - Los anchos de columnas NO se guardan en la base de datos
-- - Los anchos siempre se toman de: src/config/registros-columnas.ts
-- - Solo se guarda: orden (posición), visibilidad (hide), y columnas fijadas (pinned)
