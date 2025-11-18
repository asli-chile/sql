# 🖼️ Actualizar Imágenes desde raw_payload

## 📋 Problema

Si ejecutaste el cron job antes de agregar el campo `vessel_image` a la tabla, las imágenes están guardadas en `raw_payload` pero no en el campo `vessel_image`.

## ✅ Solución

Ejecuta el script SQL que extrae las imágenes del `raw_payload` y las guarda en `vessel_image`:

```sql
-- Ejecuta este script en Supabase SQL Editor
\i scripts/actualizar-imagenes-desde-raw-payload.sql
```

O copia y pega el contenido del script directamente en el SQL Editor de Supabase.

## 🔍 Verificación

Después de ejecutar el script, verifica que las imágenes se guardaron:

```sql
-- Ver cuántos registros tienen imagen
SELECT 
  COUNT(*) as total,
  COUNT(vessel_image) as con_imagen,
  COUNT(*) - COUNT(vessel_image) as sin_imagen
FROM vessel_positions;

-- Ver algunos ejemplos
SELECT 
  vessel_name,
  vessel_image,
  CASE 
    WHEN vessel_image IS NOT NULL THEN '✅'
    ELSE '❌'
  END AS tiene_imagen
FROM vessel_positions
WHERE raw_payload IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;
```

## 📝 Nota

Este script:
- ✅ Verifica que el campo `vessel_image` existe (lo crea si no existe)
- ✅ Extrae la imagen desde `raw_payload->'detail'->>'image'`
- ✅ Actualiza solo los registros que no tienen imagen pero sí tienen `raw_payload`
- ✅ Funciona para ambas tablas: `vessel_positions` y `vessel_position_history`
- ✅ Muestra cuántos registros se actualizaron

