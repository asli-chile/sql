## Manual de Usuario - ASLI Gestión Logística (Nivel Usuario Final)

Guía condensada para el usuario operativo (ejecutivos, asistentes, etc.). No requiere conocimientos técnicos.

---

### 1. Acceso y navegación básica

- **Entrar al sistema**
  - Abre la URL de la plataforma ASLI.
  - Ingresa tu correo y clave asignados.
  - Si tienes problemas de acceso, contacta a tu administrador interno.

- **Pantalla principal (Dashboard)**
  - Verás tarjetas con totales de registros, bookings y contenedores.
  - Tendrás accesos a las secciones activas en esta versión:
    - `Registros de embarques`
    - `Facturas`
    - `Seguimiento de buques activos`
    - `Documentos` y `Tablas personalizadas` (según permisos).

---

### 2. Registros de embarques

- **Objetivo**
  - Crear, buscar y actualizar los embarques que maneja la empresa.

- **Elementos principales**
  - **Barra superior**: botones `Nuevo`, `Buscar`, `Filtros`, `Exportar`, `Reset`, `Papelera`, `QR` y otros según tu perfil.
  - **Tarjetas de totales**: resumen de registros, bookings, contenedores y estados.
  - **Tabla principal**: todas las filas de embarques que puedes filtrar y editar.

- **Flujos básicos**
  - **Crear un registro**
    1. Haz clic en `Nuevo`.
    2. Completa los campos obligatorios (marcados con *).
    3. El `REF ASLI` se genera automáticamente; no es necesario inventarlo.
    4. Pulsa `Guardar registro`. Si falta algo, verás un mensaje en rojo.

  - **Buscar y filtrar**
    - Usa la caja `Buscar…` para escribir parte del booking, cliente, naviera, etc.
    - Usa `Filtros` para acotar por cliente, naviera, fechas, estado, etc.
    - Si los totales se ven raros, pulsa `Reset` para limpiar filtros.

  - **Editar un registro**
    - En la fila correspondiente, haz clic en el ícono de lápiz.
    - Modifica los campos necesarios y guarda.

  - **Papelera**
    - Permite ver registros eliminados y restaurarlos o borrarlos definitivamente.
    - Recomendación: primero enviar a Papelera, luego eliminar definitivo solo si estás seguro.

  - **Exportar a Google Sheets**
    - Selecciona filas usando las casillas de la tabla.
    - Pulsa `Exportar` para generar la planilla con formato corporativo.
    - Si está configurada la URL, `Ver Sheets` abre una vista previa integrada.

---

### 3. Seguimiento de buques activos

Para detalles técnicos, existe `docs/seguimiento-buques.md`. Aquí solo el uso cotidiano.

- **Objetivo**
  - Ver en un mapa los buques con embarques vigentes y revisar sus bookings.

- **Cómo usarlo**
  1. En el Dashboard, entra a **Mapa de buques activos**.
  2. Usa el buscador para encontrar un buque por nombre, destino, booking o contenedor.
  3. En el mapa:
     - Haz zoom y mueve el mapa con el mouse o los dedos (en móvil).
     - Pasa el cursor o toca un punto para ver los datos del buque (destino, ETD, ETA, bookings, contenedores).
  4. Haz clic sobre un buque para abrir el panel **Detalle del buque**:
     - Verás una tabla con bookings, contenedores, origen/destino y tiempos de tránsito.
     - Usa el scroll interno de la tabla para revisar todas las filas.
  5. Solo cuando sea necesario, pulsa **Actualizar posiciones** para refrescar las posiciones desde la API AIS
     (la plataforma limita la frecuencia para proteger los créditos de la API).

---

### 4. Facturas

- **Objetivo**
  - Consultar y gestionar facturas vinculadas a los embarques (según permisos).

- **Flujos típicos**
  - Buscar una factura por número, cliente o referencia.
  - Ver el detalle y estado de la factura.
  - Generar o editar datos de facturación a través de los formularios disponibles.

> Nota: los detalles exactos de flujo pueden variar según la configuración actual del proyecto. Si una opción no aparece, puede ser por permisos de usuario o porque la funcionalidad está deshabilitada en esta versión.

---

### 5. Documentos y tablas personalizadas

- **Documentos**
  - Sección para almacenar y consultar archivos relevantes (por ejemplo, instrucciones o plantillas).
  - Permite descargar los documentos que el administrador haya cargado.

- **Tablas personalizadas**
  - Tablas de apoyo (catálogos, equivalencias, etc.) que alimentan otros formularios.
  - El usuario final normalmente solo las consulta; los cambios suelen estar restringidos a administradores.

---

### 6. Buenas prácticas para usuarios finales

- Verifica siempre que los filtros estén como esperas antes de sacar conclusiones de los totales.
- Usa el campo de observaciones para dejar registro de cambios importantes.
- Evita borrar registros de forma definitiva sin confirmar con tu equipo.
- Si ves algo extraño en la interfaz (datos incompletos, botones que desaparecen, etc.):
  - Toma una captura de pantalla.
  - Anota qué estabas haciendo.
  - Envía la información al administrador o al canal de soporte interno.

---

Este manual resume lo necesario para operar el sistema desde el día a día, sin entrar en detalles técnicos. Para tareas avanzadas (creación de usuarios, configuración, seguridad, scripts y deploy) se debe consultar el **Manual de Administrador** y la documentación de **Mantenimiento**.


