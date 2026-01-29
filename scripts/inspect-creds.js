const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

console.log('EMAIL:', envConfig.GOOGLE_SERVICE_ACCOUNT_EMAIL);
const key = envConfig.GOOGLE_SERVICE_ACCOUNT_KEY;
console.log('KEY STARTS WITH:', key ? key.substring(0, 50) : 'N/A');
console.log('KEY ENDS WITH:', key ? key.substring(key.length - 50) : 'N/A');
console.log('KEY LENGTH:', key ? key.length : 0);
console.log('IS KEY JSON?', key ? key.trim().startsWith('{') : 'N/A');
