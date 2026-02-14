# 📏 GUÍA: Configuración de Anchos de Columnas - Tablas Personalizadas

## 📋 Descripción

Los anchos de las columnas en la página de **Tablas Personalizadas** ahora se gestionan desde un archivo de configuración centralizado. Los anchos **NUNCA** se guardan en la base de datos, siempre se toman del archivo de configuración.

---

## 📂 Archivos Involucrados

### **1. Archivo de configuración:**
```
src/config/tablas-personalizadas-columnas.ts
```
**Propósito:** Contiene la definición de anchos para todas las columnas. **ÚNICA FUENTE DE VERDAD** para los anchos.

### **2. Página principal:**
```
app/tablas-personalizadas/page.tsx
```
**Propósito:** Utiliza la función `obtenerAnchoColumna()` para aplicar los anchos.

### **3. Script SQL:**
```
scripts/resetear-orden-columnas-tablas-personalizadas.sql
```
**Propósito:** Resetea las preferencias de ORDEN (posición) de columnas guardadas de los usuarios.

---

## 🔐 ¿QUÉ SE GUARDA Y QUÉ NO?

### ✅ **SE GUARDA en Supabase (preferencias_usuario):**
- ✅ **Orden** (posición) de las columnas
- ✅ **Visibilidad** (hide/show) de las columnas
- ✅ **Columnas fijadas** (pinned left/right)
- ✅ **Ordenamiento** (sort order)

### ❌ **NO SE GUARDA:**
- ❌ **Anchos** de las columnas (siempre desde el archivo de configuración)

---

## 🛠️ CÓMO CAMBIAR EL ANCHO DE UNA COLUMNA

### **Paso 1: Editar el archivo de configuración**

Abre `src/config/tablas-personalizadas-columnas.ts` y busca la columna que quieres modificar:

```typescript
export const ANCHOS_COLUMNAS: ColumnaConfig[] = [
  // Columnas principales (pinned)
  { field: 'refCliente', headerName: 'REF Cliente', width: 180, pinned: 'left' },
  { field: 'refAsli', headerName: 'REF ASLI', width: 140, pinned: 'left' },
  
  // Información básica
  { field: 'ejecutivo', headerName: 'Ejecutivo', width: 120 },
  { field: 'shipper', headerName: 'Cliente', width: 150 },
  { field: 'booking', headerName: 'Booking', width: 120 },
  
  // ... más columnas ...
];
```

### **Paso 2: Cambiar el valor de `width`**

Ejemplo: Si quieres hacer la columna "Ejecutivo" más ancha:

**ANTES:**
```typescript
{ field: 'ejecutivo', headerName: 'Ejecutivo', width: 120 },
```

**DESPUÉS:**
```typescript
{ field: 'ejecutivo', headerName: 'Ejecutivo', width: 150 },
```

### **Paso 3: Guardar el archivo**

Guarda los cambios. El código se recompilará automáticamente y **los cambios se aplicarán INMEDIATAMENTE** en la próxima recarga.

### **Paso 4: Recargar la página**

Simplemente recarga la página (F5) y los nuevos anchos se aplicarán automáticamente. **No es necesario ejecutar ningún script SQL** ya que los anchos no se guardan en la base de datos.

---

## 📊 LISTA COMPLETA DE COLUMNAS Y ANCHOS ACTUALES

| Campo | Título | Ancho (px) |
|-------|--------|------------|
| `refCliente` | REF Cliente | 170 |
| `refAsli` | REF ASLI | 140 |
| `ejecutivo` | Ejecutivo | 120 |
| `shipper` | Cliente | 150 |
| `booking` | Booking | 120 |
| `contenedor` | Contenedor | 150 |
| `naviera` | Naviera | 130 |
| `naveInicial` | Nave | 130 |
| `viaje` | Viaje | 80 |
| `especie` | Especie | 120 |
| `pol` | POL | 120 |
| `pod` | POD | 120 |
| `deposito` | Depósito | 120 |
| `etd` | ETD | 100 |
| `eta` | ETA | 100 |
| `tt` | TT | 80 |
| `estado` | Estado | 120 |
| `flete` | Flete | 100 |
| `tipoIngreso` | Tipo Ingreso | 140 |
| `temperatura` | Temp (°C) | 110 |
| `cbm` | CBM | 90 |
| `ingresado` | Ingresado | 100 |
| `usuario` | Usuario | 100 |
| `clienteAbr` | Cliente Abr | 120 |
| `ct` | CT | 90 |
| `co2` | CO2 | 90 |
| `o2` | O2 | 90 |
| `tratamientoFrio` | Tratamiento Frío | 160 |
| `tipoAtmosfera` | Tipo Atmósfera | 150 |
| `roleadaDesde` | Roleada Desde | 150 |
| `ingresoStacking` | Ingreso Stacking | 160 |
| `numeroBl` | Número BL | 130 |
| `estadoBl` | Estado BL | 120 |
| `contrato` | Contrato | 120 |
| `semanaIngreso` | Semana Ingreso | 150 |
| `mesIngreso` | Mes Ingreso | 130 |
| `semanaZarpe` | Semana Zarpe | 140 |
| `mesZarpe` | Mes Zarpe | 120 |
| `semanaArribo` | Semana Arribo | 150 |
| `mesArribo` | Mes Arribo | 120 |
| `facturacion` | Facturación | 120 |
| `bookingPdf` | Booking PDF | 140 |
| `comentario` | Comentario | 200 |
| `observacion` | Observación | 200 |
| `temporada` | Temporada | 130 |

