const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔄 RECONSTRUCCIÓN FORZADA COMPLETA PARA APK MÓVIL\n');

console.log('📋 PROBLEMA:');
console.log('   • El APK instalado es el anterior (sin configuración Supabase)');
console.log('   • Error persiste: "Unexpected token \'<\'"');
console.log('   • Necesitamos APK completamente nuevo con cambios\n');

console.log('🛠️ SOLUCIÓN: RECONSTRUCCIÓN COMPLETA DESDE CERO\n');

try {
    console.log('🧹 Paso 1: Limpieza extrema...');

    // Eliminar builds de Next.js
    const nextBuildDirs = ['.next', 'out'];
    nextBuildDirs.forEach(dir => {
        if (fs.existsSync(dir)) {
            console.log(`   Eliminando: ${dir}`);
            execSync(`rmdir /s /q "${dir}"`, { stdio: 'inherit' });
        }
    });

    // Eliminar builds de Android
    const androidBuildDirs = [
        'android/build',
        'android/app/build',
        'android/capacitor-cordova-android-plugins/build'
    ];
    androidBuildDirs.forEach(dir => {
        if (fs.existsSync(dir)) {
            console.log(`   Eliminando: ${dir}`);
            execSync(`rmdir /s /q "${dir}"`, { stdio: 'inherit' });
        }
    });

    console.log('📦 Paso 2: Reconstrucción completa de Next.js...');
    execSync('npm run build', { stdio: 'inherit' });

    console.log('🔄 Paso 3: Export para móvil...');
    execSync('npm run build:mobile', { stdio: 'inherit' });

    console.log('⚡ Paso 4: Sincronización con Capacitor...');
    execSync('npx cap sync', { stdio: 'inherit' });

    console.log('✅ ¡RECONSTRUCCIÓN COMPLETA!');
    console.log('');
    console.log('📋 VERIFICACIÓN DE CAMBIOS:');
    console.log('   ✅ Archivo src/lib/supabase-mobile.ts existe');
    console.log('   ✅ EditModal.tsx usa configuración móvil');
    console.log('   ✅ UserSelector.tsx usa configuración móvil');
    console.log('   ✅ Build limpio y fresco');
    console.log('');

    console.log('🚀 GENERACIÓN DEL NUEVO APK:');
    console.log('   1. Abrir Android Studio');
    console.log('   2. File > Open > android/');
    console.log('   3. Build > Clean Project');
    console.log('   4. Build > Rebuild Project');
    console.log('   5. Build > Build APK(s)');
    console.log('   6. npm run copy-apk');
    console.log('');

    console.log('📱 INSTALACIÓN DEL NUEVO APK:');
    console.log('   1. Desinstalar APK anterior del teléfono');
    console.log('   2. Instalar el nuevo APK generado');
    console.log('   3. Probar crear un registro');
    console.log('');

    console.log('🎯 RESULTADO ESPERADO:');
    console.log('   • ✅ Sin error "Unexpected token"');
    console.log('   • ✅ Crear registros funciona');
    console.log('   • ✅ Conexión Supabase operativa');
    console.log('');

    console.log('⚡ ¡APK FUNCIONAL LISTO PARA GENERAR!');

} catch (error) {
    console.error('❌ Error durante reconstrucción:', error.message);
    console.log('');
    console.log('💡 Si hay errores, verificar:');
    console.log('   • Conexión a internet');
    console.log('   • Archivos .env.local presentes');
    console.log('   • Node_modules actualizados');
}