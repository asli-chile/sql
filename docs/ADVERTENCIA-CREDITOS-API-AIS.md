# ⚠️ Advertencia: Créditos de la API AIS (DataDocked)

## 💰 ¿Cuántos Créditos Consume?

**Cada llamada a la API de DataDocked consume 5 créditos por buque.**

Esto significa:
- Si tienes 5 buques activos con IMO/MMSI configurado
- Y pruebas el endpoint manualmente
- Se harán 5 llamadas = **25 créditos consumidos**

---

## ⚠️ ¿Probar el Endpoint Gasta Créditos?

**SÍ**, si:
- ✅ Hay buques activos con IMO/MMSI configurado
- ✅ El endpoint hace la llamada a DataDocked
- ✅ Se actualizan las posiciones

**NO**, si:
- ❌ No hay buques activos
- ❌ Los buques no tienen IMO/MMSI configurado (aparecerán en `failed` o `missingIdentifiers`)
- ❌ Los buques ya se actualizaron hace menos de 24 horas (aparecerán en `skipped`)

---

## 🧪 Cómo Probar SIN Gastar Créditos

### Opción 1: Verificar Primero los Buques

Antes de probar, verifica qué buques se actualizarían:

```sql
-- Ejecuta en Supabase SQL Editor
SELECT 
  vessel_name,
  imo,
  mmsi,
  last_api_call_at,
  CASE 
    WHEN imo IS NULL AND mmsi IS NULL THEN '❌ Sin IMO/MMSI (NO gastará créditos)'
    WHEN last_api_call_at IS NULL THEN '⚠️ Primera vez (SÍ gastará créditos)'
    WHEN last_api_call_at > NOW() - INTERVAL '24 hours' THEN '⏸️ Reciente (NO gastará, estará en skipped)'
    ELSE '✅ Se actualizará (SÍ gastará créditos)'
  END AS estado
FROM vessel_positions
WHERE vessel_name IN (
  SELECT DISTINCT
    CASE 
      WHEN nave_inicial ~ '\[.+\]' THEN 
        TRIM(REGEXP_REPLACE(nave_inicial, '\s*\[.+\]$', ''))
      ELSE 
        TRIM(nave_inicial)
    END
  FROM registros
  WHERE deleted_at IS NULL
    AND estado != 'CANCELADO'
    AND (eta IS NULL OR eta > NOW())
);
```

**Si todos los buques están en "Sin IMO/MMSI" o "Reciente"**, no gastarás créditos.

---

### Opción 2: Probar Solo con un Buque

Si quieres probar con un solo buque para verificar que funciona:

1. **Temporalmente, elimina o comenta los otros buques** en `vessel_positions` (solo para prueba)
2. O asegúrate de que solo un buque tenga IMO/MMSI y los demás no

**⚠️ CUIDADO**: Esto solo es para pruebas. No lo dejes así en producción.

---

### Opción 3: Revisar los Logs en Vercel

En lugar de probar manualmente, revisa los logs del cron job que ya se ejecutó:

1. Ve a Vercel Dashboard → Tu Proyecto → Logs
2. Filtra por: `/api/vessels/update-positions-cron`
3. Busca la ejecución más reciente
4. Revisa los mensajes:
   - `[AIS] Variables de entorno... no están definidas` → No gastó créditos
   - `[AIS] No se llamó a DataDocked porque no hay IMO ni MMSI` → No gastó créditos
   - `[AIS] Error llamando a la API AIS externa` → Intentó pero falló (puede haber gastado)
   - Si no hay mensajes de AIS, probablemente no se hizo la llamada

---

### Opción 4: Probar con un Endpoint de Prueba (Sin Créditos)

Puedo crear un endpoint de prueba que simule la llamada pero no consuma créditos. ¿Quieres que lo cree?

---

## 📊 Cómo Saber si se Gastaron Créditos

### Revisa la Respuesta del Endpoint

Si pruebas el endpoint y obtienes esta respuesta:

```json
{
  "updated": ["BUQUE 1", "BUQUE 2"],
  "failed": [],
  "skipped": []
}
```

**Significa que se actualizaron 2 buques = 10 créditos consumidos** (5 créditos × 2 buques).

Si obtienes:

```json
{
  "updated": [],
  "failed": [
    {
      "vessel_name": "BUQUE 1",
      "reason": "No tiene IMO/MMSI configurado..."
    }
  ],
  "skipped": []
}
```

**Significa que NO se gastaron créditos** porque no se hizo la llamada a DataDocked.

---

## 💡 Recomendación

**Antes de probar manualmente**:

1. ✅ Verifica cuántos buques tienen IMO/MMSI configurado
2. ✅ Verifica cuándo fue la última actualización de cada buque
3. ✅ Si todos están recientes (menos de 24 horas), aparecerán en `skipped` y NO gastarás créditos
4. ✅ Si quieres probar, hazlo con pocos buques o cuando realmente necesites actualizar

**El cron job automático está diseñado para**:
- Actualizar solo si han pasado 24 horas desde la última actualización
- No actualizar buques sin IMO/MMSI
- Minimizar el consumo de créditos

---

## 🔍 Verificar Estado Actual

Ejecuta este script SQL para ver el estado actual:

```sql
-- Ver buques que se actualizarían (gastarían créditos)
SELECT 
  vessel_name,
  imo,
  mmsi,
  last_api_call_at,
  CASE 
    WHEN last_api_call_at IS NULL THEN 'Primera vez - SÍ gastará créditos'
    WHEN last_api_call_at < NOW() - INTERVAL '24 hours' THEN 'Pendiente actualización - SÍ gastará créditos'
    ELSE 'Reciente - NO gastará (skipped)'
  END AS estado_creditos
FROM vessel_positions
WHERE imo IS NOT NULL OR mmsi IS NOT NULL
ORDER BY last_api_call_at NULLS FIRST;
```

---

## ⚠️ Resumen

- **Probar el endpoint manualmente SÍ puede gastar créditos**
- **Cada buque actualizado = 5 créditos**
- **Los buques sin IMO/MMSI NO gastan créditos**
- **Los buques actualizados hace menos de 24 horas NO gastan créditos (skipped)**
- **Revisa primero el estado antes de probar**

¿Quieres que te ayude a verificar cuántos créditos gastarías antes de probar?

