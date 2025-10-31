-- Script para cambiar el tipo de columna 'contenedor' de text[] a text
-- Ejecutar este script en Supabase SQL Editor

-- PASO 1: Verificar el tipo actual de la columna
SELECT 
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'registros' 
  AND column_name = 'contenedor';

-- PASO 2: Si la columna es text[] (array), primero convertir todos los datos existentes
-- Convertir arrays a texto plano con espacios
UPDATE registros
SET contenedor = (
  CASE 
    WHEN contenedor IS NULL THEN NULL
    WHEN contenedor::text = '{}' THEN ''
    WHEN contenedor::text LIKE '{%' THEN (
      -- Si es array PostgreSQL {elem1,elem2}, convertir a texto
      REPLACE(REPLACE(REPLACE(contenedor::text, '{', ''), '}', ''), ',', ' ')
    )
    WHEN contenedor::text LIKE '[%' THEN (
      -- Si es JSON array ["elem1","elem2"], convertir a texto
      SELECT string_agg(elem::text, ' ')
      FROM jsonb_array_elements_text(contenedor::jsonb) AS elem
    )
    ELSE contenedor
  END
)::text
WHERE contenedor IS NOT NULL;

-- PASO 3: Cambiar el tipo de columna de text[] a text
-- IMPORTANTE: Esto eliminará el tipo array
ALTER TABLE registros 
ALTER COLUMN contenedor TYPE text 
USING contenedor::text;

-- PASO 4: Verificar el cambio
SELECT 
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'registros' 
  AND column_name = 'contenedor';

-- PASO 5: Ver algunos ejemplos de cómo quedaron los datos
SELECT 
  id,
  ref_asli,
  contenedor,
  LENGTH(contenedor) as longitud,
  CASE 
    WHEN contenedor LIKE '[%' THEN 'Array JSON'
    WHEN contenedor LIKE '{%' THEN 'Array PostgreSQL'
    WHEN contenedor LIKE '%"%' THEN 'String con comillas'
    ELSE 'Texto plano'
  END as formato
FROM registros
WHERE contenedor IS NOT NULL 
  AND contenedor != ''
  AND deleted_at IS NULL
LIMIT 10;

