## Tutoriales por sección - ASLI Gestión Logística

Guía rápida con pasos concretos para las secciones activas en esta versión.

---

### 1. Registros de embarques

#### 1.1. Crear un nuevo embarque

1. Ir a `Registros` desde el Dashboard.
2. Pulsar el botón **Nuevo** en la barra superior.
3. Completar los campos obligatorios (marcados con *):
   - Cliente, naviera, booking, contenedor, fechas, etc.
4. Revisar que el `REF ASLI` se haya generado automáticamente.
5. Pulsar **Guardar registro**.
6. Verificar que el nuevo registro aparece en la tabla.

#### 1.2. Buscar un embarque existente

1. En la parte superior, localizar la caja **Buscar…**.
2. Escribir parte del booking, cliente, naviera o contenedor.
3. La tabla se filtrará automáticamente.
4. Si quieres quitar el filtro, pulsa **Reset**.

#### 1.3. Aplicar filtros avanzados

1. Pulsar el botón **Filtros**.
2. Seleccionar criterios (cliente, naviera, estado, fechas, etc.).
3. Pulsar **Aplicar filtros**.
4. Revisar que las tarjetas de totales se actualizan según los filtros activos.
5. Para volver al estado inicial, pulsar **Reset**.

#### 1.4. Exportar a Google Sheets

1. En la tabla, marcar las casillas de los registros que quieres exportar.
2. Pulsar **Exportar**.
3. Esperar a que se genere la hoja (según configuración).
4. Si está disponible, usar el botón **Ver Sheets** para abrir la vista previa integrada.
5. Desde ahí puedes abrir la hoja en una nueva pestaña para editarla.

#### 1.5. Usar la Papelera

1. Desde la barra superior, pulsar el botón **Papelera**.
2. Ver los registros eliminados recientemente.
3. Para restaurar:
   - Selecciona el registro y pulsa **Restaurar**.
4. Para eliminar definitivamente:
   - Selecciona el registro y pulsa **Eliminar permanente** (usar con cuidado).

---

### 2. Seguimiento de buques activos

#### 2.1. Ver buques en el mapa

1. Desde el Dashboard, entrar a **Mapa de buques activos**.
2. Esperar a que cargue la lista de buques y el mapa.
3. Usa el mouse o gestos táctiles para hacer zoom y mover el mapa.
4. Pasa el cursor sobre un punto (o tócala en móvil) para ver:
   - Nombre del buque.
   - Destino, ETD, ETA.
   - Fecha y hora de la última posición.
   - Cantidad de bookings y contenedores asociados.

#### 2.2. Encontrar un buque específico

1. En el panel **Lista de buques**, usar el buscador.
2. Escribir parte del nombre del buque, destino, booking o contenedor.
3. El listado y el mapa se limitarán a los buques coincidentes.

#### 2.3. Ver detalle de bookings de un buque

1. En el mapa, hacer clic en el punto del buque que te interesa.
2. Se abrirá el panel **Detalle del buque** bajo el mapa.
3. Revisar la tabla con:
   - Booking, contenedor, origen, destino, ETD, ETA, TT estimado y TT real.
4. Usar el scroll interno de la tabla para ver todas las filas.

#### 2.4. Actualizar posiciones AIS

1. En el header de la página, pulsar **Actualizar posiciones**.
2. La plataforma consultará la API AIS y actualizará Supabase (si no se ha superado el límite de frecuencia).
3. Una vez terminado, los datos del mapa se refrescarán automáticamente.
4. Recomendación: usar esta opción solo cuando sea realmente necesario.

---

### 3. Facturas

#### 3.1. Buscar una factura

1. Entrar a la sección **Facturas** desde el Dashboard.
2. Usar el buscador para filtrar por número de factura, cliente o referencia.
3. La tabla mostrará solo las coincidencias.

#### 3.2. Ver el detalle de una factura

1. Hacer clic en la fila de la factura que quieres revisar.
2. Se abrirá el panel o modal con sus datos completos.
3. Verificar montos, estado y referencias a embarques relacionados.

#### 3.3. Editar una factura (si tienes permisos)

1. Hacer clic en el ícono de edición en la fila de la factura.
2. Modificar los campos permitidos.
3. Guardar cambios y confirmar que se actualizan en la tabla.

---

### 4. Documentos y tablas personalizadas

#### 4.1. Descargar un documento

1. Ir a la sección **Documentos**.
2. Localizar el archivo necesario (por nombre o descripción).
3. Pulsar el botón de descarga.

#### 4.2. Consultar tablas de apoyo

1. Entrar a **Tablas personalizadas**.
2. Buscar la tabla correspondiente (por ejemplo, catálogos, equivalencias, etc.).
3. Navegar por las filas para revisar la información.
4. Si necesitas cambios, coordinar con un administrador (normalmente el usuario final no edita estas tablas).

---

### 5. Dónde encontrar más información

- **Manual general de usuario final** → `MANUAL-USUARIO-FINAL.md`.
- **Detalles del módulo de seguimiento** → `seguimiento-buques.md`.
- **Manual de administrador** → `MANUAL-ADMIN.md`.
- **Mantenimiento técnico** → `MANTENIMIENTO-TECNICO.md`.

Estos tutoriales están pensados para tareas del día a día. Para operaciones excepcionales o cambios estructurales, consultar con el administrador del sistema o con el equipo de TI.


