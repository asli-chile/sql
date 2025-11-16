# Configuración de Cron Job para Actualización de Posiciones

## 📋 Resumen

El sistema ahora actualiza automáticamente las posiciones de los buques **cada 24 horas a las 8:30 UTC**.

## ⚙️ Configuración

### 1. Vercel Cron Jobs (Recomendado)

Si estás usando Vercel, el cron job ya está configurado en `vercel.json`:

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

**Horario**: `30 8 * * *` significa:
- `30` = minuto 30
- `8` = hora 8 (UTC)
- `*` = todos los días del mes
- `*` = todos los meses
- `*` = todos los días de la semana

**Resultado**: Se ejecuta todos los días a las **8:30 UTC**.

### 2. Verificar que funciona

Después de hacer deploy en Vercel:

1. Ve a tu proyecto en Vercel Dashboard
2. Ve a la sección **"Crons"**
3. Deberías ver el cron job `update-positions-cron` programado
4. Verifica que se ejecute correctamente revisando los logs

### 3. Servicios Externos (Alternativa)

Si no usas Vercel o quieres usar un servicio externo:

#### Opción A: cron-job.org

1. Crea una cuenta en [cron-job.org](https://cron-job.org)
2. Crea un nuevo cron job con:
   - **URL**: `https://tu-dominio.com/api/vessels/update-positions-cron`
   - **Schedule**: `30 8 * * *` (8:30 UTC diario)
   - **Method**: GET
   - **Headers**: 
     - Si configuraste `CRON_SECRET`, agrega:
       - `Authorization: Bearer TU_CRON_SECRET`

#### Opción B: Otros servicios

Puedes usar cualquier servicio de cron que permita hacer llamadas HTTP:
- EasyCron
- GitHub Actions (con schedule)
- AWS EventBridge
- Google Cloud Scheduler

## 🔒 Seguridad

### Variable de Entorno Opcional: `CRON_SECRET`

Para mayor seguridad, puedes configurar una variable de entorno `CRON_SECRET`:

1. En Vercel: Ve a Settings → Environment Variables
2. Agrega: `CRON_SECRET` = un string aleatorio seguro
3. Si usas servicios externos, agrega el header:
   ```
   Authorization: Bearer TU_CRON_SECRET
   ```

**Nota**: Si no configuras `CRON_SECRET`, el endpoint solo aceptará llamadas de Vercel Cron Jobs (con header `x-vercel-cron`).

## 📊 Monitoreo

### Ver logs de ejecución

1. **Vercel**: Ve a tu proyecto → Logs → Filtra por `/api/vessels/update-positions-cron`
2. **Respuesta del endpoint**: El endpoint devuelve un JSON con:
   ```json
   {
     "message": "Proceso de actualización completado",
     "timestamp": "2025-11-16T08:30:00.000Z",
     "totalActiveVessels": 5,
     "updated": ["HMM BLESSING", "OTRO BUQUE"],
     "skipped": [],
     "failed": [],
     "missingIdentifiers": []
   }
   ```

## ⏰ Cambiar el Horario

Para cambiar el horario de ejecución, edita `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/vessels/update-positions-cron",
      "schedule": "30 8 * * *"  // Cambia aquí
    }
  ]
}
```

**Formato cron**: `minuto hora día-mes mes día-semana`

Ejemplos:
- `0 0 * * *` = Medianoche UTC todos los días
- `0 12 * * *` = Mediodía UTC todos los días
- `30 8 * * 1-5` = 8:30 UTC solo días laborables (lunes-viernes)

## 🔄 Intervalo de Actualización

El sistema ahora actualiza las posiciones si han pasado **24 horas** desde la última actualización (anteriormente eran 3 días).

Esto significa que:
- Si el cron job se ejecuta diariamente a las 8:30 UTC
- Y un buque fue actualizado ayer a las 8:30 UTC
- Hoy a las 8:30 UTC se actualizará nuevamente

## ✅ Verificación Manual

Puedes probar el endpoint manualmente:

```bash
# Sin autenticación (solo en desarrollo)
curl https://tu-dominio.com/api/vessels/update-positions-cron

# Con autenticación (si configuraste CRON_SECRET)
curl -H "Authorization: Bearer TU_CRON_SECRET" \
     https://tu-dominio.com/api/vessels/update-positions-cron
```

## 🐛 Troubleshooting

### El cron job no se ejecuta

1. Verifica que `vercel.json` esté en la raíz del proyecto
2. Verifica que el path del endpoint sea correcto
3. Revisa los logs en Vercel Dashboard
4. Verifica que el proyecto esté desplegado correctamente

### Error 401 (No autorizado)

- Si configuraste `CRON_SECRET`, asegúrate de incluirlo en el header
- Si no configuraste `CRON_SECRET`, solo Vercel Cron Jobs pueden llamar al endpoint

### Los buques no se actualizan

1. Verifica que los buques tengan IMO/MMSI configurado
2. Revisa los logs para ver qué buques están en `missingIdentifiers`
3. Verifica que la API AIS esté configurada correctamente

