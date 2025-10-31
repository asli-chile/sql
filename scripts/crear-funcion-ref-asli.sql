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
  SELECT COALESCE(MAX(
    CASE 
      WHEN ref_asli ~ '^A\d+$' THEN 
        CAST(SUBSTRING(ref_asli FROM '^A(\d+)$') AS INTEGER)
      ELSE 0
    END
  ), 0) INTO max_numero
  FROM registros
  WHERE deleted_at IS NULL
    AND ref_asli ~ '^A\d+$';
  
  -- Si no hay registros, empezar desde 1
  IF max_numero IS NULL OR max_numero = 0 THEN
    siguiente_numero := 1;
  ELSE
    siguiente_numero := max_numero + 1;
  END IF;
  
  -- Buscar el primer número disponible (por si hay huecos)
  WHILE EXISTS (
    SELECT 1 
    FROM registros 
    WHERE deleted_at IS NULL
      AND ref_asli = 'A' || LPAD(siguiente_numero::TEXT, 4, '0')
  ) LOOP
    siguiente_numero := siguiente_numero + 1;
  END LOOP;
  
  -- Generar el REF ASLI con formato A0001
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
  SELECT COALESCE(MAX(
    CASE 
      WHEN ref_asli ~ '^A\d+$' THEN 
        CAST(SUBSTRING(ref_asli FROM '^A(\d+)$') AS INTEGER)
      ELSE 0
    END
  ), 0) INTO max_numero
  FROM registros
  WHERE deleted_at IS NULL
    AND ref_asli ~ '^A\d+$';
  
  -- Empezar desde el siguiente al máximo
  siguiente_numero := COALESCE(max_numero, 0) + 1;
  
  -- Generar los REF ASLI
  FOR i IN 1..cantidad LOOP
    -- Buscar el siguiente número disponible
    WHILE EXISTS (
      SELECT 1 
      FROM registros 
      WHERE deleted_at IS NULL
        AND ref_asli = 'A' || LPAD(siguiente_numero::TEXT, 4, '0')
    ) LOOP
      siguiente_numero := siguiente_numero + 1;
    END LOOP;
    
    -- Generar el REF ASLI
    ref_asli_result := 'A' || LPAD(siguiente_numero::TEXT, 4, '0');
    ref_asli_list := array_append(ref_asli_list, ref_asli_result);
    
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
    WHERE deleted_at IS NULL
      AND ref_asli = ref_asli_to_check
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

