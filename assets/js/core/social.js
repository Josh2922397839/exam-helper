/* Zing social: how the app feels (sounds, music, haptics, font size), coins and power-ups,
   the top bar's coins chip, notifications bell and avatar menu, the Social page (your rival,
   challenges, school board, study groups, people to follow), "Start a Live with a friend",
   and a friend picker. Everything other students wrote is shown as plain text. */
(function () {
  'use strict';
  const EF = window.EF;
  const esc = EF.esc, icon = EF.icon, ls = EF.ls;
  const UI = () => EF.cloudUI;
  const on = () => !!(EF.cloud && EF.cloud.enabled && EF.cloud.joined());

  /* ================= preferences ================= */
  const PREFS = 'ef2:prefs';
  const DEF = { sounds: true, music: false, haptics: true, dnd: false, cardReminders: false, decksPublic: false, fontSize: 'm' };
  const prefs = Object.assign({}, DEF);
  try { Object.assign(prefs, JSON.parse(ls.get(PREFS) || '{}')); } catch (e) { /* defaults */ }
  EF.prefs = {
    get: (k) => prefs[k],
    set(k, v) { prefs[k] = v; ls.set(PREFS, JSON.stringify(prefs)); apply(k); EF.emit('prefs', { k, v }); },
    all: () => Object.assign({}, prefs)
  };
  function apply(k) {
    if (!k || k === 'fontSize') document.documentElement.dataset.fs = ['s', 'm', 'l', 'xl'].includes(prefs.fontSize) ? prefs.fontSize : 'm';
    if (k === 'music') { if (prefs.music) music.start(); else music.stop(); }
  }

  /* ================= sounds and music (made on the fly with Web Audio: no files to download) ================= */
  let ac = null;
  const audio = () => {
    if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; try { ac = new C(); } catch (e) { return null; } }
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  };
  function tone(freq, at, dur, type, vol, out) {
    const a = audio(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + at;
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.05, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out || a.destination); o.start(t); o.stop(t + dur + 0.03);
  }
  EF.sfx = (kind) => {
    if (!prefs.sounds) return;
    try {
      if (kind === 'success') { tone(659, 0, 0.12, 'triangle'); tone(988, 0.08, 0.2, 'triangle'); }
      else if (kind === 'error') { tone(220, 0, 0.16, 'square', 0.022); tone(174, 0.1, 0.22, 'square', 0.022); }
      else if (kind === 'win') [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.22, 'triangle', 0.045));
      else if (kind === 'coin') { tone(988, 0, 0.08, 'square', 0.02); tone(1319, 0.07, 0.18, 'square', 0.02); }
      else if (kind === 'pop') tone(740, 0, 0.07, 'sine', 0.04);
    } catch (e) { /* no sound is fine */ }
  };
  // one call site for both: EF.haptic('success' | 'error' | 'tap') buzzes (if haptics are on) and plays a sound (if sounds are on)
  const baseHaptic = EF.haptic;
  EF.haptic = (kind) => { if (prefs.haptics && baseHaptic) baseHaptic(kind); if (kind === 'success' || kind === 'error') EF.sfx(kind); };
  const baseConfetti = EF.confetti;
  EF.confetti = () => { EF.sfx('win'); if (baseConfetti) baseConfetti(); };

  // calm study music: soft notes from a pentatonic scale, never the same twice
  const music = (() => {
    let timer = 0, master = null, playing = false;
    const SCALE = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25];
    function note() {
      const a = audio(); if (!a || !playing) return;
      const f = SCALE[Math.floor(Math.random() * SCALE.length)] / (Math.random() < 0.35 ? 2 : 1);
      tone(f, 0, 3.2, 'sine', 0.03, master);
      if (Math.random() < 0.3) tone(f * 1.5, 0.25, 2.6, 'sine', 0.012, master);
      timer = setTimeout(note, 650 + Math.random() * 900);
    }
    return {
      start() { const a = audio(); if (!a || playing || document.hidden) return; playing = true; master = a.createGain(); master.gain.value = 0.8; master.connect(a.destination); note(); },
      stop() { playing = false; clearTimeout(timer); if (master) { try { master.disconnect(); } catch (e) { /* */ } master = null; } }
    };
  })();
  // browsers only allow sound after a tap, so music starts on the first one
  document.addEventListener('pointerdown', () => { if (prefs.music) music.start(); }, { once: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) music.stop(); else if (prefs.music && ac) music.start(); });
  apply('fontSize');

  /* ================= coins and power-ups (kept on this device) ================= */
  const COINS = 'ef2:coins';
  const wallet = { earned: 0, spent: 0, carry: 0, refs: 0, goals: [], doubleUntil: 0 };
  try { Object.assign(wallet, JSON.parse(ls.get(COINS) || '{}')); } catch (e) { /* fresh wallet */ }
  const saveWallet = () => ls.set(COINS, JSON.stringify(wallet));
  const balance = () => Math.max(0, (wallet.earned || 0) - (wallet.spent || 0));
  EF.coins = {
    balance,
    add(n, why) { if (!(n > 0)) return; wallet.earned += n; saveWallet(); paintCoins(true); EF.sfx('coin'); EF.emit('coins', { n, why }); },
    spend(n) { if (balance() < n) return false; wallet.spent += n; saveWallet(); paintCoins(); EF.emit('coins', { n: -n }); return true; },
    doubleLeft: () => Math.max(0, (wallet.doubleUntil || 0) - Date.now())
  };
  EF.xpBoost = () => (Date.now() < (wallet.doubleUntil || 0) ? 2 : 1);
  // 1 coin for every 10 XP, +20 the first time each day you hit your daily goal
  EF.on('xp', (d) => {
    if (!d || !(d.n > 0)) return;
    wallet.carry = (wallet.carry || 0) + d.n;
    const whole = Math.floor(wallet.carry / 10);
    if (whole) { wallet.carry -= whole * 10; wallet.earned += whole; }
    if (d.before < d.goal && d.today >= d.goal) {
      const k = EF.dayKey();
      if (!(wallet.goals || []).includes(k)) { wallet.goals = (wallet.goals || []).concat(k).slice(-40); wallet.earned += 20; setTimeout(() => { EF.toast('Daily goal hit! +20 coins', 'fa-coins'); EF.sfx('coin'); }, 1400); }
    }
    saveWallet(); paintCoins(whole > 0);
  });
  // +50 coins for every friend who joins with your invite link (checked whenever your profile is fetched)
  function checkRefs() {
    const me = EF.cloud && EF.cloud.cachedMe && EF.cloud.cachedMe();
    if (!me) return;
    // +25 coins every time another student saves one of your shared decks
    if (me.deck_saves > (wallet.deckSaves || 0)) {
      const s = me.deck_saves - (wallet.deckSaves || 0);
      wallet.deckSaves = me.deck_saves; wallet.earned += 25 * s; saveWallet(); paintCoins(true);
      EF.toast(`Your deck${s > 1 ? 's were' : ' was'} saved ${s} time${s > 1 ? 's' : ''}! +${25 * s} coins`, 'fa-coins');
    }
    if (!(me.referrals > (wallet.refs || 0))) return;
    const k = me.referrals - (wallet.refs || 0);
    wallet.refs = me.referrals; wallet.earned += 50 * k; saveWallet(); paintCoins(true);
    EF.toast(`${k} friend${k > 1 ? 's' : ''} joined with your invite! +${50 * k} coins`, 'fa-coins');
  }
  EF.on('cloud', checkRefs);
  const POWERUPS = [
    { id: 'freeze', name: 'Streak freeze', art: 'shield', cost: 60, desc: 'Covers a day you miss, so your streak lives on. Hold up to 2.',
      state: () => (EF.store.freezes() ? `You have ${EF.store.freezes()}` : ''), can: () => EF.store.freezes() < 2, why: 'You already hold 2 streak freezes.', use: () => EF.store.addFreeze() },
    { id: 'double', name: 'Double XP', art: 'bolt', cost: 90, desc: 'Every bit of XP counts twice for the next 15 minutes.',
      state: () => (EF.coins.doubleLeft() ? `On: ${Math.ceil(EF.coins.doubleLeft() / 60000)} min left` : ''), can: () => !EF.coins.doubleLeft(), why: 'Double XP is already on.', use: () => { wallet.doubleUntil = Date.now() + 15 * 60000; saveWallet(); return true; } }
  ];
  EF.powerups = POWERUPS;
  EF.buyPowerup = (id) => {
    const p = POWERUPS.find((x) => x.id === id); if (!p) return false;
    if (!p.can()) { EF.toast(p.why, 'fa-circle-info'); return false; }
    if (balance() < p.cost) { EF.toast(`You need ${p.cost - balance()} more coins. Study to earn them!`, 'fa-coins'); EF.haptic('error'); return false; }
    EF.coins.spend(p.cost); p.use(); EF.haptic('success'); EF.toast(`${p.name} is ready!`, 'fa-bolt'); EF.emit('coins', { n: 0 });
    return true;
  };
  EF.powerupsCard = () => `<section class="pu-card" data-pu-card>
      <div class="pu-head"><span class="pu-coins">${EF.img3d('coin', 30)}<b data-coin-n>${balance().toLocaleString()}</b><small>coins</small></span><span class="muted small">1 coin per 10 XP</span></div>
      <ul class="pu-list">${POWERUPS.map((p) => `<li class="pu"><span class="pu-art">${EF.img3d(p.art, 34)}</span><span class="pu-text"><strong>${p.name}</strong><small>${p.state() ? `<b>${esc(p.state())}</b> · ` : ''}${esc(p.desc)}</small></span>
        <button type="button" class="btn btn-sm ${balance() >= p.cost && p.can() ? 'btn-sun' : ''}" data-buy="${p.id}"${p.can() ? '' : ' disabled'}>${EF.img3d('coin', 18)} ${p.cost}</button></li>`).join('')}</ul>
    </section>`;
  EF.on('coins', () => document.querySelectorAll('[data-pu-card]').forEach((c) => { c.outerHTML = EF.powerupsCard(); }));

  function paintCoins(bump) {
    document.querySelectorAll('[data-coins]').forEach((a) => {
      const b = a.querySelector('b'); if (b) b.textContent = balance().toLocaleString();
      a.setAttribute('aria-label', `${balance()} coins`);
      if (bump && !(EF.reducedMotion && EF.reducedMotion())) { a.classList.remove('is-bump'); void a.offsetWidth; a.classList.add('is-bump'); }
    });
  }
  EF.paintCoins = paintCoins;

  /* ================= invites ================= */
  EF.inviteLink = () => {
    const me = EF.cloud && EF.cloud.joined() ? EF.cloud.cachedMe() : null;
    return location.origin + location.pathname + (me ? '?ref=' + encodeURIComponent(me.username) : '');
  };
  EF.inviteFriends = () => {
    const url = EF.inviteLink(), text = 'Study with me on Zing! Notes, quizzes, Live games and school leaderboards. We both get 50 coins 🐦';
    const done = (how) => EF.toast(how === 'copied' ? 'Invite link copied: send it to your friends!' : 'Thanks for sharing!', 'fa-user-plus');
    if (navigator.share) navigator.share({ title: 'Zing', text, url }).then(() => done('shared')).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(text + ' ' + url).then(() => done('copied')).catch(() => window.prompt('Copy this link:', url));
    else window.prompt('Copy this link:', url);
  };
  EF.inviteCard = () => `<section class="zinv">
      <div class="zinv-art" aria-hidden="true">${EF.img3d('gift', 52)}</div>
      <strong>Invite friends</strong>
      <span>You both get <b>${EF.img3d('coin', 18)} 50 coins</b> when they join</span>
      <button type="button" class="btn btn-sun btn-block" data-invite>${icon('fa-user-plus')} Invite friends</button>
    </section>`;

  /* ================= action toasts (a toast with a button) ================= */
  function actionToast(html, label, action, ms) {
    const wrap = document.getElementById('toasts'); if (!wrap) return;
    const t = document.createElement('div');
    t.className = 'toast toast-action';
    t.setAttribute('role', 'status');
    t.innerHTML = `${html}<button type="button" class="btn btn-sm btn-primary">${esc(label)}</button><button type="button" class="toast-x" aria-label="Dismiss">${icon('fa-xmark')}</button>`;
    wrap.appendChild(t);
    requestAnimationFrame(() => t.classList.add('is-in'));
    const bye = () => { t.classList.remove('is-in'); setTimeout(() => t.remove(), 300); };
    t.querySelector('.btn').addEventListener('click', () => { bye(); action(); });
    t.querySelector('.toast-x').addEventListener('click', bye);
    setTimeout(bye, ms || 9000);
  }

  /* ================= the bell: challenges, new followers, group messages ================= */
  let social = null, pollTimer = 0;
  const SEEN = 'ef2:seenChallenges';
  let known = new Set(); try { known = new Set(JSON.parse(ls.get(SEEN) || '[]')); } catch (e) { /* */ }
  const people = new Map(); // username → person card, so buttons can open the challenge sheet
  const remember = (list) => (list || []).forEach((p) => { if (p && p.username) people.set(p.username.toLowerCase(), p); });
  const badgeCount = () => (social ? (social.challenges || []).length + (+social.new_followers || 0) + (+social.unread || 0) : 0);
  EF.socialCount = badgeCount;
  function paintBell() {
    document.querySelectorAll('[data-tab-badge]').forEach((x) => { const n = badgeCount(); x.textContent = n > 9 ? '9+' : String(n); x.hidden = !n; });
    document.querySelectorAll('[data-bell]').forEach((b) => {
      b.hidden = !on();
      const n = badgeCount(), dot = b.querySelector('[data-bell-n]');
      if (dot) { dot.textContent = n > 9 ? '9+' : String(n); dot.hidden = !n; }
      b.setAttribute('aria-label', n ? `Notifications: ${n} new` : 'Notifications');
    });
  }
  async function poll() {
    clearTimeout(pollTimer);
    if (!on() || document.hidden || !navigator.onLine) { paintBell(); pollTimer = setTimeout(poll, 60000); return; }
    try {
      social = await EF.cloud.social();
      if (Date.now() - (poll.meAt || 0) > 5 * 60000) { poll.meAt = Date.now(); await EF.cloud.me(true).catch(() => null); }
      checkRefs();
      if (social) {
        remember(social.rivals); (social.challenges || []).forEach((c) => remember([c.from]));
        (social.challenges || []).forEach((c) => {
          if (known.has(c.id)) return;
          known.add(c.id);
          if (prefs.dnd || location.hash.startsWith('#/live/')) return;
          const s = EF.subject(c.subject);
          actionToast(`${EF.avatar(c.from.avatar, c.from.username, 30)}<span><b>${esc(c.from.name || c.from.username)}</b> challenged you${s ? ' to ' + esc(s.short) : ''}!</span>`, 'Join', () => joinChallenge(c));
          EF.sfx('pop');
        });
        ls.set(SEEN, JSON.stringify(Array.from(known).slice(-60)));
        EF.emit('social', social);
      }
    } catch (e) { /* try again later */ }
    paintBell();
    pollTimer = setTimeout(poll, 45000);
  }
  EF.refreshSocial = poll;
  document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
  EF.on('cloud', (d) => { if (d && (d.kind === 'joined' || d.kind === 'ready' || d.kind === 'left')) { social = null; poll(); } });

  async function joinChallenge(c) {
    try { await EF.cloud.answerChallenge(c.id, 'joined'); } catch (e) { /* still go */ }
    location.hash = '#/live/' + c.code;
  }

  let pop = null;
  function closePop() { if (!pop) return; const p = pop; pop = null; p.classList.remove('is-in'); setTimeout(() => p.remove(), 200); document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', escClose); }
  const outside = (e) => { if (pop && !pop.contains(e.target) && !e.target.closest('[data-bell], [data-top-me]')) closePop(); };
  const escClose = (e) => { if (e.key === 'Escape') closePop(); };
  function openPop(anchor, html, cls) {
    closePop();
    pop = document.createElement('div');
    pop.className = 'zpop ' + (cls || '');
    pop.innerHTML = html;
    document.body.appendChild(pop);
    const r = anchor.getBoundingClientRect(), w = Math.min(360, window.innerWidth - 24);
    pop.style.width = w + 'px';
    pop.style.top = Math.round(r.bottom + 8) + 'px';
    pop.style.left = Math.round(Math.max(12, Math.min(window.innerWidth - w - 12, r.right - w))) + 'px';
    requestAnimationFrame(() => pop && pop.classList.add('is-in'));
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('keydown', escClose);
    return pop;
  }
  window.addEventListener('hashchange', closePop);

  const ago = (iso) => {
    const s = Math.max(0, (Date.now() - new Date(iso)) / 1000);
    return s < 60 ? 'now' : s < 3600 ? Math.floor(s / 60) + 'm' : s < 86400 ? Math.floor(s / 3600) + 'h' : s < 604800 ? Math.floor(s / 86400) + 'd' : new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };
  EF.ago = ago;
  async function openBell(btn) {
    const p = openPop(btn, `<div class="zpop-head"><strong>Notifications</strong><a class="link" href="#/social">Social</a></div><div class="zpop-body">${UI().loadingRows(3)}</div>`, 'bell-pop');
    try {
      const [inbox, groups] = await Promise.all([EF.cloud.inbox(), EF.cloud.groups().catch(() => [])]);
      if (pop !== p) return;
      const unread = groups.filter((g) => g.unread);
      remember(inbox.followers); (inbox.challenges || []).forEach((c) => remember([c.from]));
      const items = [];
      (inbox.challenges || []).forEach((c) => { const s = EF.subject(c.subject); items.push(`<li class="nt is-new">${EF.avatar(c.from.avatar, c.from.username, 40)}<span><b>${esc(c.from.name || c.from.username)}</b> challenged you to a Live game${s ? ': ' + esc(s.short) : ''}${c.topic ? ' · ' + esc(c.topic) : ''}<small>${ago(c.created_at)} · ${Math.max(1, Math.ceil((new Date(c.expires_at) - Date.now()) / 60000))} min left</small></span><button type="button" class="btn btn-sm btn-primary" data-join-ch="${esc(c.id)}">Join</button></li>`); });
      unread.forEach((g) => items.push(`<li class="nt is-new"><span class="nt-grp" style="--g:${esc(g.color)}">${esc(initials(g.name))}</span><span><b>${g.unread} new message${g.unread === 1 ? '' : 's'}</b> in ${esc(g.name)}<small>${g.last ? ago(g.last.at) : ''}</small></span><a class="btn btn-sm" href="#/groups/${esc(g.id)}">Open</a></li>`));
      (inbox.followers || []).forEach((f) => items.push(`<li class="nt${f.new ? ' is-new' : ''}">${EF.avatar(f.avatar, f.username, 40)}<span><b>${esc(f.name || f.username)}</b> started following you<small>${ago(f.at)}</small></span>${f.i_follow ? `<a class="btn btn-sm" href="#/u/${encodeURIComponent(f.username)}">View</a>` : `<button type="button" class="btn btn-sm btn-primary" data-follow-u="${esc(f.username)}">Follow back</button>`}</li>`));
      p.querySelector('.zpop-body').innerHTML = items.length ? `<ul class="nt-list">${items.join('')}</ul>` : `<div class="nt-empty">${EF.mascot('sleep', 80)}<p>All quiet. Challenge a friend to wake things up!</p></div>`;
      p._inbox = inbox;
      EF.cloud.inboxSeen().then(() => { if (social) { social.new_followers = 0; paintBell(); } }).catch(() => {});
    } catch (e) { if (pop === p) p.querySelector('.zpop-body').innerHTML = UI().errBox(e); }
  }
  const initials = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  EF.initials = initials;

  function openMeMenu(a) {
    const me = EF.cloud.cachedMe();
    openPop(a, `<div class="me-menu">
        <a class="me-menu-top" href="#/me">${EF.myAvatar(me, 44)}<span><strong>${esc(me ? (me.first_name || me.username) : 'You')}</strong><small>@${esc(me ? me.username : '')}</small></span></a>
        <a href="#/me">${icon('fa-user')} Profile</a>
        <a href="#/social">${icon('fa-user-group')} Social</a>
        <a href="#/settings">${icon('fa-gear')} Settings</a>
        <button type="button" data-invite>${icon('fa-user-plus')} Invite friends</button>
        <a href="#/help">${icon('fa-circle-question')} Help</a>
      </div>`, 'me-pop');
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('[data-bell], [data-top-me], [data-join-ch], [data-follow-u], [data-challenge], [data-buy], [data-invite]');
    if (!t) return;
    if (t.hasAttribute('data-bell')) { e.preventDefault(); if (pop && pop.classList.contains('bell-pop')) closePop(); else openBell(t); return; }
    if (t.hasAttribute('data-top-me')) { if (!on()) return; e.preventDefault(); if (pop && pop.classList.contains('me-pop')) closePop(); else openMeMenu(t); return; }
    if (t.hasAttribute('data-invite')) { e.preventDefault(); e.stopPropagation(); closePop(); EF.inviteFriends(); return; }
    if (t.dataset.joinCh) {
      const list = (pop && pop._inbox && pop._inbox.challenges) || (social && social.challenges) || [];
      const c = list.find((x) => x.id === t.dataset.joinCh) || (t.dataset.code ? { id: t.dataset.joinCh, code: t.dataset.code } : null);
      closePop(); if (c) joinChallenge(c); return;
    }
    if (t.dataset.followU) {
      t.disabled = true;
      EF.cloud.follow(t.dataset.followU).then(() => { t.outerHTML = `<span class="pill">${icon('fa-check')} Following</span>`; EF.haptic('success'); }).catch((er) => { t.disabled = false; EF.toast(er.message, 'fa-circle-exclamation'); });
      return;
    }
    if (t.dataset.challenge) { e.preventDefault(); const p = people.get(t.dataset.challenge.toLowerCase()) || { username: t.dataset.challenge }; EF.openChallenge(p); return; }
    if (t.dataset.buy) { EF.buyPowerup(t.dataset.buy); }
  }, true);

  /* ================= "Start a Live with a friend" ================= */
  const liveDecks = () => EF.subjects.filter((s) => !s.custom && EF.questionPool(s, EF.rng(1)).length >= 10);
  const tagCount = (s, tag) => (s.flashcards || []).filter((c) => c[2] === tag && c[5] !== 'quiz').length + (s.quiz || []).filter((q) => q.tag === tag).length;
  const lastStudied = (s) => {
    const st = EF.store.state(), seen = (st.visited[s.id] || []).length, p = EF.store.progress(s.id);
    if (st.last && st.last.s === s.id) return 'You studied this last';
    return p.pct ? `You’re ${p.pct}% through` : seen ? `${seen} topic${seen === 1 ? '' : 's'} read` : '';
  };
  EF.openChallenge = (person) => {
    if (!on()) { EF.toast('Finish setting up your account to challenge friends', 'fa-user'); return; }
    const p = person || {}, name = p.name || p.username || 'a friend';
    let tab = 'decks', pick = null, q = '';
    const dlg = document.createElement('dialog');
    dlg.className = 'zdlg ch-dlg';
    // your grade's decks first, then the one you studied last
    const myGrade = (EF.cloud.cachedMe() || {}).grade, lastS = (EF.store.state().last || {}).s;
    const decks = liveDecks().map((s, i) => [s, (s.id === lastS ? -2 : 0) + (EF.gradeOf(s) === myGrade ? -1 : 0), i]).sort((a, b) => a[1] - b[1] || a[2] - b[2]).map(([s]) => s);
    const topicGroups = () => decks.map((s) => [s, (EF.deckTags(s) || []).filter((t) => tagCount(s, t) >= 6)]).filter(([, tags]) => tags.length);
    function body() {
      const lq = q.toLowerCase();
      if (tab === 'decks') {
        const list = decks.filter((s) => !lq || s.name.toLowerCase().includes(lq) || s.short.toLowerCase().includes(lq));
        return list.length ? `<ul class="ch-decks" role="radiogroup" aria-label="Decks">${list.map((s) => { const sel = pick && pick.sid === s.id && !pick.tag; return `<li><button type="button" role="radio" class="ch-deck tint${sel ? ' is-on' : ''}" style="--c:${s.color}" data-pick-deck="${esc(s.id)}" aria-checked="${sel}">${EF.subjectIcon(s.id)}<span><strong>${esc(s.name)}</strong><small>Grade ${EF.gradeOf(s)} · ${(s.flashcards || []).length} cards${lastStudied(s) ? ' · ' + esc(lastStudied(s)) : ''}</small></span><i class="ch-radio" aria-hidden="true"></i></button></li>`; }).join('')}</ul>` : `<p class="muted center">No decks match “${esc(q)}”.</p>`;
      }
      const wordStart = (txt) => txt.toLowerCase().split(/[^a-z0-9]+/).some((w) => w.startsWith(lq));
      const groups = topicGroups().map(([s, tags]) => [s, tags.filter((t) => !lq || t.toLowerCase().includes(lq) || wordStart(s.name))]).filter(([, tags]) => tags.length);
      return groups.length ? groups.map(([s, tags]) => `<div class="ch-topic-group tint" style="--c:${s.color}"><h4>${EF.subjectIcon(s.id)} ${esc(s.name)} <small>Grade ${EF.gradeOf(s)}</small></h4><div class="ch-chips">${tags.map((t) => { const sel = pick && pick.sid === s.id && pick.tag === t; return `<button type="button" class="ch-chip${sel ? ' is-on' : ''}" data-pick-topic="${esc(s.id)}" data-tag="${esc(t)}" aria-pressed="${sel}">${esc(t)}</button>`; }).join('')}</div></div>`).join('') : `<p class="muted center">No topics match “${esc(q)}”. Try a shorter word.</p>`;
    }
    function draw(keepFocus) {
      dlg.innerHTML = `<form method="dialog" class="zdlg-box">
        <header class="zdlg-head">${EF.avatar(p.avatar, p.username || name, 44)}<div><small>Start a Live with</small><h2>${esc(name)}</h2></div><button type="submit" value="x" class="icon-btn" aria-label="Close">${icon('fa-xmark')}</button></header>
        <div class="seg ch-tabs" role="tablist"><button type="button" role="tab" data-ch-tab="decks" aria-selected="${tab === 'decks'}">${icon('fa-layer-group')} Decks</button><button type="button" role="tab" data-ch-tab="topics" aria-selected="${tab === 'topics'}">${icon('fa-tags')} Topics</button></div>
        <label class="zsearch">${icon('fa-magnifying-glass')}<input type="search" data-ch-q placeholder="${tab === 'decks' ? 'Search decks' : 'Type a topic, like ions or photosynthesis'}" value="${esc(q)}" autocomplete="off" aria-label="Search"></label>
        <div class="zdlg-scroll">${body()}</div>
        <footer class="zdlg-foot"><button type="button" class="btn btn-primary btn-lg btn-block" data-ch-play${pick ? '' : ' disabled'}>${icon('fa-play')} ${pick ? `Play ${esc(pick.tag || (EF.subject(pick.sid) || {}).short || '')}` : 'Pick a deck or topic'}</button></footer>
      </form>`;
      if (keepFocus) { const i = dlg.querySelector('[data-ch-q]'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
    }
    draw();
    document.body.appendChild(dlg);
    dlg.addEventListener('close', () => dlg.remove());
    dlg.addEventListener('click', async (e) => {
      if (e.target === dlg) { dlg.close(); return; }
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.chTab) { tab = t.dataset.chTab; q = ''; draw(); return; }
      if (t.dataset.pickDeck) { pick = { sid: t.dataset.pickDeck, tag: null }; draw(); return; }
      if (t.dataset.pickTopic) { pick = { sid: t.dataset.pickTopic, tag: t.dataset.tag }; draw(); return; }
      if (t.hasAttribute('data-ch-play') && pick) {
        t.disabled = true; t.innerHTML = `${icon('fa-spinner', 'fa-spin')} Sending…`;
        try { await EF.startLiveWith({ sid: pick.sid, tag: pick.tag, invite: p.username ? p : null }); dlg.close(); }
        catch (er) { EF.toast(er.message, 'fa-circle-exclamation'); draw(); }
      }
    });
    dlg.addEventListener('input', (e) => { if (e.target.matches('[data-ch-q]')) { q = e.target.value; const sc = dlg.querySelector('.zdlg-scroll'); sc.innerHTML = body(); } });
    dlg.showModal();
  };
  // host a Live game, invite a friend (if any), then open the lobby
  EF.startLiveWith = async ({ sid, tag, invite }) => {
    const code = EF.liveNewCode();
    const info = { host: true, sid, tag: tag || null, invite: invite ? { username: invite.username, avatar: invite.avatar || null, name: invite.name || null } : null, title: tag || null };
    try { sessionStorage.setItem('ef2:live:' + code, JSON.stringify(info)); } catch (e) { /* private mode: the lobby still works for this tab */ }
    if (invite && invite.username) {
      await EF.cloud.challenge(invite.username, code, sid, tag);
      EF.toast(`Challenge sent to ${invite.name || invite.username}!`, 'fa-paper-plane');
    }
    location.hash = '#/live/' + code;
    return code;
  };

  /* ================= friend picker (for Live invites and groups) ================= */
  EF.pickFriends = ({ title, multi, cta, note }) => new Promise((resolve) => {
    let list = null, q = '', chosen = new Map(), timer = 0, seq = 0;
    const dlg = document.createElement('dialog');
    dlg.className = 'zdlg pick-dlg';
    const row = (p) => { const k = p.username.toLowerCase(), sel = chosen.has(k); return `<li><button type="button" class="pick-row${sel ? ' is-on' : ''}" data-pick="${esc(p.username)}" aria-pressed="${sel}">${EF.avatar(p.avatar, p.username, 40)}<span><strong>${esc(p.name || p.username)}</strong><small>${[p.name ? '@' + p.username : '', p.grade ? 'Grade ' + p.grade : '', p.school].filter(Boolean).map(esc).join(' · ')}</small></span><i class="ch-radio${multi ? ' is-box' : ''}" aria-hidden="true"></i></button></li>`; };
    function paintList() { const box = dlg.querySelector('.zdlg-scroll'); if (!box) return; box.innerHTML = list === null ? UI().loadingRows(4) : list.length ? `<ul class="pick-list">${list.map(row).join('')}</ul>` : `<div class="nt-empty">${EF.mascot('think', 70)}<p>${q ? 'Nobody found. Try their exact username.' : 'Follow some classmates first, then they’ll show up here.'}</p></div>`; }
    function paintFoot() { const b = dlg.querySelector('[data-pick-go]'); if (b) { b.disabled = !chosen.size; b.textContent = chosen.size ? `${cta || 'Add'} (${chosen.size})` : (cta || 'Add'); } }
    dlg.innerHTML = `<form method="dialog" class="zdlg-box"><header class="zdlg-head">${EF.img3d('people', 40)}<div><h2>${esc(title || 'Pick friends')}</h2>${note ? `<small>${esc(note)}</small>` : ''}</div><button type="submit" value="x" class="icon-btn" aria-label="Close">${icon('fa-xmark')}</button></header>
      <label class="zsearch">${icon('fa-magnifying-glass')}<input type="search" data-pick-q placeholder="Search classmates or a username" autocomplete="off" aria-label="Search friends"></label>
      <div class="zdlg-scroll"></div>
      <footer class="zdlg-foot"><button type="button" class="btn btn-primary btn-lg btn-block" data-pick-go disabled>${esc(cta || 'Add')}</button></footer></form>`;
    async function load() {
      const my = ++seq;
      try {
        let r;
        if (q.length >= 2) r = await EF.cloud.suggest(q);
        else { const [fr, sg] = await Promise.all([EF.cloud.friendsBoard().catch(() => ({ rows: [] })), EF.cloud.suggest().catch(() => [])]); r = (fr.rows || []).filter((x) => !x.me).concat(sg); }
        if (my !== seq) return;
        const seen = new Set(); list = r.filter((x) => { const k = x.username.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
        remember(list);
      } catch (e) { if (my === seq) list = []; }
      paintList();
    }
    document.body.appendChild(dlg);
    paintList(); load();
    let result = [];
    dlg.addEventListener('close', () => { dlg.remove(); resolve(result); });
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) { dlg.close(); return; }
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.pick) {
        const k = t.dataset.pick.toLowerCase(), p = (list || []).find((x) => x.username.toLowerCase() === k);
        if (!multi) { result = p ? [p] : []; dlg.close(); return; }
        if (chosen.has(k)) chosen.delete(k); else if (p) chosen.set(k, p);
        t.classList.toggle('is-on', chosen.has(k)); t.setAttribute('aria-pressed', String(chosen.has(k))); paintFoot();
        return;
      }
      if (t.hasAttribute('data-pick-go')) { result = Array.from(chosen.values()); dlg.close(); }
    });
    dlg.addEventListener('input', (e) => { if (e.target.matches('[data-pick-q]')) { q = e.target.value.trim(); clearTimeout(timer); timer = setTimeout(() => { list = null; paintList(); load(); }, 300); } });
    dlg.showModal();
  });

  /* ================= the Social page ================= */
  EF.mountSocial = (el) => {
    if (!EF.cloud.enabled) { el.innerHTML = UI().offBox(); return () => {}; }
    if (!EF.cloud.joined()) { el.innerHTML = `<div class="empty-state">${EF.mascot('wave', 120)}<h2>Finish setting up first</h2><p class="muted">Make your account to study with friends, join challenges and climb your school’s board.</p><button type="button" class="btn btn-primary" data-ob-again>${icon('fa-user')} Set up my account</button></div>`; return () => {}; }
    let alive = true, data = null, me = null, groups = [], sugg = [], board = null, period = ls.get('ef2:socPeriod') || 'week', ri = 0, boardBusy = false;
    el.innerHTML = `<div class="social-grid"><div class="social-main">${UI().loadingRows(6)}</div></div>`;
    const kid = () => !!(me && me.age != null && me.age < 13);
    function vsCard() {
      const rivals = (data && data.rivals) || [], r = rivals.length ? rivals[ri % rivals.length] : null, mine = data ? +data.xp_week || 0 : 0;
      const live = `<span class="vs-live"><i aria-hidden="true"></i>${(data && data.playing) || 1} playing now</span>`;
      if (!r) return `<section class="vs-card is-empty"><div class="vs-top">${live}</div><div class="vs-empty">${EF.mascot('think', 96)}<div><h2>Find your rival</h2><p>Follow a classmate and Zing pairs you up every week. Whoever studies more wins!</p><a class="btn btn-sun" href="#/groups" data-find-friends>${icon('fa-user-plus')} Find friends</a></div></div></section>`;
      const them = r.name || r.username, first = them.split(' ')[0], total = Math.max(1, mine + (+r.xp_week || 0)), share = Math.round((mine / total) * 100), gap = Math.abs(mine - (+r.xp_week || 0));
      return `<section class="vs-card" aria-label="You versus ${esc(them)} this week">
        <div class="vs-top">${live}${rivals.length > 1 ? `<button type="button" class="icon-btn vs-next" data-vs-next aria-label="Show another rival">${icon('fa-rotate')}</button>` : ''}</div>
        <div class="vs-row">
          <a class="vs-side is-me" href="#/me">${EF.myAvatar(me, 78)}<strong>You</strong><span><b>${UI().fmtXP(mine)}</b> XP</span></a>
          <span class="vs-badge" aria-hidden="true">VS</span>
          <a class="vs-side is-them" href="#/u/${encodeURIComponent(r.username)}">${EF.avatar(r.avatar, r.username, 78)}${r.online ? '<em class="vs-on" title="Online now"></em>' : ''}<strong>${esc(them)}</strong><span><b>${UI().fmtXP(r.xp_week)}</b> XP</span></a>
        </div>
        <div class="vs-bar" role="img" aria-label="${share}% of your combined XP this week is yours"><span style="width:${Math.max(4, Math.min(96, share))}%"></span></div>
        <p class="vs-msg">${mine > r.xp_week ? `You’re <b>${gap} XP</b> ahead this week. Keep going! 🔥` : mine === +r.xp_week ? 'Neck and neck! One quiz could decide it.' : `${esc(first)} is <b>${gap} XP</b> ahead. You can catch up!`}</p>
        <button type="button" class="btn btn-coral btn-lg btn-block" data-challenge="${esc(r.username)}">${EF.img3d('bolt', 24)} Challenge ${esc(first)}</button>
      </section>`;
    }
    function challenges() {
      const list = (data && data.challenges) || [];
      return `<section class="home-section"><div class="section-head"><h2>${EF.img3d('game', 28)} Challenge friends</h2>${list.length ? `<span class="pill">${list.length} waiting</span>` : ''}</div>
        ${list.length ? `<div class="ch-row">${list.map((c) => {
          const s = EF.subject(c.subject), left = Math.max(0, new Date(c.expires_at) - Date.now()), total = Math.max(1, new Date(c.expires_at) - new Date(c.created_at));
          return `<article class="ch-card"><span class="ch-badge">Challenger</span><a href="#/u/${encodeURIComponent(c.from.username)}">${EF.avatar(c.from.avatar, c.from.username, 58)}</a><strong>${esc(c.from.name || c.from.username)}</strong>
            <span class="ch-deck-pill tint" style="--c:${s ? s.color : '#0b8a5e'}">${s ? EF.subjectIcon(s.id) : ''}<span>${esc(s ? s.short : c.subject)}${c.topic ? ' · ' + esc(c.topic) : ''}</span></span>
            <button type="button" class="btn btn-primary btn-block" data-join-ch="${esc(c.id)}" data-code="${esc(c.code)}">${icon('fa-right-to-bracket')} Join game</button>
            <span class="ch-timer" aria-label="${Math.ceil(left / 60000)} minutes left"><span style="width:${(left / total) * 100}%;animation-duration:${Math.round(left / 1000)}s"></span></span></article>`;
        }).join('')}</div>`
          : `<div class="ch-empty">${EF.img3d('game', 44)}<span><strong>No challenges right now</strong><small>Challenge a friend to a Live game, or start one yourself.</small></span><a class="btn btn-sm" href="#/live">${icon('fa-bolt')} Live</a></div>`}
      </section>`;
    }
    function schoolBoard() {
      if (!me || !me.school) return `<section class="home-section"><div class="ch-empty">${EF.img3d('school', 44)}<span><strong>Add your school</strong><small>See how you rank against your classmates.</small></span><a class="btn btn-sm" href="#/account">Add school</a></div></section>`;
      const rows = board ? board.rows : [], top = rows.slice(0, 10), mine = rows.find((r) => r.me);
      return `<section class="home-section soc-board"><div class="section-head"><h2><a href="#/school/${me.school.id}">${EF.schoolMark(me.school, 30)} ${esc(me.school.name)}</a></h2>
          <div class="seg seg-sm" role="tablist" aria-label="Time period">${[['week', 'Week'], ['month', 'Month'], ['all', 'All time']].map(([k, l]) => `<button type="button" role="tab" data-soc-period="${k}" aria-selected="${period === k}">${l}</button>`).join('')}</div></div>
        <ol class="lb${boardBusy ? ' is-loading' : ''}">${!board ? `<li class="lb-empty-row">${icon('fa-spinner', 'fa-spin')} Loading…</li>` : top.length ? top.map((r) => UI().row(Object.assign({}, r, { school: null, username: r.username }), '')).join('') + (mine && mine.rank > 10 ? UI().row(mine, ' is-gap') : '') : '<li class="lb-empty-row">Nobody has XP here yet. Be the first!</li>'}</ol>
        <a class="link" href="#/school/${me.school.id}">See the full board ${icon('fa-arrow-right')}</a>
      </section>`;
    }
    function groupsSection() {
      if (kid()) return '';
      return `<section class="home-section"><div class="section-head"><h2>${EF.img3d('speech', 28)} Study groups</h2><a class="link" href="#/groups">All groups ${icon('fa-arrow-right')}</a></div>
        ${groups.length ? `<ul class="grp-list">${groups.slice(0, 3).map((g) => EF.groupRow(g)).join('')}</ul>` : `<div class="ch-empty">${EF.img3d('people', 44)}<span><strong>Start a study group</strong><small>Send cards, Live games and quick messages to your crew.</small></span><a class="btn btn-sm btn-primary" href="#/groups" data-new-group>${icon('fa-plus')} Study group</a></div>`}
      </section>`;
    }
    function suggested() {
      if (kid() || !sugg.length) return '';
      return `<section class="home-section"><div class="section-head"><h2>${EF.img3d('wave', 28)} Suggested friends</h2></div>
        <div class="sg-row">${sugg.slice(0, 10).map((p) => `<article class="sg-card"><a href="#/u/${encodeURIComponent(p.username)}">${EF.avatar(p.avatar, p.username, 64)}</a><strong>${esc(p.name || p.username)}</strong><small>${[p.grade ? 'Grade ' + p.grade : '', p.school].filter(Boolean).map(esc).join(' · ') || '@' + esc(p.username)}</small>${p.i_follow ? `<span class="pill">${icon('fa-check')} Following</span>` : `<button type="button" class="btn btn-sm btn-primary" data-follow-u="${esc(p.username)}">${p.follows_me ? 'Follow back' : 'Follow'}</button>`}</article>`).join('')}</div>
      </section>`;
    }
    function draw() {
      el.innerHTML = `<div class="social-grid">
        <div class="social-main">
          <header class="page-head page-head-sm"><span class="eyebrow">${icon('fa-user-group')} Social</span><h1>Study with friends</h1></header>
          ${vsCard()}${challenges()}${schoolBoard()}${groupsSection()}${suggested()}
          ${kid() ? `<p class="soc-kid">${icon('fa-shield-halved')} Some social features are for students 13 and up. You can still play Live games and climb your school’s board.</p>` : ''}
        </div>
        <aside class="social-rail" aria-label="Invites and power-ups">${EF.inviteCard()}${EF.powerupsCard()}</aside>
      </div>`;
    }
    async function loadBoard() {
      if (!me || !me.school) return;
      boardBusy = !!board; if (board) draw();
      try { board = await EF.cloud.schoolBoard(me.school.id, period); } catch (e) { board = board || { rows: [] }; }
      boardBusy = false;
      if (alive) draw();
    }
    async function load() {
      try {
        const [s, m, g, sg] = await Promise.all([EF.cloud.social(), EF.cloud.me(true), EF.cloud.groups().catch(() => []), EF.cloud.suggest().catch(() => [])]);
        if (!alive) return;
        data = s; me = m; groups = g || []; sugg = sg || [];
        checkRefs();
        if (s) { social = s; paintBell(); remember(s.rivals); (s.challenges || []).forEach((c) => remember([c.from])); }
        remember(sugg);
        draw(); loadBoard();
      } catch (e) { if (alive) el.innerHTML = UI().errBox(e); }
    }
    const onClick = (e) => {
      const t = e.target.closest('button, a'); if (!t) return;
      if (t.hasAttribute('data-vs-next')) { ri++; const card = el.querySelector('.vs-card'); if (card) { card.outerHTML = vsCard(); } EF.haptic(); return; }
      if (t.dataset.socPeriod) { period = t.dataset.socPeriod; ls.set('ef2:socPeriod', period); loadBoard(); }
    };
    const onSocial = (s) => { if (!alive || !s || !data) return; const before = (data.challenges || []).map((c) => c.id).join(); data = Object.assign({}, data, s); if ((s.challenges || []).map((c) => c.id).join() !== before) draw(); };
    EF.on('social', onSocial);
    el.addEventListener('click', onClick);
    load();
    return () => { alive = false; el.removeEventListener('click', onClick); };
  };

  /* ================= streak reminders (when "study reminders" is on) ================= */
  setTimeout(() => {
    const me = EF.cloud && EF.cloud.joined() ? EF.cloud.cachedMe() : null, local = EF.localMe ? EF.localMe() : null;
    const wants = me ? me.reminders !== false : !!(local && local.reminders !== false);
    if (!wants || prefs.dnd) return;
    const h = new Date().getHours(), streak = EF.store.streak();
    if (h >= 17 && streak > 0 && !EF.store.studiedOn(new Date()) && ls.get('ef2:remindDay') !== EF.dayKey()) {
      ls.set('ef2:remindDay', EF.dayKey());
      actionToast(`${EF.img3d('fire', 28)}<span>Your <b>${streak}-day streak</b> needs you! A 5-minute review keeps it alive.</span>`, 'Review', () => { location.hash = '#/cards'; }, 12000);
    }
  }, 6000);

  /* ================= card reminders (browser notifications, when switched on) ================= */
  EF.cardReminder = () => {
    if (!prefs.cardReminders || !('Notification' in window) || Notification.permission !== 'granted') return;
    const due = EF.subjects.reduce((n, s) => n + EF.store.due(s.id).length, 0), last = +ls.get('ef2:cardNote') || 0;
    if (!due || Date.now() - last < 6 * 3600e3) return;
    ls.set('ef2:cardNote', String(Date.now()));
    const body = `${due} card${due === 1 ? ' is' : 's are'} ready to review. Keep them fresh!`;
    if (navigator.serviceWorker && navigator.serviceWorker.ready) navigator.serviceWorker.ready.then((r) => r.showNotification('Zing', { body, icon: 'assets/icons/icon-192.png', tag: 'zing-cards' })).catch(() => {});
    else { try { new Notification('Zing', { body, icon: 'assets/icons/icon-192.png' }); } catch (e) { /* */ } }
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) EF.cardReminder(); });

  /* ================= "decks are public": new sets go to your school library ================= */
  const baseSave = EF.sets && EF.sets.save;
  if (baseSave) {
    EF.sets.save = (set) => {
      const isNew = !set.id || !EF.sets.raw(set.id);
      const s = baseSave(set);
      if (isNew && prefs.decksPublic && !set.from && s && s.cards.length >= 2 && s.name !== 'Saved cards' && on()) {
        const me = EF.cloud.cachedMe();
        if (me && me.school) EF.cloud.publish(s.id).then(() => EF.toast('Shared with your school library', 'fa-school')).catch(() => {});
      }
      return s;
    };
  }

  /* start */
  paintCoins();
  setTimeout(() => { paintBell(); poll(); }, 2500);
})();
