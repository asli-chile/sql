# Generador de Facturas - Versión Aislada

Este es el generador de facturas aislado del proyecto principal. Está diseñado para ser accesible de forma independiente mientras utiliza la misma base de datos.

## Características

- ✅ **Acceso directo**: Disponible en `/generador-facturas`
- ✅ **Misma base de datos**: Usa la misma conexión a Supabase que el proyecto principal
- ✅ **Funcionalidad completa**: Todas las características del generador original
- ✅ **Búsqueda y filtros**: Búsqueda por REF ASLI, Cliente, Especie o Booking
- ✅ **Filtro de registros sin factura**: Opción para mostrar solo registros que no tienen factura

## Acceso

### URL Local
```
http://localhost:3000/generador-facturas
```

### URL Producción
```
https://tu-dominio.com/generador-facturas
```

## Funcionalidades

### 1. Vista de Facturas Generadas
- Lista todas las facturas creadas
- Muestra REF ASLI, Cliente, Plantilla, Valor Total y Fecha
- Permite ver cada factura en detalle

### 2. Búsqueda y Filtros
- **Búsqueda**: Por REF ASLI, Cliente, Especie o Booking
- **Filtro**: Opción para mostrar solo registros sin factura

### 3. Creación de Facturas
- Selecciona un registro de la lista
- Crea una nueva factura o edita una existente
- Usa los mismos componentes y plantillas del proyecto principal

### 4. Gestión de Facturas
- Ver facturas existentes
- Descargar en PDF o Excel
- Editar facturas (si tienes permisos)

## Permisos

- **Admin y Ejecutivos** (@asli.cl): Pueden crear y editar facturas
- **Usuarios**: Solo pueden ver facturas que han creado

## Base de Datos

El generador utiliza las mismas tablas que el proyecto principal:
- `registros`: Registros de embarques
- `facturas`: Facturas generadas
- `usuarios`: Usuarios y permisos

## Componentes Utilizados

El generador reutiliza los componentes del proyecto principal:
- `FacturaCreator`: Modal para crear/editar facturas
- `FacturaViewer`: Modal para ver facturas
- `PlantillaAlma`: Plantilla ALMAFRUIT
- `PlantillaFruitAndes`: Plantilla Fruit Andes Sur

## Integración

Este generador está completamente integrado con el proyecto principal:
- Comparte la misma configuración de Supabase
- Usa los mismos tipos TypeScript
- Reutiliza los mismos componentes y utilidades
- Respeta las mismas políticas RLS (Row Level Security)

## Desarrollo

Para trabajar solo en el generador:

1. Accede directamente a `/generador-facturas`
2. Todas las modificaciones se reflejan en tiempo real
3. Los cambios afectan tanto al generador aislado como al módulo principal de facturas

## Notas

- El generador aislado y el módulo principal (`/facturas`) comparten la misma base de datos
- Los cambios realizados en uno se reflejan inmediatamente en el otro
- Ambos respetan los mismos permisos y políticas de seguridad
