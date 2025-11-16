# Configurar Cron Job Externo (Gratis)

## 🎯 Problema

Vercel Cron Jobs solo están disponibles en el plan **Pro** ($20/mes). Si estás en el plan **Hobby** (gratuito), necesitas usar un servicio externo.

## ✅ Solución: Servicios Gratuitos

Hay varias opciones gratuitas para ejecutar el cron job automáticamente:

---

## Opción 1: cron-job.org (Recomendado - Gratis)

### Pasos:

1. **Crear cuenta**:
   - Ve a [https://cron-job.org](https://cron-job.org)
   - Crea una cuenta gratuita (no requiere tarjeta)

2. **Crear nuevo cron job**:
   - Haz clic en "Create cronjob"
   - Configura:
     - **Title**: `Actualizar posiciones de buques`
     - **Address (URL)**: `https://registo-de-embarques-asli-toox.vercel.app/api/vessels/update-positions-cron`
     - **Schedule**: 
       - Selecciona "Daily"
       - Hora: `08:30`
       - Zona horaria: `UTC`
     - **Request method**: `GET`
     - **Request headers** (opcional, si configuraste CRON_SECRET):
       - Header name: `Authorization`
       - Header value: `Bearer TU_CRON_SECRET`

3. **Guardar y activar**:
   - Haz clic en "Create cronjob"
   - El cron job se ejecutará automáticamente todos los días a las 8:30 UTC

### Ventajas:
- ✅ Completamente gratis
- ✅ Muy confiable
- ✅ Notificaciones por email si falla
- ✅ Historial de ejecuciones

---

## Opción 2: EasyCron (Gratis)

1. Ve a [https://www.easycron.com](https://www.easycron.com)
2. Crea cuenta gratuita
3. Crea nuevo cron job:
   - URL: `https://registo-de-embarques-asli-toox.vercel.app/api/vessels/update-positions-cron`
   - Schedule: `30 8 * * *` (8:30 UTC diario)
   - Method: GET

---

## Opción 3: GitHub Actions (Si tienes el repo en GitHub)

Puedo crear un workflow de GitHub Actions que se ejecute diariamente. Es completamente gratis y se ejecuta en los servidores de GitHub.

---

## Opción 4: Uptime Robot (Gratis - Monitoreo + Cron)

1. Ve a [https://uptimerobot.com](https://uptimerobot.com)
2. Crea cuenta gratuita
3. Crea un "HTTP(s) Monitor" que llame al endpoint cada 24 horas

---

## 🔒 Seguridad (Opcional)

**Por defecto, el endpoint funciona sin configuración adicional** para facilitar el uso con servicios externos.

Si quieres agregar seguridad adicional, configura `CRON_SECRET`:

1. **En Vercel**:
   - Ve a Settings → Environment Variables
   - Agrega: `CRON_SECRET` = un string aleatorio (ej: `mi-secreto-super-seguro-123`)
   - **Importante**: Despliega nuevamente después de agregar la variable

2. **En el servicio de cron** (ej: cron-job.org):
   - Ve a la configuración del cron job
   - Agrega un header HTTP:
     - Name: `Authorization`
     - Value: `Bearer mi-secreto-super-seguro-123`

3. **El endpoint verificará este header** antes de ejecutar

**Nota**: Si no configuras `CRON_SECRET`, el endpoint seguirá funcionando, pero será accesible públicamente. Para producción, se recomienda configurarlo.

---

## 📊 Verificar que Funciona

Después de configurar el cron externo:

1. **Prueba manualmente**:
   ```bash
   curl https://registo-de-embarques-asli-toox.vercel.app/api/vessels/update-positions-cron
   ```
   
   O abre en tu navegador:
   ```
   https://registo-de-embarques-asli-toox.vercel.app/api/vessels/update-positions-cron
   ```

2. **Revisa los logs en Vercel**:
   - Ve a tu proyecto → Logs
   - Filtra por `/api/vessels/update-positions-cron`
   - Deberías ver las ejecuciones

3. **Revisa la respuesta**:
   El endpoint devuelve un JSON con:
   ```json
   {
     "message": "Proceso de actualización completado",
     "timestamp": "2025-11-16T08:30:00.000Z",
     "totalActiveVessels": 5,
     "updated": ["HMM BLESSING", ...],
     "skipped": [],
     "failed": []
   }
   ```

---

## ⚠️ Importante

- **Variables de entorno requeridas**: Antes de configurar el cron externo, asegúrate de tener configuradas en Vercel:
  - `VESSEL_API_BASE_URL` = `https://datadocked.com/api`
  - `VESSEL_API_KEY` = tu API key de DataDocked
  - Ver: `docs/CONFIGURAR-VARIABLES-API-AIS.md` para instrucciones detalladas
- El endpoint está configurado para aceptar llamadas de servicios externos
- Si configuraste `CRON_SECRET`, asegúrate de incluirlo en el header
- El cron job se ejecutará todos los días a las 8:30 UTC
- Solo actualizará buques que tengan IMO/MMSI configurado

---

## 🚀 Recomendación

**Usa cron-job.org** porque:
- Es el más fácil de configurar
- Tiene buena documentación
- Es confiable y gratis
- Te envía notificaciones si algo falla

¿Quieres que te ayude a configurar alguna de estas opciones?

