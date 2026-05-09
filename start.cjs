const path = require('path');
const fs = require('fs');

const entry = path.join(__dirname, 'artifacts', 'api-server', 'dist', 'index.mjs');

console.log('=== AI Academy Startup ===');
console.log('CWD:', process.cwd());
console.log('Entry:', entry);
console.log('Exists:', fs.existsSync(entry));
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);

if (!fs.existsSync(entry)) {
  console.error('ERROR: Entry file not found:', entry);
  console.log('Files in dist:', fs.readdirSync(path.join(__dirname, 'artifacts', 'api-server', 'dist')).join(', '));
  process.exit(1);
}

import(entry).catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
