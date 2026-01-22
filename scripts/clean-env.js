const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '.env.local');

try {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split(/\r?\n/);
    const envVars = {};

    lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const firstEqual = trimmed.indexOf('=');
            if (firstEqual > 0) {
                const key = trimmed.substring(0, firstEqual).trim();
                const value = trimmed.substring(firstEqual + 1).trim();
                if (/^[A-Z0-9_]+$/.test(key)) {
                    envVars[key] = value;
                }
            }
        }
    });

    // Forzar la URL de producción correcta
    envVars['NEXT_PUBLIC_API_URL'] = 'https://asli.cl';

    let newContent = '# Variables de entorno (Limpiado por Antigravity)\n';
    Object.keys(envVars).sort().forEach(key => {
        newContent += `${key}=${envVars[key]}\n`;
    });

    fs.writeFileSync(envPath, newContent, 'utf8');
    console.log('✅ .env.local actualizado con https://asli.cl');
    console.log('Variables:', Object.keys(envVars).join(', '));
} catch (e) {
    console.error('❌ Error:', e.message);
}
