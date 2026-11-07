/* Zing — study modes inspired by flashcard / study-guide apps, done our way:
   • EF.sets: your own decks (cards, notes, subdecks), saved on this device and backed up to your account,
     shareable by link. A card is [question, answer] or [question, answer, [3 wrong answers], why].
   • Learn: multiple choice → type it, with 3 lives; a card is learned once you get it right in both rounds
   • Match: pair terms with answers against the clock; best times are saved
   Everything a student types is treated as plain text (escaped), because shared links come from other people. */
(function () {
  'use strict';
  const EF = window.EF;
  const esc = EF.esc, icon = EF.icon, $ = EF.$;
  const KEY = 'ef2:sets';
  // coral, orange, sun, lime, teal, sky, indigo, purple, pink (any other #rrggbb colour works too)
  const COLORS = ['#ff5e4d', '#ff8a1f', '#ffc23c', '#8acb2f', '#14b8a6', '#3a8dff', '#6c6cff', '#b46cff', '#f25ca8'];
  const COLOR_NAMES = ['Coral', 'Orange', 'Sun', 'Lime', 'Teal', 'Sky', 'Indigo', 'Purple', 'Pink'];
  const HEX = /^#[0-9a-f]{6}$/i;
  const NOTE_KINDS = ['note', 'paste', 'pdf', 'doc', 'slides', 'text', 'web', 'yt', 'audio', 'photo', 'sheet'];
  const ID = /^my-[a-z0-9]{4,24}$/;

  /* ================= MY DECKS ================= */
  let cache = null;
  const load = () => { if (cache) return cache; try { cache = JSON.parse(EF.ls.get(KEY) || '[]'); } catch (e) { cache = []; } if (!Array.isArray(cache)) cache = []; return cache; };
  // notes can be long, so a full device is reported instead of silently losing the deck
  const persist = () => {
    let ok = true;
    try { localStorage.setItem(KEY, JSON.stringify(cache || [])); } catch (e) { ok = false; if (e && /quota/i.test(e.name + e.message)) EF.toast('This device is out of space. Delete some notes or decks.', 'fa-triangle-exclamation'); }
    views.clear(); EF.emit('sets');
    return ok;
  };
  const clean = (x, n) => String(x == null ? '' : x).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
  // longer text (notes) keeps its line breaks and tabs
  const cleanText = (x, n) => String(x == null ? '' : x).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ').slice(0, n);
  const colorOf = (c) => (HEX.test(String(c || '')) ? String(c).toLowerCase() : '#0b8a5e');
  const newId = () => 'my-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const views = new Map();
  // one card: [q, a] or [q, a, [3 wrong answers], why] (wrong answers that repeat the answer are dropped)
  function cardOf(c) {
    if (!Array.isArray(c)) return null;
    const q = clean(c[0], 300), a = clean(c[1], 300);
    if (!q || !a) return null;
    const w = Array.isArray(c[2]) ? Array.from(new Set(c[2].map((x) => clean(x, 200)).filter((x) => x && x.toLowerCase() !== a.toLowerCase()))) : [];
    const why = clean(c[3], 300);
    return w.length >= 3 ? [q, a, w.slice(0, 3), why] : why ? [q, a, [], why] : [q, a];
  }
  function noteOf(n) {
    if (!n || typeof n !== 'object' || typeof n.id !== 'string' || !/^n[a-z0-9]{3,20}$/.test(n.id)) return null;
    const out = { id: n.id, t: clean(n.t, 80) || 'Notes', x: cleanText(n.x, 30000), k: NOTE_KINDS.includes(n.k) ? n.k : 'note', at: +n.at || Date.now() };
    if (typeof n.src === 'string' && /^https:\/\/[^\s"'<>]{4,500}$/.test(n.src)) out.src = n.src;
    if (n.cut) out.cut = 1;
    return out;
  }
  const byId = (id) => load().find((x) => x.id === id);
  // a deck can sit inside another deck (a subdeck), but never inside itself or its own subdecks
  function okParent(id, parent) {
    if (!parent || parent === id || !byId(parent)) return false;
    let p = byId(parent), depth = 0;
    while (p && p.parent && depth++ < 12) { if (p.parent === id) return false; p = byId(p.parent); }
    return depth < 6;
  }
  const kids = (id) => load().filter((x) => x.parent === id).sort((a, b) => (a.created || 0) - (b.created || 0));
  function descendants(id) { const out = []; const walk = (d) => kids(d).forEach((k) => { out.push(k); walk(k.id); }); walk(id); return out; }

  // the deck plus its subdecks' cards, as [q, a, topic, wrong, why] (the shape every study mode reads)
  function allCards(set) {
    const seen = new Set(), out = [];
    [set].concat(descendants(set.id)).forEach((d) => d.cards.forEach((c) => {
      const k = c[0].toLowerCase(); if (seen.has(k)) return; seen.add(k);
      out.push([c[0], c[1], d.id === set.id ? '' : d.name, Array.isArray(c[2]) && c[2].length >= 3 ? c[2] : null, c[3] || '']);
    }));
    return out;
  }
  // multiple choice: a card's own wrong answers, else other answers picked the same way every time (so saved mistakes stay valid)
  function quizFor(cards) {
    const backs = Array.from(new Set(cards.map((c) => c[1])));
    const mix = (i, j) => (Math.imul(i + 1, 2654435761) ^ Math.imul(j + 7, 40503)) >>> 0;
    return cards.slice(0, 40).map((c, i) => {
      const wrong = c[3] ? c[3].slice(0, 3) : backs.filter((b) => b !== c[1]).map((b, j) => [mix(i, j), b]).sort((x, y) => x[0] - y[0]).slice(0, 3).map((x) => x[1]);
      return wrong.length >= 3 ? { q: esc(c[0]), options: [esc(c[1])].concat(wrong.map(esc)), answer: 0, why: esc(c[4] || '') } : null;
    }).filter(Boolean);
  }
  // A saved deck looks like a subject to the rest of the app, so Flashcards, Quiz, Learn and Match all just work
  function asSubject(set) {
    if (views.has(set.id)) return views.get(set.id);
    const cards = allCards(set);
    const s = { id: set.id, custom: true, name: set.name, short: set.name, grade: 0, iconKey: 'study', icon: 'fa-layer-group', color: colorOf(set.color), tagline: cards.length + ' cards', intro: '', topics: [], quiz: quizFor(cards), flashcards: cards, home: '#/deck/' + set.id };
    views.set(set.id, s);
    return s;
  }
  // the Path tab: the deck in levels of about 6 cards (a short last level joins the one before it)
  function levels(cards) {
    const out = [];
    for (let i = 0; i < cards.length; i += 6) out.push(cards.slice(i, i + 6));
    if (out.length > 1 && out[out.length - 1].length < 4) { const last = out.pop(); out[out.length - 1] = out[out.length - 1].concat(last); }
    return out;
  }
  function levelView(base, n) {
    const key = base.id + '~' + n;
    if (views.has(key)) return views.get(key);
    const lv = levels(base.flashcards)[n - 1];
    if (!lv) return undefined;
    const s = Object.assign({}, base, { id: key, name: base.name + ' · Level ' + n, short: 'Level ' + n, flashcards: lv, quiz: quizFor(lv), base: base.id, home: '#/deck/' + base.id + '/path', tagline: lv.length + ' cards' });
    views.set(key, s);
    return s;
  }

  EF.sets = {
    list: () => load().slice().sort((a, b) => (b.updated || 0) - (a.updated || 0)),
    raw: byId,
    get(id) {
      const m = /^(my-[a-z0-9]{4,24})~(\d{1,3})$/.exec(String(id));
      if (m) { const base = EF.sets.get(m[1]); return base ? levelView(base, +m[2]) : undefined; }
      const x = byId(id); return x ? asSubject(x) : undefined;
    },
    save(set) {
      load();
      const id = typeof set.id === 'string' && ID.test(set.id) ? set.id : newId();
      const prev = byId(id);
      const s = { id, name: clean(set.name, 60) || 'Untitled', color: colorOf(set.color), cards: (set.cards || []).map(cardOf).filter(Boolean).slice(0, 400), updated: Date.now(), created: (prev && prev.created) || +set.created || Date.now() };
      const parent = set.parent !== undefined ? set.parent : prev && prev.parent;
      if (parent && okParent(id, parent)) s.parent = parent;
      const notes = (set.notes !== undefined ? set.notes : prev && prev.notes) || [];
      if (notes.length) s.notes = notes.map(noteOf).filter(Boolean).slice(0, 40);
      const from = set.from !== undefined ? set.from : prev && prev.from;
      if (typeof from === 'string' && /^[0-9a-f-]{36}$/.test(from)) s.from = from; // came from a shared link or a school library
      const i = cache.findIndex((x) => x.id === s.id);
      if (i >= 0) cache[i] = s; else cache.push(s);
      persist();
      return s;
    },
    // change one deck in place: fn gets a copy and returns nothing (or false to cancel)
    patch(id, fn) { const d = byId(id); if (!d) return null; const copy = JSON.parse(JSON.stringify(d)); if (fn(copy) === false) return d; return EF.sets.save(copy); },
    // a deck and all its subdecks
    remove(id) { load(); const gone = new Set([id].concat(descendants(id).map((d) => d.id))); cache = cache.filter((x) => !gone.has(x.id)); persist(); return gone.size; },
    children: kids,
    descendants,
    parentOk: okParent,
    levels: (id) => { const s = EF.sets.get(id); return s ? levels(s.flashcards) : []; },
    newNoteId: () => 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    // what goes into the cloud backup: every deck, with notes trimmed to fit (newest first)
    backup() {
      let budget = 150000;
      return EF.sets.list().map((d) => {
        const x = Object.assign({}, d);
        if (d.notes) x.notes = d.notes.slice().sort((a, b) => b.at - a.at).map((n) => { if (n.x.length <= budget) { budget -= n.x.length; return n; } return Object.assign({}, n, { x: '', cut: 1 }); });
        return x;
      });
    },
    // decks from a cloud backup: add the ones this device doesn't have, keep the newer copy of the rest
    mergeIn(list) {
      load();
      let changed = false;
      (Array.isArray(list) ? list : []).forEach((x) => {
        if (!x || typeof x.id !== 'string' || !ID.test(x.id) || !Array.isArray(x.cards)) return;
        const mine = byId(x.id);
        if (mine && (mine.updated || 0) >= (+x.updated || 0)) return;
        const s = { id: x.id, name: clean(x.name, 60) || 'Untitled', color: colorOf(x.color), cards: x.cards.map(cardOf).filter(Boolean).slice(0, 400), updated: +x.updated || Date.now(), created: +x.created || +x.updated || Date.now() };
        if (typeof x.parent === 'string' && ID.test(x.parent)) s.parent = x.parent;
        if (Array.isArray(x.notes)) {
          s.notes = x.notes.map(noteOf).filter(Boolean).slice(0, 40).map((n) => {
            // a note the backup had to trim keeps this device's full text
            const local = n.cut && mine && (mine.notes || []).find((m) => m.id === n.id);
            return local && local.x ? Object.assign({}, n, { x: local.x, cut: undefined }) : n;
          });
          if (!s.notes.length) delete s.notes;
        }
        if (typeof x.from === 'string' && /^[0-9a-f-]{36}$/.test(x.from)) s.from = x.from;
        if (mine) { Object.keys(mine).forEach((k) => delete mine[k]); Object.assign(mine, s); } else cache.push(s);
        changed = true;
      });
      // parents that didn't come along (or would loop) are dropped: those decks move to the top level
      cache.forEach((d) => { if (d.parent && !okParent(d.id, d.parent)) delete d.parent; });
      if (changed) persist();
    },
    colors: COLORS,
    colorNames: COLOR_NAMES,
    cardOf,

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
      const cards = o.k.filter((c) => Array.isArray(c) && typeof c[0] === 'string' && typeof c[1] === 'string').map(cardOf).filter(Boolean).slice(0, 400);
      if (!cards.length) throw new Error('empty set');
      return { name: clean(o.n, 60) || 'Shared deck', color: colorOf(o.c), cards };
    },
    async share(set) {
      const code = await EF.sets.encode(set);
      const url = location.href.split('#')[0] + '#/import/' + code;
      if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        try { await navigator.share({ title: set.name + ' · Zing', text: `Study “${set.name}” with me on Zing`, url }); return 'shared'; } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
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
    // a Path level of your own deck shares the deck's progress
    const bid = s.base || sid, home = s.home || '#/set/' + sid;
    const box = (c) => EF.store.cardBox(bid, c.front);
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
        if (it.stage >= 2) { done++; EF.store.setCardBox(bid, it.c.front, Math.max(3, box(it.c) + 1), true); }
        else queue.splice(Math.min(queue.length, 2), 0, it);
      } else {
        streak = 0; lives--;
        EF.haptic('error');
        it.stage = 0; it.opts = null;
        EF.store.setCardBox(bid, it.c.front, 1, true);
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
        <div class="btn-row center"><button type="button" class="btn btn-c" data-lagain>${icon('fa-rotate-right')} ${out ? 'Try again' : 'Next round'}</button><a class="btn" href="${esc(home)}">${icon(s.base ? 'fa-route' : 'fa-layer-group')} ${s.base ? 'Back to the path' : s.custom ? 'Back to the deck' : 'Other modes'}</a></div>
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
        el.querySelector('.match-grid').outerHTML = `<div class="learn-card learn-done is-in">${EF.mascot ? EF.mascot(record ? 'cheer' : 'wave', 120) : `<span class="learn-done-ic">${icon(record ? 'fa-trophy' : 'fa-flag-checkered')}</span>`}<h2>${fmt(ms)}</h2><p class="muted">${record ? 'New personal best!' : `Your best is ${fmt(EF.store.bestMatch(sid))}.`}${penalty ? ` Includes ${penalty / 1000}s penalty for wrong pairs.` : ''}</p><div class="btn-row center"><button type="button" class="btn btn-c" data-mrestart>${icon('fa-rotate-right')} Play again</button><a class="btn" href="${esc(s.home || '#/set/' + sid)}">${icon('fa-layer-group')} ${s.custom ? 'Back to the deck' : 'Other modes'}</a></div></div>`;
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
    const palette = COLORS.includes(color) ? COLORS : COLORS.concat(color);
    const sample = 'Photosynthesis - Plants making glucose from carbon dioxide and water using light\nOsmosis: Movement of water through a partially permeable membrane\nQ: What is the unit of force?\nA: The newton (N)';
    el.innerHTML = `<form class="make-form" novalidate>
      <label class="make-field"><span>Deck name</span><input name="name" maxlength="60" required placeholder="e.g. Physics test: moments" value="${existing ? esc(existing.name) : ''}"></label>
      <div class="make-field"><span>Colour</span><div class="make-colors" role="radiogroup" aria-label="Colour">${palette.map((c, i) => `<button type="button" class="make-color${c === color ? ' is-on' : ''}" style="--c:${esc(c)}" data-color="${esc(c)}" role="radio" aria-checked="${c === color}" aria-label="${esc(COLOR_NAMES[i] || 'Your colour')}"></button>`).join('')}</div></div>
      <label class="make-field"><span>Paste your notes: one card per line</span>
        <textarea name="text" rows="10" spellcheck="true" placeholder="${esc(sample)}">${existing ? esc(existing.cards.map((c) => c[0] + ' - ' + c[1]).join('\n')) : ''}</textarea></label>
      <p class="muted small">${icon('fa-circle-info')} Use <strong>term - meaning</strong>, <strong>term: meaning</strong>, a tab (copied from a spreadsheet or another flashcard app), or <strong>Q:</strong> / <strong>A:</strong> lines.${existing && existing.cards.some((c) => c[2]) ? ' Cards you don’t change keep their wrong answers and explanations.' : ''}</p>
      <div class="make-preview" aria-live="polite"></div>
      <div class="btn-row"><button class="btn btn-primary" type="submit">${icon('fa-floppy-disk')} ${existing ? 'Save changes' : 'Create deck'}</button>${existing ? `<button type="button" class="btn btn-danger" data-mdelete>${icon('fa-trash')} Delete deck</button>` : ''}</div>
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
      if (e.target.closest('[data-mdelete]') && existing) {
        const subs = EF.sets.descendants(existing.id).length;
        if (!confirm(`Delete “${existing.name}”${subs ? ` and its ${subs} subdeck${subs === 1 ? '' : 's'}` : ''}? This can’t be undone.`)) return;
        EF.sets.remove(existing.id); EF.toast('Deck deleted', 'fa-trash'); location.hash = existing.parent && EF.sets.raw(existing.parent) ? '#/deck/' + existing.parent : '#/decks';
      }
    };
    const onSubmit = (e) => {
      e.preventDefault();
      const name = e.target.name.value.trim();
      // a card that wasn't changed keeps its wrong answers and "why"
      const keep = new Map((existing ? existing.cards : []).map((c) => [c[0] + '\n' + c[1], c]));
      const cards = EF.sets.parse(ta.value).map((c) => keep.get(c[0] + '\n' + c[1]) || c);
      if (!name) { EF.toast('Give your deck a name', 'fa-circle-exclamation'); e.target.name.focus(); return; }
      if (cards.length < (existing ? 1 : 2)) { EF.toast(existing ? 'Add at least 1 card' : 'Add at least 2 cards', 'fa-circle-exclamation'); ta.focus(); return; }
      const saved = EF.sets.save({ id: existing && existing.id, name, color, cards });
      EF.store.addXP(existing ? 0 : 10);
      EF.toast(existing ? 'Saved' : `Created “${saved.name}” with ${saved.cards.length} cards`, 'fa-layer-group');
      location.hash = '#/deck/' + saved.id;
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
        <div class="btn-row center"><button type="button" class="btn btn-primary" data-iadd>${icon('fa-plus')} Add to my decks</button><a class="btn" href="#/">No thanks</a></div>
      </div>`;
    }).catch(() => { if (alive) el.innerHTML = `<div class="learn-card is-in"><h2>That link didn’t work</h2><p class="muted">It may have been cut off when it was copied. Ask your friend to send it again.</p><a class="btn" href="#/decks">${icon('fa-layer-group')} My decks</a></div>`; });
    const onClick = (e) => {
      if (!e.target.closest('[data-iadd]') || !set) return;
      const dupe = EF.sets.list().find((x) => x.name === set.name && x.cards.length === set.cards.length);
      const saved = dupe || EF.sets.save(set);
      EF.toast(dupe ? 'You already have this deck' : 'Added to your decks', 'fa-layer-group');
      location.hash = '#/deck/' + saved.id;
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
