# 🚢 Sistema de Servicios para Itinerarios

## 📋 Descripción

Este sistema permite gestionar servicios marítimos y asignar naves a cada servicio. Al crear un itinerario, puedes seleccionar un servicio y automáticamente se mostrarán solo las naves relacionadas a ese servicio.

## 🏗️ Estructura de la Base de Datos

### Tablas Principales

1. **`servicios`** - Catálogo de servicios marítimos
   - `id` (UUID) - Identificador único
   - `nombre` (TEXT) - Nombre del servicio (ej: "AX2/AN2", "ANDES EXPRESS")
   - `consorcio` (TEXT) - Navieras que operan el servicio
   - `activo` (BOOLEAN) - Si el servicio está activo
   - `descripcion` (TEXT) - Descripción adicional
   - `created_at`, `updated_at` - Timestamps

2. **`servicios_naves`** - Relación muchos a muchos entre servicios y naves
   - `id` (UUID) - Identificador único
   - `servicio_id` (UUID) - Referencia al servicio
   - `nave_nombre` (TEXT) - Nombre de la nave
   - `activo` (BOOLEAN) - Si la nave está activa en este servicio
   - `orden` (INTEGER) - Orden de prioridad/visualización
   - `created_at`, `updated_at` - Timestamps

3. **`itinerarios`** - Modificada para incluir `servicio_id`
   - `servicio_id` (UUID) - Referencia al servicio (nuevo campo)
   - El campo `servicio` (TEXT) se mantiene por compatibilidad

## 🚀 Instalación

### Paso 1: Crear las tablas de servicios

Ejecuta en el SQL Editor de Supabase:

```sql
-- Ejecutar: scripts/create-servicios-table.sql
```

Este script crea:
- Tabla `servicios`
- Tabla `servicios_naves`
- Índices y triggers necesarios
- Políticas RLS (Row Level Security)

### Paso 2: Migrar itinerarios existentes

Si ya tienes datos en la tabla `itinerarios`, ejecuta:

```sql
-- Ejecutar: scripts/migrate-itinerarios-to-servicios.sql
```

Este script:
- Agrega la columna `servicio_id` a `itinerarios`
- Migra automáticamente los servicios existentes
- Crea los servicios basados en los valores únicos del campo `servicio`

### Paso 3: Instalar funciones auxiliares (opcional)

```sql
-- Ejecutar: scripts/servicios-helper-functions.sql
```

Este script crea funciones útiles y una vista para facilitar las consultas.

### Paso 4: Insertar datos de ejemplo (opcional)

```sql
-- Ejecutar: scripts/insert-servicios-ejemplo.sql
```

## 📖 Uso

### Crear un Servicio

```sql
INSERT INTO public.servicios (nombre, consorcio, activo, descripcion)
VALUES ('AX2/AN2', 'MSC + Hapag + ONE', true, 'Servicio Asia-Europa');
```

### Asignar Naves a un Servicio

```sql
-- Obtener el ID del servicio
SELECT id FROM public.servicios WHERE nombre = 'AX2/AN2';

-- Asignar naves (reemplaza 'SERVICIO_ID' con el ID obtenido)
INSERT INTO public.servicios_naves (servicio_id, nave_nombre, activo, orden)
VALUES 
  ('SERVICIO_ID', 'MSC OSCAR', true, 1),
  ('SERVICIO_ID', 'MSC LORETO', true, 2),
  ('SERVICIO_ID', 'MSC MARIA ELENA', true, 3);
```

### Obtener Naves de un Servicio

```sql
-- Opción 1: Usando la función helper
SELECT * FROM get_naves_by_servicio('SERVICIO_ID');

-- Opción 2: Consulta directa
SELECT sn.nave_nombre, sn.orden
FROM public.servicios_naves sn
WHERE sn.servicio_id = 'SERVICIO_ID'
  AND sn.activo = true
ORDER BY sn.orden ASC, sn.nave_nombre ASC;

-- Opción 3: Usando la vista
SELECT * FROM servicios_con_naves
WHERE servicio_id = 'SERVICIO_ID';
```

