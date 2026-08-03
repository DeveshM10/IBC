// Regenerates the FAQPage schema from the visible accordion so the two can
// never drift apart. Run after editing any FAQ copy:  node sync-faq-schema.js
const fs = require('fs');
const FILE = 'index.html';
let html = fs.readFileSync(FILE, 'utf8');

const clean = s => s
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/\s+/g, ' ')
  .replace(/\s+([.,;:!?])/g, '$1')      // tag stripping leaves " ." artefacts
  .trim();

const pairs = [...html.matchAll(/<summary>([\s\S]*?)<\/summary>\s*<div>([\s\S]*?)<\/div>/g)]
  .map(m => ({ q: clean(m[1]), a: clean(m[2]) }));

if (!pairs.length) throw new Error('no FAQ pairs found');

const m = html.match(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/);
const data = JSON.parse(m[2]);
const faq = data['@graph'].find(n => n['@type'] === 'FAQPage');

faq.mainEntity = pairs.map(p => ({
  '@type': 'Question',
  name: p.q,
  acceptedAnswer: { '@type': 'Answer', text: p.a }
}));

html = html.replace(m[0], m[1] + '\n' + JSON.stringify(data, null, 2) + '\n' + m[3]);
fs.writeFileSync(FILE, html);
console.log('synced ' + pairs.length + ' questions from the visible accordion');
