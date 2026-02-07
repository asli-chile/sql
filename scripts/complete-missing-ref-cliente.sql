-- Script para completar referencias cliente (ref_cliente) faltantes
-- Respeta la lógica de referencias únicas: [3 letras cliente][2526][3 letras especie][número correlativo]
-- Ejecutar en el SQL Editor de Supabase

-- Función auxiliar para generar las 3 letras del cliente
CREATE OR REPLACE FUNCTION generate_client_prefix(cliente_text TEXT)
RETURNS TEXT AS $$
DECLARE
  trimmed TEXT;
  words TEXT[];
  word_count INTEGER;
BEGIN
  -- Si está vacío, retornar XXX
  IF cliente_text IS NULL OR TRIM(cliente_text) = '' THEN
    RETURN 'XXX';
  END IF;

  trimmed := UPPER(TRIM(cliente_text));
  words := string_to_array(trimmed, ' ');
  word_count := array_length(words, 1);

  -- Si no hay palabras, retornar XXX
  IF word_count IS NULL OR word_count = 0 THEN
    RETURN 'XXX';
  END IF;

  -- Una sola palabra: 3 primeras letras
  IF word_count = 1 THEN
    RETURN RPAD(SUBSTRING(words[1], 1, 3), 3, 'X');
  END IF;

  -- Dos palabras: primera letra de primera palabra + 2 primeras letras de segunda
  IF word_count = 2 THEN
    RETURN RPAD(
      SUBSTRING(words[1], 1, 1) || SUBSTRING(words[2], 1, 2),
      3,
      'X'
    );
  END IF;

  -- Tres o más palabras: primeras iniciales de cada palabra (hasta 3)
  RETURN RPAD(
    SUBSTRING(words[1], 1, 1) || 
    SUBSTRING(words[2], 1, 1) || 
    COALESCE(SUBSTRING(words[3], 1, 1), 'X'),
    3,
    'X'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Función auxiliar para generar las 3 letras de la especie
CREATE OR REPLACE FUNCTION generate_especie_prefix(especie_text TEXT)
RETURNS TEXT AS $$
BEGIN
  IF especie_text IS NULL OR TRIM(especie_text) = '' THEN
    RETURN 'XXX';
  END IF;
  RETURN RPAD(UPPER(SUBSTRING(TRIM(especie_text), 1, 3)), 3, 'X');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Función para generar el prefijo completo (sin correlativo)
CREATE OR REPLACE FUNCTION generate_ref_prefix(cliente_text TEXT, especie_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN generate_client_prefix(cliente_text) || '2526' || generate_especie_prefix(especie_text);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Función para obtener el siguiente correlativo para un prefijo
CREATE OR REPLACE FUNCTION get_next_correlative(prefix_text TEXT)
RETURNS TEXT AS $$
DECLARE
  max_correlative INTEGER;
  last_ref TEXT;
  last_num TEXT;
BEGIN
  -- Buscar la referencia más alta que empiece con el prefijo
  SELECT ref_cliente
  INTO last_ref
  FROM registros
  WHERE ref_cliente IS NOT NULL
    AND ref_cliente LIKE prefix_text || '%'
    AND LENGTH(ref_cliente) >= LENGTH(prefix_text) + 3
  ORDER BY ref_cliente DESC
  LIMIT 1;

  -- Si no hay referencias existentes, empezar en 001
  IF last_ref IS NULL THEN
    RETURN '001';
  END IF;

  -- Extraer el número correlativo (últimos 3 dígitos)
  last_num := SUBSTRING(last_ref FROM LENGTH(prefix_text) + 1 FOR 3);
  
  -- Verificar que sea un número válido
  BEGIN
    max_correlative := last_num::INTEGER;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN '001';
  END;

  -- Incrementar y formatear con ceros a la izquierda
  max_correlative := max_correlative + 1;
  
  -- Si supera 999, empezar desde 001 con un sufijo
  IF max_correlative > 999 THEN
    RETURN '001';
  END IF;

  RETURN LPAD(max_correlative::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Función para generar una referencia única completa
CREATE OR REPLACE FUNCTION generate_unique_ref_cliente(
  cliente_text TEXT,
  especie_text TEXT,
  registro_id_to_exclude UUID DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  correlative TEXT;
  new_ref TEXT;
  attempts INTEGER := 0;
  max_attempts INTEGER := 100;
BEGIN
  -- Generar el prefijo
  prefix := generate_ref_prefix(cliente_text, especie_text);
  
  -- Obtener el siguiente correlativo
  correlative := get_next_correlative(prefix);
  new_ref := prefix || correlative;

  -- Verificar que la referencia no exista (excepto el registro actual si se está actualizando)
  WHILE EXISTS (
    SELECT 1
    FROM registros
    WHERE ref_cliente = new_ref
      AND (registro_id_to_exclude IS NULL OR id != registro_id_to_exclude)
  ) AND attempts < max_attempts LOOP
    -- Incrementar el correlativo
    BEGIN
      correlative := LPAD((correlative::INTEGER + 1)::TEXT, 3, '0');
    EXCEPTION
      WHEN OTHERS THEN
        correlative := '001';
    END;
    
    -- Si supera 999, usar timestamp como fallback
    IF correlative::INTEGER > 999 THEN
      correlative := LPAD((EXTRACT(EPOCH FROM NOW())::BIGINT % 1000)::TEXT, 3, '0');
    END IF;
    
    new_ref := prefix || correlative;
    attempts := attempts + 1;
  END LOOP;

  -- Si después de múltiples intentos aún hay conflicto, agregar sufijo
  IF attempts >= max_attempts THEN
    new_ref := prefix || correlative || '-' || LPAD(attempts::TEXT, 3, '0');
  END IF;

  RETURN new_ref;
END;
$$ LANGUAGE plpgsql;

-- Actualizar registros que no tienen ref_cliente
DO $$
DECLARE
  registro_record RECORD;
  new_ref_cliente TEXT;
  updated_count INTEGER := 0;
BEGIN
  -- Iterar sobre todos los registros sin ref_cliente que tengan cliente y especie
  FOR registro_record IN
    SELECT id, shipper, especie
    FROM registros
    WHERE (ref_cliente IS NULL OR ref_cliente = '')
      AND shipper IS NOT NULL
      AND shipper != ''
      AND especie IS NOT NULL
      AND especie != ''
    ORDER BY created_at ASC
  LOOP
    -- Generar referencia única
    new_ref_cliente := generate_unique_ref_cliente(
      registro_record.shipper,
      registro_record.especie,
      registro_record.id
    );

    -- Actualizar el registro
    UPDATE registros
    SET 
      ref_cliente = new_ref_cliente,
      updated_at = NOW()
    WHERE id = registro_record.id;

    updated_count := updated_count + 1;
    
    -- Log cada 100 registros actualizados
    IF updated_count % 100 = 0 THEN
      RAISE NOTICE 'Actualizados % registros...', updated_count;
    END IF;
  END LOOP;

  RAISE NOTICE 'Proceso completado. Total de registros actualizados: %', updated_count;
END $$;

-- Verificar resultados
SELECT 
  COUNT(*) as total_registros,
  COUNT(ref_cliente) as con_ref_cliente,
  COUNT(*) - COUNT(ref_cliente) as sin_ref_cliente
FROM registros
WHERE ref_cliente IS NULL OR ref_cliente = '';

-- Mostrar algunos ejemplos de referencias generadas
SELECT 
  shipper as cliente,
  especie,
  ref_cliente,
  generate_ref_prefix(shipper, especie) as prefijo_generado
FROM registros
WHERE ref_cliente IS NOT NULL
  AND ref_cliente != ''
ORDER BY updated_at DESC
LIMIT 10;

-- Limpiar funciones auxiliares (opcional, comentar si quieres mantenerlas)
-- DROP FUNCTION IF EXISTS generate_client_prefix(TEXT);
-- DROP FUNCTION IF EXISTS generate_especie_prefix(TEXT);
-- DROP FUNCTION IF EXISTS generate_ref_prefix(TEXT, TEXT);
-- DROP FUNCTION IF EXISTS get_next_correlative(TEXT);
-- DROP FUNCTION IF EXISTS generate_unique_ref_cliente(TEXT, TEXT, UUID);
