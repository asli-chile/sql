# Generador de códigos QR (React)

Componente modal reutilizable para generar y descargar códigos QR directamente desde aplicaciones React.

## Instalación

```bash
pnpm install
pnpm build
```

o consume el paquete desde otro proyecto:

```bash
pnpm add @asli-tools/qr-generator
```

## Uso básico

```tsx
import { QrGeneratorModal } from '@asli-tools/qr-generator';

export function Demo() {
  return <QrGeneratorModal triggerLabel="Crear QR" />;
}
```

## Props

| Propiedad      | Tipo                           | Descripción                                      |
| -------------- | ------------------------------ | ------------------------------------------------ |
| `defaultValue` | `string`                       | Valor inicial para el campo de entrada.          |
| `triggerLabel` | `string`                       | Texto del botón que abre el modal.               |
| `className`    | `string`                       | Clases extra para el wrapper del modal.          |
| `darkMode`     | `boolean`                      | Activa versión con colores oscuros.              |
| `onGenerate`   | `(value: string) => void`      | Callback al generar un nuevo código QR.          |

## Publicación como repo nuevo

1. Copia la carpeta `tools/qr-generator` a un repositorio vacío.
2. Actualiza `package.json` y `README.md` con tus datos.
3. Ejecuta `npm install` y `npm run build` para verificar.
4. Opcional: publica en npm con `npm publish`.

