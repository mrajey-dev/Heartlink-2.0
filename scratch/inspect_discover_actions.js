const fs = require('fs');

const html = fs.readFileSync('C:/Users/ARCH/Desktop/HeartLinkLandingPage/index.html', 'utf8');
const start = html.indexOf('<!-- Empty Deck State');
const end = html.indexOf('<!-- 2. SCREEN 2: MATCHES', start);

console.log(html.substring(start, end !== -1 ? end : start + 1500));
