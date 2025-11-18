# 💾 Guardar Todos los Datos de la API DataDocked

## 📋 Resumen

Este documento describe cómo se guardan **TODOS** los datos que devuelve la API de DataDocked en la base de datos de Supabase, sin perder ninguna información.

---

## 🎯 Objetivo

Asegurar que **todos los campos** devueltos por la API de DataDocked se almacenen en la tabla `vessel_positions` de Supabase, permitiendo:

- ✅ Consultar cualquier dato sin parsear el JSON cada vez
- ✅ Hacer búsquedas y filtros eficientes
- ✅ Mantener un historial completo de información
- ✅ No perder datos valiosos de la API

---

## 📊 Campos Guardados

Los datos se guardan en **dos tablas**:

1. **`vessel_positions`** - Tabla principal con la última posición conocida de cada buque
2. **`vessel_position_history`** - Historial completo de todas las actualizaciones de posición

Ambas tablas guardan **exactamente los mismos campos**, permitiendo:
- Consultar la última posición rápidamente desde `vessel_positions`
- Analizar el historial completo desde `vessel_position_history`
- No perder ningún dato valioso

### Campos Básicos
- ✅ `vessel_name` - Nombre del buque en nuestro sistema
- ✅ `imo` - Número IMO
- ✅ `mmsi` - Número MMSI
- ✅ `name` - Nombre del buque según la API (puede diferir)
- ✅ `country` - País del buque
- ✅ `country_iso` - Código ISO del país (ej: IT, KP)
- ✅ `ship_type` - Tipo de buque
- ✅ `callsign` - Señal de llamada
- ✅ `type_specific` - Tipo específico del buque

### Posición y Navegación
- ✅ `last_lat` - Latitud actual
- ✅ `last_lon` - Longitud actual
- ✅ `last_position_at` - Timestamp de la posición
- ✅ `speed` - Velocidad en nudos
- ✅ `course` - Rumbo en grados
- ✅ `destination` - Código del puerto de destino
- ✅ `unlocode_destination` - Código UN/LOCODE del destino
- ✅ `navigational_status` - Estado de navegación (Moored, Underway, etc.)
- ✅ `distance` - Distancia al destino

### Fechas y Tiempos
- ✅ `eta_utc` - ETA estimada en UTC
- ✅ `atd_utc` - ATD (Actual Time of Departure) en UTC
- ✅ `predicted_eta` - ETA predicha
- ✅ `time_remaining` - Tiempo restante hasta destino
- ✅ `update_time` - Hora de última actualización de la API

### Puertos
- ✅ `last_port` - Último puerto visitado
- ✅ `unlocode_lastport` - Código UN/LOCODE del último puerto

### Dimensiones y Capacidades
- ✅ `length` - Eslora del buque (ej: "330 m")
- ✅ `beam` - Manga del buque (ej: "48 m")
- ✅ `current_draught` - Calado actual (ej: "13.3 m")
- ✅ `deadweight` - Peso muerto en toneladas
- ✅ `gross_tonnage` - Arqueo bruto
- ✅ `teu` - Capacidad en TEU (Twenty-foot Equivalent Unit)

### Capacidades (m³)
- ✅ `ballast_water` - Capacidad de agua de lastre
- ✅ `crude_oil` - Capacidad de petróleo crudo
- ✅ `fresh_water` - Capacidad de agua dulce
- ✅ `gas` - Capacidad de gas
- ✅ `grain` - Capacidad de grano
- ✅ `bale` - Capacidad de fardos

### Información de Construcción
- ✅ `year_of_built` - Año de construcción
- ✅ `hull` - Tipo de casco (SINGLE HULL, DOUBLE HULL, etc.)
- ✅ `builder` - Astillero constructor
- ✅ `material` - Material de construcción
- ✅ `place_of_build` - Lugar de construcción

### Objetos Complejos (JSON)
- ✅ `engine` - Información del motor (JSONB)
- ✅ `ports` - Historial de puertos visitados (JSONB)
- ✅ `management` - Información de gestión y propietario (JSONB)

### Otros
- ✅ `vessel_image` - URL de la imagen del buque
- ✅ `data_source` - Fuente de datos (Satellite, AIS, etc.)
- ✅ `eni` - Número ENI (European Number of Identification)
- ✅ `raw_payload` - JSON completo de la respuesta (siempre guardado)

---

## 🔧 Implementación

### 1. Script SQL

Ejecuta los scripts para agregar todos los campos a ambas tablas:

```sql
-- Script para la tabla principal (vessel_positions)
\i scripts/add-all-vessel-fields.sql

-- Script para la tabla de historial (vessel_position_history)
\i scripts/add-all-vessel-history-fields.sql

-- Opción alternativa: Script incremental (si ya tienes algunos campos)
\i scripts/add-vessel-position-fields.sql
```

**Nota**: Es importante ejecutar ambos scripts para que ambas tablas tengan la misma estructura y puedan guardar todos los datos.

### 2. Extracción de Datos

El código en `src/lib/vessel-ais-client.ts` extrae **todos** los campos de la respuesta de la API:

```typescript
// Ejemplo de extracción
const countryIso = normalizeValue(candidate?.countryIso);
const unlocodeDestination = normalizeValue(candidate?.unlocode_destination);
const updateTime = normalizeValue(candidate?.updateTime);
const dataSource = normalizeValue(candidate?.dataSource);
const eni = normalizeValue(candidate?.eni);
const name = normalizeValue(candidate?.name);
```

