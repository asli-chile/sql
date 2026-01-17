# Guía Completa: Crear Usuarios Admin, Ejecutivo y Cliente

Esta guía te explica paso a paso cómo crear usuarios en el sistema ASLI.

## 📋 Índice

1. [Prerrequisitos](#prerrequisitos)
2. [Crear Usuario Administrador](#crear-usuario-administrador)
3. [Crear Usuario Ejecutivo](#crear-usuario-ejecutivo)
4. [Crear Usuario Cliente](#crear-usuario-cliente)
5. [Verificar Usuarios Creados](#verificar-usuarios-creados)

---

## Prerrequisitos

Antes de crear usuarios, asegúrate de:

1. ✅ Haber ejecutado el script `add-clientes-asignados-column.sql` en Supabase
2. ✅ Tener acceso al Dashboard de Supabase
3. ✅ Conocer el User UID del usuario en Supabase Auth

---

## Crear Usuario Administrador

Los usuarios **admin** tienen acceso total al sistema, sin restricciones.

### Paso 1: Crear usuario en Supabase Auth

1. Ve a **Supabase Dashboard** > **Authentication** > **Users**
2. Haz clic en **"Add User"** o **"Create User"**
3. Completa:
   - **Email**: `rodrigo.caceres@asli.cl`
   - **Password**: (genera una contraseña segura)
   - **Auto Confirm User**: ✅ (marcar)
4. Haz clic en **"Create User"**
5. **Copia el User UID** (aparece en la lista de usuarios)

### Paso 2: Ejecutar script SQL

1. Abre el archivo `scripts/crear-usuario-admin.sql`
2. Reemplaza:
   - `'AQUI_VA_EL_USER_UID'` → El User UID que copiaste
   - `'rodrigo.caceres@asli.cl'` → El email del usuario
   - `'Rodrigo Caceres'` → El nombre completo
3. Copia el script completo
4. Ve a **Supabase Dashboard** > **SQL Editor**
5. Pega el script y haz clic en **"Run"**

### Resultado

El usuario admin tendrá:
- ✅ Acceso total al sistema
- ✅ Puede crear, editar y eliminar registros
- ✅ Puede acceder a la sección de Mantenimiento
- ✅ Puede crear otros usuarios

---

## Crear Usuario Ejecutivo

Los usuarios **ejecutivo** tienen acceso limitado a clientes específicos asignados.

### Paso 1: Crear usuario en Supabase Auth

1. Ve a **Supabase Dashboard** > **Authentication** > **Users**
2. Haz clic en **"Add User"**
3. Completa:
   - **Email**: `hans.vasquez@asli.cl`
   - **Password**: (genera una contraseña segura)
   - **Auto Confirm User**: ✅ (marcar)
4. Haz clic en **"Create User"**
5. **Copia el User UID**

### Paso 2: Ejecutar script SQL

1. Abre el archivo `scripts/crear-usuario-ejecutivo.sql`
2. Reemplaza:
   - `'AQUI_VA_EL_USER_UID'` → El User UID que copiaste
   - `'hans.vasquez@asli.cl'` → El email del usuario
   - `'Hans Vasquez'` → El nombre completo
   - El array `clientes_asignados` con los nombres de clientes:
     ```sql
     ARRAY[
       'EXPORTADORA DEL SUR (XSUR)',
       'EXPORTADORA SAN ANDRES',
       'FAMILY GROWERS'
     ]::TEXT[]
     ```
3. Copia el script completo
4. Ve a **Supabase Dashboard** > **SQL Editor**
5. Pega el script y haz clic en **"Run"**

### Lista de Clientes Disponibles

Puedes usar cualquiera de estos nombres (debe ser EXACTO):

- `'AGRI. INDEPENDENCIA'`
- `'AGROSOL'`
- `'AISIEN'`
- `'ALMAFRUIT'`
- `'BARON EXPORT'`
- `'BLOSSOM'`
- `'COPEFRUT'`
- `'CRISTIAN MUÑOZ'`
- `'EXPORTADORA DEL SUR (XSUR)'`
- `'EXPORTADORA SAN ANDRES'`
- `'FAMILY GROWERS'`
- `'FENIX'`
- `'FRUIT ANDES SUR'`
- `'GF EXPORT'`
- `'HILLVILLA'`
- `'JOTRISA'`
- `'LA RESERVA'`
- `'RINOFRUIT'`
- `'SIBARIT'`
- `'TENO FRUIT'`
- `'THE GROWERS CLUB'`
- `'VIF'`

### Asignar TODOS los Clientes

Si quieres que el ejecutivo tenga acceso a TODOS los clientes del catálogo, usa el **Ejemplo 2** del script:

```sql
-- Usa este INSERT que obtiene todos los clientes del catálogo automáticamente
INSERT INTO usuarios (...)
SELECT 
  'AQUI_VA_EL_USER_UID',
  'nina.scoti@asli.cl',
  'Nina Scoti',
  'ejecutivo',
  true,
  ARRAY(
    SELECT unnest(valores) 
    FROM catalogos 
    WHERE categoria = 'clientes'
  )::TEXT[],
  NULL
...
```

### Resultado

El usuario ejecutivo tendrá:
- ✅ Acceso solo a los clientes asignados en `clientes_asignados`
- ✅ Puede crear, editar registros de sus clientes
- ❌ No puede acceder a la sección de Mantenimiento
- ❌ No puede ver registros de otros clientes

---

## Crear Usuario Cliente

Los usuarios **cliente** tienen acceso limitado SOLO a su propio cliente.

### Paso 1: Crear usuario en Supabase Auth

1. Ve a **Supabase Dashboard** > **Authentication** > **Users**
2. Haz clic en **"Add User"**
3. Completa:
   - **Email**: `contacto@exportadorasanandres.com`
   - **Password**: (genera una contraseña segura)
   - **Auto Confirm User**: ✅ (marcar)
4. Haz clic en **"Create User"**
5. **Copia el User UID**

### Paso 2: Ejecutar script SQL

1. Abre el archivo `scripts/crear-usuario-cliente.sql`
2. Reemplaza:
   - `'AQUI_VA_EL_USER_UID'` → El User UID que copiaste
   - `'contacto@exportadorasanandres.com'` → El email del cliente
   - `'Contacto Exportadora San Andres'` → El nombre del contacto
   - `'EXPORTADORA SAN ANDRES'` → El nombre **EXACTO** del cliente del catálogo
3. Copia el script completo
4. Ve a **Supabase Dashboard** > **SQL Editor**
5. Pega el script y haz clic en **"Run"**

### ⚠️ Importante: Nombre Exacto del Cliente

El campo `cliente_nombre` debe coincidir **EXACTAMENTE** con el nombre del cliente en el catálogo. Si no coincide, el usuario no podrá ver sus registros.

### Resultado

El usuario cliente tendrá:
- ✅ Acceso SOLO a los registros de su cliente (`cliente_nombre`)
- ✅ Puede ver y consultar sus registros
- ❌ No puede crear ni editar registros (solo lectura)
- ❌ No puede acceder a la sección de Mantenimiento
- ❌ No puede ver registros de otros clientes

---

## Verificar Usuarios Creados

Para verificar que los usuarios se crearon correctamente, ejecuta este script en el SQL Editor:

```sql
-- Ver todos los usuarios con sus roles y configuraciones
SELECT 
  id,
  email,
  nombre,
  rol,
  activo,
  CASE 
    WHEN rol = 'admin' THEN 'Acceso Total'
    WHEN rol = 'ejecutivo' THEN 
      COALESCE(array_length(clientes_asignados, 1), 0)::TEXT || ' clientes asignados'
    WHEN rol = 'cliente' THEN 
      'Cliente: ' || COALESCE(cliente_nombre, 'Sin asignar')
    ELSE 'Sin configuración'
  END as configuracion,
  clientes_asignados,
  cliente_nombre,
  created_at
FROM usuarios
ORDER BY rol, nombre;
```

---

## Resumen de Roles

| Rol | Acceso | clientes_asignados | cliente_nombre | Mantenimiento |
|-----|--------|-------------------|----------------|---------------|
| **admin** | Total | `[]` (vacío) | `NULL` | ✅ Sí |
| **ejecutivo** | Limitado a clientes asignados | `['Cliente1', 'Cliente2']` | `NULL` | ❌ No |
| **cliente** | Solo su cliente | `[]` (vacío) | `'Nombre Cliente'` | ❌ No |

---

## Solución de Problemas

### Error: "Could not find the 'clientes_asignados' column"

**Solución**: Ejecuta primero el script `add-clientes-asignados-column.sql`

### Error: "duplicate key value violates unique constraint"

**Solución**: El usuario ya existe. El script usa `ON CONFLICT` para actualizar, pero si quieres crear uno nuevo, cambia el email o el `auth_user_id`.

### El usuario no puede ver registros

**Solución**: 
- Verifica que el nombre del cliente en `cliente_nombre` o `clientes_asignados` coincida **EXACTAMENTE** con el nombre en la base de datos
- Verifica que el usuario esté `activo = true`

---

## Scripts Disponibles

- `scripts/crear-usuario-admin.sql` - Crear usuario administrador
- `scripts/crear-usuario-ejecutivo.sql` - Crear usuario ejecutivo
- `scripts/crear-usuario-cliente.sql` - Crear usuario cliente
- `scripts/add-clientes-asignados-column.sql` - Agregar columnas necesarias (ejecutar primero)

---

¿Necesitas ayuda? Revisa los scripts SQL para ver ejemplos completos con comentarios.
