const fs = require('fs');

const html = fs.readFileSync('C:/Users/ARCH/Desktop/HeartLinkLandingPage/index.html', 'utf8');

const sIdx = html.indexOf('<div class="screen-header encounters-header">');
const eIdx = html.indexOf('<!-- Empty Deck State');

console.log(html.substring(sIdx, eIdx));
