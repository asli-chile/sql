# Documentación del Módulo de Itinerarios

## 📋 Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Funcionalidades Principales](#funcionalidades-principales)
3. [Estructura de Datos](#estructura-de-datos)
4. [Componentes](#componentes)
5. [Flujos de Trabajo](#flujos-de-trabajo)
6. [API Endpoints](#api-endpoints)
7. [Características Avanzadas](#características-avanzadas)
8. [Vista Pública](#vista-pública)

---

## Descripción General

El módulo de Itinerarios permite gestionar y visualizar los itinerarios marítimos de los servicios de transporte. Incluye la creación, edición, visualización y filtrado de viajes con sus respectivas escalas (PODs), fechas de salida (ETD) y llegada (ETA), y cálculo automático de días de tránsito.

### Características Clave

- ✅ Gestión completa de servicios marítimos
- ✅ Creación y edición de itinerarios con múltiples escalas
- ✅ Cálculo automático de días de tránsito
- ✅ Filtrado avanzado por múltiples criterios
- ✅ Vista pública de solo lectura
- ✅ Exportación a PDF
- ✅ Ordenamiento automático por ETD
- ✅ Ajuste dinámico de días de tránsito

---

## Funcionalidades Principales

### 1. Gestión de Servicios

**Ubicación:** `src/components/itinerarios/ServiciosManager.tsx`

Permite crear, editar y eliminar servicios marítimos. Cada servicio puede tener:
- Nombre del servicio
- Consorcio (navieras asociadas)
- Naves asignadas
- Destinos (puertos de destino)

**Características:**
- Asignación automática de navieras al seleccionar un servicio
- Reconstrucción automática de consorcios si faltan datos estructurados
- Gestión de catálogo de naves por naviera

### 2. Creación de Itinerarios

**Ubicación:** `src/components/itinerarios/ItinerariosManager.tsx`

Formulario completo para crear nuevos itinerarios con:
- Selección de servicio (existente o nuevo)
- Nave y número de viaje
- Semana de operación
- Puerto de origen (POL)
- Fecha de salida (ETD)
- Múltiples escalas (PODs) con:
  - Puerto de destino
  - Fecha de llegada (ETA)
  - Cálculo automático de días de tránsito
  - Ajuste manual de días de tránsito (+/-)

**Características especiales:**
- Cálculo automático de fechas ETA basado en días de tránsito estándar
- Ajuste dinámico de días de tránsito con recálculo automático de fechas
- Validación de fechas en zona horaria local (evita pérdida de días)
- Carga automática de destinos desde el servicio seleccionado

### 3. Visualización de Itinerarios

**Ubicación:** `src/components/itinerario/ItinerarioTable.tsx`

Tabla interactiva que muestra:
- Agrupación por servicio
- Ordenamiento por ETD (fecha de salida)
- Columnas dinámicas por POD (puerto de destino)
- Visualización de días de tránsito o fechas ETA (configurable)
- Modo de vista: Días / Fecha / Ambos

**Características:**
- Ordenamiento automático por ETD ascendente
- Agrupación visual por consorcio dentro del mismo servicio
- Columnas sticky para navegación horizontal
- Diseño responsive con estilo Windows Fluent

### 4. Edición de Itinerarios

**Ubicación:** `src/components/itinerario/VoyageDrawer.tsx`

Panel lateral (drawer) para editar viajes existentes:

**Campos editables:**
- ✅ **ETD (Fecha de salida)** - Campo de fecha editable
- ✅ **Número de viaje** - Campo de texto editable
- ✅ **POL (Puerto de origen)** - Selector desplegable
- ✅ **Escalas (PODs)** - Agregar, editar o eliminar escalas
  - Puerto de destino
  - ETA (Fecha de llegada)
  - Cálculo automático de días de tránsito

**Funcionalidades:**
- Recalculo automático de días de tránsito al cambiar ETD
- Validación de fechas en zona horaria local
- Guardado de cambios en base de datos

### 5. Filtrado Avanzado

**Ubicación:** `src/components/itinerario/ItinerarioFilters.tsx`

Sistema de filtros con aplicación automática:
- **Servicio:** Filtro por nombre de servicio
- **Naviera/Consorcio:** Filtro por naviera
- **Nave:** Filtro por nombre de nave
- **POL:** Filtro por puerto de origen
- **Región:** Filtro por región geográfica
- **Vista ETA:** Selector de modo de visualización (Días/Fecha/Ambos)

**Características:**
- Aplicación automática de filtros al seleccionar
- Botón de reset para limpiar todos los filtros
- Filtros dependientes (servicios filtrados por naviera)

---

## Estructura de Datos

### Tipo: `Itinerario`

```typescript
{
  id: string;
  servicio: string;
  consorcio: string | null;
  nave: string;
  viaje: string;
  semana: number | null;
  pol: string;
  etd: string | null; // ISO date string
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  escalas?: ItinerarioEscala[];
}
```

### Tipo: `ItinerarioEscala`

```typescript
{
  id: string;
  itinerario_id: string;
  puerto: string;
  puerto_nombre: string | null;
  eta: string | null; // ISO date string
  dias_transito: number | null;
  orden: number;
  area: string | null; // ASIA, EUROPA, AMERICA, INDIA-MEDIOORIENTE
  created_at: string;
  updated_at: string;
}
```

### Tipo: `ItinerarioFilters`

```typescript
{
  servicio?: string;
  consorcio?: string;
  nave?: string;
  semanas?: number; // 1-6
  pol?: string;
  region?: string;
}
```

---

## Componentes

### Componentes Principales

#### 1. `ItinerarioPage` (`app/itinerario/page.tsx`)
Página principal del módulo que integra todos los componentes.

**Funcionalidades:**
- Carga de datos desde API
- Gestión de estado global
- Integración con sidebar y navegación
- Modales para crear/editar
- Exportación a PDF

#### 2. `ItinerarioTable` (`src/components/itinerario/ItinerarioTable.tsx`)
Tabla principal de visualización.

**Props:**
```typescript
{
  itinerarios: ItinerarioWithEscalas[];
  onViewDetail: (itinerario: ItinerarioWithEscalas) => void;
  etaViewMode?: 'dias' | 'fecha' | 'ambos';
  hideActionColumn?: boolean;
}
```

**Características:**
- Agrupación por servicio
- Ordenamiento por ETD
- Columnas dinámicas por POD
- Sticky columns para navegación

#### 3. `ItinerarioFilters` (`src/components/itinerario/ItinerarioFilters.tsx`)
Componente de filtros.

**Props:**
```typescript
{
  servicios: string[];
  consorcios: string[];
  serviciosPorNaviera: Record<string, string[]>;
  pols: string[];
  regiones: string[];
  filters: ItinerarioFilters;
  onFiltersChange: (filters: ItinerarioFilters) => void;
  onReset: () => void;
  etaViewMode?: 'dias' | 'fecha' | 'ambos';
  onEtaViewModeChange?: (mode: 'dias' | 'fecha' | 'ambos') => void;
}
```

#### 4. `VoyageDrawer` (`src/components/itinerario/VoyageDrawer.tsx`)
Panel lateral para editar viajes.

**Props:**
```typescript
{
  isOpen: boolean;
  onClose: () => void;
  itinerario: ItinerarioWithEscalas | null;
  onSave: () => void;
  onDelete: () => void;
}
```

**Campos editables:**
- ETD (Fecha de salida)
- Número de viaje
- POL (Puerto de origen)
- Escalas (PODs) con ETA

#### 5. `ItinerariosManager` (`src/components/itinerarios/ItinerariosManager.tsx`)
Formulario para crear nuevos itinerarios.

**Características:**
- Selección de servicio
- Carga automática de destinos
- Cálculo automático de fechas
- Ajuste de días de tránsito

#### 6. `ServiciosManager` (`src/components/itinerarios/ServiciosManager.tsx`)
Gestión de servicios marítimos.

**Características:**
- CRUD completo de servicios
- Gestión de navieras y naves
- Asignación de destinos

---

## Flujos de Trabajo

### Flujo 1: Crear un Nuevo Itinerario

1. **Acceder al módulo:** Navegar a `/itinerario`
2. **Abrir formulario:** Clic en botón "Nuevo Itinerario"
3. **Seleccionar servicio:**
   - Elegir servicio existente o crear uno nuevo
   - Si es nuevo, completar nombre y consorcio
4. **Completar información del viaje:**
   - Seleccionar nave
   - Ingresar número de viaje
   - Seleccionar semana
   - Seleccionar POL
   - Ingresar ETD (fecha de salida)
5. **Agregar escalas:**
   - Las escalas se cargan automáticamente desde el servicio
   - Ajustar fechas ETA si es necesario
   - Ajustar días de tránsito con los controles +/- si se requiere
6. **Guardar:** Clic en "Guardar Itinerario"

### Flujo 2: Editar un Itinerario Existente

1. **Acceder a la tabla:** Ver lista de itinerarios
2. **Abrir detalle:** Clic en botón "Ver" en la columna de acciones
3. **Editar campos:**
   - Modificar ETD si es necesario
   - Modificar número de viaje si es necesario
   - Cambiar POL si es necesario
   - Agregar/editar/eliminar escalas
4. **Guardar cambios:** Clic en "Guardar cambios"
5. **Eliminar (opcional):** Clic en "Eliminar viaje" si se desea eliminar

### Flujo 3: Filtrar Itinerarios

1. **Usar filtros:** Los filtros se aplican automáticamente al seleccionar
2. **Seleccionar criterios:**
   - Servicio
   - Naviera/Consorcio
   - Nave
   - POL
   - Región
3. **Cambiar vista ETA:** Seleccionar modo en dropdown "Vista"
4. **Resetear:** Clic en "Reset" para limpiar filtros

### Flujo 4: Ajustar Días de Tránsito

1. **Abrir formulario de creación o edición**
2. **Navegar a la sección de escalas**
3. **Para cada escala con ETA:**
   - Ver días de tránsito calculados automáticamente
   - Usar botones +/- para ajustar días
   - O ingresar valor directamente en el campo numérico
4. **Resultado:** La fecha ETA se recalcula automáticamente

---

## API Endpoints

### 1. GET `/api/admin/itinerarios`

Obtiene todos los itinerarios con sus escalas (requiere autenticación).

**Respuesta:**
```json
{
  "success": true,
  "itinerarios": [
    {
      "id": "uuid",
      "servicio": "string",
      "consorcio": "string | null",
      "nave": "string",
      "viaje": "string",
      "semana": number | null,
      "pol": "string",
      "etd": "ISO date string | null",
      "escalas": [...]
    }
  ]
}
```

**Ordenamiento:**
- Primero por `servicio` (ascendente)
- Luego por `etd` (ascendente)

### 2. GET `/api/public/itinerarios`

Obtiene itinerarios para vista pública (sin autenticación requerida).

**Respuesta:** Misma estructura que endpoint admin.

### 3. POST `/api/admin/itinerarios`

Crea un nuevo itinerario (requiere autenticación).

**Body:**
```json
{
  "servicio": "string",
  "consorcio": "string | null",
  "nave": "string",
  "viaje": "string",
  "semana": number | null,
  "pol": "string",
  "etd": "ISO date string",
  "escalas": [
    {
      "puerto": "string",
      "puerto_nombre": "string | null",
      "eta": "ISO date string",
      "dias_transito": number,
      "orden": number
    }
  ]
}
```

### 4. PUT `/api/admin/itinerarios/[id]`

Actualiza un itinerario existente (requiere autenticación).

**Body:** Misma estructura que POST.

### 5. DELETE `/api/admin/itinerarios/[id]`

Elimina un itinerario (requiere autenticación).

---

## Características Avanzadas

### 1. Cálculo de Días de Tránsito

El sistema calcula automáticamente los días de tránsito entre ETD y ETA usando zona horaria local para evitar pérdidas de días.

**Función:** `calcularDiasTransito(etd: string, eta: string): number`

**Características:**
- Parseo de fechas en zona horaria local
- Soporte para múltiples formatos de fecha
- Redondeo correcto de días
- Manejo de fechas inválidas

### 2. Ajuste Dinámico de Días de Tránsito

Permite ajustar manualmente los días de tránsito con recálculo automático de la fecha ETA.

**Funcionamiento:**
- Se mantiene una `etaBase` (fecha original sin ajustes)
- Al cambiar `ajusteDias`, se recalcula ETA = `etaBase + ajusteDias`
- Los ajustes se aplican en tiempo real

**UI:**
- Botones +/- para incrementar/decrementar
- Campo numérico para entrada directa
- Indicador visual del ajuste aplicado

### 3. Ordenamiento por ETD

Los itinerarios se ordenan automáticamente por fecha de salida (ETD) de forma ascendente.

**Implementación:**
- Ordenamiento en la función `groupByService`
- Primero por ETD, luego por consorcio si tienen el mismo ETD
- Itinerarios sin ETD aparecen al final

### 4. Reconstrucción de Consorcios

Si un servicio no tiene datos estructurados de consorcio, el sistema intenta reconstruirlos desde el campo `consorcio` legado.

**Formato soportado:**
- `"Naviera Servicio / Naviera Servicio"` (ej: "MSC INCA / Hapag AX1")
- `"Naviera + Naviera"` (ej: "MSC + Hapag")

### 5. Validación de Fechas

Todas las fechas se manejan en zona horaria local para evitar problemas de conversión UTC.

**Características:**
- Parseo consistente de fechas
- Formato ISO para almacenamiento
- Visualización en formato local (DD-MM-YYYY)

---

## Vista Pública

### Página Pública de Itinerarios

**Ubicación:** `app/itinerario-public/page.tsx`
**URL:** `/itinerario-public`

Vista de solo lectura accesible sin autenticación desde el sitio web principal.

**Características:**
- Acceso público (sin login)
- Mismos filtros que la vista privada
- Misma funcionalidad de visualización
- Sin opciones de edición
- Toggle día/noche
- Logo ASLI que redirige a home

**Integración:**
- Botón "ITINERARIO" en el header del sitio web (`web/src/components/Header.jsx`)
- Rewrite en `web/next.config.js` para enrutar correctamente

---

## Consideraciones Técnicas

### Manejo de Fechas

⚠️ **Importante:** Todas las fechas se manejan en zona horaria local para evitar pérdidas de días al convertir entre UTC y local.

**Ejemplo de parseo:**
```typescript
// Correcto: Crear fecha en zona local
const [año, mes, dia] = fechaString.split('-');
const fechaLocal = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia), 12, 0, 0);

// Incorrecto: Usar new Date() directamente (puede interpretar como UTC)
const fechaUTC = new Date(fechaString); // ❌
```

### Base de Datos

**Tablas principales:**
- `itinerarios`: Información de viajes
- `itinerario_escalas`: Escalas (PODs) de cada viaje
- `catalogos_servicios`: Catálogo de servicios
- `catalogos_naves`: Catálogo de naves

**Relaciones:**
- `itinerarios.escalas` → `itinerario_escalas.itinerario_id` (1:N)

### Permisos

- **Vista privada (`/itinerario`):** Requiere autenticación
- **Vista pública (`/itinerario-public`):** Acceso libre
- **Edición:** Solo usuarios autenticados
- **Creación:** Solo usuarios autenticados

---

## Mejoras Recientes

### ✅ Edición de ETD y Número de Viaje
- Campos ETD y viaje ahora editables en el drawer de detalles
- Recalculo automático de días de tránsito al cambiar ETD

### ✅ Ordenamiento por ETD
- Tablas ordenadas automáticamente por fecha de salida
- Ordenamiento secundario por consorcio

### ✅ Ajuste de Días de Tránsito
- Controles +/- para ajustar días
- Recalculo automático de fechas ETA

### ✅ Filtrado Automático
- Los filtros se aplican automáticamente al seleccionar
- Sin necesidad de botón "Filtrar"

### ✅ Vista Pública
- Página pública de solo lectura
- Accesible desde el sitio web principal

---

## Soporte y Mantenimiento

Para reportar problemas o solicitar nuevas funcionalidades, contactar al equipo de desarrollo.

**Archivos clave para modificar:**
- `src/components/itinerario/ItinerarioTable.tsx` - Visualización
- `src/components/itinerario/VoyageDrawer.tsx` - Edición
- `src/components/itinerarios/ItinerariosManager.tsx` - Creación
- `app/api/admin/itinerarios/route.ts` - API backend

---

**Última actualización:** Diciembre 2024
