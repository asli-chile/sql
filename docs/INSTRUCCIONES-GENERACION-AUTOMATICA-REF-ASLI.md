# 🚀 INSTRUCCIONES: Generación Automática de REF ASLI

## 📋 Resumen

Este documento explica cómo implementar la generación **100% automática** de referencias ASLI mediante triggers SQL en Supabase.

---

## ✅ **¿Qué se ha modificado?**

### **1. Nuevo Script SQL Mejorado**
**Archivo:** `scripts/trigger-asignar-ref-asli-automatico-mejorado.sql`

Este script crea triggers que generan automáticamente:
- **Con temporada:** `CHERRY-25-26-####` o `POMACEA-CAROZO-2026-####`
- **Sin temporada:** `A####`

### **2. Frontend Modificado**
**Archivo:** `src/components/modals/AddModal.tsx`

Cambios realizados:
- ✅ Eliminada la generación manual de REF ASLI
- ✅ Los registros se insertan con `ref_asli: null`
- ✅ El trigger SQL asigna el REF ASLI automáticamente
- ✅ Eliminado el botón "Regenerar REF ASLI"

---

## 🔧 **PASO 1: Ejecutar el Script SQL en Supabase**

### **Opción A: Desde el Dashboard de Supabase**

1. Ve a tu proyecto en Supabase
2. Abre el **SQL Editor**
3. Copia y pega el contenido de:
   ```
   scripts/trigger-asignar-ref-asli-automatico-mejorado.sql
   ```
4. Haz clic en **Run** (Ejecutar)
5. Verifica que no haya errores

### **Opción B: Desde la Terminal**

```bash
# Asegúrate de tener configurado el CLI de Supabase
supabase db push --file scripts/trigger-asignar-ref-asli-automatico-mejorado.sql
```

---

## 📊 **PASO 2: Verificar que los Triggers se Crearon**

Ejecuta esta consulta en el SQL Editor de Supabase:

```sql
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'registros'
    AND trigger_schema = 'public'
ORDER BY trigger_name;
```

**Deberías ver:**
- `trigger_asignar_ref_asli_automatico` (BEFORE INSERT)
- `trigger_actualizar_ref_asli_si_cambia` (BEFORE UPDATE)

---

## 🧪 **PASO 3: Probar la Generación Automática**

### **Prueba 1: Insertar Cereza (con temporada)**

```sql
INSERT INTO registros (
    especie,
    ingresado,
    shipper,
    ejecutivo,
    naviera,
    pol,
    pod,
    deposito,
    estado,
    tipo_ingreso,
    created_by,
    ref_asli  -- NULL o vacío
) VALUES (
    'CEREZA',
    '2025-09-15',
    'FRUTAS DEL SUR',
    'Juan Pérez',
    'MAERSK',
    'VALPARAISO',
    'SHANGHAI',
    'DEPOSITO A',
    'PENDIENTE',
    'BOOKING',
    'Sistema',
    NULL  -- El trigger lo generará
);

-- Verificar el resultado
SELECT ref_asli, temporada, especie, shipper
FROM registros
WHERE especie = 'CEREZA'
ORDER BY created_at DESC
LIMIT 1;

-- Resultado esperado:
-- ref_asli: CHERRY-25-26-0638 (o el siguiente número)
-- temporada: CHERRY-25-26
```

### **Prueba 2: Insertar Manzana (con temporada)**

```sql
INSERT INTO registros (
    especie,
    ingresado,
    shipper,
    ejecutivo,
    naviera,
    pol,
    pod,
    deposito,
    estado,
    tipo_ingreso,
    created_by,
    ref_asli
) VALUES (
    'MANZANA',
    '2026-03-20',
    'POMÁCEAS LTDA',
    'María González',
    'MSC',
    'SAN ANTONIO',
    'ROTTERDAM',
    'DEPOSITO B',
    'PENDIENTE',
    'BOOKING',
    'Sistema',
    NULL
);

-- Verificar
SELECT ref_asli, temporada, especie, shipper
FROM registros
WHERE especie = 'MANZANA'
ORDER BY created_at DESC
LIMIT 1;

-- Resultado esperado:
-- ref_asli: POMACEA-CAROZO-2026-0007 (o el siguiente número)
-- temporada: POMACEA-CAROZO-2026
```

### **Prueba 3: Insertar Palta (sin temporada)**

```sql
INSERT INTO registros (
    especie,
    ingresado,
    shipper,
    ejecutivo,
    naviera,
    pol,
    pod,
    deposito,
    estado,
    tipo_ingreso,
    created_by,
    ref_asli
) VALUES (
    'PALTA',
    '2026-05-10',
    'AGUACATES SA',
    'Pedro López',
    'HAPAG-LLOYD',
    'VALPARAISO',
    'HAMBURG',
    'DEPOSITO C',
    'PENDIENTE',
    'BOOKING',
    'Sistema',
    NULL
);

-- Verificar
SELECT ref_asli, temporada, especie, shipper
FROM registros
WHERE especie = 'PALTA'
ORDER BY created_at DESC
LIMIT 1;

-- Resultado esperado:
-- ref_asli: A0001 (o el siguiente número disponible)
-- temporada: NULL
```

---

## 🎯 **PASO 4: Probar desde el Frontend**

1. **Reinicia tu aplicación** (si está corriendo):
   ```bash
   npm run dev
   ```

