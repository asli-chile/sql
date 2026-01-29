const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

let key = envConfig.GOOGLE_SERVICE_ACCOUNT_KEY;

if (key) {
    key = key.replace(/\\n/g, '\n');

    try {
        const parsed = JSON.parse(key);
        console.log('='.repeat(60));
        console.log('CLIENT ID DE LA CUENTA DE SERVICIO:');
        console.log('='.repeat(60));
        console.log(parsed.client_id);
        console.log('='.repeat(60));
        console.log('\nEste es el valor que necesitas copiar en Google Admin Console');
    } catch (e) {
        console.error('Error: La clave no es un JSON válido');
    }
}
