/* ExamForge — study modes inspired by flashcard / study-guide apps, done our way:
   • EF.sets: make your own sets from pasted notes, saved on this device, shareable by link (no account needed)
   • Learn: multiple choice → type it, with 3 lives; a card is learned once you get it right in both rounds
   • Match: pair terms with answers against the clock; best times are saved
   Everything a student types is treated as plain text (escaped), because shared links come from other people. */
(function () {
  'use strict';
  const EF = window.EF;
  const esc = EF.esc, icon = EF.icon, $ = EF.$;
  const KEY = 'ef2:sets';
  const COLORS = ['#ff6a2b', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#06b6d4', '#f59e0b', '#ec4899'];

  /* ================= MY SETS ================= */
  let cache = null;
  const load = () => { if (cache) return cache; try { cache = JSON.parse(EF.ls.get(KEY) || '[]'); } catch (e) { cache = []; } if (!Array.isArray(cache)) cache = []; return cache; };
  const persist = () => { EF.ls.set(KEY, JSON.stringify(cache || [])); views.clear(); EF.emit('sets'); };
  const clean = (x, n) => String(x == null ? '' : x).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
  const views = new Map();

  // A saved set looks like a subject to the rest of the app, so Flashcards, Quiz, Learn and Match all just work
  function asSubject(set) {
    if (views.has(set.id)) return views.get(set.id);
    const cards = set.cards.map((c) => [c[0], c[1]]);
    const backs = Array.from(new Set(cards.map((c) => c[1])));
    // one question per card (first 40), with wrong answers picked the same way every time so saved mistakes stay valid
    const mix = (i, j) => (Math.imul(i + 1, 2654435761) ^ Math.imul(j + 7, 40503)) >>> 0;
    const quiz = backs.length >= 4 ? cards.slice(0, 40).map((c, i) => {
      const wrong = backs.filter((b) => b !== c[1]).map((b, j) => [mix(i, j), b]).sort((x, y) => x[0] - y[0]).slice(0, 3).map((x) => x[1]);
      return { q: `What matches “${esc(c[0])}”?`, options: [esc(c[1])].concat(wrong.map(esc)), answer: 0, why: '' };
    }) : [];
    const s = { id: set.id, custom: true, name: set.name, short: set.name, grade: 0, iconKey: 'study', icon: 'fa-layer-group', color: set.color || COLORS[0], tagline: cards.length + ' cards', intro: '', topics: [], quiz, flashcards: cards };
    views.set(set.id, s);
    return s;
  }

  EF.sets = {
    list: () => load().slice().sort((a, b) => (b.updated || 0) - (a.updated || 0)),
    raw: (id) => load().find((x) => x.id === id),
    get(id) { const x = load().find((s) => s.id === id); return x ? asSubject(x) : undefined; },
    save(set) {
      load();
      const s = { id: set.id || 'my-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: clean(set.name, 60) || 'My set', color: COLORS.includes(set.color) ? set.color : COLORS[0], cards: (set.cards || []).map((c) => [clean(c[0], 300), clean(c[1], 300)]).filter((c) => c[0] && c[1]).slice(0, 400), updated: Date.now() };
      if (typeof set.from === 'string' && /^[0-9a-f-]{36}$/.test(set.from)) s.from = set.from; // came from a school library
      const i = cache.findIndex((x) => x.id === s.id);
      if (i >= 0) cache[i] = s; else cache.push(s);
      persist();
      return s;
    },
    remove(id) { load(); cache = cache.filter((x) => x.id !== id); persist(); },
    // sets from a cloud backup: add the ones this device doesn't have, keep the newer copy of the rest
    mergeIn(list) {
      load();
      let changed = false;
      (Array.isArray(list) ? list : []).forEach((x) => {
        if (!x || typeof x.id !== 'string' || !/^my-[a-z0-9]{4,24}$/.test(x.id) || !Array.isArray(x.cards)) return;
        const mine = cache.find((y) => y.id === x.id);
        if (mine && (mine.updated || 0) >= (+x.updated || 0)) return;
        const s = { id: x.id, name: clean(x.name, 60) || 'My set', color: COLORS.includes(x.color) ? x.color : COLORS[0], cards: x.cards.filter((c) => Array.isArray(c)).map((c) => [clean(c[0], 300), clean(c[1], 300)]).filter((c) => c[0] && c[1]).slice(0, 400), updated: +x.updated || Date.now() };
        if (typeof x.from === 'string' && /^[0-9a-f-]{36}$/.test(x.from)) s.from = x.from;
        if (mine) Object.assign(mine, s); else cache.push(s);
        changed = true;
      });
      if (changed) persist();
    },
    colors: COLORS,

    /* Paste notes → cards. Understands "term - meaning", "term: meaning", tabs (spreadsheet / app exports),
       "term = meaning", and Q:/A: pairs on separate lines. */
    parse(text) {
      const out = [];
      const lines = String(text || '').replace(/\r/g, '').split('\n').map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim()).filter(Boolean);
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        const q = /^q(?:uestion)?\s*[:.)-]\s*(.+)$/i.exec(l), a = lines[i + 1] && /^a(?:nswer)?\s*[:.)-]\s*(.+)$/i.exec(lines[i + 1]);
        if (q && a) { out.push([q[1], a[1]]); i++; continue; }
        const m = /^(.+?)(?:\t+|\s+[-–—=]\s+|\s*[:]\s+)(.+)$/.exec(l);
        if (m) out.push([m[1].trim(), m[2].trim()]);
      }
      return out.map((c) => [clean(c[0], 300), clean(c[1], 300)]).filter((c) => c[0] && c[1]);
    },

    /* Share links: the set is packed into the link itself (compressed when the browser can), so no server is needed */
    async encode(set) {
      const json = JSON.stringify({ n: set.name, c: set.color, k: set.cards });
      const bytes = new TextEncoder().encode(json);
      let tag = 'p', data = bytes;
      if (typeof CompressionStream === 'function') {
        try { data = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer()); tag = 'z'; } catch (e) { data = bytes; tag = 'p'; }
      }
      let bin = ''; data.forEach((b) => { bin += String.fromCharCode(b); });
      return tag + '.' + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    },
    async decode(code) {
      const m = /^([pz])\.([A-Za-z0-9_-]+)$/.exec(String(code || ''));
      if (!m) throw new Error('bad link');
      const bin = atob(m[2].replace(/-/g, '+').replace(/_/g, '/'));
      let bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
      if (m[1] === 'z') {
        if (typeof DecompressionStream !== 'function') throw new Error('This browser is too old to open this link.');
        bytes = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
      }
      const o = JSON.parse(new TextDecoder().decode(bytes));
      if (!o || !Array.isArray(o.k)) throw new Error('bad set');
      const cards = o.k.filter((c) => Array.isArray(c) && typeof c[0] === 'string' && typeof c[1] === 'string').map((c) => [clean(c[0], 300), clean(c[1], 300)]).filter((c) => c[0] && c[1]).slice(0, 400);
      if (!cards.length) throw new Error('empty set');
      return { name: clean(o.n, 60) || 'Shared set', color: COLORS.includes(o.c) ? o.c : COLORS[0], cards };
    },
    async share(set) {
      const code = await EF.sets.encode(set);
      const url = location.href.split('#')[0] + '#/import/' + code;
      if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        try { await navigator.share({ title: set.name + ' · ExamForge', text: `Study “${set.name}” with me on ExamForge`, url }); return 'shared'; } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
      }
      try { await navigator.clipboard.writeText(url); return 'copied'; } catch (e) { window.prompt('Copy this link and send it to your friends:', url); return 'shown'; }
    }
  };

  /* ================= helpers ================= */
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’'`"“”.,!?;:()[\]{}]/g, '').replace(/\s+/g, ' ').trim();
  function lev(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length; if (!m || !n) return m || n;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
    return prev[n];
  }
  // close enough = small typos forgiven (1 per ~6 letters)
  const closeEnough = (guess, answer) => { const g = norm(guess), a = norm(answer); if (!g) return false; return g === a || lev(g, a) <= Math.max(1, Math.floor(a.length / 6)); };
  const hearts = (n, max) => Array.from({ length: max }, (_, i) => `<i class="fa-solid fa-heart${i < n ? '' : ' is-lost'}" aria-hidden="true"></i>`).join('');

  /* ================= LEARN ================= */
  EF.mountLearn = (el, sid) => {
    const s = EF.subject(sid);
    const all = s.flashcards.map((c) => ({ front: c[0], back: c[1], tag: c[2] || '', wrong: Array.isArray(c[3]) && c[3].length >= 3 ? c[3] : null }));
    const MAXH = 3, ROUND = 8;
    let queue = [], done = 0, total = 0, lives = MAXH, cur = null, answered = null, streak = 0, best = 0, correct = 0, tries = 0;
    el.classList.add('learn', 'tint'); el.style.setProperty('--c', s.color);
    const box = (c) => EF.store.cardBox(sid, c.front);
    // the typed round only makes sense when the answer is short enough to type
    const typeable = (c) => c.back.length <= 32;

    function start() {
      const pool = EF.shuffle(all.slice()).sort((a, b) => box(a) - box(b)).slice(0, ROUND);
      queue = pool.map((c) => ({ c, stage: 0 })); total = queue.length; done = 0; lives = MAXH; streak = 0; correct = 0; tries = 0; next();
    }
    function next() {
      answered = null;
      if (!queue.length || lives <= 0) return finish();
      cur = queue.shift();
      render();
    }
    // the card's own wrong answers if it has them, else answers from the same topic first
    function options(item) {
      const c = item.c;
      let others = c.wrong ? c.wrong.slice(0, 3) : null;
      if (!others) {
        const rest = all.filter((d) => d.back !== c.back), same = c.tag ? EF.shuffle(rest.filter((d) => d.tag === c.tag)) : [];
        others = same.concat(EF.shuffle(rest.filter((d) => !same.includes(d)))).slice(0, 3).map((d) => d.back);
      }
      return EF.shuffle([c.back].concat(others));
    }
    function bar() {
      const p = total ? (done / total) * 100 : 0;
      return `<div class="learn-top"><div class="learn-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}" aria-label="Cards learned"><span style="width:${p}%"></span></div>
        <span class="learn-hearts" aria-label="${lives} lives left">${hearts(lives, MAXH)}</span>${streak >= 3 ? `<span class="learn-streak">${icon('fa-fire')} ${streak}</span>` : ''}</div>`;
    }
    function render() {
      const it = cur, typed = it.stage === 1 && typeable(it.c);
      let body;
      if (!typed) {
        it.opts = it.opts || options(it);
        body = `<p class="learn-kind">${icon('fa-list-ul')} ${it.stage === 0 ? 'Choose the answer' : 'One more time: choose the answer'}</p>
          <h2 class="learn-q">${esc(it.c.front)}</h2>
          <div class="learn-opts">${it.opts.map((o, i) => `<button type="button" class="opt learn-opt" data-lopt="${i}"><span class="opt-key">${i + 1}</span><span>${esc(o)}</span></button>`).join('')}</div>`;
      } else {
        body = `<p class="learn-kind">${icon('fa-keyboard')} Type the answer</p>
          <h2 class="learn-q">${esc(it.c.front)}</h2>
          <form class="learn-type" novalidate><input name="a" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Your answer" aria-label="Your answer"><button class="btn btn-c" type="submit">${icon('fa-check')} Check</button></form>
          <button type="button" class="link learn-idk" data-lidk>I don’t know</button>`;
      }
      el.innerHTML = `${bar()}<div class="learn-card is-in">${body}</div>`;
      const inp = el.querySelector('.learn-type input'); if (inp) inp.focus({ preventScroll: true });
    }
    function feedback(ok, given) {
      answered = ok;
      tries++;
      const it = cur;
      if (ok) {
        correct++; streak++; best = Math.max(best, streak);
        if (EF.daily) { EF.daily.bump('correct'); EF.daily.max('row', streak); }
        it.stage++;
        EF.haptic('success'); EF.store.addXP(streak >= 5 ? 8 : 6);
        if (it.stage >= 2) { done++; EF.store.setCardBox(sid, it.c.front, Math.max(3, box(it.c) + 1), true); }
        else queue.splice(Math.min(queue.length, 2), 0, it);
      } else {
        streak = 0; lives--;
        EF.haptic('error');
        it.stage = 0; it.opts = null;
        EF.store.setCardBox(sid, it.c.front, 1, true);
        queue.splice(Math.min(queue.length, 3), 0, it);
      }
      const card = el.querySelector('.learn-card');
      card.insertAdjacentHTML('beforeend', `<div class="learn-fb ${ok ? 'is-ok' : 'is-bad'}">
        <p>${ok ? `${icon('fa-circle-check')} <strong>${['Nice!', 'Correct!', 'You got it!', 'Yes!'][Math.floor(Math.random() * 4)]}</strong>` : `${icon('fa-circle-xmark')} <strong>Not quite.</strong> ${given ? `You said “${esc(given)}”.` : ''}`}</p>
        ${ok ? '' : `<p class="learn-correct">Answer: <strong>${esc(it.c.back)}</strong></p>`}
        <button type="button" class="btn btn-c" data-lnext>${lives <= 0 ? 'See results' : 'Continue'} ${icon('fa-arrow-right')}</button></div>`);
      el.querySelector('.learn-top').outerHTML = bar();
      if (!ok) { const h = el.querySelectorAll('.learn-hearts i')[lives]; if (h) h.classList.add('is-breaking'); card.classList.add('is-shake'); }
      const nb = el.querySelector('[data-lnext]'); if (nb) nb.focus({ preventScroll: true });
    }
    function finish() {
      const out = lives <= 0;
      const pct = tries ? Math.round((correct / tries) * 100) : 0;
      if (!out && total) { EF.store.addXP(10); if (pct >= 80) EF.confetti(); }
      el.innerHTML = `<div class="learn-card learn-done is-in">
        ${EF.mascot ? EF.mascot(out ? 'sad' : 'cheer', 120) : `<span class="learn-done-ic${out ? ' is-out' : ''}">${icon(out ? 'fa-heart-crack' : 'fa-trophy')}</span>`}
        <h2>${out ? 'Out of lives!' : 'Round complete!'}</h2>
        <p class="muted">${out ? 'No stress: the cards you missed come first next time.' : `You learned ${done} card${done === 1 ? '' : 's'}.`}</p>
        <div class="learn-stats"><span><strong>${done}/${total}</strong>learned</span><span><strong>${pct}%</strong>accuracy</span><span><strong>${best}</strong>best streak</span></div>
        <div class="btn-row center"><button type="button" class="btn btn-c" data-lagain>${icon('fa-rotate-right')} ${out ? 'Try again' : 'Next round'}</button><a class="btn" href="#/set/${esc(sid)}">${icon('fa-layer-group')} Other modes</a></div>
      </div>`;
    }
    const onClick = (e) => {
      const o = e.target.closest('[data-lopt]');
      if (o && answered === null) {
        const i = +o.dataset.lopt, ok = cur.opts[i] === cur.c.back;
        el.querySelectorAll('[data-lopt]').forEach((b, bi) => { b.disabled = true; if (cur.opts[bi] === cur.c.back) b.classList.add('is-right'); else if (bi === i) b.classList.add('is-wrong'); else b.classList.add('is-dim'); });
        if (ok) o.classList.add('is-picked');
        feedback(ok, ok ? '' : cur.opts[i]);
        return;
      }
      if (e.target.closest('[data-lidk]') && answered === null) { feedback(false, ''); return; }
      if (e.target.closest('[data-lnext]')) { next(); return; }
      if (e.target.closest('[data-lagain]')) { start(); }
    };
    const onSubmit = (e) => {
      e.preventDefault();
      if (answered !== null) { next(); return; }
      const v = e.target.a.value;
      if (!v.trim()) return;
      e.target.a.disabled = true;
      const ok = closeEnough(v, cur.c.back);
      feedback(ok, ok ? '' : v);
      if (ok && norm(v) !== norm(cur.c.back)) el.querySelector('.learn-fb p').insertAdjacentHTML('beforeend', ` <span class="muted">(exact: ${esc(cur.c.back)})</span>`);
    };
    const onKey = (e) => {
      if (/^(INPUT|TEXTAREA)$/.test(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (answered === null && /^[1-4]$/.test(e.key)) { const b = el.querySelector(`[data-lopt="${+e.key - 1}"]`); if (b) { e.preventDefault(); b.click(); } }
      else if (answered !== null && (e.key === 'Enter' || e.key === ' ')) { const b = el.querySelector('[data-lnext]'); if (b && document.activeElement !== b) { e.preventDefault(); b.click(); } }
    };
    el.addEventListener('click', onClick); el.addEventListener('submit', onSubmit); document.addEventListener('keydown', onKey);
    if (all.length < 4) el.innerHTML = `<div class="learn-card is-in"><p class="muted">Learn mode needs at least 4 cards in the set.</p></div>`; else start();
    return () => { el.removeEventListener('click', onClick); el.removeEventListener('submit', onSubmit); document.removeEventListener('keydown', onKey); };
  };

  /* ================= MATCH ================= */
  EF.mountMatch = (el, sid) => {
    const s = EF.subject(sid);
    const pool = s.flashcards.filter((c) => c[1].length <= 90 && c[0].length <= 70);
    const PAIRS = Math.min(6, pool.length);
    let tiles = [], picked = null, matched = 0, t0 = 0, timer = 0, penalty = 0, finished = false;
    el.classList.add('match', 'tint'); el.style.setProperty('--c', s.color);
    const fmt = (ms) => (ms / 1000).toFixed(1) + 's';
    function start() {
      const cards = EF.shuffle(pool.slice()).slice(0, PAIRS);
      tiles = EF.shuffle(cards.flatMap((c, i) => [{ pair: i, text: c[0], kind: 'term' }, { pair: i, text: c[1], kind: 'def' }]));
      picked = null; matched = 0; penalty = 0; finished = false; t0 = 0;
      clearInterval(timer);
      render();
    }
    function render() {
      const best = EF.store.bestMatch(sid);
      el.innerHTML = `<div class="match-top"><span class="match-time" aria-live="off">${icon('fa-stopwatch')} <strong>0.0s</strong></span><span class="muted small">${best ? `Best: ${fmt(best)}` : 'Tap a term, then its match'}</span><button type="button" class="btn btn-sm" data-mrestart>${icon('fa-rotate-right')} Restart</button></div>
        <div class="match-grid">${tiles.map((t, i) => `<button type="button" class="match-tile is-${t.kind}" data-mt="${i}" style="--i:${i}"><span>${esc(t.text)}</span></button>`).join('')}</div>`;
    }
    const tick = () => { const n = el.querySelector('.match-time strong'); if (n) n.textContent = fmt(Date.now() - t0 + penalty); };
    function done() {
      finished = true; clearInterval(timer);
      const ms = Date.now() - t0 + penalty, record = EF.store.setMatch(sid, ms);
      if (EF.daily) EF.daily.bump('match');
      EF.store.addXP(15); EF.haptic('success');
      if (record) EF.confetti();
      setTimeout(() => {
        el.querySelector('.match-grid').outerHTML = `<div class="learn-card learn-done is-in">${EF.mascot ? EF.mascot(record ? 'cheer' : 'wave', 120) : `<span class="learn-done-ic">${icon(record ? 'fa-trophy' : 'fa-flag-checkered')}</span>`}<h2>${fmt(ms)}</h2><p class="muted">${record ? 'New personal best!' : `Your best is ${fmt(EF.store.bestMatch(sid))}.`}${penalty ? ` Includes ${penalty / 1000}s penalty for wrong pairs.` : ''}</p><div class="btn-row center"><button type="button" class="btn btn-c" data-mrestart>${icon('fa-rotate-right')} Play again</button><a class="btn" href="#/set/${esc(sid)}">${icon('fa-layer-group')} Other modes</a></div></div>`;
      }, 450);
    }
    const onClick = (e) => {
      if (e.target.closest('[data-mrestart]')) { start(); return; }
      const b = e.target.closest('[data-mt]');
      if (!b || finished || b.classList.contains('is-matched')) return;
      if (!t0) { t0 = Date.now(); timer = setInterval(tick, 100); }
      const i = +b.dataset.mt;
      if (picked === null) { picked = i; b.classList.add('is-picked'); EF.haptic(); return; }
      if (picked === i) { b.classList.remove('is-picked'); picked = null; return; }
      const a = el.querySelector(`[data-mt="${picked}"]`), A = tiles[picked], B = tiles[i];
      if (A.pair === B.pair && A.kind !== B.kind) {
        [a, b].forEach((x) => { x.classList.remove('is-picked'); x.classList.add('is-matched'); x.disabled = true; });
        matched++; EF.haptic('success');
        if (matched === PAIRS) done();
      } else {
        penalty += 1000; EF.haptic('error');
        [a, b].forEach((x) => { x.classList.remove('is-picked', 'is-wrong'); void x.offsetWidth; x.classList.add('is-wrong'); });
      }
      picked = null;
    };
    el.addEventListener('click', onClick);
    if (PAIRS < 3) el.innerHTML = '<p class="muted">Match needs at least 3 short cards in the set.</p>'; else start();
    return () => { clearInterval(timer); el.removeEventListener('click', onClick); };
  };

  /* ================= MAKE / EDIT A SET ================= */
  EF.mountMake = (el, id) => {
    const existing = id ? EF.sets.raw(id) : null;
    let color = existing ? existing.color : COLORS[Math.floor(Math.random() * COLORS.length)];
    const sample = 'Photosynthesis - Plants making glucose from carbon dioxide and water using light\nOsmosis: Movement of water through a partially permeable membrane\nQ: What is the unit of force?\nA: The newton (N)';
    el.innerHTML = `<form class="make-form" novalidate>
      <label class="make-field"><span>Set name</span><input name="name" maxlength="60" required placeholder="e.g. Physics test: moments" value="${existing ? esc(existing.name) : ''}"></label>
      <div class="make-field"><span>Colour</span><div class="make-colors" role="radiogroup" aria-label="Colour">${COLORS.map((c) => `<button type="button" class="make-color${c === color ? ' is-on' : ''}" style="--c:${c}" data-color="${c}" role="radio" aria-checked="${c === color}" aria-label="Colour ${c}"></button>`).join('')}</div></div>
      <label class="make-field"><span>Paste your notes: one card per line</span>
        <textarea name="text" rows="10" spellcheck="true" placeholder="${esc(sample)}">${existing ? esc(existing.cards.map((c) => c[0] + ' - ' + c[1]).join('\n')) : ''}</textarea></label>
      <p class="muted small">${icon('fa-circle-info')} Use <strong>term - meaning</strong>, <strong>term: meaning</strong>, a tab (copied from a spreadsheet or another flashcard app), or <strong>Q:</strong> / <strong>A:</strong> lines.</p>
      <div class="make-preview" aria-live="polite"></div>
      <div class="btn-row"><button class="btn btn-primary" type="submit">${icon('fa-floppy-disk')} ${existing ? 'Save changes' : 'Create set'}</button>${existing ? `<button type="button" class="btn btn-danger" data-mdelete>${icon('fa-trash')} Delete set</button>` : ''}</div>
    </form>`;
    const ta = el.querySelector('textarea'), prev = el.querySelector('.make-preview');
    const preview = () => {
      const cards = EF.sets.parse(ta.value);
      prev.innerHTML = cards.length ? `<p><strong>${cards.length}</strong> card${cards.length === 1 ? '' : 's'} found</p><ol class="make-cards">${cards.slice(0, 6).map((c) => `<li><strong>${esc(c[0])}</strong><span>${esc(c[1])}</span></li>`).join('')}${cards.length > 6 ? `<li class="muted">+ ${cards.length - 6} more</li>` : ''}</ol>` : (ta.value.trim() ? `<p class="muted">${icon('fa-triangle-exclamation')} No cards yet: put a dash, colon or tab between each term and its meaning.</p>` : '');
    };
    const onInput = (e) => { if (e.target === ta) preview(); };
    const onClick = (e) => {
      const c = e.target.closest('[data-color]');
      if (c) { color = c.dataset.color; el.querySelectorAll('[data-color]').forEach((b) => { const on = b === c; b.classList.toggle('is-on', on); b.setAttribute('aria-checked', on); }); return; }
      if (e.target.closest('[data-mdelete]') && existing && confirm(`Delete “${existing.name}”? This can’t be undone.`)) { EF.sets.remove(existing.id); EF.toast('Set deleted', 'fa-trash'); location.hash = '#/sets'; }
    };
    const onSubmit = (e) => {
      e.preventDefault();
      const cards = EF.sets.parse(ta.value), name = e.target.name.value.trim();
      if (!name) { EF.toast('Give your set a name', 'fa-circle-exclamation'); e.target.name.focus(); return; }
      if (cards.length < 2) { EF.toast('Add at least 2 cards', 'fa-circle-exclamation'); ta.focus(); return; }
      const saved = EF.sets.save({ id: existing && existing.id, name, color, cards });
      EF.store.addXP(existing ? 0 : 10);
      EF.toast(existing ? 'Saved' : `Created “${saved.name}” with ${saved.cards.length} cards`, 'fa-layer-group');
      location.hash = '#/set/' + saved.id;
    };
    el.addEventListener('input', onInput); el.addEventListener('click', onClick); el.addEventListener('submit', onSubmit);
    preview();
    return () => { el.removeEventListener('input', onInput); el.removeEventListener('click', onClick); el.removeEventListener('submit', onSubmit); };
  };

  /* ================= OPEN A SHARED LINK ================= */
  EF.mountImport = (el, code) => {
    let set = null, alive = true;
    el.innerHTML = `<div class="learn-card is-in"><p class="muted">${icon('fa-spinner', 'fa-spin')} Opening shared set…</p></div>`;
    EF.sets.decode(code).then((s) => {
      if (!alive) return;
      set = s;
      el.innerHTML = `<div class="learn-card import-card is-in tint" style="--c:${set.color}">
        <span class="learn-done-ic">${EF.img3d ? EF.img3d('gift', 40) : icon('fa-gift')}</span>
        <h2>${esc(set.name)}</h2>
        <p class="muted">A friend shared ${set.cards.length} cards with you.</p>
        <ol class="make-cards">${set.cards.slice(0, 5).map((c) => `<li><strong>${esc(c[0])}</strong><span>${esc(c[1])}</span></li>`).join('')}${set.cards.length > 5 ? `<li class="muted">+ ${set.cards.length - 5} more</li>` : ''}</ol>
        <div class="btn-row center"><button type="button" class="btn btn-primary" data-iadd>${icon('fa-plus')} Add to my sets</button><a class="btn" href="#/">No thanks</a></div>
      </div>`;
    }).catch(() => { if (alive) el.innerHTML = `<div class="learn-card is-in"><h2>That link didn’t work</h2><p class="muted">It may have been cut off when it was copied. Ask your friend to send it again.</p><a class="btn" href="#/sets">${icon('fa-layer-group')} My sets</a></div>`; });
    const onClick = (e) => {
      if (!e.target.closest('[data-iadd]') || !set) return;
      const dupe = EF.sets.list().find((x) => x.name === set.name && x.cards.length === set.cards.length);
      const saved = dupe || EF.sets.save(set);
      EF.toast(dupe ? 'You already have this set' : 'Added to your sets', 'fa-layer-group');
      location.hash = '#/set/' + saved.id;
    };
    el.addEventListener('click', onClick);
    return () => { alive = false; el.removeEventListener('click', onClick); };
  };

  /* ================= XP: daily-goal ring in the top bar + "+10 XP" pops ================= */
  const paintGoal = () => {
    const today = EF.store.xpToday(), goal = EF.store.goal(), p = Math.min(100, Math.round((today / goal) * 100));
    document.querySelectorAll('.streak-chip').forEach((chip) => {
      let r = chip.querySelector('.goal-ring');
      if (!r) { r = document.createElement('span'); r.className = 'goal-ring'; r.setAttribute('aria-hidden', 'true'); chip.prepend(r); }
      r.style.setProperty('--p', p);
      chip.classList.toggle('is-goal', p >= 100);
      chip.setAttribute('aria-label', `Study streak and daily goal: ${today} of ${goal} XP today`);
    });
  };
  EF.paintGoal = paintGoal;
  EF.on('xp', (d) => {
    paintGoal();
    if (!d.n) return;
    const chip = document.querySelector('.streak-chip');
    if (chip && chip.offsetParent && !EF.reducedMotion()) {
      const r = chip.getBoundingClientRect(), pop = document.createElement('span');
      pop.className = 'xp-pop'; pop.textContent = '+' + d.n + ' XP';
      pop.style.left = r.left + r.width / 2 + 'px'; pop.style.top = r.bottom + 6 + 'px';
      document.body.appendChild(pop);
      pop.addEventListener('animationend', () => pop.remove());
      chip.classList.remove('is-bump'); void chip.offsetWidth; chip.classList.add('is-bump');
    }
    if (d.before < d.goal && d.today >= d.goal) { setTimeout(() => { EF.toast(`Daily goal reached: ${d.goal} XP! 🔥`, 'fa-bullseye'); EF.confetti(); }, 350); }
    const lv = EF.store.level(), was = EF.store.level(EF.store.xp() - d.n);
    if (lv.lvl > was.lvl) setTimeout(() => EF.toast(`Level up! You’re now level ${lv.lvl}`, 'fa-star'), 900);
  });
})();
