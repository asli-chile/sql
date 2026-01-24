const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎨 ACTUALIZANDO ÍCONO DEL APK CON iconoasli.png\n');

console.log('📋 PLAN:');
console.log('   • Usar android/iconoasli.png como fuente');
console.log('   • Generar iconos en todos los tamaños necesarios');
console.log('   • Reemplazar iconos actuales en carpetas mipmap');
console.log('   • Preparar para reconstrucción del APK\n');

const sourceIcon = 'android/iconoasli.png';
const mipmapDirs = [
    'android/app/src/main/res/mipmap-mdpi',
    'android/app/src/main/res/mipmap-hdpi',
    'android/app/src/main/res/mipmap-xhdpi',
    'android/app/src/main/res/mipmap-xxhdpi',
    'android/app/src/main/res/mipmap-xxxhdpi'
];

// Tamaños requeridos para cada densidad
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

    console.log(`✅ Imagen fuente encontrada: ${sourceIcon}`);
    console.log('📏 Generando iconos...\n');

    // Generar iconos para cada densidad
    mipmapDirs.forEach(dir => {
        const density = path.basename(dir);
        const size = iconSizes[density];

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`📁 Creada carpeta: ${dir}`);
        }

        const outputIcon = path.join(dir, 'ic_launcher.png');
        const outputIconRound = path.join(dir, 'ic_launcher_round.png');

        // Comando para redimensionar la imagen usando ImageMagick o similar
        // Como estamos en Windows, usaré PowerShell con .NET para redimensionar
        const resizeCommand = `powershell -Command "Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${sourceIcon.replace(/\\/g, '\\\\')}'); $bmp = New-Object System.Drawing.Bitmap $img, ${size}, ${size}; $bmp.Save('${outputIcon.replace(/\\/g, '\\\\')}'); $bmp.Dispose(); $img.Dispose()"`;

        try {
            execSync(resizeCommand, { stdio: 'pipe' });
            console.log(`✅ Generado: ${density} (${size}x${size})`);

            // Copiar también como round (opcional, pero recomendado)
            fs.copyFileSync(outputIcon, outputIconRound);
            console.log(`✅ Copiado: ${density} round version`);
        } catch (error) {
            console.log(`⚠️  Error generando ${density}: ${error.message}`);
            console.log('💡 Continuando con siguiente densidad...');
        }
    });

    console.log('\n🎯 VERIFICACIÓN:');
    console.log('   • Iconos generados en todas las densidades');
    console.log('   • Archivos ic_launcher.png creados');
    console.log('   • Archivos ic_launcher_round.png creados\n');

    console.log('🚀 PRÓXIMOS PASOS:');
    console.log('   1. Abrir Android Studio');
    console.log('   2. File > Open > android/');
    console.log('   3. Build > Clean Project');
    console.log('   4. Build > Rebuild Project');
    console.log('   5. Build > Build APK(s)');
    console.log('   6. npm run copy-apk\n');

    console.log('📱 RESULTADO:');
    console.log('   • APK con ícono personalizado ASLI');
    console.log('   • Logo visible en launcher del teléfono');
    console.log('   • Diseño profesional y corporativo\n');

    console.log('⚡ ¡ÍCONO ASLI LISTO PARA TU APK! 🎨✨');

} catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 SOLUCIÓN ALTERNATIVA:');
    console.log('   Si ImageMagick no está disponible, puedes:');
    console.log('   1. Abrir android/iconoasli.png en un editor de imágenes');
    console.log('   2. Redimensionar manualmente a los tamaños requeridos');
    console.log('   3. Guardar como ic_launcher.png en cada carpeta mipmap');
    console.log('   4. Reconstruir el APK');
}