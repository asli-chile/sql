# 🔍 Solución: Buques con IMO/MMSI No Son Encontrados

## ⚠️ Problema

Tienes 5 buques en `vessel_positions` con IMO/MMSI configurado, pero el cron job no los encuentra.

---

## 🎯 Causa Principal

**El cron job busca buques activos desde la tabla `registros`, NO desde `vessel_positions`.**

El flujo es:
1. ✅ Busca registros activos en `registros` (con criterios: no borrados, no cancelados, ETA futura)
2. ✅ Extrae el nombre del buque de `nave_inicial`
3. ✅ Busca esos buques en `vessel_positions` para ver si tienen IMO/MMSI
4. ✅ Si tienen IMO/MMSI, llama a la API

**Si los buques están en `vessel_positions` pero NO hay registros activos en `registros`**, el cron job no los encontrará.

---

## 🔍 Diagnóstico Rápido

Ejecuta este SQL en Supabase para ver qué está pasando:

```sql
-- Comparar buques en vessel_positions vs registros activos
WITH active_vessels_from_registros AS (
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
    AND nave_inicial IS NOT NULL
    AND TRIM(nave_inicial) != ''
),
vessels_with_imo_mmsi AS (
  SELECT vessel_name, imo, mmsi
  FROM vessel_positions
  WHERE imo IS NOT NULL OR mmsi IS NOT NULL
)
SELECT 
  COALESCE(av.vessel_name, vp.vessel_name) AS "Nombre del Buque",
  CASE 
    WHEN av.vessel_name IS NOT NULL AND vp.vessel_name IS NOT NULL THEN '✅ En ambos - SE ACTUALIZARÁ'
    WHEN av.vessel_name IS NOT NULL AND vp.vessel_name IS NULL THEN '⚠️ Solo en registros - Se creará en vessel_positions'
    WHEN av.vessel_name IS NULL AND vp.vessel_name IS NOT NULL THEN '❌ Solo en vessel_positions - NO SE ACTUALIZARÁ (falta registro activo)'
  END AS "Estado",
  vp.imo AS "IMO",
  vp.mmsi AS "MMSI"
FROM active_vessels_from_registros av
FULL OUTER JOIN vessels_with_imo_mmsi vp ON av.vessel_name = vp.vessel_name
ORDER BY 
  CASE 
    WHEN av.vessel_name IS NULL AND vp.vessel_name IS NOT NULL THEN 1
    ELSE 2
  END,
  COALESCE(av.vessel_name, vp.vessel_name);
```

---

## ✅ Solución

### Opción 1: Agregar Registros Activos (Recomendado)

Para que el cron job encuentre los buques, necesitas tener **registros activos** en la tabla `registros` con esos buques.

**Los registros deben cumplir**:
- ✅ `deleted_at IS NULL`
- ✅ `estado != 'CANCELADO'`
- ✅ `eta IS NULL` o `eta > NOW()` (ETA futura)
- ✅ `nave_inicial` debe contener el nombre del buque (puede tener formato "NOMBRE [VIAJE]")

**Ejemplo de registro activo**:
```sql
INSERT INTO registros (
  ref_asli,
  ejecutivo,
  shipper,
  booking,
  contenedor,
  naviera,
  nave_inicial,  -- Debe coincidir con vessel_name en vessel_positions
  especie,
  pol,
  pod,
  deposito,
  estado,
  flete,
  roleada_desde,
  tipo_ingreso,
  numero_bl,
  estado_bl,
  contrato,
  facturacion,
  booking_pdf,
  comentario,
  observacion,
  eta  -- NULL o fecha futura
) VALUES (
  'REF-001',
  'Ejecutivo',
  'Cliente',
  'BOOKING-001',
  'CONT-001',
  'Naviera',
  'MANZANILLO EXPRESS',  -- Debe coincidir exactamente con vessel_name
  'Especie',
  'POL',
  'POD',
  'Deposito',
  'PENDIENTE',  -- No 'CANCELADO'
  'Flete',
  'Roleada',
  'NORMAL',
  'BL-001',
  'Estado',
  'Contrato',
  'Facturacion',
  'PDF',
  'Comentario',
  'Observacion',
  NULL  -- O fecha futura
);
```

