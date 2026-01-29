const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');

try {
    let content = fs.readFileSync(envPath, 'utf8');

    if (content.includes('supabase.com')) {
        console.log('Found incorrect domain (.com), fixing to .co...');
        const newContent = content.replace('supabase.com', 'supabase.co');
        fs.writeFileSync(envPath, newContent);
        console.log('✅ .env.local updated successfully!');
    } else {
        console.log('File already seems correct (no .supabase.com found).');
    }

} catch (e) {
    console.error('Error updating .env.local:', e.message);
}
