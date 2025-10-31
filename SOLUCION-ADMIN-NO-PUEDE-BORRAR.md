# 🔧 Solución: Admin No Puede Borrar Registros

## 📋 Problema
Eres admin pero no puedes borrar registros que crearon otras personas.

## 🔍 Causa del Problema
Las políticas RLS (Row Level Security) están bloqueando las actualizaciones porque el sistema usa **soft delete** (UPDATE con `deleted_at`), no DELETE físico.

## ✅ Solución Paso a Paso

### PASO 1: Verificar tu Rol de Admin

1. Ve a **Supabase Dashboard** → **SQL Editor**
2. Ejecuta este script para verificar tu rol:

```sql
-- Ver tu usuario y rol actual
SELECT 
  email,
  rol,
  CASE 
    WHEN rol = 'admin' THEN '✅ Eres Admin'
    ELSE '❌ NO eres Admin - Necesitas actualizar tu rol'
  END as estado
FROM usuarios
WHERE auth_user_id = auth.uid();
```

**Si NO eres admin**, ejecuta esto (reemplaza el email):

```sql
-- Cambiar tu rol a admin
UPDATE usuarios
SET rol = 'admin'
WHERE email = 'TU-EMAIL@asli.cl';
```

### PASO 2: Verificar las Políticas Actuales

Ejecuta esto para ver las políticas de UPDATE actuales:

```sql
-- Ver políticas de UPDATE
SELECT 
  policyname as "Nombre de Política",
  cmd as "Operación",
  qual as "Condición USING"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'registros'
  AND cmd = 'UPDATE';
```

### PASO 3: Ejecutar el Script de Corrección

1. En Supabase SQL Editor, abre el archivo:
   ```
   scripts/fix-admin-delete-definitivo.sql
   ```

2. **Copia TODO el contenido** del archivo

3. **Pégalo en el SQL Editor** de Supabase

4. **Ejecuta el script** (botón "Run" o F5)

5. Deberías ver un mensaje:
   ```
   ✅ Políticas de UPDATE corregidas - Admins pueden borrar cualquier registro
   ```

### PASO 4: Verificar que Funcionó

Ejecuta esto para confirmar:

```sql
-- Verificar políticas creadas
SELECT 
  policyname as "Política",
  CASE 
    WHEN qual LIKE '%admin%' THEN '✅ Admin (Prioritaria)'
    WHEN qual LIKE '%ejecutivo%' THEN '🔵 Ejecutivo'
    ELSE '⚪ Usuario normal'
  END as "Tipo"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'registros'
  AND cmd = 'UPDATE'
ORDER BY 
  CASE 
    WHEN qual LIKE '%admin%' THEN 1
    WHEN qual LIKE '%ejecutivo%' THEN 2
    ELSE 3
  END;
```

Deberías ver 3 políticas de UPDATE, siendo la primera la de Admin.

### PASO 5: Probar el Borrado

1. **Cierra sesión** en la aplicación
2. **Inicia sesión nuevamente** (para refrescar el token de autenticación)
3. **Intenta borrar un registro** que no creaste tú

## 🔍 Si Sigue Sin Funcionar

### Opción A: Verificar que la Función is_admin() Funciona

Ejecuta esto:

```sql
-- Probar función is_admin()
SELECT 
  is_admin() as "¿La función dice que eres admin?",
  (SELECT rol FROM usuarios WHERE auth_user_id = auth.uid()) as "Tu rol en BD";
```

Si la función dice `false` pero tu rol es `admin`, hay un problema con la función.

### Opción B: Verificar el Error en la Consola

1. Abre la **consola del navegador** (F12 → pestaña "Console")
2. Intenta borrar un registro
3. Busca errores rojos que digan algo como:
   - "permission denied"
   - "new row violates row-level security"
   - "policy violation"

4. **Copia el error completo** y compártelo

### Opción C: Desactivar RLS Temporalmente (SOLO PARA DEBUGGING)

⚠️ **ADVERTENCIA**: Solo haz esto para probar, NO lo dejes así en producción.

```sql
-- Desactivar RLS temporalmente (SOLO PARA PROBAR)
ALTER TABLE registros DISABLE ROW LEVEL SECURITY;
```

Prueba si puedes borrar. Si funciona, el problema está en las políticas.

**NO OLVIDES reactivarlo después:**

```sql
-- Reactivar RLS
ALTER TABLE registros ENABLE ROW LEVEL SECURITY;
```

## 📝 Resumen Rápido

1. ✅ Verifica que tu rol sea `'admin'`
2. ✅ Ejecuta `scripts/fix-admin-delete-definitivo.sql`
3. ✅ Cierra sesión y vuelve a iniciar sesión
4. ✅ Prueba borrar un registro

## 🆘 Si Nada Funciona

Comparte:
1. El resultado de `SELECT rol FROM usuarios WHERE auth_user_id = auth.uid();`
2. El resultado de `SELECT is_admin();`
3. El error que aparece en la consola del navegador (F12)
4. Qué políticas de UPDATE tienes: `SELECT * FROM pg_policies WHERE tablename = 'registros' AND cmd = 'UPDATE';`

