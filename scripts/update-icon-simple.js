const fs = require('fs');
const path = require('path');

console.log('🎨 CONFIGURANDO ÍCONO ASLI PARA APK\n');

console.log('📋 ESTRATEGIA:');
console.log('   • Usar android/iconoasli.png');
console.log('   • Copiar a carpetas mipmap');
console.log('   • Para mejor resultado, redimensionar manualmente\n');

const sourceIcon = 'android/iconoasli.png';
const mipmapDirs = [
    'android/app/src/main/res/mipmap-mdpi',
    'android/app/src/main/res/mipmap-hdpi',
    'android/app/src/main/res/mipmap-xhdpi',
    'android/app/src/main/res/mipmap-xxhdpi',
    'android/app/src/main/res/mipmap-xxxhdpi'
];

try {
    // Verificar que existe la imagen fuente
    if (!fs.existsSync(sourceIcon)) {
        console.error(`❌ No se encuentra: ${sourceIcon}`);
        process.exit(1);
    }

    console.log(`✅ Imagen fuente: ${sourceIcon}`);
    console.log('📋 Copiando iconos...\n');

    // Copiar icono a cada carpeta mipmap
    mipmapDirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`📁 Creada: ${dir}`);
        }

        const destIcon = path.join(dir, 'ic_launcher.png');
        const destIconRound = path.join(dir, 'ic_launcher_round.png');

        // Copiar la imagen
        fs.copyFileSync(sourceIcon, destIcon);
        fs.copyFileSync(sourceIcon, destIconRound);

        console.log(`✅ Copiado a: ${path.basename(dir)}`);
    });

    console.log('\n🎯 ICONOS CONFIGURADOS');
    console.log('   • ic_launcher.png en todas las densidades');
    console.log('   • ic_launcher_round.png en todas las densidades');
    console.log('   • Listo para reconstruir APK\n');

    console.log('📐 RECOMENDACIÓN PARA MEJOR CALIDAD:');
    console.log('   Si quieres iconos optimizados, redimensiona manualmente:');
    console.log('   • mdpi: 48x48px');
    console.log('   • hdpi: 72x72px');
    console.log('   • xhdpi: 96x96px');
    console.log('   • xxhdpi: 144x144px');
    console.log('   • xxxhdpi: 192x192px\n');

    console.log('🚀 PRÓXIMOS PASOS:');
    console.log('   1. Abrir Android Studio');
    console.log('   2. File > Open > android/');
    console.log('   3. Build > Clean Project');
    console.log('   4. Build > Rebuild Project');
    console.log('   5. Build > Build APK(s)');
    console.log('   6. npm run copy-apk\n');

    console.log('📱 TU APK TENDRÁ:');
    console.log('   • ✅ Ícono personalizado ASLI');
    console.log('   • ✅ Logo visible en el launcher');
    console.log('   • ✅ Diseño corporativo profesional\n');

    console.log('⚡ ¡LISTO PARA GENERAR APK CON ÍCONO ASLI! 🎨✨');

} catch (error) {
    console.error('❌ Error:', error.message);
}