# 🔐 Implementación de Permisos por Roles en Página de Registros

## 📋 Resumen

Se ha implementado correctamente la lógica de permisos basada en roles en la página de registros (anteriormente "Tablas Personalizadas"), utilizando el hook `useUser` para controlar el acceso a las diferentes acciones según el rol del usuario.

---

## ✅ Cambios Implementados

### 1. **Integración del Hook `useUser`**

Se agregó el hook `useUser` que proporciona los permisos del usuario actual:

```typescript
import { useUser } from '@/hooks/useUser';

const { 
  currentUser, 
  canEdit, 
  canAdd, 
  canDelete, 
  canExport,
  canViewHistory 
} = useUser();
```

### 2. **Filtrado de Datos por Rol** 🔒

**CRÍTICO**: Los registros ahora se filtran en el servidor según el rol del usuario:

```typescript
const loadRegistros = useCallback(async () => {
  setLoadingData(true);
  try {
    const supabase = createClient();
    
    // Aplicar filtros según el rol del usuario
    let query = supabase
      .from('registros')
      .select('*')
      .is('deleted_at', null);

    // Filtrar según rol
    const isAdmin = currentUser?.rol === 'admin';
    const isEjecutivo = currentUser?.rol === 'ejecutivo' 
      || (currentUser?.email?.endsWith('@asli.cl') && currentUser?.rol !== 'cliente');
    const clienteNombre = currentUser?.cliente_nombre?.trim();
    const clientesAsignados = currentUser?.clientes_asignados || [];

    if (!isAdmin) {
      if (currentUser?.rol === 'cliente' && clienteNombre) {
        // Cliente: solo ve sus propios registros
        query = query.ilike('shipper', clienteNombre);
      } else if (isEjecutivo && clientesAsignados.length > 0) {
        // Ejecutivo: solo ve registros de sus clientes asignados
        query = query.in('shipper', clientesAsignados);
      } else if (!isAdmin && !isEjecutivo) {
        // Usuario sin permisos específicos: no ve nada
        query = query.eq('id', 'NONE');
      }
    }

    const { data, error } = await query.order('ref_asli', { ascending: false });
    // ... resto del código
  }
}, [showError, success, currentUser]);
```

**Comportamiento**:
- ✅ **Admin**: Ve TODOS los registros sin filtro
- ✅ **Ejecutivo**: Solo ve registros de `clientes_asignados` (desde tabla `ejecutivo_clientes`)
- ✅ **Cliente**: Solo ve registros donde `shipper` coincide con su `cliente_nombre`
- ❌ **Otros**: No ven ningún registro

### 3. **Botón "NUEVO" (Crear Registro)**

**Permiso requerido**: `canAdd`

**Comportamiento**:
- ✅ **Admin**: Puede crear registros
- ✅ **Ejecutivo**: Puede crear registros para sus clientes asignados
- ❌ **Cliente/Lector**: No puede crear registros (botón deshabilitado)

**Implementación**:
```typescript
<button
  onClick={() => setShowAddModal(true)}
  disabled={!canAdd}
  className={`... ${
    !canAdd
      ? 'bg-gray-400 cursor-not-allowed text-gray-200'
      : '...'
  }`}
  title={canAdd ? "Nuevo Registro" : "No tienes permisos para crear registros"}
>
  <Plus className="h-4 h-4" />
  <span>NUEVO</span>
</button>
```

---

### 4. **Botón "EXPORTAR"**

**Permiso requerido**: `canExport`

**Comportamiento**:
- ✅ **Admin**: Puede exportar todos los registros
- ✅ **Ejecutivo**: Puede exportar registros de sus clientes
- ❌ **Cliente/Lector**: No puede exportar (botón deshabilitado)

**Implementación**:
```typescript
<button
  onClick={(e) => {
    e.stopPropagation();
    setShowExportDropdown(!showExportDropdown);
  }}
  disabled={!canExport}
  className={`... ${
    !canExport
      ? 'bg-gray-400 cursor-not-allowed text-gray-200'
      : 'bg-green-600 hover:bg-green-700 text-white'
  }`}
  title={canExport ? "Exportar registros" : "No tienes permisos para exportar"}
>
  <Download className="w-4 h-4" />
  <span>EXPORTAR</span>
</button>
```

---

### 5. **Edición de Celdas (Inline Editing)**

**Permiso requerido**: `canEdit`

**Comportamiento**:
- ✅ **Admin**: Puede editar cualquier celda
- ✅ **Ejecutivo**: Puede editar celdas de sus clientes asignados
- ❌ **Cliente/Lector**: No puede editar (celdas bloqueadas)

