const fs = require('fs');

const html = fs.readFileSync('C:/Users/ARCH/Desktop/HeartLinkLandingPage/index.html', 'utf8');
const navIdx = html.indexOf('app-floating-navbar');
console.log(html.substring(navIdx - 1500, navIdx));
