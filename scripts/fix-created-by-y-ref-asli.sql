-- ============================================
-- FIX: created_by debe guardar NOMBRE, no UUID
-- FIX: Verificar función REF ASLI
-- ============================================

-- 1. CORREGIR TRIGGER PARA GUARDAR NOMBRE EN created_by
-- ============================================

-- Eliminar trigger existente
DROP TRIGGER IF EXISTS set_registros_user_fields ON registros;

-- Recrear función para guardar NOMBRE del usuario en created_by
CREATE OR REPLACE FUNCTION set_user_fields()
RETURNS TRIGGER AS $$
DECLARE
  user_nombre TEXT;
BEGIN
  -- Obtener el NOMBRE del usuario actual desde la tabla usuarios
  SELECT nombre INTO user_nombre
  FROM usuarios
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  
  -- Si es INSERT, establecer created_by con el NOMBRE
  IF TG_OP = 'INSERT' THEN
    IF user_nombre IS NOT NULL THEN
      NEW.created_by := user_nombre;
    ELSE
      -- Si no se encuentra el usuario, usar 'Usuario' como fallback
      NEW.created_by := 'Usuario';
    END IF;
    NEW.updated_by := NEW.created_by;
  END IF;
  
  -- Si es UPDATE, establecer updated_by con el NOMBRE
  IF TG_OP = 'UPDATE' THEN
    IF user_nombre IS NOT NULL THEN
      NEW.updated_by := user_nombre;
    ELSE
      NEW.updated_by := 'Usuario';
    END IF;
    -- Mantener created_by original
    NEW.created_by := OLD.created_by;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear trigger
CREATE TRIGGER set_registros_user_fields
  BEFORE INSERT OR UPDATE ON registros
  FOR EACH ROW
  EXECUTE FUNCTION set_user_fields();

-- 2. VERIFICAR Y CORREGIR FUNCIÓN REF ASLI
-- ============================================

-- Crear o reemplazar función get_next_ref_asli
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

-- Crear o reemplazar función get_multiple_ref_asli
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

-- 3. DIAGNÓSTICO
-- ============================================

-- Ver cuántos registros hay
SELECT 
  COUNT(*) as total_registros_activos,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as registros_eliminados
FROM registros;

-- Ver el máximo REF ASLI actual
SELECT 
  MAX(
    CASE 
      WHEN ref_asli ~ '^A\d+$' THEN 
        CAST(SUBSTRING(ref_asli FROM '^A(\d+)$') AS INTEGER)
      ELSE 0
    END
  ) as max_numero_ref_asli
FROM registros
WHERE deleted_at IS NULL
  AND ref_asli ~ '^A\d+$';

-- Probar la función
SELECT get_next_ref_asli() as "Siguiente REF ASLI que debería generarse";

-- Ver algunos REF ASLI existentes
SELECT ref_asli, created_by, created_at
FROM registros
WHERE deleted_at IS NULL
  AND ref_asli ~ '^A\d+$'
ORDER BY CAST(SUBSTRING(ref_asli FROM '^A(\d+)$') AS INTEGER) DESC
LIMIT 10;

-- Ver usuarios y sus nombres
SELECT id, nombre, email, rol
FROM usuarios
ORDER BY nombre;

-- Mensaje de confirmación
SELECT '✅ Correcciones aplicadas:
- Trigger actualizado para guardar NOMBRE en created_by
- Funciones REF ASLI verificadas/creadas
- Verifica los resultados del diagnóstico arriba' as resultado;

