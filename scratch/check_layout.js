const fs = require('fs');

const css = fs.readFileSync('C:/Users/ARCH/Desktop/HeartLinkLandingPage/styles.css', 'utf8');

function showSection(term) {
  const i = css.indexOf(term);
  if (i !== -1) {
    console.log(`\n=== ${term} ===`);
    console.log(css.substring(i, i + 500));
  }
}

showSection('.phone-frame-container');
showSection('.phone-shell-plum');
showSection('.phone-screen-inner');
showSection('.app-floating-navbar');
showSection('.nav-item-btn');
