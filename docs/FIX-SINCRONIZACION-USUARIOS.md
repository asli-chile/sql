# Fix: Sincronización de Usuarios

## Problema

Cuando se crea un nuevo usuario:
- ✅ Se guarda en `auth.users` (Supabase Authentication)
- ✅ Se guarda en `user_emails` (tabla de emails secundarios)
- ❌ **NO se guarda en `usuarios`** (tabla principal de usuarios)

Esto causa problemas porque la aplicación espera que todos los usuarios estén en la tabla `usuarios` para funcionar correctamente.

## Solución

Se ha actualizado la función `sync_primary_email()` para que cuando se cree un usuario en `auth.users`, automáticamente también se cree en la tabla `usuarios`.

### Scripts disponibles:

1. **`scripts/fix-sync-usuarios-completo.sql`** (RECOMENDADO)
   - Actualiza la función del trigger
   - Sincroniza usuarios existentes que faltan
   - Muestra un resumen de la sincronización

2. **`scripts/sync-usuario-on-signup.sql`**
   - Crea un trigger adicional (si prefieres tener triggers separados)

## Cómo aplicar el fix

### Opción 1: Script completo (Recomendado)

1. Abre el SQL Editor en Supabase
2. Copia y pega el contenido de `scripts/fix-sync-usuarios-completo.sql`
3. Ejecuta el script
4. Verifica que se muestren los mensajes de éxito

### Opción 2: Manual

Si prefieres ejecutar solo la parte del trigger:

1. Abre el SQL Editor en Supabase
2. Copia y pega la función actualizada de `sync_primary_email()`
3. Ejecuta

## Verificación

Después de aplicar el fix:

1. Crea un nuevo usuario de prueba
2. Verifica que aparezca en:
   - `auth.users` ✅
   - `user_emails` ✅
   - `usuarios` ✅

Para verificar en Supabase SQL Editor:

```sql
-- Ver último usuario creado
SELECT * FROM usuarios ORDER BY created_at DESC LIMIT 1;

-- Comparar usuarios en auth vs tabla usuarios
SELECT 
  au.id as auth_id,
  au.email as auth_email,
  u.id as usuario_id,
  u.nombre,
  u.email as usuario_email
FROM auth.users au
LEFT JOIN usuarios u ON u.auth_user_id = au.id
ORDER BY au.created_at DESC
LIMIT 10;
```

## Usuarios existentes

El script `fix-sync-usuarios-completo.sql` también sincroniza automáticamente los usuarios existentes que ya están en `auth.users` pero no en `usuarios`.

## Notas

- El trigger ahora crea usuarios con rol `'usuario'` por defecto
- Los usuarios se crean con `activo = true`
- Si hay conflictos (usuario ya existe), se actualiza el nombre y email
- El nombre se obtiene de `raw_user_meta_data->>'full_name'` o del email si no está disponible

## Próximos pasos

1. ✅ Ejecutar el script de fix
2. ✅ Verificar que los nuevos usuarios se crean correctamente
3. ✅ Verificar usuarios existentes fueron sincronizados

