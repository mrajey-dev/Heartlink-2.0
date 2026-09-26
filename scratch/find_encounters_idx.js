const fs = require('fs');

const css = fs.readFileSync('C:/Users/ARCH/Desktop/HeartLinkLandingPage/styles.css', 'utf8');

const sIdx = css.indexOf('.encounters-header');
console.log('Index of .encounters-header:', sIdx);
console.log(css.substring(sIdx, sIdx + 1600));