### 3. Guardado en Base de Datos

El cron job en `app/api/vessels/update-positions-cron/route.ts` guarda **todos** los campos en **ambas tablas**:

**Tabla principal (`vessel_positions`)**:
```typescript
await supabase.from('vessel_positions').insert({
  // ... todos los campos ...
  country_iso: aisResult.countryIso ?? null,
  unlocode_destination: aisResult.unlocodeDestination ?? null,
  update_time: aisResult.updateTime ?? null,
  data_source: aisResult.dataSource ?? null,
  eni: aisResult.eni ?? null,
  name: aisResult.name ?? null,
  // ... más campos ...
});
```

**Tabla de historial (`vessel_position_history`)**:
```typescript
await supabase.from('vessel_position_history').insert({
  // ... exactamente los mismos campos ...
  // Esto crea un registro histórico completo de cada actualización
});
```

---

## 📝 Notas Importantes

### 1. Campos Opcionales

Todos los campos son opcionales (`NULL` permitido) porque:
- La API puede no devolver todos los campos para todos los buques
- Algunos campos solo están disponibles para ciertos tipos de buques
- La API puede cambiar su estructura en el futuro

### 2. Normalización de Valores

El código usa una función `normalizeValue` que:
- Convierte strings vacíos a `NULL`
- Mantiene valores válidos como strings
- Maneja valores en inglés y español

### 3. Objetos JSON

Los objetos complejos (`engine`, `ports`, `management`) se guardan como `JSONB`:
- Permite consultas eficientes con operadores JSON
- Mantiene la estructura original de la API
- Facilita futuras extensiones

### 4. Raw Payload

El campo `raw_payload` siempre contiene el JSON completo de la respuesta:
- Útil para debugging
- Permite extraer campos nuevos sin modificar el código
- Backup de toda la información original

---

## ✅ Verificación

Para verificar que todos los campos se están guardando:

```sql
-- Ver estructura de la tabla principal
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'vessel_positions'
ORDER BY ordinal_position;

-- Ver estructura de la tabla de historial
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'vessel_position_history'
ORDER BY ordinal_position;

-- Ver datos guardados en la tabla principal (ejemplo)
SELECT 
  vessel_name,
  country,
  country_iso,
  unlocode_destination,
  update_time,
  data_source,
  eni,
  name,
  vessel_image
FROM vessel_positions
WHERE vessel_name = 'TU_BUQUE'
LIMIT 1;

-- Ver historial completo de un buque
SELECT 
  vessel_name,
  position_at,
  lat,
  lon,
  speed,
  course,
  destination,
  navigational_status,
  country,
  country_iso,
  vessel_image
FROM vessel_position_history
WHERE vessel_name = 'TU_BUQUE'
ORDER BY position_at DESC
LIMIT 10;

-- Verificar que raw_payload contiene todo (tabla principal)
SELECT 
  vessel_name,
  jsonb_pretty(raw_payload) as payload_completo
FROM vessel_positions
WHERE vessel_name = 'TU_BUQUE'
LIMIT 1;

-- Verificar que raw_payload contiene todo (historial)
SELECT 
  vessel_name,
  position_at,
  jsonb_pretty(raw_payload) as payload_completo
FROM vessel_position_history
WHERE vessel_name = 'TU_BUQUE'
ORDER BY position_at DESC
LIMIT 1;
```

---

## 🔄 Actualización Automática

El cron job actualiza automáticamente **todos** los campos cada vez que se ejecuta:

1. Obtiene la última información de la API
2. Extrae todos los campos disponibles
3. **Actualiza o inserta** el registro en `vessel_positions` con todos los datos
4. **Inserta un nuevo registro** en `vessel_position_history` con todos los datos
5. Preserva campos existentes si la API no los devuelve

**Nota importante**: Cada ejecución del cron job crea un nuevo registro en `vessel_position_history`, permitiendo:
- Analizar cambios en velocidad, rumbo, destino, etc. a lo largo del tiempo
- Ver la evolución de la posición del buque
- Consultar datos históricos completos de cualquier momento

---

## 📚 Archivos Relacionados

- **Script SQL Principal**: `scripts/add-all-vessel-fields.sql`
- **Script SQL Historial**: `scripts/add-all-vessel-history-fields.sql`
- **Script SQL Incremental**: `scripts/add-vessel-position-fields.sql`
- **Cliente API**: `src/lib/vessel-ais-client.ts`
- **Cron Job**: `app/api/vessels/update-positions-cron/route.ts`
- **Tipos TypeScript**: `src/types/vessels.ts`
- **Documentación API**: `docs/FORMATO-RESPUESTA-DATADOCKED.md`

---

## 🎉 Resultado

Con esta implementación, **todos los datos** de la API de DataDocked se guardan en Supabase en **ambas tablas**, permitiendo:

- ✅ Consultas rápidas sin parsear JSON (desde `vessel_positions`)
- ✅ Historial completo de todas las actualizaciones (en `vessel_position_history`)
- ✅ Búsquedas y filtros eficientes
- ✅ Análisis temporal de cambios (velocidad, rumbo, destino, etc.)
- ✅ Sin pérdida de datos valiosos
- ✅ Fácil extensión para nuevos campos
- ✅ Backup completo del JSON en `raw_payload` en ambas tablas

