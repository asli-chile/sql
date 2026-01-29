const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');
const content = fs.readFileSync(envPath, 'utf8');
const lines = content.split('\n');

console.log('Analyzing .env.local...');
lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (trimmed.startsWith('#')) return;

    if (!trimmed.includes('=')) {
        console.log(`Line ${index + 1} looks suspicious (no =): ${trimmed.substring(0, 50)}...`);
    } else {
        const key = trimmed.split('=')[0].trim();
        console.log(`Found key: ${key}`);
    }
});
