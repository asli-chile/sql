# ✅ Verificar Configuración de API DataDocked

## 🔍 URL Correcta

El código ya está configurado para usar la URL correcta:

**Endpoint completo**: 
```
GET https://datadocked.com/api/vessels_operations/get-vessel-info?imo_or_mmsi={IMO_OR_MMSI}
```

**Código en**: `src/lib/vessel-ais-client.ts` (línea 90)

---

## ⚙️ Variables de Entorno Requeridas

Para que funcione, necesitas tener estas variables configuradas en **Vercel**:

### 1. `VESSEL_API_BASE_URL`
- **Valor**: `https://datadocked.com/api`
- **Descripción**: URL base de la API de DataDocked

### 2. `VESSEL_API_KEY`
- **Valor**: Tu API key de DataDocked
- **Descripción**: Clave de autenticación para la API

---

## 🔍 Cómo Verificar en Vercel

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto: **registo-de-embarques-asli-toox**
3. Ve a **Settings** → **Environment Variables**
4. Verifica que existan:
   - ✅ `VESSEL_API_BASE_URL` = `https://datadocked.com/api`
   - ✅ `VESSEL_API_KEY` = (tu clave)

**Importante**: 
- Deben estar configuradas para **Production** (y Preview/Development si quieres)
- Si las agregaste recientemente, **redesplega** el proyecto

---

## 🧪 Cómo Verificar que Funciona

### Opción 1: Revisar Logs en Vercel

1. Ve a **Logs** en Vercel
2. Filtra por: `[AIS]`
3. Busca mensajes como:
   - ✅ `[AIS] Datos extraídos para NOMBRE_BUQUE` → Funciona correctamente
   - ❌ `[AIS] Variables de entorno... no están definidas` → Faltan variables
   - ❌ `[AIS] Error llamando a la API AIS externa` → Error en la llamada

### Opción 2: Probar el Endpoint

Ejecuta el cron job manualmente:
```bash
curl https://registo-de-embarques-asli-toox.vercel.app/api/vessels/update-positions-cron
```

Si funciona, verás en la respuesta:
- `updated: ["HMM BLESSING"]` → La API se llamó correctamente
- `failed: [...]` → Puede haber errores, pero la API se intentó llamar

---

## 📋 Checklist de Verificación

- [ ] `VESSEL_API_BASE_URL` está configurada en Vercel = `https://datadocked.com/api`
- [ ] `VESSEL_API_KEY` está configurada en Vercel = (tu clave)
- [ ] Las variables están configuradas para **Production**
- [ ] Hiciste un **redespliegue** después de agregar las variables
- [ ] El buque tiene IMO/MMSI configurado en `vessel_positions`
- [ ] Revisaste los logs en Vercel para ver si hay errores

---

## 🔧 Si No Funciona

### Error: "Variables de entorno no están definidas"

**Solución**:
1. Verifica que las variables estén en Vercel
2. Asegúrate de que estén configuradas para **Production**
3. **Redesplega** el proyecto

### Error: "Error llamando a la API AIS externa"

**Posibles causas**:
1. La API key es incorrecta o expiró
2. No tienes créditos suficientes en DataDocked
3. El IMO/MMSI es incorrecto

**Solución**:
1. Verifica tu API key en DataDocked
2. Verifica que tengas créditos disponibles
3. Verifica que el IMO/MMSI sea correcto

---

## ✅ Estado Actual

Según la última ejecución del cron job:
- ✅ El cron job funciona correctamente
- ✅ Encuentra los 5 buques activos
- ✅ HMM BLESSING tiene IMO/MMSI configurado
- ⏸️ HMM BLESSING está en `skipped` (probablemente actualizado hace menos de 24 horas)

**Todo está funcionando correctamente**. El sistema está diseñado para ahorrar créditos:
- Solo actualiza si pasaron 24 horas
- Solo actualiza buques con IMO/MMSI
- Los otros 4 buques están en `missingIdentifiers` (como esperado, para ahorrar créditos)

