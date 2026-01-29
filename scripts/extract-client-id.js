const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(process.cwd(), '.env.local');
try {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    let keyString = envConfig.GOOGLE_SERVICE_ACCOUNT_KEY;

    if (!keyString) {
        console.log('Error: GOOGLE_SERVICE_ACCOUNT_KEY no encontrada en .env.local');
        process.exit(1);
    }

    // Intentar limpiar la cadena si tiene escapes
    // A veces el valor en .env tiene saltos de línea literales \n
    const cleanedKey = keyString.replace(/\\n/g, '\n');

    try {
        const keyJson = JSON.parse(cleanedKey);
        console.log('CLIENT_ID_START');
        console.log(keyJson.client_id);
        console.log('CLIENT_ID_END');
    } catch (parseError) {
        // Si falla el parse, tal vez sea un JSON parcial o tenga comillas extra
        // Intentar buscar el client_id con regex
        const match = cleanedKey.match(/"client_id"\s*:\s*"([^"]+)"/);
        if (match) {
            console.log('CLIENT_ID_START');
            console.log(match[1]);
            console.log('CLIENT_ID_END');
        } else {
            console.log('Error: No se pudo parsear el JSON ni encontrar el client_id con regex.');
            console.log('Raw key snippet:', cleanedKey.substring(0, 100));
        }
    }
} catch (e) {
    console.log('Error leyendo el archivo:', e.message);
}
