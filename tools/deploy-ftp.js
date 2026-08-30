/* ═══════════════════════════════════════════════════════════
   Upload the site to shared hosting over FTP.

   Setup, once:
     1. copy .ftp.example.json  ->  .ftp.json
     2. fill in host / user / password
     3. npm install basic-ftp

   Then, every time:
     node tools/deploy-ftp.js            upload everything
     node tools/deploy-ftp.js --dry      list what would upload, send nothing
     node tools/deploy-ftp.js --list     show what is already on the server (read-only)

   .ftp.json is gitignored. The password stays on this machine.
   ═══════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry');

// --list connects and shows what is already on the server, uploading nothing.
// Read-only, so it is safe to run before deciding where the files go.
//   node tools/deploy-ftp.js --list
//   node tools/deploy-ftp.js --list /public_html
const LIST = process.argv.includes('--list');
const LIST_PATH = LIST ? (process.argv[process.argv.indexOf('--list') + 1] || null) : null;

// --code-only sends markup, styles, scripts and config but no media.
// Useful for a first connection test. NOTE: the site will render without
// its logo, photographs or favicons until the media is uploaded too.
const CODE_ONLY = process.argv.includes('--code-only');
const MEDIA = /\.(jpe?g|png|svg|gif|webp|pdf|mp4|ico|woff2?)$/i;

// A dry run only lists files, so it needs neither the FTP client nor
// credentials — you can check the manifest before setting anything up.
let ftp, cfg;
if (!DRY || LIST) {
  try { ftp = require('basic-ftp'); }
  catch { console.error('Missing dependency. Run:  npm install basic-ftp'); process.exit(1); }

  try { cfg = JSON.parse(fs.readFileSync('.ftp.json', 'utf8')); }
  catch { console.error('No .ftp.json found. Copy .ftp.example.json to .ftp.json and fill it in.'); process.exit(1); }
}

// Only these go to the server. Everything else — tooling, source config,
// the footer partial, the local dev server — stays here.
const INCLUDE_DIRS  = ['assets', 'blog', 'css', 'data', 'js', 'virtual-office'];
const INCLUDE_FILES = [
  'index.html', 'our-story.html',
  'robots.txt', 'sitemap.xml', '.htaccess',
  'favicon.svg', 'favicon.png', 'favicon-jst.svg', 'favicon-jst.png',
  'apple-touch-icon.png'
];
const SKIP = /(^\.git|node_modules|^\.vercel|^\.env|^\.ftp|^_|^tools$|^serve\.js$|^vercel\.json$|^sync-faq-schema\.js$|^README\.md$|\.DS_Store|Thumbs\.db)/;

// Files kept in the repo but not referenced by any page. Shipping them over
// FTP would cost 10 MB per upload for nothing — the video alone is 10 MB and
// appears on no page. Print/brand assets and superseded images stay local.
const NOT_ON_SERVER = new Set([
  'assets/video/tour.mp4',
  'assets/logo.pdf',
  'assets/jst-properties-logo.png',   // superseded by the paper-backed version
  'assets/jst-mark.svg',
  'assets/img/chandrakant-v4.jpeg',   // superseded by p-chandrakant
  'assets/img/divyam-v6.jpeg',        // superseded by p-divyam
  'assets/brand/jst-monogram.svg',
  'assets/brand/jst-emblem-gold.svg',   'assets/brand/jst-emblem-silver.svg',
  'assets/brand/jst-split-gold.svg',    'assets/brand/jst-split-silver.svg',
  'assets/brand/jst-stacked-gold.svg',  'assets/brand/jst-stacked-silver.svg'
]);

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP.test(name)) continue;
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else out.push(p.split(path.sep).join('/'));
  }
  return out;
}

const files = [
  ...INCLUDE_FILES.filter(f => fs.existsSync(f)),
  ...INCLUDE_DIRS.filter(d => fs.existsSync(d)).flatMap(d => walk(d))
].filter(f => !NOT_ON_SERVER.has(f))
 .filter(f => !CODE_ONLY || !MEDIA.test(f));

const bytes = files.reduce((n, f) => n + fs.statSync(f).size, 0);
console.log(files.length + ' files, ' + (bytes / 1024 / 1024).toFixed(2) + ' MB' + (CODE_ONLY ? '   [code only — no media]' : ''));

if (DRY && !LIST) {
  files.forEach(f => console.log('  ' + f));
  console.log('\nDry run — nothing uploaded.');
  process.exit(0);
}

async function connect(client) {
  // Try encrypted first. Plain FTP sends the password in clear text, so if we
  // fall back, say so loudly rather than doing it silently.
  try {
    await client.access({ host: cfg.host, user: cfg.user, password: cfg.password, secure: true });
    console.log('connected over FTPS (encrypted)');
  } catch (e) {
    console.log('FTPS unavailable on this server (' + e.message.split('\n')[0] + ')');
    console.log('WARNING: using plain FTP — the password is sent unencrypted.');
    await client.access({ host: cfg.host, user: cfg.user, password: cfg.password, secure: false });
    console.log('connected over plain FTP');
  }
}

if (LIST) {
  // Read-only. Shows what is already on the server so we can see whether
  // anything would be overwritten, and which directory is the web root.
  (async () => {
    const client = new ftp.Client(30000);
    await connect(client);
    const probe = LIST_PATH ? [LIST_PATH] : ['/', '/public_html', '/htdocs', '/www'];
    for (const p of probe) {
      try {
        const items = await client.list(p);
        console.log('\n' + p + '   (' + items.length + ' items)');
        items.slice(0, 40).forEach(i => console.log(
          '   ' + (i.isDirectory ? 'DIR  ' : '     ') + i.name.padEnd(38) +
          (i.isDirectory ? '' : (i.size / 1024).toFixed(0) + ' KB')));
        if (items.length > 40) console.log('   … and ' + (items.length - 40) + ' more');
      } catch (e) {
        console.log('\n' + p + '   — not accessible (' + e.message.split('\n')[0] + ')');
      }
    }
    console.log('\nRead-only. Nothing was uploaded or changed.');
    client.close();
  })().catch(e => { console.error('FAILED: ' + e.message); process.exit(1); });

} else {

(async () => {
  const client = new ftp.Client(30000);
  client.ftp.verbose = false;
  const root = cfg.remoteRoot || '/public_html';

  await connect(client);

  let done = 0;
  for (const f of files) {
    const remote = root + '/' + f;
    await client.ensureDir(path.posix.dirname(remote));
    await client.cd('/');
    await client.uploadFrom(f, remote);
    done++;
    process.stdout.write('\r  uploaded ' + done + '/' + files.length + '  ' + f.padEnd(50).slice(0, 50));
  }
  console.log('\ndone — ' + done + ' files uploaded to ' + root);
  client.close();
})().catch(e => { console.error('\nFAILED: ' + e.message); process.exit(1); });

}
