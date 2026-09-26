const fs = require('fs');

const html = fs.readFileSync('C:/Users/ARCH/Desktop/HeartLinkLandingPage/index.html', 'utf8');
const start = html.indexOf('<div class="encounter-action-bar">');
const end = html.indexOf('</div>', start + 400);

console.log(html.substring(start, end + 10));
