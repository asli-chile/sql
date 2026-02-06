-- =====================================================
-- RESTAURAR NOMBRES DE NAVES DESDE REGISTROS
-- =====================================================
-- Este script restaura los nombres reales de las naves
-- en vessel_positions cuando se han cambiado a IMO-number
-- =====================================================

-- PASO 1: VER QUÉ NAVES TIENEN NOMBRES QUE PARECEN IMO
-- (nombres que empiezan con "IMO-", "MMSI-", o son solo números)
SELECT 
  vessel_name AS "Nombre actual (parece IMO)",
  imo,
  mmsi,
  last_position_at,
  last_api_call_at
FROM vessel_positions
WHERE 
  vessel_name ~ '^(IMO-|MMSI-|IMO|MMSI)[0-9]+'  -- Empieza con IMO- o MMSI- seguido de números
  OR vessel_name ~ '^[0-9]+$'  -- Solo números
  OR vessel_name ~ '^IMO[0-9]+$'  -- IMO seguido de números sin guión
ORDER BY vessel_name;

-- PASO 2: VER QUÉ NOMBRES REALES HAY EN REGISTROS
WITH nombres_desde_registros AS (
  SELECT DISTINCT
    CASE 
      WHEN nave_inicial ~ '\[.+\]' THEN 
        TRIM(REGEXP_REPLACE(nave_inicial, '\s*\[.+\]$', ''))
      ELSE 
        TRIM(nave_inicial)
    END AS nombre_real
  FROM registros
  WHERE deleted_at IS NULL
    AND estado != 'CANCELADO'
    AND (eta IS NULL OR eta > NOW())
    AND nave_inicial IS NOT NULL
    AND TRIM(nave_inicial) != ''
)
SELECT 
  nombre_real,
  COUNT(*) AS veces_en_registros
FROM nombres_desde_registros
GROUP BY nombre_real
ORDER BY nombre_real;

-- PASO 3: INTENTAR HACER MATCH POR IMO/MMSI
-- Buscar si hay otros registros en vessel_positions con el mismo IMO/MMSI pero con nombre real
WITH nombres_que_parecen_imo AS (
  SELECT 
    id,
    vessel_name AS nombre_actual,
    imo,
    mmsi
  FROM vessel_positions
  WHERE 
    vessel_name ~ '^(IMO-|MMSI-|IMO|MMSI)[0-9]+'
    OR vessel_name ~ '^[0-9]+$'
    OR vessel_name ~ '^IMO[0-9]+$'
),
nombres_reales_con_imo AS (
  SELECT 
    vessel_name AS nombre_real,
    imo,
    mmsi
  FROM vessel_positions
  WHERE 
    NOT (vessel_name ~ '^(IMO-|MMSI-|IMO|MMSI)[0-9]+')
    AND NOT (vessel_name ~ '^[0-9]+$')
    AND NOT (vessel_name ~ '^IMO[0-9]+$')
    AND (imo IS NOT NULL OR mmsi IS NOT NULL)
)
SELECT 
  n.nombre_actual AS "Nombre actual (parece IMO)",
  n.imo AS "IMO del registro con nombre IMO",
  n.mmsi AS "MMSI del registro con nombre IMO",
  r.nombre_real AS "Nombre real encontrado",
  r.imo AS "IMO del registro con nombre real",
  r.mmsi AS "MMSI del registro con nombre real",
  CASE 
    WHEN n.imo IS NOT NULL AND r.imo = n.imo THEN '✅ Coincide por IMO'
    WHEN n.mmsi IS NOT NULL AND r.mmsi = n.mmsi THEN '✅ Coincide por MMSI'
    ELSE '❌ No coincide'
  END AS "Match"
FROM nombres_que_parecen_imo n
LEFT JOIN nombres_reales_con_imo r ON 
  (n.imo IS NOT NULL AND r.imo = n.imo)
  OR (n.mmsi IS NOT NULL AND r.mmsi = n.mmsi)
ORDER BY n.nombre_actual;

-- PASO 4: ACTUALIZAR NOMBRES BASÁNDOSE EN MATCH POR IMO/MMSI
-- ⚠️ EJECUTAR SOLO DESPUÉS DE REVISAR LOS RESULTADOS DEL PASO 3
-- Este UPDATE restaura los nombres cuando hay un match por IMO/MMSI
/*
WITH nombres_que_parecen_imo AS (
  SELECT 
    id,
    vessel_name AS nombre_actual,
    imo,
    mmsi
  FROM vessel_positions
  WHERE 
    vessel_name ~ '^(IMO-|MMSI-|IMO|MMSI)[0-9]+'
    OR vessel_name ~ '^[0-9]+$'
    OR vessel_name ~ '^IMO[0-9]+$'
),
nombres_reales_con_imo AS (
  SELECT 
    vessel_name AS nombre_real,
    imo,
    mmsi
  FROM vessel_positions
  WHERE 
    NOT (vessel_name ~ '^(IMO-|MMSI-|IMO|MMSI)[0-9]+')
    AND NOT (vessel_name ~ '^[0-9]+$')
    AND NOT (vessel_name ~ '^IMO[0-9]+$')
    AND (imo IS NOT NULL OR mmsi IS NOT NULL)
)
UPDATE vessel_positions vp
SET vessel_name = r.nombre_real
FROM nombres_que_parecen_imo n
JOIN nombres_reales_con_imo r ON 
  (n.imo IS NOT NULL AND r.imo = n.imo)
  OR (n.mmsi IS NOT NULL AND r.mmsi = n.mmsi)
WHERE vp.id = n.id
  AND r.nombre_real IS NOT NULL;
*/

