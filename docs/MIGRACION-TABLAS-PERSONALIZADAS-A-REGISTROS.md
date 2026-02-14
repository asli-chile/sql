# 🔄 Migración de "Tablas Personalizadas" a "Registros"

## 📋 Resumen

Se ha reemplazado la página de "Tablas Personalizadas" con la página de "Registros", consolidando toda la funcionalidad mejorada (vista de tabla, vista de tarjetas, búsqueda global, menú contextual, etc.) en la página principal de registros.

---

## ✅ Cambios Realizados

### 1. **Archivos Movidos/Renombrados**

#### Carpetas:
- ✅ **Eliminada**: `app/tablas-personalizadas/` (carpeta completa)
- ✅ **Actualizada**: `app/registros/page.tsx` (reemplazada con el contenido de tablas-personalizadas)

#### Configuración:
- ✅ **Renombrado**: `src/config/tablas-personalizadas-columnas.ts` → `src/config/registros-columnas.ts`

#### Scripts SQL:
- ✅ **Renombrado**: `scripts/resetear-anchos-columnas-tablas-personalizadas.sql` → `scripts/resetear-anchos-columnas-registros.sql`
- ✅ **Renombrado**: `scripts/resetear-orden-columnas-tablas-personalizadas.sql` → `scripts/resetear-orden-columnas-registros.sql`
- ✅ **Renombrado**: `scripts/aplicar-nuevos-anchos-columnas.sql` → `scripts/aplicar-nuevos-anchos-columnas-registros.sql`
- ✅ **Creado**: `scripts/migrar-preferencias-tablas-personalizadas-a-registros.sql`

---

### 2. **Código Actualizado**

#### `app/registros/page.tsx`:
```typescript
// Cambios en las referencias de preferencias de usuario:
// ANTES: .eq('pagina', 'tablas-personalizadas')
// AHORA: .eq('pagina', 'registros')

// Cambio en el sidebar:
// ANTES: { label: 'Tablas Personalizadas', id: '/tablas-personalizadas', ... }
// AHORA: { label: 'Registros', id: '/registros', isActive: true, ... }

// Cambio en el import:
// ANTES: import { obtenerAnchoColumna } from '@/config/tablas-personalizadas-columnas';
// AHORA: import { obtenerAnchoColumna } from '@/config/registros-columnas';
```

#### `src/config/registros-columnas.ts`:
```typescript
// Actualizado el comentario de cabecera:
// ANTES: "Configuración de anchos de columnas para la página de Tablas Personalizadas"
// AHORA: "Configuración de anchos de columnas para la página de Registros"

// Actualizada referencia al script:
// ANTES: scripts/resetear-anchos-columnas-tablas-personalizadas.sql
// AHORA: scripts/resetear-anchos-columnas-registros.sql
```

#### `middleware.ts`:
```typescript
// Cambio en rutas protegidas:
// ANTES: const protectedRoutes = [..., '/tablas-personalizadas', ...];
// AHORA: const protectedRoutes = [..., '/registros', ...]; // (sin '/tablas-personalizadas')
```

---

### 3. **Scripts SQL Actualizados**

Todos los scripts SQL que hacían referencia a `'tablas-personalizadas'` en la columna `pagina` de la tabla `preferencias_usuario` han sido actualizados para usar `'registros'`:

- `resetear-anchos-columnas-registros.sql`
- `resetear-orden-columnas-registros.sql`
- `aplicar-nuevos-anchos-columnas-registros.sql`

---

## 🔧 Pasos para Aplicar en Producción

### **Paso 1: Migrar Preferencias de Usuario**

Ejecuta el siguiente script en Supabase para migrar las preferencias guardadas de los usuarios:

```sql
-- Ver las preferencias actuales
SELECT 
    u.email,
    p.pagina,
    p.clave,
    p.updated_at
FROM preferencias_usuario p
JOIN auth.users u ON u.id = p.usuario_id
WHERE p.pagina = 'tablas-personalizadas'
ORDER BY u.email, p.clave;
```

Si hay preferencias guardadas, ejecuta la migración (descomentar las líneas en el script):

📄 **Script**: `scripts/migrar-preferencias-tablas-personalizadas-a-registros.sql`

### **Paso 2: Desplegar el Código**