---

### Opción 2: Verificar que los Nombres Coincidan Exactamente

El nombre del buque en `registros.nave_inicial` debe coincidir **exactamente** con `vessel_positions.vessel_name` (después de parsear).

**Verifica**:
```sql
-- Ver cómo se parsean los nombres
SELECT 
  nave_inicial AS "Nave Inicial (Raw)",
  CASE 
    WHEN nave_inicial ~ '\[.+\]' THEN 
      TRIM(REGEXP_REPLACE(nave_inicial, '\s*\[.+\]$', ''))
    ELSE 
      TRIM(nave_inicial)
  END AS "Nombre Parseado",
  'Debe coincidir con vessel_name en vessel_positions' AS "Nota"
FROM registros
WHERE deleted_at IS NULL
  AND estado != 'CANCELADO'
  AND (eta IS NULL OR eta > NOW())
LIMIT 10;

-- Comparar con vessel_positions
SELECT 
  vp.vessel_name AS "En vessel_positions",
  r.nave_inicial AS "En registros (raw)",
  CASE 
    WHEN r.nave_inicial ~ '\[.+\]' THEN 
      TRIM(REGEXP_REPLACE(r.nave_inicial, '\s*\[.+\]$', ''))
    ELSE 
      TRIM(r.nave_inicial)
  END AS "En registros (parsed)",
  CASE 
    WHEN vp.vessel_name = CASE 
      WHEN r.nave_inicial ~ '\[.+\]' THEN 
        TRIM(REGEXP_REPLACE(r.nave_inicial, '\s*\[.+\]$', ''))
      ELSE 
        TRIM(r.nave_inicial)
    END THEN '✅ Coinciden'
    ELSE '❌ NO coinciden'
  END AS "Coincidencia"
FROM vessel_positions vp
LEFT JOIN registros r ON 
  vp.vessel_name = CASE 
    WHEN r.nave_inicial ~ '\[.+\]' THEN 
      TRIM(REGEXP_REPLACE(r.nave_inicial, '\s*\[.+\]$', ''))
    ELSE 
      TRIM(r.nave_inicial)
  END
WHERE vp.imo IS NOT NULL OR vp.mmsi IS NOT NULL
LIMIT 20;
```

---

### Opción 3: Modificar el Código (No Recomendado)

Si realmente quieres que el cron job busque buques directamente en `vessel_positions` sin necesidad de registros activos, puedes modificar el código, pero **esto no es recomendable** porque:

- ❌ Actualizaría buques que no tienen embarques activos
- ❌ Gastaría créditos innecesariamente
- ❌ No seguiría la lógica de negocio (solo actualizar buques con embarques activos)

---

## 📋 Checklist de Verificación

- [ ] ¿Hay registros en `registros` con esos buques?
- [ ] ¿Los registros tienen `deleted_at IS NULL`?
- [ ] ¿Los registros tienen `estado != 'CANCELADO'`?
- [ ] ¿Los registros tienen `eta IS NULL` o `eta > NOW()`?
- [ ] ¿El nombre en `nave_inicial` coincide con `vessel_name` en `vessel_positions`?
- [ ] ¿Ejecutaste el SQL de diagnóstico?

---

## 🚀 Próximos Pasos

1. **Ejecuta el SQL de diagnóstico** para ver qué buques están en `vessel_positions` pero no en `registros`
2. **Agrega registros activos** para esos buques (o verifica que existan)
3. **Verifica que los nombres coincidan** exactamente
4. **Prueba el endpoint nuevamente**

¿Quieres que te ayude a crear los registros activos para tus 5 buques?

