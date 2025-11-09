# Conversor PNG/JPG a ICO

Herramienta independiente para convertir imágenes PNG o JPG en iconos `.ico` multi-resolución listos para Windows (16→256 px).

## Uso rápido

```bash
pnpm install
pnpm build
node dist/cli.js ./logo.png
```

o directamente durante el desarrollo:

```bash
pnpm dev ./logo.png ./dist/logo.ico
```

## CLI

```
png-to-ico-converter <entrada> [salida]

Argumentos:
  <entrada>   Ruta de la imagen PNG/JPG de origen.
  [salida]    (opcional) Ruta del icono generado.
```

## API

```ts
import { convertImageToIco } from '@asli-tools/png-to-ico-converter';

await convertImageToIco({
  inputPath: './logo.png',
  outputPath: './dist/logo.ico',
});
```

## Publicación como repo independiente

1. Copia esta carpeta (`tools/png-to-ico-converter`) a un repositorio nuevo.
2. Ejecuta `npm install` (o `pnpm install`).
3. Ajusta `package.json` y `README` con tu información.
4. `npm publish` (opcional) para compartirlo como paquete npm.

