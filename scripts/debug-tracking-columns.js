const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function debugColumns() {
    const envPath = path.join(process.cwd(), '.env.local');
    const content = fs.readFileSync(envPath, 'utf8');

    const urlMatch = content.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
    const keyMatch = content.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

    const supabaseUrl = urlMatch[1].trim().replace(/['"]/g, '');
    const supabaseKey = keyMatch[1].trim().replace(/['"]/g, '');

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('--- Debugging Columns of "registros" ---');

    // First, try to get one record to see keys
    const { data, error } = await supabase
        .from('registros')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching records:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns found in a record:', Object.keys(data[0]));
        console.log('First record sample:', data[0]);
    } else {
        console.log('No records found to inspect.');
    }
}

debugColumns();
