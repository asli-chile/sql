# 🔒 Instrucciones: Habilitar Row Level Security (RLS)

## ⚠️ IMPORTANTE

Las tablas están marcadas como **"Unrestricted"** en Supabase, lo que significa que **cualquier usuario autenticado puede ver y modificar todos los datos**. 

Para proteger los datos a nivel de base de datos, necesitas habilitar **Row Level Security (RLS)**.

## 📋 Pasos

### 1. Ejecutar el Script RLS

Ve al **SQL Editor** de Supabase y ejecuta:

```sql
scripts/crear-politicas-rls.sql
```

Este script:
- ✅ Habilita RLS en todas las tablas críticas
- ✅ Crea funciones auxiliares para verificar roles
- ✅ Crea políticas de seguridad para cada tabla
- ✅ Protege los datos a nivel de base de datos

### 2. Verificar que Funcionó

Después de ejecutar el script, verifica:

```sql
-- Ver si RLS está habilitado
SELECT 
  tablename,
  rowsecurity as "RLS Habilitado"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('registros', 'ejecutivo_clientes', 'usuarios', 'catalogos', 'historial_cambios');
```

Deberías ver `true` en todas las tablas.

### 3. Ver las Políticas Creadas

```sql
SELECT 
  tablename,
  policyname,
  cmd as "Operación"
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

## 🔐 Qué Hace el RLS

### Tabla `registros`
- **Admins**: Ven y pueden modificar todos los registros
- **Ejecutivos**: Solo ven/editan registros de sus clientes asignados
- **Usuarios normales**: Solo ven sus propios registros

### Tabla `ejecutivo_clientes`
- **Ejecutivos**: Solo ven sus propias asignaciones
- **Admins**: Ven y gestionan todas las asignaciones

### Tabla `usuarios`
- **Usuarios**: Solo ven su propia información
- **Admins**: Ven y gestionan todos los usuarios

### Tabla `catalogos`
- **Todos los autenticados**: Pueden leer (necesario para dropdowns)
- **Solo admins**: Pueden modificar

### Tabla `historial_cambios`
- **Usuarios**: Ven historial de registros que tienen permiso de ver
- **Admins**: Ven todo el historial

## ⚙️ Funciones Auxiliares Creadas

El script crea estas funciones de seguridad:

1. `get_current_user_id()` - Obtiene el ID del usuario actual
2. `is_admin()` - Verifica si el usuario es admin
3. `is_ejecutivo()` - Verifica si el usuario es ejecutivo (@asli.cl)
4. `get_assigned_clientes(uuid)` - Obtiene clientes asignados a un ejecutivo

## 🧪 Probar que Funciona

### Como Admin (debería ver todo):
```sql
-- Como admin, deberías ver todos los registros
SELECT COUNT(*) FROM registros WHERE deleted_at IS NULL;
```

### Como Ejecutivo (debería ver solo sus clientes):
```sql
-- Como ejecutivo, deberías ver solo registros de tus clientes asignados
SELECT COUNT(*) FROM registros WHERE deleted_at IS NULL;
```

## 🔧 Si Algo Sale Mal

Si necesitas desactivar temporalmente RLS (solo para debugging):

```sql
-- ⚠️ SOLO PARA DEBUGGING - Desactivar RLS
ALTER TABLE registros DISABLE ROW LEVEL SECURITY;
ALTER TABLE ejecutivo_clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE catalogos DISABLE ROW LEVEL SECURITY;
ALTER TABLE historial_cambios DISABLE ROW LEVEL SECURITY;
```

**Pero recuerda reactivarlo después:**

```sql
-- Reactivar RLS
ALTER TABLE registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE ejecutivo_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogos ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_cambios ENABLE ROW LEVEL SECURITY;
```

## ✅ Resultado Esperado

Después de ejecutar el script, las tablas en Supabase deberían mostrar:
- ❌ Ya NO "Unrestricted"
- ✅ Deberían mostrar el badge de seguridad (candado) indicando que RLS está activo

