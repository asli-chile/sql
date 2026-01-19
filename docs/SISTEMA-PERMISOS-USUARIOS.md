# 🔐 Sistema de Permisos por Nivel de Usuario

## 📋 Resumen General

El sistema tiene **4 niveles de roles** principales, más un sistema especial para **ejecutivos** basado en el dominio de email.

---

## 👥 Roles y Permisos

### 1. 🔴 **ADMIN** (`rol = 'admin'`)

**Permisos completos:**
- ✅ **Ver**: Todos los registros sin restricciones
- ✅ **Agregar**: Puede crear registros para cualquier cliente
- ✅ **Editar**: Puede editar cualquier registro
- ✅ **Eliminar**: Puede eliminar cualquier registro
- ✅ **Exportar**: Puede exportar datos
- ✅ **Ver historial**: Acceso completo al historial de cambios
- ✅ **Subir documentos**: Puede subir documentos (si `puede_subir = true`)
- ✅ **Eliminar documentos**: Puede eliminar documentos de la papelera

**Restricciones:**
- Ninguna

**Ejemplo de usuarios:**
- MARIO BAZAEZ
- HANS VASQUEZ
- RODRIGO CACERES

---

### 2. 🟡 **EJECUTIVO** (Email termina en `@asli.cl`)

**Identificación:**
- Se detecta automáticamente si el email termina en `@asli.cl`
- No depende del campo `rol` en la base de datos

**Permisos:**
- ✅ **Ver**: Solo registros de sus clientes asignados (tabla `ejecutivo_clientes`)
- ✅ **Agregar**: Puede crear registros para sus clientes asignados
- ✅ **Editar**: Puede editar registros de sus clientes asignados
- ✅ **Eliminar**: Puede eliminar registros de sus clientes asignados
- ✅ **Exportar**: Puede exportar datos de sus clientes
- ✅ **Ver historial**: Acceso al historial de sus clientes
- ✅ **Subir documentos**: Puede subir documentos (si `puede_subir = true`)
- ⚠️ **Eliminar documentos**: Solo admins pueden eliminar documentos

**Restricciones:**
- Solo ve/edita registros de clientes asignados en `ejecutivo_clientes`
- Si no tiene clientes asignados, no ve ningún registro

**Configuración:**
- Los clientes se asignan en la tabla `ejecutivo_clientes`
- Campo `puede_subir` controla si puede subir documentos

**Ejemplo de usuarios:**
- POLIANA CISTERNAS (todos los clientes)
- NINA SCOTI (solo HILLVILLA, BLOSSOM)
- RICARDO LAZO (solo BARON EXPORT, AISIEN, VIF, SIBARIT)

---

### 3. 🟢 **USUARIO** (`rol = 'usuario'`)

**Permisos:**
- ✅ **Ver**: Solo registros que **creó él mismo** (campo `created_by` o `usuario`)
- ✅ **Agregar**: Puede crear nuevos registros
- ❌ **Editar**: NO puede editar registros existentes
- ❌ **Eliminar**: NO puede eliminar registros
- ✅ **Exportar**: Puede exportar sus propios datos
- ✅ **Ver historial**: Puede ver historial de sus registros
- ❌ **Subir documentos**: NO puede subir documentos (solo lectura)

**Restricciones:**
- Solo ve sus propios registros
- No puede modificar registros existentes
- No puede subir documentos

**Ejemplo de usuarios:**
- Usuarios externos que solo crean sus propios registros

---

### 4. 🔵 **LECTOR** (`rol = 'lector'`)

**Permisos:**
- ✅ **Ver**: Todos los registros (según políticas RLS)
- ❌ **Agregar**: NO puede crear registros
- ❌ **Editar**: NO puede editar registros
- ❌ **Eliminar**: NO puede eliminar registros
- ✅ **Exportar**: Puede exportar datos
- ✅ **Ver historial**: Puede ver historial
- ❌ **Subir documentos**: NO puede subir documentos (solo lectura)

**Restricciones:**
- Solo lectura
- No puede modificar nada
- No puede subir documentos

**Ejemplo de usuarios:**
- ALEX CARDENAS
- STEFANIE CORDOVA

---

## 🔧 Permisos Especiales: `puede_subir`

**Campo en tabla `usuarios`:**
- `puede_subir` (boolean, nullable)

**Lógica:**
1. **Si `puede_subir = true`**: Puede subir documentos
2. **Si `puede_subir = false`**: NO puede subir documentos (incluso si es admin/ejecutivo)
3. **Si `puede_subir = null/undefined`**:
   - **Admin/Ejecutivo**: Por defecto `true`
   - **Otros roles**: Por defecto `false`

**Regla final:**
```typescript
canUpload = (esAdmin || esEjecutivo) && puede_subir === true
```

