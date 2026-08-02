/* ═══════════════════════════════════════════════════════════
   IBC Ahmedabad — interactions
   Vanilla. No dependencies. Respects prefers-reduced-motion.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $  = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  /* ── Split headings into masked words ───────────────── */
  function splitWords(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(node => {
      const parts = node.nodeValue.split(/(\s+)/);
      if (!parts.length) return;
      const frag = document.createDocumentFragment();
      parts.forEach(part => {
        if (!part.trim()) { frag.appendChild(document.createTextNode(part)); return; }
        const outer = document.createElement('span');
        outer.className = 'w';
        const inner = document.createElement('i');
        inner.textContent = part;
        outer.appendChild(inner);
        frag.appendChild(outer);
      });
      node.parentNode.replaceChild(frag, node);
    });

    // stagger the reveal of each word
    $$('.w > i', el).forEach((i, n) => { i.style.transitionDelay = (n * 34) + 'ms'; });
  }

  if (!reduced) $$('.split').forEach(splitWords);

  /* ── Reveal on scroll ───────────────────────────────── */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const delay = parseInt(el.dataset.delay || 0, 10);
      setTimeout(() => el.classList.add('in'), reduced ? 0 : delay);
      io.unobserve(el);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  $$('.reveal, .split').forEach(el => io.observe(el));

  /* ── Count-up numbers ───────────────────────────────── */
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.count, 10);
      countIO.unobserve(el);

      if (reduced) { el.textContent = target; return; }

      const dur = 1600;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / dur, 1);
        // easeOutExpo
        const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        el.textContent = Math.round(target * eased);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.5 });

  $$('[data-count]').forEach(el => countIO.observe(el));

  /* ── Scroll-driven chrome ───────────────────────────── */
  const nav      = $('#nav');
  const progress = $('.scroll-progress span');
  const heroImg  = $('#heroImg');
  const fab      = $('.fab');
  let ticking = false;

  function onScroll() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;

    nav.classList.toggle('is-stuck', y > 80);
    if (progress) progress.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
    if (fab) fab.classList.toggle('show', y > window.innerHeight * 0.6);

    // hero parallax
    if (heroImg && !reduced && y < window.innerHeight * 1.2) {
      heroImg.style.transform = 'translate3d(0,' + (y * 0.28) + 'px,0)';
    }
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  /* ── Hero entrance ──────────────────────────────────── */
  window.addEventListener('load', () => {
    requestAnimationFrame(() => $('.hero').classList.add('ready'));
  });
  // fallback if load already fired / images cached
  setTimeout(() => $('.hero') && $('.hero').classList.add('ready'), 400);

  /* ── Mobile menu ────────────────────────────────────── */
  const burger = $('#burger');
  const menu   = $('#mobileMenu');
  if (burger && menu) {
    burger.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      burger.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    $$('a', menu).forEach(a => a.addEventListener('click', () => {
      menu.classList.remove('open');
      burger.classList.remove('open');
      document.body.style.overflow = '';
    }));
  }

  /* ── Gallery: drag + wheel to scroll horizontally ───── */
  const gallery = $('#gallery');
  if (gallery) {
    let down = false, startX = 0, startScroll = 0;

    gallery.addEventListener('pointerdown', (e) => {
      down = true;
      startX = e.clientX;
      startScroll = gallery.scrollLeft;
      gallery.classList.add('dragging');
      gallery.setPointerCapture(e.pointerId);
    });
    gallery.addEventListener('pointermove', (e) => {
      if (!down) return;
      gallery.scrollLeft = startScroll - (e.clientX - startX);
    });
    ['pointerup', 'pointercancel'].forEach(ev =>
      gallery.addEventListener(ev, () => { down = false; gallery.classList.remove('dragging'); })
    );

    // vertical wheel → horizontal pan, but only while there is room to move
    gallery.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const max = gallery.scrollWidth - gallery.clientWidth;
      const next = gallery.scrollLeft + e.deltaY;
      if (next > 0 && next < max) {
        e.preventDefault();
        gallery.scrollLeft = next;
      }
    }, { passive: false });
  }

  /* ── Magnetic buttons ───────────────────────────────── */
  if (!reduced && window.matchMedia('(pointer:fine)').matches) {
    $$('.magnetic').forEach(btn => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        btn.style.transform = 'translate(' + x * 0.16 + 'px,' + y * 0.22 + 'px)';
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }

  /* ── Accordion: one open at a time ──────────────────── */
  const items = $$('.acc__item');
  items.forEach(item => {
    item.addEventListener('toggle', () => {
      if (!item.open) return;
      items.forEach(other => { if (other !== item) other.open = false; });
    });
  });

})();
