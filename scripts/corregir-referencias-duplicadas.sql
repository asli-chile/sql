-- =====================================================
-- CORREGIR REFERENCIAS ASLI DUPLICADAS
-- =====================================================
-- Este script identifica y corrige referencias ASLI duplicadas
-- Ejecutar en el SQL Editor de Supabase
-- =====================================================

-- PASO 1: Identificar referencias duplicadas
SELECT 
  ref_asli, 
  COUNT(*) as cantidad,
  array_agg(id ORDER BY created_at) as ids,
  array_agg(created_at ORDER BY created_at) as fechas_creacion
FROM registros
WHERE deleted_at IS NULL
  AND ref_asli LIKE 'POMACEA-CAROZO-2026-%'
GROUP BY ref_asli
HAVING COUNT(*) > 1
ORDER BY ref_asli DESC;

-- PASO 2: Ver detalles de los registros duplicados
SELECT 
  id,
  ref_asli,
  ref_cliente,
  especie,
  shipper,
  created_at,
  created_by
FROM registros
WHERE ref_asli IN (
  SELECT ref_asli
  FROM registros
  WHERE deleted_at IS NULL
  GROUP BY ref_asli
  HAVING COUNT(*) > 1
)
ORDER BY ref_asli DESC, created_at ASC;

-- PASO 3: Encontrar el último número usado correctamente
SELECT 
  ref_asli,
  CASE 
    WHEN SPLIT_PART(ref_asli, '-', 4) ~ '^\d+$'
    THEN CAST(SPLIT_PART(ref_asli, '-', 4) AS INTEGER)
    ELSE NULL
  END as numero,
  created_at
FROM registros
WHERE ref_asli LIKE 'POMACEA-CAROZO-2026-%'
  AND deleted_at IS NULL
  AND SPLIT_PART(ref_asli, '-', 4) ~ '^\d+$'
ORDER BY 
  CASE 
    WHEN SPLIT_PART(ref_asli, '-', 4) ~ '^\d+$'
    THEN CAST(SPLIT_PART(ref_asli, '-', 4) AS INTEGER)
    ELSE 0
  END DESC
LIMIT 10;

-- =====================================================
-- SOLUCIÓN AUTOMÁTICA
-- =====================================================
-- Este código regenerará las referencias para los duplicados,
-- manteniendo el primer registro con su ref_asli original
-- y asignando nuevas referencias secuenciales a los duplicados

DO $$
DECLARE
  duplicate_record RECORD;
  new_ref_asli TEXT;
  max_num INTEGER;
  current_year TEXT;
  especie_val TEXT;
  temporada_val TEXT;
  prefix TEXT;
BEGIN
  current_year := TO_CHAR(NOW(), 'YYYY');
  
  -- Para cada referencia duplicada
  FOR duplicate_record IN (
    WITH duplicates AS (
      SELECT 
        ref_asli,
        id,
        especie,
        temporada,
        created_at,
        ROW_NUMBER() OVER (PARTITION BY ref_asli ORDER BY created_at) as rn
      FROM registros
      WHERE deleted_at IS NULL
        AND ref_asli LIKE 'POMACEA-CAROZO-2026-%'
    )
    SELECT * 
    FROM duplicates 
    WHERE ref_asli IN (
      SELECT ref_asli 
      FROM duplicates 
      GROUP BY ref_asli 
      HAVING COUNT(*) > 1
    )
    AND rn > 1  -- Solo los duplicados (no el primero)
    ORDER BY created_at
  )
  LOOP
    especie_val := duplicate_record.especie;
    temporada_val := duplicate_record.temporada;
    
    -- Determinar el prefijo según especie y temporada
    IF especie_val = 'Pomáceas' AND temporada_val = 'Carozo' THEN
      prefix := 'POMACEA-CAROZO';
    ELSIF especie_val = 'Pomáceas' AND temporada_val = 'Cereza' THEN
      prefix := 'POMACEA-CEREZA';
    ELSIF especie_val = 'Carozo' AND temporada_val = 'Pomáceas' THEN
      prefix := 'CAROZO-POMACEA';
    ELSIF especie_val = 'Carozo' AND temporada_val = 'Cereza' THEN
      prefix := 'CAROZO-CEREZA';
    ELSIF especie_val = 'Cereza' AND temporada_val = 'Pomáceas' THEN
      prefix := 'CEREZA-POMACEA';
    ELSIF especie_val = 'Cereza' AND temporada_val = 'Carozo' THEN
      prefix := 'CEREZA-CAROZO';
    ELSE
      prefix := 'GENERIC';
    END IF;
    
    -- Obtener el siguiente número disponible para ese prefijo
    SELECT COALESCE(MAX(
      CASE 
        WHEN SPLIT_PART(ref_asli, '-', 4) ~ '^\d+$' 
        THEN CAST(SPLIT_PART(ref_asli, '-', 4) AS INTEGER)
        ELSE 0
      END
    ), 0) + 1
    INTO max_num
    FROM registros
    WHERE ref_asli LIKE prefix || '-' || current_year || '-%'
      AND deleted_at IS NULL;
    
    -- Generar la nueva referencia
    new_ref_asli := prefix || '-' || current_year || '-' || LPAD(max_num::TEXT, 4, '0');
    
    -- Actualizar el registro duplicado con la nueva referencia
    UPDATE registros
    SET ref_asli = new_ref_asli,
        updated_at = NOW()
    WHERE id = duplicate_record.id;
    
    RAISE NOTICE 'Corregido: ID % | Antigua: % → Nueva: %', 
      duplicate_record.id, 
      duplicate_record.ref_asli, 
      new_ref_asli;
  END LOOP;
  
  RAISE NOTICE 'Proceso completado. Verificar las referencias corregidas.';
END $$;

-- PASO 4: Verificar que no queden duplicados
SELECT 
  ref_asli, 
  COUNT(*) as cantidad
FROM registros
WHERE deleted_at IS NULL
  AND ref_asli LIKE '%-2026-%'
GROUP BY ref_asli
HAVING COUNT(*) > 1
ORDER BY ref_asli DESC;

-- Si no devuelve filas, significa que ya no hay duplicados ✅

-- PASO 5: Ver las últimas referencias generadas para verificar secuencia
SELECT 
  ref_asli,
  ref_cliente,
  especie,
  temporada,
  created_at
FROM registros
WHERE ref_asli LIKE 'POMACEA-CAROZO-2026-%'
  AND deleted_at IS NULL
  AND SPLIT_PART(ref_asli, '-', 4) ~ '^\d+$'
ORDER BY 
  CASE 
    WHEN SPLIT_PART(ref_asli, '-', 4) ~ '^\d+$'
    THEN CAST(SPLIT_PART(ref_asli, '-', 4) AS INTEGER)
    ELSE 0
  END DESC
LIMIT 20;

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================
-- 1. El script mantiene el PRIMER registro creado con su ref_asli original
-- 2. Los duplicados reciben nuevas referencias secuenciales
-- 3. Se actualiza el campo updated_at para registrar el cambio
-- 4. Ejecutar PASO 4 para confirmar que no quedan duplicados
-- 5. Si hay más duplicados con otros prefijos, ajustar el LIKE en el WHERE
