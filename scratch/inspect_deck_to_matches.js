const fs = require('fs');

const css = fs.readFileSync('C:/Users/ARCH/Desktop/HeartLinkLandingPage/styles.css', 'utf8');

const sIdx = css.indexOf('.encounters-deck');
const eIdx = css.indexOf('/* ==========================================================================\n   SCREEN 2: MATCHES', sIdx);

console.log(css.substring(sIdx, eIdx));
