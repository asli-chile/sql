const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function testConnection() {
    console.log('🧪 Testing Supabase Connection...');

    const envPath = path.join(process.cwd(), '.env.local');
    const content = fs.readFileSync(envPath, 'utf8');

    const urlMatch = content.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
    const keyMatch = content.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

    if (!urlMatch || !keyMatch) {
        console.error('❌ Could not find Supabase keys in .env.local via regex');
        return;
    }

    const supabaseUrl = urlMatch[1].trim().replace(/['"]/g, '');
    const supabaseKey = keyMatch[1].trim().replace(/['"]/g, '');

    console.log(`URL: ${supabaseUrl}`);
    console.log(`Key: ${supabaseKey.substring(0, 10)}...`);

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        console.log('📡 Pinging Supabase...');
        const { data, error } = await supabase.from('registros').select('count', { count: 'exact', head: true });

        if (error) {
            console.error('❌ Supabase Error:', error.message);
            console.error('Details:', error);
        } else {
            console.log('✅ Connection Successful!');
            console.log('Data:', data);
        }
    } catch (e) {
        console.error('❌ Exception:', e.message);
    }
}

testConnection();
