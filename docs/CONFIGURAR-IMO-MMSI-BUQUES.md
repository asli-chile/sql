# 🔧 Configurar IMO/MMSI de Buques

## 📋 Problema

El cron job de actualización de posiciones de buques puede fallar si los buques no tienen **IMO** (International Maritime Organization number) o **MMSI** (Maritime Mobile Service Identity) configurado.

### Mensaje de error típico:

```json
{
  "failed": [
    {
      "vessel_name": "MANZANILLO EXPRESS",
      "reason": "No tiene IMO/MMSI configurado. Usa el endpoint /api/vessels/set-imo o el script scripts/set-vessel-imo-mmsi.js para configurarlo."
    }
  ]
}
```

---

## 🔍 Identificar Buques que Necesitan Configuración

### Opción 1: Usar el script SQL

Ejecuta el script `scripts/check-vessels-missing-imo-mmsi.sql` en Supabase:

1. Ve a tu proyecto en Supabase
2. Abre el **SQL Editor**
3. Copia y pega el contenido del script
4. Ejecuta la consulta

El script mostrará:
- Lista de buques activos que necesitan IMO/MMSI
- Estado actual de cada buque (si existe en `vessel_positions` o no)
- Resumen de cuántos buques necesitan configuración

### Opción 2: Consulta directa en Supabase

```sql
SELECT 
  vessel_name,
  imo,
  mmsi,
  CASE 
    WHEN imo IS NULL AND mmsi IS NULL THEN 'Falta IMO y MMSI'
    WHEN imo IS NULL THEN 'Falta IMO'
    WHEN mmsi IS NULL THEN 'Falta MMSI'
    ELSE 'Configurado'
  END AS estado
FROM vessel_positions
WHERE imo IS NULL OR mmsi IS NULL
ORDER BY vessel_name;
```

---

## ✅ Configurar IMO/MMSI

### Método 1: Usar el script Node.js (Recomendado)

El script `scripts/set-vessel-imo-mmsi.js` permite configurar IMO/MMSI desde la línea de comandos.

#### Requisitos previos:

1. Tener Node.js instalado
2. Tener configuradas las variables de entorno de Supabase:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (o `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

#### Uso:

```bash
# Configurar solo IMO
node scripts/set-vessel-imo-mmsi.js "NOMBRE DEL BUQUE" --imo 1234567

# Configurar solo MMSI
node scripts/set-vessel-imo-mmsi.js "NOMBRE DEL BUQUE" --mmsi 987654321

# Configurar ambos
node scripts/set-vessel-imo-mmsi.js "NOMBRE DEL BUQUE" --imo 1234567 --mmsi 987654321
```

#### Ejemplos reales:

```bash
node scripts/set-vessel-imo-mmsi.js "MANZANILLO EXPRESS" --imo 9870666
node scripts/set-vessel-imo-mmsi.js "MSC ANS" --mmsi 538005123
node scripts/set-vessel-imo-mmsi.js "SALLY MAERSK" --imo 1234567 --mmsi 987654321
```

### Método 2: Usar el endpoint API

Puedes usar el endpoint `/api/vessels/set-imo` desde tu aplicación o con una herramienta como Postman/curl.

#### Ejemplo con curl:

```bash
curl -X POST https://tu-app.vercel.app/api/vessels/set-imo \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{
    "vessel_name": "MANZANILLO EXPRESS",
    "imo": "9870666",
    "mmsi": "538005123"
  }'
```

**Nota**: Este endpoint requiere autenticación.

### Método 3: Configurar directamente en Supabase

1. Ve a tu proyecto en Supabase
2. Abre la tabla `vessel_positions`
3. Busca el buque por `vessel_name`
4. Edita el registro y agrega los valores de `imo` y/o `mmsi`
5. Guarda los cambios

---

## 🔎 Dónde Encontrar IMO/MMSI

### Fuentes comunes:

1. **Sitios web de tracking de buques**:
   - [MarineTraffic](https://www.marinetraffic.com/)
   - [VesselFinder](https://www.vesselfinder.com/)
   - [FleetMon](https://www.fleetmon.com/)

2. **Documentación de la naviera**:
   - Booking confirmations
   - Itinerarios oficiales
   - Sitios web de las navieras

3. **APIs de tracking**:
   - DataDocked (la misma que usamos)
   - MarineTraffic API
   - AIS APIs públicas

### Cómo buscar:

1. Ve a MarineTraffic o VesselFinder
2. Busca el nombre del buque
3. En la página del buque, encontrarás:
   - **IMO**: Número de 7 dígitos (ej: 9870666)
   - **MMSI**: Número de 9 dígitos (ej: 538005123)

---

## 📊 Verificar Configuración

Después de configurar IMO/MMSI, puedes verificar:

1. **Consulta SQL**:
```sql
SELECT vessel_name, imo, mmsi 
FROM vessel_positions 
WHERE vessel_name = 'NOMBRE DEL BUQUE';
```

2. **Ejecutar el cron job manualmente**:
   - Llama a `/api/vessels/update-positions-cron`
   - Verifica que el buque aparezca en `updated` en lugar de `failed`

---

## 🚨 Solución de Problemas

### El buque sigue fallando después de configurar IMO/MMSI

1. **Verifica que los identificadores sean correctos**:
   - IMO debe tener 7 dígitos
   - MMSI debe tener 9 dígitos
   - Verifica en MarineTraffic que coincidan con el nombre del buque

2. **Verifica que la API AIS esté configurada**:
   - Revisa que `VESSEL_API_BASE_URL` y `VESSEL_API_KEY` estén configuradas en Vercel
   - Ver `docs/CONFIGURAR-VARIABLES-API-AIS.md`

3. **Verifica que el nombre del buque coincida exactamente**:
   - El nombre debe coincidir exactamente con el que aparece en `registros.nave_inicial` (sin el viaje entre corchetes)
   - Ejemplo: Si en registros está "MANZANILLO EXPRESS [FA532R]", en `vessel_positions` debe estar "MANZANILLO EXPRESS"

### El buque no aparece en la lista de buques activos

- Verifica que haya registros activos con ese buque en la tabla `registros`
- Los registros deben tener `deleted_at IS NULL` y `estado != 'CANCELADO'`
- Debe tener `eta IS NULL` o `eta > NOW()`

---

## 📝 Notas Importantes

- **IMO es preferible sobre MMSI**: Si tienes ambos, usa IMO. Si solo tienes uno, cualquiera funciona.
- **El nombre del buque es case-sensitive**: "MANZANILLO EXPRESS" ≠ "Manzanillo Express"
- **El cron job respeta límites**: Solo actualiza posiciones si han pasado 24 horas desde la última llamada
- **Los identificadores se guardan automáticamente**: Cuando la API AIS devuelve IMO/MMSI, se guardan en `vessel_positions` para futuras búsquedas

---

## 🔗 Referencias

- [Documentación de seguimiento de buques](./seguimiento-buques.md)
- [Configurar variables de API AIS](./CONFIGURAR-VARIABLES-API-AIS.md)
- [Configurar cron job externo](./CONFIGURAR-CRON-EXTERNO-GRATIS.md)


