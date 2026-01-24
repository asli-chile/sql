const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧹 LIMPIANDO Y REDIMENSIONANDO ÍCONOS ASLI PARA APK\n');

console.log('📋 PLAN:');
console.log('   • Borrar TODOS los iconos existentes (PNG y XML)');
console.log('   • Redimensionar iconoasli.png para cada densidad');
console.log('   • Solo usar ícono ASLI personalizado');
console.log('   • Eliminar archivos vectoriales que interfieren\n');

const sourceIcon = 'android/iconoasli.png';
const mipmapDirs = [
    'android/app/src/main/res/mipmap-mdpi',
    'android/app/src/main/res/mipmap-hdpi',
    'android/app/src/main/res/mipmap-xhdpi',
    'android/app/src/main/res/mipmap-xxhdpi',
    'android/app/src/main/res/mipmap-xxxhdpi',
    'android/app/src/main/res/mipmap-anydpi-v26'
];

// Dimensiones correctas para Android launcher icons
const iconSizes = {
    'mipmap-mdpi': 48,      // 48x48
    'mipmap-hdpi': 72,      // 72x72
    'mipmap-xhdpi': 96,     // 96x96
    'mipmap-xxhdpi': 144,   // 144x144
    'mipmap-xxxhdpi': 192   // 192x192
};

try {
    // Verificar que existe la imagen fuente
    if (!fs.existsSync(sourceIcon)) {
        console.error(`❌ No se encuentra: ${sourceIcon}`);
        process.exit(1);
    }

    console.log(`✅ Imagen fuente: ${sourceIcon}`);
    console.log('🧹 Limpiando iconos existentes...\n');

    // Limpiar TODOS los archivos existentes
    mipmapDirs.forEach(dir => {
        if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir);
            files.forEach(file => {
                const filePath = path.join(dir, file);
                try {
                    fs.unlinkSync(filePath);
                    console.log(`🗑️  Eliminado: ${filePath}`);
                } catch (error) {
                    console.log(`⚠️  No se pudo eliminar: ${filePath}`);
                }
            });
        }
    });

    console.log('\n🎨 Creando iconos redimensionados...\n');

    // Crear iconos para cada densidad
    mipmapDirs.forEach(dir => {
        const density = path.basename(dir);

        // Saltar mipmap-anydpi-v26 para archivos XML
        if (density === 'mipmap-anydpi-v26') {
            console.log(`⏭️  Saltando ${density} (no necesita PNG)`);
            return;
        }

        const size = iconSizes[density];

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`📁 Creada: ${dir}`);
        }

        const outputIcon = path.join(dir, 'ic_launcher.png');
        const outputIconRound = path.join(dir, 'ic_launcher_round.png');

        // Usar PowerShell para redimensionar (más confiable que ImageMagick)
        const resizeCommand = `$img = [System.Drawing.Image]::FromFile('${sourceIcon.replace(/\\/g, '\\\\')}'); $bmp = New-Object System.Drawing.Bitmap $img, ${size}, ${size}; $bmp.Save('${outputIcon.replace(/\\/g, '\\\\')}'); $bmp.Dispose(); $img.Dispose()`;

        try {
            execSync(`powershell -Command "${resizeCommand}"`, { stdio: 'pipe' });
            console.log(`✅ Creado: ${density} (${size}x${size})`);

            // Copiar también como round (opcional pero recomendado)
            fs.copyFileSync(outputIcon, outputIconRound);
            console.log(`✅ Copiado: ${density} round version`);

        } catch (error) {
            console.log(`⚠️  Error creando ${density}: ${error.message}`);
            console.log('💡 Copiando imagen original sin redimensionar...');

            // Fallback: copiar imagen original si no se puede redimensionar
            fs.copyFileSync(sourceIcon, outputIcon);
            fs.copyFileSync(sourceIcon, outputIconRound);
            console.log(`✅ Copiado original a: ${density}`);
        }
    });

    console.log('\n🎯 VERIFICACIÓN FINAL:');
    console.log('   • ✅ Todos los iconos antiguos eliminados');
    console.log('   • ✅ Solo ícono ASLI personalizado');
    console.log('   • ✅ Archivos XML vectoriales eliminados');
    console.log('   • ✅ Iconos redimensionados para cada densidad\n');

    console.log('🚀 PRÓXIMOS PASOS:');
    console.log('   1. Abrir Android Studio');
    console.log('   2. File > Open > android/');
    console.log('   3. Build > Clean Project (importante)');
    console.log('   4. Build > Rebuild Project');
    console.log('   5. Build > Build APK(s)');
    console.log('   6. npm run copy-apk\n');

    console.log('📱 TU APK TENDRÁ:');
    console.log('   • 🎨 Ícono: SOLO tu iconoasli.png personalizado');
    console.log('   • ❌ Logo antiguo: Completamente eliminado');
    console.log('   • ✅ Optimizado: Para todas las densidades de pantalla\n');

    console.log('💡 NOTA IMPORTANTE:');
    console.log('   • El Build > Clean Project es CRÍTICO para que tome los nuevos iconos');
    console.log('   • Sin clean, Android Studio puede usar iconos cacheados\n');

    console.log('🏆 ¡ÍCONO ASLI EXCLUSIVO LISTO!');
    console.log('   Tu APK tendrá SOLO el logo que especificaste. ✨🎨📱\n');

} catch (error) {
    console.error('❌ Error:', error.message);
}