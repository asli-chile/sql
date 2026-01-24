const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

console.log('🔧 Generando íconos redimensionados para Android...\n');

// Logo fuente
const logoPath = path.join(__dirname, '..', 'public', 'LOGO ASLI SIN FONDO AZUL.png');
const androidResPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

// Verificar que el logo existe
if (!fs.existsSync(logoPath)) {
    console.error('❌ No se encontró el logo:', logoPath);
    process.exit(1);
}

console.log('✅ Logo encontrado:', logoPath);

// Tamaños de íconos para Android (en píxeles)
const iconSizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192
};

async function generateIcons() {
    let generated = 0;

    for (const [folder, size] of Object.entries(iconSizes)) {
        const folderPath = path.join(androidResPath, folder);
        const iconPath = path.join(folderPath, 'ic_launcher.png');
        const foregroundPath = path.join(folderPath, 'ic_launcher_foreground.png');
        const roundPath = path.join(folderPath, 'ic_launcher_round.png');

        // Crear directorio si no existe
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        try {
            console.log(`📏 Generando ícono ${folder} (${size}x${size})...`);

            // Generar ícono principal con fondo azul ASLI
            await sharp(logoPath)
                .resize(size, size, {
                    fit: 'contain',
                    background: { r: 0, g: 50, b: 150, alpha: 1 } // Azul ASLI
                })
                .png()
                .toFile(iconPath);

            // Generar foreground (para adaptive icon) - logo sin fondo
            await sharp(logoPath)
                .resize(Math.floor(size * 0.7), Math.floor(size * 0.7), {
                    fit: 'contain',
                    background: { r: 255, g: 255, b: 255, alpha: 0 }
                })
                .png()
                .toFile(foregroundPath);

            // Generar versión redonda
            await sharp(iconPath)
                .png()
                .toFile(roundPath);

            console.log(`   ✅ ${folder} generado correctamente`);
            generated++;

        } catch (error) {
            console.log(`   ❌ Error en ${folder}:`, error.message);
            // Fallback: copiar logo original si falla el procesamiento
            try {
                fs.copyFileSync(logoPath, iconPath);
                fs.copyFileSync(logoPath, foregroundPath);
                fs.copyFileSync(logoPath, roundPath);
                console.log(`   ⚠️  Usando logo original para ${folder} (fallback)`);
                generated++;
            } catch (fallbackError) {
                console.log(`   ❌ Fallback falló para ${folder}`);
            }
        }
    }

    console.log(`\n🎉 ¡Proceso completado! ${generated}/${Object.keys(iconSizes).length} íconos generados.`);

    if (generated > 0) {
        console.log('\n📱 Para generar el APK:');
        console.log('1. Abre Android Studio');
        console.log('2. File > Open > carpeta "android"');
        console.log('3. Build > Build Bundle(s)/APK(s) > Build APK(s)');
        console.log('4. El APK estará en: android/app/build/outputs/apk/debug/');
    }
}

generateIcons().catch(error => {
    console.error('❌ Error general:', error.message);
    process.exit(1);
});