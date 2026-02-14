-- =====================================================
-- CORREGIR TODAS LAS REFERENCIAS ASLI DUPLICADAS
-- =====================================================
-- Este script corrige TODAS las referencias duplicadas
-- sin importar el prefijo (POMACEA, GENERIC, CHERRY, etc.)
-- =====================================================

-- PASO 1: Identificar TODAS las referencias duplicadas
SELECT 
  ref_asli, 
  COUNT(*) as cantidad,
  array_agg(id ORDER BY created_at) as ids,
  array_agg(created_at ORDER BY created_at) as fechas_creacion
FROM registros
WHERE deleted_at IS NULL
  AND ref_asli IS NOT NULL
  AND ref_asli != ''
GROUP BY ref_asli
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, ref_asli;

-- PASO 2: Ver detalles de los registros duplicados
SELECT 
  id,
  ref_asli,
  ref_cliente,
  especie,
  temporada,
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
ORDER BY ref_asli, created_at ASC;

-- =====================================================
-- SOLUCIÓN AUTOMÁTICA UNIVERSAL
-- =====================================================
-- Corrige TODOS los duplicados de cualquier prefijo

DO $$
DECLARE
  duplicate_record RECORD;
  new_ref_asli TEXT;
  max_num INTEGER;
  current_year TEXT;
  especie_val TEXT;
  temporada_val TEXT;
  prefix TEXT;
  ref_prefix TEXT;
  ref_year TEXT;
BEGIN
  current_year := TO_CHAR(NOW(), 'YYYY');
  
  RAISE NOTICE '🔄 Iniciando corrección de referencias duplicadas...';
  
  -- Para cada referencia duplicada (de cualquier tipo)
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
        AND ref_asli IS NOT NULL
        AND ref_asli != ''
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
    
    -- Extraer el prefijo de la referencia actual (todo antes del último guión)
    ref_prefix := REGEXP_REPLACE(duplicate_record.ref_asli, '-\d+$', '');
    
    RAISE NOTICE '📝 Procesando duplicado: ID=%, REF_ASLI=%, PREFIJO=%', 
      duplicate_record.id, 
      duplicate_record.ref_asli,
      ref_prefix;
    
    -- Obtener el siguiente número disponible para ese prefijo
    SELECT COALESCE(MAX(
      CASE 
        WHEN ref_asli ~ ('^' || ref_prefix || '-\d+$')
             AND SUBSTRING(ref_asli FROM '-(\d+)$') ~ '^\d+$'
        THEN CAST(SUBSTRING(ref_asli FROM '-(\d+)$') AS INTEGER)
        ELSE 0
      END
    ), 0) + 1
    INTO max_num
    FROM registros
    WHERE ref_asli LIKE ref_prefix || '-%'
      AND deleted_at IS NULL;
    
    -- Generar la nueva referencia
    new_ref_asli := ref_prefix || '-' || LPAD(max_num::TEXT, 4, '0');
    
    -- Actualizar el registro duplicado con la nueva referencia
    UPDATE registros
    SET ref_asli = new_ref_asli,
        updated_at = NOW()
    WHERE id = duplicate_record.id;
    
    RAISE NOTICE '✅ Corregido: ID % | Antigua: % → Nueva: %', 
      duplicate_record.id, 
      duplicate_record.ref_asli, 
      new_ref_asli;
  END LOOP;
  
  RAISE NOTICE '✅ Proceso completado. Verificar las referencias corregidas.';
END $$;

-- PASO 3: Verificar que no queden duplicados
SELECT 
  ref_asli, 
  COUNT(*) as cantidad
FROM registros
WHERE deleted_at IS NULL
  AND ref_asli IS NOT NULL
GROUP BY ref_asli
HAVING COUNT(*) > 1
ORDER BY ref_asli;

-- Si esta consulta no devuelve filas = ✅ No hay duplicados

-- PASO 4: Ver todas las referencias ordenadas para verificar secuencia
SELECT 
  ref_asli,
  ref_cliente,
  especie,
  temporada,
  shipper,
  created_at
FROM registros
WHERE deleted_at IS NULL
  AND ref_asli IS NOT NULL
ORDER BY 
  SUBSTRING(ref_asli FROM '^([A-Z-]+)'),  -- Agrupa por prefijo
  CASE 
    WHEN SUBSTRING(ref_asli FROM '-(\d+)$') ~ '^\d+$'
    THEN CAST(SUBSTRING(ref_asli FROM '-(\d+)$') AS INTEGER)
    ELSE 0
  END DESC
LIMIT 50;

-- PASO 5: Resumen de referencias por prefijo
SELECT 
  SUBSTRING(ref_asli FROM '^([A-Z-]+)') as prefijo,
  COUNT(*) as total_registros,
  MAX(
    CASE 
      WHEN SUBSTRING(ref_asli FROM '-(\d+)$') ~ '^\d+$'
      THEN CAST(SUBSTRING(ref_asli FROM '-(\d+)$') AS INTEGER)
      ELSE 0
    END
  ) as ultimo_numero
FROM registros
WHERE deleted_at IS NULL
  AND ref_asli IS NOT NULL
GROUP BY SUBSTRING(ref_asli FROM '^([A-Z-]+)')
ORDER BY prefijo;

-- =====================================================
-- NOTAS:
-- =====================================================
-- ✅ Este script corrige duplicados de CUALQUIER prefijo:
--    - GENERIC-2026-0001
--    - POMACEA-CAROZO-2026-0119
--    - CHERRY-25-26-0001
--    - Etc.
--
-- ✅ Mantiene el PRIMER registro con su ref_asli original
-- ✅ Asigna nuevas referencias secuenciales a los duplicados
-- ✅ Usa expresiones regulares para extraer prefijos dinámicamente
-- ✅ Funciona con cualquier formato de referencia
-- =====================================================
