const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(process.cwd(), '.env.local');
console.log('Reading .env.local from:', envPath);

try {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    console.log('FULL URL:', envConfig.NEXT_PUBLIC_SUPABASE_URL);
} catch (e) {
    console.error('Error reading .env.local:', e.message);
}
