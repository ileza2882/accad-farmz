import fs from 'fs';

const bundle = fs.readFileSync('dist/assets/index-bundle.js', 'utf8');
console.log('Bundle length:', (bundle.length / 1024).toFixed(1), 'KB');

// Check for unreplaced tokens or broken defines
const problematic = ['process.env.NODE_ENV', 'import.meta.env', '__dirname', 'require('];
for (const p of problematic) {
  const matches = (bundle.match(new RegExp(p.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'g')) || []).length;
  console.log(`Pattern "${p}": ${matches} occurrences`);
}