---

## 💡 CONSEJOS

### **Anchos recomendados según el contenido:**

- **Códigos cortos** (ID, siglas): 80-100px
- **Nombres cortos** (nombres propios): 120-130px
- **Nombres medianos** (títulos, categorías): 140-160px
- **Textos largos** (comentarios, descripciones): 200-250px
- **Fechas**: 100-110px

### **Consideraciones:**

1. **Texto del header**: Asegúrate de que el ancho sea suficiente para mostrar el título completo
2. **Contenido típico**: Considera el contenido más largo que podría aparecer en la columna
3. **Espacio adicional**: Agrega 20-30px extra para checkbox, iconos, padding, etc.
4. **Consistencia**: Mantén anchos similares para columnas del mismo tipo

---

## 🔧 CÓMO FUNCIONA

### **Sistema simplificado:**

1. **Los usuarios pueden:**
   - ✅ Reordenar columnas (arrastrar y soltar)
   - ✅ Mostrar/ocultar columnas
   - ✅ Fijar columnas (pinned left/right)
   - ✅ Redimensionar columnas **temporalmente** (solo durante la sesión actual)

2. **Lo que se guarda en Supabase:**
   - ✅ Orden de las columnas
   - ✅ Visibilidad (hide/show)
   - ✅ Columnas fijadas (pinned)
   - ❌ **NO se guardan los anchos**

3. **Al recargar la página:**
   - ✅ Se restaura el orden guardado
   - ✅ Se restaura la visibilidad guardada
   - ✅ Se restauran las columnas fijadas
   - ✅ Los anchos **siempre** se toman del archivo de configuración

### **Ventajas de este sistema:**

✅ **Centralizados** - Un solo archivo controla todos los anchos  
✅ **Consistentes** - Todos los usuarios ven los mismos anchos  
✅ **Actualizables** - Los cambios de ancho se aplican inmediatamente  
✅ **Sin conflictos** - No hay anchos antiguos guardados que interfieran  
✅ **Personalizables** - Los usuarios pueden reordenar columnas a su gusto  

---

## ❓ RESOLUCIÓN DE PROBLEMAS

### **Problema: Cambié el ancho pero no se aplica**

**Solución:** Recarga la página con Ctrl+F5 (forzar recarga del cache)

### **Problema: Las columnas aparecen en orden incorrecto**

**Causa:** El usuario tiene un orden personalizado guardado

**Solución:** Ejecutar el script SQL para resetear el orden:
```sql
DELETE FROM preferencias_usuario
WHERE pagina = 'tablas-personalizadas'
AND clave = 'column-order'
AND usuario_id = (SELECT id FROM auth.users WHERE email = 'tu@email.com');
```

### **Problema: Una columna está oculta**

**Causa:** El usuario la ocultó manualmente

**Solución:** 
1. Click derecho en el header de la tabla
2. Seleccionar "Columns"
3. Marcar la columna que quieres mostrar

---

## 📝 NOTAS IMPORTANTES

### **🚫 Los usuarios NO pueden guardar anchos personalizados**

Si un usuario redimensiona una columna, el cambio es **temporal** y se perderá al recargar la página. Esto es intencional para mantener consistencia visual entre todos los usuarios.

### **✅ Beneficios:**

- **Consistencia visual**: Todos ven la misma UI
- **Fácil mantenimiento**: Un solo lugar para cambiar anchos
- **Sin sorpresas**: Los usuarios no "rompen" la UI con anchos extraños
- **Actualizaciones suaves**: Los nuevos anchos se aplican automáticamente

### **🎯 Si necesitas cambiar un ancho:**

1. Abre `src/config/tablas-personalizadas-columnas.ts`
2. Cambia el valor
3. Guarda
4. Los usuarios verán el cambio en su próxima recarga

---

## 📝 NOTAS FINALES

- ✅ **Centralizado**: Un solo lugar para manejar todos los anchos
- ✅ **Fácil de mantener**: Lista clara y ordenada
- ✅ **Documentado**: Cada columna tiene su título descriptivo
- ✅ **Type-safe**: TypeScript valida los campos
- ✅ **Consistente**: Todos los usuarios ven los mismos anchos
- ✅ **Actualizable instantáneamente**: Los cambios se aplican al recargar

---

**Última actualización:** Febrero 2026  
**Archivo:** `docs/GUIA-ANCHOS-COLUMNAS-TABLAS-PERSONALIZADAS.md`

---

## 🆕 CAMBIOS RECIENTES

### **Febrero 2026 - v2.0**
- ❌ **Eliminado**: Guardado de anchos en base de datos
- ✅ **Nuevo**: Los anchos siempre se toman del archivo de configuración
- ✅ **Mejorado**: Sistema más simple y predecible
- ✅ **Beneficio**: Consistencia visual entre todos los usuarios
