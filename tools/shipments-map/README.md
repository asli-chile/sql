# Shipments Map (Deck.GL + MapLibre)

Componente React desacoplado para visualizar embarques y destinos sobre un mapa interactivo. Permite reutilizar la vista de mapa en otros proyectos entregando resolvers para puertos y países.

## Instalación

```bash
pnpm install
pnpm build
```

o usarlo directamente desde otro proyecto:

```bash
pnpm add @asli-tools/shipments-map
```

## Uso básico

```tsx
import { ShipmentsMap } from '@asli-tools/shipments-map';

<ShipmentsMap
  registros={data}
  getPortCoordinates={resolvePort}
  getCountryFromPort={resolveCountryFromPort}
  getCountryCoordinates={resolveCountry}
/>
```

### Props esenciales

| Propiedad              | Descripción                                                               |
| ---------------------- | ------------------------------------------------------------------------- |
| `registros`            | Lista de embarques con `pol`, `pod`, `estado`, `etd`, `eta`, `deposito`.  |
| `getPortCoordinates`   | Función que retorna `[lng, lat]` para un puerto (POL/POD).                |
| `getCountryFromPort`   | Retorna el país asociado a un puerto de destino.                          |
| `getCountryCoordinates`| Devuelve coordenadas país → `[lng, lat]` para fallback y vista por país.  |

### Personalización

- `className`: clases extra para envolver el mapa.
- `mapStyle`: URL de estilo MapLibre (por defecto Carto Dark Matter).
- `initialViewState`: posición, zoom, pitch y bearing iniciales.

## Para crear un repositorio independiente

1. Copia la carpeta `tools/shipments-map` en un repo nuevo.
2. Ajusta `package.json` (nombre, versión, author).
3. Completa helpers de coordenadas o agrégales datasets.
4. Ejecuta `npm install` y `npm run build` para validar.
5. Opcional: `npm publish` para distribuirlo como paquete.

