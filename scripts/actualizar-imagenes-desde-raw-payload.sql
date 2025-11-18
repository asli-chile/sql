-- =====================================================
-- ACTUALIZAR IMÁGENES DESDE RAW_PAYLOAD
-- =====================================================
-- Este script extrae la imagen del campo raw_payload
-- y la guarda en vessel_image para registros que no la tienen
-- =====================================================

-- 1. Verificar que el campo vessel_image existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' AND column_name = 'vessel_image'
  ) THEN
    ALTER TABLE vessel_positions ADD COLUMN vessel_image TEXT;
    RAISE NOTICE 'Campo vessel_image agregado a vessel_positions';
  ELSE
    RAISE NOTICE 'Campo vessel_image ya existe en vessel_positions';
  END IF;
END $$;

-- 2. Actualizar vessel_positions con imágenes desde raw_payload
-- IMPORTANTE: Extraemos la URL completa del campo image (es un link/URL)
UPDATE vessel_positions
SET vessel_image = COALESCE(
  -- Intentar extraer desde detail.image (ubicación estándar de DataDocked)
  NULLIF(TRIM(raw_payload->'detail'->>'image'), ''),
  -- Si no está en detail, intentar directamente en el root
  NULLIF(TRIM(raw_payload->>'image'), ''),
  -- Mantener el valor actual si existe
  vessel_image
)
WHERE 
  -- Solo actualizar si vessel_image es NULL pero raw_payload tiene datos
  vessel_image IS NULL 
  AND raw_payload IS NOT NULL
  AND (
    -- Verificar que existe una URL válida en raw_payload
    (raw_payload->'detail'->>'image' IS NOT NULL AND TRIM(raw_payload->'detail'->>'image') != '')
    OR (raw_payload->>'image' IS NOT NULL AND TRIM(raw_payload->>'image') != '')
  );

-- Mostrar cuántos registros se actualizaron
DO $$
DECLARE
  registros_actualizados INTEGER;
BEGIN
  GET DIAGNOSTICS registros_actualizados = ROW_COUNT;
  RAISE NOTICE 'Registros actualizados en vessel_positions: %', registros_actualizados;
END $$;

-- 3. Verificar que el campo vessel_image existe en vessel_position_history
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vessel_position_history' AND column_name = 'vessel_image'
  ) THEN
    ALTER TABLE vessel_position_history ADD COLUMN vessel_image TEXT;
    RAISE NOTICE 'Campo vessel_image agregado a vessel_position_history';
  ELSE
    RAISE NOTICE 'Campo vessel_image ya existe en vessel_position_history';
  END IF;
END $$;

-- 4. Actualizar vessel_position_history con imágenes desde raw_payload
-- IMPORTANTE: Extraemos la URL completa del campo image (es un link/URL)
UPDATE vessel_position_history
SET vessel_image = COALESCE(
  -- Intentar extraer desde detail.image (ubicación estándar de DataDocked)
  NULLIF(TRIM(raw_payload->'detail'->>'image'), ''),
  -- Si no está en detail, intentar directamente en el root
  NULLIF(TRIM(raw_payload->>'image'), ''),
  -- Mantener el valor actual si existe
  vessel_image
)
WHERE 
  -- Solo actualizar si vessel_image es NULL pero raw_payload tiene datos
  vessel_image IS NULL 
  AND raw_payload IS NOT NULL
  AND (
    -- Verificar que existe una URL válida en raw_payload
    (raw_payload->'detail'->>'image' IS NOT NULL AND TRIM(raw_payload->'detail'->>'image') != '')
    OR (raw_payload->>'image' IS NOT NULL AND TRIM(raw_payload->>'image') != '')
  );

-- Mostrar cuántos registros se actualizaron
DO $$
DECLARE
  registros_actualizados INTEGER;
BEGIN
  GET DIAGNOSTICS registros_actualizados = ROW_COUNT;
  RAISE NOTICE 'Registros actualizados en vessel_position_history: %', registros_actualizados;
END $$;

-- 5. Verificar resultados
SELECT 
  'vessel_positions' as tabla,
  COUNT(*) as total_registros,
  COUNT(vessel_image) as registros_con_imagen,
  COUNT(*) - COUNT(vessel_image) as registros_sin_imagen
FROM vessel_positions
UNION ALL
SELECT 
  'vessel_position_history' as tabla,
  COUNT(*) as total_registros,
  COUNT(vessel_image) as registros_con_imagen,
  COUNT(*) - COUNT(vessel_image) as registros_sin_imagen
FROM vessel_position_history;

-- 6. Mostrar algunos ejemplos de imágenes extraídas
SELECT 
  vessel_name,
  vessel_image,
  CASE 
    WHEN vessel_image IS NOT NULL THEN '✅ Imagen guardada'
    WHEN raw_payload->'detail'->>'image' IS NOT NULL THEN '⚠️ Imagen en raw_payload pero no en vessel_image'
    ELSE '❌ Sin imagen'
  END AS estado
FROM vessel_positions
WHERE raw_payload IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;

