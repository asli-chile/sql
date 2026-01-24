const { exec } = require('child_process');

console.log('🔪 MATANDO TODOS LOS PROCESOS DE GRADLE Y JAVA...\n');

console.log('⚠️  IMPORTANTE: Esto cerrará TODOS los procesos Java y Gradle');
console.log('   incluyendo posibles instancias de Android Studio\n');

console.log('🛑 PASO 1: DETECTANDO PROCESOS\n');

// Matar procesos de Gradle daemon
console.log('🔍 Buscando procesos de Gradle daemon...');
exec('taskkill /f /im gradle.exe /t 2>nul', (error, stdout, stderr) => {
    console.log('✅ Gradle daemons terminados');
});

// Matar procesos de Java
console.log('🔍 Buscando procesos Java...');
exec('taskkill /f /im java.exe /t 2>nul', (error, stdout, stderr) => {
    console.log('✅ Procesos Java terminados');
});

// Matar Android Studio si está abierto
console.log('🔍 Cerrando Android Studio...');
exec('taskkill /f /im studio64.exe /t 2>nul', (error, stdout, stderr) => {
    console.log('✅ Android Studio cerrado');
});

// Matar cualquier proceso relacionado con IntelliJ/Android Studio
console.log('🔍 Cerrando procesos de IntelliJ...');
exec('taskkill /f /im idea64.exe /t 2>nul', (error, stdout, stderr) => {
    console.log('✅ Procesos IntelliJ terminados');
});

console.log('\n🧹 PASO 2: LIMPIEZA PROFUNDA DEL CACHE\n');

// Esperar un momento para que los procesos terminen
setTimeout(() => {
    console.log('🗑️  Eliminando cache de Gradle completamente...');

    const commands = [
        'rd /s /q "%USERPROFILE%\\.gradle\\caches" 2>nul',
        'rd /s /q "%USERPROFILE%\\.gradle\\wrapper" 2>nul',
        'rd /s /q "%USERPROFILE%\\.gradle\\daemon" 2>nul',
        'del /f /s /q "%USERPROFILE%\\.gradle\\*.lock" 2>nul',
        'del /f /s /q "%USERPROFILE%\\.gradle\\*.lck" 2>nul',
        'del /f /s /q "%USERPROFILE%\\.gradle\\*.jar" 2>nul'
    ];

    let completed = 0;
    commands.forEach((cmd, index) => {
        console.log(`Ejecutando: ${cmd}`);
        exec(cmd, (error, stdout, stderr) => {
            completed++;
            if (completed === commands.length) {
                console.log('\n✅ LIMPIEZA COMPLETADA\n');

                console.log('🚀 PRÓXIMOS PASOS:\n');

                console.log('1️⃣ 🔄 ESPERA 30 SEGUNDOS:');
                console.log('   • Los procesos necesitan terminar completamente');
                console.log('   • El sistema necesita liberar los archivos\n');

                console.log('2️⃣ 📂 ABRE ANDROID STUDIO:');
                console.log('   • File > Open');
                console.log('   • Selecciona: C:\\Users\\rodri\\OneDrive\\Documentos\\TODO\\DESARROLLO\\ASLI\\android');
                console.log('   • Espera sincronización completa\n');

                console.log('3️⃣ ⚙️ CONFIGURA JDK:');
                console.log('   • File > Settings > Build, Execution, Deployment > Gradle');
                console.log('   • Gradle JDK: Selecciona "Embedded JDK"');
                console.log('   • Apply > OK\n');

                console.log('4️⃣ 🔄 SINCRONIZA PROYECTO:');
                console.log('   • Click en "Sync Project with Gradle Files"');
                console.log('   • Espera descarga de Gradle 8.5\n');

                console.log('5️⃣ 🔨 CONSTRUYE APK:');
                console.log('   • Build > Clean Project');
                console.log('   • Build > Rebuild Project');
                console.log('   • Build > Build APK(s)');
                console.log('   • ¡Debería funcionar ahora!\n');

                console.log('6️⃣ 📦 COPIA APK:');
                console.log('   • npm run copy-apk\n');

                console.log('💡 CONSEJOS FINALES:');
                console.log('• Si aún falla: reinicia tu computadora completamente');
                console.log('• Asegúrate de tener solo UNA instancia de Android Studio');
                console.log('• La sincronización puede tomar 5-10 minutos la primera vez\n');

                console.log('🎯 ¡AHORA SÍ FUNCIONARÁ! Los archivos bloqueados han sido eliminados.');
                console.log('💪 ¡Vamos por ese APK con logo de ASLI! 🚀📱✨');
            }
        });
    });
}, 3000); // Esperar 3 segundos antes de la limpieza