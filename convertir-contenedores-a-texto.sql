-- Script para convertir contenedores de array JSON a texto plano con espacios
-- Ejecutar este script UNA SOLA VEZ en Supabase SQL Editor

-- Ver primero cuántos registros tienen contenedores en formato array
SELECT 
  COUNT(*) as total_con_array,
  COUNT(CASE WHEN contenedor::text LIKE '[%' THEN 1 END) as con_formato_array
FROM registros
WHERE contenedor IS NOT NULL AND contenedor != '';

-- Convertir todos los contenedores de array JSON a texto plano
UPDATE registros
SET contenedor = (
  CASE 
    -- Si es un array JSON (comienza con [), convertirlo a texto con espacios
    WHEN contenedor::text LIKE '[%' THEN (
      SELECT string_agg(elem::text, ' ')
      FROM jsonb_array_elements_text(contenedor::jsonb) AS elem
    )
    -- Si ya es texto plano, mantenerlo
    ELSE contenedor
  END
)
WHERE contenedor IS NOT NULL 
  AND contenedor != ''
  AND deleted_at IS NULL;

-- Verificar el resultado
SELECT 
  id,
  ref_asli,
  contenedor,
  LENGTH(contenedor) as longitud,
  CASE 
    WHEN contenedor LIKE '[%' THEN 'Array JSON'
    WHEN contenedor LIKE '%"%' THEN 'String con comillas'
    ELSE 'Texto plano'
  END as formato
FROM registros
WHERE contenedor IS NOT NULL 
  AND contenedor != ''
  AND deleted_at IS NULL
LIMIT 10;

