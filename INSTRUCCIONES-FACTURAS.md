# Módulo de Facturas - Instrucciones

## Resumen

Se ha creado un módulo completo de facturas integrado en el proyecto. Cada registro puede generar una factura única (1:1). Los datos que existen en `registros` se completan automáticamente, y los datos faltantes se ingresan manualmente.

## Características Implementadas

1. **Vista previa en tiempo real**: Al crear/editar una factura, se muestra una vista previa que se actualiza instantáneamente.
2. **Plantilla ALMAFRUIT**: Basada en la imagen proporcionada, con todos los campos necesarios.
3. **Generación de PDF y Excel**: Descarga directa de facturas en ambos formatos.
4. **Respeto de permisos RLS**: El módulo respeta los roles y permisos existentes.

## Estructura de Archivos Creados

```
app/facturas/
  ├── page.tsx              # Página principal de facturas
  └── loading.tsx           # Componente de loading

src/components/
  ├── FacturaCreator.tsx    # Modal para crear/editar facturas con vista previa
  ├── FacturaViewer.tsx     # Modal para ver facturas guardadas
  └── facturas/
      └── PlantillaAlma.tsx # Plantilla visual de ALMAFRUIT

src/lib/
  ├── factura-pdf.ts        # Generación de PDF
  └── factura-excel.ts      # Generación de Excel

src/types/
  └── factura.ts            # Tipos TypeScript para facturas

scripts/
  └── crear-tabla-facturas.sql  # Script SQL para crear la tabla
```

## Instalación

### 1. Crear la tabla en Supabase

Ejecuta el script SQL en el editor SQL de Supabase:

```sql
-- Ejecutar: scripts/crear-tabla-facturas.sql
```

Este script crea:
- La tabla `facturas` con todos los campos necesarios
- Índices para optimización
- Políticas RLS para seguridad
- Trigger para actualizar `updated_at`

### 2. Instalar dependencias

Las dependencias ya están instaladas:
- `jspdf`: Para generación de PDF
- `@types/jspdf`: Tipos TypeScript para jsPDF
- `exceljs`: Ya estaba instalado para los reportes

### 3. Configuración

No se requiere configuración adicional. El módulo usa las mismas credenciales de Supabase que el resto de la aplicación.

## Uso

### Crear una Factura

1. Ve a la página de **Registros** (`/registros`).
2. Haz clic en el botón **"Facturas"** (ícono de recibo) en el header.
3. En la página de facturas, verás:
   - Lista de facturas generadas
   - Lista de registros sin factura
4. Haz clic en **"Crear Factura"** junto a un registro sin factura.
5. Se abrirá el modal `FacturaCreator` con:
   - **Panel izquierdo (30%)**: Formulario para editar datos
   - **Panel derecho (70%)**: Vista previa en tiempo real de la factura
6. Completa los campos faltantes:
   - Información del exportador (RUT, giro, dirección)
   - Información del consignatario
   - Detalles de embarque
   - Productos (puedes agregar múltiples productos)
7. Los datos del registro se completan automáticamente:
   - REF ASLI
   - Cliente (exportador)
   - Nave y viaje
   - Fechas ETD/ETA
   - Puertos (POL/POD)
   - Especie (se usa como variedad del primer producto)
   - Contenedores
8. Haz clic en **"Guardar Factura"** para guardarla en la base de datos.
9. Puedes descargar **PDF** o **Excel** antes o después de guardar.

### Ver una Factura

1. En la página de facturas, haz clic en el ícono **👁️** (ojo) junto a una factura.
2. Se abrirá el modal `FacturaViewer` con la vista previa.
3. Puedes descargar **PDF** o **Excel** desde el modal.

### Acceso desde Registros

Se agregó un botón **"Facturas"** en el header de la página de registros que redirige a `/facturas`.

## Estructura de Datos

### Tabla `facturas`

- `id`: UUID (PK)
- `registro_id`: UUID (FK a `registros`)
- `ref_asli`: TEXT (referencia rápida)
- `exportador`: JSONB (nombre, RUT, giro, dirección)
- `consignatario`: JSONB (nombre, dirección, contacto, USCI, etc.)
- `embarque`: JSONB (fechas, nave, viaje, puertos, cláusula, etc.)
- `productos`: JSONB array (cantidad, variedad, categoría, precio, etc.)
- `totales`: JSONB (cantidadTotal, valorTotal, valorTotalTexto)
- `cliente_plantilla`: TEXT (por ahora solo 'ALMAFRUIT')
- `created_at`, `updated_at`, `created_by`, `updated_by`

