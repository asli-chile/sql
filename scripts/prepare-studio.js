const fs = require('fs');
const path = require('path');

console.log('🎯 Preparando proyecto para Android Studio...\n');

// Verificar que todo esté en orden
const checks = [
    {
        name: 'Logo de ASLI',
        path: 'public/LOGO ASLI SIN FONDO AZUL.png',
        required: true
    },
    {
        name: 'Directorio Android',
        path: 'android',
        required: true
    },
    {
        name: 'Archivo build.gradle de Android',
        path: 'android/build.gradle',
        required: true
    },
    {
        name: 'Archivo gradle.properties',
        path: 'android/gradle.properties',
        required: true
    },
    {
        name: 'Ícono mdpi',
        path: 'android/app/src/main/res/mipmap-mdpi/ic_launcher.png',
        required: true
    },
    {
        name: 'Ícono xxxhdpi',
        path: 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png',
        required: true
    }
];

let allGood = true;

checks.forEach(check => {
    const fullPath = path.join(__dirname, '..', check.path);
    const exists = fs.existsSync(fullPath);

    if (check.required && !exists) {
        console.log(`❌ ${check.name}: NO ENCONTRADO`);
        allGood = false;
    } else if (exists) {
        console.log(`✅ ${check.name}: OK`);
    } else {
        console.log(`⚠️  ${check.name}: No requerido`);
    }
});

if (allGood) {
    console.log('\n🎉 ¡Todo está listo para Android Studio!\n');

    console.log('📋 Checklist antes de abrir Android Studio:');
    console.log('1. ✅ Asegúrate de tener Android Studio instalado');
    console.log('2. ✅ Verifica que tengas al menos 4GB de RAM libre');
    console.log('3. ✅ Conexión a internet para descargar dependencias\n');

    console.log('🚀 Pasos en Android Studio:');
    console.log('1. File > Open > Seleccionar carpeta "android" de este proyecto');
    console.log('2. Esperar a que se sincronicen las dependencias (puede tardar 5-10 minutos)');
    console.log('3. Build > Clean Project (opcional)');
    console.log('4. Build > Rebuild Project (opcional)');
    console.log('5. Build > Build Bundle(s)/APK(s) > Build APK(s)');
    console.log('6. El APK se generará en: android/app/build/outputs/apk/debug/app-debug.apk\n');

    console.log('🎯 ¿Qué verás cuando instales el APK?');
    console.log('• Ícono: Logo azul de ASLI (NO el de Android Studio)');
    console.log('• Splash: Logo de ASLI sobre fondo azul');
    console.log('• Nombre: "ASLI Mobile"\n');

    console.log('💡 Consejos:');
    console.log('• Si Android Studio pide actualizar Gradle, acepta');
    console.log('• Si hay errores de dependencias, ve a File > Invalidate Caches / Restart');
    console.log('• El primer build puede tardar más tiempo\n');

} else {
    console.log('\n❌ Hay problemas que necesitan solución antes de continuar.');
    console.log('Ejecuta: npm run fix-icons');
}

console.log('🔧 Comandos útiles:');
console.log('• npm run check-logo    - Verificar estado de íconos');
console.log('• npm run fix-icons     - Regenerar íconos');
console.log('• npm run prepare:apk   - Ver instrucciones\n');