-- =====================================================
-- ACTUALIZAR TEMPORADA PARA ARÁNDANO CONGELADO
-- =====================================================
-- Los arándanos congelados deben ir a POMACEA-CAROZO-2026
-- Los arándanos frescos van a CHERRY-25-26
-- =====================================================

-- PASO 1: Actualizar función determinar_temporada
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
    
    -- ARÁNDANO CONGELADO → POMACEA-CAROZO-2026
    IF (v_especie_lower LIKE '%arandano%' OR v_especie_lower LIKE '%arándano%' OR v_especie_lower LIKE '%blueberr%')
       AND (v_especie_lower LIKE '%congelad%' OR v_especie_lower LIKE '%frozen%' OR v_especie_lower LIKE '%iqf%') THEN
        RETURN 'POMACEA-CAROZO-2026';
    END IF;
    
    -- CHERRY 25-26: CEREZA y ARÁNDANOS FRESCOS entre septiembre (9) y enero (1)
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
    
    -- POMACEA-CAROZO 2026: CIRUELA, MANZANA, KIWI, DURAZNO, NECTARINA
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
    RETURN 'GENERAL-2026';
END;
$$ LANGUAGE plpgsql;

-- PASO 2: Ver registros de arándano congelado existentes
SELECT 
    id,
    ref_asli,
    especie,
    temporada,
    created_at
FROM registros
WHERE (LOWER(especie) LIKE '%arandano%' OR LOWER(especie) LIKE '%arándano%' OR LOWER(especie) LIKE '%blueberr%')
AND (LOWER(especie) LIKE '%congelad%' OR LOWER(especie) LIKE '%frozen%' OR LOWER(especie) LIKE '%iqf%')
ORDER BY created_at DESC;

-- PASO 3: Actualizar temporada de arándanos congelados existentes
-- Descomentar para ejecutar:
/*
UPDATE registros
SET 
    temporada = 'POMACEA-CAROZO-2026',
    updated_at = NOW()
WHERE (LOWER(especie) LIKE '%arandano%' OR LOWER(especie) LIKE '%arándano%' OR LOWER(especie) LIKE '%blueberr%')
AND (LOWER(especie) LIKE '%congelad%' OR LOWER(especie) LIKE '%frozen%' OR LOWER(especie) LIKE '%iqf%')
AND temporada != 'POMACEA-CAROZO-2026';
*/

-- PASO 4: Verificar la actualización
SELECT 
    especie,
    temporada,
    COUNT(*) as cantidad
FROM registros
WHERE LOWER(especie) LIKE '%arandano%' OR LOWER(especie) LIKE '%arándano%' OR LOWER(especie) LIKE '%blueberr%'
GROUP BY especie, temporada
ORDER BY especie, temporada;

-- PASO 5: Verificar que la función funciona correctamente
SELECT 
    'ARÁNDANO CONGELADO' as tipo,
    determinar_temporada('ARÁNDANO CONGELADO', NOW()) as temporada_asignada,
    'Esperado: POMACEA-CAROZO-2026' as nota
UNION ALL
SELECT 
    'ARÁNDANO (FRESCO)' as tipo,
    determinar_temporada('ARÁNDANO', NOW()) as temporada_asignada,
    'Esperado: CHERRY-25-26' as nota
UNION ALL
SELECT 
    'ARÁNDANO IQF' as tipo,
    determinar_temporada('ARÁNDANO IQF', NOW()) as temporada_asignada,
    'Esperado: POMACEA-CAROZO-2026' as nota
UNION ALL
SELECT 
    'BLUEBERRY FROZEN' as tipo,
    determinar_temporada('BLUEBERRY FROZEN', NOW()) as temporada_asignada,
    'Esperado: POMACEA-CAROZO-2026' as nota;
