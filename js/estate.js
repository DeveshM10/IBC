/* ═══════════════════════════════════════════════════════════
   JST Properties — real estate silo
   Vanilla. No dependencies. Respects prefers-reduced-motion.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const forceMotion = new URLSearchParams(location.search).has('motion');
  const reduced = !forceMotion &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $  = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  /* ── Reveal on scroll ───────────────────────────────── */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      setTimeout(() => el.classList.add('in'), reduced ? 0 : parseInt(el.dataset.delay || 0, 10));
      io.unobserve(el);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  const observeReveals = () => $$('.reveal:not(.in)').forEach(el => io.observe(el));
  observeReveals();

  /* ── Figures derived from a date, so they never go stale ── */
  function yearsSince(iso) {
    const from = new Date(iso + 'T00:00:00'), now = new Date();
    let y = now.getFullYear() - from.getFullYear();
    const m = now.getMonth() - from.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < from.getDate())) y--;
    return y;
  }
  $$('[data-years-since]').forEach(el => { el.textContent = yearsSince(el.dataset.yearsSince); });

  /* ── Count-up ───────────────────────────────────────── */
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target, target = parseInt(el.dataset.count, 10);
      countIO.unobserve(el);
      if (reduced) { el.textContent = target.toLocaleString('en-IN'); return; }
      const dur = 1600, start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        el.textContent = Math.round(target * eased).toLocaleString('en-IN');
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.5 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* ── Scroll chrome ──────────────────────────────────── */
  const nav = $('#nav'), progress = $('.scroll-progress span'),
        heroImg = $('#heroImg'), fab = $('.fab');
  let ticking = false;
  function onScroll() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    nav.classList.toggle('is-stuck', y > 80);
    if (progress) progress.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
    if (fab) fab.classList.toggle('show', y > window.innerHeight * 0.6);
    if (heroImg && !reduced && y < window.innerHeight * 1.2) {
      heroImg.style.transform = 'translate3d(0,' + (y * 0.26) + 'px,0)';
    }
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  /* ── Hero entrance ──────────────────────────────────── */
  const hero = $('.hero');
  window.addEventListener('load', () => requestAnimationFrame(() => hero && hero.classList.add('ready')));
  setTimeout(() => hero && hero.classList.add('ready'), 400);

  /* ── Mobile menu ────────────────────────────────────── */
  const burger = $('#burger'), menu = $('#mobileMenu');
  if (burger && menu) {
    burger.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    $$('a', menu).forEach(a => a.addEventListener('click', () => {
      menu.classList.remove('open'); burger.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }));
  }

  /* ── Parallax ───────────────────────────────────────── */
  const parallaxEls = $$('[data-parallax]');
  if (parallaxEls.length && !reduced) {
    let pTick = false;
    const update = () => {
      const vh = window.innerHeight;
      parallaxEls.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const prog = (r.top + r.height / 2 - vh / 2) / vh;
        el.style.transform = 'translate3d(0,' + (-prog * (parseFloat(el.dataset.parallax) || 12)).toFixed(2) + 'px,0)';
      });
      pTick = false;
    };
    window.addEventListener('scroll', () => { if (!pTick) { requestAnimationFrame(update); pTick = true; } }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  /* ── Accordion: one open at a time ──────────────────── */
  const items = $$('.acc__item');
  items.forEach(item => item.addEventListener('toggle', () => {
    if (item.open) items.forEach(o => { if (o !== item) o.open = false; });
  }));

  /* ── Projects, rendered from /data/projects.json ─────────
     The grid only appears once there is real inventory in the
     file. Until then the enquiry panel stands in its place, so
     the page never shows an empty shelf or a fake listing.     */
  const grid = $('#projGrid'), filterBar = $('#filters'), panel = $('#inventoryPanel');

  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function card(p) {
    const rows = [
      ['Configuration', p.configuration],
      ['Size',          p.size],
      ['Price',         p.price],
      ['Possession',    p.possession],
      ['RERA',          p.rera]
    ].filter(r => r[1]);

    const msg = encodeURIComponent(
      'Hello JST Properties, I would like details on ' + p.name +
      (p.locality ? ' at ' + p.locality : '') + '.');

    return '<article class="proj" data-segment="' + esc(p.segment || '') + '">' +
      '<div class="proj__body">' +
        '<span class="proj__tag">' + esc(p.segment || '') + (p.type ? ' · ' + esc(p.type) : '') + '</span>' +
        '<h3>' + esc(p.name) + '</h3>' +
        (p.locality ? '<p class="proj__loc">' + esc(p.locality) + '</p>' : '') +
        '<ul class="proj__meta">' +
          rows.map(r => '<li><span>' + esc(r[0]) + '</span><span>' + esc(r[1]) + '</span></li>').join('') +
        '</ul>' +
        '<a class="proj__cta" target="_blank" rel="noopener" href="https://wa.me/916352085740?text=' + msg + '">Enquire about this project →</a>' +
      '</div></article>';
  }

  function render(projects, active) {
    const list = active === 'All' ? projects : projects.filter(p => p.segment === active);
    grid.innerHTML = list.map(card).join('');
    observeReveals();
  }

  fetch('/data/projects.json', { cache: 'no-cache' })
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      const projects = (data && Array.isArray(data.projects) ? data.projects : [])
        .filter(p => p && p.name);
      if (!projects.length) return;            // keep the enquiry panel

      grid.hidden = false;
      if (panel) panel.style.marginTop = '2.5rem';

      const segments = ['All', ...new Set(projects.map(p => p.segment).filter(Boolean))];
      let active = 'All';
      filterBar.innerHTML = segments.map(s =>
        '<button class="filter" type="button" aria-pressed="' + (s === active) + '" data-seg="' + esc(s) + '">' + esc(s) + '</button>'
      ).join('');
      filterBar.addEventListener('click', e => {
        const b = e.target.closest('.filter'); if (!b) return;
        active = b.dataset.seg;
        $$('.filter', filterBar).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        render(projects, active);
      });
      render(projects, active);
    })
    .catch(() => { /* no inventory file yet — the enquiry panel stands */ });

})();
