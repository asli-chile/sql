# Actualizar Posiciones desde el Historial

Este documento explica cómo actualizar las posiciones actuales de los buques (`vessel_positions`) con los datos más recientes del historial (`vessel_position_history`).

## Problema

A veces, los datos más recientes están en el historial pero no se han sincronizado con la tabla de posiciones actuales. Esto puede pasar si:

- El cron job se ejecutó pero no actualizó `vessel_positions` correctamente
- Se insertaron datos directamente en `vessel_position_history`
- Hay una discrepancia entre las dos tablas

## Solución

El script `scripts/actualizar-posiciones-desde-historial.sql` sincroniza ambas tablas tomando los datos más recientes del historial y actualizando `vessel_positions`.

## Cómo Usar

### 1. Verificar qué buques necesitan actualización

Antes de ejecutar la actualización, puedes ver qué buques tienen datos más recientes en el historial:

```sql
-- Ejecuta solo la primera parte del script (la consulta SELECT)
-- para ver qué se actualizaría sin hacer cambios
```

### 2. Ejecutar la actualización

Ejecuta el script completo en Supabase SQL Editor:

1. Ve a tu proyecto en Supabase
2. Abre el SQL Editor
3. Copia y pega el contenido de `scripts/actualizar-posiciones-desde-historial.sql`
4. Ejecuta el script

### 3. Verificar los resultados

Al final del script verás un resumen de los últimos 10 buques actualizados.

## Qué Hace el Script

1. **Identifica los datos más recientes**: Para cada buque, encuentra el registro más reciente en `vessel_position_history` (ordenado por `position_at DESC`)

2. **Compara fechas**: Solo actualiza si el historial tiene una fecha más reciente que `vessel_positions`

3. **Actualiza todos los campos**: Sincroniza TODOS los campos, incluyendo:
   - Coordenadas (`last_lat`, `last_lon`)
   - Timestamp (`last_position_at`)
   - Datos del buque (IMO, MMSI, velocidad, curso, destino, etc.)
   - Imagen del buque (`vessel_image`)
   - Datos técnicos (longitud, manga, tonelaje, etc.)

4. **Preserva datos existentes**: Usa `COALESCE` para mantener datos existentes en `vessel_positions` si no hay datos nuevos en el historial

## Actualización Específica para HMM BLESSING

Si quieres actualizar solo el HMM BLESSING, puedes ejecutar este query:

```sql
-- Actualizar solo HMM BLESSING con los datos más recientes del historial
WITH latest_history AS (
  SELECT DISTINCT ON (vessel_name)
    *
  FROM vessel_position_history
  WHERE vessel_name = 'HMM BLESSING'
  ORDER BY vessel_name, position_at DESC NULLS LAST
)
UPDATE vessel_positions vp
SET
  last_lat = lh.lat,
  last_lon = lh.lon,
  last_position_at = lh.position_at,
  speed = lh.speed,
  course = lh.course,
  destination = lh.destination,
  vessel_image = lh.vessel_image,
  -- ... todos los demás campos ...
  updated_at = NOW()
FROM latest_history lh
WHERE vp.vessel_name = 'HMM BLESSING';
```

## Notas Importantes

- ⚠️ El script solo actualiza si el historial tiene datos MÁS RECIENTES
- ✅ No sobrescribe datos que ya están actualizados
- 📊 Usa `DISTINCT ON` para garantizar que solo toma el registro más reciente por buque
- 🔄 Puedes ejecutar este script múltiples veces de forma segura

## Ejecución Automática (Opcional)

Si quieres que esto se ejecute automáticamente, puedes crear un trigger en PostgreSQL o ejecutar este script como parte del cron job.

