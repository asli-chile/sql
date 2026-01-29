const { google } = require('googleapis');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Leer el archivo .env.local manualmente para evitar problemas de parsing de multiline
const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const env = dotenv.parse(envContent);

async function testDelegation() {
    const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL_NEW || env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    let key = env.GOOGLE_SERVICE_ACCOUNT_KEY_NEW || env.GOOGLE_SERVICE_ACCOUNT_KEY;

    console.log('--- DEBUG INFO ---');
    console.log('Email:', email);
    console.log('Key length:', key ? key.length : 0);
    console.log('------------------');

    if (!key) {
        console.error('ERROR: Key is missing!');
        return;
    }

    // Normalizar la clave (manejar escapes de caracteres y comillas)
    const cleanKey = key.replace(/\\n/g, '\n').replace(/"/g, '');

    const subject = 'rodrigo.caceres@asli.cl';

    console.log('Testing delegation for:', subject);

    // IMPORTANTE: Usar objeto de configuración para el constructor JWT
    const auth = new google.auth.JWT({
        email,
        key: cleanKey,
        scopes: ['https://www.googleapis.com/auth/gmail.send', 'https://mail.google.com/'],
        subject: subject
    });

    try {
        const token = await auth.getAccessToken();
        console.log('SUCCESS! Token obtained:', token.token ? 'YES' : 'NO');
    } catch (err) {
        console.error('FAILURE!');
        console.error('Error Message:', err.message);
        if (err.response && err.response.data) {
            console.error('Error Data:', JSON.stringify(err.response.data));
        } else {
            console.log('Consejo: Este error "invalid_grant" es normal hasta que actives la delegación en admin.google.com');
        }
    }
}

testDelegation();