```bash
# Hacer commit de los cambios
git add .
git commit -m "Migración: Reemplazar Tablas Personalizadas con Registros"
git push origin main
```

Vercel desplegará automáticamente los cambios.

### **Paso 3: Verificar en Producción**

1. Accede a la aplicación en producción
2. Navega a `/registros`
3. Verifica que:
   - ✅ La tabla carga correctamente
   - ✅ Las preferencias de columnas (orden, ancho) funcionan
   - ✅ La búsqueda global funciona
   - ✅ El menú contextual (click derecho) funciona
   - ✅ La vista de tarjetas funciona
   - ✅ El toggle entre vistas funciona

### **Paso 4: Limpiar Preferencias Antiguas (Opcional)**

Después de verificar que todo funciona correctamente, puedes eliminar las preferencias antiguas:

```sql
-- SOLO ejecutar después de verificar que todo funciona
DELETE FROM preferencias_usuario WHERE pagina = 'tablas-personalizadas';
```

---

## 📊 Base de Datos: Cambios en Preferencias

### **ANTES** (columna `pagina`):
```
'tablas-personalizadas'
```

### **AHORA** (columna `pagina`):
```
'registros'
```

**Claves afectadas**:
- `column-order`
- `sort-order`

---

## 🚨 Notas Importantes

1. **No hay cambios en la estructura de la tabla**: La tabla `preferencias_usuario` sigue siendo la misma, solo cambia el valor de la columna `pagina`.

2. **Compatibilidad hacia atrás**: Los usuarios con preferencias guardadas en `'tablas-personalizadas'` pueden migrarlas con el script proporcionado.

3. **Sin pérdida de funcionalidad**: Todas las características de la página "Tablas Personalizadas" ahora están en "Registros":
   - Vista de tabla con AG-Grid
   - Vista de tarjetas
   - Búsqueda global
   - Menú contextual (borrar, enviar a transporte)
   - Sidebar con toggle
   - Configuración de anchos de columnas centralizados

4. **Rutas actualizadas**: 
   - ❌ `/tablas-personalizadas` (eliminada)
   - ✅ `/registros` (activa)

---

## 🎯 Funcionalidades Incluidas en `/registros`

✅ Vista de tabla (AG-Grid)  
✅ Vista de tarjetas  
✅ Toggle entre vistas  
✅ Búsqueda global (200px)  
✅ Menú contextual (click derecho)  
✅ Borrado suave (soft delete)  
✅ Enviar a transporte  
✅ Sidebar con toggle  
✅ Configuración centralizada de anchos de columnas  
✅ Guardado de orden de columnas  
✅ Guardado de orden de sort  
✅ Nuevo registro (modal)  
✅ Exportar selección  
✅ Recargar datos  

---

## 📂 Archivos Modificados

### Código:
- ✅ `app/registros/page.tsx`
- ✅ `src/config/registros-columnas.ts`
- ✅ `middleware.ts`

### Scripts:
- ✅ `scripts/resetear-anchos-columnas-registros.sql`
- ✅ `scripts/resetear-orden-columnas-registros.sql`
- ✅ `scripts/aplicar-nuevos-anchos-columnas-registros.sql`
- ✅ `scripts/migrar-preferencias-tablas-personalizadas-a-registros.sql` (nuevo)

### Documentación:
- ✅ Este archivo (`docs/MIGRACION-TABLAS-PERSONALIZADAS-A-REGISTROS.md`)

---

## ✅ Verificación Final

Después de aplicar todos los cambios, verifica que:

- [ ] La carpeta `app/tablas-personalizadas` ya no existe
- [ ] El archivo `src/config/tablas-personalizadas-columnas.ts` ya no existe
- [ ] La página `/registros` carga correctamente
- [ ] El sidebar muestra "Registros" y no "Tablas Personalizadas"
- [ ] Las preferencias de usuario funcionan (orden de columnas, sort)
- [ ] La búsqueda global funciona
- [ ] El menú contextual funciona
- [ ] La vista de tarjetas funciona
- [ ] No hay errores en la consola del navegador
- [ ] No hay errores en los logs de Vercel

---

**Fecha de migración**: Febrero 2026  
**Motivo**: Consolidar funcionalidad mejorada en la página principal de registros y eliminar redundancia.
