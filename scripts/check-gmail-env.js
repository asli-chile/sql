const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

console.log('GMAIL_DELEGATED_USER:', envConfig.GMAIL_DELEGATED_USER);
console.log('GOOGLE_SERVICE_ACCOUNT_EMAIL:', envConfig.GOOGLE_SERVICE_ACCOUNT_EMAIL);
