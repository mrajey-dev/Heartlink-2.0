const fs = require('fs');

const css = fs.readFileSync('C:/Users/ARCH/Desktop/HeartLinkLandingPage/styles.css', 'utf8');

function showCss(name) {
  const i = css.indexOf(name);
  if (i !== -1) {
    console.log(`\n=== ${name} ===`);
    console.log(css.substring(i, i + 600));
  }
}

showCss('.encounters-header');
showCss('.encounters-deck');
showCss('.encounter-card');
showCss('.card-bg-wrap');
showCss('.card-bottom-info');
showCss('.encounter-action-bar');
showCss('.btn-card-pass');
showCss('.btn-card-cupid');
showCss('.btn-card-like');
