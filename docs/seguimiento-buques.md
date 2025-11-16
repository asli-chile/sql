## Página de Seguimiento de Buques Activos

Documentación exclusiva de la pantalla **“Mapa de buques activos”** (módulo de seguimiento AIS).

---

### 1. Objetivo de la pantalla

- **Ver en un mapa mundial** los buques que actualmente tienen embarques en curso.
- **Consultar el detalle de bookings y contenedores** asociados a cada buque.
- **Revisar la ruta recorrida** (trayectoria) de un buque en base a posiciones AIS históricas.
- Hacer todo esto sin saturar la API AIS externa, gracias a un sistema de **cache en Supabase**.

---

### 2. Cómo llegar a la pantalla

1. Iniciar sesión en la plataforma.
2. Desde el `Dashboard` principal, seleccionar la opción **“Mapa de buques activos”** dentro del menú o tarjeta de seguimiento.
3. Se abre la página `/dashboard/seguimiento` con el mapa y la lista de buques.

---

### 3. Partes de la interfaz

- **Header superior**
  - Botón **←**: vuelve al `Dashboard` sin perder la sesión.
  - Título: **Mapa de buques activos**.
  - Subtítulo: explica que las posiciones son **cacheadas** (no son en tiempo real exacto, pero se actualizan periódicamente).
  - Botón **“Actualizar posiciones”**:
    - Llama a la ruta `/api/vessels/update-positions`.
    - Esa ruta consulta la API AIS externa y actualiza las tablas de Supabase (`vessel_positions` y `vessel_position_history`).
    - Hay una restricción lógica: **máximo 1 llamada cada 24 horas por buque**, para cuidar créditos de la API.

- **Panel “Lista de buques”**
  - Muestra el número total de **buques activos** detectados.
  - Incluye un **buscador** que permite filtrar por:
    - Nombre del buque (`vessel_name`).
    - Destino (`destination`).
    - Cualquier booking asociado.
    - Cualquier contenedor asociado.
  - El filtro actúa sobre el conjunto de datos ya cargado desde `/api/vessels/active`, sin volver a llamar al backend.

- **Panel de “Visualización / Mapa mundial”**
  - Título: **Mapa mundial de posiciones AIS cacheadas**.
  - Nota lateral que recuerda:
    - El límite de llamadas a la API AIS.
    - Que siempre se usa la **última posición guardada en Supabase**.
  - Contiene el componente `ActiveVesselsMap`, que:
    - Usa **DeckGL + Maplibre** para dibujar el mapa oscuro.
    - Muestra los buques como puntos azules (`ScatterplotLayer`).
    - Permite hacer **zoom, mover el mapa y hacer clic** sobre los puntos.

- **Panel “Detalle del buque”**
  - Solo aparece cuando hay un buque seleccionado.
  - Muestra el nombre del buque y el estado de carga de datos.
  - Incluye una tabla con **scroll interno** (no deforma la pantalla) con columnas:
    - `Booking`, `Contenedor`, `Origen (POL)`, `Destino (POD)`, `ETD`, `ETA`, `TT estimado (días)`, `TT real (días)`.
  - Si no se encuentran registros asociados, muestra el mensaje:
    - “No se encontraron embarques asociados a este buque.”

---

### 4. De dónde vienen los datos

#### 4.1. Datos de posiciones de buques (API AIS + Supabase)

- Las posiciones se cachean en Supabase en dos tablas creadas por el script `scripts/create-vessel-positions-table.sql`:
  - **`vessel_positions`**:
    - Guarda la **última posición conocida** de cada buque.
    - Campos principales:
      - `vessel_name`: nombre del buque (clave lógica dentro del sistema ASLI).
      - `last_lat`, `last_lon`: última latitud y longitud conocidas.
      - `last_position_at`: fecha/hora de la última posición.
      - `last_api_call_at`: fecha/hora de la última consulta pagada a la API AIS.
      - `raw_payload`: JSON con los datos crudos de la API (para auditoría o debugging).
  - **`vessel_position_history`**:
    - Guarda **todas las posiciones históricas** usadas para dibujar la trayectoria.
    - Campos principales:
      - `vessel_name`, `lat`, `lon`, `position_at`.
    - Sirve para reconstruir la ruta sin recargar la API cada vez.

- El backend expone al frontend un endpoint `/api/vessels/active` que devuelve un arreglo de objetos `ActiveVessel`:

```1:12:src/types/vessels.ts
export type ActiveVessel = {
  vessel_name: string;
  last_lat: number | null;
  last_lon: number | null;
  last_position_at: string | null;
  etd?: string | null;
  eta: string | null;
  destination?: string | null;
  bookings: string[];
  containers: string[];
  track?: VesselTrackPoint[];
};
```

- Cada `ActiveVessel` puede traer además un arreglo `track` con puntos de la ruta:

