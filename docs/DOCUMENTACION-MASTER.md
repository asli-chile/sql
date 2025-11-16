## DOCUMENTACIÓN MASTER - ASLI Gestión Logística

Este documento es el **punto de entrada definitivo** para entender la aplicación en su versión actual.  
Está diseñado para que cualquier persona (humano o modelo GPT) pueda tener una **visión completa** de:

- Qué hace la app (a nivel de negocio y a nivel técnico).
- Qué módulos existen y cómo se relacionan.
- Cómo está estructurado el código, la base de datos y la seguridad.
- Dónde encontrar el detalle fino de cada tema en los demás archivos de `docs/`.

> Para detalles muy específicos, este documento enlaza a otros archivos de documentación que ya existen en `docs/` y a scripts clave en `scripts/`.

---

### 1. Resumen funcional del sistema

La app es una plataforma de **gestión logística** para embarques marítimos/aéreos, centrada en:

- Registro y seguimiento de embarques (`registros`).
- Control de **bookings** y **contenedores**.
- Generación y consulta de **facturas**.
- **Seguimiento de buques activos** sobre un mapa mundial usando datos AIS cacheados.
- Gestión de documentos y tablas de apoyo.
- Exportación de datos a **Google Sheets** para reportes operativos.

Roles principales:

- **Usuario final / ejecutivo**: crea y gestiona registros, consulta facturas, usa el mapa de seguimiento.
- **Administrador funcional**: gestiona usuarios, permisos, configuraciones lógicas y revisa la calidad de datos.
- **Equipo técnico / TI**: mantiene el código, la base de datos, la seguridad y los despliegues.

Documentos de apoyo ya condensados:

- `MANUAL-USUARIO-FINAL.md` → lo que puede hacer un usuario operativo.
- `MANUAL-ADMIN.md` → responsabilidades y tareas de administradores.
- `MANTENIMIENTO-TECNICO.md` → visión de mantenimiento para desarrolladores/TI.
- `TUTORIALES-POR-SECCION.md` → pasos concretos por pantalla.
- `seguimiento-buques.md` → detalle del módulo de seguimiento de buques.

---

### 2. Arquitectura general

- **Frontend**: Next.js (app router), TypeScript, React, TailwindCSS.
- **Backend / API**: rutas `app/api/*` con acceso a Supabase y servicios externos (por ejemplo, API AIS y Google Sheets).
- **Base de datos**: Supabase (PostgreSQL) con Row Level Security (RLS).
- **Autenticación**: Supabase Auth.
- **Infraestructura**:
  - Deploy principal en **Vercel**.
  - Control de versiones en **GitHub**.

Estructura relevante del proyecto:

- `app/`
  - `layout.tsx` → layout global, fuente, theme, meta viewport.
  - `auth/page.tsx` → login.
  - `dashboard/page.tsx` → tablero principal.
  - `dashboard/seguimiento/page.tsx` → página de **Mapa de buques activos**.
  - `registros/page.tsx` → módulo de registros de embarques (pantalla principal).
  - `facturas/page.tsx` → módulo de facturas.
  - `documentos/page.tsx` → gestión de documentos.
  - `tablas-personalizadas/page.tsx` → tablas auxiliares.
  - Rutas API: `app/api/vessels/*`, `app/api/google-sheets/*`, etc.

- `src/components/`
  - Componentes de UI como `DataTable`, modales (`AddModal`, `EditModal`, `TrashModal`, etc.).
  - `ActiveVesselsMap.tsx` → mapa de buques, DeckGL + Maplibre.
  - `ShipmentsMap.tsx` → mapa para otros casos de uso.
  - `FacturaEditor`, `FacturaCreator`, `FacturaViewer` → flujo de facturas.
  - `AppFooter`, `UserSelector`, `ReportGenerator`, etc.

- `src/lib/`
  - Utilidades para Supabase (`supabase-browser`), fechas, formatos, etc.

- `src/types/`
  - Tipos compartidos: `factura.ts`, `registros.ts`, `vessels.ts` (incluye `ActiveVessel` y `VesselTrackPoint`). 

- `scripts/`
  - Scripts SQL y Node.js para migraciones y correcciones (especialmente `create-vessel-positions-table.sql`).

---

### 3. Módulos funcionales y flujos principales

#### 3.1. Autenticación y acceso

- Los usuarios se autentican mediante **Supabase Auth**.
- El layout y varias páginas (`/dashboard`, `/registros`, `/dashboard/seguimiento`) verifican al usuario con `createClient()` y redirigen a `/auth` si no hay sesión.
- Roles lógicos (en función de Supabase y/o reglas internas):
  - Usuarios normales / ejecutivos.
  - Administradores.

Docs relacionados:

- `MANUAL-ADMIN.md` (gestión de usuarios, revocación de claves).
- `INSTRUCCIONES-FIX-INSERT-USUARIOS.md`, `INSTRUCCIONES-FIX-USUARIOS-NORMALES.md`, `INSTRUCCIONES-EJECUTIVOS-CLIENTES.md`.

