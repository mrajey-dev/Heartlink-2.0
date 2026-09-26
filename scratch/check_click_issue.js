const fs = require('fs');

const html = fs.readFileSync('C:/Users/ARCH/Desktop/HeartLinkLandingPage/index.html', 'utf8');
const js = fs.readFileSync('C:/Users/ARCH/Desktop/HeartLinkLandingPage/script.js', 'utf8');
const css = fs.readFileSync('C:/Users/ARCH/Desktop/HeartLinkLandingPage/styles.css', 'utf8');

console.log('=== Checking Nav Elements ===');
const navRegex = /<button[^>]*class="[^"]*nav-item-btn[^"]*"[^>]*>([\s\S]*?)<\/button>/g;
let match;
while ((match = navRegex.exec(html)) !== null) {
  console.log('--- BUTTON ---');
  console.log(match[0]);
}

console.log('\n=== Checking Date Screen Trigger / Links ===');
const dateRegex = /switchTab\(['"]date['"]\)/g;
while ((match = dateRegex.exec(js)) !== null) {
  const start = Math.max(0, match.index - 100);
  const end = Math.min(js.length, match.index + 100);
  console.log(js.substring(start, end));
}