---

## 📊 Matriz de Permisos

| Acción | Admin | Ejecutivo | Usuario | Lector |
|--------|-------|-----------|---------|--------|
| **Ver registros** | ✅ Todos | ✅ Sus clientes | ✅ Solo propios | ✅ Todos |
| **Agregar registros** | ✅ Sí | ✅ Sí (sus clientes) | ✅ Sí | ❌ No |
| **Editar registros** | ✅ Sí | ✅ Sí (sus clientes) | ❌ No | ❌ No |
| **Eliminar registros** | ✅ Sí | ✅ Sí (sus clientes) | ❌ No | ❌ No |
| **Exportar datos** | ✅ Sí | ✅ Sí | ✅ Sí | ✅ Sí |
| **Ver historial** | ✅ Sí | ✅ Sí | ✅ Sí | ✅ Sí |
| **Subir documentos** | ✅ Si `puede_subir=true` | ✅ Si `puede_subir=true` | ❌ No | ❌ No |
| **Eliminar documentos** | ✅ Sí | ❌ No | ❌ No | ❌ No |

---

## 🔍 Detección de Roles

### En el Frontend (`src/hooks/useUser.tsx`):

```typescript
// Ejecutivo se detecta por email
const isEjecutivo = currentUser?.email?.endsWith('@asli.cl') || false;

// Permisos básicos
const canEdit = currentUser ? (currentUser.rol === 'admin' || isEjecutivo) : false;
const canAdd = currentUser ? ['admin', 'usuario'].includes(currentUser.rol) || isEjecutivo : false;
const canDelete = currentUser ? (currentUser.rol === 'admin' || isEjecutivo) : false;
const canExport = currentUser ? ['admin', 'usuario', 'lector'].includes(currentUser.rol) || isEjecutivo : false;
```

### En el Backend (Supabase RLS):

- **Función `is_admin()`**: Verifica si `rol = 'admin'`
- **Función `is_ejecutivo()`**: Verifica si `email LIKE '%@asli.cl'`
- **Función `get_current_user_id()`**: Obtiene el ID del usuario actual
- **Políticas RLS**: Controlan acceso a nivel de base de datos

---

## 🛡️ Row Level Security (RLS)

### Tablas con RLS habilitado:
- `registros`
- `ejecutivo_clientes`
- `usuarios`
- `historial_cambios`
- `catalogos`

### Políticas principales:

1. **SELECT (Ver)**:
   - Admin: Ve todo
   - Ejecutivo: Ve solo registros de sus clientes asignados
   - Usuario: Ve solo registros que creó (`created_by` o `usuario`)
   - Lector: Ve todo (solo lectura)

2. **INSERT (Agregar)**:
   - Admin: Puede crear cualquier registro
   - Ejecutivo: Puede crear registros de sus clientes
   - Usuario: Puede crear registros (se asigna automáticamente `created_by`)
   - Lector: No puede crear

3. **UPDATE (Editar)**:
   - Admin: Puede editar cualquier registro
   - Ejecutivo: Puede editar registros de sus clientes
   - Usuario: No puede editar
   - Lector: No puede editar

4. **DELETE (Eliminar)**:
   - Admin: Puede eliminar cualquier registro
   - Ejecutivo: Puede eliminar registros de sus clientes
   - Usuario: No puede eliminar
   - Lector: No puede eliminar

---

## 📝 Notas Importantes

1. **Ejecutivos** se identifican por el dominio `@asli.cl`, no por el campo `rol`
2. **Clientes asignados** se gestionan en la tabla `ejecutivo_clientes`
3. **Permisos de documentos** requieren `puede_subir = true` además de ser admin/ejecutivo
4. **RLS** actúa como segunda capa de seguridad en la base de datos
5. **Usuarios normales** solo ven sus propios registros (los que crearon)

---

## 🔄 Flujo de Verificación de Permisos

```
Usuario inicia sesión
    ↓
Se carga desde Supabase (tabla `usuarios`)
    ↓
Se verifica:
  - rol (admin, usuario, lector)
  - email (¿termina en @asli.cl? → ejecutivo)
  - puede_subir (para documentos)
    ↓
Se aplican permisos en frontend (useUser hook)
    ↓
RLS en Supabase valida en backend
    ↓
Acceso permitido/denegado
```

---

---

## 📧 Sistema de Emails Secundarios (Usuarios Adicionales)

### ¿Qué son los emails secundarios?

Los **emails secundarios** permiten que un usuario tenga **múltiples direcciones de email** asociadas a la misma cuenta. Esto permite:

