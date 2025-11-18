# 🔍 Solución: Nombres No Coinciden Entre Registros y vessel_positions

## ⚠️ Problema

Tienes registros activos que cumplen todos los criterios, pero el cron job no encuentra los buques porque **los nombres no coinciden exactamente**.

---

## 🎯 Causa

El cron job hace un **matching exacto** entre:
- El nombre parseado de `registros.nave_inicial` (ej: "MAERSK BALI" de "MAERSK BALI [546N]")
- El nombre en `vessel_positions.vessel_name` (debe ser exactamente "MAERSK BALI")

**Cualquier diferencia** (mayúsculas, espacios, acentos) hará que no coincidan.

---

## 🔍 Verificación Rápida

Ejecuta este SQL para ver si los nombres coinciden:

```sql
-- Ver nombres parseados vs nombres en vessel_positions
WITH parsed_vessels AS (
  SELECT DISTINCT
    CASE 
      WHEN nave_inicial ~ '\[.+\]' THEN 
        TRIM(REGEXP_REPLACE(nave_inicial, '\s*\[.+\]$', ''))
      ELSE 
        TRIM(nave_inicial)
    END AS parsed_name,
    nave_inicial AS raw_name
  FROM registros
  WHERE deleted_at IS NULL
    AND estado != 'CANCELADO'
    AND (eta IS NULL OR eta > NOW())
)
SELECT 
  pv.parsed_name AS "Nombre desde registros",
  vp.vessel_name AS "Nombre en vessel_positions",
  CASE 
    WHEN pv.parsed_name = vp.vessel_name THEN '✅ COINCIDEN'
    WHEN UPPER(TRIM(pv.parsed_name)) = UPPER(TRIM(vp.vessel_name)) THEN '⚠️ Coinciden pero con diferencias (mayúsculas/espacios)'
    ELSE '❌ NO COINCIDEN'
  END AS "Estado",
  vp.imo,
  vp.mmsi
FROM parsed_vessels pv
FULL OUTER JOIN vessel_positions vp ON pv.parsed_name = vp.vessel_name
ORDER BY 
  CASE 
    WHEN pv.parsed_name = vp.vessel_name THEN 1
    WHEN UPPER(TRIM(pv.parsed_name)) = UPPER(TRIM(vp.vessel_name)) THEN 2
    ELSE 3
  END;
```

---

## ✅ Solución

### Opción 1: Corregir Nombres en vessel_positions (Recomendado)

Si los nombres en `vessel_positions` no coinciden, actualízalos para que coincidan exactamente:

```sql
-- Ejemplo: Si en vessel_positions está "Maersk Bali" pero debería ser "MAERSK BALI"
UPDATE vessel_positions
SET vessel_name = 'MAERSK BALI'
WHERE vessel_name = 'Maersk Bali';

-- O si hay espacios extra
UPDATE vessel_positions
SET vessel_name = TRIM(vessel_name);
```

### Opción 2: Corregir Nombres en Registros

Si los nombres en `registros.nave_inicial` están mal, corrígelos:

```sql
-- Ejemplo: Si está "maersk bali [546N]" pero debería ser "MAERSK BALI [546N]"
UPDATE registros
SET nave_inicial = 'MAERSK BALI [546N]'
WHERE nave_inicial = 'maersk bali [546N]';
```

### Opción 3: Script Automático para Sincronizar Nombres

Puedo crear un script que sincronice automáticamente los nombres. ¿Quieres que lo cree?

---

## 🔧 Script para Corregir Nombres Automáticamente

Ejecuta este script para normalizar los nombres en `vessel_positions` basándose en los nombres parseados de `registros`:

```sql
-- Normalizar nombres en vessel_positions basándose en registros activos
WITH parsed_vessels AS (
  SELECT DISTINCT
    CASE 
      WHEN nave_inicial ~ '\[.+\]' THEN 
        TRIM(REGEXP_REPLACE(nave_inicial, '\s*\[.+\]$', ''))
      ELSE 
        TRIM(nave_inicial)
    END AS correct_name,
    nave_inicial AS raw_name
  FROM registros
  WHERE deleted_at IS NULL
    AND estado != 'CANCELADO'
    AND (eta IS NULL OR eta > NOW())
    AND nave_inicial IS NOT NULL
    AND TRIM(nave_inicial) != ''
)
UPDATE vessel_positions vp
SET vessel_name = pv.correct_name
FROM parsed_vessels pv
WHERE UPPER(TRIM(vp.vessel_name)) = UPPER(TRIM(pv.correct_name))
  AND vp.vessel_name != pv.correct_name;
```

**⚠️ CUIDADO**: Este script actualiza los nombres. Revisa primero qué va a cambiar ejecutando un SELECT antes del UPDATE.

---

## 📋 Checklist

- [ ] ¿Ejecutaste el SQL de verificación?
- [ ] ¿Los nombres coinciden exactamente?
- [ ] ¿Hay diferencias de mayúsculas/minúsculas?
- [ ] ¿Hay espacios extra?
- [ ] ¿Corregiste los nombres en `vessel_positions`?
- [ ] ¿Probaste el endpoint nuevamente?

---

## 🚀 Próximos Pasos

1. **Ejecuta el SQL de verificación** para ver qué nombres no coinciden
2. **Corrige los nombres** en `vessel_positions` para que coincidan exactamente
3. **Verifica que tengan IMO/MMSI** configurado
4. **Prueba el endpoint** nuevamente

¿Quieres que te ayude a crear un script que corrija automáticamente los nombres?