2. **Abre el modal para crear un registro**

3. **Observa que:**
   - El campo REF ASLI muestra: "Se asignará automáticamente"
   - Ya NO hay botón "Regenerar REF ASLI"

4. **Completa el formulario:**
   - Selecciona especie: **CEREZA**
   - Fecha ingresado: **15 de Septiembre 2025**
   - Completa los demás campos

5. **Guarda el registro**

6. **Verifica en la tabla** que el REF ASLI se generó automáticamente:
   - Debería ser: `CHERRY-25-26-####`

---

## 📊 **CÓMO FUNCIONA**

### **Flujo de Creación**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Usuario completa formulario y hace clic en "Guardar"    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Frontend envía INSERT con ref_asli: NULL                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. TRIGGER "asignar_ref_asli_automatico" se ejecuta        │
│    ANTES de insertar el registro                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Función "determinar_temporada(especie, fecha)"          │
│    - Si es CEREZA en Sep-Ene → "CHERRY-25-26"              │
│    - Si es MANZANA → "POMACEA-CAROZO-2026"                 │
│    - Si es otra especie → NULL                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Generar REF ASLI según temporada                        │
│    - Con temporada → obtener_siguiente_ref_asli_temporada() │
│    - Sin temporada → obtener_siguiente_ref_asli_simple()    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. El registro se inserta con:                             │
│    - ref_asli: "CHERRY-25-26-0638" (o "A0001")             │
│    - temporada: "CHERRY-25-26" (o NULL)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 **REGLAS DE TEMPORADA**

### **Temporada 1: CHERRY-25-26**
- **Especies:** Cereza, Cherry, Arándano
- **Período:** Septiembre a Enero (meses 9-12 y 1)
- **Formato:** `CHERRY-25-26-0001`, `CHERRY-25-26-0002`...

### **Temporada 2: POMACEA-CAROZO-2026**
- **Especies:** Ciruela, Manzana, Kiwi, Durazno, Plum, Apple, Peach
- **Período:** Todo el año 2026
- **Formato:** `POMACEA-CAROZO-2026-0001`, `POMACEA-CAROZO-2026-0002`...

### **Sin Temporada**
- **Especies:** Todas las demás (Palta, Uva, Limón, etc.)
- **Formato:** `A0001`, `A0002`, `A0003`...

---

## 🛠️ **AGREGAR NUEVAS TEMPORADAS**

Si quieres agregar más especies a las temporadas, edita la función `determinar_temporada()`:

```sql
-- Ejemplo: Agregar UVA a una nueva temporada
IF v_especie_lower LIKE '%uva%' 
   OR v_especie_lower LIKE '%grape%' THEN
    RETURN 'UVA-2026';
END IF;
```

Luego ejecuta el script nuevamente en Supabase.

---

## ⚠️ **IMPORTANTE**

1. **Backup de la base de datos** antes de ejecutar el script
2. **Prueba primero en desarrollo** antes de aplicar en producción
3. **Los registros existentes NO se modifican** (solo los nuevos)
4. **Si quieres actualizar registros existentes**, ejecuta el script:
   ```
   scripts/asignar-ref-asli-por-temporada-especie.sql
   ```

---

## 🐛 **Solución de Problemas**

### **Problema: El REF ASLI no se genera automáticamente**

**Solución:**
1. Verifica que los triggers existen:
   ```sql
   SELECT * FROM information_schema.triggers 
   WHERE event_object_table = 'registros';
   ```

2. Verifica que las funciones existen:
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_schema = 'public'
     AND routine_name LIKE '%ref_asli%';
   ```

3. Si no existen, ejecuta el script nuevamente

### **Problema: Error "función no existe"**

**Solución:**
- Asegúrate de ejecutar TODO el script, no solo partes
- Verifica que tienes permisos de administrador en Supabase

### **Problema: Duplicados en REF ASLI**

**Solución:**
- Ejecuta el script de limpieza:
  ```sql
  -- Ver duplicados
  SELECT ref_asli, COUNT(*) 
  FROM registros 
  WHERE deleted_at IS NULL
  GROUP BY ref_asli 
  HAVING COUNT(*) > 1;
  ```

---

## 📞 **Soporte**

Si tienes problemas, revisa:
1. Los logs de Supabase (Dashboard → Logs)
2. La consola del navegador (F12)
3. Los errores en el terminal donde corre el frontend

---

## ✅ **Checklist de Implementación**

- [ ] Ejecutar script SQL en Supabase
- [ ] Verificar que los triggers se crearon
- [ ] Probar inserción con especie CEREZA
- [ ] Probar inserción con especie MANZANA
- [ ] Probar inserción con especie PALTA
- [ ] Verificar que el frontend muestra "Se asignará automáticamente"
- [ ] Crear registro desde el frontend
- [ ] Verificar que el REF ASLI se generó correctamente
- [ ] Hacer backup de la base de datos
- [ ] Aplicar en producción

---

## 🎉 **¡Listo!**

Ahora tu sistema genera referencias ASLI automáticamente según la especie y temporada, sin intervención manual del frontend.

**Beneficios:**
- ✅ Sin duplicados
- ✅ Consistencia en el formato
- ✅ Menos código en el frontend
- ✅ Más rápido (una sola consulta SQL)
- ✅ Funciona incluso si insertas registros directamente en la BD
