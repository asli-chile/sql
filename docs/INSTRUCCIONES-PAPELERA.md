# 🔧 Solución: Los registros eliminados no aparecen en la Papelera

## Problema
Los registros eliminados (soft delete) no se muestran en la papelera después de ser borrados.

## Causa
Las políticas RLS (Row Level Security) estaban bloqueando la visualización de registros con `deleted_at IS NOT NULL`. Además, el componente `TrashModal` estaba usando el cliente incorrecto de Supabase.

## Solución

### 1. Aplicar el script SQL en Supabase

Ve al SQL Editor de Supabase y ejecuta el script:

```sql
scripts/fix-politicas-papelera.sql
```

Este script:
- Elimina las políticas SELECT antiguas que bloqueaban registros eliminados
- Crea nuevas políticas que permiten ver registros eliminados aplicando los mismos permisos:
  - **Admins**: Ven todos los registros (activos y eliminados)
  - **Ejecutivos**: Ven registros eliminados de sus clientes asignados
  - **Usuarios normales**: Ven sus propios registros eliminados

### 2. Cambios en el código (ya aplicados)

- ✅ `TrashModal.tsx` actualizado para usar `createClient()` de `@/lib/supabase-browser`
- ✅ Todas las funciones ahora usan el cliente correcto con autenticación

### 3. Verificar que funciona

1. Elimina un registro (soft delete)
2. Abre la papelera
3. Deberías ver el registro eliminado con la opción de restaurarlo

## Notas importantes

- Las políticas UPDATE y DELETE no cambian
- La restauración funciona porque las políticas UPDATE no verifican `deleted_at`
- La eliminación permanente usa `.delete()` directamente

## Si aún no funciona

1. Verifica que ejecutaste el script SQL completo
2. Revisa la consola del navegador para errores
3. Verifica que el usuario tiene los permisos correctos en la tabla `usuarios`

