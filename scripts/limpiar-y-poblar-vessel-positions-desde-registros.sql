-- =====================================================
-- POBLAR vessel_positions DESDE registros
-- =====================================================
-- Este script:
-- 1. Agrega columna registro_id si no existe (para enlazar con registros)
-- 2. Pobla vessel_positions con las naves únicas de registros
--    usando el nombre parseado y enlazado al id del registro más reciente
-- 
-- NOTA: Antes de ejecutar este script, ejecuta primero:
--       scripts/borrar-todos-datos-vessel-positions.sql
--       para limpiar la tabla si es necesario
-- =====================================================

-- PASO 1: Agregar columna registro_id si no existe
-- Esta columna enlazará cada nave con el registro más reciente que la usa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'vessel_positions' 
    AND column_name = 'registro_id'
  ) THEN
    ALTER TABLE vessel_positions 
    ADD COLUMN registro_id UUID REFERENCES registros(id) ON DELETE SET NULL;
    
    -- Crear índice para mejorar consultas
    CREATE INDEX IF NOT EXISTS idx_vessel_positions_registro_id 
    ON vessel_positions(registro_id);
    
    COMMENT ON COLUMN vessel_positions.registro_id IS 
    'ID del registro más reciente que usa esta nave (para referencia)';
    
    RAISE NOTICE '✅ Columna registro_id agregada a vessel_positions';
  ELSE
    RAISE NOTICE 'ℹ️ Columna registro_id ya existe en vessel_positions';
  END IF;
END $$;

-- PASO 2: Ver qué naves se van a crear (solo para información)
-- Ejecuta esto primero para ver qué se va a hacer
WITH naves_unicas AS (
  SELECT DISTINCT
    CASE 
      WHEN nave_inicial ~ '\[.+\]' THEN 
        TRIM(REGEXP_REPLACE(nave_inicial, '\s*\[.+\]$', ''))
      ELSE 
        TRIM(nave_inicial)
    END AS parsed_vessel_name,
    nave_inicial AS raw_nave_inicial,
    id AS registro_id,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY 
        CASE 
          WHEN nave_inicial ~ '\[.+\]' THEN 
            TRIM(REGEXP_REPLACE(nave_inicial, '\s*\[.+\]$', ''))
          ELSE 
            TRIM(nave_inicial)
        END
      ORDER BY created_at DESC
    ) AS rn
  FROM registros
  WHERE deleted_at IS NULL
    AND nave_inicial IS NOT NULL
    AND TRIM(nave_inicial) != ''
)
SELECT 
  parsed_vessel_name AS "Nombre de la nave (parseado)",
  raw_nave_inicial AS "Nombre original en registros",
  registro_id AS "ID del registro más reciente",
  created_at AS "Fecha del registro"
FROM naves_unicas
WHERE rn = 1
ORDER BY parsed_vessel_name;

-- PASO 3: POBLAR vessel_positions CON NAVES ÚNICAS DE registros
-- Este INSERT crea un registro en vessel_positions por cada nave única,
-- usando el nombre parseado y enlazándolo al registro más reciente
-- Descomenta cuando estés listo para poblar:
/*
INSERT INTO vessel_positions (
  vessel_name,
  registro_id,
  created_at,
  updated_at
)
WITH naves_unicas AS (
  SELECT DISTINCT
    CASE 
      WHEN nave_inicial ~ '\[.+\]' THEN 
        TRIM(REGEXP_REPLACE(nave_inicial, '\s*\[.+\]$', ''))
      ELSE 
        TRIM(nave_inicial)
    END AS parsed_vessel_name,
    id AS registro_id,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY 
        CASE 
          WHEN nave_inicial ~ '\[.+\]' THEN 
            TRIM(REGEXP_REPLACE(nave_inicial, '\s*\[.+\]$', ''))
          ELSE 
            TRIM(nave_inicial)
        END
      ORDER BY created_at DESC
    ) AS rn
  FROM registros
  WHERE deleted_at IS NULL
    AND nave_inicial IS NOT NULL
    AND TRIM(nave_inicial) != ''
)
SELECT 
  parsed_vessel_name AS vessel_name,
  registro_id,
  NOW() AS created_at,
  NOW() AS updated_at
FROM naves_unicas
WHERE rn = 1
ON CONFLICT (vessel_name) DO UPDATE SET
  registro_id = EXCLUDED.registro_id,
  updated_at = NOW();
*/

-- PASO 4: VERIFICAR RESULTADOS
-- Ejecuta esto después de poblar para verificar que todo esté correcto:
/*
SELECT 
  vp.vessel_name AS "Nombre de la nave",
  vp.registro_id AS "ID del registro",
  r.nave_inicial AS "Nombre original en registros",
  r.ref_asli AS "Ref ASLI",
  r.booking AS "Booking",
  r.eta AS "ETA",
  vp.created_at AS "Creado en",
  vp.updated_at AS "Actualizado en"
FROM vessel_positions vp
LEFT JOIN registros r ON vp.registro_id = r.id
ORDER BY vp.vessel_name;
*/

-- PASO 5: ESTADÍSTICAS
-- Ver cuántas naves se crearon:
/*
SELECT 
  COUNT(*) AS total_naves,
  COUNT(registro_id) AS naves_con_registro_id,
  COUNT(*) - COUNT(registro_id) AS naves_sin_registro_id
FROM vessel_positions;
*/

-- =====================================================
-- INSTRUCCIONES DE USO:
-- =====================================================
-- 1. (OPCIONAL) Si necesitas limpiar la tabla primero, ejecuta:
--    scripts/borrar-todos-datos-vessel-positions.sql
-- 
-- 2. Ejecuta el PASO 1 (se ejecuta automáticamente, agrega registro_id si no existe)
-- 
-- 3. Ejecuta el PASO 2 para ver qué naves se van a crear
-- 
-- 4. Si estás de acuerdo, descomenta y ejecuta el PASO 3 (INSERT) para poblar la tabla
-- 
-- 5. Ejecuta el PASO 4 para verificar los resultados
-- 
-- 6. Ejecuta el PASO 5 para ver estadísticas
-- =====================================================
