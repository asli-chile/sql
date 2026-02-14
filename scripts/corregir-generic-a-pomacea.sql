-- =====================================================
-- CORREGIR REFERENCIAS GENERIC A POMACEA-CAROZO-2026
-- =====================================================
-- Este script corrige referencias GENERIC que deberían ser POMACEA-CAROZO
-- y elimina duplicados de POMACEA-CAROZO-2026
-- =====================================================

-- PASO 1: Identificar registros GENERIC que deberían ser POMACEA-CAROZO
SELECT 
  id,
  ref_asli,
  ref_cliente,
  especie,
  temporada,
  shipper,
  created_at
FROM registros
WHERE deleted_at IS NULL
  AND ref_asli LIKE 'GENERIC-2026-%'
  AND (
    LOWER(especie) LIKE '%ciruela%'
    OR LOWER(especie) LIKE '%manzana%'
    OR LOWER(especie) LIKE '%kiwi%'
    OR LOWER(especie) LIKE '%durazno%'
    OR LOWER(especie) LIKE '%plum%'
    OR LOWER(especie) LIKE '%apple%'
    OR LOWER(especie) LIKE '%peach%'
    OR LOWER(especie) LIKE '%nectarin%'
  )
ORDER BY created_at;

-- PASO 2: Ver el estado actual de referencias POMACEA-CAROZO duplicadas
SELECT 
  ref_asli, 
  COUNT(*) as cantidad,
  array_agg(id ORDER BY created_at) as ids,
  array_agg(especie ORDER BY created_at) as especies
FROM registros
WHERE deleted_at IS NULL
  AND ref_asli LIKE 'POMACEA-CAROZO-2026-%'
GROUP BY ref_asli
HAVING COUNT(*) > 1
ORDER BY ref_asli;

-- PASO 3: Ver el último número usado en POMACEA-CAROZO-2026
SELECT 
  ref_asli,
  CASE 
    WHEN SPLIT_PART(ref_asli, '-', 4) ~ '^\d+$'
    THEN CAST(SPLIT_PART(ref_asli, '-', 4) AS INTEGER)
    ELSE NULL
  END as numero,
  especie,
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
-- 1. Corrige referencias GENERIC → POMACEA-CAROZO
-- 2. Corrige duplicados de POMACEA-CAROZO

DO $$
DECLARE
  record_to_fix RECORD;
  new_ref_asli TEXT;
  max_num INTEGER;
  counter INTEGER := 0;
