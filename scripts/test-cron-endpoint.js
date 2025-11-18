/**
 * Script para probar el endpoint del cron job manualmente
 * 
 * Uso:
 *   node scripts/test-cron-endpoint.js
 * 
 * Este script prueba si el endpoint funciona correctamente
 * sin necesidad de esperar al cron job programado.
 */

const https = require('https');
const http = require('http');

// Configuración
const ENDPOINT_URL = process.env.CRON_ENDPOINT_URL || 
  'https://registo-de-embarques-asli-toox.vercel.app/api/vessels/update-positions-cron';
const CRON_SECRET = process.env.CRON_SECRET || null;

console.log('🧪 Probando endpoint del cron job...\n');
console.log(`📍 URL: ${ENDPOINT_URL}`);
if (CRON_SECRET) {
  console.log(`🔐 Usando CRON_SECRET: ${CRON_SECRET.substring(0, 4)}...`);
} else {
  console.log('⚠️  No se configuró CRON_SECRET (opcional)');
}
console.log('');

const url = new URL(ENDPOINT_URL);
const options = {
  hostname: url.hostname,
  port: url.port || (url.protocol === 'https:' ? 443 : 80),
  path: url.pathname + url.search,
  method: 'GET',
  headers: {
    'User-Agent': 'test-cron-script/1.0',
  },
};

if (CRON_SECRET) {
  options.headers['Authorization'] = `Bearer ${CRON_SECRET}`;
}

const client = url.protocol === 'https:' ? https : http;

const req = client.request(options, (res) => {
  let data = '';

  console.log(`📊 Status Code: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);
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
        
        if (json.updated && json.updated.length > 0) {
          console.log(`\n✅ ${json.updated.length} buque(s) actualizado(s): ${json.updated.join(', ')}`);
        }
        if (json.failed && json.failed.length > 0) {
          console.log(`\n⚠️  ${json.failed.length} buque(s) fallaron:`);
          json.failed.forEach((f) => {
            console.log(`   - ${f.vessel_name}: ${f.reason}`);
          });
        }
        if (json.missingIdentifiers && json.missingIdentifiers.length > 0) {
          console.log(`\n❌ ${json.missingIdentifiers.length} buque(s) sin IMO/MMSI: ${json.missingIdentifiers.join(', ')}`);
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

