const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando versiones de Android SDK instaladas...\n');

const sdkPath = 'C:\\Users\\rodri\\AppData\\Local\\Android\\Sdk';

// Verificar si existe el SDK
if (!fs.existsSync(sdkPath)) {
    console.log('❌ Android SDK no encontrado en la ruta esperada');
    console.log(`📂 Ruta verificada: ${sdkPath}\n`);
    console.log('💡 Solución:');
    console.log('1. Abre Android Studio');
    console.log('2. Ve a Settings > Appearance & Behavior > System Settings > Android SDK');
    console.log('3. Nota la ruta del "Android SDK Location"');
    console.log('4. Asegúrate de que esté instalado\n');
    process.exit(1);
}

console.log('✅ Android SDK encontrado!');
console.log(`📂 Ubicación: ${sdkPath}\n`);

// Verificar plataformas instaladas
const platformsPath = path.join(sdkPath, 'platforms');
if (fs.existsSync(platformsPath)) {
    const platforms = fs.readdirSync(platformsPath)
        .filter(dir => dir.startsWith('android-'))
        .map(dir => dir.replace('android-', ''))
        .sort((a, b) => parseInt(b) - parseInt(a));

    console.log('📱 Plataformas Android instaladas:');
    platforms.forEach(platform => {
        console.log(`   • Android API ${platform}`);
    });
    console.log();

    // Encontrar la versión más reciente
    const latestApi = Math.max(...platforms.map(p => parseInt(p)));
    console.log(`🎯 Versión más reciente: Android API ${latestApi}\n`);

    if (latestApi >= 34) {
        console.log('✅ ¡Excelente! Tienes una versión reciente de Android SDK instalada.\n');
    } else {
        console.log('⚠️  Tu versión de Android SDK es antigua. Recomiendo actualizar a API 34 o superior.\n');
    }

} else {
    console.log('❌ No se encontraron plataformas Android instaladas\n');
    console.log('💡 Solución:');
    console.log('1. Abre Android Studio');
    console.log('2. Tools > SDK Manager');
    console.log('3. Pestaña "SDK Platforms"');
    console.log('4. Instala "Android API 34" o superior\n');
}

// Verificar build tools
const buildToolsPath = path.join(sdkPath, 'build-tools');
if (fs.existsSync(buildToolsPath)) {
    const buildTools = fs.readdirSync(buildToolsPath)
        .sort((a, b) => b.localeCompare(a));

    console.log('🔧 Build Tools instalados:');
    buildTools.forEach(tool => {
        console.log(`   • ${tool}`);
    });
    console.log();
} else {
    console.log('❌ No se encontraron Build Tools\n');
}

console.log('🎯 CONFIGURACIÓN RECOMENDADA PARA TU PROYECTO:\n');

console.log('En android/variables.gradle, usa:');
console.log('• compileSdkVersion = 34  (o la versión más reciente que tengas)');
console.log('• targetSdkVersion = 34   (o la versión más reciente que tengas)');
console.log('• minSdkVersion = 24      (mantiene compatibilidad)\n');

console.log('🚀 PRÓXIMOS PASOS:');
console.log('1. Actualiza android/variables.gradle con la versión correcta');
console.log('2. File > Invalidate Caches / Restart en Android Studio');
console.log('3. Build > Build APK(s)');
console.log('4. ¡Tu APK con logo de ASLI estará listo!\n');

console.log('💡 Si tienes problemas:');
console.log('• npm run clean-gradle  (limpia cache)');
console.log('• npm run fix-jdk        (arregla configuración JDK)');
console.log('• npm run fix-sdk        (verifica SDK)\n');

console.log('🎉 ¡Estás muy cerca de tener tu APK con logo de ASLI!');