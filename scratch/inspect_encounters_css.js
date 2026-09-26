const fs = require('fs');

const css = fs.readFileSync('C:/Users/ARCH/Desktop/HeartLinkLandingPage/styles.css', 'utf8');

const sIdx = css.indexOf('.encounters-header');
const eIdx = css.indexOf('/* SCREEN 2: MATCHES (2x2 GRID)', sIdx);

console.log(css.substring(sIdx, eIdx !== -1 ? eIdx : sIdx + 2000));
