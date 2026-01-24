const { execSync } = require('child_process');

console.log('🔍 VERIFICANDO INSTALACIÓN DE JAVA\n');

try {
    // Verificar versión de Java
    console.log('📋 Versión de Java instalada:');
    const javaVersion = execSync('java -version 2>&1', { encoding: 'utf8' });
    console.log(javaVersion);
    console.log('');

    // Verificar si existe Java 17
    console.log('🔎 Buscando Java 17 en el sistema...');

    const java17Paths = [
        'C:\\Program Files\\Eclipse Adoptium\\jdk-17',
        'C:\\Program Files\\Java\\jdk-17',
        'C:\\Program Files\\AdoptOpenJDK\\jdk-17',
        'C:\\Program Files\\OpenJDK\\jdk-17'
    ];

    let java17Found = false;
    for (const path of java17Paths) {
        try {
            execSync(`if exist "${path}" echo "Encontrado: ${path}"`, { encoding: 'utf8' });
            java17Found = true;
            console.log(`✅ Java 17 encontrado en: ${path}`);
            break;
        } catch (e) {
            // Continuar buscando
        }
    }

    if (!java17Found) {
        console.log('❌ Java 17 NO encontrado en ubicaciones comunes');
        console.log('');
        console.log('💡 Necesitas instalar Java 17 para la solución rápida:');
        console.log('• Descargar desde: https://adoptium.net/temurin/releases/');
        console.log('• Elegir: JDK 17 (LTS) para Windows x64');
        console.log('• Instalar en ubicación por defecto');
        console.log('');
        console.log('Después de instalar, ejecuta: npm run quick-fix');
    } else {
        console.log('');
        console.log('✅ ¡Perfecto! Tienes Java 17 instalado');
        console.log('🚀 Puedes proceder con la solución rápida:');
        console.log('   npm run quick-fix');
    }

} catch (error) {
    console.log('❌ Error al verificar Java:', error.message);
    console.log('');
    console.log('💡 Solución: Instala Java 17 desde https://adoptium.net/');
}