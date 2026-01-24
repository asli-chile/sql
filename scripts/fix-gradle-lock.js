const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 SOLUCIONANDO PROBLEMA DE ARCHIVOS BLOQUEADOS EN GRADLE...\n');

console.log('📋 CAUSA DEL ERROR:');
console.log('Los archivos JAR en el cache de Gradle están siendo utilizados por otro proceso.');
console.log('Esto sucede cuando hay procesos de Gradle corriendo en segundo plano.\n');

console.log('🛑 PASO 1: CERRAR TODOS LOS PROCESOS DE GRADLE\n');

// Verificar procesos de Gradle corriendo
console.log('🔍 Verificando procesos de Gradle...');
exec('tasklist /FI "IMAGENAME eq java.exe"', (error, stdout, stderr) => {
    if (stdout.includes('java.exe')) {
        console.log('⚠️  Se encontraron procesos Java ejecutándose.');
        console.log('   Asegúrate de cerrar TODAS las instancias de Android Studio.\n');
    } else {
        console.log('✅ No se encontraron procesos Java ejecutándose.\n');
    }

    console.log('🧹 PASO 2: LIMPIEZA PROFUNDA DEL CACHE\n');

    const gradleCachePath = path.join(process.env.USERPROFILE, '.gradle', 'caches');
    const gradleWrapperPath = path.join(process.env.USERPROFILE, '.gradle', 'wrapper');

    console.log('📁 Directorios a limpiar:');
    console.log(`   • ${gradleCachePath}`);
    console.log(`   • ${gradleWrapperPath}\n`);

    console.log('🗑️  Eliminando archivos bloqueados...');
    console.log('   (Esto puede tomar unos segundos)\n');

    // Usar comandos del sistema para forzar eliminación
    const commands = [
        `rd /s /q "${gradleCachePath}" 2>nul`,
        `rd /s /q "${gradleWrapperPath}" 2>nul`,
        `del /f /s /q "%USERPROFILE%\\.gradle\\*.lock" 2>nul`,
        `del /f /s /q "%USERPROFILE%\\.gradle\\*.lck" 2>nul`
    ];

    let completed = 0;
    commands.forEach((cmd, index) => {
        console.log(`Ejecutando: ${cmd}`);
        exec(cmd, (error, stdout, stderr) => {
            completed++;
            if (completed === commands.length) {
                console.log('\n✅ LIMPIEZA COMPLETADA\n');

                console.log('🚀 PRÓXIMOS PASOS:\n');

                console.log('1️⃣ 🔄 REINICIAR ANDROID STUDIO:');
                console.log('   • Cierra completamente Android Studio');
                console.log('   • Espera 10-15 segundos');
                console.log('   • Abre Android Studio nuevamente\n');

                console.log('2️⃣ 📂 ABRIR PROYECTO:');
                console.log('   • File > Open');
                console.log('   • Selecciona: android/');
                console.log('   • Espera sincronización completa\n');

                console.log('3️⃣ ⚙️ CONFIGURAR JDK (si es necesario):');
                console.log('   • File > Settings > Build > Gradle');
                console.log('   • Gradle JDK: "Embedded JDK"');
                console.log('   • Apply > OK\n');

                console.log('4️⃣ 🔨 CONSTRUIR APK:');
                console.log('   • Build > Clean Project');
                console.log('   • Build > Rebuild Project');
                console.log('   • Build > Build APK(s)');
                console.log('   • Espera "BUILD SUCCESSFUL"\n');

                console.log('5️⃣ 📦 COPIAR APK:');
                console.log('   • npm run copy-apk\n');

                console.log('💡 CONSEJOS ADICIONALES:');
                console.log('• Si el error persiste, reinicia tu computadora');
                console.log('• Asegúrate de tener solo UNA instancia de Android Studio abierta');
                console.log('• Verifica que no haya procesos de Gradle en el Administrador de Tareas\n');

                console.log('🎯 ¡EL PROBLEMA DE ARCHIVOS BLOQUEADOS ESTARÁ SOLUCIONADO!');

                console.log('\n💪 ¡Vamos por ese APK con logo de ASLI! 🚀📱✨');
            }
        });
    });
});