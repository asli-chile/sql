# 🚀 Solución Rápida: Error de INSERT para Usuarios

## Problema
Error: "new row violates row-level security policy for table 'registros'"

Diagnóstico: "Usuario no existe en tabla usuarios"

## Solución Rápida (2 pasos)

### Paso 1: Crear el usuario actual

Ejecuta este script simple en Supabase SQL Editor:

```sql
scripts/crear-usuario-actual.sql
```

Este script crea automáticamente tu usuario en la tabla `usuarios` usando tu información de Supabase Auth.

### Paso 2: Aplicar el fix completo (recomendado)

Para evitar este problema en el futuro y asegurar que todos los usuarios se creen automáticamente, ejecuta:

```sql
scripts/fix-insert-usuarios-completo.sql
```

Este script:
- ✅ Crea la función `ensure_user_exists()` que crea usuarios automáticamente
- ✅ Actualiza todas las funciones auxiliares
- ✅ Corrige las políticas INSERT
- ✅ Asegura que cualquier usuario que se autentique se cree automáticamente

## Después de ejecutar

1. **Verifica** que el usuario se creó correctamente
2. **Intenta crear un registro** nuevamente
3. **Debería funcionar** ahora

## Si prefieres una solución temporal

Solo ejecuta el **Paso 1** para crear tu usuario manualmente. Funcionará, pero si otro usuario nuevo intenta crear registros, tendrá el mismo problema.

## Si quieres la solución permanente

Ejecuta **ambos pasos**. Así, cualquier usuario que se autentique se creará automáticamente y podrá crear registros sin problemas.