---

#### 3.2. Registros de embarques (`/registros`)

Funcionalidades clave:

- Ver **tabla principal de embarques** con filtros avanzados, ordenamiento y selección múltiple.
- Crear, editar y eliminar registros (con paso por Papelera).
- Generar **REF ASLI** único por registro.
- Exportar registros seleccionados a **Google Sheets** con formato corporativo.
- Ver y gestionar **historial / papelera** de registros borrados.
- Generar y descargar **códigos QR** desde el header.

Componentes y archivos relevantes:

- `app/registros/page.tsx` → orquesta el módulo (filtros, tabla, modales, acciones).
- `src/components/DataTable.tsx` → tabla avanzada con scroll interno, sticky headers y soporte para filtros/orden.
- Modales: `AddModal`, `EditModal`, `TrashModal`, `HistorialModal`, `ReportGenerator`, `ColumnToggle`, etc.
- `src/hooks/useRealtimeRegistros.tsx` → actualizaciones en tiempo (casi) real para la tabla de registros.

Docs relacionados:

- `MANUAL-USUARIO-FINAL.md` → descripción funcional.
- `TUTORIALES-POR-SECCION.md` → pasos para crear, filtrar, exportar, usar Papelera.

---

#### 3.3. Facturas (`/facturas`)

Funcionalidades:

- Listado y búsqueda de facturas.
- Creación / edición de facturas asociadas a embarques.
- Visualización detallada de una factura (montos, estado, referencias).

Componentes:

- `app/facturas/page.tsx`.
- `src/components/FacturaCreator.tsx`, `FacturaEditor.tsx`, `FacturaViewer.tsx`.

Docs relacionados:

- `INSTRUCCIONES-FACTURAS.md`.
- `MANUAL-USUARIO-FINAL.md` (sección Facturas).
- `TUTORIALES-POR-SECCION.md` (buscar/ver/editar facturas).

---

#### 3.4. Seguimiento de buques activos (`/dashboard/seguimiento`)

Funcionalidades principales:

- Ver lista de **buques activos** (con bookings y contenedores asociados).
- Filtro por nombre de buque, destino, booking y contenedor.
- Mapa mundial con:
  - Posición actual cacheada de cada buque.
  - Tooltip con info (destino, ETD, ETA, última posición, bookings y contenedores).
  - Selección de buque para centrar mapa y mostrar **trayectoria**.
- Panel de **detalle del buque**:
  - Tabla con scroll interno con los embarques (bookings) asociados.
  - Cálculo de `TT estimado (ETA - ETD)` y `TT real (días desde ETD)`.
- Botón **“Actualizar posiciones”**:
  - Llama a `/api/vessels/update-positions`.
  - Actualiza tablas de posiciones en Supabase, respetando el límite de frecuencia por buque (máx. 1 vez cada 3 días).

Archivos clave:

- Página: `app/dashboard/seguimiento/page.tsx`.
  - Carga buques desde `/api/vessels/active`.
  - Maneja el estado del usuario, filtro, buque seleccionado y detalle.
  - Usa `createClient()` para consultar `registros` al cargar el detalle de un buque.

- Mapa: `src/components/ActiveVesselsMap.tsx`.
  - `DeckGL` + `react-map-gl/maplibre` (basemap oscuro).
  - `ScatterplotLayer` para puntos de buques.
  - `PathLayer` para trayectorias (`track`).
  - Fix para bug de `maxTextureDimension2D` en DeckGL.
  - Altura responsiva (`h-[60vh]` con `min-h` en móvil, `600px` en desktop).

- Tipos: `src/types/vessels.ts`.
  - `ActiveVessel` (nombre, última posición, ETA/ETD, destino, bookings, containers, track).
  - `VesselPosition`, `VesselTrackPoint`.

- Scripts Supabase: `scripts/create-vessel-positions-table.sql`.
  - Crea `vessel_positions` (última posición) y `vessel_position_history` (historial de ruta).
  - Añade índices y políticas RLS para rol `authenticated`.

Docs relacionados:

- `seguimiento-buques.md` → explicación detallada (negocio + técnica).
- `TUTORIALES-POR-SECCION.md` → pasos para usar el mapa y ver detalles.

---

#### 3.5. Documentos y tablas personalizadas

**Documentos**

- Sección para listar y descargar documentos relevantes (manuales, plantillas, etc.).
- El contenido concreto depende de lo que haya cargado el administrador.

**Tablas personalizadas**

- Tablas auxiliares de configuración:
  - Catálogos, equivalencias, parámetros.
- Generalmente solo administradores pueden modificar estos datos; los usuarios los usan indirectamente desde otras pantallas (selects, combos, etc.).

Docs relacionados:

- `MANUAL-USUARIO-FINAL.md` (sección Documentos y Tablas personalizadas).
- `MANUAL-ADMIN.md` (configuración de catálogos).

---

### 4. Integraciones externas

#### 4.1. Google Sheets

Uso principal:

