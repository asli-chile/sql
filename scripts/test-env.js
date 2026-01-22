const path = require('path');
const fs = require('fs');
const envPath = path.join(__dirname, '..', '.env.local');
console.log('Env Path:', envPath);
console.log('Env exists:', fs.existsSync(envPath));

require('dotenv').config({ path: envPath });
console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'OK' : 'MISSING');
