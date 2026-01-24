const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando si el APK fue generado correctamente...\n');

const apkPath = path.join(__dirname, '..', 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');

console.log('Buscando APK en:', apkPath);

if (fs.existsSync(apkPath)) {
    const stats = fs.statSync(apkPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

    console.log('✅ ¡APK ENCONTRADO!');
    console.log(`📏 Tamaño: ${sizeMB} MB`);
    console.log(`📅 Generado: ${stats.mtime.toLocaleString()}`);
    console.log('\n🎯 Ejecuta: npm run copy-apk');
    console.log('   Para copiar el APK a la raíz del proyecto\n');

} else {
    console.log('❌ APK NO ENCONTRADO\n');

    // Verificar si existe el directorio de build
    const buildDir = path.join(__dirname, '..', 'android', 'app', 'build');
    if (!fs.existsSync(buildDir)) {
        console.log('📁 El directorio build ni siquiera existe');
        console.log('💡 Esto significa que nunca se ha hecho un build\n');
    } else {
        console.log('📁 El directorio build existe, pero no hay APK');
        console.log('💡 Posiblemente el build falló o se generó en otra ubicación\n');
    }

    console.log('🔧 SOLUCIÓN:');
    console.log('1. Abre Android Studio');
    console.log('2. Asegúrate de que el proyecto esté abierto');
    console.log('3. Ve a Build > Build APK(s)');
    console.log('4. Espera a que aparezca "BUILD SUCCESSFUL" en la parte inferior');
    console.log('5. Si hay errores, revisa la pestaña "Build" para solucionarlos');
    console.log('6. Una vez exitoso, ejecuta: npm run copy-apk\n');
}

console.log('💡 COMANDOS ÚTILES:');
console.log('• npm run final-setup    - Ver todas las instrucciones');
console.log('• npm run clean-gradle   - Limpiar cache si hay problemas');
console.log('• npm run verify-sdk     - Verificar SDK instalado\n');

console.log('🚀 ¡Vamos a generar ese APK con logo de ASLI!');