- Exportar registros seleccionados a una plantilla de Google Sheets con formato corporativo.
- Visualizar una **preview embebida** de la hoja y abrirla en pestaña aparte.

Archivos relevantes:

- `app/api/google-sheets/route.ts` → endpoint para exportar/gestionar la integración (según implementación actual).
- `src/components/ReportGenerator.tsx` y lógica de exportación en `DataTable` / `registros/page.tsx`.

Variables de entorno importantes:

- URLs y IDs de la hoja:
  - `NEXT_PUBLIC_GOOGLE_SHEETS_PREVIEW_URL`
  - `NEXT_PUBLIC_GOOGLE_SHEETS_SPREADSHEET_ID`

Docs relacionados:

- `COMO-USAR-VARIABLES-ENTORNO.md`
- `INSTRUCCIONES-FACTURAS.md` (si usa integración similar).
- `manual-usuario.md` (sección de exportación a Sheets).  

---

#### 4.2. API AIS (seguimiento de buques)

Uso principal:

- Consultar posiciones de buques (coordenadas, ETA/ETD, etc.).
- Guardar en Supabase:
  - Última posición (`vessel_positions`).
  - Historial para trayectos (`vessel_position_history`).

Lógica general:

- Endpoint `/api/vessels/update-positions`:
  - Para cada buque activo:
    - Verifica si han pasado al menos X días desde la última llamada (`last_api_call_at`).
    - Si corresponde, llama a la API AIS externa.
    - Actualiza las tablas mencionadas.

- Endpoint `/api/vessels/active`:
  - Devuelve un arreglo de `ActiveVessel` con:
    - `vessel_name`, última posición, ETA/ETD, destino.
    - Listas de `bookings` y `containers` asociadas.
    - Trayecto `track` cuando está disponible.

Docs relacionados:

- `seguimiento-buques.md`.
- `MANTENIMIENTO-TECNICO.md` (sección de posiciones de buques).

---

### 5. Seguridad, RLS y roles

Puntos clave:

- Todas las tablas importantes tienen **Row Level Security** activado.
- Políticas en Supabase controlan:
  - Lectura/escritura por parte de usuarios autenticados (`auth.role() = 'authenticated'`).
  - Reglas adicionales según tabla (por ejemplo, que cada usuario vea solo sus registros, si aplica).

Archivos y docs relevantes:

- `supabase-schema.sql` → definición base del esquema.
- `scripts/create-vessel-positions-table.sql` → tablas de seguimiento.
- `INSTRUCCIONES-RLS-ACTUALIZADAS.md`.
- `ESTADO-SEGURIDAD-ACTUAL.md`, `SEGURIDAD-ANALISIS.md`.
- `MANUAL-ADMIN.md` y `MANTENIMIENTO-TECNICO.md` (secciones de seguridad).

Buenas prácticas aplicadas:

- Variables de entorno fuera del repositorio (`.env.local`, configuración en Vercel).
- Claves sensibles documentadas solo a alto nivel (`LIMPIAR-CLAVES.md`, `LIMPEZA-PROYECTO.md`).

---

### 6. Mantenimiento y operaciones

Resumen rápido (ver detalles en `MANTENIMIENTO-TECNICO.md` y `MANUAL-ADMIN.md`):

- **Entorno local**:
  - Usar `COMO-VER-LOCAL.md` y `CREAR-ENV-LOCAL.md` para configurar.
  - Ejecutar con `npm run dev` o script `INICIAR-LOCAL.bat`.

- **Deploy en Vercel**:
  - Seguir `INSTRUCCIONES-DEPLOY-VERCEL.md` y `DEPLOY-V2-VERCEL.md`.
  - Comprobar variables de entorno y logs (`FIX-VERCEL-ERROR.md`, `SOLUCION-ERROR-VARIABLES-VERCEL.md`).

- **Scripts de mantenimiento** (carpeta `scripts/`):
  - Correcciones de fechas nulas o incorrectas en `registros`.
  - Limpieza de duplicados y normalización de datos.
  - Creación/ajuste de tablas para nuevas features (como seguimiento de buques).

---

### 7. Cómo usar esta DOCUMENTACIÓN MASTER con GPT

Para que un modelo GPT entienda el proyecto **lo mejor posible**, se recomienda:

- Cargar este archivo `docs/DOCUMENTACION-MASTER.md` como **primer contexto**.
- Cuando necesite detalle:
  - Cargar también:
    - `MANUAL-USUARIO-FINAL.md`
    - `MANUAL-ADMIN.md`
    - `MANTENIMIENTO-TECNICO.md`
    - `TUTORIALES-POR-SECCION.md`
    - `seguimiento-buques.md`
  - Y los archivos de código indicados en cada sección (páginas `app/*`, componentes `src/components/*`, tipos `src/types/*`, scripts `scripts/*`).

Con este documento y los enlaces asociados, cualquier GPT tendrá un **mapa completo y actualizado** de la aplicación: qué hace, cómo lo hace, cómo se despliega y cómo se mantiene.


