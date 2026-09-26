const fs = require('fs');

const html = fs.readFileSync('C:/Users/ARCH/Desktop/HeartLinkLandingPage/index.html', 'utf8');

const sIdx = html.indexOf('id="screen-discover"');
const eIdx = html.indexOf('id="screen-matches"');

console.log('Between discover and matches:');
console.log(html.substring(eIdx - 200, eIdx + 50));
