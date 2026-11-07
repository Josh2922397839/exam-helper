/* Zing core — Gizmo-style cards.
   • EF.cardList(s): every card in a deck as a list, like Gizmo's "Cards (67)": the question in bold, the answer
     under a dashed line with its key words highlighted green, and multiple-choice cards showing ✓ and ✗ options.
     Search, topic chips, a "weakest first" sort, a Study deck button and a ⋮ menu (read aloud, save to my cards).
   • EF.markHtml / EF.topicTerms: highlight a topic's key terms inside its notes.
   • Quick check: 3 quick questions at the end of a topic, built from its key terms (or the deck cards on that topic).
   Content is written by us; anything a student typed (their own sets) is always escaped. */
(function () {
  'use strict';
  const EF = window.EF;
  const esc = EF.esc, icon = EF.icon;

  // plain text from content HTML
  const txt = (h) => String(h == null ? '' : h).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const uniq = (list) => { const seen = new Set(); return list.filter((x) => { const k = String(x).toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }); };

  /* ---------- key words: what gets highlighted ---------- */
  const okTerm = (x) => x.length >= 3 && x.length <= 34 && !/[<>&]/.test(x);
  EF.topicTerms = (t) => uniq((t.blocks || []).filter((b) => b.type === 'terms').flatMap((b) => b.items.map((it) => txt(it[0])))).filter(okTerm).sort((a, b) => b.length - a.length);
  const subjectTermCache = new Map();
  function subjectTerms(s) {
    if (!s.custom && subjectTermCache.has(s.id)) return subjectTermCache.get(s.id);
    const out = [];
    (s.topics || []).forEach((t) => out.push(...EF.topicTerms(t)));
    (s.flashcards || []).forEach((c) => { const f = txt(c[0]); if (f.length >= 4 && f.length <= 24 && f.split(' ').length <= 3 && !/[?]/.test(f)) out.push(f); });
    const list = uniq(out).filter(okTerm).sort((a, b) => b.length - a.length);
    if (!s.custom) subjectTermCache.set(s.id, list);
    return list;
  }
  // up to `max` non-overlapping phrases in the text (whole words, any case, an optional plural)
  function findPhrases(text, phrases, max) {
    const hits = [];
    for (const p of phrases) {
      if (hits.length >= max) break;
      const m = new RegExp('(^|[^\\p{L}\\p{N}])(' + reEsc(p) + '(?:s|es)?)(?=$|[^\\p{L}\\p{N}])', 'iu').exec(text);
      if (!m) continue;
      const a = m.index + m[1].length, b = a + m[2].length;
      if (!hits.some((h) => a < h[1] && b > h[0])) hits.push([a, b]);
    }
    return hits.sort((x, y) => x[0] - y[0]);
  }
  // plain text → escaped HTML with the hits wrapped in <mark>
  function markText(text, hits) {
    let out = '', at = 0;
    hits.forEach(([a, b]) => { out += esc(text.slice(at, a)) + '<mark class="gz-hl">' + esc(text.slice(a, b)) + '</mark>'; at = b; });
    return out + esc(text.slice(at));
  }
  // the key part of an answer, like Gizmo: short answers whole; "Hydrogen — atomic number 1" → Hydrogen; else its key terms
  function answerHtml(s, a, q) {
    const t = String(a), words = t.split(/\s+/).length;
    const m = /^(.{2,44}?)\s*(?:—|–|:|\(| - )/.exec(t);
    if (m && m[1].trim().split(/\s+/).length <= 5) return markText(t, [[0, m[1].trim().length]]);
    if (words <= 6 && t.length <= 48) return '<mark class="gz-hl">' + esc(t) + '</mark>';
    // inside a sentence, only specific terms (two words or longer ones), never the card's own words
    const own = txt(q).toLowerCase();
    return markText(t, findPhrases(t, subjectTerms(s).filter((p) => (p.includes(' ') || p.length >= 8) && !own.includes(p.toLowerCase())), 2));
  }
  // trusted HTML (notes): highlight phrases in the text between tags, never inside links, code or other marks
  EF.markHtml = (html, phrases, max) => {
    if (!phrases || !phrases.length) return html;
    let left = max || 2, skip = 0;
    return String(html).split(/(<[^>]+>)/).map((part) => {
      if (part.charAt(0) === '<') {
        if (/^<(a|code|mark|kbd)\b/i.test(part)) skip++;
        else if (/^<\/(a|code|mark|kbd)>/i.test(part)) skip = Math.max(0, skip - 1);
        return part;
      }
      if (skip || !left || !part.trim()) return part;
      const hits = findPhrases(part, phrases, left);
      left -= hits.length;
      let out = '', at = 0;
      hits.forEach(([a, b]) => { out += part.slice(at, a) + '<mark class="gz-hl">' + part.slice(a, b) + '</mark>'; at = b; });
      return out + part.slice(at);
    }).join('');
  };

  /* ---------- the deck as Gizmo cards ---------- */
  const FIRST = 12;
  EF.cardList = (s) => {
    const cards = s.flashcards || [], tags = EF.deckTags ? EF.deckTags(s) : [];
    const card = (c, k) => {
      const mc = c[5] === 'quiz' && Array.isArray(c[3]) && c[3].length > 0;
      const body = mc
        ? `<ul class="gz-opts">${EF.shuffleWith([[c[1], true]].concat(c[3].map((w) => [w, false])), EF.rng(k * 7919 + 17)).map(([o, ok]) => `<li${ok ? ' class="is-right"' : ''}>${icon(ok ? 'fa-circle-check' : 'fa-circle-xmark')}<span>${esc(o)}</span>${ok ? '<span class="sr-only"> (right answer)</span>' : ''}</li>`).join('')}</ul>`
        : `<p class="gz-a">${answerHtml(s, c[1], c[0])}</p>`;
      return `<li class="gz-card" data-k="${k}"${c[2] ? ` data-tag="${esc(c[2])}"` : ''}${k >= FIRST ? ' data-more' : ''}>
          <div class="gz-q"><strong>${esc(c[0])}</strong><button type="button" class="gz-more" data-gz-menu aria-label="Card options" aria-haspopup="menu" aria-expanded="false">${icon('fa-ellipsis-vertical')}</button></div>
          ${body}
        </li>`;
    };
    return `<section class="gz-deck" data-gz-deck="${esc(s.id)}" aria-labelledby="deck-h">
        <div class="gz-head">
          <h2 id="deck-h">Cards <span>(${cards.length})</span></h2>
          <div class="gz-head-btns">
            ${s.custom ? `<a class="btn gz-add" href="#/make/${esc(s.id)}" aria-label="Add or edit cards">${icon('fa-plus')}</a>` : ''}
            <a class="btn btn-ink gz-study" href="#/learn/${esc(s.id)}">${EF.img3d ? EF.img3d('game', 22) : icon('fa-gamepad')} Study deck</a>
          </div>
        </div>
        <label class="gz-search">${icon('fa-magnifying-glass')}<input type="search" placeholder="Search cards…" aria-label="Search cards" autocomplete="off" spellcheck="false" data-gz-search></label>
        <div class="gz-tools">
          ${tags.length > 1 ? `<div class="seg seg-sm seg-scroll deck-tags" role="toolbar" aria-label="Show cards on one topic"><button type="button" data-gz-tag="" aria-pressed="true">All</button>${tags.map((t) => `<button type="button" data-gz-tag="${esc(t)}" aria-pressed="false">${esc(t)}</button>`).join('')}</div>` : '<span class="gz-tools-gap"></span>'}
          <button type="button" class="gz-sort" data-gz-sort aria-pressed="false" title="Show the cards you know least first">${icon('fa-arrow-down-wide-short')}<span class="sr-only">Weakest cards first</span></button>
        </div>
        <ul class="gz-list">${cards.map(card).join('')}</ul>
        <p class="gz-empty" data-gz-empty hidden>${icon('fa-magnifying-glass')} No cards match that search.</p>
        ${cards.length > FIRST ? `<div class="center gz-all"><button type="button" class="btn" data-gz-all>${icon('fa-layer-group')} Show all ${cards.length} cards</button></div>` : ''}
      </section>`;
  };

  function filterDeck(deck) {
    const q = (deck.querySelector('[data-gz-search]').value || '').trim().toLowerCase(), tag = deck.dataset.tag || '';
    let shown = 0;
    deck.querySelectorAll('.gz-card').forEach((li) => {
      const ok = (!tag || li.dataset.tag === tag) && (!q || li.textContent.toLowerCase().includes(q));
      li.hidden = !ok; if (ok) shown++;
    });
    deck.classList.toggle('is-filtered', !!(q || tag));
    deck.querySelector('[data-gz-empty]').hidden = shown > 0;
  }

  /* the ⋮ menu on a card */
  let menu = null;
  function closeMenu(focusBack) {
    if (!menu) return;
    menu.btn.setAttribute('aria-expanded', 'false');
    menu.el.remove();
    if (focusBack) menu.btn.focus();
    menu = null;
  }
  function openMenu(btn) {
    const li = btn.closest('.gz-card'), deck = btn.closest('[data-gz-deck]'), s = EF.subject(deck.dataset.gzDeck);
    if (!s) return;
    const el = document.createElement('div');
    el.className = 'gz-menu'; el.setAttribute('role', 'menu');
    el.innerHTML = `<button type="button" role="menuitem" data-gz-act="speak">Read it aloud ${icon('fa-volume-high')}</button>
      ${s.custom ? `<a role="menuitem" href="#/make/${esc(s.id)}">Edit this set ${icon('fa-pen')}</a>` : `<button type="button" role="menuitem" data-gz-act="save">Save to my cards ${icon('fa-bookmark')}</button>`}
      <a role="menuitem" href="#/learn/${esc(s.id)}">Study the deck ${icon('fa-gamepad')}</a>`;
    li.appendChild(el);
    btn.setAttribute('aria-expanded', 'true');
    menu = { el, btn, li, s };
    const first = el.querySelector('[role="menuitem"]'); if (first) first.focus({ preventScroll: true });
  }
  function saveCard(s, c) {
    const NAME = 'Saved cards';
    const found = EF.sets.list().find((x) => x.name === NAME);
    const raw = found ? EF.sets.raw(found.id) : null;
    const list = raw ? raw.cards.slice() : [];
    if (list.some((x) => x[0] === c[0] && x[1] === c[1])) { EF.toast('Already in “Saved cards”', 'fa-bookmark'); return; }
    list.push([c[0], c[1]]);
    EF.sets.save({ id: raw ? raw.id : undefined, name: NAME, color: raw ? raw.color : EF.sets.colors[3], cards: list });
    EF.toast(`Saved to “${NAME}” · find it in My decks`, 'fa-bookmark');
    EF.haptic && EF.haptic('success');
  }

  document.addEventListener('click', (e) => {
    const t = e.target;
    if (menu && !menu.el.contains(t) && !t.closest('[data-gz-menu]')) closeMenu(false);
    const act = t.closest('[data-gz-act]');
    if (act && menu) {
      const c = menu.s.flashcards[+menu.li.dataset.k];
      if (c && act.dataset.gzAct === 'speak') EF.speak(menu.s.id === 'french' ? c[0] : c[0] + '. ' + c[1], menu.s.id === 'french' ? 'fr-FR' : 'en-GB');
      if (c && act.dataset.gzAct === 'save') saveCard(menu.s, c);
      closeMenu(true);
      return;
    }
    const mb = t.closest('[data-gz-menu]');
    if (mb) { const same = menu && menu.btn === mb; closeMenu(false); if (!same) openMenu(mb); return; }
    const deck = t.closest('[data-gz-deck]');
    if (!deck) return;
    if (t.closest('[data-gz-all]')) { deck.classList.add('is-all'); t.closest('.gz-all').remove(); return; }
    const chip = t.closest('[data-gz-tag]');
    if (chip) {
      deck.dataset.tag = chip.dataset.gzTag;
      deck.querySelectorAll('[data-gz-tag]').forEach((b) => b.setAttribute('aria-pressed', String(b === chip)));
      filterDeck(deck);
      return;
    }
    const sort = t.closest('[data-gz-sort]');
    if (sort) {
      const on = sort.getAttribute('aria-pressed') !== 'true', s = EF.subject(deck.dataset.gzDeck);
      sort.setAttribute('aria-pressed', String(on));
      const list = deck.querySelector('.gz-list'), items = Array.from(list.children);
      const box = (li) => (s ? EF.store.cardBox(s.id, s.flashcards[+li.dataset.k][0]) : 0);
      items.sort((a, b) => (on ? box(a) - box(b) : 0) || a.dataset.k - b.dataset.k).forEach((li) => list.appendChild(li));
      if (on) { deck.classList.add('is-all'); const all = deck.querySelector('.gz-all'); if (all) all.remove(); }
      EF.toast(on ? 'Cards you know least are first' : 'Back in order', 'fa-arrow-down-wide-short');
    }
  });
  document.addEventListener('input', (e) => { const inp = e.target.closest && e.target.closest('[data-gz-search]'); if (inp) filterDeck(inp.closest('[data-gz-deck]')); });
  document.addEventListener('keydown', (e) => {
    if (!menu) return;
    if (e.key === 'Escape') { e.preventDefault(); closeMenu(true); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const items = Array.from(menu.el.querySelectorAll('[role="menuitem"]')), i = items.indexOf(document.activeElement);
      e.preventDefault();
      items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length].focus();
    }
  });
  window.addEventListener('hashchange', () => closeMenu(false));

  /* ---------- Key terms: "Test me" hides the meanings until you tap Show ---------- */
  document.addEventListener('click', (e) => {
    const test = e.target.closest('[data-terms-test]');
    if (test) {
      const box = test.closest('[data-terms]'), on = !box.classList.contains('is-testing');
      box.classList.toggle('is-testing', on);
      test.setAttribute('aria-pressed', String(on));
      test.innerHTML = on ? `${icon('fa-eye')} Show all` : `${icon('fa-eye-slash')} Test me`;
      box.querySelectorAll('.term').forEach((x) => { x.classList.remove('is-shown'); const d = x.querySelector('.term-d'); if (d) d.setAttribute('aria-hidden', String(on)); const r = x.querySelector('[data-term-reveal]'); if (r) r.hidden = !on; });
      return;
    }
    const rev = e.target.closest('[data-term-reveal]');
    if (rev) {
      const term = rev.closest('.term'), on = !term.classList.contains('is-shown');
      term.classList.toggle('is-shown', on);
      term.querySelector('.term-d').setAttribute('aria-hidden', String(!on));
      rev.innerHTML = on ? `${icon('fa-eye-slash')} Hide` : `${icon('fa-eye')} Show`;
    }
  });

  /* ---------- Quick check: 3 questions at the end of a topic ---------- */
  const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'are', 'its', 'their', 'what', 'how', 'why', 'grade', 'review', 'older', 'topic', 'part', 'into', 'that', 'this', 'your']);
  // rough word stems, so "periodic" matches "Periods" and "ionic" matches "Ions"
  const stem = (w) => w.replace(/ies$/, 'y').replace(/ically$|ical$/, '').replace(/(.{3,})ic$/, '$1').replace(/([^s])s$/, '$1');
  const raw = (x) => txt(x).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').split(' ').filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w));
  const words = (x) => raw(x).map(stem);
  const nums = (x) => (txt(x).match(/\d+/g) || []).map(Number);
  // which topic each deck tag belongs to: the topic whose title shares its words, or whose notes mention them most
  const tagCache = new Map();
  function tagTopics(s) {
    if (tagCache.has(s.id)) return tagCache.get(s.id);
    const topics = s.topics.map((t) => {
      const n = nums((t.title || '') + ' ' + (t.nav || ''));
      const head = (t.title || '') + ' ' + (t.nav || '');
      return { id: t.id, exact: new Set(raw(head)), title: new Set(words(head)), range: n.length ? [Math.min(...n), Math.max(...n)] : null, body: words((t.blocks || []).map((b) => (EF.blockText ? EF.blockText(b) : '')).join(' ')) };
    });
    const map = new Map();
    (EF.deckTags ? EF.deckTags(s) : []).forEach((tag) => {
      const tr = raw(tag), tw = tr.map(stem), tn = nums(tag);
      if (!tw.length) return;
      let best = null, bestScore = 0, tie = false;
      topics.forEach((t) => {
        // chapters like "Genesis 29–30" belong to the topic whose range holds them ("Genesis 27–33")
        const inRange = t.range && tn.length && tn.every((n) => n >= t.range[0] && n <= t.range[1]) ? 15 : 0;
        // the same word in the title counts most, a word with the same stem a bit less, then mentions in the notes
        const named = tr.reduce((n, w, k) => n + (t.exact.has(w) ? 10 : t.title.has(tw[k]) ? 6 : 0), 0);
        const score = inRange + named + Math.min(9, t.body.filter((w) => tw.includes(w)).length);
        if (score > bestScore) { best = t.id; bestScore = score; tie = false; } else if (score && score === bestScore) tie = true;
      });
      if (best && bestScore >= 2 && !tie) map.set(tag, best);
    });
    tagCache.set(s.id, map);
    return map;
  }
  const topicCards = (s, t) => { const m = tagTopics(s); return (s.flashcards || []).filter((c) => c[2] && m.get(c[2]) === t.id && Array.isArray(c[3]) && c[3].length >= 3 && c[1].length <= 160); };
  const termPairs = (t) => (t.blocks || []).filter((b) => b.type === 'terms').flatMap((b) => b.items.map((it) => ({ w: txt(it[0]), d: txt(it[1]) }))).filter((x) => x.w && x.d && x.d.length <= 230);
  const allTerms = new Map();
  const subjectPairs = (s) => { if (!allTerms.has(s.id)) allTerms.set(s.id, s.topics.flatMap(termPairs)); return allTerms.get(s.id); };

  function questionsFor(s, t) {
    const terms = termPairs(t), qs = [];
    if (terms.length >= 2 && subjectPairs(s).length >= 4) {
      const pool = subjectPairs(s);
      EF.shuffle(terms).slice(0, 3).forEach((x, i) => {
        const others = EF.shuffle(terms.filter((y) => y.w !== x.w)).concat(EF.shuffle(pool.filter((y) => y.w !== x.w && !terms.some((z) => z.w === y.w))));
        if (i % 2 === 0) qs.push({ q: `Which term means: “${x.d}”?`, a: x.w, opts: EF.shuffle(uniq([x.w].concat(others.map((o) => o.w))).slice(0, 4)), why: '' });
        else qs.push({ q: `What does “${x.w}” mean?`, a: x.d, opts: EF.shuffle(uniq([x.d].concat(others.map((o) => o.d))).slice(0, 4)), why: '' });
      });
    } else {
      EF.shuffle(topicCards(s, t)).slice(0, 3).forEach((c) => qs.push({ q: c[0], a: c[1], opts: EF.shuffle(uniq([c[1]].concat(c[3].slice(0, 3)))), why: c[4] || '' }));
    }
    return qs.filter((q) => q.opts.length >= 3);
  }
  const hasCheck = (s, t) => (termPairs(t).length >= 2 && subjectPairs(s).length >= 4) || topicCards(s, t).length >= 2;
  EF.qcheckHost = (s, t) => (!s.custom && hasCheck(s, t) ? `<section class="qcheck tint" style="--c:${esc(s.color)}" data-qcheck="${esc(s.id)}/${esc(t.id)}" aria-label="Quick check: ${esc(t.title)}"></section>` : '');

  const QC = 'ef2:qcheck';
  const qcMap = () => { try { return JSON.parse(localStorage.getItem(QC) || '{}') || {}; } catch (e) { return {}; } };
  function firstToday(key) {
    const m = qcMap(), today = new Date().toDateString(), fresh = m[key] !== today;
    m[key] = today;
    const keys = Object.keys(m); if (keys.length > 400) keys.slice(0, keys.length - 400).forEach((k) => delete m[k]);
    try { localStorage.setItem(QC, JSON.stringify(m)); } catch (e) { /* private mode */ }
    return fresh;
  }

  EF.mountQuickCheck = (el) => {
    const [sid, tid] = el.dataset.qcheck.split('/');
    const s = EF.subject(sid), t = s && s.topics.find((x) => x.id === tid);
    if (!s || !t) return () => {};
    let qs = [], i = 0, right = 0, picked = null;
    const head = () => `<div class="qc-head"><span class="qc-badge">${icon('fa-bolt')} Quick check</span>${qs.length ? `<span class="qc-dots" aria-hidden="true">${qs.map((_, k) => `<span class="${k < i ? 'is-done' : k === i ? 'is-now' : ''}"></span>`).join('')}</span>` : ''}</div>`;
    function render(focusOpt) {
      if (i >= qs.length) return done();
      const q = qs[i];
      el.innerHTML = `${head()}
        <p class="qc-q"><span class="sr-only">Question ${i + 1} of ${qs.length}: </span>${esc(q.q)}</p>
        <div class="qc-opts">${q.opts.map((o, k) => `<button type="button" class="qc-opt" data-qc-opt="${k}">${esc(o)}</button>`).join('')}</div>
        <p class="qc-fb" role="status"></p>
        <div class="qc-foot" hidden><button type="button" class="btn btn-c btn-sm" data-qc-next>${i + 1 < qs.length ? `Next ${icon('fa-arrow-right')}` : `See my score ${icon('fa-flag-checkered')}`}</button></div>`;
      if (focusOpt) { const b = el.querySelector('.qc-opt'); if (b) b.focus({ preventScroll: true }); }
    }
    function answer(k) {
      if (picked != null) return;
      picked = k;
      const q = qs[i], ok = q.opts[k] === q.a;
      if (ok) right++;
      el.querySelectorAll('.qc-opt').forEach((b, j) => {
        b.disabled = true;
        if (q.opts[j] === q.a) b.classList.add('is-right');
        else if (j === k) b.classList.add('is-wrong');
      });
      const fb = el.querySelector('.qc-fb');
      fb.className = 'qc-fb ' + (ok ? 'is-ok' : 'is-bad');
      fb.innerHTML = ok ? `${icon('fa-circle-check')} ${EF.shuffle(['Nice!', 'Yes!', 'You got it!', 'Correct!'])[0]}${q.why ? ` <span>${esc(q.why)}</span>` : ''}` : `${icon('fa-circle-xmark')} Not quite. It’s “${esc(q.a)}”.${q.why ? ` <span>${esc(q.why)}</span>` : ''}`;
      EF.haptic && EF.haptic(ok ? 'success' : 'error');
      const foot = el.querySelector('.qc-foot'); foot.hidden = false; foot.querySelector('button').focus({ preventScroll: true });
    }
    function done() {
      const perfect = right === qs.length, fresh = firstToday(sid + '/' + tid), xp = fresh ? right * 3 : 0;
      if (xp) EF.store.addXP(xp);
      if (right * 2 >= qs.length) EF.store.markVisited(sid, tid);
      if (perfect) EF.confetti && EF.confetti();
      el.innerHTML = `${head()}<div class="qc-done">${EF.mascot ? EF.mascot(perfect ? 'cheer' : 'think', 64) : ''}
          <div><strong>${right} of ${qs.length} right${perfect ? ' · Locked in! 🎉' : right ? ' · Nice try!' : ' · Read it once more'}</strong><span>${xp ? `+${xp} XP` : fresh ? 'No XP this time: try again!' : 'Done today already: no extra XP, but great practice'}</span></div>
          <button type="button" class="btn btn-sm" data-qc-again>${icon('fa-rotate-right')} New questions</button>
        </div>`;
    }
    function start(focus) { qs = questionsFor(s, t); i = 0; right = 0; picked = null; if (!qs.length) { el.hidden = true; return; } render(focus); }
    const onClick = (e) => {
      const b = e.target.closest('button'); if (!b || !el.contains(b)) return;
      if (b.dataset.qcOpt != null) answer(+b.dataset.qcOpt);
      else if (b.hasAttribute('data-qc-next')) { i++; picked = null; render(true); }
      else if (b.hasAttribute('data-qc-again')) start(true);
    };
    el.addEventListener('click', onClick);
    start(false);
    return () => el.removeEventListener('click', onClick);
  };
})();
