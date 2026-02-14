# 🔄 RESUMEN: Cambios en Sistema de Anchos de Columnas

## 📅 Fecha: Febrero 2026

---

## 🎯 CAMBIO PRINCIPAL

**ANTES:** Los anchos de columnas se guardaban en Supabase junto con el orden  
**AHORA:** Solo se guarda el orden, los anchos SIEMPRE se toman del archivo de configuración

---

## ✅ QUÉ SE MODIFICÓ

### **1. Archivo de carga de preferencias**
📄 `app/tablas-personalizadas/page.tsx` - Función `loadColumnOrderFromSupabase()`

**Cambios:**
- ✅ Elimina el `width` del estado guardado
- ✅ SIEMPRE usa el ancho de `columnDefs` (archivo de configuración)
- ✅ Solo restaura: orden, visibilidad, y pinned

```typescript
// ANTES: Guardaba y restauraba anchos
const { sort, sortIndex, ...rest } = savedCol;

// AHORA: Elimina anchos, siempre usa config
const { sort, sortIndex, width, ...rest } = savedCol;
rest.width = defaultWidthMap.get(rest.colId) || 120;
```

### **2. Función de guardado de orden**
📄 `app/tablas-personalizadas/page.tsx` - Función `onColumnMoved()`

**Cambios:**
- ✅ Solo guarda: `colId`, `hide`, `pinned`
- ❌ NO guarda: `width`

```typescript
// ANTES: Guardaba todo el estado (incluyendo width)
const columnState = gridApi.getColumnState();

// AHORA: Solo guarda orden, visibilidad, pinned
const columnOrderOnly = columnState.map((col: any) => ({
  colId: col.colId,
  hide: col.hide,
  pinned: col.pinned,
  // NO guardar width
}));
```

### **3. Eliminada función de guardado de anchos**
📄 `app/tablas-personalizadas/page.tsx`

**Cambios:**
- ❌ Eliminada: `onColumnResized()`
- ❌ Eliminado: evento `onColumnResized` en AgGridReact

### **4. Script SQL renombrado**
📄 `scripts/resetear-orden-columnas-tablas-personalizadas.sql` (antes: `resetear-anchos-columnas-...`)

**Cambios:**
- ✅ Actualizada documentación
- ✅ Nombre refleja que solo resetea orden, no anchos

### **5. Documentación actualizada**
📄 `docs/GUIA-ANCHOS-COLUMNAS-TABLAS-PERSONALIZADAS.md`

**Cambios:**
- ✅ Explicación del nuevo sistema
- ✅ Tabla de qué se guarda y qué no
- ✅ Ventajas del nuevo sistema
- ✅ Instrucciones actualizadas

---

## 📊 COMPARACIÓN: ANTES vs AHORA

| Aspecto | ANTES | AHORA |
|---------|-------|-------|
| **Ancho de columnas** | Se guardaba en Supabase | ❌ NO se guarda |
| **Orden de columnas** | ✅ Se guarda | ✅ Se guarda |
| **Visibilidad (hide/show)** | ✅ Se guarda | ✅ Se guarda |
| **Columnas fijadas (pinned)** | ✅ Se guarda | ✅ Se guarda |
| **Fuente de anchos** | BD + Config (mezcla) | ✅ Solo Config |
| **Consistencia visual** | Variable por usuario | ✅ Igual para todos |
| **Actualización de anchos** | Complicada | ✅ Inmediata |

---

## 💡 VENTAJAS DEL NUEVO SISTEMA

### ✅ **Para Desarrolladores:**
1. **Un solo lugar** para cambiar anchos (`src/config/tablas-personalizadas-columnas.ts`)
2. **Cambios inmediatos** - Solo recargar la página
3. **Sin conflictos** - No hay anchos antiguos en BD
4. **Más simple** - Menos código de sincronización

### ✅ **Para Usuarios:**
1. **Consistencia visual** - Todos ven la misma UI
2. **Interfaz profesional** - No se "rompe" con anchos extraños
3. **Siguen pudiendo:**
   - Reordenar columnas
   - Mostrar/ocultar columnas
   - Fijar columnas (left/right)

---

## 🔄 COMPORTAMIENTO DEL USUARIO

### **Si un usuario redimensiona una columna:**

