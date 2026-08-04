// Whole-site check. Run: node tools/check.js  [--live]
// Exits non-zero if anything fails, so it can gate a deploy.
const fs = require('fs');
const path = require('path');

const ESTATE = ['index.html','our-story.html','blog/index.html',
  'blog/rera-number-verify-project.html','blog/na-plots-vs-apartments-ahmedabad.html',
  'blog/checklist-before-booking-flat-ahmedabad.html'];
const ALL = [...ESTATE, 'virtual-office/index.html'];
const CLEAN_ROUTES = ['/', '/blog', '/virtual-office', '/our-story'];

const fail = [];
const note = (page, msg) => fail.push(page + ' — ' + msg);

const read = f => fs.readFileSync(f, 'utf8');
const strip = h => h.replace(/<script[\s\S]*?<\/script>/g, '');

for (const p of ALL) {
  const h = read(p);

  // structured data parses
  for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch (e) { note(p, 'invalid JSON-LD: ' + e.message); }
  }

  // tag balance
  for (const t of ['section','article','div','main','figure','ul','ol','dl','table','details','footer','header','nav']) {
    const o = (h.match(new RegExp('<' + t + '[ >]', 'g')) || []).length;
    const c = (h.match(new RegExp('</' + t + '>', 'g')) || []).length;
    if (o !== c) note(p, `unbalanced <${t}> ${o} open / ${c} close`);
  }

  // local references resolve (allowing cleanUrls + fragments)
  for (const m of h.matchAll(/(?:src|href)="(\/[^"]*)"/g)) {
    const f = m[1].split('?')[0].split('#')[0];
    if (!f || CLEAN_ROUTES.includes(f)) continue;
    if (!fs.existsSync('.' + f) && !fs.existsSync('.' + f + '.html')) note(p, 'missing asset ' + f);
  }

  // head essentials
  if (!/rel="canonical"/.test(h)) note(p, 'no canonical');
  if (!/<title>/.test(h)) note(p, 'no <title>');
  const h1 = (h.match(/<h1/g) || []).length;
  if (h1 !== 1) note(p, `h1 count = ${h1}`);

  // heading outline never skips
  const levels = [...h.matchAll(/<h([1-6])/g)].map(m => +m[1]);
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > 1) note(p, `heading jumps h${levels[i-1]} -> h${levels[i]}`);
  }

  // images described and sized
  for (const img of h.match(/<img[^>]*>/g) || []) {
    if (!/alt="[^"]*"/.test(img)) note(p, 'img without alt');
    if (!/width="\d+"/.test(img) || !/height="\d+"/.test(img)) note(p, 'img without width/height');
  }

  // external links safe
  for (const a of h.match(/<a[^>]*target="_blank"[^>]*>/g) || []) {
    if (!/rel="[^"]*noopener/.test(a)) note(p, 'target=_blank without noopener');
  }

  // stale host
  if (/ibc-ahmedabad\.vercel\.app/.test(h)) note(p, 'hardcoded vercel host');
}

// ── estate-silo consistency ────────────────────────────────
const footers = ESTATE.map(p => {
  const m = read(p).match(/<footer class="footer">[\s\S]*?<\/footer>/);
  return m ? m[0] : null;
});
if (footers.some(f => f === null)) note('estate', 'a page has no footer');
else if (new Set(footers).size !== 1) note('estate', 'footers differ between pages');
if (footers[0] && !/href="\/our-story"/.test(footers[0])) note('estate', 'Our Story missing from footer');

for (const p of ESTATE) {
  const h = read(p);
  if (!/jst-properties-logo[-a-z]*\.png/.test(h)) note(p, 'official logo missing');
  if (/brand__mono/.test(h)) note(p, 'replacement monogram still present');
  if (/Captain/i.test(strip(h))) note(p, 'still says "Captain"');
}

// content that must be present
const home = read('index.html'), story = read('our-story.html');
if (!/Redevelopment/.test(home)) note('index.html', 'Redevelopment missing');
if (!/Redevelopment/.test(story)) note('our-story.html', 'Redevelopment missing');
if (!/Ministries of the Government of India/.test(story)) note('our-story.html', 'ministries missing');
if (!/Chandrakant Someshwar Joshi<br>Divyam/.test(story)) note('our-story.html', 'directors not on two lines');
if (/70\+|900\+|1,000\+/.test(strip(home))) note('index.html', 'stale figure (70+/900+/1,000+)');

// css / js integrity
for (const f of ['css/estate.css','css/style.css','css/blog.css','css/story.css']) {
  const c = read(f);
  const o = (c.match(/{/g) || []).length, cl = (c.match(/}/g) || []).length;
  if (o !== cl) note(f, `unbalanced braces ${o}/${cl}`);
  const defined = new Set([...c.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map(m => m[1]));
  const used = new Set([...c.matchAll(/var\((--[a-z0-9-]+)/g)].map(m => m[1]));
  if (f !== 'css/blog.css' && f !== 'css/story.css') {
    for (const v of used) if (!defined.has(v)) note(f, 'undefined css var ' + v);
  }
}

// sitemap covers every page
const sm = read('sitemap.xml');
for (const r of ['/', '/our-story', '/blog', '/virtual-office']) {
  if (!sm.includes('https://www.jstproperties.in' + (r === '/' ? '/' : r) + '<')) note('sitemap.xml', 'missing ' + r);
}

// ── report ────────────────────────────────────────────────
if (fail.length) {
  console.log('FAILURES (' + fail.length + ')');
  fail.forEach(f => console.log('  ✗ ' + f));
  process.exit(1);
}
console.log('all checks passed across ' + ALL.length + ' pages');
