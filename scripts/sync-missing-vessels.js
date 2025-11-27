/**
 * Script para sincronizar naves faltantes desde registros a vessel_positions
 * 
 * Uso:
 *   node scripts/sync-missing-vessels.js
 * 
 * Este script llama al endpoint que crea entradas en vessel_positions
 * para todas las naves activas que están en registros pero no en vessel_positions.
 */

const https = require('https');
const http = require('http');

// Configuración
const ENDPOINT_URL = process.env.SYNC_ENDPOINT_URL ||
    'http://localhost:3001/api/vessels/sync-missing-vessels';

console.log('🔄 Sincronizando naves faltantes...\\n');
console.log(`📍 URL: ${ENDPOINT_URL}`);
console.log('');

const url = new URL(ENDPOINT_URL);
const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'sync-vessels-script/1.0',
    },
};

const client = url.protocol === 'https:' ? https : http;

const req = client.request(options, (res) => {
    let data = '';

    console.log(`📊 Status Code: ${res.statusCode}`);
    console.log('');

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        if (res.statusCode === 200) {
            try {
                const json = JSON.parse(data);
                console.log('✅ Éxito! Respuesta del endpoint:');
                console.log(JSON.stringify(json, null, 2));

                if (json.created && json.created.length > 0) {
                    console.log(`\\n✅ ${json.created.length} nave(s) creada(s) en vessel_positions:`);
                    json.created.forEach((name) => {
                        console.log(`   - ${name}`);
                    });
                    console.log('\\n⚠️  IMPORTANTE: Estas naves ahora necesitan configurar su IMO/MMSI');
                    console.log('   para poder obtener sus posiciones desde la API AIS.');
                } else if (json.total_created === 0) {
                    console.log('\\n✅ Todas las naves ya estaban sincronizadas.');
                }
            } catch (e) {
                console.log('📄 Respuesta (texto):');
                console.log(data);
            }
        } else {
            console.log('❌ Error! Respuesta:');
            console.log(data);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Error al hacer la petición:');
    console.error(error);
    process.exit(1);
});

req.end();
