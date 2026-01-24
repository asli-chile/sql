const fs = require('fs');
const path = require('path');

console.log('🔧 Configurando JDK para Android Studio...\n');

const gradlePropsPath = path.join(__dirname, '..', 'android', 'gradle.properties');

console.log('📝 Leyendo configuración actual...\n');

// Leer el archivo actual
let content = '';
try {
    content = fs.readFileSync(gradlePropsPath, 'utf8');
} catch (error) {
    console.log('⚠️  No se pudo leer gradle.properties, creando uno nuevo...\n');
}

console.log('🔄 Actualizando configuración...\n');

// Asegurarse de que no haya configuraciones problemáticas
content = content.replace(/org\.gradle\.java\.home=.*/g, '# org.gradle.java.home removed - use Embedded JDK');
content = content.replace(/# Use Android Studio Embedded JDK.*/g, '');
content = content.replace(/# org\.gradle\.java\.home=.*/g, '');

// Agregar configuración limpia al final
if (!content.includes('# JDK Configuration')) {
    content += '\n# JDK Configuration\n';
    content += '# Android Studio will automatically use its Embedded JDK\n';
    content += '# Do not set org.gradle.java.home manually\n';
}

// Escribir el archivo actualizado
fs.writeFileSync(gradlePropsPath, content.trim() + '\n');

console.log('✅ Configuración actualizada!\n');

console.log('🎯 INSTRUCCIONES PARA ANDROID STUDIO:\n');

console.log('1. 📂 File > Project Structure');
console.log('2. 🔧 Selecciona "SDK Location" en el panel izquierdo');
console.log('3. 📋 En "Gradle JDK" (abajo), selecciona:');
console.log('   • Embedded JDK (recomendado)');
console.log('   • O: "C:\\Program Files\\Android\\Android Studio\\jbr"\n');

console.log('4. 🖱️ Click "Apply" luego "OK"\n');

console.log('5. 🔄 File > Invalidate Caches / Restart\n');

console.log('6. 🚀 Ahora intenta: Build > Build APK(s)\n');

console.log('💡 Si aún hay problemas:');
console.log('• Cierra Android Studio completamente');
console.log('• Ejecuta: npm run clean-gradle');
console.log('• Abre Android Studio nuevamente\n');

console.log('🎉 ¡El JDK embebido de Android Studio es la opción más confiable!');