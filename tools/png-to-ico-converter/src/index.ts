import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

export const ICON_SIZES = [256, 128, 64, 48, 32, 24, 16] as const;
const SUPPORTED_FORMATS = ['.png', '.jpg', '.jpeg'];

export interface ConvertOptions {
  inputPath: string;
  outputPath?: string;
  sizes?: readonly number[];
  backgroundColor?: { r: number; g: number; b: number; alpha?: number };
  ensureExists?: boolean;
}

export async function convertImageToIco(options: ConvertOptions): Promise<string> {
  const {
    inputPath,
    outputPath,
    sizes = ICON_SIZES,
    backgroundColor = { r: 0, g: 0, b: 0, alpha: 0 },
    ensureExists = true
  } = options;

  if (!inputPath) {
    throw new Error('Debes especificar la ruta de la imagen de entrada.');
  }

  const resolvedInput = path.resolve(inputPath);
  const outputDir = outputPath ? path.dirname(outputPath) : path.dirname(resolvedInput);
  const outputFile =
    outputPath ?? path.join(outputDir, `${path.parse(resolvedInput).name}.ico`);

  const inputExt = path.extname(resolvedInput).toLowerCase();
  if (!SUPPORTED_FORMATS.includes(inputExt)) {
    throw new Error(`Formato no soportado (${inputExt}). Usa imágenes PNG o JPG.`);
  }

  if (ensureExists) {
    try {
      await fs.access(resolvedInput);
    } catch {
      throw new Error(`No se encontró la imagen en la ruta: ${resolvedInput}`);
    }
  }

  const arrayBuffer = await fs.readFile(resolvedInput);
  const pngBuffers = await Promise.all(
    sizes.map(async (size) =>
      sharp(arrayBuffer)
        .resize(size, size, {
          fit: 'contain',
          background: backgroundColor
        })
        .png()
        .toBuffer()
    )
  );

  const icoBuffer = await pngToIco(pngBuffers);
  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  await fs.writeFile(outputFile, icoBuffer);

  return outputFile;
}

// Alias para mantener compatibilidad si se importa por default
export default convertImageToIco;