**ANTES:**
1. Usuario arrastra el borde de la columna
2. ✅ Ancho se guarda en Supabase
3. ✅ Se mantiene en futuras sesiones

**AHORA:**
1. Usuario arrastra el borde de la columna
2. ⚠️ Ancho cambia **temporalmente**
3. ❌ Al recargar, vuelve al ancho del archivo de configuración

**Nota:** Esto es **intencional** para mantener consistencia.

---

## 📝 CÓMO CAMBIAR UN ANCHO AHORA

### **Pasos simples:**

1. Abre `src/config/tablas-personalizadas-columnas.ts`
2. Busca la columna:
   ```typescript
   { field: 'ejecutivo', headerName: 'Ejecutivo', width: 120 },
   ```
3. Cambia el `width`:
   ```typescript
   { field: 'ejecutivo', headerName: 'Ejecutivo', width: 150 },
   ```
4. Guarda el archivo
5. Recarga la página (F5)
6. ✅ ¡Listo!

**Tiempo total:** ~30 segundos

---

## 🗄️ ESTRUCTURA DE DATOS EN SUPABASE

### **Tabla: preferencias_usuario**

**Antes:**
```json
{
  "clave": "column-order",
  "valor": [
    {
      "colId": "refCliente",
      "width": 180,        // ← Se guardaba
      "hide": false,
      "pinned": "left"
    }
  ]
}
```

**Ahora:**
```json
{
  "clave": "column-order",
  "valor": [
    {
      "colId": "refCliente",
      // ← NO se guarda width
      "hide": false,
      "pinned": "left"
    }
  ]
}
```

---

## 🚀 MIGRACIÓN

### **¿Necesito hacer algo?**

**NO** - El sistema es compatible con datos antiguos:

1. Si hay anchos guardados en BD → Se ignoran
2. Si no hay anchos guardados → Se usan los del config
3. Los anchos **siempre** vienen del archivo de configuración

### **¿Debo limpiar los datos antiguos?**

**OPCIONAL** - Puedes ejecutar el script SQL si quieres limpiar:

```sql
-- Esto eliminará el orden guardado (opcional)
DELETE FROM preferencias_usuario
WHERE pagina = 'tablas-personalizadas'
AND clave = 'column-order';
```

Pero **no es necesario** - el sistema funciona igual con o sin datos antiguos.

---

## 📌 ARCHIVOS MODIFICADOS

### **Código:**
- ✅ `app/tablas-personalizadas/page.tsx`
- ✅ `src/config/tablas-personalizadas-columnas.ts` (sin cambios de lógica, solo anchos)

### **Scripts:**
- ✅ `scripts/resetear-orden-columnas-tablas-personalizadas.sql` (renombrado y actualizado)

### **Documentación:**
- ✅ `docs/GUIA-ANCHOS-COLUMNAS-TABLAS-PERSONALIZADAS.md`
- ✅ `docs/RESUMEN-CAMBIOS-ANCHOS-COLUMNAS.md` (este archivo)

---

## 🎓 LECCIONES APRENDIDAS

### **Por qué este cambio:**

1. **Complejidad innecesaria:** Mezclar config + BD era confuso
2. **Inconsistencia:** Cada usuario veía anchos diferentes
3. **Difícil de actualizar:** Cambiar anchos requería limpiar BD
4. **Conflictos:** Los anchos guardados sobrescribían los nuevos

### **Por qué es mejor ahora:**

1. **Una sola fuente de verdad:** El archivo de configuración
2. **Predecible:** Los cambios se aplican inmediatamente
3. **Simple:** Menos código, menos bugs
4. **Consistente:** Todos ven la misma UI profesional

---

## ✅ CHECKLIST DE VERIFICACIÓN

- [x] Función `loadColumnOrderFromSupabase` actualizada
- [x] Función `onColumnMoved` actualizada
- [x] Función `onColumnResized` eliminada
- [x] Evento `onColumnResized` eliminado de AgGridReact
- [x] Script SQL renombrado y actualizado
- [x] Documentación actualizada
- [x] Linter sin errores
- [x] Anchos en config actualizados (170 para refCliente)

---

**Versión:** 2.0  
**Fecha:** Febrero 2026  
**Autor:** Sistema de Gestión ASLI
