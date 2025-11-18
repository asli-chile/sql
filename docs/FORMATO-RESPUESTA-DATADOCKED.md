# 📋 Formato de Respuesta de la API DataDocked

## 🎯 Endpoint

```
GET https://datadocked.com/api/vessels_operations/get-vessel-info?imo_or_mmsi={IMO_OR_MMSI}
```

**Headers requeridos**:
- `accept: application/json`
- `api_key: {TU_API_KEY}`

---

## 📊 Estructura de la Respuesta

La API devuelve un objeto JSON con la siguiente estructura:

```json
{
  "detail": {
    // Información básica del buque
    "name": "LAURANA",
    "mmsi": "247342000",
    "imo": "9011014",
    "country": "Italy",
    "countryIso": "IT",
    "shipType": "Miscellaneous",
    "callsign": "ICEL",
    
    // Imagen del buque ⭐
    "image": "https://static.vesselfinder.net/ship-photo/9011014-247342000-672d4d9a1223ae7b65c7d90997ca8641/1?v1",
    
    // Dimensiones
    "length": "122 m",
    "beam": "20 m",
    "draught": "4.8 m. ( max 4.8)",
    "currentDraught": "4.8 m",
    "deadweight": "2328",
    "grossTonnage": "11193",
    "teu": "",
    
    // Posición actual
    "latitude": "38.21558",
    "longitude": "15.24491",
    "speed": "0.0",
    "course": "307.0",
    "destination": "ITMLZ",
    "unlocode_destination": "ITMLZ",
    "distance": "88.49 kn",
    
    // Fechas y tiempos
    "positionReceived": "Oct 02, 2025 08:27 UTC",
    "updateTime": "Oct 02, 2025 08:30 UTC",
    "etaUtc": "Oct 01, 2025 10:15 UTC",
    "atdUtc": "Sep 30, 2025 18:25 UTC",
    "predictedEta": "Oct 7, 16:28",
    "time": "3 hours 59 minutes",
    
    // Estado y tipo
    "navigationalStatus": "Moored",
    "typeSpecific": "Passenger/Ro-Ro Cargo Ship",
    
    // Información de construcción
    "yearOfBuilt": "1992",
    "hull": "SINGLE HULL",
    "builder": "FINCANTIERI PALERMO",
    "material": "STEEL/ORDINARY",
    "placeOfBuild": "PALERMO, Italy",
    
    // Último puerto
    "lastPort": "Napoli, Italy",
    "unlocode_lastport": "ITNAP",
    
    // Capacidades (en m³)
    "ballastWater": "0",
    "crudeOil": "0",
    "freshWater": "0",
    "gas": "0 m³",
    "grain": "0 m³",
    "bale": "0 m³",
    
    // Motor
    "engine": {
      "engineBuilder": "GRANDI MOTORI",
      "engineType": "A420.6L",
      "enginePower(kW)": "7060",
      "fuelType": "MARINE DIESEL",
      "Propeller": "2 CONTROLLABLE PITCH"
    },
    
    // Puertos visitados
    "ports": [
      {
        "portName": "Milazzo Italy",
        "portSign": "ITMLZ",
        "arrived": "Oct 1, 10:40",
        "departed": "-"
      },
      {
        "portName": "Napoli Italy",
        "portSign": "ITNAP",
        "arrived": "Sep 30, 05:55",
        "departed": "Sep 30, 18:25"
      }
    ],
    
    // Información de gestión
    "management": {
      "registeredOwner": "CARONTE & TOURIST ISOLE MINORI",
      "registeredOwnerAddress": "Via Ingegnere Giuseppe Franza 82, 98124, Messina ME, Italy.",
      "registeredOwnerWebsite": "http://www.carontetourist.it/",
      "registeredOwnerEmail": "carontetourist@pec.it, info@carontetourist.it",
      "manager": "CARONTE & TOURIST ISOLE MINORI",
      "ismAddress": "Via Ingegnere Giuseppe Franza 82, 98124, Messina ME, Italy.",
      "managerAddress": "Via Ingegnere Giuseppe Franza 82, 98124, Messina ME, Italy.",
      "managerWebsite": "http://www.carontetourist.it/",
      "managerEmail": "carontetourist@pec.it, info@carontetourist.it",
      "ism": "CARONTE & TOURIST ISOLE MINORI",
      "ismWeb": "http://www.carontetourist.it/",
      "ismWebsite": "http://www.carontetourist.it/",
      "ismEmail": "carontetourist@pec.it, info@carontetourist.it",
      "P&I": "-",
      "ClassificationSociety": "REGISTRO ITALIANO NAVALE"
    },
    
    // Fuente de datos
    "dataSource": "Satellite",
    
    // Campos adicionales (pueden variar)
    "eni": null
  }
}
```

---

## 🖼️ Campo de Imagen

**Campo**: `detail.image`

**Formato**: URL absoluta a la imagen del buque

**Ejemplo**:
```
https://static.vesselfinder.net/ship-photo/9011014-247342000-672d4d9a1223ae7b65c7d90997ca8641/1?v1
```

**Características**:
- ✅ Siempre es una URL absoluta (comienza con `https://`)
- ✅ Hosted en `static.vesselfinder.net`
- ✅ Incluye IMO y MMSI en la ruta
- ✅ Puede incluir parámetros de versión (`?v1`)

