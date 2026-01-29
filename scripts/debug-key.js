const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const key = envConfig.GOOGLE_SERVICE_ACCOUNT_KEY;

console.log('Key type:', typeof key);
console.log('Key length:', key ? key.length : 0);
console.log('First 20 chars:', key ? key.substring(0, 20) : 'N/A');
console.log('Is empty string?', key === '');
console.log('Is undefined?', key === undefined);