### Crear un Itinerario con Servicio

```sql
-- Obtener el servicio_id
SELECT id FROM public.servicios WHERE nombre = 'AX2/AN2';

-- Crear el itinerario (reemplaza 'SERVICIO_ID' con el ID obtenido)
INSERT INTO public.itinerarios (
  servicio_id,
  nave,
  viaje,
  semana,
  pol,
  etd
)
VALUES (
  'SERVICIO_ID',
  'MSC OSCAR',  -- Esta nave debe estar asignada al servicio
  'FA532R',
  15,
  'VALPARAISO',
  '2024-04-15 10:00:00+00'
);
```

### Obtener Itinerarios con Información del Servicio

```sql
SELECT 
  i.id,
  s.nombre as servicio_nombre,
  s.consorcio,
  i.nave,
  i.viaje,
  i.pol,
  i.etd
FROM public.itinerarios i
LEFT JOIN public.servicios s ON i.servicio_id = s.id
ORDER BY i.etd DESC;
```

## 🔍 Funciones Auxiliares

### `get_naves_by_servicio(servicio_uuid UUID)`

Obtiene todas las naves activas de un servicio ordenadas.

```sql
SELECT * FROM get_naves_by_servicio('SERVICIO_ID');
```

### `get_servicio_by_nombre(servicio_nombre TEXT)`

Obtiene un servicio por su nombre.

```sql
SELECT * FROM get_servicio_by_nombre('AX2/AN2');
```

### `nave_belongs_to_servicio(nave_nombre_param TEXT, servicio_uuid UUID)`

Verifica si una nave pertenece a un servicio activo.

```sql
SELECT nave_belongs_to_servicio('MSC OSCAR', 'SERVICIO_ID');
-- Retorna: true o false
```

## 🎯 Flujo de Trabajo Recomendado

1. **Crear el Servicio**
   - Define el nombre, consorcio y descripción

2. **Asignar Naves al Servicio**
   - Agrega todas las naves que operan en ese servicio
   - Define el orden de prioridad si es necesario

3. **Crear Itinerarios**
   - Selecciona el servicio
   - El sistema mostrará solo las naves asignadas a ese servicio
   - Completa el resto de la información del itinerario

## 🔄 Migración desde el Sistema Anterior

Si ya tienes itinerarios con el campo `servicio` como texto:

1. Ejecuta `migrate-itinerarios-to-servicios.sql`
2. El script automáticamente:
   - Crea servicios basados en los valores únicos existentes
   - Actualiza los itinerarios para usar `servicio_id`
3. El campo `servicio` (texto) se mantiene por compatibilidad
4. Puedes eliminarlo después de verificar que todo funciona

## 📝 Notas Importantes

- El nombre de la nave en `servicios_naves.nave_nombre` debe coincidir exactamente con:
  - `vessel_positions.vessel_name` (si usas esa tabla)
  - `itinerarios.nave` (cuando creas itinerarios)
- Una nave puede pertenecer a múltiples servicios
- Un servicio puede tener múltiples naves
- Los servicios y naves pueden activarse/desactivarse sin eliminarlos

## 🐛 Solución de Problemas

### Error: "La tabla servicios no existe"
- Ejecuta `create-servicios-table.sql` primero

### Error: "Foreign key violation"
- Asegúrate de que el `servicio_id` existe en la tabla `servicios`
- Verifica que la nave existe antes de asignarla

### Las naves no aparecen al seleccionar un servicio
- Verifica que las naves estén activas (`activo = true`)
- Verifica que el servicio esté activo
- Revisa que el nombre de la nave coincida exactamente

## 📚 Archivos Relacionados

- `scripts/create-servicios-table.sql` - Creación de tablas
- `scripts/migrate-itinerarios-to-servicios.sql` - Migración de datos
- `scripts/servicios-helper-functions.sql` - Funciones auxiliares
- `scripts/insert-servicios-ejemplo.sql` - Datos de ejemplo
