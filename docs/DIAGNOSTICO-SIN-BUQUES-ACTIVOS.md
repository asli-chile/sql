# 🔍 Diagnóstico: "No se encontraron buques activos"

## 📊 Respuesta del Endpoint

Si obtienes esta respuesta:

```json
{
  "message": "No se encontraron buques activos según los criterios actuales",
  "updated": [],
  "skipped": []
}
```

**Significa**:
- ✅ El endpoint funciona correctamente
- ✅ NO se gastaron créditos (no se llamó a DataDocked)
- ⚠️ No hay buques que cumplan los criterios de "activo"

---

## 🔎 Criterios para que un Buque Sea "Activo"

El cron job considera un buque como "activo" si cumple **TODOS** estos criterios:

1. ✅ Existe en la tabla `registros`
2. ✅ `deleted_at IS NULL` (no está borrado)
3. ✅ `estado != 'CANCELADO'` (no está cancelado)
4. ✅ `eta IS NULL OR eta > NOW()` (no tiene ETA o la ETA es futura)

---

## 🔍 Cómo Verificar Qué Buques Deberían Ser Activos

Ejecuta este SQL en Supabase para ver qué buques deberían aparecer:

```sql
-- Ver buques que deberían ser "activos" según los criterios
SELECT DISTINCT
  CASE 
    WHEN nave_inicial ~ '\[.+\]' THEN 
      TRIM(REGEXP_REPLACE(nave_inicial, '\s*\[.+\]$', ''))
    ELSE 
      TRIM(nave_inicial)
  END AS vessel_name,
  estado,
  eta,
  deleted_at,
  CASE 
    WHEN deleted_at IS NOT NULL THEN '❌ Está borrado'
    WHEN estado = 'CANCELADO' THEN '❌ Está cancelado'
    WHEN eta IS NOT NULL AND eta <= NOW() THEN '❌ ETA ya pasó'
    ELSE '✅ Debería ser activo'
  END AS razon
FROM registros
WHERE deleted_at IS NULL
  AND estado != 'CANCELADO'
  AND (eta IS NULL OR eta > NOW())
ORDER BY vessel_name;
```

---

## 🐛 Posibles Causas

### 1. Todos los Registros Están Cancelados o Borrados

**Verifica**:
```sql
SELECT COUNT(*) as total_registros,
       COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as borrados,
       COUNT(*) FILTER (WHERE estado = 'CANCELADO') as cancelados,
       COUNT(*) FILTER (WHERE deleted_at IS NULL AND estado != 'CANCELADO') as activos
FROM registros;
```

**Solución**: Asegúrate de tener registros con `estado != 'CANCELADO'` y `deleted_at IS NULL`.

---

### 2. Todas las ETAs Ya Pasaron

**Verifica**:
```sql
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE eta IS NULL) as sin_eta,
  COUNT(*) FILTER (WHERE eta IS NOT NULL AND eta > NOW()) as eta_futura,
  COUNT(*) FILTER (WHERE eta IS NOT NULL AND eta <= NOW()) as eta_pasada
FROM registros
WHERE deleted_at IS NULL
  AND estado != 'CANCELADO';
```

**Solución**: 
- Si todos tienen ETA pasada, el cron job no los considera activos
- Puedes modificar el criterio o agregar registros con ETA futura

---

### 3. No Hay Registros en la Tabla

**Verifica**:
```sql
SELECT COUNT(*) as total_registros FROM registros;
```

**Solución**: Si es 0, necesitas crear registros primero.

---

### 4. El Campo `nave_inicial` Está Vacío o es NULL

**Verifica**:
```sql
SELECT COUNT(*) as sin_nave
FROM registros
WHERE (nave_inicial IS NULL OR TRIM(nave_inicial) = '')
  AND deleted_at IS NULL
  AND estado != 'CANCELADO';
```

**Solución**: Asegúrate de que los registros tengan `nave_inicial` con un valor válido.

---

## ✅ Verificación Completa

Ejecuta este script completo para diagnosticar:

```sql
-- Diagnóstico completo de buques activos
WITH active_vessels AS (
  SELECT DISTINCT
    CASE 
      WHEN nave_inicial ~ '\[.+\]' THEN 
        TRIM(REGEXP_REPLACE(nave_inicial, '\s*\[.+\]$', ''))
      ELSE 
        TRIM(nave_inicial)
    END AS vessel_name,
    estado,
    eta,
    deleted_at
  FROM registros
  WHERE deleted_at IS NULL
    AND estado != 'CANCELADO'
    AND (eta IS NULL OR eta > NOW())
)
SELECT 
  COUNT(*) as total_buques_activos,
  COUNT(*) FILTER (WHERE vessel_name IS NULL OR TRIM(vessel_name) = '') as sin_nombre,
  COUNT(*) FILTER (WHERE vessel_name IS NOT NULL AND TRIM(vessel_name) != '') as con_nombre
FROM active_vessels;

-- Listar los buques activos encontrados
SELECT DISTINCT
  CASE 
    WHEN nave_inicial ~ '\[.+\]' THEN 
      TRIM(REGEXP_REPLACE(nave_inicial, '\s*\[.+\]$', ''))
    ELSE 
      TRIM(nave_inicial)
  END AS vessel_name
FROM registros
WHERE deleted_at IS NULL
  AND estado != 'CANCELADO'
  AND (eta IS NULL OR eta > NOW())
ORDER BY vessel_name;
```

---

## 🔧 Solución: Modificar Criterios (Opcional)

Si quieres que el cron job considere buques con ETA pasada, puedes modificar el criterio en el código:

**Archivo**: `app/api/vessels/update-positions-cron/route.ts`

**Línea actual** (aproximadamente línea 91):
```typescript
.or(`eta.is.null,eta.gt.${nowIso}`);
```

**Para incluir buques con ETA pasada** (últimos 30 días):
```typescript
// No agregar filtro de ETA, o usar un rango más amplio
```

**⚠️ CUIDADO**: Modificar esto puede hacer que se actualicen buques que ya llegaron, consumiendo créditos innecesariamente.

---

## 📋 Checklist de Verificación

- [ ] ¿Hay registros en la tabla `registros`?
- [ ] ¿Los registros tienen `deleted_at IS NULL`?
- [ ] ¿Los registros tienen `estado != 'CANCELADO'`?
- [ ] ¿Los registros tienen `nave_inicial` con valor?
- [ ] ¿Los registros tienen `eta IS NULL` o `eta > NOW()`?
- [ ] ¿Ejecutaste el SQL de diagnóstico?

---

## 💡 Recomendación

Si no hay buques activos, es normal que el cron job no haga nada. Esto es **bueno** porque:
- ✅ No se gastan créditos innecesariamente
- ✅ El sistema funciona correctamente
- ✅ Solo actualizará cuando realmente haya buques activos

**Cuando agregues registros con buques activos**, el cron job comenzará a actualizarlos automáticamente.

---

## 🚀 Próximos Pasos

1. **Ejecuta el SQL de diagnóstico** para ver qué está pasando
2. **Verifica que tengas registros activos** con buques
3. **Si no hay registros activos**, agrega algunos con:
   - `estado != 'CANCELADO'`
   - `deleted_at IS NULL`
   - `nave_inicial` con un valor válido
   - `eta IS NULL` o `eta` en el futuro

¿Quieres que te ayude a verificar por qué no hay buques activos?

