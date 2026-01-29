const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Cargar env vars
const envPath = path.join(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const SERVICE_ACCOUNT_EMAIL = envConfig.GOOGLE_SERVICE_ACCOUNT_EMAIL;
// Usamos explícitamente el correo de Rodrigo
const DELEGATED_USER = 'rodrigo.caceres@asli.cl';
let PRIVATE_KEY = envConfig.GOOGLE_SERVICE_ACCOUNT_KEY;

// Normalizar llave (manejar saltos de línea literales)
if (PRIVATE_KEY) {
    PRIVATE_KEY = PRIVATE_KEY.replace(/\\n/g, '\n');
}

console.log('Testing Gmail Delegation for:', DELEGATED_USER);
console.log('Service Account:', SERVICE_ACCOUNT_EMAIL);

async function test() {
    try {
        const jwtClient = new google.auth.JWT(
            SERVICE_ACCOUNT_EMAIL,
            null,
            PRIVATE_KEY,
            ['https://www.googleapis.com/auth/gmail.readonly'],
            DELEGATED_USER
        );

        console.log('Authorizing...');
        await jwtClient.authorize();
        console.log('✅ Authorization Successful for Rodrigo!');

        const gmail = google.gmail({ version: 'v1', auth: jwtClient });
        const res = await gmail.users.getProfile({ userId: 'me' });
        console.log('✅ Profile retrieved:', res.data.emailAddress);

    } catch (error) {
        console.error('❌ Error authorizing Rodrigo:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

test();
