const fs = require('fs');

try {
  const css = fs.readFileSync('C:/Users/ARCH/Desktop/HeartLinkLandingPage/styles.css', 'utf8');

  console.log('=== CSS for navbar ===');
  const navIdx = css.indexOf('.app-floating-navbar');
  console.log(css.substring(navIdx, navIdx + 1500));

} catch (e) {
  console.error(e);
}
