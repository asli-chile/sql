# 🔧 Fix: created_by y REF ASLI

## Problemas identificados

1. **created_by guarda UUID en lugar del nombre del usuario**
   - El trigger estaba guardando el UUID del usuario (`current_user_uuid::TEXT`)
   - Debe guardar el nombre del usuario (`usuarios.nombre`)

2. **REF ASLI siempre genera A0001**
   - Puede ser que la función SQL no exista o no esté funcionando correctamente
   - Necesita verificar y corregir la función

## Solución

### Paso 1: Ejecutar el script SQL en Supabase

1. Ve al **SQL Editor** de Supabase
2. Ejecuta el script: `scripts/fix-created-by-y-ref-asli.sql`
3. El script:
   - ✅ Actualiza el trigger para guardar el **NOMBRE** del usuario en `created_by`
   - ✅ Verifica/crea las funciones de REF ASLI
   - ✅ Muestra un diagnóstico con:
     - Total de registros activos
     - Máximo REF ASLI actual
     - Próximo REF ASLI que se generará
     - Últimos 10 REF ASLI creados
     - Lista de usuarios con sus nombres

### Paso 2: Verificar los resultados

Después de ejecutar el script, revisa:
- El diagnóstico muestra el máximo REF ASLI correcto
- El próximo REF ASLI que se generará es el correcto
- Los usuarios tienen nombres correctos en la tabla `usuarios`

### Paso 3: Probar

1. Crea un nuevo registro con un usuario que NO sea admin
2. Verifica que:
   - ✅ El campo `created_by` tiene el **nombre** del usuario (no UUID)
   - ✅ El REF ASLI generado es el siguiente correlativo (no A0001)

## Qué hace el script

### 1. Trigger actualizado (`set_user_fields`)

**Antes:**
```sql
NEW.created_by := current_user_uuid::TEXT;  -- Guardaba UUID
```

**Después:**
```sql
SELECT nombre INTO user_nombre FROM usuarios WHERE auth_user_id = auth.uid();
NEW.created_by := user_nombre;  -- Guarda el nombre
```

### 2. Funciones REF ASLI

- Verifica que `get_next_ref_asli()` existe
- Verifica que `get_multiple_ref_asli()` existe
- Las crea si no existen
- Usan `SECURITY DEFINER` para ver TODOS los registros (ignorando RLS)

## Si aún no funciona

### Para REF ASLI:

1. Verifica que la función devuelve el número correcto:
```sql
SELECT get_next_ref_asli() as "Siguiente REF ASLI";
```

2. Si devuelve A0001 pero hay registros:
   - Verifica que los REF ASLI existentes tienen el formato correcto (`A####`)
   - Verifica que `deleted_at IS NULL` para los registros activos

3. Revisa la consola del navegador para errores al generar REF ASLI

### Para created_by:

1. Verifica que el usuario existe en la tabla `usuarios`:
```sql
SELECT id, nombre, email, rol
FROM usuarios
WHERE auth_user_id = auth.uid();
```

2. Si el usuario no existe o no tiene nombre:
   - El trigger usará 'Usuario' como fallback
   - Asegúrate de que todos los usuarios tengan un nombre en la tabla `usuarios`

## Notas importantes

- El trigger se ejecuta **antes** de INSERT/UPDATE, así que siempre sobrescribe `created_by` si no está establecido
- Si quieres mantener un `created_by` manual, necesitarías modificar el trigger
- Los REF ASLI se generan usando funciones SQL con `SECURITY DEFINER`, que ignoran RLS para garantizar unicidad global

