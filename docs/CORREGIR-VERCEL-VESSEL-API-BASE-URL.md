# ⚠️ IMPORTANTE: Corregir VESSEL_API_BASE_URL en Vercel

## 🔴 Problema Detectado

En Vercel, la variable `VESSEL_API_BASE_URL` está configurada con el endpoint completo:
```
https://datadocked.com/api/vessels_operations/get-vessel-info
```

Pero el código espera **solo la base URL** porque construye el path completo automáticamente.

## ✅ Solución

### En Vercel:

1. Ve a **Settings → Environment Variables**
2. Busca `VESSEL_API_BASE_URL`
3. Haz clic en los **3 puntos (⋯)** → **Edit**
4. Cambia el valor a:
   ```
   https://datadocked.com/api
   ```
   (Sin el path `/vessels_operations/get-vessel-info`)
5. Guarda los cambios
6. **Redesplega** el proyecto

## 📝 ¿Por qué?

El código en `src/lib/vessel-ais-client.ts` construye la URL así:
```typescript
const url = `${VESSEL_API_BASE_URL}/vessels_operations/get-vessel-info?imo_or_mmsi=${identifier}`;
```

Si `VESSEL_API_BASE_URL` ya incluye `/vessels_operations/get-vessel-info`, la URL final será incorrecta:
```
https://datadocked.com/api/vessels_operations/get-vessel-info/vessels_operations/get-vessel-info?imo_or_mmsi=...
```

## ✅ Valor Correcto

- ✅ **Correcto**: `https://datadocked.com/api`
- ❌ **Incorrecto**: `https://datadocked.com/api/vessels_operations/get-vessel-info`

## 🔄 Después de Corregir

1. Redesplega en Vercel
2. Prueba la actualización de posiciones
3. Deberías ver en los logs que la URL se construye correctamente

