const { execSync } = require('child_process');

console.log('🔄 RECONSTRUYENDO APP MÓVIL CON CONFIGURACIÓN DE SUPABASE\n');

console.log('📋 PROCESO COMPLETO:');
console.log('   1. Construir app Next.js');
console.log('   2. Exportar para móvil');
console.log('   3. Sincronizar con Capacitor');
console.log('   4. Preparar para Android Studio\n');

try {
    console.log('📦 Paso 1: Construyendo app Next.js...');
    execSync('npm run build', { stdio: 'inherit' });

    console.log('🔄 Paso 2: Exportando para móvil...');
    execSync('npm run build:mobile', { stdio: 'inherit' });

    console.log('⚡ Paso 3: Sincronizando con Capacitor...');
    execSync('npx cap sync', { stdio: 'inherit' });

    console.log('✅ ¡RECONSTRUCCIÓN COMPLETA!');
    console.log('');
    console.log('🚀 PRÓXIMOS PASOS MANUALES:');
    console.log('   1. Abrir Android Studio');
    console.log('   2. File > Open > android/');
    console.log('   3. Build > Clean Project');
    console.log('   4. Build > Rebuild Project');
    console.log('   5. Build > Build APK(s)');
    console.log('   6. npm run copy-apk');
    console.log('');
    console.log('📱 RESULTADO ESPERADO:');
    console.log('   • APK sin errores de conexión a Supabase');
    console.log('   • Crear registros funcionará correctamente');
    console.log('   • No más error "Unexpected token \'<\'"');

} catch (error) {
    console.error('❌ Error durante la reconstrucción:', error.message);
    console.log('');
    console.log('💡 POSIBLES SOLUCIONES:');
    console.log('   • Verifica que todas las dependencias estén instaladas');
    console.log('   • Asegúrate de que .env.local tenga las variables correctas');
    console.log('   • Revisa que los archivos modificados no tengan errores de sintaxis');
}