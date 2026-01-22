const fs = require('fs');
const path = require('path');
try {
    const content = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
    console.log('---START---');
    console.log(content);
    console.log('---END---');
} catch (e) {
    console.error(e);
}
