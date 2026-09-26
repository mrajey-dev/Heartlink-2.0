const fs = require('fs');

const html = fs.readFileSync('C:/Users/ARCH/Desktop/HeartLinkLandingPage/index.html', 'utf8');

const eIdx = html.indexOf('<!-- SCREEN 2: MATCHES');
console.log(html.substring(eIdx - 300, eIdx));
