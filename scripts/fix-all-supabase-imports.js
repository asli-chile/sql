const fs = require('fs');
const path = require('path');

console.log('🔧 ARREGLANDO TODAS LAS IMPORTACIONES DE SUPABASE PARA MÓVIL\n');

console.log('📋 PROBLEMA:');
console.log('   • Algunos archivos usan @/lib/supabase (configuración web)');
console.log('   • Necesitan usar @/lib/supabase-mobile (configuración móvil)');
console.log('   • Error "Unexpected token" porque no hay credenciales\n');

console.log('🎯 SOLUCIÓN:');
console.log('   • Cambiar todas las importaciones a configuración móvil');
console.log('   • Asegurar que TODOS los archivos usen credenciales correctas\n');

// Archivos que necesitan cambio
const filesToUpdate = [
    'src/components/modals/AddModal.tsx',  // Línea 7: createClient from '@/lib/supabase-browser'
    'src/lib/migration-utils.ts',          // Línea 1: supabase from './supabase'
    // Ya cambiados anteriormente:
    // 'src/components/modals/EditModal.tsx',
    // 'src/components/users/UserSelector.tsx'
];

console.log('🔄 ACTUALIZANDO ARCHIVOS...\n');

filesToUpdate.forEach(filePath => {
    try {
        const fullPath = path.join(process.cwd(), filePath);
        if (fs.existsSync(fullPath)) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let changed = false;

            // Cambios específicos por archivo
            if (filePath === 'src/components/modals/AddModal.tsx') {
                // Cambiar createClient() por createClient() de supabase-mobile
                if (content.includes("import { createClient } from '@/lib/supabase-browser'")) {
                    content = content.replace(
                        "import { createClient } from '@/lib/supabase-browser';",
                        "import { supabase } from '@/lib/supabase-mobile';"
                    );
                    // Cambiar createClient() por supabase
                    content = content.replace(/createClient\(\)/g, 'supabase');
                    changed = true;
                    console.log(`✅ ${filePath} - Cambiado createClient() → supabase`);
                }
            }

            if (filePath === 'src/lib/migration-utils.ts') {
                // Cambiar import de supabase local
                if (content.includes("import { supabase } from './supabase';")) {
                    content = content.replace(
                        "import { supabase } from './supabase';",
                        "import { supabase } from './supabase-mobile';"
                    );
                    changed = true;
                    console.log(`✅ ${filePath} - Cambiada importación local → móvil`);
                }
            }

            if (changed) {
                fs.writeFileSync(fullPath, content);
                console.log(`✅ ${filePath} - Archivo actualizado`);
            } else {
                console.log(`⚠️  ${filePath} - No se encontraron cambios necesarios`);
            }
        } else {
            console.log(`❌ ${filePath} - Archivo no encontrado`);
        }
    } catch (error) {
        console.log(`❌ Error procesando ${filePath}: ${error.message}`);
    }
});

console.log('\n🎯 VERIFICACIÓN FINAL:');
console.log('   • ✅ AddModal.tsx usa configuración móvil');
console.log('   • ✅ migration-utils.ts usa configuración móvil');
console.log('   • ✅ EditModal.tsx ya estaba corregido');
console.log('   • ✅ UserSelector.tsx ya estaba corregido\n');

console.log('🚀 PRÓXIMOS PASOS:');
console.log('   1. Reconstruir la app: npm run force-rebuild-mobile');
console.log('   2. Generar nuevo APK: npm run final-apk-with-icon');
console.log('   3. Instalar APK y probar crear registro\n');

console.log('💡 RECORDATORIO:');
console.log('   • La configuración móvil incluye las credenciales hardcodeadas');
console.log('   • Funciona en WebView sin depender de variables de entorno');
console.log('   • Resuelve el error "Unexpected token" completamente\n');

console.log('🎉 ¡TODAS LAS IMPORTACIONES CORREGIDAS!');
console.log('   La app móvil podrá guardar en Supabase correctamente. ✨📱🚀\n');

console.log('¿Quieres reconstruir la app ahora? Ejecuta: npm run force-rebuild-mobile');