**Nota**: El campo `image` puede estar presente o no, dependiendo de si DataDocked tiene una imagen disponible para ese buque.

---

## 🔍 Campos que Extraemos

El código actual extrae los siguientes campos del JSON:

### Campos Básicos
- ✅ `name` → No se guarda (usamos `vessel_name` de nuestro sistema)
- ✅ `imo` → `imo`
- ✅ `mmsi` → `mmsi`
- ✅ `country` → `country`
- ✅ `shipType` → `ship_type`
- ✅ `callsign` → `callsign`

### Posición y Navegación
- ✅ `latitude` → `last_lat`
- ✅ `longitude` → `last_lon`
- ✅ `positionReceived` o `updateTime` → `last_position_at`
- ✅ `speed` → `speed`
- ✅ `course` → `course`
- ✅ `destination` → `destination`
- ✅ `navigationalStatus` → `navigational_status`

### Fechas
- ✅ `etaUtc` → `eta_utc`
- ✅ `atdUtc` → `atd_utc`
- ✅ `predictedEta` → `predicted_eta`

### Puertos
- ✅ `lastPort` → `last_port`
- ✅ `unlocode_lastport` → `unlocode_lastport`
- ✅ `distance` → `distance`

### Dimensiones y Capacidades
- ✅ `length` → `length`
- ✅ `beam` → `beam`
- ✅ `currentDraught` o `draught` → `current_draught`
- ✅ `deadweight` → `deadweight`
- ✅ `grossTonnage` → `gross_tonnage`
- ✅ `yearOfBuilt` → `year_of_built`
- ✅ `teu` → `teu`

### Capacidades (m³)
- ✅ `ballastWater` → `ballast_water`
- ✅ `crudeOil` → `crude_oil`
- ✅ `freshWater` → `fresh_water`
- ✅ `gas` → `gas`
- ✅ `grain` → `grain`
- ✅ `bale` → `bale`

### Construcción
- ✅ `hull` → `hull`
- ✅ `builder` → `builder`
- ✅ `material` → `material`
- ✅ `placeOfBuild` → `place_of_build`

### Otros
- ✅ `typeSpecific` → `type_specific`
- ✅ `time` → `time_remaining`

### Objetos Complejos (guardados como JSON)
- ✅ `engine` → `engine` (JSON stringificado)
- ✅ `ports` → `ports` (JSON stringificado)
- ✅ `management` → `management` (JSON stringificado)

### ⭐ Imagen (NUEVO)
- ✅ `image` → `vessel_image`

---

## 📝 Notas Importantes

### 1. Estructura Anidada

La respuesta viene dentro de `detail`, pero el código ya maneja esto:

```typescript
const candidate = (rawPayload as any)?.detail ?? rawPayload;
```

Esto significa que si `detail` existe, lo usa; si no, usa el payload directamente.

### 2. Campos Opcionales

Muchos campos pueden ser `null` o estar ausentes. El código maneja esto con el operador `??`:

```typescript
const image = candidate?.image ?? null;
```

### 3. Formato de Fechas

Las fechas vienen en formato legible:
- `"Oct 02, 2025 08:27 UTC"`
- `"Oct 1, 10:40"`

El código intenta parsearlas a ISO 8601, pero si falla, guarda el string original.

### 4. Unidades en los Valores

Algunos campos incluyen unidades en el valor:
- `"length": "122 m"` → Se guarda como string `"122 m"`
- `"speed": "0.0"` → Se convierte a número `0.0`
- `"gas": "0 m³"` → Se guarda como string `"0 m³"`

### 5. Imagen

El campo `image` es una URL absoluta que apunta a una imagen del buque. Se guarda directamente en `vessel_image` sin modificación.

---

## 🔧 Cómo se Procesa

### Paso 1: Llamada a la API

```typescript
const url = `https://datadocked.com/api/vessels_operations/get-vessel-info?imo_or_mmsi=${identifier}`;
const response = await fetch(url, {
  headers: {
    accept: 'application/json',
    api_key: VESSEL_API_KEY,
  },
});
const rawPayload = await response.json();
```

### Paso 2: Extracción de `detail`

```typescript
const candidate = rawPayload?.detail ?? rawPayload;
```

### Paso 3: Extracción de Campos

```typescript
const lat = Number(candidate?.latitude);
const lon = Number(candidate?.longitude);
const image = candidate?.image ?? null; // ⭐ NUEVO
// ... otros campos
```

### Paso 4: Guardado en Base de Datos

```typescript
await supabase.from('vessel_positions').insert({
  vessel_name: 'LAURANA',
  last_lat: lat,
  last_lon: lon,
  vessel_image: image, // ⭐ NUEVO
  // ... otros campos
});
```

---

## ✅ Verificación

Para verificar que la imagen se está guardando correctamente:

```sql
SELECT 
  vessel_name,
  vessel_image,
  CASE 
    WHEN vessel_image IS NOT NULL THEN '✅ Tiene imagen'
    ELSE '❌ Sin imagen'
  END AS estado
FROM vessel_positions
WHERE vessel_image IS NOT NULL;
```

---

## 📚 Referencias

- **Endpoint**: `GET /api/vessels_operations/get-vessel-info`
- **Documentación**: Ver `docs/AGREGAR-IMAGEN-BUQUE.md`
- **Código**: `src/lib/vessel-ais-client.ts`

