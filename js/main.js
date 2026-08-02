/* ═══════════════════════════════════════════════════════════
   IBC Ahmedabad — interactions
   Vanilla. No dependencies. Respects prefers-reduced-motion.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // Honour the OS "reduce motion" setting, but allow ?motion=1 to override it
  // so the site can be previewed with full motion on a machine that has the
  // accessibility preference switched on.
  const forceMotion = new URLSearchParams(location.search).has('motion');
  const reduced = !forceMotion &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (forceMotion) document.documentElement.classList.add('force-motion');
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

  /* ── Elapsed-years figures ──────────────────────────────
     Anything derived from the incorporation date is computed at
     render time, so "N years" can never quietly go stale.        */
  function yearsSince(iso) {
    const from = new Date(iso + 'T00:00:00');
    const now = new Date();
    let years = now.getFullYear() - from.getFullYear();
    const monthDelta = now.getMonth() - from.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < from.getDate())) years--;
    return years;
  }

  $$('[data-years-since]').forEach(el => { el.textContent = yearsSince(el.dataset.yearsSince); });
  $$('[data-count-since]').forEach(el => { el.dataset.count = yearsSince(el.dataset.countSince); });

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

  /* ── Marquee: scroll-reactive ticker ────────────────────
     Driven per-frame rather than by a CSS duration, so the pace stays
     constant regardless of track width — and so scrolling can push it.
     It drifts at a steady readable rate, accelerates and leans with
     scroll momentum, and runs backwards when you scroll up.          */
  const mqTrack = document.querySelector('.marquee__track');
  const mqWrap  = document.querySelector('.marquee');

  // Runs regardless of the reduce-motion preference: it is slow, never
  // flashes, and the pause button below gives an explicit way to stop it.
  if (mqTrack) {
    mqTrack.style.animation = 'none';

    const DRIFT   = 34;   // px per second at rest
    const BOOST   = 13;   // how hard scrolling pushes it
    const MAX_ADD = 320;  // ceiling on scroll-added speed
    const LEAN    = 0.22; // degrees of skew per unit of velocity

    let half = mqTrack.scrollWidth / 2;
    let offset = 0, velocity = 0, hovered = false;
    let lastTime = performance.now(), lastY = window.scrollY;

    const measure = () => { half = mqTrack.scrollWidth / 2; };
    window.addEventListener('resize', measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

    let paused = reduced;   // reduce-motion users start with it stopped

    if (mqWrap) {
      mqWrap.addEventListener('pointerenter', () => { hovered = true; });
      mqWrap.addEventListener('pointerleave', () => { hovered = false; });

      // Explicit pause control — satisfies WCAG 2.2.2 for auto-moving content
      // and gives keyboard and touch users the stop that hover cannot.
      const toggle = document.createElement('button');
      toggle.className = 'marquee__toggle';
      toggle.type = 'button';
      const paint = () => {
        toggle.setAttribute('aria-label', paused ? 'Play the scrolling list' : 'Pause the scrolling list');
        toggle.setAttribute('aria-pressed', String(paused));
        toggle.textContent = paused ? '▶' : '❚❚';
      };
      paint();
      toggle.addEventListener('click', () => { paused = !paused; paint(); });
      mqWrap.appendChild(toggle);
    }

    function tickMarquee(now) {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const y = window.scrollY;
      velocity += ((y - lastY) - velocity) * 0.15;   // smoothed scroll velocity
      lastY = y;

      if (!hovered && !paused && half > 0) {
        const added = Math.min(Math.abs(velocity) * BOOST, MAX_ADD);
        const direction = velocity < -0.4 ? -1 : 1;  // reverse on upward scroll
        offset -= (DRIFT + added) * dt * direction;

        if (offset <= -half) offset += half;
        else if (offset > 0)  offset -= half;
      }

      // No skew while paused, or a reduce-motion user would still see it move.
      const lean = paused ? 0 : Math.max(-7, Math.min(7, velocity * LEAN));
      mqTrack.style.transform =
        'translate3d(' + offset.toFixed(2) + 'px,0,0) skewX(' + lean.toFixed(2) + 'deg)';

      requestAnimationFrame(tickMarquee);
    }
    requestAnimationFrame(tickMarquee);
  }

  /* ── Scroll parallax ────────────────────────────────────
     Elements drift against the scroll as they cross the viewport.
     data-parallax holds the travel distance in pixels.              */
  const parallaxEls = $$('[data-parallax]');

  if (parallaxEls.length && !reduced) {
    let pTicking = false;

    const updateParallax = () => {
      const vh = window.innerHeight;
      parallaxEls.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > vh + 200) return;
        const progress = (rect.top + rect.height / 2 - vh / 2) / vh;
        const travel = parseFloat(el.dataset.parallax) || 12;
        el.style.transform = 'translate3d(0,' + (-progress * travel).toFixed(2) + 'px,0)';
      });
      pTicking = false;
    };

    window.addEventListener('scroll', () => {
      if (!pTicking) { requestAnimationFrame(updateParallax); pTicking = true; }
    }, { passive: true });
    window.addEventListener('resize', updateParallax, { passive: true });
    updateParallax();
  }

  /* ── Accordion: one open at a time ──────────────────── */

  /* ── Accordion: one open at a time ──────────────────── */
  const items = $$('.acc__item');
  items.forEach(item => {
    item.addEventListener('toggle', () => {
      if (!item.open) return;
      items.forEach(other => { if (other !== item) other.open = false; });
    });
  });

})();
