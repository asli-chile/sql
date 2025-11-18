# Actualizar Posición Manualmente con JSON de DataDocked

Este documento explica cómo actualizar la posición de un buque manualmente usando el JSON de DataDocked.

## Problema

A veces necesitas actualizar la posición de un buque con datos más recientes que tienes en JSON de DataDocked, sin esperar al cron job.

## Solución

El endpoint `/api/vessels/update-manual` permite actualizar manualmente `vessel_positions` y `vessel_position_history` con datos JSON de DataDocked.

## Cómo Usar

### 1. Formato del Request

```json
POST /api/vessels/update-manual
Content-Type: application/json

{
  "vessel_name": "HMM BLESSING",
  "data": {
    "detail": {
      "latitude": "-35.65115",
      "longitude": "-103.16366",
      "positionReceived": "Nov 17, 2025 23:01 UTC",
      "speed": "4.2",
      "course": "228.2",
      "destination": "CNHKG",
      "image": "https://static.vesselfinder.net/ship-photo/...",
      // ... todos los demás campos ...
    }
  }
}
```

### 2. Ejemplo con cURL

```bash
curl -X POST https://tu-proyecto.vercel.app/api/vessels/update-manual \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{
    "vessel_name": "HMM BLESSING",
    "data": {
      "detail": {
        "latitude": "-35.65115",
        "longitude": "-103.16366",
        "positionReceived": "Nov 17, 2025 23:01 UTC",
        "speed": "4.2",
        "course": "228.2",
        "destination": "CNHKG",
        "image": "https://static.vesselfinder.net/ship-photo/9742170-538007906-08c0ad7e7dd8431c5f2a219c91dd6419/1?v1"
      }
    }
  }'
```

### 3. Ejemplo con JavaScript/TypeScript

```typescript
const response = await fetch('/api/vessels/update-manual', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    vessel_name: 'HMM BLESSING',
    data: {
      detail: {
        latitude: '-35.65115',
        longitude: '-103.16366',
        positionReceived: 'Nov 17, 2025 23:01 UTC',
        speed: '4.2',
        course: '228.2',
        destination: 'CNHKG',
        image: 'https://static.vesselfinder.net/ship-photo/9742170-538007906-08c0ad7e7dd8431c5f2a219c91dd6419/1?v1',
        // ... todos los demás campos ...
      },
    },
  }),
});

const result = await response.json();
console.log('Actualizado:', result);
```

## Respuesta Exitosa

```json
{
  "message": "Posición actualizada correctamente",
  "vessel_name": "HMM BLESSING",
  "updated": {
    "lat": -35.65115,
    "lon": -103.16366,
    "position_at": "2025-11-17T23:01:00.000Z",
    "vessel_image": "https://static.vesselfinder.net/ship-photo/..."
  },
  "history_inserted": true
}
```

## Qué Hace el Endpoint

1. **Valida los datos**: Verifica que `vessel_name` y `data` estén presentes
2. **Extrae coordenadas**: Busca `latitude`/`longitude` en múltiples ubicaciones posibles
3. **Normaliza campos**: Convierte todos los campos a los formatos correctos
4. **Actualiza o inserta**: Si el buque existe en `vessel_positions`, lo actualiza; si no, lo inserta
5. **Guarda en historial**: También inserta un registro en `vessel_position_history`

## Campos Soportados

El endpoint extrae y guarda todos los campos del JSON de DataDocked:

- **Coordenadas**: `latitude`, `longitude`
- **Identificadores**: `imo`, `mmsi`, `name`
- **Navegación**: `speed`, `course`, `destination`, `navigationalStatus`
- **Buque**: `shipType`, `country`, `countryIso`, `length`, `beam`, `grossTonnage`, etc.
- **Puertos**: `lastPort`, `unlocode_lastport`, `unlocode_destination`
- **Tiempos**: `etaUtc`, `atdUtc`, `positionReceived`, `updateTime`, `predictedEta`
- **Capacidades**: `teu`, `deadweight`, `ballastWater`, `crudeOil`, `freshWater`, etc.
- **Imagen**: `image` → se guarda en `vessel_image`
- **Objetos complejos**: `engine`, `ports`, `management` → se guardan como JSON
- **Otros**: `dataSource`, `eni`, `time`, `distance`, etc.

## Actualizar HMM BLESSING Específicamente

Para actualizar HMM BLESSING con los datos más recientes que proporcionaste:

```bash
# Ejecuta esto en tu terminal o usa Postman/Insomnia
curl -X POST https://tu-proyecto.vercel.app/api/vessels/update-manual \
  -H "Content-Type: application/json" \
  -d '{
    "vessel_name": "HMM BLESSING",
    "data": {
      "detail": {
        "name": "HMM BLESSING",
        "mmsi": "440117000",
        "imo": "9742170",
        "latitude": "-35.65115",
        "longitude": "-103.16366",
        "positionReceived": "Nov 17, 2025 23:01 UTC",
        "speed": "4.2",
        "course": "228.2",
        "destination": "CNHKG",
        "image": "https://static.vesselfinder.net/ship-photo/9742170-538007906-08c0ad7e7dd8431c5f2a219c91dd6419/1?v1"
      }
    }
  }'
```

## Verificación

Después de ejecutar el endpoint, verifica que se actualizó correctamente:

```sql
SELECT 
  vessel_name,
  last_lat,
  last_lon,
  last_position_at,
  vessel_image,
  updated_at
FROM vessel_positions
WHERE vessel_name = 'HMM BLESSING';
```

## Notas Importantes

- ✅ Requiere autenticación (debe estar logueado)
- ✅ Actualiza tanto `vessel_positions` como `vessel_position_history`
- ✅ Valida que las coordenadas sean válidas antes de guardar
- ✅ Guarda el JSON completo en `raw_payload`
- ⚠️ Sobrescribe los datos existentes en `vessel_positions` (usa con cuidado)

