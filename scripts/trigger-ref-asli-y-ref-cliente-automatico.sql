-- =====================================================
-- TRIGGER PARA ASIGNAR REF_ASLI Y REF_CLIENTE AUTOMÁTICAMENTE
-- =====================================================
-- Este trigger asigna automáticamente:
-- 1. ref_asli con formato TEMPORADA-#### (ej: CHERRY-25-26-0001)
-- 2. ref_cliente con formato [CLIENTE][2526][ESPECIE][001] (ej: FAS2526KIW001)
-- =====================================================

-- PASO 1: Asegurar que las columnas existen
ALTER TABLE public.registros
ADD COLUMN IF NOT EXISTS temporada TEXT;

ALTER TABLE public.registros
ADD COLUMN IF NOT EXISTS ref_cliente TEXT;

-- PASO 2: Función para determinar temporada (TODAS las especies tienen temporada)
CREATE OR REPLACE FUNCTION determinar_temporada(
    p_especie TEXT,
    p_fecha TIMESTAMPTZ
) RETURNS TEXT AS $$
DECLARE
    v_especie_lower TEXT;
    v_mes INTEGER;
    v_anio INTEGER;
BEGIN
    v_especie_lower := LOWER(TRIM(p_especie));
    v_anio := EXTRACT(YEAR FROM COALESCE(p_fecha, NOW()));
    
    -- CHERRY 25-26: CEREZA y ARÁNDANOS entre septiembre (9) y enero (1)
    IF v_especie_lower LIKE '%cereza%' 
       OR v_especie_lower LIKE '%cherry%'
       OR v_especie_lower LIKE '%arandano%'
       OR v_especie_lower LIKE '%arándano%'
       OR v_especie_lower LIKE '%blueberr%' THEN
        IF p_fecha IS NOT NULL THEN
            v_mes := EXTRACT(MONTH FROM p_fecha);
            IF v_mes >= 9 OR v_mes = 1 THEN
                RETURN 'CHERRY-25-26';
            END IF;
        ELSE
            RETURN 'CHERRY-25-26';
        END IF;
    END IF;
    
    -- POMACEA-CAROZO 2026: CIRUELA, MANZANA, KIWI, DURAZNO
    IF v_especie_lower LIKE '%ciruela%' 
       OR v_especie_lower LIKE '%manzana%'
       OR v_especie_lower LIKE '%kiwi%'
       OR v_especie_lower LIKE '%durazno%'
       OR v_especie_lower LIKE '%plum%'
       OR v_especie_lower LIKE '%apple%'
       OR v_especie_lower LIKE '%peach%'
       OR v_especie_lower LIKE '%nectarin%' THEN
        RETURN 'POMACEA-CAROZO-2026';
    END IF;
    
    -- UVA: Temporada específica
    IF v_especie_lower LIKE '%uva%' 
       OR v_especie_lower LIKE '%grape%' THEN
        RETURN 'UVA-2026';
    END IF;
    
    -- PALTA: Temporada específica
    IF v_especie_lower LIKE '%palta%' 
       OR v_especie_lower LIKE '%avocado%'
       OR v_especie_lower LIKE '%aguacate%' THEN
        RETURN 'PALTA-2026';
    END IF;
    
    -- CITRICOS: Limón, Naranja, Mandarina
    IF v_especie_lower LIKE '%limon%'
       OR v_especie_lower LIKE '%limón%'
       OR v_especie_lower LIKE '%lemon%'
       OR v_especie_lower LIKE '%naranja%'
       OR v_especie_lower LIKE '%orange%'
       OR v_especie_lower LIKE '%mandarina%'
       OR v_especie_lower LIKE '%tangerine%'
       OR v_especie_lower LIKE '%pomelo%'
       OR v_especie_lower LIKE '%grapefruit%' THEN
        RETURN 'CITRICOS-2026';
    END IF;
    
    -- BERRIES: Frutillas, Frambuesas, etc.
    IF v_especie_lower LIKE '%frutilla%'
       OR v_especie_lower LIKE '%frambuesa%'
       OR v_especie_lower LIKE '%mora%'
       OR v_especie_lower LIKE '%strawberr%'
       OR v_especie_lower LIKE '%raspberr%'
       OR v_especie_lower LIKE '%blackberr%' THEN
        RETURN 'BERRIES-2026';
    END IF;
    
    -- TROPICAL: Piña, Mango, Papaya
    IF v_especie_lower LIKE '%piña%'
       OR v_especie_lower LIKE '%pina%'
       OR v_especie_lower LIKE '%pineapple%'
       OR v_especie_lower LIKE '%mango%'
       OR v_especie_lower LIKE '%papaya%'
       OR v_especie_lower LIKE '%maracuya%'
       OR v_especie_lower LIKE '%maracuyá%' THEN
        RETURN 'TROPICAL-2026';
    END IF;
    
    -- GENERAL: Para cualquier otra especie no clasificada
    RETURN 'GENERAL-' || v_anio::TEXT;
