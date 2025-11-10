-- =====================================================
-- FUNCIÓN PARA GENERAR REF ASLI ÚNICOS
-- =====================================================
-- 
-- Esta función se ejecuta con permisos de admin (SECURITY DEFINER)
-- para poder ver TODOS los registros y encontrar el siguiente número disponible
-- =====================================================

-- Función para obtener el siguiente REF ASLI disponible
CREATE OR REPLACE FUNCTION get_next_ref_asli()
RETURNS TEXT AS $$
DECLARE
  max_numero INTEGER;
  siguiente_numero INTEGER;
  ref_asli_result TEXT;
BEGIN
  -- Obtener el número máximo de REF ASLI existentes
  -- Buscar todos los REF ASLI que coincidan con el patrón A####
  SELECT gs.candidate INTO siguiente_numero
  FROM (
    SELECT generate_series(
      1,
      COALESCE((
        SELECT COALESCE(MAX(
          CASE 
            WHEN ref_asli ~ '^A\d+$' THEN 
              CAST(SUBSTRING(ref_asli FROM '^A(\d+)$') AS INTEGER)
            ELSE 0
          END
        ), 0)
        FROM registros
        WHERE ref_asli ~ '^A\d+$'
      ), 0) + 1
    ) AS candidate
  ) AS gs
  LEFT JOIN (
    SELECT DISTINCT CAST(SUBSTRING(ref_asli FROM '^A(\d+)$') AS INTEGER) AS existente
    FROM registros
    WHERE ref_asli ~ '^A\d+$'
  ) AS existentes
  ON existentes.existente = gs.candidate
  WHERE existentes.existente IS NULL
  ORDER BY gs.candidate
  LIMIT 1;
  
  IF siguiente_numero IS NULL OR siguiente_numero < 1 THEN
    siguiente_numero := 1;
  END IF;
  
  ref_asli_result := 'A' || LPAD(siguiente_numero::TEXT, 4, '0');
  
  RETURN ref_asli_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para generar múltiples REF ASLI únicos
CREATE OR REPLACE FUNCTION get_multiple_ref_asli(cantidad INTEGER)
RETURNS TEXT[] AS $$
DECLARE
  ref_asli_list TEXT[] := ARRAY[]::TEXT[];
  max_numero INTEGER;
  siguiente_numero INTEGER;
  ref_asli_result TEXT;
  i INTEGER;
BEGIN
  -- Obtener el número máximo
  SELECT ARRAY_AGG(DISTINCT CAST(SUBSTRING(ref_asli FROM '^A(\d+)$') AS INTEGER) ORDER BY 1)
    INTO existing_numbers
  FROM registros
  WHERE ref_asli ~ '^A\d+$';
  
  IF existing_numbers IS NULL THEN
    existing_numbers := ARRAY[]::INTEGER[];
  END IF;
  
  WHILE array_length(ref_asli_list, 1) < cantidad LOOP
    IF NOT (siguiente_numero = ANY(existing_numbers)) THEN
      ref_asli_result := 'A' || LPAD(siguiente_numero::TEXT, 4, '0');
      ref_asli_list := array_append(ref_asli_list, ref_asli_result);
      existing_numbers := array_append(existing_numbers, siguiente_numero);
    END IF;
    siguiente_numero := siguiente_numero + 1;
  END LOOP;
  
  RETURN ref_asli_list;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para validar que un REF ASLI sea único
CREATE OR REPLACE FUNCTION validate_ref_asli_unique(ref_asli_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 
    FROM registros 
    WHERE ref_asli = ref_asli_to_check
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agregar comentarios
COMMENT ON FUNCTION get_next_ref_asli() IS 'Obtiene el siguiente REF ASLI disponible (A####)';
COMMENT ON FUNCTION get_multiple_ref_asli(INTEGER) IS 'Genera múltiples REF ASLI únicos';
COMMENT ON FUNCTION validate_ref_asli_unique(TEXT) IS 'Valida que un REF ASLI sea único';

-- Probar las funciones
SELECT '✅ Funciones de REF ASLI creadas exitosamente' as resultado;
SELECT get_next_ref_asli() as "Siguiente REF ASLI";
SELECT get_multiple_ref_asli(5) as "5 REF ASLI únicos";

