// Script para descargar el logo azul marino de ASLI y guardarlo localmente
const https = require('https');
const fs = require('fs');
const path = require('path');

// Intentar múltiples URLs posibles del logo azul
// La URL que funciona es: https://asli.cl/img/LOGO%20ASLI%20SIN%20FONDO%20AZUL.png
const logoUrls = [
  'https://asli.cl/img/LOGO%20ASLI%20SIN%20FONDO%20AZUL.png', // Esta es la que funciona
  'https://asli.cl/img/logo%20asli%20azul%20sin%20fondo.png', // Alternativa
  'https://asli.cl/img/logo-asli-azul-sin-fondo.png'
];

const outputPath = path.join(__dirname, '..', 'public', 'logo-asli-azul.png');

// Función para intentar descargar desde una URL
function descargarLogo(logoUrl, outputPath) {
  return new Promise((resolve, reject) => {
    console.log('📥 Intentando descargar desde:', logoUrl);

    https.get(logoUrl, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      // Verificar que el directorio public existe
      const publicDir = path.dirname(outputPath);
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }

      // Guardar el archivo
      const fileStream = fs.createWriteStream(outputPath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve(outputPath);
      });

      fileStream.on('error', (err) => {
        fs.unlink(outputPath, () => {}); // Eliminar archivo parcial si hay error
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Intentar descargar desde cada URL hasta que una funcione
(async () => {
  for (const logoUrl of logoUrls) {
    try {
      const path = await descargarLogo(logoUrl, outputPath);
      console.log('✅ Logo descargado exitosamente en:', path);
      console.log('📏 Tamaño del archivo:', fs.statSync(path).size, 'bytes');
      process.exit(0);
    } catch (error) {
      console.warn(`⚠️  No se pudo descargar desde ${logoUrl}:`, error.message);
      continue;
    }
  }
  
  console.error('❌ No se pudo descargar el logo desde ninguna URL.');
  console.log('\n💡 Alternativa: Descarga el logo manualmente:');
  console.log('   1. Abre: https://asli.cl/img/logo%20asli%20azul%20sin%20fondo.png');
  console.log('   2. Guarda la imagen como: public/logo-asli-azul.png');
  process.exit(1);
})();
