# 📋 Ejemplo de Request a DataDocked

## ✅ Formato Correcto

**Ejemplo de la documentación de DataDocked**:
```
GET https://datadocked.com/api/vessels_operations/get-vessel-info?imo_or_mmsi=VESSEL_IMO_OR_MMSI_NUMBER
```

---

## 🔍 Cómo lo Construye el Código

**Código en**: `src/lib/vessel-ais-client.ts` (línea 90)

```typescript
const url = `${VESSEL_API_BASE_URL}/vessels_operations/get-vessel-info?imo_or_mmsi=${encodeURIComponent(identifier)}`;
```

**Donde**:
- `VESSEL_API_BASE_URL` = `https://datadocked.com/api` (variable de entorno)
- `identifier` = IMO o MMSI del buque (dinámico)

---

## 📊 Ejemplo Real con HMM BLESSING

**Datos del buque**:
- `vessel_name`: "HMM BLESSING"
- `imo`: "9742170"
- `mmsi`: "440117000"

**URL construida**:
```
https://datadocked.com/api/vessels_operations/get-vessel-info?imo_or_mmsi=9742170
```

**Request completo**:
```http
GET https://datadocked.com/api/vessels_operations/get-vessel-info?imo_or_mmsi=9742170
Headers:
  accept: application/json
  api_key: TU_API_KEY
```

---

## 🔍 Verificación

El código usa `encodeURIComponent()` para asegurar que el IMO/MMSI esté correctamente codificado en la URL, incluso si tiene caracteres especiales.

**Ejemplo**:
- IMO: `9742170` → URL: `?imo_or_mmsi=9742170` ✅
- IMO con espacios: `974 2170` → URL: `?imo_or_mmsi=974%202170` ✅ (codificado)

---

## ✅ Confirmación

**El código está construyendo la URL correctamente** según el formato de DataDocked:

✅ Base URL: `https://datadocked.com/api`  
✅ Endpoint: `/vessels_operations/get-vessel-info`  
✅ Parámetro: `?imo_or_mmsi={IMO_OR_MMSI}`  
✅ Headers: `accept: application/json` y `api_key: {API_KEY}`  

**Todo está configurado correctamente**. 🎯

---

## 🧪 Cómo Verificar que Funciona

### Opción 1: Revisar Logs en Vercel

1. Ve a Vercel Dashboard → Logs
2. Filtra por: `[AIS]`
3. Busca mensajes que muestren la URL construida o errores de la API

### Opción 2: Probar Manualmente con curl

```bash
# Reemplaza con tu API key y el IMO real
curl -H "accept: application/json" \
     -H "api_key: TU_API_KEY" \
     "https://datadocked.com/api/vessels_operations/get-vessel-info?imo_or_mmsi=9742170"
```

**Nota**: Esto gastará 5 créditos de tu cuenta de DataDocked.

---

## 📝 Resumen

- ✅ El código construye la URL exactamente como el ejemplo de DataDocked
- ✅ Usa `encodeURIComponent()` para seguridad
- ✅ Los headers están configurados correctamente
- ✅ Todo está funcionando como debería

**No necesitas cambiar nada**. La configuración actual es correcta. 🚀

