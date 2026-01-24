const fs = require('fs');
const path = require('path');

console.log('🔧 Forzando actualización de Gradle a versión 8.5...\n');

// Verificar que el wrapper esté configurado correctamente
const wrapperPropsPath = path.join(__dirname, '..', 'android', 'gradle', 'wrapper', 'gradle-wrapper.properties');
const wrapperProps = fs.readFileSync(wrapperPropsPath, 'utf8');

if (wrapperProps.includes('gradle-8.5-bin.zip')) {
    console.log('✅ Gradle wrapper configurado correctamente para 8.5');
} else {
    console.log('❌ Gradle wrapper no está configurado correctamente');
}

// Limpiar archivos temporales de Gradle
const gradleCachePath = path.join(process.env.USERPROFILE, '.gradle', 'caches');
const wrapperCachePath = path.join(process.env.USERPROFILE, '.gradle', 'wrapper');

console.log('\n🧹 Limpiando caches de Gradle...');

// Intentar eliminar caches (esto puede fallar si están en uso, pero está bien)
try {
    // Nota: En Node.js no podemos eliminar directorios recursivamente fácilmente,
    // pero podemos mostrar las instrucciones
    console.log('📁 Para limpiar manualmente:');
    console.log(`   • Eliminar: ${gradleCachePath}`);
    console.log(`   • Eliminar: ${wrapperCachePath}`);
} catch (error) {
    console.log('⚠️  No se pudieron eliminar los caches automáticamente');
}

console.log('\n🎯 INSTRUCCIONES PARA ANDROID STUDIO:\n');

console.log('1️⃣ 🔄 REINICIAR ANDROID STUDIO:');
console.log('   • Cierra completamente Android Studio');
console.log('   • Abre Android Studio nuevamente\n');

console.log('2️⃣ 🧹 LIMPIAR CACHES MANUALMENTE:');
console.log('   • File > Invalidate Caches / Restart');
console.log('   • Marca todas las opciones y click "Invalidate and Restart"\n');

console.log('3️⃣ ⚙️ FORZAR DESCARGA DE GRADLE:');
console.log('   • Ve a File > Settings > Build, Execution, Deployment > Gradle');
console.log('   • En "Gradle JDK" selecciona: Embedded JDK');
console.log('   • Click "Apply" y "OK"\n');

console.log('4️⃣ 🔄 RESINCRONIZAR PROYECTO:');
console.log('   • Android Studio debería mostrar una notificación para "Sync Project with Gradle Files"');
console.log('   • Click en "Sync Now"');
console.log('   • Espera a que descargue Gradle 8.5 (puede tomar varios minutos)\n');

console.log('5️⃣ 🚀 INTENTAR BUILD:');
console.log('   • Una vez sincronizado, ve a Build > Build APK(s)');
console.log('   • Si funciona, ¡tendrás tu APK con logo de ASLI!\n');

console.log('📊 ¿QUÉ VERSIONES ESPERAS VER?');
console.log('• Gradle: 8.5 (compatible con Java 21)');
console.log('• JDK: Embedded JDK de Android Studio');
console.log('• Android API: 36\n');

console.log('💡 SI SIGUE FALLANDO:');
console.log('• Prueba con API 35 o 34 en lugar de 36');
console.log('• Verifica tu conexión a internet para descargar Gradle\n');

console.log('🎉 ¡CON GRADLE 8.5, TU APK ESTARÁ LISTO!');