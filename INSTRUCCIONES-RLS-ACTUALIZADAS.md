# 🔒 Instrucciones: Políticas RLS Actualizadas

## ⚠️ IMPORTANTE - Cambio de Seguridad

Las políticas RLS han sido actualizadas para implementar la seguridad correcta:

### Nuevas Reglas:

1. **Usuarios sin @asli.cl** → **SOLO ven registros que ellos mismos crearon**
2. **Usuarios con @asli.cl (Ejecutivos)** → Ven registros de sus clientes asignados
3. **Admins** → Ven todos los registros

## 📋 Pasos para Aplicar

### 1. Ejecutar el Script Actualizado

Ve al **SQL Editor** de Supabase y ejecuta:

```sql
scripts/crear-politicas-rls-actualizadas.sql
```

Este script:
- ✅ Elimina las políticas antiguas
- ✅ Crea un trigger para guardar `created_by` automáticamente
- ✅ Actualiza las políticas para que usuarios normales solo vean sus propios registros
- ✅ Mantiene el acceso de ejecutivos según clientes asignados

### 2. Verificar que Funcionó

```sql
-- Verificar que RLS está habilitado
SELECT 
  tablename,
  rowsecurity as "RLS Habilitado"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'registros';
```

Deberías ver `true`.

### 3. Probar con un Usuario Normal

Crea un usuario nuevo con email que **NO tenga @asli.cl**:
- Debería poder crear registros
- Debería **SOLO ver** los registros que él creó
- No debería ver registros creados por otros

## 🔐 Qué Hace el Trigger

El trigger `set_registros_user_fields`:
- **Automáticamente** guarda `created_by` con el ID del usuario cuando crea un registro
- **Automáticamente** guarda `updated_by` cuando actualiza un registro

No necesitas modificar el frontend, el trigger lo hace automáticamente.

## 📊 Políticas por Tipo de Usuario

### Usuario Normal (sin @asli.cl)
- ✅ Puede crear registros
- ✅ Solo ve registros donde `created_by = su_id`
- ✅ Solo puede actualizar registros que creó
- ❌ No puede eliminar (solo admins)

### Ejecutivo (@asli.cl)
- ✅ Puede crear registros de sus clientes asignados
- ✅ Ve registros donde `shipper` está en sus clientes asignados
- ✅ Puede actualizar registros de sus clientes asignados
- ❌ No puede eliminar (solo admins)

### Admin
- ✅ Puede hacer todo
- ✅ Ve todos los registros
- ✅ Puede crear/editar/eliminar cualquier registro

## 🔧 Si un Cliente Necesita Ver Registros de Otros

En el futuro, cuando un cliente se registre y quieras darle acceso a registros de otros, puedes:

**Opción 1:** Crear una nueva tabla `cliente_registros` similar a `ejecutivo_clientes`

**Opción 2:** Asignar el cliente como ejecutivo (agregar a `ejecutivo_clientes`)

**Opción 3:** Modificar las políticas RLS para incluir otra condición

## ✅ Verificación Final

Después de ejecutar el script:

1. **Como usuario normal** (sin @asli.cl):
   ```sql
   -- Debería ver solo tus propios registros
   SELECT COUNT(*) FROM registros WHERE deleted_at IS NULL;
   ```

2. **Como ejecutivo** (@asli.cl):
   ```sql
   -- Debería ver solo registros de tus clientes asignados
   SELECT COUNT(*) FROM registros WHERE deleted_at IS NULL;
   ```

3. **Como admin**:
   ```sql
   -- Debería ver todos los registros
   SELECT COUNT(*) FROM registros WHERE deleted_at IS NULL;
   ```