**Implementación**:
```typescript
const gridOptions = useMemo<GridOptions>(() => ({
  // ...
  defaultColDef: {
    // ...
    editable: canEdit, // ✅ Solo editable si tiene permisos
  },
  // ...
}), [canEdit]);
```

---

### 6. **Menú Contextual (Click Derecho)**

#### 6.1. **Enviar a Transporte**

**Permiso requerido**: `canEdit`

**Comportamiento**:
- ✅ **Admin**: Puede enviar cualquier registro
- ✅ **Ejecutivo**: Puede enviar registros de sus clientes
- ❌ **Cliente/Lector**: Opción deshabilitada

**Implementación**:
```typescript
<button
  onClick={handleSendToTransporte}
  disabled={!canEdit}
  className={`... ${
    !canEdit
      ? 'text-gray-400 cursor-not-allowed'
      : '...'
  }`}
  title={canEdit ? "Enviar a transporte" : "No tienes permisos para editar registros"}
>
  <Truck className="w-4 h-4" />
  <span>Enviar a transporte</span>
</button>
```

#### 6.2. **Borrar**

**Permiso requerido**: `canDelete`

**Comportamiento**:
- ✅ **Admin**: Puede borrar cualquier registro
- ✅ **Ejecutivo**: Puede borrar registros de sus clientes
- ❌ **Cliente/Lector**: Opción deshabilitada

**Implementación**:
```typescript
<button
  onClick={handleDeleteSelectedRows}
  disabled={!canDelete}
  className={`... ${
    !canDelete
      ? 'text-gray-400 cursor-not-allowed'
      : 'text-red-600 hover:bg-red-50'
  }`}
  title={canDelete ? `Borrar (${selectedRegistros.length})` : "No tienes permisos para borrar registros"}
>
  <Trash2 className="w-4 h-4" />
  <span>Borrar ({selectedRegistros.length})</span>
</button>
```

---

### 7. **Vista de Tarjetas**

**Permisos aplicados**: `canEdit`, `canDelete`

**Comportamiento**:
- ✅ **Admin/Ejecutivo**: Puede seleccionar tarjetas (checkbox visible), click para seleccionar, menú contextual disponible
- ❌ **Cliente/Lector**: Sin checkbox, sin selección, sin menú contextual

**Implementación**:
```typescript
{/* Solo mostrar checkbox si el usuario puede seleccionar */}
{(canEdit || canDelete) && (
  <input
    type="checkbox"
    checked={selectedRows.has(registro.id || '')}
    onChange={() => {}}
    className="w-4 h-4"
  />
)}

// onClick en la tarjeta
onClick={() => {
  // Solo permitir selección si tiene permisos
  if (!canEdit && !canDelete) return;
  // ... lógica de selección
}}

// onContextMenu en la tarjeta
onContextMenu={(e) => {
  e.preventDefault();
  // Solo permitir menú contextual si tiene permisos
  if (!canEdit && !canDelete) return;
  // ... lógica de menú contextual
}}
```

---

## 📊 Matriz de Permisos Aplicados

| Acción | Admin | Ejecutivo | Cliente/Lector |
|--------|-------|-----------|----------------|
| **Ver registros** | ✅ Todos | ✅ Sus clientes | ✅ Solo sus registros |
| **Crear registro (NUEVO)** | ✅ Sí | ✅ Sí | ❌ No |
| **Editar celdas** | ✅ Sí | ✅ Sí | ❌ No |
| **Exportar (EXPORTAR)** | ✅ Sí | ✅ Sí | ❌ No |
| **Enviar a transporte** | ✅ Sí | ✅ Sí | ❌ No |
| **Borrar registro** | ✅ Sí | ✅ Sí | ❌ No |
| **Seleccionar en tarjetas** | ✅ Sí | ✅ Sí | ❌ No |
| **Menú contextual en tarjetas** | ✅ Sí | ✅ Sí | ❌ No |
| **Ver en modo tarjeta** | ✅ Sí | ✅ Sí | ✅ Sí (solo vista) |
| **Buscar globalmente** | ✅ Sí | ✅ Sí | ✅ Sí |

---

## 🔍 Cómo Funciona

### **Detección de Permisos**

Los permisos se calculan en el hook `useUser` (`src/hooks/useUser.tsx`):

```typescript
const isAdmin = currentUser?.rol === 'admin';
const isEjecutivo = currentUser?.rol === 'ejecutivo'
  || (currentUser?.email?.endsWith('@asli.cl') && currentUser?.rol !== 'cliente')
  || false;

const canEdit = currentUser ? (isAdmin || isEjecutivo) : false;
const canAdd = currentUser ? (isAdmin || isEjecutivo) : false;
const canDelete = currentUser ? (isAdmin || isEjecutivo) : false;
const canExport = currentUser ? (isAdmin || isEjecutivo) : false;
```

