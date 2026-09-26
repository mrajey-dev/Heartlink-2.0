const fs = require('fs');

const html = fs.readFileSync('C:/Users/ARCH/Desktop/HeartLinkLandingPage/index.html', 'utf8');

const sIdx = html.indexOf('<div class="encounters-deck"');
const eIdx = html.indexOf('<div class="encounter-action-bar">');

console.log(html.substring(sIdx, eIdx));
