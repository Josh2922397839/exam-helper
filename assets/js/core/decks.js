/* Zing — My decks: your own decks of cards, notes and subdecks.
   • EF.addDeck(): the New deck dialog (In: · Deck name · + Add another · colours, or any colour you like)
   • #/decks: all your decks · #/deck/:id[/path|materials|board]: one deck · #/note/:deck/:note: one note
   • A deck has a Path (levels to play), Materials (Magic import, notes, subdecks, cards) and a Leaderboard
   • Share a deck by link; every time another student saves it you get coins (paid out in social.js)
   Everything students type is escaped before it's shown. */
(function () {
  'use strict';
  const EF = window.EF;
  const esc = EF.esc, icon = EF.icon, ls = EF.ls;
  const brand = (name) => `<i class="fa-brands ${name}" aria-hidden="true"></i>`;
  const KINDS = {
    note: ['fa-pen-to-square', 'Notes'], paste: ['fa-align-left', 'Pasted notes'], pdf: ['fa-file-pdf', 'PDF'], doc: ['fa-file-word', 'Word document'],
    slides: ['fa-file-powerpoint', 'PowerPoint'], text: ['fa-file-lines', 'Text file'], web: ['fa-link', 'Web page'], yt: ['youtube', 'YouTube'],
    audio: ['fa-microphone', 'Recording'], photo: ['fa-camera', 'Photos'], sheet: ['fa-table', 'Sheet']
  };
  const kindIcon = (k) => (k === 'yt' ? brand('fa-youtube') : icon((KINDS[k] || KINDS.note)[0]));
  const COINS_PER_SAVE = 25;
  const cloudOn = () => !!(EF.cloud && EF.cloud.enabled && EF.cloud.joined());
  const top = () => EF.sets.list().filter((d) => !d.parent || !EF.sets.raw(d.parent)).sort((a, b) => (b.created || 0) - (a.created || 0));
  const words = (t) => (String(t || '').match(/\S+/g) || []).length;
  const when = (t) => { const d = new Date(t); const days = Math.round((Date.now() - t) / 864e5); return days < 1 ? 'today' : days === 1 ? 'yesterday' : days < 7 ? days + ' days ago' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); };
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const cloudIdOf = (id) => { const d = EF.sets.raw(id); return (EF.cloud && EF.cloud.published(id)) || (d && d.from) || null; };
  EF.deckCloudId = cloudIdOf;
  // where "Study deck" goes: Learn needs 4 cards, Flashcards works with any
  const studyHref = (id) => { const s = EF.sets.get(id); const n = s ? s.flashcards.length : 0; return n >= 4 ? '#/learn/' + id : n ? '#/cards/' + id : ''; };
  EF.deckStudyHref = studyHref;

  /* ================= your XP on each deck (for its leaderboard) ================= */
  const DXP = 'ef2:deckxp';
  let dxp = {}; try { dxp = JSON.parse(ls.get(DXP) || '{}') || {}; } catch (e) { dxp = {}; }
  const pendingXp = {}; let xpTimer = 0;
  const studyingDeck = () => { const m = /^#\/(learn|match|speed|gap|cards|quiz|set)\/(my-[a-z0-9]{4,24})(?:~\d+)?(?:\/|$)/.exec(location.hash); return m && EF.sets.raw(m[2]) ? m[2] : null; };
  EF.deckXp = (id) => dxp[id] || 0;
  async function flushDeckXp() {
    clearTimeout(xpTimer); xpTimer = 0;
    for (const cid of Object.keys(pendingXp)) {
      const n = Math.min(200, pendingXp[cid]);
      try { await EF.cloud.deckXp(cid, n); pendingXp[cid] -= n; if (pendingXp[cid] <= 0) delete pendingXp[cid]; } catch (e) { /* try again later */ }
    }
  }
  EF.on('xp', (d) => {
    if (!d || !(d.n > 0)) return;
    const id = studyingDeck(); if (!id) return;
    dxp[id] = (dxp[id] || 0) + d.n; ls.set(DXP, JSON.stringify(dxp));
    const cid = cloudIdOf(id);
    if (cid && cloudOn()) { pendingXp[cid] = (pendingXp[cid] || 0) + d.n; if (!xpTimer) xpTimer = setTimeout(flushDeckXp, 6000); }
  });
  window.addEventListener('pagehide', () => { flushDeckXp(); });

  /* ================= the sidebar's "My decks" ================= */
  EF.deckSide = (currentId) => {
    const list = top();
    const open = new Set();
    let p = currentId && EF.sets.raw(currentId), guard = 0;
    while (p && guard++ < 8) { open.add(p.id); p = p.parent && EF.sets.raw(p.parent); }
    const row = (d, depth) => {
      const subs = EF.sets.children(d.id), on = d.id === currentId;
      return `<li class="side-subject tint${open.has(d.id) ? ' is-open' : ''}" style="--c:${esc(d.color)}">
        <a class="side-link side-deck${on ? ' is-active' : ''}" href="#/deck/${esc(d.id)}"${on ? ' aria-current="page"' : ''}><span class="side-sq" aria-hidden="true"></span><span>${esc(d.name)}</span>${subs.length ? `<span class="side-n" title="${plural(subs.length, 'subdeck')}">${subs.length}</span>` : ''}</a>
        ${open.has(d.id) && subs.length && depth < 3 ? `<ul class="side-decks-sub">${subs.map((k) => row(k, depth + 1)).join('')}</ul>` : ''}
      </li>`;
    };
    return `<div class="side-head side-head-decks"><span>My decks</span><button type="button" class="side-head-add" data-add-deck aria-label="New deck">${icon('fa-plus')}</button></div>
      ${list.length ? `<ul class="side-subjects side-decks">${list.slice(0, 14).map((d) => row(d, 0)).join('')}</ul>${list.length > 14 ? `<a class="side-more" href="#/decks">See all ${list.length} decks ${icon('fa-arrow-right')}</a>` : ''}`
        : `<button type="button" class="side-empty" data-add-deck>${icon('fa-plus')} Make your first deck</button>`}`;
  };

  /* ================= a small pop-up menu ================= */
  let menu = null;
  function closeMenu(focusBack) { if (!menu) return; menu.btn.setAttribute('aria-expanded', 'false'); menu.el.remove(); if (focusBack) menu.btn.focus(); menu = null; }
  function openMenu(btn, items) {
    const same = menu && menu.btn === btn; closeMenu(false); if (same) return;
    const el = document.createElement('div');
    el.className = 'dk-menu'; el.setAttribute('role', 'menu');
    el.innerHTML = items.map((it) => it ? `<button type="button" role="menuitem" data-mi="${esc(it.k)}"${it.danger ? ' class="is-danger"' : ''}>${it.art || icon(it.ic)}<span>${esc(it.label)}</span></button>` : '<hr>').join('');
    const host = btn.closest('[data-menu-host]') || btn.parentElement;
    host.appendChild(el);
    // keep it on screen: open to the left when the button is near the right edge
    const r = btn.getBoundingClientRect(), hr = host.getBoundingClientRect();
    el.style.top = (r.bottom - hr.top + 6) + 'px';
    if (r.left + 240 > innerWidth - 8) el.style.right = Math.max(0, hr.right - r.right) + 'px'; else el.style.left = Math.max(0, r.left - hr.left) + 'px';
    btn.setAttribute('aria-expanded', 'true');
    menu = { el, btn, items };
    const first = el.querySelector('[role="menuitem"]'); if (first) first.focus({ preventScroll: true });
    return new Promise((resolve) => { menu.resolve = resolve; });
  }
  document.addEventListener('click', (e) => {
    if (!menu) return;
    const it = e.target.closest('.dk-menu [data-mi]');
    if (it && menu.el.contains(it)) { const r = menu.resolve, k = it.dataset.mi; closeMenu(true); r(k); return; }
    if (!menu.el.contains(e.target) && !menu.btn.contains(e.target)) { const r = menu.resolve; closeMenu(false); r(null); }
  }, true);
  document.addEventListener('keydown', (e) => {
    if (!menu) return;
    if (e.key === 'Escape') { e.preventDefault(); const r = menu.resolve; closeMenu(true); r(null); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const items = Array.from(menu.el.querySelectorAll('[role="menuitem"]')), i = items.indexOf(document.activeElement);
      e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length].focus();
    }
  });
  window.addEventListener('hashchange', () => { if (menu) { const r = menu.resolve; closeMenu(false); r(null); } });

  /* ================= New deck / Edit deck ================= */
  function deckOptions(selected, exclude) {
    const out = [];
    const walk = (list, depth) => list.forEach((d) => {
      if (exclude.has(d.id)) return;
      out.push(`<option value="${esc(d.id)}"${d.id === selected ? ' selected' : ''}>${'   '.repeat(depth)}${depth ? '↳ ' : ''}${esc(d.name)}</option>`);
      if (depth < 4) walk(EF.sets.children(d.id), depth + 1);
    });
    walk(top(), 0);
    return out.join('');
  }
  EF.addDeck = (opts) => {
    opts = opts || {};
    const edit = opts.edit ? EF.sets.raw(opts.edit) : null;
    const COLORS = EF.sets.colors, NAMES = EF.sets.colorNames;
    let color = edit ? edit.color : opts.color || COLORS[Math.floor(Math.random() * COLORS.length)];
    let custom = !COLORS.includes(color) ? color : null;
    const exclude = edit ? new Set([edit.id].concat(EF.sets.descendants(edit.id).map((d) => d.id))) : new Set();
    const parent0 = edit ? edit.parent || '' : opts.parent && EF.sets.raw(opts.parent) ? opts.parent : '';
    const dlg = document.createElement('dialog');
    dlg.className = 'zdlg adk-dlg';
    const swatches = () => COLORS.map((c, i) => `<button type="button" class="adk-sw" role="radio" style="--sw:${c}" data-adk-color="${c}" aria-checked="${c === color}" aria-label="${NAMES[i]}"></button>`).join('')
      + `${custom ? `<button type="button" class="adk-sw" role="radio" style="--sw:${esc(custom)}" data-adk-color="${esc(custom)}" aria-checked="${custom === color}" aria-label="Your colour"></button>` : ''}`
      + `<label class="adk-sw adk-pick" title="Pick any colour"><input type="color" value="${esc(custom || '#0b8a5e')}" data-adk-pick aria-label="Pick any colour">${icon('fa-plus')}</label>`;
    dlg.innerHTML = `<form method="dialog" class="zdlg-box adk-box" novalidate>
      <header class="zdlg-head adk-head"><h2>${edit ? 'Edit deck' : 'New deck'}</h2><button type="submit" value="x" class="icon-btn" aria-label="Close" formnovalidate>${icon('fa-xmark')}</button></header>
      <label class="adk-in"><span>In:</span><select data-adk-parent aria-label="Where the deck goes"><option value="">My decks</option>${deckOptions(parent0, exclude)}</select>${icon('fa-chevron-down')}</label>
      <div class="adk-field"><label class="adk-label" for="adk-n0">Deck name</label>
        <div class="adk-names" data-adk-names><div class="adk-name-row"><input id="adk-n0" class="adk-name" maxlength="60" autocomplete="off" placeholder="e.g. Enzymes" value="${edit ? esc(edit.name) : ''}"></div></div>
        ${edit ? '' : `<button type="button" class="adk-more" data-adk-more>${icon('fa-plus')} Add another</button>`}
      </div>
      <fieldset class="adk-colors"><legend class="adk-label">Colour</legend><div class="adk-swatches" role="radiogroup" aria-label="Colour" data-adk-sw>${swatches()}</div></fieldset>
      <footer class="zdlg-foot"><button type="button" class="btn btn-primary btn-lg btn-block" data-adk-go${edit ? '' : ' disabled'}>${edit ? 'Save' : 'Add deck'}</button></footer>
    </form>`;
    document.body.appendChild(dlg);
    const names = () => Array.from(dlg.querySelectorAll('.adk-name')).map((i) => i.value.trim()).filter(Boolean);
    const go = dlg.querySelector('[data-adk-go]');
    const sync = () => { go.disabled = !names().length; const n = names().length; if (!edit) go.textContent = n > 1 ? `Add ${n} decks` : 'Add deck'; };
    const paint = () => { dlg.querySelector('[data-adk-sw]').innerHTML = swatches(); };
    function create() {
      const list = names();
      if (!list.length) { dlg.querySelector('.adk-name').focus(); return; }
      const parent = dlg.querySelector('[data-adk-parent]').value || null;
      if (edit) {
        EF.sets.patch(edit.id, (d) => { d.name = list[0]; d.color = color; d.parent = parent; });
        dlg.close(); EF.toast('Deck saved', 'fa-check'); EF.emit('rerender'); return;
      }
      const made = list.slice(0, 8).map((name) => EF.sets.save({ name, color, parent, cards: [] }));
      dlg.close();
      EF.haptic && EF.haptic('success');
      EF.toast(made.length > 1 ? `${made.length} decks added` : `“${made[0].name}” added`, 'fa-layer-group');
      if (opts.then) opts.then(made[0]); else location.hash = '#/deck/' + made[0].id;
    }
    dlg.addEventListener('input', (e) => { if (e.target.matches('.adk-name')) sync(); });
    dlg.addEventListener('change', (e) => { if (e.target.matches('[data-adk-pick]')) { custom = color = e.target.value; paint(); } });
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) { dlg.close(); return; }
      const sw = e.target.closest('[data-adk-color]');
      if (sw) { color = sw.dataset.adkColor; paint(); const b = dlg.querySelector(`[data-adk-color="${CSS.escape(color)}"]`); if (b) b.focus(); return; }
      if (e.target.closest('[data-adk-more]')) {
        const box = dlg.querySelector('[data-adk-names]'), n = box.children.length;
        if (n >= 8) { EF.toast('Up to 8 at a time', 'fa-circle-info'); return; }
        box.insertAdjacentHTML('beforeend', `<div class="adk-name-row"><input class="adk-name" maxlength="60" autocomplete="off" placeholder="Another deck" aria-label="Deck name ${n + 1}"><button type="button" class="icon-btn adk-x" data-adk-x aria-label="Remove">${icon('fa-xmark')}</button></div>`);
        box.lastElementChild.querySelector('input').focus();
        return;
      }
      const x = e.target.closest('[data-adk-x]');
      if (x) { x.closest('.adk-name-row').remove(); sync(); return; }
      if (e.target.closest('[data-adk-go]')) create();
    });
    dlg.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('.adk-name')) { e.preventDefault(); create(); } });
    dlg.addEventListener('close', () => dlg.remove());
    dlg.showModal();
    const first = dlg.querySelector('.adk-name'); first.focus(); if (edit) first.select();
    sync();
  };

  /* ================= add or edit cards ================= */
  EF.editCards = (deckId, index) => {
    const d = EF.sets.raw(deckId); if (!d) return;
    const editing = index != null && d.cards[index] ? d.cards[index] : null;
    const dlg = document.createElement('dialog');
    dlg.className = 'zdlg ck-dlg';
    const row = (c, k) => `<fieldset class="ck-row" data-ck-row>
      <legend class="sr-only">Card ${k + 1}</legend>
      <label class="ck-field"><span>Question</span><textarea rows="2" maxlength="300" data-ck-q placeholder="e.g. What do enzymes speed up?">${c ? esc(c[0]) : ''}</textarea></label>
      <label class="ck-field"><span>Answer</span><textarea rows="2" maxlength="300" data-ck-a placeholder="e.g. Chemical reactions">${c ? esc(c[1]) : ''}</textarea></label>
      <details class="ck-extra"${c && Array.isArray(c[2]) && c[2].length ? ' open' : ''}><summary>${icon('fa-list-ul')} Wrong answers and why (optional)</summary>
        <div class="ck-wrongs">${[0, 1, 2].map((i) => `<input maxlength="200" data-ck-w placeholder="Wrong answer ${i + 1}" value="${c && c[2] && c[2][i] ? esc(c[2][i]) : ''}" aria-label="Wrong answer ${i + 1}">`).join('')}</div>
        <label class="ck-field"><span>Why (shows after answering)</span><input maxlength="300" data-ck-why value="${c && c[3] ? esc(c[3]) : ''}"></label>
      </details>
      ${k ? `<button type="button" class="link ck-remove" data-ck-x>${icon('fa-trash')} Remove this card</button>` : ''}
    </fieldset>`;
    dlg.innerHTML = `<form method="dialog" class="zdlg-box ck-box" novalidate>
      <header class="zdlg-head"><span class="ck-sq" style="--c:${esc(d.color)}" aria-hidden="true"></span><div><h2>${editing ? 'Edit card' : 'Add cards'}</h2><small>${esc(d.name)}</small></div><button type="submit" value="x" class="icon-btn" aria-label="Close" formnovalidate>${icon('fa-xmark')}</button></header>
      <div class="zdlg-scroll ck-rows" data-ck-rows>${row(editing, 0)}</div>
      ${editing ? '' : `<button type="button" class="adk-more" data-ck-more>${icon('fa-plus')} Add another</button>`}
      <footer class="zdlg-foot ck-foot">${editing ? `<button type="button" class="btn btn-danger" data-ck-del>${icon('fa-trash')} Delete</button>` : ''}<button type="button" class="btn btn-primary btn-lg" data-ck-save>${icon('fa-check')} ${editing ? 'Save card' : 'Save cards'}</button></footer>
    </form>`;
    document.body.appendChild(dlg);
    const read = () => Array.from(dlg.querySelectorAll('[data-ck-row]')).map((r) => {
      const q = r.querySelector('[data-ck-q]').value.trim(), a = r.querySelector('[data-ck-a]').value.trim();
      const w = Array.from(r.querySelectorAll('[data-ck-w]')).map((i) => i.value.trim()).filter(Boolean), why = r.querySelector('[data-ck-why]').value.trim();
      return q || a ? [q, a, w, why] : null;
    }).filter(Boolean);
    function save() {
      const cards = read();
      const bad = cards.find((c) => !c[0] || !c[1]);
      if (bad) { EF.toast('Each card needs a question and an answer', 'fa-circle-exclamation'); return; }
      if (!cards.length) { dlg.querySelector('[data-ck-q]').focus(); return; }
      const half = cards.find((c) => c[2].length && c[2].length < 3);
      if (half) { EF.toast('Give 3 wrong answers, or leave them all empty', 'fa-circle-exclamation'); return; }
      EF.sets.patch(deckId, (x) => { if (editing) x.cards[index] = EF.sets.cardOf(cards[0]) || x.cards[index]; else x.cards = x.cards.concat(cards.map(EF.sets.cardOf).filter(Boolean)); });
      if (!editing) EF.store.addXP(Math.min(10, cards.length * 2));
      dlg.close(); EF.haptic && EF.haptic('success');
      EF.toast(editing ? 'Card saved' : `${plural(cards.length, 'card')} added`, 'fa-clone');
      EF.emit('rerender');
    }
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) { dlg.close(); return; }
      if (e.target.closest('[data-ck-more]')) {
        const box = dlg.querySelector('[data-ck-rows]');
        if (box.children.length >= 20) { EF.toast('Save these first', 'fa-circle-info'); return; }
        box.insertAdjacentHTML('beforeend', row(null, box.children.length));
        box.lastElementChild.querySelector('[data-ck-q]').focus();
        box.lastElementChild.scrollIntoView({ block: 'nearest' });
        return;
      }
      const x = e.target.closest('[data-ck-x]'); if (x) { x.closest('[data-ck-row]').remove(); return; }
      if (e.target.closest('[data-ck-save]')) { save(); return; }
      if (e.target.closest('[data-ck-del]') && confirm('Delete this card?')) {
        EF.sets.patch(deckId, (x) => { x.cards.splice(index, 1); }); dlg.close(); EF.toast('Card deleted', 'fa-trash'); EF.emit('rerender');
      }
    });
    dlg.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save(); } });
    dlg.addEventListener('close', () => dlg.remove());
    dlg.showModal();
    dlg.querySelector('[data-ck-q]').focus();
  };

  /* ================= share a deck ================= */
  EF.shareDeck = async (id) => {
    const d = EF.sets.raw(id); if (!d) return;
    if (!d.cards.length) { EF.toast('Add some cards first, then share', 'fa-circle-info'); return; }
    // no account (or offline): the whole deck travels inside the link instead
    if (!cloudOn() || !navigator.onLine) {
      const r = await EF.sets.share(d);
      if (r === 'copied') EF.toast('Link copied: send it to your friends!', 'fa-link'); else if (r === 'shared') EF.toast('Shared!', 'fa-share-nodes');
      return;
    }
    const me = EF.cloud.cachedMe();
    const original = d.from && !EF.cloud.published(id) ? d.from : null;
    const dlg = document.createElement('dialog');
    dlg.className = 'zdlg shr-dlg';
    let listed = EF.cloud.listed(id), url = original ? location.origin + location.pathname + '#/shared/' + original : '';
    const body = (state) => state === 'busy' ? `<div class="shr-busy">${EF.img3d('link', 44)}<p>Making your link…</p></div>`
      : state === 'err' ? `<p class="shr-err">${icon('fa-circle-exclamation')} <span data-shr-msg></span></p><button type="button" class="btn btn-primary btn-block" data-shr-retry>Try again</button>`
      : `${original ? `<p class="shr-coins">${EF.img3d('people', 30)}<span>You saved this deck from a friend, so this shares <b>their</b> link.</span></p>` : `<p class="shr-coins">${EF.img3d('coin', 30)}<span>You get <b>${COINS_PER_SAVE} coins</b> every time someone saves it.</span></p>`}
        <div class="shr-link"><input readonly value="${esc(url)}" aria-label="Link to your deck" data-shr-url><button type="button" class="btn" data-shr-copy>${icon('fa-copy')} Copy</button></div>
        ${navigator.share ? `<button type="button" class="btn btn-primary btn-lg btn-block" data-shr-native>${icon('fa-share-nodes')} Share…</button>` : ''}
        ${me && me.school && !original ? `<label class="shr-opt"><input type="checkbox" data-shr-listed${listed ? ' checked' : ''}><span><strong>Show it in ${esc(me.school.name)}’s library</strong><small>Classmates can find it on the school page</small></span></label>` : ''}
        <p class="muted small">${icon('fa-lock')} The link shows the cards only (not your notes). Changed the deck? Share again and the same link updates.</p>`;
    dlg.innerHTML = `<form method="dialog" class="zdlg-box shr-box"><header class="zdlg-head"><span class="ck-sq" style="--c:${esc(d.color)}" aria-hidden="true"></span><div><small>Share deck</small><h2>${esc(d.name)}</h2></div><button type="submit" value="x" class="icon-btn" aria-label="Close">${icon('fa-xmark')}</button></header><div data-shr-body>${body('busy')}</div></form>`;
    document.body.appendChild(dlg);
    const host = dlg.querySelector('[data-shr-body]');
    async function make() {
      if (original) { host.innerHTML = body('ok'); return; }
      host.innerHTML = body('busy');
      try { const r = await EF.cloud.shareDeck(id, listed); url = r.url; host.innerHTML = body('ok'); }
      catch (er) { host.innerHTML = body('err'); host.querySelector('[data-shr-msg]').textContent = er.message || 'Couldn’t make the link. Try again.'; }
    }
    dlg.addEventListener('click', async (e) => {
      if (e.target === dlg) { dlg.close(); return; }
      if (e.target.closest('[data-shr-retry]')) { make(); return; }
      if (e.target.closest('[data-shr-copy]')) {
        try { await navigator.clipboard.writeText(url); EF.toast('Link copied!', 'fa-link'); } catch (er) { const i = dlg.querySelector('[data-shr-url]'); i.select(); document.execCommand && document.execCommand('copy'); EF.toast('Link copied!', 'fa-link'); }
        return;
      }
      if (e.target.closest('[data-shr-native]')) { try { await navigator.share({ title: d.name + ' · Zing', text: `Study “${d.name}” with me on Zing`, url }); } catch (er) { /* cancelled */ } }
    });
    dlg.addEventListener('change', (e) => { if (e.target.matches('[data-shr-listed]')) { listed = e.target.checked; make().then(() => EF.toast(listed ? 'Now in your school library' : 'Removed from the school library', 'fa-school')); } });
    dlg.addEventListener('close', () => { dlg.remove(); EF.emit('rerender'); });
    dlg.showModal();
    make();
  };

  /* ================= #/decks: all your decks ================= */
  const tile = (d) => {
    const s = EF.sets.get(d.id), n = s ? s.flashcards.length : 0, m = EF.store.mastered(d.id), subs = EF.sets.children(d.id).length;
    return `<a class="deck-tile my-deck-tile tint" href="#/deck/${esc(d.id)}" style="--c:${esc(d.color)}">
      <span class="deck-band"><span class="deck-3d">${EF.img3d('cards', 56)}</span></span>
      <span class="deck-body"><strong>${esc(d.name)}</strong><small>${plural(n, 'card')}${subs ? ' · ' + plural(subs, 'subdeck') : ''}${(d.notes || []).length ? ' · ' + plural(d.notes.length, 'note') : ''}</small></span>
      <span class="deck-prog" title="${n ? Math.round((m / n) * 100) : 0}% mastered">${EF.ring(n ? (m / n) * 100 : 0, 38, 4)}</span>
    </a>`;
  };
  EF.mountDecks = (el) => {
    const draw = () => {
      const list = top();
      el.innerHTML = `<header class="page-head decks-head"><div><span class="eyebrow">${icon('fa-layer-group')} Your own study decks</span><h1>My decks</h1>
          <p>Make a deck for any topic. Magic import turns your notes, files, photos and links into cards, or write them yourself. Decks can hold subdecks, notes and cards.</p></div>
        <div class="btn-row"><button type="button" class="btn btn-primary" data-add-deck>${icon('fa-plus')} New deck</button><button type="button" class="btn btn-sun" data-magic>${icon('fa-wand-magic-sparkles')} Magic import</button></div></header>
        ${list.length ? `<div class="deck-grid my-decks-grid">${list.map(tile).join('')}</div>`
          : `<div class="empty-state decks-empty">${EF.mascot ? EF.mascot('wave', 120) : ''}<h2>No decks yet</h2><p class="muted">Start with a deck for a test you have coming up, then add your notes.</p><div class="btn-row center"><button type="button" class="btn btn-primary" data-add-deck>${icon('fa-plus')} New deck</button><button type="button" class="btn" data-magic>${icon('fa-wand-magic-sparkles')} Magic import</button></div></div>`}`;
    };
    draw();
    const onSets = () => draw();
    EF.on('sets', onSets);
    return () => EF.off('sets', onSets);
  };

  /* ================= #/deck/:id ================= */
  const TABS = [['path', 'Path', 'fa-route'], ['materials', 'Materials', 'fa-folder-open'], ['board', 'Leaderboard', 'fa-trophy']];
  const lastTab = {};
  EF.mountDeck = (el, id, tab0) => {
    let tab = TABS.some((t) => t[0] === tab0) ? tab0 : 'materials';
    let finding = false, query = '', all = false, allNotes = false, alive = true, board = null, boardErr = null, boardBusy = false;
    lastTab[id] = tab;
    function head(d) {
      const p = d.parent && EF.sets.raw(d.parent);
      const href = studyHref(id), me = cloudOn() ? EF.cloud.cachedMe() : null;
      const has = d.cards.length || (d.notes || []).length || EF.sets.children(id).length;
      return `<div class="dk-bar" data-menu-host>
          <a class="icon-btn dk-back" href="${p ? '#/deck/' + esc(p.id) : '#/decks'}" aria-label="${p ? 'Back to ' + esc(p.name) : 'My decks'}">${icon('fa-chevron-left')}</a>
          <div class="dk-acts">
            <button type="button" class="icon-btn" data-dk-share aria-label="Share deck" title="Share deck">${icon('fa-arrow-up-from-bracket')}</button>
            <button type="button" class="icon-btn" data-dk-find aria-label="Search cards" title="Search cards" aria-pressed="${finding}">${icon('fa-magnifying-glass')}</button>
            <button type="button" class="icon-btn" data-dk-more aria-label="More options" title="More options" aria-haspopup="menu" aria-expanded="false">${icon('fa-ellipsis')}</button>
            <button type="button" class="btn dk-add" data-dk-addmenu aria-haspopup="menu" aria-expanded="false">${icon('fa-plus')}<span>Add</span></button>
            <a class="btn btn-ink dk-study${href ? '' : ' is-off'}" href="${href || '#/deck/' + esc(id)}" data-dk-study${href ? '' : ' aria-disabled="true"'}>${EF.img3d('game', 22)} Study deck</a>
          </div>
        </div>
        <header class="dk-head">
          ${p ? `<a class="dk-crumb tint" style="--c:${esc(p.color)}" href="#/deck/${esc(p.id)}"><span class="dk-sq dk-sq-sm" aria-hidden="true"></span>${esc(p.name)}</a>` : ''}
          <h1><span class="dk-sq" aria-hidden="true"></span><span class="dk-title">${esc(d.name)}</span></h1>
          ${has ? `<span class="dk-by">${d.from && !EF.cloud.published(id) ? `${icon('fa-bookmark')} Saved deck` : `${EF.myAvatar ? EF.myAvatar(me, 24) : ''} by you`}</span>` : ''}
        </header>
        <div class="dk-tabs" role="tablist" aria-label="Deck">${TABS.map(([k, l]) => `<button type="button" role="tab" id="dk-tab-${k}" data-dk-tab="${k}" aria-selected="${tab === k}" aria-controls="dk-panel" tabindex="${tab === k ? 0 : -1}">${l}</button>`).join('')}</div>`;
    }
    const tiles = () => `<div class="dk-tiles">
        <button type="button" class="dk-tile" data-dk-do="import">${EF.img3d('sparkles', 64)}<strong>Magic import</strong><small>Notes, PDFs, slides, photos, links</small></button>
        <button type="button" class="dk-tile" data-dk-do="note">${EF.img3d('memo', 64)}<strong>Add notes</strong><small>Type or paste what you’re learning</small></button>
        <button type="button" class="dk-tile" data-dk-do="sub">${EF.img3d('books', 64)}<strong>Add a subdeck</strong><small>A deck inside this deck</small></button>
        <button type="button" class="dk-tile" data-dk-do="cards">${EF.img3d('cards', 64)}<strong>Add cards</strong><small>Write questions and answers</small></button>
      </div>`;
    function materials(d) {
      const job = EF.magic && EF.magic.job(id), subs = EF.sets.children(id), notes = (d.notes || []).slice().sort((a, b) => b.at - a.at);
      const fresh = EF.magic && EF.magic.fresh(id);
      if (!job && !d.cards.length && !notes.length && !subs.length) return tiles();
      const q = query.trim().toLowerCase();
      const cardHtml = d.cards.map((c, i) => {
        const isNew = fresh && i >= fresh.from && i < fresh.from + fresh.n;
        return `<li class="gz-card dk-card${isNew ? ' is-new' : ''}" data-ci="${i}"${q && !(c[0] + ' ' + c[1]).toLowerCase().includes(q) ? ' hidden' : ''}${!q && !all && i >= 30 ? ' data-more' : ''}>
          <div class="gz-q"><strong>${isNew ? `<span class="dk-new">${icon('fa-wand-magic-sparkles')} New</span>` : ''}${esc(c[0])}</strong><button type="button" class="gz-more" data-dk-card="${i}" aria-label="Card options" aria-haspopup="menu" aria-expanded="false">${icon('fa-ellipsis-vertical')}</button></div>
          <p class="gz-a">${esc(c[1])}</p>
          ${c[3] ? `<p class="dk-why">${icon('fa-lightbulb')} ${esc(c[3])}</p>` : ''}
        </li>`;
      }).join('');
      const shown = q ? d.cards.filter((c) => (c[0] + ' ' + c[1]).toLowerCase().includes(q)).length : d.cards.length;
      return `${job ? `<div class="dk-crafting" role="status" aria-live="polite"><span class="dk-gem">${EF.img3d('sparkles', 28)}</span><span><strong>Crafting questions</strong><small>${esc(job.label || '')}</small></span><i class="dk-dots" aria-hidden="true"><b></b><b></b><b></b></i></div>
          <ul class="dk-skel" aria-hidden="true">${'<li></li>'.repeat(Math.max(2, 5 - Math.min(3, d.cards.length)))}</ul>` : ''}
        ${d.cards.length ? (d.from && !EF.cloud.published(id) ? `<button type="button" class="dk-sharecard is-plain" data-dk-share>${EF.img3d('people', 40)}<span><strong>Share this deck</strong><small>Send your friends the link to the original</small></span>${icon('fa-arrow-up-from-bracket')}</button>`
          : `<button type="button" class="dk-sharecard" data-dk-share>${EF.img3d('coin', 40)}<span><strong>Share deck ${icon('fa-arrow-right')} earn coins</strong><small>${cloudOn() ? `+${COINS_PER_SAVE} coins every time someone saves it` : 'Send it to friends with a link'}</small></span>${icon('fa-arrow-up-from-bracket')}</button>`) : ''}
        ${subs.length ? `<section class="dk-sec"><div class="dk-sec-head"><h2>Subdecks <span>(${subs.length})</span></h2><button type="button" class="icon-btn" data-dk-do="sub" aria-label="Add a subdeck">${icon('fa-plus')}</button></div>
          <ul class="dk-rows">${subs.map((k) => { const n = EF.sets.get(k.id).flashcards.length; return `<li><a class="dk-row tint" style="--c:${esc(k.color)}" href="#/deck/${esc(k.id)}"><span class="dk-sq" aria-hidden="true"></span><span class="dk-row-t"><strong>${esc(k.name)}</strong><small>${plural(n, 'card')}</small></span>${icon('fa-chevron-right')}</a></li>`; }).join('')}</ul></section>` : ''}
        ${notes.length ? `<section class="dk-sec"><div class="dk-sec-head"><h2>Notes <span>(${notes.length})</span></h2><button type="button" class="icon-btn" data-dk-do="note" aria-label="Add notes">${icon('fa-plus')}</button></div>
          <ul class="dk-rows">${notes.slice(0, allNotes ? 40 : 3).map((n) => `<li><a class="dk-row" href="#/note/${esc(id)}/${esc(n.id)}"><span class="dk-kind">${kindIcon(n.k)}</span><span class="dk-row-t"><strong>${esc(n.t)}</strong><small>${esc((KINDS[n.k] || KINDS.note)[1])} · ${n.cut ? 'on your other device' : plural(words(n.x), 'word')} · ${when(n.at)}</small></span>${icon('fa-chevron-right')}</a></li>`).join('')}</ul>${!allNotes && notes.length > 3 ? `<button type="button" class="link dk-allnotes" data-dk-allnotes>${icon('fa-chevron-down')} Show all ${notes.length} notes</button>` : ''}</section>` : ''}
        <section class="dk-sec dk-cards" aria-labelledby="dk-cards-h"><div class="dk-sec-head"><h2 id="dk-cards-h">Cards <span>(${d.cards.length})</span></h2><button type="button" class="icon-btn" data-dk-do="cards" aria-label="Add cards">${icon('fa-plus')}</button></div>
          ${finding || d.cards.length > 12 ? `<label class="gz-search dk-search">${icon('fa-magnifying-glass')}<input type="search" placeholder="Search cards…" aria-label="Search cards" autocomplete="off" spellcheck="false" data-dk-q value="${esc(query)}"></label>` : ''}
          ${fresh && fresh.n ? `<div class="dk-review" role="status">${icon('fa-wand-magic-sparkles')}<span><strong>${plural(fresh.n, 'new card')}${fresh.ai ? ' from Zing AI' : ''}.</strong> Give them a quick check: tap ⋮ to fix or delete one.</span><button type="button" class="btn btn-sm" data-dk-keep>Looks good</button><button type="button" class="btn btn-sm btn-ghost" data-dk-undo>${icon('fa-rotate-left')} Undo</button></div>` : ''}
          ${d.cards.length ? `<ul class="gz-list dk-list${all || q ? ' is-all' : ''}">${cardHtml}</ul>${q && !shown ? `<p class="gz-empty">${icon('fa-magnifying-glass')} No cards match that search.</p>` : ''}${!q && !all && d.cards.length > 30 ? `<div class="center gz-all"><button type="button" class="btn" data-dk-all>${icon('fa-layer-group')} Show all ${d.cards.length} cards</button></div>` : ''}`
            : `<p class="dk-nocards">${job ? 'Your cards will appear here in a moment.' : 'No cards yet.'} <button type="button" class="link" data-dk-do="import">${icon('fa-wand-magic-sparkles')} Magic import</button> or <button type="button" class="link" data-dk-do="cards">write some</button>.</p>`}
        </section>
        <div class="dk-quick"><span>Add more</span><button type="button" class="chip" data-dk-do="import">${icon('fa-wand-magic-sparkles')} Import</button><button type="button" class="chip" data-dk-do="note">${icon('fa-pen-to-square')} Notes</button><button type="button" class="chip" data-dk-do="sub">${icon('fa-folder-plus')} Subdeck</button><button type="button" class="chip" data-dk-do="cards">${icon('fa-clone')} Cards</button></div>`;
    }
    function path() {
      const s = EF.sets.get(id), lv = EF.sets.levels(id);
      if (!s || !s.flashcards.length) return `<div class="empty-state dk-empty">${EF.mascot ? EF.mascot('think', 100) : ''}<h2>Your path appears here</h2><p class="muted">Add cards and Zing splits them into short levels to play, one after another.</p><button type="button" class="btn btn-primary" data-dk-do="import">${icon('fa-wand-magic-sparkles')} Magic import</button></div>`;
      const done = (cards) => cards.every((c) => EF.store.cardBox(id, c[0]) >= 3);
      const states = lv.map(done), next = states.indexOf(false), n = states.filter(Boolean).length;
      let k = 0;
      return `<p class="dk-path-sum">${icon('fa-route')} <strong>${n} of ${lv.length}</strong> level${lv.length === 1 ? '' : 's'} done${n === lv.length ? ' · every card mastered! 🎉' : ''}</p>
        <ol class="path dk-path">${lv.map((cards, i) => {
          const x = [0, 1, 0, -1][k++ % 4], st = states[i] ? 'is-done' : i === next ? 'is-next' : '';
          const href = cards.length >= 4 ? `#/learn/${id}~${i + 1}` : `#/cards/${id}`;
          return `<li style="--x:${x}"><a class="pnode ${st}" href="${href}"><span class="pnode-ic">${states[i] ? icon('fa-check') : `<b>${i + 1}</b>`}</span><span class="pnode-lb">${i === next ? '<small>Up next</small>' : ''}Level ${i + 1}<small>${plural(cards.length, 'card')}</small></span></a></li>`;
        }).join('')}
        <li style="--x:0"><a class="pnode pnode-quiz" href="${s.quiz.length ? '#/quiz/' + id : studyHref(id)}"><span class="pnode-ic">${EF.img3d('trophy', 34)}</span><span class="pnode-lb">${s.quiz.length ? 'Final test' : 'Flashcards'}</span></a></li></ol>`;
    }
    function boardHtml(d) {
      const cid = cloudIdOf(id), mine = EF.deckXp(id);
      const you = `<p class="dk-you">${EF.img3d('star', 26)} Your XP on this deck: <strong>${mine.toLocaleString()}</strong></p>`;
      if (!EF.cloud || !EF.cloud.enabled) return `<div class="empty-state dk-empty">${EF.img3d('trophy', 64)}<h2>Leaderboards are coming soon</h2>${you}</div>`;
      if (!cloudOn()) return `<div class="empty-state dk-empty">${EF.img3d('trophy', 64)}<h2>Race your friends on this deck</h2><p class="muted">Finish setting up your account, then share the deck. Everyone who studies it shows up here.</p>${you}<button type="button" class="btn btn-primary" data-ob-again>${icon('fa-user')} Set up my account</button></div>`;
      if (!cid) return `<div class="empty-state dk-empty">${EF.img3d('trophy', 64)}<h2>Race your friends on this deck</h2><p class="muted">Share it: everyone who saves and studies it shows up here, ranked by XP.</p>${you}<button type="button" class="btn btn-primary" data-dk-share>${icon('fa-arrow-up-from-bracket')} Share deck</button></div>`;
      if (boardErr) return `<div class="cloud-msg">${icon('fa-wifi')} ${esc(boardErr)}</div>${you}`;
      if (!board || board.cid !== cid) return EF.cloudUI ? EF.cloudUI.loadingRows(4) : '';
      const b = board.data;
      if (!b) return `<div class="cloud-msg">${icon('fa-circle-xmark')} This deck isn’t shared any more.</div>${you}`;
      const rows = b.rows || [];
      return `<p class="dk-board-sum">${icon('fa-users')} ${rows.length ? plural(rows.length, 'player') : 'No players yet'}${b.saves ? ' · saved ' + plural(b.saves, 'time') : ''}</p>
        ${rows.length ? `<ol class="lb dk-board">${rows.map((r) => EF.cloudUI.row(r)).join('')}</ol>`
          : `<div class="empty-state dk-empty">${EF.mascot ? EF.mascot('read', 90) : ''}<p class="muted">Study this deck to get on the board first!</p></div>`}
        ${b.me && b.me.rank > 20 ? `<p class="dk-you">You’re #${b.me.rank} with ${b.me.xp.toLocaleString()} XP</p>` : ''}`;
    }
    function loadBoard() {
      const cid = cloudIdOf(id);
      if (!cid || !cloudOn() || boardBusy || (board && board.cid === cid)) return;
      boardBusy = true; boardErr = null;
      EF.cloud.deckBoard(cid).then((data) => { board = { cid, data }; }).catch(() => { boardErr = 'Couldn’t load the leaderboard. Check your internet.'; })
        .finally(() => { boardBusy = false; if (alive && tab === 'board') draw(); });
    }
    function draw() {
      const d = EF.sets.raw(id);
      if (!d) { el.innerHTML = `<div class="empty-state">${EF.mascot ? EF.mascot('think', 120) : ''}<h2>That deck isn’t here</h2><p class="muted">It may have been deleted, or it’s on another device.</p><a class="btn btn-primary" href="#/decks">${icon('fa-layer-group')} My decks</a></div>`; return; }
      el.style.setProperty('--c', d.color);
      const y = window.scrollY;
      el.innerHTML = `${head(d)}<div class="dk-panel" id="dk-panel" role="tabpanel" aria-labelledby="dk-tab-${tab}">${tab === 'path' ? path() : tab === 'board' ? boardHtml(d) : materials(d)}</div>
        ${studyHref(id) ? `<a class="btn btn-ink dk-fab" href="${studyHref(id)}">${EF.img3d('game', 22)} Study deck</a>` : ''}`;
      if (tab === 'board') loadBoard();
      window.scrollTo(0, y);
    }
    async function cardMenu(btn) {
      const i = +btn.dataset.dkCard, d = EF.sets.raw(id), c = d && d.cards[i]; if (!c) return;
      const k = await openMenu(btn, [{ k: 'edit', ic: 'fa-pen', label: 'Edit card' }, { k: 'speak', ic: 'fa-volume-high', label: 'Read it aloud' }, null, { k: 'del', ic: 'fa-trash', label: 'Delete card', danger: true }]);
      if (k === 'edit') EF.editCards(id, i);
      else if (k === 'speak') EF.speak(c[0] + '. ' + c[1], 'en-GB');
      else if (k === 'del') { EF.sets.patch(id, (x) => { x.cards.splice(i, 1); }); const f = EF.magic && EF.magic.fresh(id); if (f && i < f.from + f.n) EF.magic.clearFresh(id); EF.toast('Card deleted', 'fa-trash'); draw(); }
    }
    async function moreMenu(btn) {
      const d = EF.sets.raw(id);
      const k = await openMenu(btn, [{ k: 'edit', ic: 'fa-pen', label: 'Rename, colour or move' }, { k: 'text', ic: 'fa-align-left', label: 'Edit cards as text' }, { k: 'copy', ic: 'fa-copy', label: 'Copy cards as text' },
        { k: 'modes', ic: 'fa-shapes', label: 'All study modes' }, null, { k: 'del', ic: 'fa-trash', label: 'Delete deck', danger: true }]);
      if (k === 'edit') EF.addDeck({ edit: id });
      else if (k === 'text') location.hash = '#/make/' + id;
      else if (k === 'modes') { if (EF.sets.get(id).flashcards.length) location.hash = '#/set/' + id; else EF.toast('Add some cards first', 'fa-circle-info'); }
      else if (k === 'copy') {
        const text = d.cards.map((c) => c[0] + ' - ' + c[1]).join('\n');
        if (!text) { EF.toast('No cards to copy yet', 'fa-circle-info'); return; }
        try { await navigator.clipboard.writeText(text); EF.toast(`Copied ${plural(d.cards.length, 'card')}`, 'fa-copy'); } catch (e) { window.prompt('Copy your cards:', text); }
      } else if (k === 'del') {
        const subs = EF.sets.descendants(id).length;
        if (!confirm(`Delete “${d.name}”${subs ? ` and its ${plural(subs, 'subdeck')}` : ''}? Its cards and notes go too. This can’t be undone.`)) return;
        const back = d.parent && EF.sets.raw(d.parent) ? '#/deck/' + d.parent : '#/decks';
        if (EF.cloud && EF.cloud.published(id) && cloudOn()) EF.cloud.unpublish(id).catch(() => {});
        EF.sets.remove(id); EF.toast('Deck deleted', 'fa-trash'); location.hash = back;
      }
    }
    async function addMenu(btn) {
      const k = await openMenu(btn, [{ k: 'import', art: EF.img3d('sparkles', 22), label: 'Magic import' }, { k: 'note', art: EF.img3d('memo', 22), label: 'Notes' }, { k: 'sub', art: EF.img3d('books', 22), label: 'Subdeck' }, { k: 'cards', art: EF.img3d('cards', 22), label: 'Cards' }]);
      if (k) act(k);
    }
    function act(k) {
      if (k === 'import') EF.magic.open({ deckId: id });
      else if (k === 'note') location.hash = '#/note/' + id + '/new';
      else if (k === 'sub') EF.addDeck({ parent: id });
      else if (k === 'cards') EF.editCards(id);
    }
    const onClick = (e) => {
      const t = e.target;
      const tb = t.closest('[data-dk-tab]');
      if (tb) { tab = lastTab[id] = tb.dataset.dkTab; history.replaceState(null, '', '#/deck/' + id + (tab === 'materials' ? '' : '/' + tab)); draw(); const f = el.querySelector(`[data-dk-tab="${tab}"]`); if (f) f.focus(); return; }
      if (t.closest('[data-dk-share]')) { EF.shareDeck(id); return; }
      if (t.closest('[data-dk-find]')) { finding = !finding; if (finding) tab = lastTab[id] = 'materials'; draw(); const i = el.querySelector('[data-dk-q]'); if (i && finding) i.focus(); return; }
      const more = t.closest('[data-dk-more]'); if (more) { moreMenu(more); return; }
      const add = t.closest('[data-dk-addmenu]'); if (add) { addMenu(add); return; }
      const cm = t.closest('[data-dk-card]'); if (cm) { cardMenu(cm); return; }
      const st = t.closest('[data-dk-study]'); if (st && st.getAttribute('aria-disabled') === 'true') { e.preventDefault(); EF.toast('Add some cards first, then study', 'fa-circle-info'); return; }
      const doit = t.closest('[data-dk-do]'); if (doit) { act(doit.dataset.dkDo); return; }
      if (t.closest('[data-dk-all]')) { all = true; draw(); return; }
      if (t.closest('[data-dk-allnotes]')) { allNotes = true; draw(); return; }
      if (t.closest('[data-dk-keep]')) { EF.magic.clearFresh(id); draw(); return; }
      if (t.closest('[data-dk-undo]')) {
        const f = EF.magic.fresh(id); if (!f) return;
        EF.sets.patch(id, (x) => { if (x.cards.length < f.from + f.n) return false; x.cards.splice(f.from, f.n); });
        EF.magic.clearFresh(id); EF.toast('New cards removed', 'fa-rotate-left'); draw();
      }
    };
    const onInput = (e) => {
      if (!e.target.matches('[data-dk-q]')) return;
      query = e.target.value;
      const q = query.trim().toLowerCase(), list = el.querySelector('.dk-list');
      if (!list) return;
      let shown = 0;
      list.classList.toggle('is-all', !!q || all);
      list.querySelectorAll('.dk-card').forEach((li) => { const ok = !q || li.textContent.toLowerCase().includes(q); li.hidden = !ok; if (ok) shown++; });
      let empty = el.querySelector('.dk-cards .gz-empty');
      if (!shown && q && !empty) { list.insertAdjacentHTML('afterend', `<p class="gz-empty">${icon('fa-magnifying-glass')} No cards match that search.</p>`); }
      else if (empty && (shown || !q)) empty.remove();
      const allBtn = el.querySelector('.gz-all'); if (allBtn) allBtn.hidden = !!q;
    };
    const onKey = (e) => {
      const tb = e.target.closest && e.target.closest('[data-dk-tab]');
      if (!tb || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const keys = TABS.map((x) => x[0]), i = keys.indexOf(tb.dataset.dkTab);
      const n = e.key === 'Home' ? 0 : e.key === 'End' ? keys.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : keys.length - 1)) % keys.length;
      el.querySelector(`[data-dk-tab="${keys[n]}"]`).click();
    };
    const onData = (did) => { if (!alive || (did && did !== id)) return; if (EF.magic && EF.magic.job(id)) tab = lastTab[id] = 'materials'; draw(); };
    el.addEventListener('click', onClick); el.addEventListener('input', onInput); el.addEventListener('keydown', onKey);
    EF.on('magic', onData);
    draw();
    return () => { alive = false; el.removeEventListener('click', onClick); el.removeEventListener('input', onInput); el.removeEventListener('keydown', onKey); EF.off('magic', onData); };
  };

  /* ================= #/note/:deck/:note ================= */
  EF.mountNote = (el, deckId, noteId) => {
    const d = EF.sets.raw(deckId);
    if (!d) { el.innerHTML = `<div class="empty-state"><h2>That deck isn’t here</h2><a class="btn btn-primary" href="#/decks">My decks</a></div>`; return () => {}; }
    let nid = noteId === 'new' ? null : noteId;
    const note = nid ? (d.notes || []).find((n) => n.id === nid) : null;
    if (nid && !note) { el.innerHTML = `<div class="empty-state"><h2>That note isn’t here</h2><a class="btn btn-primary" href="#/deck/${esc(deckId)}">Back to the deck</a></div>`; return () => {}; }
    const kind = note ? note.k : 'note';
    el.innerHTML = `<div class="tint" style="--c:${esc(d.color)}">
      <a class="crumb" href="#/deck/${esc(deckId)}">${icon('fa-arrow-left')} ${esc(d.name)}</a>
      <div class="note-head"><span class="note-kind">${kindIcon(kind)} ${esc((KINDS[kind] || KINDS.note)[1])}</span>
        <div class="btn-row"><button type="button" class="btn btn-sun" data-note-cards>${icon('fa-wand-magic-sparkles')} Make cards</button><button type="button" class="icon-btn" data-note-del aria-label="Delete note" title="Delete note"${nid ? '' : ' hidden'}>${icon('fa-trash')}</button></div></div>
      ${note && note.src ? `<p class="note-src">${icon('fa-link')} <a href="${esc(note.src)}" target="_blank" rel="noopener noreferrer">${esc(note.src.replace(/^https:\/\//, '').slice(0, 70))}</a></p>` : ''}
      <input class="note-title" data-note-title maxlength="80" placeholder="Title" aria-label="Note title" value="${note ? esc(note.t) : ''}">
      <textarea class="note-body" data-note-body placeholder="Type or paste your notes here…" aria-label="Your notes" spellcheck="true">${note ? esc(note.x) : ''}</textarea>
      <p class="note-meta muted small" data-note-meta aria-live="polite">${note ? `${plural(words(note.x), 'word')} · saved` : 'Saved on this device as you type'}</p>
    </div>`;
    const ta = el.querySelector('[data-note-body]'), ti = el.querySelector('[data-note-title]'), meta = el.querySelector('[data-note-meta]');
    const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.max(260, ta.scrollHeight + 4) + 'px'; };
    let timer = 0;
    function save() {
      clearTimeout(timer);
      const text = ta.value, title = ti.value.trim() || (text.trim().split('\n')[0] || '').slice(0, 60) || 'Notes';
      if (!nid && !text.trim()) return;
      if (!nid) {
        nid = EF.sets.newNoteId();
        EF.sets.patch(deckId, (x) => { x.notes = (x.notes || []).concat({ id: nid, t: title, x: text, k: 'note', at: Date.now() }); });
        history.replaceState(null, '', '#/note/' + deckId + '/' + nid);
        el.querySelector('[data-note-del]').hidden = false;
      } else {
        EF.sets.patch(deckId, (x) => { const n = (x.notes || []).find((m) => m.id === nid); if (!n) return false; n.t = title; n.x = text; n.at = Date.now(); delete n.cut; });
      }
      meta.textContent = `${plural(words(text), 'word')} · saved`;
    }
    const onInput = () => { grow(); meta.textContent = 'Saving…'; clearTimeout(timer); timer = setTimeout(save, 500); };
    const onClick = (e) => {
      if (e.target.closest('[data-note-cards]')) {
        save();
        const text = ta.value.trim();
        if (text.length < 40) { EF.toast('Write a bit more first (a few sentences)', 'fa-circle-info'); ta.focus(); return; }
        EF.magic.fromText({ deckId, text, title: ti.value.trim() || 'Notes', kind: 'note', noteId: nid });
        return;
      }
      if (e.target.closest('[data-note-del]') && nid && confirm('Delete this note? Cards you made from it stay.')) {
        clearTimeout(timer);
        EF.sets.patch(deckId, (x) => { x.notes = (x.notes || []).filter((n) => n.id !== nid); });
        EF.toast('Note deleted', 'fa-trash'); location.hash = '#/deck/' + deckId;
      }
    };
    ta.addEventListener('input', onInput); ti.addEventListener('input', onInput); el.addEventListener('click', onClick);
    requestAnimationFrame(grow);
    if (!note) ta.focus();
    return () => { if (timer) save(); ta.removeEventListener('input', onInput); ti.removeEventListener('input', onInput); el.removeEventListener('click', onClick); };
  };

  /* ================= buttons anywhere ================= */
  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add-deck]');
    if (add) { e.preventDefault(); EF.closeDrawer && EF.closeDrawer(); EF.addDeck({ parent: add.dataset.parent || undefined }); return; }
    const mg = e.target.closest('[data-magic]');
    if (mg && EF.magic) { e.preventDefault(); EF.closeDrawer && EF.closeDrawer(); EF.magic.open({ deckId: mg.dataset.magic || null }); }
  });
})();
