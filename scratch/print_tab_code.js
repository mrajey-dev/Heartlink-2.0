const fs = require('fs');

const js = fs.readFileSync('C:/Users/ARCH/Desktop/HeartLinkLandingPage/script.js', 'utf8');
const lines = js.split('\n');
console.log(lines.slice(225, 275).join('\n'));
