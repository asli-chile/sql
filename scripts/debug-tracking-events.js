const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function debugTrackingTable() {
    const envPath = path.join(process.cwd(), '.env.local');
    const content = fs.readFileSync(envPath, 'utf8');

    const urlMatch = content.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
    const keyMatch = content.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

    const supabaseUrl = urlMatch[1].trim().replace(/['"]/g, '');
    const supabaseKey = keyMatch[1].trim().replace(/['"]/g, '');

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('--- Debugging "shipment_tracking_events" ---');

    // 1. Try to fetch from the table
    const { data, error } = await supabase
        .from('shipment_tracking_events')
        .select('*')
        .limit(1);

    if (error) {
        console.log('❌ Error fetching from shipment_tracking_events:');
        console.log('Message:', error.message);
        console.log('Details:', error.details);
        console.log('Code:', error.code);
        console.log('Full Error:', JSON.stringify(error, null, 2));
    } else {
        console.log('✅ Success! Table exists.');
        if (data && data.length > 0) {
            console.log('Sample data:', data[0]);
        } else {
            console.log('Table is empty.');
        }
    }

    // 2. Check if table actually exists in the schema (if possible)
    console.log('\n--- Checking Table Existence via Select Count ---');
    const { count, error: countError } = await supabase
        .from('shipment_tracking_events')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.log('❌ Count Error:', countError.message);
    } else {
        console.log('✅ Count Success:', count);
    }
}

debugTrackingTable();
