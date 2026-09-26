const fs = require('fs');

const js = fs.readFileSync('C:/Users/ARCH/Desktop/HeartLinkLandingPage/script.js', 'utf8');

const sIdx = js.indexOf('// Tapping the card opens profile details sheet!');
console.log(js.substring(sIdx, sIdx + 400));
