// Injects the shared footer from _footer.html into every real-estate-silo
// page, replacing whatever <footer>…</footer> is already there.
// Run after editing _footer.html:  node tools/build-footer.js
const fs = require('fs');
const PAGES = ['index.html','our-story.html','blog/index.html',
  'blog/rera-number-verify-project.html','blog/na-plots-vs-apartments-ahmedabad.html',
  'blog/checklist-before-booking-flat-ahmedabad.html'];
const footer = fs.readFileSync('_footer.html', 'utf8').trim();
let n = 0;
for (const p of PAGES) {
  let h = fs.readFileSync(p, 'utf8');
  const before = h;
  if (/<!-- ============ FOOTER[\s\S]*?<\/footer>/.test(h)) {
    h = h.replace(/<!-- ============ FOOTER[\s\S]*?<\/footer>/, footer);
  } else {
    h = h.replace(/<footer class="footer">[\s\S]*?<\/footer>/, footer);
  }
  if (h !== before) { fs.writeFileSync(p, h); n++; }
}
console.log('footer injected into ' + n + '/' + PAGES.length + ' pages');
