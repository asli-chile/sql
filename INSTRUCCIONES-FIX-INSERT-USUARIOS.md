# 🔧 Fix: Usuarios no-@asli.cl no pueden crear registros

## Problema

Los usuarios que **NO** tienen email `@asli.cl` reciben el error:
```
Error al crear los registros: new row violates row-level security policy for table "registros"
```

## Causa

Las funciones `is_admin()` e `is_ejecutivo()` pueden devolver `NULL` si el usuario no existe en la tabla `usuarios`, lo que causa que las políticas RLS de INSERT fallen porque `NULL = false` evalúa a `NULL`, no a `false`.

## Solución

### Paso 1: Ejecutar el script SQL

1. Ve al **SQL Editor** de Supabase
2. Ejecuta el script: `scripts/fix-politicas-insert-usuarios.sql`

Este script:
- ✅ Actualiza `is_admin()` e `is_ejecutivo()` para devolver `FALSE` explícitamente en lugar de `NULL`
- ✅ Recrea las políticas INSERT con verificaciones correctas
- ✅ Muestra un diagnóstico con el estado actual

### Paso 2: Verificar los resultados

Después de ejecutar el script, revisa:
- Las funciones devuelven `FALSE` (no `NULL`) para usuarios normales
- Las 3 políticas INSERT se crearon correctamente
- Tu usuario actual aparece con su información

### Paso 3: Probar

1. Intenta crear un nuevo registro con un usuario que NO tenga `@asli.cl`
2. Debería funcionar correctamente ahora

## Qué hace el script

### Funciones actualizadas:

**Antes:**
```sql
RETURN (
  SELECT rol = 'admin'
  FROM usuarios
  WHERE auth_user_id = auth.uid()
  LIMIT 1
);  -- Puede devolver NULL
```

**Después:**
```sql
RETURN COALESCE((
  SELECT rol = 'admin'
  FROM usuarios
  WHERE auth_user_id = auth.uid()
  LIMIT 1
), false);  -- Siempre devuelve TRUE o FALSE
```

### Política de INSERT para usuarios normales:

```sql
CREATE POLICY "Usuarios normales pueden crear sus propios registros"
  ON registros FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND is_ejecutivo() = false
    AND is_admin() = false
  );
```

## Si aún no funciona

1. Verifica que el usuario existe en la tabla `usuarios`:
```sql
SELECT * FROM usuarios WHERE auth_user_id = auth.uid();
```

2. Si no existe, el trigger `set_user_fields()` debería crearlo automáticamente, pero si no:
   - Verifica que el trigger existe y está activo
   - O crea el usuario manualmente con el script `scripts/configurar-ejecutivos-por-email.sql`

3. Verifica que las políticas se crearon correctamente:
```sql
SELECT policyname, cmd, with_check 
FROM pg_policies 
WHERE tablename = 'registros' AND cmd = 'INSERT';
```

