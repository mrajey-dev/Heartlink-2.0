const fs = require('fs');

const js = fs.readFileSync('C:/Users/ARCH/Desktop/HeartLinkLandingPage/script.js', 'utf8');
const html = fs.readFileSync('C:/Users/ARCH/Desktop/HeartLinkLandingPage/index.html', 'utf8');

console.log('=== All click handlers in script.js ===');
const lines = js.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('addEventListener') || line.includes('onclick')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
