-- Script para migrar URLs antiguas de plantillas a paths relativos
-- Ejecutar solo si hay plantillas con URLs completas en lugar de paths relativos

-- Ver el estado actual
SELECT 
    id,
    nombre,
    archivo_url,
    CASE 
        WHEN archivo_url LIKE 'http%' THEN '❌ URL completa (necesita migración)'
        ELSE '✅ Path relativo (correcto)'
    END as estado
FROM plantillas_proforma;

-- Migrar URLs completas a paths relativos
-- NOTA: Esto solo actualiza la base de datos, NO mueve archivos en Storage
-- Los archivos en Storage también necesitan moverse manualmente o re-subirse

-- Paso 1: Extraer solo el path de URLs completas
UPDATE plantillas_proforma
SET archivo_url = REGEXP_REPLACE(
    archivo_url,
    'https://[^/]+/storage/v1/object/(public|sign)/documentos/',
    ''
)
WHERE archivo_url LIKE 'http%';

-- Paso 2: Cambiar 'plantillas-proforma/' a 'plantillas/'
UPDATE plantillas_proforma
SET archivo_url = REPLACE(archivo_url, 'plantillas-proforma/', 'plantillas/')
WHERE archivo_url LIKE '%plantillas-proforma/%';

-- Verificar resultado
SELECT 
    id,
    nombre,
    archivo_url,
    CASE 
        WHEN archivo_url LIKE 'http%' THEN '❌ Aún tiene URL completa'
        WHEN archivo_url LIKE 'plantillas/%' THEN '✅ Path correcto'
        ELSE '⚠️ Path inusual'
    END as estado
FROM plantillas_proforma;
