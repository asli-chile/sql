const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(process.cwd(), '.env.local');
console.log('Reading .env.local from:', envPath);

try {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));

    console.log('Keys found:');
    Object.keys(envConfig).forEach(key => {
        const value = envConfig[key];
        console.log(`${key}: ${value ? (value.length > 10 ? value.substring(0, 5) + '...' : value) : 'EMPTY'}`);
    });

    if (!envConfig.NEXT_PUBLIC_SUPABASE_URL) console.error('MISSING: NEXT_PUBLIC_SUPABASE_URL');
    if (!envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY) console.error('MISSING: NEXT_PUBLIC_SUPABASE_ANON_KEY');

} catch (e) {
    console.error('Error reading .env.local:', e.message);
}
