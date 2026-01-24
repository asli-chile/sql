const { exec } = require('child_process');
const path = require('path');

console.log('🧹 Limpiando cache de Gradle completamente...\n');

// Ejecutar comandos de limpieza
const commands = [
    // Limpiar cache de Gradle
    'rd /s /q "%USERPROFILE%\\.gradle\\caches" 2>nul',
    'rd /s /q "%USERPROFILE%\\.gradle\\wrapper" 2>nul',

    // Limpiar directorios de build
    'rd /s /q android\\.gradle 2>nul',
    'rd /s /q android\\build 2>nul',
    'rd /s /q android\\app\\build 2>nul',
    'rd /s /q android\\capacitor-android\\build 2>nul',

    // Limpiar node_modules si es necesario
    'rd /s /q node_modules\\.cache 2>nul'
];

console.log('Ejecutando comandos de limpieza...\n');

commands.forEach((cmd, index) => {
    console.log(`${index + 1}. ${cmd}`);
    try {
        exec(cmd, { shell: 'cmd.exe' }, (error, stdout, stderr) => {
            if (error) {
                console.log(`   ⚠️  Comando falló (puede ser normal): ${cmd}`);
            } else {
                console.log(`   ✅ Ejecutado: ${cmd}`);
            }
        });
    } catch (error) {
        console.log(`   ❌ Error ejecutando: ${cmd}`);
    }
});

console.log('\n🎯 Después de la limpieza:');
console.log('1. Cierra Android Studio completamente');
console.log('2. Abre Android Studio nuevamente');
console.log('3. File > Open > carpeta "android"');
console.log('4. Espera a que se sincronicen las dependencias (5-10 minutos)');
console.log('5. Build > Build APK(s)');
console.log('\n💡 Android Studio manejará automáticamente las versiones correctas de Java y Gradle.');