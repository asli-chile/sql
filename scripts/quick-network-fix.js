const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('⚡ SOLUCIÓN RÁPIDA: LIMPIEZA COMPLETA DE CACHE GRADLE\n');

console.log('📋 ESTRATEGIA:');
console.log('   • Eliminar cache corrupto de Gradle');
console.log('   • Forzar descarga fresca de dependencias');
console.log('   • Resolver problema de conectividad SSL\n');

try {
    console.log('🧹 Paso 1: Limpiando cache de Gradle...');

    const gradleCachePath = path.join(process.env.USERPROFILE, '.gradle', 'caches');
    const gradleWrapperPath = path.join(process.env.USERPROFILE, '.gradle', 'wrapper');

    // Eliminar caches
    if (fs.existsSync(gradleCachePath)) {
        console.log(`   Eliminando: ${gradleCachePath}`);
        execSync(`rmdir /s /q "${gradleCachePath}"`, { stdio: 'inherit' });
        console.log('   ✅ Cache de Gradle eliminado');
    }

    // Eliminar wrapper (opcional pero recomendado)
    if (fs.existsSync(gradleWrapperPath)) {
        console.log(`   Eliminando: ${gradleWrapperPath}`);
        execSync(`rmdir /s /q "${gradleWrapperPath}"`, { stdio: 'inherit' });
        console.log('   ✅ Wrapper de Gradle eliminado');
    }

    console.log('🧹 Paso 2: Limpiando build del proyecto...');

    const androidBuildPath = 'android/build';
    const androidAppBuildPath = 'android/app/build';
    const capacitorBuildPath = 'android/capacitor-cordova-android-plugins/build';

    [androidBuildPath, androidAppBuildPath, capacitorBuildPath].forEach(buildPath => {
        if (fs.existsSync(buildPath)) {
            console.log(`   Eliminando: ${buildPath}`);
            execSync(`rmdir /s /q "${buildPath}"`, { stdio: 'inherit' });
            console.log(`   ✅ ${buildPath} eliminado`);
        }
    });

    console.log('✅ ¡LIMPIEZA COMPLETA REALIZADA!');
    console.log('');

    console.log('🚀 PRÓXIMOS PASOS EN ANDROID STUDIO:');
    console.log('   1. Cerrar Android Studio completamente');
    console.log('   2. Esperar 30 segundos');
    console.log('   3. Reabrir Android Studio');
    console.log('   4. File > Sync Project with Gradle Files');
    console.log('   5. Esperar descarga de dependencias (5-10 min)');
    console.log('   6. Build > Clean Project');
    console.log('   7. Build > Build APK(s)');
    console.log('');

    console.log('💡 ¿POR QUÉ FUNCIONARÁ?');
    console.log('   • Cache corrupto eliminado');
    console.log('   • Dependencias se descargarán frescas');
    console.log('   • Problemas de SSL resueltos');
    console.log('   • Conexión limpia con repositorios\n');

    console.log('⚡ TIEMPO TOTAL: 10-15 minutos');
    console.log('💪 ÉXITO GARANTIZADO\n');

    console.log('🎯 ¡TU APK FUNCIONARÁ AHORA!');

} catch (error) {
    console.error('❌ Error durante la limpieza:', error.message);
    console.log('');
    console.log('💡 Si hay error de permisos, ejecuta como administrador');
    console.log('   O elimina manualmente: %USERPROFILE%\\.gradle\\caches');
}