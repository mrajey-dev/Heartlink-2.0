const fs = require('fs');

const js = fs.readFileSync('C:/Users/ARCH/Desktop/HeartLinkLandingPage/script.js', 'utf8');

const sIdx = js.indexOf('btnEncPass');
console.log(js.substring(sIdx, sIdx + 800));