```26:30:src/types/vessels.ts
export type VesselTrackPoint = {
  lat: number;
  lon: number;
  position_at: string;
};
```

#### 4.2. Datos de bookings y contenedores (tabla `registros`)

- Cuando el usuario selecciona un buque, la página `app/dashboard/seguimiento/page.tsx`:
  - Llama a Supabase a la tabla **`registros`**.
  - Filtra por los `bookings` asociados al buque (`.in('booking', vessel.bookings)`).
  - Solo considera registros que **no están borrados** (`.is('deleted_at', null)`).
  - Calcula dos métricas de tiempo de tránsito:
    - `TT estimado (días)`: diferencia entre `ETA` y `ETD`.
    - `TT real (días)`: días transcurridos desde `ETD` hasta hoy.

- Esos datos se muestran en la tabla del panel “Detalle del buque”.

---

### 5. Cómo se dibuja la trayectoria del barco

La trayectoria se dibuja en el componente `ActiveVesselsMap` usando **DeckGL**.

1. El frontend recibe `track` dentro de cada `ActiveVessel` (si existe).
2. En `ActiveVesselsMap` se construye una colección de features con la ruta:

```79:93:src/components/ActiveVesselsMap.tsx
  const trackFeatures = useMemo(() => {
    if (!activeVessel || !activeVessel.track || activeVessel.track.length <= 1) {
      // Sin selección o con menos de 2 puntos, no mostramos línea
      return [] as { vessel_name: string; path: [number, number][] }[];
    }

    return [
      {
        vessel_name: activeVessel.vessel_name,
        path: activeVessel.track.map(
          (point) => [point.lon, point.lat] as [number, number],
        ),
      },
    ];
  }, [activeVessel]);
```

3. Luego se renderiza un `PathLayer` con esa ruta:

```149:162:src/components/ActiveVesselsMap.tsx
  const trackLayer = new PathLayer<{
    vessel_name: string;
    path: [number, number][];
  }>({
    id: 'vessel-tracks',
    data: trackFeatures,
    getPath: (feature) => feature.path,
    getWidth: () => 3,
    widthUnits: 'pixels',
    getColor: () => [148, 163, 184, 200], // gris azulado
    rounded: true,
    capRounded: true,
    jointRounded: true,
  });
```

4. La vista inicial del mapa se centra en la zona de Valparaíso, Chile, pero cuando el usuario selecciona un buque:
   - Se centra la cámara en la última posición del buque.
   - Se mantiene un nivel de zoom mínimo razonable para no exagerar el acercamiento.

---

### 6. Cómo usar la pantalla en el día a día

1. **Revisar el listado de buques activos**
   - Ver el número total de buques detectados.
   - Usar la caja de búsqueda para filtrar por nombre, destino, booking o contenedor.

2. **Explorar el mapa**
   - Hacer zoom y mover el mapa con el mouse o gestos táctiles.
   - Pasar el cursor por encima de los puntos (o tocarlos en móvil) para ver:
     - Nombre del buque.
     - Destino.
     - ETD y ETA.
     - Fecha de la última posición.
     - Cantidad de bookings y contenedores (con listado resumido).

3. **Ver el detalle de un buque**
   - Hacer clic sobre un punto en el mapa.
   - Se abre el panel “Detalle del buque” con la tabla de bookings/contenedores.
   - Usar el scroll interno para ver todas las filas sin que cambie el tamaño de la pantalla.

4. **Actualizar posiciones desde la API AIS**
   - Pulsar el botón **“Actualizar posiciones”** solo cuando sea necesario.
   - El sistema respeta el límite de una llamada cada 24 horas por buque.
   - Después de actualizar, la página vuelve a cargar la lista de buques y el mapa se refresca.

---

### 7. Notas técnicas y buenas prácticas

- La pantalla de seguimiento requiere que el usuario esté **autenticado**; de lo contrario, redirige a `/auth`.
- Todas las consultas a Supabase se ejecutan desde el frontend usando el cliente `createClient()` con sesión del usuario.
- La interfaz está optimizada para:
  - **Escritorio**: mapa más alto (`~600px`) y tabla visible sin deformar la vista.
  - **Móvil**: mapa adaptado a `~60vh` de alto y tabla con scroll interno, evitando que la página completa se reescale.
- Si el mapa se ve vacío:
  - Verificar que existan registros en `vessel_positions` y/o que el endpoint `/api/vessels/active` esté devolviendo buques.
  - Comprobar que las políticas RLS de `vessel_positions` y `vessel_position_history` permiten leer datos al rol `authenticated`.

---

Con este documento se puede explicar, tanto a usuarios como a técnicos, **qué hace exactamente la página de Seguimiento**, de dónde salen los datos y cómo se visualizan las rutas de los buques sin depender permanentemente de la API AIS externa.


