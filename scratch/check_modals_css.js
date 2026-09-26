const fs = require('fs');

const css = fs.readFileSync('C:/Users/ARCH/Desktop/HeartLinkLandingPage/styles.css', 'utf8');

function findClass(name) {
  console.log('=== ' + name + ' ===');
  const idx = css.indexOf(name);
  if (idx !== -1) {
    console.log(css.substring(idx, idx + 400));
  } else {
    console.log('Not found');
  }
}

findClass('.modal-backdrop-inapp');
findClass('.profile-sheet-overlay');
findClass('.match-popup-overlay');
findClass('#match-celebration-modal');
