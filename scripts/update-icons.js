const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

console.log('🎨 Actualizando íconos de la app con el logo de ASLI...\n');

// Logo fuente
const logoPath = path.join(__dirname, '..', 'public', 'LOGO ASLI SIN FONDO AZUL.png');
const androidResPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

// Tamaños de íconos para Android (en píxeles)
const iconSizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192
};

async function updateIcons() {
    try {
        // Verificar que el logo existe
        if (!fs.existsSync(logoPath)) {
            console.error('❌ No se encontró el logo:', logoPath);
            console.log('🔍 Logos disponibles en public/:');
            const logos = fs.readdirSync(path.join(__dirname, '..', 'public'))
                .filter(file => file.toLowerCase().includes('logo') && file.endsWith('.png'));
            console.log(logos.map(logo => `  - ${logo}`).join('\n'));
            process.exit(1);
        }

        console.log('✅ Logo encontrado:', logoPath);

        // Procesar cada tamaño de ícono
        for (const [folder, size] of Object.entries(iconSizes)) {
            const folderPath = path.join(androidResPath, folder);
            const iconPath = path.join(folderPath, 'ic_launcher.png');
            const foregroundPath = path.join(folderPath, 'ic_launcher_foreground.png');
            const roundPath = path.join(folderPath, 'ic_launcher_round.png');

            // Crear directorio si no existe
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
            }

            console.log(`📏 Generando ícono ${folder} (${size}x${size})...`);

            try {
                // Generar ícono principal con fondo azul ASLI
                await sharp(logoPath)
                    .resize(size, size, {
                        fit: 'contain',
                        background: { r: 0, g: 50, b: 150, alpha: 1 } // Azul ASLI
                    })
                    .png()
                    .toFile(iconPath);

                // Generar foreground (para adaptive icon) - sin fondo
                await sharp(logoPath)
                    .resize(Math.floor(size * 0.8), Math.floor(size * 0.8), {
                        fit: 'contain',
                        background: { r: 255, g: 255, b: 255, alpha: 0 }
                    })
                    .png()
                    .toFile(foregroundPath);

                // Copiar el mismo ícono para round (por simplicidad)
                await sharp(iconPath)
                    .png()
                    .toFile(roundPath);

                console.log(`   ✅ ${folder} completado`);
            } catch (error) {
                console.log(`   ❌ Error en ${folder}:`, error.message);
                // Fallback simple: copiar el logo original sin procesar
                try {
                    // Copiar directamente el logo original como fallback
                    fs.copyFileSync(logoPath, iconPath);
                    fs.copyFileSync(logoPath, foregroundPath);
                    fs.copyFileSync(logoPath, roundPath);
                    console.log(`   ⚠️  Usando logo original para ${folder}`);
                } catch (fallbackError) {
                    console.log(`   ❌ Fallback falló para ${folder}:`, fallbackError.message);
                }
            }
        }

        // Actualizar splash screen
        console.log('\n🏄 Actualizando splash screen...');
        const splashSizes = {
            'drawable-port-mdpi': 240,
            'drawable-port-hdpi': 320,
            'drawable-port-xhdpi': 480,
            'drawable-port-xxhdpi': 720,
            'drawable-port-xxxhdpi': 960,
            'drawable-land-mdpi': 240,
            'drawable-land-hdpi': 320,
            'drawable-land-xhdpi': 480,
            'drawable-land-xxhdpi': 720,
            'drawable-land-xxxhdpi': 960
        };

        for (const [folder, size] of Object.entries(splashSizes)) {
            const folderPath = path.join(androidResPath, folder);
            const splashPath = path.join(folderPath, 'splash.png');

            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
            }

            // Para landscape, hacer el ancho más grande
            const isLandscape = folder.includes('land');
            const width = isLandscape ? Math.floor(size * 1.5) : size;
            const height = size;

            await sharp(logoPath)
                .resize(width, height, {
                    fit: 'contain',
                    background: { r: 0, g: 32, b: 96, alpha: 1 } // Azul ASLI
                })
                .png()
                .toFile(splashPath);
        }

        console.log('\n🎉 ¡Íconos actualizados exitosamente!');
        console.log('📱 Los nuevos íconos estarán disponibles en el próximo APK.');
        console.log('\n🔄 Para aplicar los cambios:');
        console.log('1. npm run prepare:apk');
        console.log('2. Instala el nuevo APK en tu teléfono');

    } catch (error) {
        console.error('\n❌ Error al actualizar íconos:', error.message);
        process.exit(1);
    }
}

updateIcons();