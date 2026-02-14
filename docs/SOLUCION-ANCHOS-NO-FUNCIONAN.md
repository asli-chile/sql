# 🔧 SOLUCIÓN: Anchos de Columnas No Se Aplican

## 🎯 Problema
Los anchos definidos en `src/config/tablas-personalizadas-columnas.ts` no se están aplicando.

## ✅ Solución

### **Paso 1: Ejecutar el script SQL**

Abre Supabase SQL Editor y ejecuta:

```sql
-- Eliminar las preferencias guardadas de orden de columnas
DELETE FROM preferencias_usuario 
WHERE pagina = 'tablas-personalizadas' 
AND clave = 'column-order';
```

### **Paso 2: Recargar la aplicación**

1. Cierra completamente el navegador (o al menos la pestaña)
2. Vuelve a abrir la aplicación
3. Ve a "Tablas Personalizadas"
4. Los nuevos anchos deberían aplicarse

### **Paso 3: Verificar en consola del navegador**

Abre las DevTools (F12) y busca en la consola:

```
Aplicando orden de columnas (solo posición, anchos desde config)... X columnas
```

Si ves este mensaje, significa que está cargando correctamente.

---

## 🔍 Diagnóstico

### **¿Por qué no funciona?**

Tienes preferencias guardadas ANTIGUAS en Supabase que incluyen los anchos viejos. Aunque el código nuevo DEBERÍA ignorarlos, puede haber un problema con:

1. **Cache del navegador** - Los archivos antiguos están en cache
2. **Preferencias antiguas** - La BD tiene anchos guardados con el sistema antiguo
3. **Hot reload** - El servidor de desarrollo no se reinició correctamente

---

## 🛠️ Soluciones Alternativas

### **Opción A: Limpieza completa**

```sql
-- Eliminar TODAS las preferencias de la página
DELETE FROM preferencias_usuario 
WHERE pagina = 'tablas-personalizadas';
```

### **Opción B: Solo para tu usuario**

```sql
-- Reemplaza con tu email
DELETE FROM preferencias_usuario 
WHERE pagina = 'tablas-personalizadas' 
AND clave = 'column-order'
AND usuario_id = (
  SELECT id FROM auth.users WHERE email = 'tu@email.com'
);
```

### **Opción C: Limpiar cache del navegador**

1. Abre DevTools (F12)
2. Click derecho en el botón de recargar
3. Selecciona "Vaciar caché y recargar de forma forzada"

---

## 📝 Verificación

Para confirmar que funcionó:

1. **Consola del navegador** - Deberías ver:
   ```
   Orden de columnas aplicado correctamente
   ```

2. **Columnas** - Los anchos deberían ser:
   - REF Cliente: 100px
   - REF ASLI: 100px
   - Ejecutivo: 120px
   - etc.

3. **Sin errores** - No deberías ver errores en la consola

---

## 🚀 Si Aún No Funciona

Ejecuta en la consola del navegador (DevTools):

```javascript
// Ver qué anchos está usando
const cols = document.querySelectorAll('.ag-header-cell');
cols.forEach(col => {
  const name = col.querySelector('.ag-header-cell-text')?.textContent;
  const width = col.style.width;
  console.log(name, width);
});
```

Esto te mostrará los anchos actuales y podrás compararlos con los del archivo de configuración.

---

**Archivo:** `docs/SOLUCION-ANCHOS-NO-FUNCIONAN.md`
