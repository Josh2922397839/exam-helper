/* Zing study groups, Settings and Help.
   Group messages are never free text: emoji, ready-made phrases, cards from a Zing deck and Live game
   invites. That keeps groups friendly without anyone having to moderate them. */
(function () {
  'use strict';
  const EF = window.EF;
  const esc = EF.esc, icon = EF.icon, ls = EF.ls;
  const UI = () => EF.cloudUI;
  const on = () => !!(EF.cloud && EF.cloud.enabled && EF.cloud.joined());

  // the ready-made phrases (the database only stores the number, 0–23)
  const PHRASES = ['Let’s study! 📚', 'Who’s online?', 'Quiz me!', 'Good luck on the test! 🍀', 'I got it right! ✅', 'That one was tricky 😅', 'Can someone explain this one?', 'Thanks! 🙏',
    'Joining the Live game ⚡', 'Starting a game now', 'One more round?', 'GG 🎉', 'Let’s go! 🔥', 'Break, then 15 more minutes?', 'Study session at 7?', 'Done for today 😴',
    'Good morning! ☀️', 'Good night 🌙', 'You’ve got this 💪', 'God bless 🙏', 'See you in class', 'Check out the set I made', 'Streak saved 🔥', 'Proud of you all 💚'];
  const EMOJI = ['👍', '🔥', '😂', '🎉', '💯', '🙏', '😮', '❤️', '👏', '🤔', '😴', '🧠', '📚', '✅', '🐦'];
  EF.groupPhrases = PHRASES;
  // a short fingerprint of a card's question, so an old message still finds its card after a deck changes
  const cardHash = (q) => { let h = 2166136261; const s = String(q || ''); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  const findCard = (b) => {
    const s = EF.subject(b.sid); if (!s || s.custom || !s.flashcards) return null; // only Zing's own decks, never someone's private sets
    let c = s.flashcards[b.k];
    if (!c || cardHash(c[0]) !== b.h) c = s.flashcards.find((x) => cardHash(x[0]) === b.h);
    return c ? { s, c } : null;
  };
  // card text → plain text, using an inert document (nothing in it can load or run)
  const plain = (html) => { try { return new DOMParser().parseFromString(String(html || ''), 'text/html').body.textContent || ''; } catch (e) { return String(html || '').replace(/<[^>]*>/g, ''); } };
  function preview(m) {
    if (!m) return 'No messages yet';
    const who = m.kind === 'system' ? '' : m.mine ? 'You: ' : m.from ? (m.from.name || m.from.username).split(' ')[0] + ': ' : '';
    const b = m.body || {};
    if (m.kind === 'emoji') return who + b.e;
    if (m.kind === 'phrase') return who + (PHRASES[b.p] || '…');
    if (m.kind === 'card') { const f = findCard(b); return who + '📚 ' + (f ? plain(f.c[0]) : 'A study card'); }
    if (m.kind === 'live') { const s = EF.subject(b.sid); return who + '⚡ Live game' + (s ? ': ' + s.short : ''); }
    return b.t || '';
  }
  const groupAva = (g, size) => {
    const faces = (g.faces || []).slice(0, 2);
    return faces.length >= 2 ? `<span class="grp-ava is-faces" style="--s:${size || 52}px">${faces.map((f) => EF.avatar(f.avatar, f.username, Math.round((size || 52) * 0.68))).join('')}</span>`
      : `<span class="grp-ava" style="--s:${size || 52}px;--g:${esc(g.color || '#0b8a5e')}">${esc(EF.initials(g.name))}</span>`;
  };
  EF.groupRow = (g) => `<li><a class="grp-row${g.unread ? ' is-unread' : ''}" href="#/groups/${esc(g.id)}">${groupAva(g)}
      <span class="grp-text"><strong>${esc(g.name)}</strong><small>${esc(preview(g.last))}</small></span>
      <span class="grp-meta">${g.last ? `<time>${EF.ago(g.last.at)}</time>` : ''}${g.unread ? `<b class="grp-unread" aria-label="${g.unread} unread">${g.unread > 99 ? '99+' : g.unread}</b>` : ''}</span></a></li>`;

  /* ---------- making a group ---------- */
  async function newGroup() {
    const dlg = document.createElement('dialog');
    dlg.className = 'zdlg';
    dlg.innerHTML = `<form method="dialog" class="zdlg-box" data-grp-form>
      <header class="zdlg-head">${EF.img3d('people', 40)}<div><h2>New study group</h2><small>Name it, then add friends</small></div><button type="submit" value="x" class="icon-btn" aria-label="Close" formnovalidate>${icon('fa-xmark')}</button></header>
      <label class="make-field"><span>Group name</span><input name="n" maxlength="40" placeholder="e.g. Chem squad" autocomplete="off" required></label>
      <p class="muted small">${icon('fa-shield-halved')} You can add friends who follow you, and classmates. Groups chat with emoji, quick phrases, study cards and Live games.</p>
      <footer class="zdlg-foot"><button type="button" class="btn btn-primary btn-lg btn-block" data-grp-make>${icon('fa-user-plus')} Next: add friends</button></footer></form>`;
    document.body.appendChild(dlg);
    dlg.addEventListener('close', () => dlg.remove());
    dlg.addEventListener('click', async (e) => {
      if (e.target === dlg) { dlg.close(); return; }
      if (!e.target.closest('[data-grp-make]')) return;
      const name = dlg.querySelector('input[name=n]').value.trim();
      if (!name) { EF.toast('Give your group a name', 'fa-circle-exclamation'); dlg.querySelector('input').focus(); return; }
      dlg.close();
      const friends = await EF.pickFriends({ title: 'Add friends to ' + name, multi: true, cta: 'Make group', note: 'You can add more later' });
      try {
        const r = await EF.cloud.groupCreate(name, friends.map((f) => f.username));
        if (friends.length && r.added < friends.length) EF.toast(`Added ${r.added} of ${friends.length}. The others need to follow you first.`, 'fa-circle-info');
        else EF.toast('Group made!', 'fa-user-group');
        EF.haptic('success');
        location.hash = '#/groups/' + r.id;
      } catch (er) { EF.toast(er.message, 'fa-circle-exclamation'); }
    });
    dlg.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('input')) { e.preventDefault(); dlg.querySelector('[data-grp-make]').click(); } });
    dlg.showModal();
    dlg.querySelector('input').focus();
  }
  document.addEventListener('click', (e) => { const t = e.target.closest && e.target.closest('[data-new-group]'); if (t && on()) { e.preventDefault(); newGroup(); } });

  /* ---------- #/groups and #/groups/<id> ---------- */
  EF.mountGroups = (el, id) => {
    if (!EF.cloud.enabled) { el.innerHTML = UI().offBox(); return () => {}; }
    if (!EF.cloud.joined()) { el.innerHTML = `<div class="empty-state">${EF.mascot('wave', 110)}<h2>Finish setting up first</h2><button type="button" class="btn btn-primary" data-ob-again>${icon('fa-user')} Set up my account</button></div>`; return () => {}; }
    const me = EF.cloud.cachedMe();
    if (me && me.age != null && me.age < 13) { el.innerHTML = `<div class="empty-state">${EF.mascot('read', 110)}<h2>Study groups are for students 13 and up</h2><p class="muted">You can still play Live games with a code and climb your school’s board.</p><a class="btn btn-primary" href="#/live">${icon('fa-bolt')} Live games</a></div>`; return () => {}; }
    return id ? chat(el, id) : list(el);
  };

  function list(el) {
    let alive = true, groups = null, sugg = [], q = '';
    function draw() {
      const lq = q.toLowerCase(), shown = (groups || []).filter((g) => !lq || g.name.toLowerCase().includes(lq));
      el.innerHTML = `<header class="page-head page-head-sm grp-head"><div><span class="eyebrow">${icon('fa-comments')} Social</span><h1>Study groups</h1></div><button type="button" class="btn btn-primary" data-new-group>${icon('fa-plus')} Study group</button></header>
        <label class="zsearch">${icon('fa-magnifying-glass')}<input type="search" data-grp-q placeholder="Search groups" value="${esc(q)}" autocomplete="off" aria-label="Search groups"></label>
        ${groups === null ? UI().loadingRows(4) : shown.length ? `<ul class="grp-list">${shown.map(EF.groupRow).join('')}</ul>`
          : `<div class="empty-state">${EF.mascot('wave', 96)}<h2>${q ? 'No groups match' : 'No groups yet'}</h2><p class="muted">${q ? 'Try another name.' : 'Make one for your class and send each other cards, quick messages and Live games.'}</p>${q ? '' : `<button type="button" class="btn btn-primary" data-new-group>${icon('fa-plus')} Start a study group</button>`}</div>`}
        ${sugg.length ? `<section class="home-section"><div class="section-head"><h2>${EF.img3d('wave', 26)} Suggested friends</h2></div><ul class="friend-list">${sugg.slice(0, 12).map((p) => `<li class="friend">${EF.avatar(p.avatar, p.username, 46)}<a class="friend-text" href="#/u/${encodeURIComponent(p.username)}"><strong>${esc(p.name || p.username)}</strong><small>${[p.name ? '@' + p.username : '', p.grade ? 'Grade ' + p.grade : '', p.school].filter(Boolean).map(esc).join(' · ')}</small></a>${p.i_follow ? `<span class="pill">${icon('fa-check')} Following</span>` : `<button type="button" class="btn btn-sm btn-primary" data-follow-u="${esc(p.username)}">${p.follows_me ? 'Follow back' : 'Follow'}</button>`}</li>`).join('')}</ul></section>` : ''}`;
    }
    draw();
    Promise.all([EF.cloud.groups(), EF.cloud.suggest().catch(() => [])]).then(([g, s]) => { if (!alive) return; groups = g || []; sugg = s || []; draw(); }).catch((e) => { if (alive) el.innerHTML = UI().errBox(e); });
    const onInput = (e) => { if (e.target.matches('[data-grp-q]')) { q = e.target.value; const box = el.querySelector('.grp-list, .empty-state'); draw(); const i = el.querySelector('[data-grp-q]'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); void box; } };
    el.addEventListener('input', onInput);
    const t = setInterval(() => { if (!document.hidden) EF.cloud.groups().then((g) => { if (alive && g) { groups = g; if (!el.querySelector('[data-grp-q]:focus')) draw(); } }).catch(() => {}); }, 20000);
    return () => { alive = false; clearInterval(t); el.removeEventListener('input', onInput); };
  }

  function chat(el, id) {
    let alive = true, g = null, msgs = [], last = 0, timer = 0, sheet = '';
    const msgHtml = (m) => {
      if (m.kind === 'system') return `<li class="msg-sys">${esc((m.body || {}).t || '')}</li>`;
      const b = m.body || {}, from = m.from || { username: 'someone' };
      let inner = '';
      if (m.kind === 'emoji') inner = `<span class="msg-emoji">${esc(b.e)}</span>`;
      else if (m.kind === 'phrase') inner = `<span class="msg-text">${esc(PHRASES[b.p] || '…')}</span>`;
      else if (m.kind === 'card') {
        const f = findCard(b);
        if (!f) inner = `<span class="msg-text muted">A card from a deck this device doesn’t have yet.</span>`;
        else {
          const opts = Array.isArray(f.c[3]) && f.c[3].length >= 3 ? EF.shuffleWith([f.c[1]].concat(f.c[3].slice(0, 3)), EF.rng(m.id)) : null;
          inner = `<div class="msg-card tint" style="--c:${f.s.color}" data-card-msg="${m.id}"><span class="msg-card-sub">${EF.subjectIcon(f.s.id)} ${esc(f.s.short)}${f.c[2] ? ' · ' + esc(f.c[2]) : ''}</span><strong>${esc(plain(f.c[0]))}</strong>
            ${opts ? `<div class="msg-card-opts">${opts.map((o) => `<button type="button" data-card-opt="${o === f.c[1] ? 1 : 0}">${esc(plain(o))}</button>`).join('')}</div>` : `<button type="button" class="btn btn-sm" data-card-show>${icon('fa-eye')} Show answer</button><p class="msg-card-a" hidden>${esc(plain(f.c[1]))}</p>`}</div>`;
        }
      } else if (m.kind === 'live') {
        const s = EF.subject(b.sid);
        inner = `<div class="msg-live">${EF.img3d('bolt', 30)}<span><strong>Live game${s ? ': ' + esc(s.short) : ''}</strong><small>Code ${esc(b.code)}</small></span>${m.mine ? '' : `<a class="btn btn-sm btn-primary" href="#/live/${esc(b.code)}">Join</a>`}</div>`;
      }
      return `<li class="msg${m.mine ? ' is-mine' : ''}">${m.mine ? '' : `<a class="msg-ava" href="#/u/${encodeURIComponent(from.username)}" aria-label="${esc(from.name || from.username)}">${EF.avatar(from.avatar, from.username, 34)}</a>`}
        <div class="msg-bubble">${m.mine ? '' : `<span class="msg-from">${esc(from.name || from.username)}</span>`}${inner}<time>${EF.ago(m.at)}</time></div></li>`;
    };
    function frame() {
      el.innerHTML = `<div class="chat">
        <header class="chat-head"><a class="icon-btn" href="#/groups" aria-label="All groups">${icon('fa-arrow-left')}</a>${groupAva(g, 44)}<div class="chat-title"><h1>${esc(g.name)}</h1><small>${g.members.length} member${g.members.length === 1 ? '' : 's'} · ${g.members.slice(0, 4).map((p) => esc((p.name || p.username).split(' ')[0])).join(', ')}${g.members.length > 4 ? '…' : ''}</small></div>
          <button type="button" class="icon-btn" data-grp-add aria-label="Add friends">${icon('fa-user-plus')}</button><button type="button" class="icon-btn" data-grp-leave aria-label="Leave group">${icon('fa-right-from-bracket')}</button></header>
        <ol class="chat-log" aria-live="polite" aria-label="Messages"></ol>
        <div class="chat-compose">
          <div class="chat-sheet" data-sheet hidden></div>
          <div class="chat-emoji" role="group" aria-label="Send an emoji">${EMOJI.map((x) => `<button type="button" data-send-emoji="${x}" aria-label="Send ${x}">${x}</button>`).join('')}</div>
          <div class="chat-actions"><button type="button" class="btn btn-sm" data-sheet-open="phrase">${icon('fa-comment-dots')} Say…</button><button type="button" class="btn btn-sm" data-sheet-open="card">${icon('fa-clone')} Send a card</button><button type="button" class="btn btn-sm btn-primary" data-grp-live>${icon('fa-bolt')} Start Live</button></div>
        </div>
      </div>`;
      paintLog(true);
    }
    function paintLog(jump) {
      const log = el.querySelector('.chat-log'); if (!log) return;
      const near = log.scrollHeight - log.scrollTop - log.clientHeight < 120;
      log.innerHTML = msgs.length ? msgs.map(msgHtml).join('') : `<li class="msg-sys">Say hi! 👋</li>`;
      if (jump || near) log.scrollTop = log.scrollHeight;
    }
    function openSheet(kind) {
      const box = el.querySelector('[data-sheet]'); if (!box) return;
      if (sheet === kind) { sheet = ''; box.hidden = true; return; }
      sheet = kind; box.hidden = false;
      if (kind === 'phrase') box.innerHTML = `<div class="sheet-phrases">${PHRASES.map((p, i) => `<button type="button" data-send-phrase="${i}">${esc(p)}</button>`).join('')}</div>`;
      else if (kind === 'card') box.innerHTML = `<p class="sheet-h">Send a card from…</p><div class="sheet-decks">${EF.subjects.filter((s) => !s.custom && (s.flashcards || []).length).map((s) => `<button type="button" class="tint" style="--c:${s.color}" data-card-deck="${esc(s.id)}">${EF.subjectIcon(s.id)} ${esc(s.short)}</button>`).join('')}</div>`;
    }
    function cardChoices(sid) {
      const box = el.querySelector('[data-sheet]'), s = EF.subject(sid); if (!box || !s) return;
      const pick = EF.shuffleWith(s.flashcards.map((c, k) => [c, k]).filter(([c]) => c[5] !== 'quiz'), EF.rng(Date.now() >>> 0)).slice(0, 5);
      box.innerHTML = `<p class="sheet-h"><button type="button" class="link" data-sheet-open="card">${icon('fa-arrow-left')}</button> ${esc(s.short)}: pick a card <button type="button" class="link" data-card-deck="${esc(sid)}">${icon('fa-shuffle')} Shuffle</button></p><div class="sheet-cards">${pick.map(([c, k]) => `<button type="button" data-send-card="${esc(sid)}" data-k="${k}">${esc(plain(c[0]))}</button>`).join('')}</div>`;
    }
    async function send(kind, body) {
      try {
        const m = await EF.cloud.groupSend(id, kind, body);
        if (m && !msgs.some((x) => x.id === m.id)) { msgs.push(m); last = Math.max(last, m.id); paintLog(true); }
        sheet = ''; const box = el.querySelector('[data-sheet]'); if (box) box.hidden = true;
        EF.haptic();
      } catch (er) { EF.toast(er.message, 'fa-circle-exclamation'); }
    }
    async function refresh() {
      clearTimeout(timer);
      if (!alive) return;
      if (!document.hidden) {
        try {
          const r = await EF.cloud.group(id, last);
          if (!alive) return;
          const fresh = (r.messages || []).filter((m) => !msgs.some((x) => x.id === m.id));
          if (fresh.length) { msgs = msgs.concat(fresh).slice(-200); last = Math.max(last, ...fresh.map((m) => m.id)); paintLog(false); if (fresh.some((m) => !m.mine)) EF.sfx('pop'); }
          if (r.members && r.members.length !== g.members.length) { g.members = r.members; }
        } catch (e) { /* keep trying */ }
      }
      timer = setTimeout(refresh, 4000);
    }
    el.innerHTML = UI().loadingRows(5);
    EF.cloud.group(id, 0).then((r) => {
      if (!alive) return;
      g = r; msgs = r.messages || []; last = msgs.reduce((n, m) => Math.max(n, m.id), 0);
      frame(); timer = setTimeout(refresh, 4000);
      if (EF.refreshSocial) EF.refreshSocial();
    }).catch((e) => { if (alive) el.innerHTML = `<div class="empty-state">${EF.mascot('sad', 100)}<h2>${esc(e.message)}</h2><a class="btn" href="#/groups">${icon('fa-arrow-left')} All groups</a></div>`; });
    const onClick = async (e) => {
      const t = e.target.closest('button'); if (!t || !el.contains(t)) return;
      if (t.dataset.sendEmoji) return send('emoji', { e: t.dataset.sendEmoji });
      if (t.dataset.sendPhrase != null) return send('phrase', { p: +t.dataset.sendPhrase });
      if (t.dataset.sheetOpen) { if (t.dataset.sheetOpen === 'card' && sheet === 'card-pick') { sheet = ''; } openSheet(t.dataset.sheetOpen); return; }
      if (t.dataset.cardDeck) { sheet = 'card-pick'; cardChoices(t.dataset.cardDeck); return; }
      if (t.dataset.sendCard) { const s = EF.subject(t.dataset.sendCard), k = +t.dataset.k; return send('card', { sid: s.id, k, h: cardHash(s.flashcards[k][0]) }); }
      if (t.dataset.cardOpt != null) {
        const box = t.closest('[data-card-msg]'); if (!box || box.classList.contains('is-done')) return;
        box.classList.add('is-done');
        box.querySelectorAll('[data-card-opt]').forEach((b) => { b.disabled = true; if (b.dataset.cardOpt === '1') b.classList.add('is-right'); });
        if (t.dataset.cardOpt === '1') { EF.haptic('success'); EF.store.addXP(2); } else { t.classList.add('is-wrong'); EF.haptic('error'); }
        return;
      }
      if (t.hasAttribute('data-card-show')) { const a = t.parentElement.querySelector('.msg-card-a'); if (a) a.hidden = false; t.remove(); return; }
      if (t.hasAttribute('data-grp-live')) {
        const s = EF.subject((EF.store.state().last || {}).s);
        const pickS = s && !s.custom ? s : EF.subjects.find((x) => !x.custom);
        const code = EF.liveNewCode();
        try { sessionStorage.setItem('ef2:live:' + code, JSON.stringify({ host: true, sid: pickS.id, title: null })); } catch (er) { /* */ }
        await send('live', { code, sid: pickS.id });
        location.hash = '#/live/' + code;
        return;
      }
      if (t.hasAttribute('data-grp-add')) {
        const friends = await EF.pickFriends({ title: 'Add to ' + g.name, multi: true, cta: 'Add' });
        let n = 0;
        for (const f of friends) { try { await EF.cloud.groupAdd(id, f.username); n++; } catch (er) { EF.toast(`${f.name || f.username}: ${er.message}`, 'fa-circle-exclamation'); } }
        if (n) { EF.toast(`Added ${n} friend${n === 1 ? '' : 's'}`, 'fa-user-plus'); refresh(); }
        return;
      }
      if (t.hasAttribute('data-grp-leave')) {
        if (!confirm(`Leave “${g.name}”? You can be added back by a member.`)) return;
        try { await EF.cloud.groupLeave(id); EF.toast('You left the group', 'fa-right-from-bracket'); location.hash = '#/groups'; } catch (er) { EF.toast(er.message, 'fa-circle-exclamation'); }
      }
    };
    el.addEventListener('click', onClick);
    return () => { alive = false; clearTimeout(timer); el.removeEventListener('click', onClick); };
  }

  /* ================= #/settings ================= */
  const row = (art, label, sub, ctrl, href) => href
    ? `<a class="set-row" href="${href}"${/^(mailto:|https?:)/.test(href) || /\.html$/.test(href) ? ' target="_blank" rel="noopener"' : ''}><span class="set-ic">${art}</span><span class="set-text"><strong>${label}</strong>${sub ? `<small>${sub}</small>` : ''}</span>${ctrl || icon('fa-chevron-right', 'set-chev')}</a>`
    : `<div class="set-row"><span class="set-ic">${art}</span><span class="set-text"><strong>${label}</strong>${sub ? `<small>${sub}</small>` : ''}</span>${ctrl || ''}</div>`;
  const sw = (key, onv, disabled) => `<label class="zswitch"><input type="checkbox" role="switch" data-pref="${key}"${onv ? ' checked' : ''}${disabled ? ' disabled' : ''} aria-label="${key}"><i aria-hidden="true"></i></label>`;
  const CONTACT = '06joshuaandersone4798@gmail.com';
  EF.mountSettings = (el) => {
    let alive = true, me = on() ? EF.cloud.cachedMe() : null;
    const P = EF.prefs;
    function draw() {
      const dark = EF.theme.get() === 'dark', fs = P.get('fontSize') || 'm';
      el.innerHTML = `<header class="page-head page-head-sm"><span class="eyebrow">${icon('fa-gear')} Settings</span><h1>Settings</h1></header>
        <section class="plan-card">
          <div><span class="plan-tag">Your plan</span><h2>Zing Free</h2><p>Everything is included: every subject, Learn, Live games, study groups and leagues. No ads, ever.</p></div>
          <span class="plan-art" aria-hidden="true">${EF.mascot('cheer', 96)}</span>
        </section>
        <section class="set-group">
          ${row(EF.img3d('gift', 30), 'Invite friends', `You both get ${EF.img3d('coin', 16)} 50 coins`, `<button type="button" class="btn btn-sm btn-sun" data-invite>Invite</button>`)}
          ${row(EF.img3d('speech', 30), 'Contact us', 'Questions, ideas or a problem', '', `mailto:${CONTACT}?subject=${encodeURIComponent('Zing')}`)}
          ${row(EF.img3d('bulb', 30), 'Help', 'How Zing works', '', '#/help')}
          ${row(EF.img3d('heart', 30), 'Send feedback', 'Tell us what to make next', '', `mailto:${CONTACT}?subject=${encodeURIComponent('Zing feedback')}`)}
        </section>
        <h2 class="set-h">Preferences</h2>
        <section class="set-group">
          ${row(EF.img3d('globe', 30), 'Language', 'More languages are on the way', `<span class="set-val">English</span>`)}
          ${row(EF.img3d('bell', 30), 'Sounds', 'Little sounds for right and wrong answers', sw('sounds', P.get('sounds')))}
          ${row(EF.img3d('sparkles', 30), 'Music', 'Calm study music while Zing is open', sw('music', P.get('music')))}
          ${row(EF.img3d('bolt', 30), 'Haptics', 'Small buzzes on phones that support it', sw('haptics', P.get('haptics')))}
          ${row(EF.img3d('moon', 30), 'Dark mode', '', `<label class="zswitch"><input type="checkbox" role="switch" data-dark${dark ? ' checked' : ''} aria-label="Dark mode"><i aria-hidden="true"></i></label>`)}
          ${row(EF.img3d('sleep', 30), 'Do not disturb', 'No pop-ups for challenges and reminders', sw('dnd', P.get('dnd')))}
          ${row(EF.img3d('calendar', 30), 'Study reminders', me ? 'A nudge when your streak needs you' : 'Make an account to turn these on', sw('reminders', me ? me.reminders !== false : false, !me))}
          ${row(EF.img3d('cards', 30), 'Card reminder notifications', 'A notification when cards are due (while Zing is open)', sw('cardReminders', P.get('cardReminders') && 'Notification' in window && Notification.permission === 'granted', !('Notification' in window)))}
          ${row(EF.img3d('school', 30), 'Decks are public', 'New sets you make go to your school library', sw('decksPublic', P.get('decksPublic'), !(me && me.school)))}
          ${row(EF.img3d('people', 30), 'Friend finding', me && me.age != null && me.age < 13 ? 'For students 13 and up' : 'Classmates can find you by name', sw('findable', !!(me && me.findable), !me || (me.age != null && me.age < 13)))}
          <div class="set-row set-fs"><span class="set-ic">${EF.img3d('memo', 30)}</span><span class="set-text"><strong>Font size</strong><small>Make reading easier</small></span>
            <div class="seg seg-sm" role="radiogroup" aria-label="Font size">${[['s', 'A', 'Small'], ['m', 'A', 'Default'], ['l', 'A', 'Large'], ['xl', 'A', 'Extra large']].map(([k, a, l], i) => `<button type="button" role="radio" data-fs="${k}" aria-checked="${fs === k}" aria-label="${l}" style="font-size:${0.78 + i * 0.12}rem">${a}</button>`).join('')}</div></div>
        </section>
        <h2 class="set-h">Account</h2>
        <section class="set-group">
          ${me ? row(EF.myAvatar(me, 34), 'Account information', esc([me.first_name ? me.first_name + ' ' + (me.last_name || '') : '', '@' + me.username].filter(Boolean).join(' · ')), '', '#/account')
            : EF.cloud.enabled ? row(EF.img3d('person', 30), 'Make your account', 'Save your progress and study with friends', `<button type="button" class="btn btn-sm btn-primary" data-ob-again>Set up</button>`) : ''}
          ${me ? row(EF.img3d('shield', 30), 'Sign in and security', 'Google, email and moving to a new phone', '', '#/account#security') : ''}
          ${me ? row(EF.img3d('key', 30), 'Sign out', 'Your progress stays on this device', `<button type="button" class="btn btn-sm" data-signout>Sign out</button>`) : ''}
          ${me ? row(EF.img3d('cross', 30), 'Delete account', 'Removes your profile, friends, groups and shared sets', `<button type="button" class="btn btn-sm btn-danger" data-delete-acct>Delete</button>`) : ''}
          ${row(EF.img3d('book', 30), 'Privacy policy', '', '', 'privacy.html')}
          ${row(EF.img3d('clipboard', 30), 'Terms of use', '', '', 'terms.html')}
        </section>
        <p class="muted small center set-foot">Zing · made with 💚 in Jamaica</p>`;
    }
    draw();
    if (on()) EF.cloud.me(true).then((m) => { if (alive && m) { me = m; draw(); } }).catch(() => {});
    const onChange = async (e) => {
      const t = e.target;
      if (t.matches('[data-dark]')) { EF.theme.set(t.checked ? 'dark' : 'light'); return; }
      const k = t.dataset.pref; if (!k) return;
      if (k === 'reminders' || k === 'findable') {
        t.disabled = true;
        try { me = await EF.cloud.setPrefs({ [k]: t.checked }); EF.toast('Saved', 'fa-circle-check'); } catch (er) { t.checked = !t.checked; EF.toast(er.message, 'fa-circle-exclamation'); }
        t.disabled = false; return;
      }
      if (k === 'cardReminders' && t.checked) {
        try { const r = await Notification.requestPermission(); if (r !== 'granted') { t.checked = false; EF.toast('Notifications are blocked in your browser settings', 'fa-bell-slash'); return; } } catch (er) { t.checked = false; return; }
      }
      P.set(k, t.checked);
      if (k === 'sounds' && t.checked) EF.sfx('success');
      EF.haptic();
    };
    const onClick = async (e) => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.fs) { P.set('fontSize', t.dataset.fs); el.querySelectorAll('[data-fs]').forEach((b) => b.setAttribute('aria-checked', String(b === t))); return; }
      if (t.hasAttribute('data-signout')) { if (confirm('Sign out on this device? Your progress stays here.')) { await EF.cloud.signOut(); EF.toast('Signed out', 'fa-right-from-bracket'); location.hash = '#/'; } return; }
      if (t.hasAttribute('data-delete-acct')) {
        if (!confirm('Delete your Zing account? Your profile, friends, groups, Live invites and shared sets are removed for good. Progress on this device stays.')) return;
        try { await EF.cloud.deleteMe(); ls.del('ef2:onboarded'); EF.toast('Account deleted', 'fa-trash'); location.hash = '#/'; } catch (er) { EF.toast(er.message, 'fa-circle-exclamation'); }
      }
    };
    el.addEventListener('change', onChange); el.addEventListener('click', onClick);
    return () => { alive = false; el.removeEventListener('change', onChange); el.removeEventListener('click', onClick); };
  };
  // "Set up my account" buttons anywhere reopen onboarding
  document.addEventListener('click', (e) => { const t = e.target.closest && e.target.closest('[data-ob-again]'); if (t && EF.onboarding) { e.preventDefault(); EF.onboarding.open(); } });

  /* ================= #/help ================= */
  const FAQ = [
    ['What is Zing?', 'Zing helps Grade 9 and 10 students study for their exams: notes, worked examples, interactive tools, flashcards, quizzes, Live games with friends and leaderboards for every school. Zing the Doctor Bird is your study buddy.'],
    ['How do I earn XP?', 'Everything you study earns XP: quiz answers, flashcards, reading topics, Learn, Match and Live games. Today’s XP fills your daily goal ring. Your XP for the week puts you on your school’s board and in a weekly league.'],
    ['What are coins for?', 'You get 1 coin for every 10 XP, 20 coins each day you hit your goal, and 50 coins for every friend who joins with your invite link. Spend them on power-ups: a streak freeze, or Double XP for 15 minutes.'],
    ['How do Live challenges work?', 'Open a friend’s profile or your rival card and tap Challenge. Pick a deck or a topic and they get an invite for 20 minutes. Everyone answers the same 10 questions at the same time, and faster right answers score more.'],
    ['Who can see my name?', 'Other students see your username, avatar, grade and school. If you’re 13 or older and friend finding is on, classmates also see your first name and last initial. Your age, last name and email are never shown.'],
    ['What can I send in study groups?', 'Emoji, quick ready-made phrases, cards from Zing decks and Live game invites. There’s no free typing in groups, so they stay friendly.'],
    ['How do I move to a new phone?', 'Sign in with Google or email on the new phone. Or open Settings → Sign in and security, get a transfer code, and type it on the new phone.'],
    ['How do I delete my account?', 'Settings → Delete account. Your profile, friends, groups and shared sets are removed. Progress saved on your device stays until you reset it on the Progress page.']
  ];
  EF.helpPage = () => `<div class="page narrow">
      <header class="page-head page-head-sm"><span class="eyebrow">${icon('fa-circle-question')} Help</span><h1>How Zing works</h1></header>
      <div class="help-hero">${EF.mascot('wave', 96)}<p>Got a question? Most answers are below. Still stuck? <a href="mailto:${CONTACT}?subject=${encodeURIComponent('Zing help')}">Email us</a>.</p></div>
      <div class="help-list">${FAQ.map(([q, a]) => `<details class="acc help-q"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
    </div>`;
})();