-- PASO 5: RESTAURAR NOMBRES DESDE REGISTROS (cuando no hay match por IMO/MMSI)
-- Este script busca nombres en registros y los actualiza en vessel_positions
-- cuando el nombre en vessel_positions parece un IMO pero hay un nombre real en registros
-- que coincide con algún otro campo o cuando el IMO/MMSI coincide con otro registro
-- que tiene el nombre real
WITH nombres_desde_registros AS (
  SELECT DISTINCT
    CASE 
      WHEN nave_inicial ~ '\[.+\]' THEN 
        TRIM(REGEXP_REPLACE(nave_inicial, '\s*\[.+\]$', ''))
      ELSE 
        TRIM(nave_inicial)
    END AS nombre_real
  FROM registros
  WHERE deleted_at IS NULL
    AND estado != 'CANCELADO'
    AND (eta IS NULL OR eta > NOW())
    AND nave_inicial IS NOT NULL
    AND TRIM(nave_inicial) != ''
),
nombres_que_parecen_imo AS (
  SELECT 
    id,
    vessel_name AS nombre_actual,
    imo,
    mmsi
  FROM vessel_positions
  WHERE 
    (vessel_name ~ '^(IMO-|MMSI-|IMO|MMSI)[0-9]+'
    OR vessel_name ~ '^[0-9]+$'
    OR vessel_name ~ '^IMO[0-9]+$')
    AND (imo IS NOT NULL OR mmsi IS NOT NULL)
),
vessel_positions_con_nombres_reales AS (
  SELECT 
    vessel_name AS nombre_real,
    imo,
    mmsi
  FROM vessel_positions
  WHERE 
    NOT (vessel_name ~ '^(IMO-|MMSI-|IMO|MMSI)[0-9]+')
    AND NOT (vessel_name ~ '^[0-9]+$')
    AND NOT (vessel_name ~ '^IMO[0-9]+$')
    AND vessel_name IN (SELECT nombre_real FROM nombres_desde_registros)
    AND (imo IS NOT NULL OR mmsi IS NOT NULL)
)
SELECT 
  n.nombre_actual AS "Nombre actual (parece IMO)",
  n.imo AS "IMO",
  n.mmsi AS "MMSI",
  vp.nombre_real AS "Nombre real sugerido (desde otro registro con mismo IMO/MMSI)",
  CASE 
    WHEN vp.nombre_real IS NOT NULL THEN '✅ Se puede restaurar'
    ELSE '⚠️ No hay match por IMO/MMSI'
  END AS "Estado"
FROM nombres_que_parecen_imo n
LEFT JOIN vessel_positions_con_nombres_reales vp ON 
  (n.imo IS NOT NULL AND vp.imo = n.imo)
  OR (n.mmsi IS NOT NULL AND vp.mmsi = n.mmsi)
ORDER BY n.nombre_actual;

-- PASO 6: UPDATE FINAL - Restaurar nombres desde otros registros con mismo IMO/MMSI
-- ⚠️ EJECUTAR SOLO DESPUÉS DE REVISAR LOS RESULTADOS DEL PASO 5
/*
WITH nombres_que_parecen_imo AS (
  SELECT 
    id,
    vessel_name AS nombre_actual,
    imo,
    mmsi
  FROM vessel_positions
  WHERE 
    (vessel_name ~ '^(IMO-|MMSI-|IMO|MMSI)[0-9]+'
    OR vessel_name ~ '^[0-9]+$'
    OR vessel_name ~ '^IMO[0-9]+$')
    AND (imo IS NOT NULL OR mmsi IS NOT NULL)
),
vessel_positions_con_nombres_reales AS (
  SELECT 
    vessel_name AS nombre_real,
    imo,
    mmsi
  FROM vessel_positions
  WHERE 
    NOT (vessel_name ~ '^(IMO-|MMSI-|IMO|MMSI)[0-9]+')
    AND NOT (vessel_name ~ '^[0-9]+$')
    AND NOT (vessel_name ~ '^IMO[0-9]+$')
    AND (imo IS NOT NULL OR mmsi IS NOT NULL)
)
UPDATE vessel_positions vp
SET vessel_name = r.nombre_real
FROM nombres_que_parecen_imo n
JOIN vessel_positions_con_nombres_reales r ON 
  (n.imo IS NOT NULL AND r.imo = n.imo)
  OR (n.mmsi IS NOT NULL AND r.mmsi = n.mmsi)
WHERE vp.id = n.id
  AND r.nombre_real IS NOT NULL;
*/
