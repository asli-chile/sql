const fs = require('fs');
const path = require('path');

console.log('🔧 CONFIGURANDO VARIABLES DE ENTORNO PARA APK MÓVIL\n');

console.log('📋 PROBLEMA IDENTIFICADO:');
console.log('   • La app móvil no puede acceder a variables de entorno');
console.log('   • Las peticiones a Supabase fallan porque no hay configuración');
console.log('   • Error: "Unexpected token \'<\', "<!DOCTYPE "... is not valid JSON"');
console.log('   • Esto ocurre porque recibe HTML en lugar de JSON\n');

console.log('💡 SOLUCIÓN:');
console.log('   • Crear configuración específica para entorno móvil');
console.log('   • Incluir variables de Supabase directamente en el código');
console.log('   • Configurar Capacitor para usar estas variables\n');

// Verificar si existe .env.local
const envPath = path.join(process.cwd(), '.env.local');
let supabaseUrl = '';
let supabaseAnonKey = '';

try {
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
        const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

        if (urlMatch) supabaseUrl = urlMatch[1].replace(/['"]/g, '');
        if (keyMatch) supabaseAnonKey = keyMatch[1].replace(/['"]/g, '');
    }
} catch (error) {
    console.log('⚠️  No se pudo leer .env.local');
}

if (!supabaseUrl || !supabaseAnonKey) {
    console.log('❌ No se encontraron variables de Supabase');
    console.log('💡 SOLUCIÓN MANUAL:');
    console.log('   1. Crea un archivo src/lib/supabase-mobile.ts');
    console.log('   2. Copia tu configuración de Supabase ahí');
    console.log('   3. Importa desde supabase-mobile en lugar de supabase');
    console.log('');
    console.log('   Ejemplo:');
    console.log('   ```typescript');
    console.log('   import { createClient } from \'@supabase/supabase-js\';');
    console.log('   ');
    console.log('   const supabaseUrl = \'TU_URL_AQUI\';');
    console.log('   const supabaseAnonKey = \'TU_KEY_AQUI\';');
    console.log('   ');
    console.log('   export const supabase = createClient(supabaseUrl, supabaseAnonKey);');
    console.log('   ```');
    process.exit(1);
}

console.log('✅ Variables encontradas:');
console.log(`   • URL: ${supabaseUrl}`);
console.log(`   • Key: ${supabaseAnonKey.substring(0, 20)}...\n`);

// Crear archivo de configuración móvil
const mobileConfigPath = 'src/lib/supabase-mobile.ts';
const mobileConfig = `// Configuración específica para app móvil (APK)
// Este archivo contiene las variables hardcodeadas para evitar problemas con variables de entorno

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = '${supabaseUrl}';
const supabaseAnonKey = '${supabaseAnonKey}';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('❌ ERROR: Configuración de Supabase no encontrada para entorno móvil');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false // Importante para apps móviles
  }
});
`;

fs.writeFileSync(mobileConfigPath, mobileConfig);
console.log('✅ Archivo src/lib/supabase-mobile.ts creado\n');

console.log('🔄 PRÓXIMOS PASOS:');
console.log('   1. Busca en tu código dónde importas supabase');
console.log('   2. Cambia: import { supabase } from \'../lib/supabase\'');
console.log('   3. Por:    import { supabase } from \'../lib/supabase-mobile\'');
console.log('   4. Reconstruye el APK: npm run build:mobile');
console.log('   5. Instala el nuevo APK en tu teléfono\n');

console.log('🎯 COMPONENTES QUE PUEDEN NECESITAR CAMBIO:');
console.log('   • src/components/forms/RegistroForm.tsx');
console.log('   • src/components/auth/LoginForm.tsx');
console.log('   • Cualquier componente que use Supabase\n');

console.log('💡 CONSEJO:');
console.log('   Usa "Buscar en archivos" (Ctrl+Shift+F) para encontrar');
console.log('   todas las importaciones de supabase y cambiarlas.\n');

console.log('🚀 ¡LISTO PARA FUNCIONAR EN MÓVIL!');