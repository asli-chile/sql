# 🔍 Diagnóstico: Cron Job No Se Ejecuta

## ⚠️ Problema Común

El cron job de actualización de posiciones de buques no se ejecutó a la hora programada.

---

## 🔎 Paso 1: Verificar Plan de Vercel

**IMPORTANTE**: Los Vercel Cron Jobs **SOLO funcionan en el plan Pro** ($20/mes).

### ¿Estás en plan Hobby (gratuito)?

Si estás en el plan **Hobby**, los cron jobs de Vercel **NO funcionarán**. Necesitas usar un servicio externo.

**Solución**: Usa [cron-job.org](https://cron-job.org) (gratis). Ver: `docs/CONFIGURAR-CRON-EXTERNO-GRATIS.md`

### ¿Estás en plan Pro?

Si estás en plan Pro, continúa con el diagnóstico.

---

## 🔎 Paso 2: Verificar Configuración en vercel.json

Revisa que `vercel.json` tenga la configuración correcta:

```json
{
  "crons": [
    {
      "path": "/api/vessels/update-positions-cron",
      "schedule": "30 8 * * *"
    }
  ]
}
```

**Nota**: `"30 8 * * *"` significa **8:30 UTC**, no 7:00 AM.

### Si quieres que se ejecute a las 7:00 AM UTC:

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

### Si quieres que se ejecute a las 7:00 AM hora de Chile (UTC-3):

Chile está en UTC-3, así que 7:00 AM Chile = 10:00 AM UTC:

```json
{
  "crons": [
    {
      "path": "/api/vessels/update-positions-cron",
      "schedule": "0 10 * * *"
    }
  ]
}
```

**Después de cambiar `vercel.json`**:
1. Haz commit y push a GitHub
2. Vercel hará un nuevo deploy automáticamente
3. El cron job se actualizará con el nuevo horario

---

## 🔎 Paso 3: Verificar que el Cron Job Está Activo en Vercel

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Ve a la pestaña **"Crons"** (o "Cron Jobs")
3. Deberías ver el cron job `update-positions-cron` listado
4. Verifica que esté **"Active"** (no pausado)

**Si no ves la pestaña "Crons"**:
- Significa que estás en plan Hobby (gratuito)
- Necesitas usar un servicio externo (ver Paso 1)

---

## 🔎 Paso 4: Verificar Logs en Vercel

1. Ve a tu proyecto en Vercel Dashboard
2. Ve a la pestaña **"Logs"**
3. Filtra por: `/api/vessels/update-positions-cron`
4. Busca ejecuciones alrededor de la hora programada

**Si no hay logs**:
- El cron job no se ejecutó
- Verifica que estés en plan Pro
- Verifica que el cron job esté activo

**Si hay logs con errores**:
- Revisa el error específico
- Verifica las variables de entorno

---

## 🔎 Paso 5: Probar el Endpoint Manualmente

Prueba si el endpoint funciona manualmente:

### Opción A: Desde el navegador

Abre esta URL (reemplaza con tu dominio):
```
https://tu-dominio.vercel.app/api/vessels/update-positions-cron
```

### Opción B: Desde la terminal (curl)

```bash
curl https://tu-dominio.vercel.app/api/vessels/update-positions-cron
```

**Si obtienes un error 401 (No autorizado)**:
- Verifica si configuraste `CRON_SECRET`
- Si lo configuraste, agrega el header:
  ```bash
  curl -H "Authorization: Bearer TU_CRON_SECRET" \
       https://tu-dominio.vercel.app/api/vessels/update-positions-cron
  ```

**Si obtienes un JSON con el resultado**:
- El endpoint funciona correctamente
- El problema es solo la programación del cron

---

## 🔎 Paso 6: Verificar Variables de Entorno

Asegúrate de tener configuradas estas variables en Vercel:

1. **VESSEL_API_BASE_URL**: `https://datadocked.com/api`
2. **VESSEL_API_KEY**: Tu API key de DataDocked
3. **CRON_SECRET** (opcional): Solo si quieres seguridad adicional

**Cómo verificar**:
1. Ve a Settings → Environment Variables
2. Verifica que estén configuradas para **Production**
3. Si las agregaste recientemente, **redesplega** el proyecto

---

## 🔎 Paso 7: Verificar Zona Horaria

**IMPORTANTE**: Vercel usa **UTC** para los cron jobs.

- Si configuraste `"0 7 * * *"`, se ejecuta a las **7:00 AM UTC**
- En Chile (UTC-3), eso sería las **4:00 AM hora local**

**Para ejecutar a las 7:00 AM hora de Chile**:
- Chile UTC-3 → 7:00 AM Chile = 10:00 AM UTC
- Configura: `"0 10 * * *"`

**Tabla de conversión (Chile UTC-3)**:
- 7:00 AM Chile = 10:00 AM UTC → `"0 10 * * *"`
- 8:00 AM Chile = 11:00 AM UTC → `"0 11 * * *"`
- 9:00 AM Chile = 12:00 PM UTC → `"0 12 * * *"`

---

## ✅ Solución Rápida: Usar Servicio Externo (Recomendado)

Si estás en plan Hobby o quieres más control, usa **cron-job.org**:

1. Ve a [https://cron-job.org](https://cron-job.org)
2. Crea cuenta gratuita
3. Crea nuevo cron job:
   - **Title**: `Actualizar posiciones de buques`
   - **URL**: `https://tu-dominio.vercel.app/api/vessels/update-positions-cron`
   - **Schedule**: 
     - Selecciona "Daily"
     - Hora: `07:00` (o la que prefieras)
     - Zona horaria: `America/Santiago` (o la tuya)
   - **Method**: `GET`
4. Guarda y activa

**Ventajas**:
- ✅ Funciona en cualquier plan de Vercel
- ✅ Puedes elegir la zona horaria
- ✅ Notificaciones por email si falla
- ✅ Historial de ejecuciones
- ✅ Completamente gratis

Ver guía completa: `docs/CONFIGURAR-CRON-EXTERNO-GRATIS.md`

---

## 🐛 Troubleshooting Específico

### El cron job se ejecutó pero no actualizó buques

1. Revisa los logs para ver qué buques están en `failed`
2. Verifica que los buques tengan IMO/MMSI configurado
3. Verifica que la API AIS esté configurada correctamente

### Error: "No autorizado"

- Si configuraste `CRON_SECRET`, asegúrate de incluirlo en el header
- Si usas servicio externo, agrega el header en la configuración

### El cron job se ejecuta pero falla la llamada a DataDocked

- Verifica que `VESSEL_API_BASE_URL` y `VESSEL_API_KEY` estén correctas
- Revisa los logs para ver el error específico de la API

---

## 📋 Checklist de Verificación

Antes de reportar un problema, verifica:

- [ ] ¿Estás en plan Vercel Pro? (si no, usa servicio externo)
- [ ] ¿El cron job está listado en Vercel Dashboard → Crons?
- [ ] ¿El cron job está "Active"?
- [ ] ¿Probaste el endpoint manualmente y funciona?
- [ ] ¿Las variables de entorno están configuradas?
- [ ] ¿El horario en `vercel.json` es correcto (en UTC)?
- [ ] ¿Hiciste un nuevo deploy después de cambiar `vercel.json`?
- [ ] ¿Revisaste los logs en Vercel para ver si hay errores?

---

## 🚀 Solución Recomendada

**Para evitar problemas, usa cron-job.org**:

1. Es más confiable que depender del plan de Vercel
2. Funciona en cualquier plan
3. Tienes más control sobre la programación
4. Recibes notificaciones si algo falla
5. Es completamente gratis

¿Necesitas ayuda configurando cron-job.org? Ver: `docs/CONFIGURAR-CRON-EXTERNO-GRATIS.md`

