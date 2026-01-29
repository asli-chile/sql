const fs = require('fs');
const path = require('path');

try {
    const content = fs.readFileSync(path.join(process.cwd(), '.env.local'));
    console.log(content.toString('base64'));
} catch (e) {
    console.error(e);
}