- ✅ Hacer login con cualquiera de los emails (principal o secundarios)
- ✅ Todos los emails comparten la **misma contraseña**
- ✅ Todos los emails tienen los **mismos permisos** (mismo rol, mismo usuario)
- ✅ Útil para usuarios que tienen múltiples emails corporativos o personales

### Tabla `user_emails`

**Estructura:**
- `id` (UUID): Identificador único
- `user_id` (UUID): Referencia al usuario en `auth.users`
- `email` (TEXT): Dirección de email (única)
- `is_primary` (BOOLEAN): Si es el email principal (`true`) o secundario (`false`)
- `created_at` (TIMESTAMP): Fecha de creación

**Políticas RLS:**
- Los usuarios solo pueden ver/agregar/eliminar sus propios emails
- Los admins pueden ver todos los emails

### Funcionamiento del Login

**Flujo cuando un usuario intenta hacer login:**

1. Usuario ingresa email (puede ser principal o secundario)
2. Sistema verifica si el email es secundario usando `check_secondary_email()`
3. Si es secundario:
   - Obtiene el email principal asociado
   - Hace login con el email principal (misma contraseña)
   - El usuario accede con su cuenta normal
4. Si es principal:
   - Hace login normalmente

**Ejemplo:**
```
Usuario: rodrigo@asli.cl (principal)
Email secundario: rodrigo.personal@gmail.com

Login con rodrigo.personal@gmail.com:
  → Sistema detecta que es secundario
  → Obtiene email principal: rodrigo@asli.cl
  → Hace login con rodrigo@asli.cl
  → Usuario accede con permisos de ejecutivo (@asli.cl)
```

### Gestión de Emails Secundarios

**Página de gestión:** `/dashboard/profile/emails`

**Funcionalidades:**
- ✅ Ver todos los emails asociados (principal y secundarios)
- ✅ Agregar nuevo email secundario
- ✅ Eliminar email secundario
- ✅ Verificar que el email principal esté marcado correctamente

**API Endpoints:**
- `GET /api/user/emails` - Obtener lista de emails del usuario
- `POST /api/user/emails` - Agregar nuevo email secundario
- `DELETE /api/user/emails?id={id}` - Eliminar email secundario
- `GET /api/user/check-email?email={email}` - Verificar si un email es secundario

### Función `check_secondary_email()`

**Ubicación:** Supabase (función SQL)

**Propósito:** Verificar si un email es secundario y obtener el email principal

**Retorna:**
```json
{
  "is_secondary": true,
  "primary_email": "email@principal.com"
}
```

o

```json
{
  "is_secondary": false
}
```

**Uso:**
- Se llama automáticamente durante el login
- Puede ser llamada sin autenticación (pública)
- Necesaria para que el login con emails secundarios funcione

### Reglas Importantes

1. **Un email solo puede pertenecer a un usuario** (constraint único)
2. **Solo puede haber un email principal** por usuario (`is_primary = true`)
3. **Todos los emails comparten la misma contraseña** (la del email principal)
4. **Todos los emails tienen los mismos permisos** (mismo `user_id`)
5. **El email principal se sincroniza automáticamente** desde `auth.users` al crear usuario

### Sincronización Automática

**Trigger:** `on_auth_user_created`
- Cuando se crea un usuario en `auth.users`, se crea automáticamente un registro en `user_emails` con `is_primary = true`
- Esto asegura que siempre haya un email principal

### Casos de Uso

1. **Ejecutivo con múltiples emails:**
   - Email principal: `rodrigo@asli.cl` (ejecutivo)
   - Email secundario: `rodrigo.personal@gmail.com`
   - Puede hacer login con cualquiera de los dos
   - Ambos tienen permisos de ejecutivo

2. **Usuario que cambió de email:**
   - Email principal: `nuevo@email.com`
   - Email secundario: `viejo@email.com`
   - Puede seguir usando el email viejo para login

3. **Usuario con email corporativo y personal:**
   - Email principal: `usuario@empresa.com`
   - Email secundario: `usuario.personal@gmail.com`
   - Acceso desde cualquier email

---

## 📚 Archivos Relacionados

- `src/hooks/useUser.tsx` - Hook de permisos en frontend
- `scripts/crear-politicas-rls-actualizadas.sql` - Políticas RLS
- `app/documentos/page.tsx` - Ejemplo de uso de `puede_subir`
- `app/dashboard/page.tsx` - Ejemplo de filtrado por clientes asignados
- `app/dashboard/profile/emails/page.tsx` - Gestión de emails secundarios
- `app/api/user/emails/route.ts` - API para gestionar emails
- `app/api/user/check-email/route.ts` - API para verificar emails secundarios
- `app/auth/page.tsx` - Login con soporte para emails secundarios
- `supabase/migrations/20251124_create_user_emails.sql` - Migración de tabla `user_emails`

