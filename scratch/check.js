const fs = require('fs');

try {
  const html = fs.readFileSync('C:/Users/ARCH/Desktop/HeartLinkLandingPage/index.html', 'utf8');
  const js = fs.readFileSync('C:/Users/ARCH/Desktop/HeartLinkLandingPage/script.js', 'utf8');

  console.log('=== Screens in HTML ===');
  let m;
  const screenRe = /id="(screen-[^"]+)"/g;
  while ((m = screenRe.exec(html)) !== null) {
    console.log('Screen:', m[1]);
  }

  console.log('=== Nav items in HTML ===');
  const navRe = /data-tab="([^"]+)"\s+id="([^"]+)"/g;
  while ((m = navRe.exec(html)) !== null) {
    console.log('Nav button:', m[1], m[2]);
  }

  console.log('=== switchTab in script.js ===');
  const switchTabIdx = js.indexOf('function switchTab');
  console.log(js.substring(switchTabIdx, switchTabIdx + 800));

} catch (e) {
  console.error(e);
}