END;
$$ LANGUAGE plpgsql;

-- PASO 3: Función que genera el siguiente ref_asli para una temporada
CREATE OR REPLACE FUNCTION obtener_siguiente_ref_asli_temporada(
    p_temporada TEXT
) RETURNS TEXT AS $$
DECLARE
    v_ultimo_numero INTEGER;
    v_nuevo_ref_asli TEXT;
    v_temporada_normalizada TEXT;
    v_patron_busqueda TEXT;
BEGIN
    IF p_temporada IS NULL THEN
        RETURN NULL;
    END IF;
    
    v_temporada_normalizada := UPPER(REPLACE(REPLACE(p_temporada, ' ', '-'), '_', '-'));
    v_patron_busqueda := '^' || REPLACE(v_temporada_normalizada, '-', '[- ]') || '[- ]\d+$';
    
    SELECT COALESCE(MAX(
        CAST(
            SUBSTRING(ref_asli FROM '(\d+)$') AS INTEGER
        )
    ), 0) INTO v_ultimo_numero
    FROM public.registros
    WHERE deleted_at IS NULL
        AND (
            UPPER(REPLACE(REPLACE(temporada, ' ', '-'), '_', '-')) = v_temporada_normalizada
        )
        AND (
            ref_asli ~* v_patron_busqueda
        );
    
    v_nuevo_ref_asli := v_temporada_normalizada || '-' || 
                        LPAD((v_ultimo_numero + 1)::TEXT, 4, '0');
    
    RETURN v_nuevo_ref_asli;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 4: Función para generar REF CLIENTE automáticamente
-- Formato: [3 letras cliente][2526][3 letras especie][001]
-- Ejemplo: FAS2526KIW001
CREATE OR REPLACE FUNCTION generar_ref_cliente(
    p_cliente TEXT,
    p_especie TEXT
) RETURNS TEXT AS $$
DECLARE
    v_cliente_prefix TEXT;
    v_especie_prefix TEXT;
    v_correlativo INTEGER;
    v_ref_cliente TEXT;
    v_base_prefix TEXT;
    v_words TEXT[];
    v_word_count INTEGER;
