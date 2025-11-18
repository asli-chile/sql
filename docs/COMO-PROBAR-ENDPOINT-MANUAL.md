# 🧪 Cómo Probar el Endpoint del Cron Job Manualmente

## 🎯 Métodos para Probar

### Método 1: Desde el Navegador (Más Fácil)

1. Abre tu navegador
2. Ve a esta URL (reemplaza con tu dominio):
   ```
   https://registo-de-embarques-asli-toox.vercel.app/api/vessels/update-positions-cron
   ```
3. Deberías ver un JSON con el resultado

**Ventaja**: No necesitas instalar nada, funciona inmediatamente.

---

### Método 2: Usando curl (Terminal)

Abre tu terminal (PowerShell en Windows, Terminal en Mac/Linux) y ejecuta:

```bash
curl https://registo-de-embarques-asli-toox.vercel.app/api/vessels/update-positions-cron
```

**Si configuraste CRON_SECRET**, agrega el header:

```bash
curl -H "Authorization: Bearer TU_CRON_SECRET" \
     https://registo-de-embarques-asli-toox.vercel.app/api/vessels/update-positions-cron
```

**Para ver la respuesta formateada** (Windows PowerShell):
```powershell
curl https://registo-de-embarques-asli-toox.vercel.app/api/vessels/update-positions-cron | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

---

### Método 3: Usando el Script Node.js

1. Abre tu terminal en la carpeta del proyecto
2. Ejecuta:
   ```bash
   node scripts/test-cron-endpoint.js
   ```

**Si quieres usar una URL diferente o CRON_SECRET**:
```bash
# Windows PowerShell
$env:CRON_ENDPOINT_URL="https://tu-dominio.vercel.app/api/vessels/update-positions-cron"
$env:CRON_SECRET="tu-secreto"
node scripts/test-cron-endpoint.js

# Mac/Linux
export CRON_ENDPOINT_URL="https://tu-dominio.vercel.app/api/vessels/update-positions-cron"
export CRON_SECRET="tu-secreto"
node scripts/test-cron-endpoint.js
```

---

### Método 4: Usando Postman o Insomnia

1. Abre Postman o Insomnia
2. Crea una nueva petición GET
3. URL: `https://registo-de-embarques-asli-toox.vercel.app/api/vessels/update-positions-cron`
4. Si configuraste CRON_SECRET, agrega header:
   - Key: `Authorization`
   - Value: `Bearer TU_CRON_SECRET`
5. Haz clic en "Send"

---

## 📊 Qué Esperar en la Respuesta

Si el endpoint funciona correctamente, deberías ver un JSON como este:

```json
{
  "message": "Proceso de actualización de posiciones de buques completado (cron job)",
  "timestamp": "2025-11-17T15:51:13.249Z",
  "totalActiveVessels": 5,
  "updated": ["HMM BLESSING"],
  "skipped": [],
  "failed": [
    {
      "vessel_name": "MANZANILLO EXPRESS",
      "reason": "No tiene IMO/MMSI configurado..."
    }
  ],
  "missingIdentifiers": []
}
```

---

## 🔍 Diagnóstico: El Cron Se Ejecuta Pero No Llama a DataDocked

Si el cron job se ejecuta pero **no hace la llamada a DataDocked**, verifica:

### 1. Variables de Entorno en Vercel

Asegúrate de tener estas variables configuradas:

- `VESSEL_API_BASE_URL` = `https://datadocked.com/api`
- `VESSEL_API_KEY` = Tu API key de DataDocked

**Cómo verificar**:
1. Ve a Vercel Dashboard → Tu Proyecto → Settings → Environment Variables
2. Verifica que estén configuradas para **Production**
3. Si las agregaste recientemente, **redesplega** el proyecto

### 2. Revisar los Logs en Vercel

1. Ve a Vercel Dashboard → Tu Proyecto → Logs
2. Filtra por: `/api/vessels/update-positions-cron`
3. Busca mensajes como:
   - `[AIS] Variables de entorno VESSEL_API_BASE_URL y/o VESSEL_API_KEY no están definidas`
   - `[AIS] No se llamó a DataDocked porque no hay IMO ni MMSI configurado`
   - Errores de la API de DataDocked

### 3. Verificar que los Buques Tengan IMO/MMSI

Si los buques no tienen IMO/MMSI configurado, el endpoint no llamará a DataDocked.

**Cómo verificar**:
```sql
-- Ejecuta en Supabase SQL Editor
SELECT vessel_name, imo, mmsi 
FROM vessel_positions 
WHERE imo IS NULL AND mmsi IS NULL;
```

**Solución**: Configura IMO/MMSI usando el script:
```bash
node scripts/set-vessel-imo-mmsi.js "NOMBRE DEL BUQUE" --imo 1234567
```

---

## 🐛 Errores Comunes

### Error 401 (No autorizado)

**Causa**: Configuraste `CRON_SECRET` pero no lo estás enviando.

**Solución**: Agrega el header `Authorization: Bearer TU_CRON_SECRET`

### Error: "Variables de entorno no definidas"

**Causa**: Las variables `VESSEL_API_BASE_URL` o `VESSEL_API_KEY` no están en Vercel.

**Solución**: 
1. Ve a Vercel → Settings → Environment Variables
2. Agrega las variables
3. Redesplega el proyecto

### El endpoint responde pero `updated` está vacío

**Causas posibles**:
1. Los buques no tienen IMO/MMSI configurado
2. Ya se actualizaron hace menos de 24 horas (están en `skipped`)
3. La API de DataDocked no devolvió datos válidos

**Solución**: Revisa el array `failed` en la respuesta para ver los motivos.

---

## ✅ Checklist de Verificación

Antes de reportar un problema:

- [ ] ¿Probaste el endpoint manualmente y funciona?
- [ ] ¿Las variables de entorno están en Vercel?
- [ ] ¿Hiciste un nuevo deploy después de agregar variables?
- [ ] ¿Los buques tienen IMO/MMSI configurado?
- [ ] ¿Revisaste los logs en Vercel?
- [ ] ¿La API key de DataDocked es válida?

---

## 🚀 Prueba Rápida

**Ejecuta esto en tu terminal**:

```bash
# Prueba básica
curl https://registo-de-embarques-asli-toox.vercel.app/api/vessels/update-positions-cron

# O usando el script
node scripts/test-cron-endpoint.js
```

Si ves un JSON con `message`, `timestamp`, `totalActiveVessels`, etc., el endpoint funciona.

Si ves un error o la respuesta está vacía, revisa los logs en Vercel para más detalles.

