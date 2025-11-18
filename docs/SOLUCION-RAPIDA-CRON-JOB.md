# ⚡ Solución Rápida: Cron Job No Se Ejecuta

## 🎯 Problema

El cron job no se ejecutó a las 7 de la mañana como esperabas.

---

## ✅ Solución Inmediata (5 minutos)

### Opción 1: Usar cron-job.org (Recomendado - Gratis)

**Esta es la solución más confiable y funciona en cualquier plan de Vercel.**

1. **Ve a [cron-job.org](https://cron-job.org)**
   - Crea una cuenta gratuita (no requiere tarjeta)

2. **Crea un nuevo cron job**:
   - Haz clic en "Create cronjob"
   - **Title**: `Actualizar posiciones de buques`
   - **Address (URL)**: 
     ```
     https://registo-de-embarques-asli-toox.vercel.app/api/vessels/update-positions-cron
     ```
   - **Schedule**: 
     - Selecciona "Daily"
     - Hora: `07:00`
     - Zona horaria: `America/Santiago` (o la tuya)
   - **Request method**: `GET`
   - **Request headers** (opcional, solo si configuraste CRON_SECRET):
     - Header name: `Authorization`
     - Header value: `Bearer TU_CRON_SECRET`

3. **Guarda y activa**
   - Haz clic en "Create cronjob"
   - El cron job se ejecutará automáticamente todos los días a las 7:00 AM

**Ventajas**:
- ✅ Funciona en cualquier plan de Vercel (incluso Hobby/gratuito)
- ✅ Puedes elegir la zona horaria
- ✅ Notificaciones por email si falla
- ✅ Historial de ejecuciones
- ✅ Completamente gratis

---

### Opción 2: Verificar Plan de Vercel

**IMPORTANTE**: Los Vercel Cron Jobs **solo funcionan en el plan Pro** ($20/mes).

Si estás en plan **Hobby** (gratuito):
- Los cron jobs de Vercel **NO funcionarán**
- **Solución**: Usa cron-job.org (Opción 1)

Si estás en plan **Pro**:
1. Ve a tu proyecto en Vercel Dashboard
2. Ve a la pestaña **"Crons"**
3. Verifica que el cron job esté listado y **"Active"**
4. Revisa los logs para ver si se ejecutó

---

## 🔧 Verificar que el Endpoint Funciona

Antes de configurar el cron, prueba que el endpoint funciona:

### Desde el navegador:

Abre esta URL:
```
https://registo-de-embarques-asli-toox.vercel.app/api/vessels/update-positions-cron
```

### Desde la terminal:

```bash
# Sin autenticación
curl https://registo-de-embarques-asli-toox.vercel.app/api/vessels/update-positions-cron

# Con autenticación (si configuraste CRON_SECRET)
curl -H "Authorization: Bearer TU_CRON_SECRET" \
     https://registo-de-embarques-asli-toox.vercel.app/api/vessels/update-positions-cron
```

### Usando el script de prueba:

```bash
# Configura las variables de entorno (opcional)
export CRON_ENDPOINT_URL="https://registo-de-embarques-asli-toox.vercel.app/api/vessels/update-positions-cron"
export CRON_SECRET="tu-secreto-si-lo-configuraste"

# Ejecuta el script
node scripts/test-cron-endpoint.js
```

**Si obtienes un JSON con el resultado**, el endpoint funciona correctamente.

---

## ⏰ Cambiar el Horario

Si quieres cambiar el horario del cron job:

### En vercel.json (solo plan Pro):

```json
{
  "crons": [
    {
      "path": "/api/vessels/update-positions-cron",
      "schedule": "0 7 * * *"
    }
  ]
}
```

**Nota**: Vercel usa **UTC**. Si quieres 7:00 AM hora de Chile (UTC-3):
- 7:00 AM Chile = 10:00 AM UTC
- Configura: `"0 10 * * *"`

**Después de cambiar**:
1. Haz commit y push
2. Vercel hará un nuevo deploy
3. El cron job se actualizará

### En cron-job.org:

1. Ve a tu cron job
2. Haz clic en "Edit"
3. Cambia la hora y zona horaria
4. Guarda

---

## 🔍 Diagnóstico Completo

Si el problema persiste, revisa la guía completa de diagnóstico:

Ver: `docs/DIAGNOSTICO-CRON-JOB-NO-EJECUTA.md`

---

## 📋 Checklist Rápido

- [ ] ¿Probaste el endpoint manualmente? (debe devolver JSON)
- [ ] ¿Estás en plan Vercel Pro? (si no, usa cron-job.org)
- [ ] ¿Configuraste cron-job.org? (recomendado)
- [ ] ¿Las variables de entorno están en Vercel? (VESSEL_API_BASE_URL, VESSEL_API_KEY)
- [ ] ¿Revisaste los logs en Vercel?

---

## 🚀 Recomendación Final

**Usa cron-job.org** porque:
- ✅ Funciona en cualquier plan
- ✅ Es más confiable
- ✅ Tienes más control
- ✅ Notificaciones si falla
- ✅ Completamente gratis

¿Necesitas ayuda? Ver: `docs/CONFIGURAR-CRON-EXTERNO-GRATIS.md`

