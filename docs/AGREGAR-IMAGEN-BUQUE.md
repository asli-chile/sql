# 🖼️ Agregar Imagen del Buque desde API DataDocked

## ✅ Cambios Realizados

Se agregó soporte para guardar la imagen del buque que devuelve la API de DataDocked.

**Campo en la respuesta de DataDocked**: `detail.image`  
**Campo en la base de datos**: `vessel_positions.vessel_image`  
**Formato**: URL absoluta (ej: `https://static.vesselfinder.net/ship-photo/...`)

---

## 📋 Formato de la Imagen en DataDocked

Según el formato real de la API, la imagen viene en:

```json
{
  "detail": {
    "image": "https://static.vesselfinder.net/ship-photo/9011014-247342000-672d4d9a1223ae7b65c7d90997ca8641/1?v1"
  }
}
```

**Características**:
- ✅ URL absoluta (comienza con `https://`)
- ✅ Hosted en `static.vesselfinder.net`
- ✅ Incluye IMO y MMSI en la ruta
- ✅ Puede incluir parámetros de versión (`?v1`)

**Ver documentación completa del formato**: `docs/FORMATO-RESPUESTA-DATADOCKED.md`

---

## 📋 Archivos Modificados

### 1. Base de Datos
- **Script SQL**: `scripts/add-vessel-image-field.sql`
- **Campo agregado**: `vessel_image TEXT` en la tabla `vessel_positions`

### 2. Tipos TypeScript
- **Archivo**: `src/types/vessels.ts`
- **Campo agregado**: `vessel_image: string | null` en el tipo `VesselPosition`

### 3. Cliente AIS
- **Archivo**: `src/lib/vessel-ais-client.ts`
- **Cambios**:
  - Agregado `vesselImage` al tipo de retorno `FetchVesselPositionResult`
  - Extracción de la imagen del payload (soporta múltiples nombres de campo)

### 4. Cron Job
- **Archivo**: `app/api/vessels/update-positions-cron/route.ts`
- **Cambios**:
  - Lee `vessel_image` desde la base de datos
  - Guarda `vessel_image` al insertar nuevos registros
  - Actualiza `vessel_image` al actualizar registros existentes

---

## 🔧 Pasos para Aplicar

### Paso 1: Ejecutar el Script SQL

Ejecuta en Supabase SQL Editor:

```sql
-- Agregar columna para la imagen del buque
ALTER TABLE vessel_positions 
ADD COLUMN IF NOT EXISTS vessel_image TEXT;

-- Comentario para documentación
COMMENT ON COLUMN vessel_positions.vessel_image IS 'URL de la imagen del buque obtenida de la API AIS (DataDocked)';
```

O ejecuta el archivo completo:
```bash
# En Supabase SQL Editor, copia y pega el contenido de:
scripts/add-vessel-image-field.sql
```

### Paso 2: Hacer Deploy

1. Haz commit de los cambios
2. Push a GitHub
3. Vercel hará deploy automáticamente

---

## 🔍 Cómo Funciona

### Extracción de la Imagen

El código busca la imagen en varios campos posibles del JSON de DataDocked:

```typescript
const vesselImage = normalizeValue(
  candidate?.image ?? 
  candidate?.imageUrl ?? 
  candidate?.image_url ?? 
  candidate?.photo ?? 
  candidate?.vesselImage ?? 
  candidate?.vessel_image ??
  candidate?.Imagen ??
  candidate?.['Imagen del buque']
);
```

**Esto soporta**:
- Campos en inglés: `image`, `imageUrl`, `image_url`, `photo`, `vesselImage`, `vessel_image`
- Campos en español: `Imagen`, `Imagen del buque`

### Guardado Automático

Cuando el cron job actualiza las posiciones:
1. Extrae la imagen del payload de DataDocked
2. La guarda en `vessel_positions.vessel_image`
3. Si la API no devuelve imagen, se guarda como `null`

---

## 📊 Verificar que Funciona

### 1. Verificar que el Campo Existe

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vessel_positions' 
  AND column_name = 'vessel_image';
```

### 2. Ver Imágenes Guardadas

```sql
SELECT 
  vessel_name,
  vessel_image,
  CASE 
    WHEN vessel_image IS NOT NULL THEN '✅ Tiene imagen'
    ELSE '❌ Sin imagen'
  END AS estado
FROM vessel_positions
ORDER BY vessel_name;
```

### 3. Probar el Cron Job

Después del próximo cron job, verifica que las imágenes se hayan guardado:

```sql
SELECT vessel_name, vessel_image 
FROM vessel_positions 
WHERE vessel_image IS NOT NULL;
```

---

## 🎯 Uso en el Frontend

Ahora puedes usar `vessel_image` en tus componentes:

```typescript
// En un componente React
const vessel = await getVesselPosition(vesselName);

{vessel.vessel_image && (
  <img 
    src={vessel.vessel_image} 
    alt={`Imagen de ${vessel.vessel_name}`}
    className="w-full h-auto"
  />
)}
```

---

## 📝 Notas

- **La imagen se guarda como URL**: El campo `vessel_image` contiene la URL de la imagen, no la imagen en sí
- **Puede ser null**: Si la API no devuelve imagen, el campo será `null`
- **Se actualiza automáticamente**: Cada vez que el cron job actualiza un buque, también actualiza su imagen
- **Formato**: La URL puede ser absoluta (`https://...`) o relativa, dependiendo de lo que devuelva DataDocked

---

## ✅ Resumen

- ✅ Campo `vessel_image` agregado a la base de datos
- ✅ Extracción de imagen del payload de DataDocked
- ✅ Guardado automático en el cron job
- ✅ Soporte para múltiples nombres de campo (inglés/español)
- ✅ Listo para usar en el frontend

**Ejecuta el script SQL y haz deploy para activar la funcionalidad**. 🚀

