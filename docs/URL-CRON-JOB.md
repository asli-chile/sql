# URL del Cron Job para Actualización de Posiciones

## 🔗 URL del Endpoint

```
https://registo-de-embarques-asli-toox.vercel.app/api/vessels/update-positions-cron
```

## 📋 Configuración Rápida en cron-job.org

1. Ve a [https://cron-job.org](https://cron-job.org)
2. Crea cuenta gratuita
3. Crea nuevo cron job con estos datos:

   - **Title**: `Actualizar posiciones de buques ASLI`
   - **Address (URL)**: 
     ```
     https://registo-de-embarques-asli-toox.vercel.app/api/vessels/update-positions-cron
     ```
   - **Schedule**: 
     - Tipo: `Daily`
     - Hora: `08:30`
     - Zona horaria: `UTC`
   - **Request method**: `GET`

4. Guarda y activa

## ✅ Verificar que Funciona

Abre esta URL en tu navegador para probar manualmente:
```
https://registo-de-embarques-asli-toox.vercel.app/api/vessels/update-positions-cron
```

Deberías ver un JSON con el resultado de la actualización.

## 🔒 Seguridad (Opcional)

Si quieres proteger el endpoint, configura `CRON_SECRET` en Vercel y agrega el header en cron-job.org:
- Header name: `Authorization`
- Header value: `Bearer TU_CRON_SECRET`

