-- =====================================================
-- VERIFICAR QUE LA FUNCIÓN EXISTE Y FUNCIONA
-- =====================================================

-- Verificar si la función existe
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%ref_asli%'
ORDER BY routine_name;

-- Probar la función
SELECT get_next_ref_asli() as "Siguiente REF ASLI";

-- Ver cuántos registros hay
SELECT COUNT(*) as total_registros FROM registros WHERE deleted_at IS NULL;

-- Ver el máximo REF ASLI actual
SELECT MAX(
  CASE 
    WHEN ref_asli ~ '^A\d+$' THEN 
      CAST(SUBSTRING(ref_asli FROM '^A(\d+)$') AS INTEGER)
    ELSE 0
  END
) as max_numero
FROM registros
WHERE deleted_at IS NULL
  AND ref_asli ~ '^A\d+$';

-- Ver algunos REF ASLI existentes
SELECT ref_asli
FROM registros
WHERE deleted_at IS NULL
  AND ref_asli ~ '^A\d+$'
ORDER BY CAST(SUBSTRING(ref_asli FROM '^A(\d+)$') AS INTEGER) DESC
LIMIT 10;