BEGIN
  RAISE NOTICE '🔄 Iniciando corrección de referencias...';
  
  -- PARTE 1: Corregir GENERIC → POMACEA-CAROZO
  RAISE NOTICE '';
  RAISE NOTICE '📝 PARTE 1: Corrigiendo GENERIC a POMACEA-CAROZO...';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  
  FOR record_to_fix IN (
    SELECT 
      id,
      ref_asli,
      especie,
      created_at
    FROM registros
    WHERE deleted_at IS NULL
      AND ref_asli LIKE 'GENERIC-2026-%'
      AND (
        LOWER(especie) LIKE '%ciruela%'
        OR LOWER(especie) LIKE '%manzana%'
        OR LOWER(especie) LIKE '%kiwi%'
        OR LOWER(especie) LIKE '%durazno%'
        OR LOWER(especie) LIKE '%plum%'
        OR LOWER(especie) LIKE '%apple%'
        OR LOWER(especie) LIKE '%peach%'
        OR LOWER(especie) LIKE '%nectarin%'
      )
    ORDER BY created_at
  )
  LOOP
    -- Obtener el siguiente número disponible
    SELECT COALESCE(MAX(
      CASE 
        WHEN SPLIT_PART(ref_asli, '-', 4) ~ '^\d+$' 
        THEN CAST(SPLIT_PART(ref_asli, '-', 4) AS INTEGER)
        ELSE 0
      END
    ), 0) + 1
    INTO max_num
    FROM registros
    WHERE ref_asli LIKE 'POMACEA-CAROZO-2026-%'
      AND deleted_at IS NULL;
    
    -- Generar nueva referencia
    new_ref_asli := 'POMACEA-CAROZO-2026-' || LPAD(max_num::TEXT, 4, '0');
    
    -- Actualizar
    UPDATE registros
    SET ref_asli = new_ref_asli,
        temporada = 'POMACEA-CAROZO-2026',
        updated_at = NOW()
    WHERE id = record_to_fix.id;
    
    counter := counter + 1;
    RAISE NOTICE '✅ ID: % | % → % (Especie: %)', 
      record_to_fix.id,
      record_to_fix.ref_asli,
      new_ref_asli,
      record_to_fix.especie;
  END LOOP;
  
  RAISE NOTICE '✅ Corregidos % registros GENERIC → POMACEA-CAROZO', counter;
  
  -- PARTE 2: Corregir duplicados de POMACEA-CAROZO
  RAISE NOTICE '';
  RAISE NOTICE '📝 PARTE 2: Corrigiendo duplicados de POMACEA-CAROZO...';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  
  counter := 0;
  
  FOR record_to_fix IN (
    WITH duplicates AS (
      SELECT 
        ref_asli,
        id,
        especie,
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
    -- Obtener el siguiente número disponible
    SELECT COALESCE(MAX(
      CASE 
        WHEN SPLIT_PART(ref_asli, '-', 4) ~ '^\d+$' 
        THEN CAST(SPLIT_PART(ref_asli, '-', 4) AS INTEGER)
        ELSE 0
      END
    ), 0) + 1
    INTO max_num
    FROM registros
    WHERE ref_asli LIKE 'POMACEA-CAROZO-2026-%'
      AND deleted_at IS NULL;
    
    -- Generar nueva referencia
    new_ref_asli := 'POMACEA-CAROZO-2026-' || LPAD(max_num::TEXT, 4, '0');
    
    -- Actualizar
    UPDATE registros
    SET ref_asli = new_ref_asli,
        updated_at = NOW()
    WHERE id = record_to_fix.id;
    
    counter := counter + 1;
    RAISE NOTICE '✅ ID: % | % → % (Especie: %)', 
      record_to_fix.id,
      record_to_fix.ref_asli,
      new_ref_asli,
      record_to_fix.especie;
  END LOOP;
  
  RAISE NOTICE '✅ Corregidos % duplicados de POMACEA-CAROZO', counter;
  RAISE NOTICE '';
  RAISE NOTICE '✅ PROCESO COMPLETADO';
END $$;

-- PASO 4: Verificar que no queden referencias GENERIC incorrectas
SELECT 
  COUNT(*) as total_generic_incorrectos
FROM registros
WHERE deleted_at IS NULL
  AND ref_asli LIKE 'GENERIC-2026-%'
  AND (
    LOWER(especie) LIKE '%ciruela%'
    OR LOWER(especie) LIKE '%manzana%'
    OR LOWER(especie) LIKE '%kiwi%'
    OR LOWER(especie) LIKE '%durazno%'
    OR LOWER(especie) LIKE '%plum%'
    OR LOWER(especie) LIKE '%apple%'
    OR LOWER(especie) LIKE '%peach%'
    OR LOWER(especie) LIKE '%nectarin%'
  );
-- Debe devolver 0 ✅

-- PASO 5: Verificar que no queden duplicados de POMACEA-CAROZO
SELECT 
  ref_asli, 
  COUNT(*) as cantidad
FROM registros
WHERE deleted_at IS NULL
  AND ref_asli LIKE 'POMACEA-CAROZO-2026-%'
GROUP BY ref_asli
HAVING COUNT(*) > 1
ORDER BY ref_asli;
-- No debe devolver filas ✅

-- PASO 6: Ver las últimas referencias POMACEA-CAROZO generadas
SELECT 
  ref_asli,
  ref_cliente,
  especie,
  temporada,
  shipper,
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
LIMIT 30;

-- =====================================================
-- RESUMEN DE CAMBIOS:
-- =====================================================
-- ✅ Registros con GENERIC-2026-XXXX (especie pomácea/carozo)
--    → Convertidos a POMACEA-CAROZO-2026-YYYY
--
-- ✅ Duplicados de POMACEA-CAROZO-2026-XXXX
--    → Primer registro mantiene número original
--    → Duplicados reciben nuevos números secuenciales
--
-- ✅ Temporada actualizada a POMACEA-CAROZO-2026
-- =====================================================
