const fs = require('fs');
const path = require('path');

console.log('🔄 ACTUALIZANDO IMPORTACIONES DE SUPABASE PARA MÓVIL\n');

console.log('📋 ARCHIVOS QUE NECESITAN CAMBIO:');
console.log('   • Los que importan desde @/lib/supabase');
console.log('   • Cambiarán a @/lib/supabase-mobile\n');

// Archivos que necesitan cambio (los que usan @/lib/supabase directamente)
const filesToUpdate = [
    'src/components/modals/EditModal.tsx',
    'src/components/users/UserProfileModal.tsx',
    'src/components/users/UserSelector.tsx',
    'src/lib/migration-utils.ts'
];

console.log('🎯 ACTUALIZANDO ARCHIVOS...\n');

filesToUpdate.forEach(filePath => {
    try {
        const fullPath = path.join(process.cwd(), filePath);
        if (fs.existsSync(fullPath)) {
            let content = fs.readFileSync(fullPath, 'utf8');

            // Cambiar importaciones de supabase a supabase-mobile
            const oldImport = "from '@/lib/supabase'";
            const newImport = "from '@/lib/supabase-mobile'";

            if (content.includes(oldImport)) {
                content = content.replace(new RegExp(oldImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newImport);
                fs.writeFileSync(fullPath, content);
                console.log(`✅ ${filePath} - Importación actualizada`);
            } else {
                console.log(`⚠️  ${filePath} - No se encontró importación para cambiar`);
            }
        } else {
            console.log(`❌ ${filePath} - Archivo no encontrado`);
        }
    } catch (error) {
        console.log(`❌ Error procesando ${filePath}: ${error.message}`);
    }
});

console.log('\n📋 ARCHIVOS QUE YA ESTÁN BIEN:');
console.log('   • Los que usan @/lib/supabase-browser ya funcionan en móvil');
console.log('   • Los que usan @/lib/supabase-server son para API routes\n');

console.log('🚀 PRÓXIMOS PASOS:');
console.log('   1. Reconstruir la app: npm run build:mobile');
console.log('   2. Sincronizar con Capacitor: npx cap sync');
console.log('   3. Abrir Android Studio y hacer Build > Build APK(s)');
console.log('   4. Copiar APK: npm run copy-apk');
console.log('   5. Instalar nuevo APK en tu teléfono\n');

console.log('💡 VERIFICACIÓN:');
console.log('   • Prueba crear un registro en la app móvil');
console.log('   • Ya no deberías ver el error de JSON/HTML');
console.log('   • Las peticiones a Supabase funcionarán correctamente\n');

console.log('🎯 ¡IMPORTACIONES ACTUALIZADAS!');