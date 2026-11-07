/* ExamForge — motion, following Apple's fluid-interface principles:
   • springs instead of fixed curves (see --spring tokens in app.css)
   • things follow your finger 1:1, keep their momentum when you let go, and can be interrupted
   • motion shows where things come from and go to (sliding indicators, shared elements)
   • all of it switches off with "Reduce motion" */
(function () {
  'use strict';
  const EF = window.EF;
  const still = () => EF.reducedMotion();
  const finePointer = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : { matches: false };

  /* ---------- haptics: a light tap on phones that support it ---------- */
  EF.haptic = (kind) => {
    if (still() || !navigator.vibrate) return;
    try { navigator.vibrate(kind === 'error' ? [14, 60, 14] : kind === 'success' ? 14 : 8); } catch (e) { /* ignore */ }
  };

  /* ---------- 1. scroll reveal: content rises into place as it enters, staggered ---------- */
  const REVEAL = '.page-head, .section-head, .grade-head, .dash-tile, .subject-card, .tool, .arena-card, .topic-head, .block, .pager-link, .cta-card, .progress-top > .card, .table-wrap, .danger-zone';
  let io = null;
  EF.reveal = (root) => {
    if (io) { io.disconnect(); io = null; }
    if (still() || !('IntersectionObserver' in window)) return;
    io = new IntersectionObserver((entries) => {
      let n = 0;
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        io.unobserve(el);
        el.style.setProperty('--rv-d', Math.min(n++, 7) * 55 + 'ms');
        el.classList.add('rv-in');
        const done = (ev) => {
          if (ev && ev.target !== el) return;
          el.classList.remove('rv', 'rv-in');
          el.style.removeProperty('--rv-d');
          el.removeEventListener('transitionend', done);
        };
        el.addEventListener('transitionend', done);
        setTimeout(done, 1500);
      });
    }, { rootMargin: '0px 0px -4% 0px', threshold: 0.04 });
    const fold = innerHeight * 0.92;
    root.querySelectorAll(REVEAL).forEach((el) => {
      if (el.parentElement.closest('.rv, .quiz, .cards, .stage, .flip, .bigcard, .hero')) return;
      if (el.getBoundingClientRect().top < fold) return;
      el.classList.add('rv');
      io.observe(el);
    });
  };

  /* ---------- 2. sliding indicators ("ink") for anything with a selected item ---------- */
  const INK = '.seg, .side-nav, .side-topics, .topic-chips, .tabbar';
  const ACTIVE = ':scope > [aria-selected="true"], :scope > [aria-pressed="true"], :scope > .is-active, :scope > li > a.is-active';
  const lastBox = new Map();
  const keyOf = (c) => (c.getAttribute('aria-label') || '') + '|' + c.className.replace(/\b(has-ink|seg-scroll)\b/g, '');
  // position of el inside container c, immune to transforms (walks offsetParents, falls back to rects)
  const offsetIn = (el, c) => {
    let x = 0, y = 0, n = el;
    while (n && n !== c) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    if (n === c) return { x, y };
    const a = el.getBoundingClientRect(), b = c.getBoundingClientRect();
    return { x: a.left - b.left - c.clientLeft + c.scrollLeft, y: a.top - b.top - c.clientTop + c.scrollTop };
  };
  const place = (k, b) => { k.style.transform = `translate(${b.x}px, ${b.y}px)`; k.style.width = b.w + 'px'; k.style.height = b.h + 'px'; };
  function ink(c) {
    let k = c.querySelector(':scope > .ink');
    if (!k) {
      k = document.createElement('span');
      k.className = 'ink';
      k.setAttribute('aria-hidden', 'true');
      c.prepend(k);
      c.classList.add('has-ink');
    }
    const a = c.querySelector(ACTIVE);
    if (!a || !a.offsetWidth) { k.style.opacity = '0'; return; }
    const at = offsetIn(a, c);
    const box = { x: at.x, y: at.y, w: a.offsetWidth, h: a.offsetHeight };
    const key = keyOf(c);
    if (!k.dataset.ready) {
      // a freshly drawn control: glide from where the old one was (if it's the same control re-rendered)
      const prev = lastBox.get(key);
      k.style.transition = 'none';
      place(k, prev && !still() ? prev : box);
      k.getBoundingClientRect();
      k.style.transition = '';
      k.dataset.ready = '1';
    }
    place(k, box);
    k.style.opacity = '1';
    lastBox.set(key, box);
  }
  const pending = new Set();
  let inkRaf = 0;
  const queue = (c) => { if (!c) return; pending.add(c); if (!inkRaf) inkRaf = requestAnimationFrame(flush); };
  function flush() { inkRaf = 0; pending.forEach((c) => { if (c.isConnected) ink(c); }); pending.clear(); }
  EF.inkAll = () => document.querySelectorAll(INK).forEach(queue);
  const mo = new MutationObserver((records) => {
    records.forEach((r) => {
      if (r.type === 'childList') {
        r.addedNodes.forEach((n) => {
          if (n.nodeType !== 1 || n.classList.contains('ink')) return;
          if (n.matches(INK)) queue(n);
          n.querySelectorAll && n.querySelectorAll(INK).forEach(queue);
          queue(n.parentElement && n.parentElement.closest(INK));
        });
      } else if (r.target.nodeType === 1 && !r.target.classList.contains('ink')) {
        queue(r.target.closest(INK) === r.target ? r.target : r.target.parentElement && r.target.parentElement.closest(INK));
      }
    });
  });
  mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-selected', 'aria-pressed', 'class'] });
  let rz = 0;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(EF.inkAll, 80); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(EF.inkAll);

  /* ---------- 3. cards lean towards the cursor, with a soft light sheen ---------- */
  const TILT = '.subject-card, .tool, .arena-card, .tl-card, .person, .stat';
  let tiltEl = null, tiltRaf = 0, tiltEv = null;
  const untilt = (el) => { el.classList.remove('is-tilting'); ['--rx', '--ry', '--mx', '--my'].forEach((v) => el.style.removeProperty(v)); };
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !finePointer.matches || still()) return;
    const el = e.target.closest ? e.target.closest(TILT) : null;
    if (el !== tiltEl) { if (tiltEl) untilt(tiltEl); tiltEl = el; }
    if (!el) return;
    tiltEv = e;
    if (tiltRaf) return;
    tiltRaf = requestAnimationFrame(() => {
      tiltRaf = 0;
      if (!tiltEl) return;
      const r = tiltEl.getBoundingClientRect();
      const px = (tiltEv.clientX - r.left) / r.width, py = (tiltEv.clientY - r.top) / r.height;
      const strength = tiltEl.matches('.subject-card, .arena-card') ? 1 : 0.5;
      tiltEl.style.setProperty('--rx', ((0.5 - py) * 7 * strength).toFixed(2) + 'deg');
      tiltEl.style.setProperty('--ry', ((px - 0.5) * 9 * strength).toFixed(2) + 'deg');
      tiltEl.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      tiltEl.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      tiltEl.classList.add('is-tilting');
    });
  }, { passive: true });
  document.addEventListener('pointerout', (e) => { if (!e.relatedTarget && tiltEl) { untilt(tiltEl); tiltEl = null; } });

  /* ---------- 4. hero: stickers drift with the cursor and the page scroll (depth) ---------- */
  let heroRaf = 0;
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || still()) return;
    const art = document.querySelector('.hero-art');
    if (!art || heroRaf) return;
    heroRaf = requestAnimationFrame(() => {
      heroRaf = 0;
      const r = art.getBoundingClientRect();
      art.style.setProperty('--px', Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2))).toFixed(3));
      art.style.setProperty('--py', Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2))).toFixed(3));
    });
  }, { passive: true });
  let scrollRaf = 0;
  window.addEventListener('scroll', () => {
    if (scrollRaf || still()) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0;
      const art = document.querySelector('.hero-art');
      if (art) art.style.setProperty('--sy', Math.min(scrollY, 900).toFixed(0));
    });
  }, { passive: true });

  /* ---------- 5. the menu drawer follows your finger and keeps its momentum ---------- */
  const sidebar = document.getElementById('sidebar');
  const scrim = document.querySelector('.scrim');
  let drag = null;
  sidebar.addEventListener('pointerdown', (e) => {
    if (!document.body.classList.contains('nav-open') || e.pointerType === 'mouse') return;
    drag = { x: e.clientX, y: e.clientY, dx: 0, t: performance.now(), v: 0, lastX: e.clientX, lastT: performance.now(), on: false, id: e.pointerId };
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.on) {
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) { if (Math.abs(dy) > 10) drag = null; return; }
      drag.on = true;
      sidebar.classList.add('is-dragging'); scrim.classList.add('is-dragging');
    }
    const now = performance.now();
    drag.v = (e.clientX - drag.lastX) / Math.max(1, now - drag.lastT);
    drag.lastX = e.clientX; drag.lastT = now;
    drag.dx = Math.min(0, dx) + Math.max(0, dx) * 0.15; // rubber-band if pulled the wrong way
    sidebar.style.transform = `translateX(${drag.dx}px)`;
    scrim.style.opacity = String(Math.max(0, 1 + drag.dx / sidebar.offsetWidth));
  }, { passive: true });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    if (!d.on) return;
    sidebar.classList.remove('is-dragging'); scrim.classList.remove('is-dragging');
    sidebar.style.transform = ''; scrim.style.opacity = '';
    // a quick flick closes it even if it hasn't travelled far
    if (d.dx < -sidebar.offsetWidth * 0.33 || d.v < -0.45) { EF.closeDrawer && EF.closeDrawer(); EF.haptic(); }
  };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  /* ---------- 6. large title: the subject name tucks into the top bar as you scroll (phones) ---------- */
  const topTitle = document.querySelector('.top-title');
  // the buttons on the right change (profile button, streak digits), so the title measures them
  const topBar = document.querySelector('.topbar'), topActs = document.querySelector('.top-actions');
  if (topTitle && topBar && topActs && 'ResizeObserver' in window) {
    new ResizeObserver(() => {
      const gap = topBar.getBoundingClientRect().right - topActs.getBoundingClientRect().left;
      if (gap > 0) topTitle.style.right = Math.round(gap + 8) + 'px';
    }).observe(topActs);
  }
  EF.watchTitle = (h1, title) => {
    if (!topTitle || !h1 || !('IntersectionObserver' in window)) return () => {};
    topTitle.querySelector('strong').textContent = title;
    const o = new IntersectionObserver(([e]) => {
      document.body.classList.toggle('title-up', !e.isIntersecting && e.boundingClientRect.top < 80);
    }, { rootMargin: '-64px 0px 0px 0px', threshold: 0 });
    o.observe(h1);
    return () => { o.disconnect(); document.body.classList.remove('title-up'); };
  };
  EF.setTitleTopic = (text) => { if (topTitle) topTitle.querySelector('small').textContent = text || ''; };
})();
