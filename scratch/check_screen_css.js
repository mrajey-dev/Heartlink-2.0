const fs = require('fs');

try {
  const css = fs.readFileSync('C:/Users/ARCH/Desktop/HeartLinkLandingPage/styles.css', 'utf8');

  console.log('=== CSS for app-screen ===');
  const screenIdx = css.indexOf('.app-screen');
  console.log(css.substring(screenIdx, screenIdx + 1500));

} catch (e) {
  console.error(e);
}
