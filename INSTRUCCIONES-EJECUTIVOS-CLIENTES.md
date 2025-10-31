# 📋 Instrucciones: Sistema de Ejecutivos y Clientes Asignados

## 🎯 Resumen del Sistema

Los usuarios con email `@asli.cl` son **Ejecutivos** y tienen acceso completo al sistema, pero **SOLO pueden ver y gestionar registros de sus clientes asignados**.

## 📝 Pasos de Configuración

### 1. Crear la Tabla de Relación

Ejecuta en el **SQL Editor de Supabase** el script:
```sql
scripts/crear-ejecutivo-clientes.sql
```

Este script crea la tabla `ejecutivo_clientes` que relaciona ejecutivos con sus clientes.

### 2. Asignar Clientes a Ejecutivos

Para asignar clientes a un ejecutivo, ejecuta en Supabase:

```sql
-- Ejemplo: Asignar clientes a un ejecutivo
INSERT INTO ejecutivo_clientes (ejecutivo_id, cliente_nombre) 
SELECT u.id, 'NOMBRE_CLIENTE_1'
FROM usuarios u 
WHERE u.email = 'ejecutivo@asli.cl'
ON CONFLICT (ejecutivo_id, cliente_nombre) DO NOTHING;

-- Asignar múltiples clientes al mismo ejecutivo
INSERT INTO ejecutivo_clientes (ejecutivo_id, cliente_nombre) 
SELECT u.id, cliente
FROM usuarios u 
CROSS JOIN (VALUES 
  ('CLIENTE_1'), 
  ('CLIENTE_2'), 
  ('CLIENTE_3')
) AS clientes(cliente)
WHERE u.email = 'ejecutivo@asli.cl'
ON CONFLICT (ejecutivo_id, cliente_nombre) DO NOTHING;
```

### 3. Verificar Clientes Asignados

```sql
-- Ver todos los clientes asignados a un ejecutivo
SELECT 
  u.email as ejecutivo_email,
  u.nombre as ejecutivo_nombre,
  ec.cliente_nombre,
  ec.activo,
  ec.created_at
FROM ejecutivo_clientes ec
JOIN usuarios u ON u.id = ec.ejecutivo_id
WHERE u.email = 'ejecutivo@asli.cl'
ORDER BY ec.cliente_nombre;
```

### 4. Asignar Múltiples Ejecutivos a un Cliente

```sql
-- Asignar un cliente a múltiples ejecutivos
INSERT INTO ejecutivo_clientes (ejecutivo_id, cliente_nombre)
SELECT u.id, 'CLIENTE_COMPARTIDO'
FROM usuarios u
WHERE u.email IN ('ejecutivo1@asli.cl', 'ejecutivo2@asli.cl')
ON CONFLICT (ejecutivo_id, cliente_nombre) DO NOTHING;
```

## ⚙️ Cómo Funciona el Sistema

### Detección Automática de Ejecutivos

- El sistema detecta automáticamente si un usuario tiene email `@asli.cl`
- Si es ejecutivo, se cargan sus clientes asignados desde la tabla `ejecutivo_clientes`
- Los ejecutivos tienen **todos los permisos** (ver, crear, editar, eliminar, exportar)

### Filtrado Automático

1. **Registros visibles**: Solo se muestran registros donde `shipper` (cliente) está en la lista de clientes asignados
2. **Dropdown de clientes**: En "Agregar nuevo registro" y "Editar registro", solo aparecen los clientes asignados
3. **Validaciones**: 
   - No se puede editar un registro de un cliente no asignado
   - No se puede eliminar un registro de un cliente no asignado
   - No se puede crear un registro con un cliente no asignado

### Relación Muchos a Muchos

- ✅ Un ejecutivo puede tener múltiples clientes
- ✅ Un cliente puede tener múltiples ejecutivos
- ✅ La relación se gestiona en la tabla `ejecutivo_clientes`

## 🔒 Seguridad

- Los filtros se aplican tanto en el frontend como en las consultas a Supabase
- Las validaciones previenen acciones no autorizadas
- Los ejecutivos NO pueden ver/editar registros de clientes no asignados

## 📌 Notas Importantes

1. **Nombres de Clientes**: El campo `cliente_nombre` en `ejecutivo_clientes` debe coincidir **exactamente** con el valor del campo `shipper` en la tabla `registros`
2. **Activo**: Puedes desactivar temporalmente la asignación cambiando `activo = false` en `ejecutivo_clientes`
3. **Clientes sin Asignar**: Si un ejecutivo no tiene clientes asignados, NO verá ningún registro

## 🛠️ Consultas Útiles

```sql
-- Ver todos los ejecutivos y sus clientes
SELECT 
  u.email,
  u.nombre,
  COUNT(ec.id) as total_clientes,
  STRING_AGG(ec.cliente_nombre, ', ' ORDER BY ec.cliente_nombre) as clientes
FROM usuarios u
LEFT JOIN ejecutivo_clientes ec ON ec.ejecutivo_id = u.id AND ec.activo = true
WHERE u.email LIKE '%@asli.cl'
GROUP BY u.id, u.email, u.nombre
ORDER BY u.nombre;

-- Ver clientes que NO tienen ejecutivo asignado
SELECT DISTINCT r.shipper
FROM registros r
WHERE r.deleted_at IS NULL
  AND r.shipper IS NOT NULL
  AND r.shipper NOT IN (
    SELECT DISTINCT ec.cliente_nombre 
    FROM ejecutivo_clientes ec 
    WHERE ec.activo = true
  )
ORDER BY r.shipper;
```

