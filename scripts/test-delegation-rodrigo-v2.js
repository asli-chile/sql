const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const SERVICE_ACCOUNT_EMAIL = envConfig.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const DELEGATED_USER = 'rodrigo.caceres@asli.cl';
let PRIVATE_KEY = envConfig.GOOGLE_SERVICE_ACCOUNT_KEY;

if (PRIVATE_KEY) {
    PRIVATE_KEY = PRIVATE_KEY.replace(/\\n/g, '\n');
}

console.log('Testing Gmail Delegation for:', DELEGATED_USER);

async function test() {
    try {
        // Usar objeto de opciones en lugar de argumentos posicionales
        const jwtClient = new google.auth.JWT({
            email: SERVICE_ACCOUNT_EMAIL,
            key: PRIVATE_KEY,
            scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
            subject: DELEGATED_USER
        });

        console.log('Authorizing...');
        await jwtClient.authorize();
        console.log('✅ Authorization Successful for Rodrigo!');

    } catch (error) {
        console.error('❌ Error authorizing Rodrigo:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

test();
