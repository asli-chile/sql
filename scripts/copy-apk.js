const fs = require('fs');
const path = require('path');

console.log('📱 Copiando APK generado por Android Studio...\n');

const sourceApkPath = path.join(__dirname, '..', 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const targetApkPath = path.join(__dirname, '..', 'ASLI-Mobile.apk');

if (fs.existsSync(sourceApkPath)) {
    try {
        // Crear un nombre único para evitar sobrescribir
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const uniqueApkPath = path.join(__dirname, '..', `ASLI-Mobile-${timestamp}.apk`);

        fs.copyFileSync(sourceApkPath, uniqueApkPath);

        const stats = fs.statSync(uniqueApkPath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

        console.log('✅ ¡APK copiado exitosamente!');
        console.log(`📁 Ubicación: ${uniqueApkPath}`);
        console.log(`📏 Tamaño: ${sizeMB} MB`);
        console.log(`📅 Generado: ${stats.mtime.toLocaleString()}`);

        console.log('\n📱 Para instalar en tu teléfono:');
        console.log('1. Transfiere este archivo APK a tu teléfono');
        console.log('2. Habilita instalación de apps desconocidas');
        console.log('3. Instala y abre la app - ¡verás el logo de ASLI!');

        console.log('\n🎉 ¡El logo de ASLI está ahora en tu app móvil!');

    } catch (error) {
        console.error('❌ Error copiando el APK:', error.message);
    }
} else {
    console.log('❌ No se encontró el APK generado por Android Studio.');
    console.log('📍 Buscado en:', sourceApkPath);
    console.log('\n💡 Asegúrate de:');
    console.log('1. Haber abierto el proyecto en Android Studio');
    console.log('2. Haber hecho Build > Build APK(s)');
    console.log('3. Que el build haya sido exitoso');
    console.log('\n🔄 Luego ejecuta este comando nuevamente.');
}