BEGIN
    -- Si no hay cliente o especie, retornar NULL
    IF p_cliente IS NULL OR TRIM(p_cliente) = '' 
       OR p_especie IS NULL OR TRIM(p_especie) = '' THEN
        RETURN NULL;
    END IF;
    
    -- Generar prefijo del cliente (3 o 4 letras según el cliente)
    v_words := string_to_array(UPPER(TRIM(p_cliente)), ' ');
    v_word_count := array_length(v_words, 1);
    
    -- CASO ESPECIAL: COPEFRUT usa 4 letras (COPE)
    IF UPPER(TRIM(p_cliente)) LIKE '%COPEFRUT%' THEN
        v_cliente_prefix := 'COPE';
    ELSIF v_word_count IS NULL OR v_word_count = 0 THEN
        v_cliente_prefix := SUBSTRING(UPPER(TRIM(p_cliente)), 1, 3);
    ELSIF v_word_count = 1 THEN
        -- Una palabra: 3 primeras letras
        v_cliente_prefix := SUBSTRING(v_words[1], 1, 3);
    ELSIF v_word_count = 2 THEN
        -- Dos palabras: primera letra de primera + 2 primeras de segunda
        v_cliente_prefix := SUBSTRING(v_words[1], 1, 1) || SUBSTRING(v_words[2], 1, 2);
    ELSE
        -- Tres o más: primeras iniciales
        v_cliente_prefix := SUBSTRING(v_words[1], 1, 1) || 
                           SUBSTRING(v_words[2], 1, 1) || 
                           SUBSTRING(v_words[3], 1, 1);
    END IF;
    
    -- Asegurar que tenga al menos 3 caracteres (COPEFRUT ya tiene 4)
    IF LENGTH(v_cliente_prefix) < 3 THEN
        v_cliente_prefix := RPAD(v_cliente_prefix, 3, 'X');
    END IF;
    
    -- Generar prefijo de especie (3 letras)
    v_especie_prefix := SUBSTRING(UPPER(TRIM(p_especie)), 1, 3);
    v_especie_prefix := RPAD(v_especie_prefix, 3, 'X');
    
    -- Base del prefijo: [cliente][2526][especie]
    v_base_prefix := v_cliente_prefix || '2526' || v_especie_prefix;
    
    -- Obtener el siguiente correlativo para este prefijo
    SELECT COALESCE(MAX(
        CAST(
            SUBSTRING(ref_cliente FROM '[0-9]+$') AS INTEGER
        )
    ), 0) + 1 INTO v_correlativo
    FROM public.registros
    WHERE deleted_at IS NULL
        AND ref_cliente ~ ('^' || v_base_prefix || '[0-9]+$');
    
    -- Si no hay correlativo, empezar desde 1
    IF v_correlativo IS NULL OR v_correlativo < 1 THEN
        v_correlativo := 1;
    END IF;
    
    -- Generar ref_cliente completo
    v_ref_cliente := v_base_prefix || LPAD(v_correlativo::TEXT, 3, '0');
    
    RETURN v_ref_cliente;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 5: Función del trigger que asigna temporada, ref_asli y ref_cliente automáticamente
CREATE OR REPLACE FUNCTION asignar_ref_asli_automatico()
RETURNS TRIGGER AS $$
DECLARE
    v_temporada TEXT;
    v_fecha_referencia TIMESTAMPTZ;
BEGIN
    -- GENERAR REF ASLI si no está asignado
    IF NEW.ref_asli IS NULL OR TRIM(NEW.ref_asli) = '' THEN
        v_fecha_referencia := COALESCE(NEW.ingresado, NEW.created_at, NOW());
        v_temporada := determinar_temporada(NEW.especie, v_fecha_referencia);
        
        IF v_temporada IS NOT NULL THEN
            NEW.temporada := UPPER(REPLACE(REPLACE(v_temporada, ' ', '-'), '_', '-'));
            NEW.ref_asli := obtener_siguiente_ref_asli_temporada(v_temporada);
        ELSE
            NEW.temporada := 'GENERAL-' || EXTRACT(YEAR FROM v_fecha_referencia)::TEXT;
            NEW.ref_asli := obtener_siguiente_ref_asli_temporada(NEW.temporada);
        END IF;
        
        NEW.updated_at := NOW();
    ELSE
        -- Si ya tiene ref_asli, solo actualizar temporada si no está asignada
        IF NEW.temporada IS NULL THEN
            v_fecha_referencia := COALESCE(NEW.ingresado, NEW.created_at, NOW());
            v_temporada := determinar_temporada(NEW.especie, v_fecha_referencia);
            IF v_temporada IS NOT NULL THEN
                NEW.temporada := UPPER(REPLACE(REPLACE(v_temporada, ' ', '-'), '_', '-'));
            END IF;
        END IF;
    END IF;
    
    -- GENERAR REF CLIENTE si no está asignado
    IF (NEW.ref_cliente IS NULL OR TRIM(NEW.ref_cliente) = '') 
       AND NEW.shipper IS NOT NULL AND TRIM(NEW.shipper) != ''
       AND NEW.especie IS NOT NULL AND TRIM(NEW.especie) != '' THEN
        NEW.ref_cliente := generar_ref_cliente(NEW.shipper, NEW.especie);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PASO 6: Crear el trigger antes de INSERT
DROP TRIGGER IF EXISTS trigger_asignar_ref_asli_automatico ON public.registros;

