# Instrucciones: Fix para Usuarios Normales

## Problema
Los usuarios con rol `'usuario'` (no admin, no ejecutivo @asli.cl) estaban viendo TODOS los registros, cuando solo deberían ver los registros que ellos crearon.

## Solución Aplicada

### 1. Base de Datos

#### Script: `scripts/fix-completo-usuarios-normales.sql`

Este script hace:

1. **Añade columna `usuario`** a la tabla `registros` (si no existe):
   - Se llena automáticamente con el nombre del usuario que creó el registro
   - Es similar a `created_by`, pero es una columna separada para facilitar el filtrado

2. **Actualiza el trigger `set_user_fields()`**:
   - Ahora llena tanto `created_by` como `usuario` cuando se inserta un nuevo registro
   - En UPDATE, mantiene el `usuario` original (no se cambia)

3. **Actualiza registros existentes**:
   - Copia `created_by` a `usuario` para registros que no tengan `usuario` lleno

4. **Corrige las políticas SELECT**:
   - **Admin**: Puede ver todos los registros
   - **Ejecutivos (@asli.cl)**: Pueden ver registros de sus clientes asignados
   - **Usuarios normales (rol 'usuario')**: SOLO pueden ver registros donde:
     - `created_by = su nombre` O
     - `usuario = su nombre`

### 2. Frontend

#### Cambios en `src/types/registros.ts`:
- Añadido campo `usuario?: string` al interface `Registro`

#### Cambios en `src/lib/migration-utils.ts`:
- `convertSupabaseToApp` ahora mapea `usuario` desde la BD

#### Cambios en `src/components/columns/registros-columns.tsx`:
- Añadida columna "Usuario" después de "Ejecutivo"
- Muestra el nombre del usuario que creó el registro (usa `usuario` o `createdBy` como fallback)

#### Cambios en `app/registros/page.tsx`:
- Comentario añadido indicando que la RLS filtra automáticamente para usuarios normales
- No se necesita filtrar manualmente en el frontend

## Roles en la Base de Datos

Los roles disponibles en la tabla `usuarios` son:
- `'admin'`: Administrador, acceso total
- `'supervisor'`: Supervisor (no usado actualmente en la lógica de permisos)
- `'usuario'`: Usuario normal, solo ve sus propios registros
- `'lector'`: Solo lectura (no usado actualmente en la lógica de permisos)

**Nota importante**: Los "ejecutivos" NO son un rol en la BD, sino usuarios con email que termina en `@asli.cl`. El sistema verifica esto en las políticas RLS.

## Pasos para Aplicar

1. **Ejecuta el script SQL**:
   ```sql
   scripts/fix-completo-usuarios-normales.sql
   ```

2. **Verifica los resultados**:
   - El script muestra:
     - Políticas SELECT creadas
     - Usuario actual y sus permisos
     - Cantidad de registros visibles

3. **Prueba con un usuario normal**:
   - Inicia sesión con un usuario que tenga `rol = 'usuario'` y email sin `@asli.cl`
   - Debe ver SOLO los registros donde `usuario` o `created_by` = su nombre
   - La columna "Usuario" debe aparecer después de "Ejecutivo" en la tabla

## Verificación

Para verificar que funciona:

1. **Ver usuario actual**:
   ```sql
   SELECT 
     u.nombre,
     u.email,
     u.rol,
     CASE 
       WHEN u.rol = 'admin' THEN 'Admin - Ve todo'
       WHEN u.email LIKE '%@asli.cl' THEN 'Ejecutivo - Ve sus clientes'
       WHEN u.rol = 'usuario' THEN 'Usuario normal - Solo ve sus registros'
       ELSE 'Otro rol'
     END as tipo
   FROM usuarios u
   WHERE u.auth_user_id = auth.uid();
   ```

2. **Ver cuántos registros puede ver**:
   ```sql
   SELECT COUNT(*) as total_registros_visibles
   FROM registros
   WHERE deleted_at IS NULL;
   ```

3. **Ver registros visibles con sus creadores**:
   ```sql
   SELECT 
     ref_asli,
     ejecutivo,
     usuario,
     created_by,
     shipper
   FROM registros
   WHERE deleted_at IS NULL
   ORDER BY ref_asli DESC
   LIMIT 10;
   ```

## Troubleshooting

Si un usuario normal sigue viendo todos los registros:

1. Verifica que el nombre en `usuarios.nombre` coincida exactamente con `registros.created_by` o `registros.usuario`
2. Verifica que las políticas SELECT estén correctamente creadas (el script las muestra al final)
3. Verifica que RLS esté habilitado en la tabla `registros`:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename = 'registros';
   ```
   Debe mostrar `rowsecurity = true`

