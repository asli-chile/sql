#!/usr/bin/env node

import { existsSync } from 'node:fs';
import path from 'node:path';
import { convertImageToIco } from './index';

function printHelp(): void {
  console.log(`
Uso: png-to-ico-converter <entrada> [salida]

Argumentos:
  <entrada>   Ruta de la imagen PNG/JPG que deseas convertir.
  [salida]    (Opcional) Ruta del archivo .ico generado.

Opciones:
  -h, --help  Muestra esta ayuda.

Ejemplos:
  png-to-ico-converter logo.png
  png-to-ico-converter ./imagenes/logo.jpg ./dist/icono.ico
`.trim());
}

async function run() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    printHelp();
    process.exit(args.length === 0 ? 1 : 0);
  }

  const [inputArg, outputArg] = args;
  const inputPath = path.resolve(process.cwd(), inputArg);
  const outputPath = outputArg
    ? path.resolve(process.cwd(), outputArg)
    : undefined;

  if (!existsSync(inputPath)) {
    console.error(`❌ No se encontró la imagen: ${inputPath}`);
    process.exit(1);
  }

  try {
    const generatedPath = await convertImageToIco({
      inputPath,
      outputPath
    });
    console.log(`✅ Icono generado en: ${generatedPath}`);
  } catch (error) {
    console.error('❌ Error al convertir la imagen:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

run();

