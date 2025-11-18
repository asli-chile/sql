# 🔍 Buscar y Actualizar Imagen de un Buque Específico

## 📋 Problema

Cuando buscas un buque específico (ej: "HMM BLESSING"), la consulta SQL puede devolver resultados incorrectos si no usas la búsqueda exacta.

## ✅ Solución

Usa estos scripts SQL para buscar y actualizar buques específicos:

### 1. Buscar HMM BLESSING específicamente

```sql
-- Ejecuta este script para buscar HMM BLESSING
\i scripts/buscar-hmm-blessing.sql
```

O copia y pega directamente:

```sql
-- Buscar HMM BLESSING específicamente
SELECT 
  vessel_name,
  vessel_image,
  raw_payload->'detail'->>'image' as imagen_en_raw_payload,
  CASE 
    WHEN vessel_image IS NOT NULL THEN '✅ Imagen guardada'
    WHEN raw_payload->'detail'->>'image' IS NOT NULL THEN '⚠️ Imagen solo en raw_payload'
    ELSE '❌ Sin imagen'
  END AS estado
FROM vessel_positions
WHERE vessel_name = 'HMM BLESSING'  -- Búsqueda exacta
ORDER BY vessel_name;
```

### 2. Buscar cualquier buque

Para buscar cualquier buque, usa:

```sql
-- Búsqueda exacta (recomendado)
SELECT * FROM vessel_positions 
WHERE vessel_name = 'NOMBRE_EXACTO_DEL_BUQUE';

-- Búsqueda parcial (si no conoces el nombre exacto)
SELECT * FROM vessel_positions 
WHERE vessel_name ILIKE '%HMM%';  -- Busca buques que contengan "HMM"
```

### 3. Actualizar imagen de un buque específico

```sql
-- Actualizar solo HMM BLESSING
UPDATE vessel_positions
SET vessel_image = NULLIF(TRIM(raw_payload->'detail'->>'image'), '')
WHERE 
  vessel_name = 'HMM BLESSING'
  AND vessel_image IS NULL 
  AND raw_payload->'detail'->>'image' IS NOT NULL;
```

## 🔍 Diferencia entre búsquedas

- **`vessel_name = 'HMM BLESSING'`**: Búsqueda exacta (recomendado)
- **`vessel_name ILIKE '%HMM%'`**: Búsqueda parcial (puede devolver múltiples resultados)
- **`vessel_name ILIKE 'HMM%'`**: Busca nombres que comienzan con "HMM"

## 📝 Nota

Si la consulta devuelve resultados incorrectos, asegúrate de usar:
- Búsqueda exacta con `=` en lugar de `LIKE` o `ILIKE`
- O usa `ILIKE` con el patrón exacto: `'HMM BLESSING%'`

