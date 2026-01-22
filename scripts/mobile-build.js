const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno desde .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const appDir = path.join(__dirname, '..', 'app');
const apiDir = path.join(appDir, 'api');
const tempApiDir = path.join(__dirname, '..', 'temp_api_backup');

console.log('🚀 Iniciando proceso de construcción móvil...');

try {
    // 1. Mover app/api fuera de app para que Next.js no lo procese en absoluto
    if (fs.existsSync(apiDir)) {
        console.log('📦 Moviendo carpeta API fuera del proyecto temporalmente...');
        if (fs.existsSync(tempApiDir)) {
            // Limpiar si ya existe por un error previo
            fs.rmSync(tempApiDir, { recursive: true, force: true });
        }
        fs.renameSync(apiDir, tempApiDir);
    }

    // 2. Ejecutar la construcción de Next.js
    console.log('🏗️ Construyendo aplicación Next.js (Static Export)...');
    console.log('📍 API URL:', process.env.NEXT_PUBLIC_API_URL);
    console.log('🔑 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Configurada' : 'MISSING');

    // Usar process.env para pasar la variable de entorno
    const env = { ...process.env, CAPACITOR_BUILD: 'true' };
    execSync('npx next build', { stdio: 'inherit', env });

    console.log('✅ Construcción completada con éxito.');

} catch (error) {
    console.error('❌ Error durante la construcción:', error.message);
    process.exit(1);
} finally {
    // 3. Restaurar la carpeta API
    if (fs.existsSync(tempApiDir)) {
        console.log('🔄 Restaurando carpeta API...');
        if (fs.existsSync(apiDir)) {
            fs.rmSync(apiDir, { recursive: true, force: true });
        }
        fs.renameSync(tempApiDir, apiDir);
    }
}
