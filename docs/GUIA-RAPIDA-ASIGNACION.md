# 🚀 Guía Rápida: Asignar Clientes a Ejecutivos

## ⚠️ IMPORTANTE
- Los **clientes** vienen del **CATÁLOGO** (`catalogos` tabla)
- Los **ejecutivos** son usuarios con email `@asli.cl` en la tabla `usuarios`
- Los nombres deben coincidir **EXACTAMENTE** con el catálogo

---

## 📋 Pasos Rápidos

### Paso 1: Ver Clientes del Catálogo
```sql
SELECT valores
FROM catalogos
WHERE categoria = 'clientes';
```
**Copia los nombres exactos** de este resultado.

### Paso 2: Ver Ejecutivos
```sql
SELECT id, email, nombre
FROM usuarios
WHERE email LIKE '%@asli.cl';
```
**Copia el EMAIL** del ejecutivo.

### Paso 3: Asignar Cliente a Ejecutivo

Reemplaza:
- `'ejecutivo@asli.cl'` → Email real del ejecutivo
- `'Nombre Cliente'` → Nombre EXACTO del catálogo

```sql
INSERT INTO ejecutivo_clientes (ejecutivo_id, cliente_nombre) 
SELECT u.id, 'Nombre Cliente'
FROM usuarios u 
WHERE u.email = 'ejecutivo@asli.cl'
ON CONFLICT (ejecutivo_id, cliente_nombre) DO NOTHING;
```

### Paso 4: Verificar
```sql
SELECT 
  u.email,
  ec.cliente_nombre
FROM ejecutivo_clientes ec
JOIN usuarios u ON u.id = ec.ejecutivo_id
WHERE u.email = 'ejecutivo@asli.cl';
```

---

## 💡 Ejemplos Reales

### Ejemplo 1: Asignar un cliente
```sql
-- Asignar "Frutas del Sur" a "juan.perez@asli.cl"
INSERT INTO ejecutivo_clientes (ejecutivo_id, cliente_nombre) 
SELECT u.id, 'Frutas del Sur'
FROM usuarios u 
WHERE u.email = 'juan.perez@asli.cl'
ON CONFLICT (ejecutivo_id, cliente_nombre) DO NOTHING;
```

### Ejemplo 2: Asignar varios clientes
```sql
-- Asignar 3 clientes a "maria.gonzalez@asli.cl"
INSERT INTO ejecutivo_clientes (ejecutivo_id, cliente_nombre) 
SELECT u.id, cliente
FROM usuarios u 
CROSS JOIN (VALUES 
  ('Frutas del Sur'), 
  ('Exportaciones Chile'), 
  ('Agrícola Los Andes')
) AS clientes(cliente)
WHERE u.email = 'maria.gonzalez@asli.cl'
ON CONFLICT (ejecutivo_id, cliente_nombre) DO NOTHING;
```

### Ejemplo 3: Asignar TODOS los clientes del catálogo
```sql
-- Asignar todos los clientes a "admin@asli.cl"
INSERT INTO ejecutivo_clientes (ejecutivo_id, cliente_nombre)
SELECT u.id, cliente
FROM usuarios u
CROSS JOIN LATERAL (
  SELECT unnest(valores) as cliente
  FROM catalogos
  WHERE categoria = 'clientes'
) AS clientes_catalogo
WHERE u.email = 'admin@asli.cl'
ON CONFLICT (ejecutivo_id, cliente_nombre) DO NOTHING;
```

---

## ❓ ¿Cómo sé si el nombre está correcto?

Ejecuta esto para comparar:
```sql
-- Ver clientes del catálogo vs clientes asignados
SELECT 
  cliente_catalogo as "Cliente en Catálogo",
  CASE 
    WHEN ec.cliente_nombre IS NULL THEN '❌ NO asignado a ningún ejecutivo'
    ELSE '✅ Asignado'
  END as "Estado"
FROM (
  SELECT unnest(valores) as cliente_catalogo
  FROM catalogos
  WHERE categoria = 'clientes'
) AS catalogos_clientes
LEFT JOIN ejecutivo_clientes ec ON ec.cliente_nombre = catalogos_clientes.cliente_catalogo AND ec.activo = true
ORDER BY cliente_catalogo;
```

---

## 🔧 Script Completo

Ver el archivo: `scripts/asignar-clientes-ejecutivo.sql`

Ahí encontrarás todos los ejemplos y consultas útiles.

