/* ExamForge core — helpers, saved progress, theme, speech, toasts, confetti */
(function () {
  'use strict';
  const EF = (window.EF = window.EF || {});
  EF.subjects = EF.subjects || [];

  /* ---------- tiny helpers ---------- */
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  EF.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);
  EF.strip = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  EF.icon = (name, extra) => `<i class="fa-solid ${name}${extra ? ' ' + extra : ''}" aria-hidden="true"></i>`;
  EF.$ = (sel, root) => (root || document).querySelector(sel);
  EF.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  EF.shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  // built-in subjects first, then the student's own sets (see learn.js)
  EF.subject = (id) => EF.subjects.find((s) => s.id === id) || (EF.sets ? EF.sets.get(id) : undefined);
  EF.reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Subject icons — one consistent hand-drawn SVG set (emoji render differently on every device;
     Windows even shows the French flag as the letters "FR"). 24×24, drawn with currentColor. */
  const SUBJECT_ICONS = {
    religion: '<path class="f" d="M3 6.6c2.6-1.3 5.6-1.2 9 .9 3.4-2.1 6.4-2.2 9-.9V19c-2.6-1.3-5.6-1.2-9 .9-3.4-2.1-6.4-2.2-9-.9Z"/><path d="M3 6.6c2.6-1.3 5.6-1.2 9 .9 3.4-2.1 6.4-2.2 9-.9V19c-2.6-1.3-5.6-1.2-9 .9-3.4-2.1-6.4-2.2-9-.9Z"/><path d="M12 7.5v12.3"/><path d="M12 1.8v2.4M7.6 3l1.2 1.6M16.4 3l-1.2 1.6"/>',
    french: '<path d="M12 1.8v2.4M10.4 4.2h3.2"/><path d="M10.9 4.2 9.3 12.6 5.6 21.2M13.1 4.2l1.6 8.4 3.7 8.6"/><path d="M10.2 8.6h3.6M8.4 12.6h7.2M6.9 16.6h10.2"/><path class="f" d="M9.6 21.2c0-2.1 1.1-3.3 2.4-3.3s2.4 1.2 2.4 3.3Z"/><path d="M9.6 21.2c0-2.1 1.1-3.3 2.4-3.3s2.4 1.2 2.4 3.3M4.5 21.2h15"/>',
    chemistry: '<ellipse cx="12" cy="12" rx="9.6" ry="3.7"/><ellipse cx="12" cy="12" rx="9.6" ry="3.7" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9.6" ry="3.7" transform="rotate(-60 12 12)"/><circle class="s" cx="12" cy="12" r="1.9"/>',
    biology: '<path d="M7 2.5c0 4.7 10 4.8 10 9.5S7 16.8 7 21.5M17 2.5c0 4.7-10 4.8-10 9.5s10 4.8 10 9.5"/><path d="M8.4 5.6h7.2M10.2 8.6h3.6M10.2 15.4h3.6M8.4 18.4h7.2"/>',
    pe: '<circle class="s" cx="15.4" cy="4.4" r="2.1"/><path d="M14.2 8.2 11 13.1l3.2 2.5-1.4 5.6M11 13.1l-2.5 3.5-3.9-.2M13.8 8.9l3.2 2.4 2.7-1.2M13.6 8.6l-3.8-.2-2.1 2.4"/>',
    business: '<path d="M3 20.6h18"/><path class="f" d="M5 20.6v-4.8h3.2v4.8M10.4 20.6v-7.8h3.2v7.8M15.8 20.6V9.6H19v11"/><path d="M5 20.6v-4.8h3.2v4.8M10.4 20.6v-7.8h3.2v7.8M15.8 20.6V9.6H19v11"/><path d="M3.6 11.6 9 6.4l3.2 2.8 6.6-6.4M15.6 2.8h3.2V6"/>',
    history: '<path class="f" d="M2.8 9.2 12 3.6l9.2 5.6Z"/><path d="M2.8 9.2 12 3.6l9.2 5.6ZM4.4 11h15.2"/><path d="M6.4 11v6.4M10.1 11v6.4M13.9 11v6.4M17.6 11v6.4"/><path d="M4.4 17.8h15.2M3 20.6h18"/>',
    // extra icons for new subjects (Grade 10 and beyond)
    physics: '<path class="f" d="M13 2.5 5 13.5h6l-1 8 8-11h-6Z"/><path d="M13 2.5 5 13.5h6l-1 8 8-11h-6Z"/>',
    science: '<path class="f" d="M10.4 3v5.6L4.8 18.4A1.8 1.8 0 0 0 6.4 21h11.2a1.8 1.8 0 0 0 1.6-2.6l-5.6-9.8V3Z"/><path d="M9.5 3h5M10.4 3v5.6L4.8 18.4A1.8 1.8 0 0 0 6.4 21h11.2a1.8 1.8 0 0 0 1.6-2.6l-5.6-9.8V3M7.4 14.4h9.2"/>',
    math: '<path d="M4 7.6c2-1.6 4-1.6 6-1.3l9.6-.4"/><path d="M9.2 6.4 7.6 19.6M15.4 6.2c-.6 5.2-.2 10 2.4 13.2"/>',
    english: '<path class="f" d="M20 3.5C12 4 6.6 9.6 5.6 18.4l1.2.8C9 16 12.6 13 20 3.5Z"/><path d="M20 3.5C12 4 6.6 9.6 5.6 18.4M4 20.5l2.6-2.6M10 13.6l3.2.2"/>',
    geography: '<circle class="f" cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3Z"/>',
    it: '<rect class="f" x="4.5" y="5" width="15" height="10.5" rx="1.5"/><rect x="4.5" y="5" width="15" height="10.5" rx="1.5"/><path d="M2.5 19h19M9.6 8.8l-2 1.6 2 1.6M14.4 8.8l2 1.6-2 1.6"/>',
    art: '<path class="f" d="M12 3a9 9 0 1 0 0 18c1.4 0 1.8-1 1.4-2-.5-1.2.1-2.4 1.6-2.4H17a4 4 0 0 0 4-4C21 7 17 3 12 3Z"/><path d="M12 3a9 9 0 1 0 0 18c1.4 0 1.8-1 1.4-2-.5-1.2.1-2.4 1.6-2.4H17a4 4 0 0 0 4-4C21 7 17 3 12 3Z"/><circle class="s" cx="7.6" cy="11" r="1.2"/><circle class="s" cx="10.4" cy="7.2" r="1.2"/><circle class="s" cx="15" cy="7.6" r="1.2"/>',
    social: '<circle class="f" cx="8.5" cy="7.6" r="2.8"/><circle cx="8.5" cy="7.6" r="2.8"/><circle cx="16.4" cy="8.6" r="2.3"/><path d="M3.2 19.6c.4-3.7 2.5-5.8 5.3-5.8s4.9 2.1 5.3 5.8M14.2 14.3c.7-.5 1.5-.7 2.3-.7 2.4 0 4.1 1.8 4.4 5"/>',
    study: '<path class="f" d="M2.5 9 12 4.5 21.5 9 12 13.5Z"/><path d="M2.5 9 12 4.5 21.5 9 12 13.5ZM6.5 11v4.6c3.3 2.4 7.7 2.4 11 0V11M21.5 9v5.5"/>'
  };
  // a subject can pick an icon with `iconKey`; "chemistry-g10" falls back to the chemistry icon
  const iconKey = (id) => {
    const s = EF.subject(id);
    const base = String(id).replace(/[-_](g|grade)?\d+$/i, '');
    return [s && s.iconKey, id, base].find((k) => k && SUBJECT_ICONS[k]) || 'study';
  };
  EF.subjectIcon = (id, cls) => `<svg class="sicon${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${SUBJECT_ICONS[iconKey(id)]}</svg>`;

  /* Progress ring as inline SVG (pct 0–100) */
  EF.ring = (pct, size = 56, stroke = 6, label) => {
    const p = Math.max(0, Math.min(100, Math.round(pct || 0)));
    const r = (size - stroke) / 2;
    return `<span class="ring" style="--size:${size}px" role="img" aria-label="${p}% complete">
      <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
        <circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" fill="none"/>
        ${p > 0 ? `<circle class="ring-fill" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" fill="none" pathLength="100" style="--p:${p}" transform="rotate(-90 ${size / 2} ${size / 2})"/>` : ''}
      </svg><span class="ring-label">${label != null ? label : `<span data-count="${p}">${p}</span>%`}</span></span>`;
  };

  /* Count numbers up from 0 when they appear (skipped for reduced motion) */
  EF.countUp = (root) => {
    if (EF.reducedMotion()) return;
    (root || document).querySelectorAll('[data-count]').forEach((el) => {
      const to = parseFloat(el.dataset.count);
      if (!(to > 0)) return;
      const t0 = performance.now(), dur = 700 + Math.min(500, to * 4);
      el.textContent = '0';
      const step = (now) => {
        const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(to * e);
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  };

  /* ---------- events ---------- */
  const listeners = {};
  EF.on = (evt, fn) => { (listeners[evt] = listeners[evt] || []).push(fn); };
  EF.emit = (evt, data) => { (listeners[evt] || []).forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } }); };

  /* ---------- safe localStorage ---------- */
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode — ignore */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };
  EF.ls = ls;

  /* ---------- saved progress ---------- */
  const KEY = 'ef2:state';
  const dayKey = (d) => {
    const x = d || new Date();
    return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
  };
  const fresh = () => ({ visited: {}, quiz: {}, cards: {}, seen: {}, mistakes: [], days: [], last: null, answered: 0, correct: 0, xp: 0, xpDays: {}, match: {} });
  // Spaced repetition: after a card reaches box n, it is due again after this many days
  const DUE_DAYS = [0, 0, 1, 3, 7, 16];
  let state = fresh();
  try { state = Object.assign(fresh(), JSON.parse(ls.get(KEY) || '{}')); } catch (e) { state = fresh(); }
  let saveTimer = null;
  const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => ls.set(KEY, JSON.stringify(state)), 120); };
  window.addEventListener('pagehide', () => { clearTimeout(saveTimer); ls.set(KEY, JSON.stringify(state)); });

  const store = {
    state: () => state,
    touchDay() {
      const t = dayKey();
      if (!state.days.includes(t)) {
        state.days.push(t);
        state.days = state.days.slice(-120);
        save();
        EF.emit('streak', store.streak());
      }
    },
    streak() {
      const set = new Set(state.days);
      const d = new Date();
      if (!set.has(dayKey(d))) d.setDate(d.getDate() - 1); // still alive if you studied yesterday
      let n = 0;
      while (set.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
      return n;
    },
    studiedOn: (d) => state.days.includes(dayKey(d)),
    /* XP: every bit of studying earns some, and today's total fills the daily-goal ring */
    addXP(n) {
      if (!(n > 0)) return;
      const t = dayKey(), before = state.xpDays[t] || 0;
      state.xp = (state.xp || 0) + n;
      state.xpDays[t] = before + n;
      const keys = Object.keys(state.xpDays).sort();
      if (keys.length > 90) keys.slice(0, keys.length - 90).forEach((k) => delete state.xpDays[k]);
      save();
      EF.emit('xp', { n, today: before + n, before, goal: store.goal() });
    },
    xp: () => state.xp || 0,
    xpToday: () => state.xpDays[dayKey()] || 0,
    goal: () => +ls.get('ef2:goal') || 50,
    setGoal(g) { ls.set('ef2:goal', String(g)); EF.emit('xp', { n: 0, today: store.xpToday(), before: store.xpToday(), goal: g }); },
    level(xp) {
      const x = xp == null ? store.xp() : xp;
      const lvl = Math.floor(Math.sqrt(x / 40)) + 1, from = 40 * (lvl - 1) * (lvl - 1), to = 40 * lvl * lvl;
      return { lvl, from, to, pct: Math.round(((x - from) / (to - from)) * 100) };
    },
    /* cards due for review today (Leitner boxes + the time each card was last seen) */
    due(sid) {
      const s = EF.subject(sid);
      if (!s || !s.flashcards) return [];
      const boxes = state.cards[sid] || {}, seen = state.seen[sid] || {}, now = Date.now();
      return s.flashcards.filter((c) => { const b = boxes[c[0]] || 0; return b > 0 && now - (seen[c[0]] || 0) >= DUE_DAYS[b] * 864e5 - 36e5; });
    },
    bestMatch: (sid) => state.match[sid] || 0,
    setMatch(sid, ms) { const old = state.match[sid] || 0; if (!old || ms < old) { state.match[sid] = ms; save(); return true; } return false; },
    markVisited(sid, tid) {
      const v = (state.visited[sid] = state.visited[sid] || []);
      if (!v.includes(tid)) { v.push(tid); save(); EF.emit('progress', sid); store.addXP(5); }
      store.touchDay();
    },
    setLast(sid, tid) { state.last = { s: sid, t: tid, at: Date.now() }; save(); },
    answer(key, ok) {
      state.answered++;
      if (ok) {
        state.correct++;
        state.mistakes = state.mistakes.filter((k) => k !== key);
      } else if (!state.mistakes.includes(key)) {
        state.mistakes.push(key);
      }
      save();
      store.addXP(ok ? 10 : 2);
      store.touchDay();
    },
    recordQuiz(id, pct) {
      const q = (state.quiz[id] = state.quiz[id] || { best: 0, last: 0, attempts: 0 });
      q.last = pct; q.best = Math.max(q.best, pct); q.attempts++;
      save(); EF.emit('progress', id);
      return q;
    },
    quiz: (id) => state.quiz[id] || null,
    cardBox: (sid, key) => ((state.cards[sid] || {})[key] || 0),
    setCardBox(sid, key, box, quiet) {
      const prev = (state.cards[sid] || {})[key] || 0;
      (state.cards[sid] = state.cards[sid] || {})[key] = box;
      (state.seen[sid] = state.seen[sid] || {})[key] = Date.now();
      save(); store.touchDay(); EF.emit('progress', sid);
      if (!quiet) store.addXP(box > prev ? 4 : 1);
    },
    mastered(sid) {
      const s = EF.subject(sid);
      if (!s || !s.flashcards) return 0;
      const boxes = state.cards[sid] || {};
      return s.flashcards.filter((c) => (boxes[c[0]] || 0) >= 3).length;
    },
    progress(sid) {
      const s = EF.subject(sid);
      const total = s ? s.topics.length : 0;
      const ids = s ? s.topics.map((t) => t.id) : [];
      const visited = (state.visited[sid] || []).filter((t) => ids.includes(t)).length;
      const best = (state.quiz[sid] || {}).best || 0;
      const cards = s && s.flashcards ? s.flashcards.length : 0;
      const mastered = store.mastered(sid);
      // Reading 40%, best quiz score 40%, flashcards mastered 20%
      const pct = total ? Math.round((visited / total) * 40 + best * 0.4 + (cards ? (mastered / cards) * 20 : 0)) : 0;
      return { visited, total, best, cards, mastered, pct, attempts: (state.quiz[sid] || {}).attempts || 0 };
    },
    overall() {
      if (!EF.subjects.length) return 0;
      return Math.round(EF.subjects.reduce((sum, s) => sum + store.progress(s.id).pct, 0) / EF.subjects.length);
    },
    reset() { state = fresh(); ls.set(KEY, JSON.stringify(state)); EF.emit('progress'); EF.emit('streak', 0); },
    /* Combine a backup from the cloud with this device: keep the best of both, never lose progress */
    merge(r) {
      if (!r || typeof r !== 'object') return;
      const obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
      const arr = (x) => (Array.isArray(x) ? x : []);
      state.xp = Math.max(state.xp || 0, +r.xp || 0);
      Object.entries(obj(r.xpDays)).forEach(([d, n]) => { state.xpDays[d] = Math.max(state.xpDays[d] || 0, +n || 0); });
      state.days = Array.from(new Set(state.days.concat(arr(r.days).filter((d) => typeof d === 'string')))).sort().slice(-120);
      Object.entries(obj(r.visited)).forEach(([s, list]) => { state.visited[s] = Array.from(new Set((state.visited[s] || []).concat(arr(list)))); });
      Object.entries(obj(r.quiz)).forEach(([id, q]) => {
        const a = state.quiz[id] || { best: 0, last: 0, attempts: 0 }; q = obj(q);
        state.quiz[id] = { best: Math.max(a.best, +q.best || 0), last: a.attempts >= (+q.attempts || 0) ? a.last : +q.last || 0, attempts: Math.max(a.attempts, +q.attempts || 0) };
      });
      Object.entries(obj(r.cards)).forEach(([s, boxes]) => { const m = (state.cards[s] = state.cards[s] || {}); Object.entries(obj(boxes)).forEach(([k, b]) => { m[k] = Math.max(m[k] || 0, Math.min(5, +b || 0)); }); });
      Object.entries(obj(r.seen)).forEach(([s, seen]) => { const m = (state.seen[s] = state.seen[s] || {}); Object.entries(obj(seen)).forEach(([k, t]) => { m[k] = Math.max(m[k] || 0, +t || 0); }); });
      Object.entries(obj(r.match)).forEach(([s, ms]) => { ms = +ms || 0; if (ms && (!state.match[s] || ms < state.match[s])) state.match[s] = ms; });
      state.mistakes = Array.from(new Set(state.mistakes.concat(arr(r.mistakes).filter((k) => typeof k === 'string'))));
      state.answered = Math.max(state.answered, +r.answered || 0);
      state.correct = Math.max(state.correct, +r.correct || 0);
      if (r.last && (!state.last || (+r.last.at || 0) > (state.last.at || 0))) state.last = r.last;
      save();
      EF.emit('progress'); EF.emit('streak', store.streak());
      EF.emit('xp', { n: 0, today: store.xpToday(), before: store.xpToday(), goal: store.goal() });
    }
  };
  EF.store = store;
  EF.dayKey = dayKey;

  /* ---------- grades (Grade 9, Grade 10 …) ----------
     Each subject has `grade`. The grade switch only appears once there's more than one grade. */
  EF.gradeOf = (s) => s.grade || 9;
  EF.grades = () => Array.from(new Set(EF.subjects.map(EF.gradeOf))).sort((a, b) => b - a); // newest first
  EF.multiGrade = () => EF.grades().length > 1;
  EF.grade = () => { const g = ls.get('ef2:grade'); return g && g !== 'all' && EF.grades().includes(+g) ? +g : 'all'; };
  EF.setGrade = (g) => { ls.set('ef2:grade', String(g)); EF.emit('grade', g); };
  EF.inGrade = (g) => EF.subjects.filter((s) => g === 'all' || EF.gradeOf(s) === +g);
  EF.gradeLabel = () => { const gs = EF.grades().slice().reverse(); return 'Grade ' + (gs.length > 1 ? gs.slice(0, -1).join(', ') + ' & ' + gs[gs.length - 1] : gs[0]); };

  /* ---------- theme ---------- */
  EF.theme = {
    get: () => document.documentElement.getAttribute('data-theme') || 'dark',
    set(t) {
      document.documentElement.setAttribute('data-theme', t);
      ls.set('ef2:theme', t);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', t === 'dark' ? '#0c0d11' : '#f6f3ec');
      EF.emit('theme', t);
    },
    toggle(origin) {
      const next = EF.theme.get() === 'dark' ? 'light' : 'dark';
      const root = document.documentElement;
      if (!document.startViewTransition || EF.reducedMotion()) { EF.theme.set(next); return; }
      const r = origin && origin.getBoundingClientRect ? origin.getBoundingClientRect() : { left: innerWidth - 40, top: 30, width: 0, height: 0 };
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      root.classList.add('vt-theme');
      const t = document.startViewTransition(() => EF.theme.set(next));
      t.ready.then(() => {
        root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
          { duration: 550, easing: 'cubic-bezier(.2,.8,.2,1)', pseudoElement: '::view-transition-new(root)' });
      }).catch(() => {});
      t.finished.catch(() => {}).finally(() => root.classList.remove('vt-theme'));
    }
  };

  /* ---------- speech (French TTS with smart voice picking) ---------- */
  let frVoice = null;
  const pickVoice = () => {
    if (!('speechSynthesis' in window)) return null;
    if (frVoice) return frVoice;
    const voices = speechSynthesis.getVoices();
    if (!voices.length) return null;
    const preferred = ['Google français', 'Microsoft Denise Online', 'Microsoft Paul Online', 'Microsoft Denise', 'Microsoft Paul', 'Amélie', 'Thomas', 'Marie', 'Audrey'];
    for (const name of preferred) {
      const v = voices.find((x) => x.name.includes(name) && x.lang.toLowerCase().startsWith('fr'));
      if (v) return (frVoice = v);
    }
    return (frVoice = voices.find((v) => v.lang === 'fr-FR') || voices.find((v) => v.lang.toLowerCase().startsWith('fr')) || null);
  };
  if ('speechSynthesis' in window) {
    speechSynthesis.getVoices();
    speechSynthesis.addEventListener && speechSynthesis.addEventListener('voiceschanged', () => { frVoice = null; pickVoice(); });
  }
  EF.canSpeak = () => 'speechSynthesis' in window;
  EF.speak = (text, lang = 'fr-FR', el) => {
    if (!EF.canSpeak()) { EF.toast('Your browser can’t play speech', 'fa-volume-xmark'); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    if (lang.startsWith('fr')) { const v = pickVoice(); if (v) u.voice = v; u.rate = 0.85; u.pitch = 1.03; } else { u.rate = 0.95; }
    if (el) {
      el.classList.add('is-speaking');
      const done = () => el.classList.remove('is-speaking');
      u.onend = done; u.onerror = done; setTimeout(done, 4000);
    }
    speechSynthesis.speak(u);
  };
  EF.stopSpeaking = () => { if (EF.canSpeak()) speechSynthesis.cancel(); };

  /* ---------- toasts ---------- */
  EF.toast = (msg, icon = 'fa-circle-check') => {
    const wrap = document.getElementById('toasts');
    if (!wrap) return;
    const t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'status');
    t.innerHTML = EF.icon(icon) + '<span>' + EF.esc(msg) + '</span>';
    wrap.appendChild(t);
    requestAnimationFrame(() => t.classList.add('is-in'));
    setTimeout(() => { t.classList.remove('is-in'); setTimeout(() => t.remove(), 300); }, 2600);
  };

  /* ---------- confetti (no library needed) ---------- */
  EF.confetti = () => {
    if (EF.reducedMotion()) return;
    const c = document.createElement('canvas');
    c.className = 'confetti';
    c.setAttribute('aria-hidden', 'true');
    document.body.appendChild(c);
    const ctx = c.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = (c.width = innerWidth * dpr), H = (c.height = innerHeight * dpr);
    const colors = ['#ff6a2b', '#ffb547', '#4f7cff', '#2fbf71', '#e255b4', '#9b6bff', '#14b8c4'];
    const parts = Array.from({ length: 150 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.65,
      vx: (Math.random() - 0.5) * 22 * dpr, vy: -(Math.random() * 20 + 12) * dpr,
      r: (Math.random() * 6 + 4) * dpr, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
      color: colors[(Math.random() * colors.length) | 0], shape: Math.random() > 0.5
    }));
    let frame = 0;
    (function tick() {
      ctx.clearRect(0, 0, W, H);
      parts.forEach((p) => {
        p.vy += 0.55 * dpr; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color;
        if (p.shape) ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); else { ctx.beginPath(); ctx.arc(0, 0, p.r / 2.4, 0, 7); ctx.fill(); }
        ctx.restore();
      });
      if (++frame < 160) requestAnimationFrame(tick); else c.remove();
    })();
  };
})();
