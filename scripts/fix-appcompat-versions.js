const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 FIJANDO VERSIONES DE APPCOMPAT PARA AGP 7.4.2\n');

console.log('📋 CONFIGURANDO VERSIONES COMPATIBLES...');

// Versiones probadas y estables para AGP 7.4.2
const variablesContent = `ext {
    minSdkVersion = 24
    compileSdkVersion = 34
    targetSdkVersion = 34
    androidxActivityVersion = '1.7.0'
    androidxAppCompatVersion = '1.6.1'
    androidxCoordinatorLayoutVersion = '1.2.0'
    androidxCoreVersion = '1.12.0'
    androidxFragmentVersion = '1.5.7'
    coreSplashScreenVersion = '1.0.1'
    androidxWebkitVersion = '1.9.0'
    junitVersion = '4.13.2'
    androidxJunitVersion = '1.1.5'
    androidxEspressoCoreVersion = '3.5.1'
    cordovaAndroidVersion = '10.1.1'
}`;

try {
    // Actualizar variables.gradle con versiones compatibles
    fs.writeFileSync('android/variables.gradle', variablesContent);
    console.log('✅ Variables actualizadas a versiones compatibles');

    // Limpiar cache de Gradle completamente
    console.log('🧹 Limpiando cache de Gradle...');
    const gradleCachePath = path.join(process.env.USERPROFILE, '.gradle', 'caches');
    if (fs.existsSync(gradleCachePath)) {
        execSync(`rmdir /s /q "${gradleCachePath}"`, { stdio: 'inherit' });
        console.log('✅ Cache de Gradle limpiado');
    }

    // Limpiar build del proyecto
    console.log('🧹 Limpiando build del proyecto...');
    const buildPath = 'android/build';
    if (fs.existsSync(buildPath)) {
        execSync(`rmdir /s /q "${buildPath}"`, { stdio: 'inherit' });
        console.log('✅ Build del proyecto limpiado');
    }

    const appBuildPath = 'android/app/build';
    if (fs.existsSync(appBuildPath)) {
        execSync(`rmdir /s /q "${appBuildPath}"`, { stdio: 'inherit' });
        console.log('✅ Build de la app limpiado');
    }

    console.log('✅ ¡VERSIONES FIJADAS Y CACHE LIMPIO!');
    console.log('');
    console.log('🚀 AHORA EN ANDROID STUDIO:');
    console.log('   • File > Invalidate Caches > Invalidate and Restart');
    console.log('   • Esperar descarga completa de dependencias');
    console.log('   • Build > Clean Project');
    console.log('   • Build > Rebuild Project');
    console.log('   • Build > Build APK(s)');
    console.log('');
    console.log('💪 ¡AHORA DEBE FUNCIONAR!');

} catch (error) {
    console.error('❌ Error:', error.message);
    console.log('💡 Intenta ejecutar manualmente: rmdir /s /q %USERPROFILE%\\.gradle\\caches');
}