CREATE TRIGGER trigger_asignar_ref_asli_automatico
    BEFORE INSERT ON public.registros
    FOR EACH ROW
    EXECUTE FUNCTION asignar_ref_asli_automatico();

-- PASO 7: Crear trigger también para UPDATE
CREATE OR REPLACE FUNCTION actualizar_ref_asli_si_cambia()
RETURNS TRIGGER AS $$
DECLARE
    v_temporada TEXT;
    v_fecha_referencia TIMESTAMPTZ;
BEGIN
    -- Si cambió la especie o la fecha, recalcular temporada
    IF (OLD.especie IS DISTINCT FROM NEW.especie) 
       OR (OLD.ingresado IS DISTINCT FROM NEW.ingresado) THEN
        
        v_fecha_referencia := COALESCE(NEW.ingresado, NEW.created_at, NOW());
        v_temporada := determinar_temporada(NEW.especie, v_fecha_referencia);
        
        IF v_temporada IS DISTINCT FROM NEW.temporada THEN
            NEW.temporada := v_temporada;
            
            IF v_temporada IS NOT NULL THEN
                v_temporada := UPPER(REPLACE(REPLACE(v_temporada, ' ', '-'), '_', '-'));
            END IF;
            
            IF v_temporada IS NOT NULL THEN
                IF NEW.ref_asli IS NULL 
                   OR NEW.ref_asli !~* ('^' || REPLACE(v_temporada, '-', '[- ]') || '[- ]\d+$') THEN
                    NEW.ref_asli := obtener_siguiente_ref_asli_temporada(v_temporada);
                END IF;
            END IF;
        END IF;
        
        NEW.updated_at := NOW();
    END IF;
    
    -- Si cambió el cliente o especie, regenerar ref_cliente
    IF (OLD.shipper IS DISTINCT FROM NEW.shipper) 
       OR (OLD.especie IS DISTINCT FROM NEW.especie) THEN
        IF NEW.shipper IS NOT NULL AND TRIM(NEW.shipper) != ''
           AND NEW.especie IS NOT NULL AND TRIM(NEW.especie) != '' THEN
            NEW.ref_cliente := generar_ref_cliente(NEW.shipper, NEW.especie);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_actualizar_ref_asli_si_cambia ON public.registros;

CREATE TRIGGER trigger_actualizar_ref_asli_si_cambia
    BEFORE UPDATE ON public.registros
    FOR EACH ROW
    WHEN (
        (OLD.especie IS DISTINCT FROM NEW.especie) 
        OR (OLD.ingresado IS DISTINCT FROM NEW.ingresado)
        OR (OLD.shipper IS DISTINCT FROM NEW.shipper)
    )
    EXECUTE FUNCTION actualizar_ref_asli_si_cambia();

-- PASO 8: Verificar que los triggers se crearon correctamente
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'registros'
    AND trigger_schema = 'public'
ORDER BY trigger_name;

-- PASO 9: Probar las funciones
SELECT '✅ Funciones creadas exitosamente' as resultado;
SELECT 'Siguiente REF ASLI CHERRY:' as tipo, obtener_siguiente_ref_asli_temporada('CHERRY-25-26') as ref_asli;
SELECT 'Siguiente REF ASLI POMACEA:' as tipo, obtener_siguiente_ref_asli_temporada('POMACEA-CAROZO-2026') as ref_asli;
SELECT 'REF CLIENTE Fruit Andes Sur + Kiwi:' as tipo, generar_ref_cliente('Fruit Andes Sur', 'Kiwi') as ref_cliente;
SELECT 'REF CLIENTE Copefrut + Cereza:' as tipo, generar_ref_cliente('Copefrut', 'Cereza') as ref_cliente;
SELECT 'REF CLIENTE San Andres + Manzana:' as tipo, generar_ref_cliente('San Andres', 'Manzana') as ref_cliente;

-- =====================================================
-- NOTAS:
-- - REF ASLI: formato TEMPORADA-#### (ej: CHERRY-25-26-0001)
-- - REF CLIENTE: formato [CLIENTE][2526][ESPECIE][001] (ej: FAS2526KIW001)
-- - Ambos se generan automáticamente al insertar
-- - Usa SECURITY DEFINER para ignorar RLS
-- =====================================================
