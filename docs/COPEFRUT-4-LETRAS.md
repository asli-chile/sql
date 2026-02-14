# 🔄 ACTUALIZACIÓN: COPEFRUT USA 4 LETRAS

## 📋 Resumen

**Copefrut** ahora usa **4 letras (COPE)** en lugar de 3 (COP) para sus referencias de cliente.

---

## 🎯 **CAMBIO IMPLEMENTADO**

### **ANTES:**
```
Cliente: Copefrut
Formato: COP2526[especie][###]
Ejemplos:
  - Copefrut + Cereza  → COP2526CER001
  - Copefrut + Kiwi    → COP2526KIW001
  - Copefrut + Manzana → COP2526MAN001
```

### **AHORA:**
```
Cliente: Copefrut
Formato: COPE2526[especie][###]
Ejemplos:
  - Copefrut + Cereza  → COPE2526CER001
  - Copefrut + Kiwi    → COPE2526KIW001
  - Copefrut + Manzana → COPE2526MAN001
```

---

## 📁 **ARCHIVOS MODIFICADOS**

### **1. Scripts SQL**
✅ `trigger-ref-asli-y-ref-cliente-automatico.sql`  
✅ `completar-ref-cliente-faltantes.sql`  
✅ **NUEVO:** `actualizar-copefrut-a-4-letras.sql`

### **2. Frontend TypeScript**
✅ `src/lib/ref-externa-utils.ts`

---

## 🚀 **CÓMO APLICAR LOS CAMBIOS**

### **PASO 1: Actualizar Registros Existentes de Copefrut**

Ejecuta el script en Supabase:

```sql
-- Archivo: actualizar-copefrut-a-4-letras.sql
```

Este script:
1. ✅ Encuentra todos los registros de Copefrut
2. ✅ Cambia de `COP2526XXX###` a `COPE2526XXX###`
3. ✅ Mantiene los correlativos secuenciales
4. ✅ Verifica que no haya duplicados

**Ejemplo de ejecución:**
```
ANTES:
- COP2526CER001
- COP2526CER002
- COP2526KIW001

DESPUÉS:
- COPE2526CER001
- COPE2526CER002
- COPE2526KIW001
```

### **PASO 2: Actualizar el Trigger SQL (Opcional)**

Si quieres que los nuevos registros también usen COPE automáticamente:

```sql
-- Archivo: trigger-ref-asli-y-ref-cliente-automatico.sql
```

Ejecuta este script en Supabase para actualizar el trigger.

### **PASO 3: Actualizar el Frontend (Opcional)**

Si generas REF CLIENTE desde el frontend:

El archivo `src/lib/ref-externa-utils.ts` ya está actualizado con:

```typescript
// CASO ESPECIAL: COPEFRUT usa 4 letras
if (trimmed.includes('COPEFRUT')) {
  return 'COPE';
}
```

---

## 🧪 **PRUEBAS**

### **Prueba 1: Verificar registros actuales**
```sql
SELECT 
    ref_cliente,
    shipper,
    especie,
    COUNT(*) as cantidad
FROM public.registros
WHERE deleted_at IS NULL
    AND UPPER(TRIM(shipper)) LIKE '%COPEFRUT%'
GROUP BY ref_cliente, shipper, especie
ORDER BY ref_cliente;
```

### **Prueba 2: Insertar nuevo registro**
```sql
INSERT INTO registros (
    especie,
    shipper,
    ingresado,
    ref_asli
) VALUES (
    'CEREZA',
    'Copefrut',
    NOW(),
    NULL
);

-- Verificar que el ref_cliente sea COPE2526CER###
SELECT ref_cliente, ref_asli, shipper, especie
FROM registros
WHERE shipper LIKE '%Copefrut%'
ORDER BY created_at DESC
LIMIT 1;
```

**Resultado esperado:**
```
ref_cliente: COPE2526CER003 (o el siguiente número)
```

---

## 📊 **OTROS CLIENTES (SIN CAMBIOS)**

Los demás clientes siguen usando 3 letras:

| **Cliente** | **Palabras** | **Prefijo** | **Ejemplo** |
|-------------|--------------|-------------|-------------|
| Fruit Andes Sur | 3+ palabras | FAS | FAS2526KIW001 |
| San Andres | 2 palabras | SAN | SAN2526MAN001 |
| Exportadora | 1 palabra | EXP | EXP2526CER001 |
| **Copefrut** | **1 palabra** | **COPE** | **COPE2526CER001** |

---

## ⚠️ **IMPORTANTE**

1. **Hacer backup** antes de ejecutar el script de actualización
2. **Los registros existentes se actualizarán** de COP a COPE
3. **Los correlativos se mantienen** secuenciales por especie
4. **No genera duplicados** - cada especie tiene su propio correlativo

---

## 🔍 **VERIFICACIÓN POST-ACTUALIZACIÓN**

### **Comando 1: Contar registros actualizados**
```sql
SELECT 
    COUNT(*) as total_copefrut,
    COUNT(CASE WHEN ref_cliente LIKE 'COPE2526%' THEN 1 END) as con_cope,
    COUNT(CASE WHEN ref_cliente LIKE 'COP2526%' THEN 1 END) as con_cop
FROM public.registros
WHERE deleted_at IS NULL
    AND UPPER(TRIM(shipper)) LIKE '%COPEFRUT%';
```

**Resultado esperado:**
```
total_copefrut | con_cope | con_cop
---------------|----------|--------
      50       |    50    |    0
```

### **Comando 2: Ver ejemplos**
```sql
SELECT 
    ref_cliente,
    especie,
    COUNT(*) as cantidad
FROM public.registros
WHERE deleted_at IS NULL
    AND UPPER(TRIM(shipper)) LIKE '%COPEFRUT%'
GROUP BY ref_cliente, especie
ORDER BY ref_cliente
LIMIT 10;
```

---

## 📞 **SOPORTE**

Si después de ejecutar el script encuentras:
- ❌ Registros con `COP2526` en lugar de `COPE2526`
- ❌ Duplicados en ref_cliente
- ❌ Correlativos incorrectos

Ejecuta nuevamente el script `actualizar-copefrut-a-4-letras.sql`

---

## ✅ **CHECKLIST**

- [ ] Backup de la base de datos
- [ ] Ejecutar `actualizar-copefrut-a-4-letras.sql` en Supabase
- [ ] Verificar que todos los registros de Copefrut usan COPE
- [ ] Verificar que no hay duplicados
- [ ] Probar inserción de nuevo registro de Copefrut
- [ ] Verificar que el nuevo registro usa COPE2526

---

## 🎉 **RESULTADO FINAL**

Ahora **TODOS** los registros de Copefrut (existentes y nuevos) usarán el formato:

```
COPE2526[ESPECIE][001]
```

Ejemplos reales:
- `COPE2526CER001` - Copefrut + Cereza
- `COPE2526KIW001` - Copefrut + Kiwi
- `COPE2526MAN001` - Copefrut + Manzana
- `COPE2526CIR001` - Copefrut + Ciruela

**¡Todo automático!** 🚀
