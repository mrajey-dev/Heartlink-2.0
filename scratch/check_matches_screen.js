const fs = require('fs');

const html = fs.readFileSync('C:/Users/ARCH/Desktop/HeartLinkLandingPage/index.html', 'utf8');

const sIdx = html.indexOf('id="screen-matches"');
const eIdx = html.indexOf('<!-- 3. SCREEN 3: CHAT SCREEN', sIdx);
console.log(html.substring(sIdx, eIdx !== -1 ? eIdx : sIdx + 1500));