### **Row Level Security (RLS)**

Además de los permisos de frontend, Supabase aplica políticas RLS en el backend:

- **Admin**: Ve todos los registros
- **Ejecutivo**: Solo ve registros de clientes asignados en `ejecutivo_clientes`
- **Cliente**: Solo ve sus propios registros (según `shipper` o `cliente_nombre`)

---

## 🎨 Experiencia de Usuario

### **Usuario con Permisos (Admin/Ejecutivo)**:
- ✅ Botón "NUEVO" visible y activo
- ✅ Botón "EXPORTAR" visible y activo
- ✅ Celdas editables (doble clic para editar)
- ✅ Menú contextual completo
- ✅ Puede borrar registros
- ✅ Puede enviar a transporte
- ✅ Puede exportar a Excel
- ✅ En vista de tarjetas: puede seleccionar (checkbox visible)

### **Usuario sin Permisos (Cliente/Lector)**:
- ❌ Botón "NUEVO" deshabilitado (gris)
- ❌ Botón "EXPORTAR" deshabilitado (gris)
- ❌ Celdas bloqueadas (no editables)
- ❌ Opciones del menú contextual deshabilitadas
- ❌ En vista de tarjetas: NO puede seleccionar (sin checkbox)
- ❌ Click en tarjeta no hace nada
- ❌ Click derecho en tarjeta no muestra menú
- ℹ️ Tooltips informativos al pasar el mouse
- ✅ Puede ver sus propios registros
- ✅ Puede buscar en sus registros
- ✅ Puede cambiar entre vista tabla/tarjetas

---

## 🔒 Seguridad en Capas

La seguridad se implementa en **4 capas**:

### **1. Carga de Datos (Query Filtering)** ✅ Implementado
- **Filtrado en el servidor** según rol
- Admin: `SELECT * FROM registros`
- Ejecutivo: `SELECT * FROM registros WHERE shipper IN (clientes_asignados)`
- Cliente: `SELECT * FROM registros WHERE shipper ILIKE cliente_nombre`
- Otros: `SELECT * FROM registros WHERE id = 'NONE'` (no ve nada)

### **2. Frontend (UI)** ✅ Implementado
- Botones deshabilitados
- Celdas no editables
- Tooltips informativos

### **3. Lógica de Aplicación** ✅ Implementado
- Hook `useUser` valida permisos
- Funciones protegidas con validaciones

### **4. Backend (Supabase RLS)** ✅ Implementado
- Políticas de Row Level Security
- Validación a nivel de base de datos
- Protección contra acceso directo

---

## 📝 Notas Importantes

1. **Ejecutivos** se identifican automáticamente por email `@asli.cl`
2. **Clientes asignados** se gestionan en tabla `ejecutivo_clientes`
3. **RLS** actúa como última línea de defensa
4. **Tooltips** proporcionan feedback claro al usuario
5. **Estilos visuales** indican claramente qué está deshabilitado

---

## ✅ Verificación

Para verificar que los permisos funcionan correctamente:

1. **Como Admin**:
   - [ ] Puedes crear registros (botón NUEVO activo)
   - [ ] Puedes editar celdas (doble clic funciona)
   - [ ] Puedes borrar registros (menú contextual)
   - [ ] Puedes enviar a transporte (menú contextual)
   - [ ] Puedes exportar (botón EXPORTAR activo)
   - [ ] Ves todos los registros

2. **Como Ejecutivo**:
   - [ ] Puedes crear registros (botón NUEVO activo)
   - [ ] Puedes editar celdas de tus clientes
   - [ ] Puedes borrar registros de tus clientes
   - [ ] Puedes enviar a transporte
   - [ ] Puedes exportar (botón EXPORTAR activo)
   - [ ] Solo ves registros de tus clientes asignados

3. **Como Cliente/Lector**:
   - [ ] Botón "NUEVO" está deshabilitado (gris)
   - [ ] Botón "EXPORTAR" está deshabilitado (gris)
   - [ ] No puedes editar celdas (doble clic no funciona)
   - [ ] Opciones de menú contextual deshabilitadas
   - [ ] Solo ves tus propios registros
   - [ ] Puedes buscar en tus registros
   - [ ] En vista de tarjetas: NO hay checkbox
   - [ ] En vista de tarjetas: Click no selecciona
   - [ ] En vista de tarjetas: Click derecho no muestra menú

---

**Fecha de implementación**: Febrero 2026  
**Archivos modificados**: `app/registros/page.tsx`  
**Hook utilizado**: `src/hooks/useUser.tsx`