### Ejemplo de JSONB

```json
{
  "exportador": {
    "nombre": "EXPORTADORA ALMA FRUIT SPA",
    "rut": "76.381.706-7",
    "giro": "EXPORTACION DE FRUTAS Y VERDURAS",
    "direccion": "ARTURO PEREZ CANTO 1011 CURICO"
  },
  "consignatario": {
    "nombre": "SHENZHEN JIANRONG JIAYE TRADE CO. LTD",
    "direccion": "402, KANGHE BUILDING...",
    "email": "wingkyip@woolee.com.hk",
    "telefono": "852-25470088",
    "contacto": "Ms. Winsom Lau",
    "usci": "91440300MA5F5WJU0A",
    "codigoPostal": "511400",
    "pais": "CHINA"
  },
  "embarque": {
    "fechaFactura": "2024-12-04",
    "numeroEmbarque": "2024M4",
    "fechaEmbarque": "2024-12-04",
    "motonave": "SKAGEN MAERSK",
    "numeroViaje": "447W",
    "clausulaVenta": "FOB",
    "paisOrigen": "CHILE",
    "puertoEmbarque": "SAN ANTONIO",
    "puertoDestino": "NANSHA",
    "paisDestinoFinal": "CHINA",
    "formaPago": "COB1",
    "contenedor": "MNBU407541-8"
  },
  "productos": [
    {
      "cantidad": 4800,
      "tipoEnvase": "CASES",
      "variedad": "RED CHERRIES",
      "categoria": "CAT 1",
      "etiqueta": "ALMAFRUIT",
      "calibre": "2J",
      "kgNetoUnidad": 2.50,
      "kgBrutoUnidad": 3.00,
      "precioPorCaja": 35.00,
      "total": 168000.00
    }
  ],
  "totales": {
    "cantidadTotal": 8000,
    "valorTotal": 260000.00,
    "valorTotalTexto": "TWO HUNDRED SIXTY THOUSAND US Dollar"
  }
}
```

## Seguridad (RLS)

Las políticas RLS implementadas aseguran que:

1. **SELECT**: Los usuarios solo pueden ver facturas de registros que pueden ver.
2. **INSERT**: Los usuarios solo pueden crear facturas para registros que pueden ver.
3. **UPDATE**: Los usuarios solo pueden actualizar facturas que crearon.

Las políticas heredan automáticamente los permisos de la tabla `registros`, por lo que:
- **Admins**: Pueden ver/crear/editar todas las facturas.
- **Ejecutivos**: Pueden ver/crear/editar facturas de sus clientes asignados.
- **Usuarios normales**: Pueden ver/crear/editar facturas de sus propios registros.

## Plantillas

Por ahora solo está implementada la plantilla **ALMAFRUIT**. Para agregar más plantillas:

1. Crea un nuevo componente en `src/components/facturas/Plantilla[Nombre].tsx`.
2. Actualiza `FacturaCreator.tsx` para seleccionar la plantilla según el cliente.
3. Opcionalmente, crea una tabla `plantillas_facturas` en Supabase para gestión dinámica.

## Próximos Pasos Sugeridos

1. **Agregar más plantillas**: Copiar la estructura de `PlantillaAlma.tsx` para otros clientes.
2. **Validaciones**: Agregar validaciones más estrictas en el formulario.
3. **Plantillas dinámicas**: Permitir a los usuarios crear/editar plantillas desde la UI.
4. **Historial de cambios**: Similar a `HistorialModal` para `registros`.
5. **Envío por email**: Integrar envío de facturas por email directamente desde la UI.

## Solución de Problemas

### Error: "No se puede crear factura"

- Verifica que el registro no tenga ya una factura asociada (1:1).
- Verifica que tengas permisos para ver el registro (RLS).

### Error: "PDF/Excel no se genera"

- Verifica la consola del navegador para errores.
- Asegúrate de que `jspdf` y `exceljs` estén instalados.

### Los datos no se completan automáticamente

- Verifica que el registro tenga los campos necesarios (nave, viaje, fechas, etc.).
- Los campos faltantes se deben completar manualmente en el formulario.

---

¡Listo! El módulo de facturas está completamente integrado y funcional. 🎉

