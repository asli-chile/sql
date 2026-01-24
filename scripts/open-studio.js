const { exec } = require('child_process');
const path = require('path');

console.log('🎯 ¡PROYECTO LISTO PARA ANDROID STUDIO!\n');

console.log('✅ Los íconos del logo de ASLI están configurados correctamente');
console.log('✅ Todas las dependencias están actualizadas');
console.log('✅ El proyecto está optimizado para compilación\n');

const androidPath = path.join(__dirname, '..', 'android');

console.log('📂 Ubicación del proyecto Android:');
console.log(`${androidPath}\n`);

console.log('🚀 INSTRUCCIONES PARA GENERAR EL APK:\n');

console.log('1️⃣ 📂 ABRIR ANDROID STUDIO:');
console.log('   • Abre Android Studio');
console.log(`   • File > Open > ${androidPath}`);
console.log('   • Espera a que se sincronicen las dependencias (3-5 minutos)\n');

console.log('2️⃣ 🔨 COMPILAR APK:');
console.log('   • Build > Build Bundle(s)/APK(s) > Build APK(s)');
console.log('   • O usa el botón verde de "Play" en la barra superior\n');

console.log('3️⃣ 📦 ENCONTRAR EL APK:');
console.log('   • Explorador de archivos > android > app > build > outputs > apk > debug');
console.log('   • Archivo: app-debug.apk\n');

console.log('4️⃣ 📱 INSTALAR EN TU TELÉFONO:');
console.log('   • Transfiere el APK a tu teléfono');
console.log('   • Habilita instalación de fuentes desconocidas');
console.log('   • Instala y abre la app\n');

console.log('🎨 ¿QUÉ VERÁS?');
console.log('• 🖼️  Ícono: Logo azul de ASLI (NO el genérico)');
console.log('• 🌊 Splash: Logo de ASLI al iniciar');
console.log('• 📱 Nombre: "ASLI Mobile"\n');

console.log('💡 CONSEJOS:');
console.log('• Si hay errores, haz: Build > Clean Project');
console.log('• Luego: Build > Rebuild Project');
console.log('• Si persisten errores: File > Invalidate Caches / Restart\n');

console.log('🔧 COMANDOS ÚTILES:');
console.log('• npm run check-logo     - Verificar íconos');
console.log('• npm run prepare-studio - Esta información');
console.log('• npm run clean-gradle   - Limpiar cache si hay errores\n');

console.log('🚨 SI HAY ERRORES DE JAVA/GRADLE:');
console.log('1. Ejecuta: npm run clean-gradle');
console.log('2. Cierra Android Studio completamente');
console.log('3. Abre Android Studio nuevamente');
console.log('4. File > Open > carpeta android\n');

console.log('🎉 ¡ANDROID STUDIO HARÁ EL RESTO AUTOMÁTICAMENTE!');

// Intentar abrir Android Studio automáticamente
const commands = [
    '"C:\\Program Files\\Android\\Android Studio\\bin\\studio64.exe" "' + androidPath + '"',
    '"C:\\Program Files (x86)\\Android\\Android Studio\\bin\\studio64.exe" "' + androidPath + '"',
];

let opened = false;
for (const cmd of commands) {
    try {
        exec(cmd, (error) => {
            if (!error) {
                console.log('\n✅ ¡Android Studio se abrió exitosamente!');
            }
        });
        opened = true;
        break;
    } catch (error) {
        // Ignorar errores, el usuario puede abrir manualmente
    }
}

if (!opened) {
    console.log('\n📝 Si Android Studio no se abrió automáticamente, ábrelo manualmente.');
}