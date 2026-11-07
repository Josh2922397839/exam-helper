/* Zing core — Live: everyone plays the same questions at the same time.
   A 6-character game code names a Supabase Realtime channel. Presence shows who is in the lobby;
   the host's device runs the game and broadcasts each step; players send back their answers.
   Right answers score 50–100 game points (faster = more). No account needed, nothing is stored. */
(function () {
  'use strict';
  const EF = window.EF;
  const esc = EF.esc, icon = EF.icon;
  const LIMIT = 20000, N = 10, REVEAL_MS = 6000, BOARD_MS = 5000, MAX_PLAYERS = 40;
  const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const QR_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
  const REACTS = ['👏', '🔥', '😂', '😮', '🙏', 'GG', 'Sorry'];
  const ss = {
    get: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };
  const cleanName = (n) => String(n || '').replace(/[^\p{L}\p{N} _.'-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 20);
  const newCode = () => Array.from(crypto.getRandomValues(new Uint32Array(6)), (x) => ALPH[x % ALPH.length]).join('');
  EF.liveCode = (c) => { const x = String(c || '').toUpperCase(); return /^[A-HJ-NP-Z2-9]{6}$/.test(x) ? x : null; };
  EF.liveNewCode = newCode;
  // the game's name (a topic, or one the host types) is shown to everyone, so keep it short and plain
  const cleanTitle = (t) => String(t || '').replace(/[^\p{L}\p{N} ,.&()'/+:!?-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 40) || null;
  const liveSubjects = () => EF.subjects.filter((s) => !s.custom && EF.questionPool(s, EF.rng(1)).length >= N);
  const gameLink = (code) => location.href.split('#')[0] + '#/live/' + code;
  // a short fingerprint of the questions, so a player with an older copy of the deck finds out before playing
  const qsHash = (list) => { let h = 2166136261; const str = list.map((q) => q.q + '\u0001' + q.options.join('\u0002') + '\u0003' + q.answer).join('\u0004'); for (let k = 0; k < str.length; k++) { h ^= str.charCodeAt(k); h = Math.imul(h, 16777619); } return h >>> 0; };
  const fmt = (ms) => (Math.max(0, ms) / 1000).toFixed(1) + 's';
  const pointsFor = (ms) => Math.max(50, Math.round((50 + 50 * (1 - ms / LIMIT)) / 5) * 5);

  /* host a new game for a subject: make a code, remember we're the host (this tab only), open the lobby */
  EF.liveHost = (sid) => {
    const code = newCode();
    ss.set('ef2:live:' + code, JSON.stringify({ host: true, sid }));
    location.hash = '#/live/' + code;
  };

  let qrLoading = null;
  const loadQR = () => qrLoading || (qrLoading = new Promise((res, rej) => {
    if (window.qrcode) return res();
    const s = document.createElement('script'); s.src = QR_LIB; s.async = true; s.crossOrigin = 'anonymous';
    s.onload = () => res(); s.onerror = () => { qrLoading = null; rej(new Error('qr')); };
    document.head.appendChild(s);
  }));

  /* ================= #/live — join with a code or host a game ================= */
  EF.mountLiveHome = (el) => {
    if (!EF.cloud.enabled) {
      el.innerHTML = `<div class="card live-off">${EF.mascot ? EF.mascot('sleep', 110) : ''}<h3>Live games are coming soon</h3><p class="muted">Live needs the online features switched on for this copy of Zing.</p></div>`;
      return () => {};
    }
    const subs = liveSubjects();
    const last = EF.store.state().last;
    el.innerHTML = `
      <form class="card live-join" data-live-join novalidate>
        <h2>${icon('fa-right-to-bracket')} Join a game</h2>
        <p class="muted">Type the 6-character code from your friend’s screen.</p>
        <div class="live-join-row"><input name="code" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABC123" aria-label="Game code"><button class="btn btn-primary" type="submit">Join ${icon('fa-arrow-right')}</button></div>
      </form>
      <section class="card live-host">
        <h2>${icon('fa-tower-broadcast')} Host a game</h2>
        <p class="muted">Pick a subject. You get a code and a QR code your friends can scan.</p>
        <div class="live-subjects">${subs.map((s) => `<button type="button" class="live-subject tint${last && last.s === s.id ? ' is-last' : ''}" style="--c:${s.color}" data-live-host="${esc(s.id)}">${EF.subjectIcon(s.id)}<span><strong>${esc(s.name)}</strong><small>Grade ${EF.gradeOf(s)}</small></span>${icon('fa-chevron-right')}</button>`).join('')}</div>
      </section>
      <p class="live-note muted">${icon('fa-circle-info')} Everyone answers the same 10 questions together. Right answers score up to 100, and faster ones score more. No account needed.</p>`;
    const onSubmit = (e) => {
      e.preventDefault();
      const code = EF.liveCode(e.target.code.value.trim());
      if (!code) { EF.toast('That code should be 6 letters and numbers', 'fa-circle-exclamation'); e.target.code.focus(); return; }
      location.hash = '#/live/' + code;
    };
    const onClick = (e) => { const b = e.target.closest('[data-live-host]'); if (b) EF.liveHost(b.dataset.liveHost); };
    el.addEventListener('submit', onSubmit); el.addEventListener('click', onClick);
    return () => { el.removeEventListener('submit', onSubmit); el.removeEventListener('click', onClick); };
  };

  /* ================= #/live/<CODE> — lobby and game ================= */
  EF.mountLive = (el, code) => {
    let info = null; try { info = JSON.parse(ss.get('ef2:live:' + code) || 'null'); } catch (e) { info = null; }
    const isHost = !!(info && info.host);
    let pid = ss.get('ef2:livePid'); if (!pid) { pid = Math.random().toString(36).slice(2, 10); ss.set('ef2:livePid', pid); }
    const cloudMe = EF.cloud.joined && EF.cloud.joined() ? EF.cloud.cachedMe() : null;
    const me = { pid, name: cleanName((cloudMe && cloudMe.username) || EF.vs.myName()), avatar: (cloudMe && cloudMe.avatar) || ss.get('ef2:liveAva') || EF.AVATARS[Math.floor(Math.random() * EF.AVATARS.length)] };
    ss.set('ef2:liveAva', me.avatar);
    let ch = null, players = {}, hostPid = isHost ? pid : null, sid = isHost ? info.sid : null;
    // a topic game (only that topic's questions), its name, and the friend who was challenged (shown faded until they join)
    let tag = isHost && typeof info.tag === 'string' ? info.tag.slice(0, 80) : null, title = isHost ? cleanTitle(info.title || info.tag) : null;
    const invited = isHost && info.invite && typeof info.invite.username === 'string' ? info.invite : null;
    let lobbyAt = 0, aloneTimer = 0;
    let phase = 'name', qs = [], i = -1, scores = {}, answers = {}, mine = null, qStart = 0, seed = 0, myRight = 0, awarded = false, solo = false, errMsg = '';
    let tick = null, auto = null, reactAt = 0, alive = true;
    const subject = () => EF.subject(sid);
    const playerList = () => Object.values(players).sort((a, b) => (b.host - a.host) || a.at - b.at);
    const hostName = () => { const h = players[hostPid]; return h ? h.name : 'the host'; };

    /* ---------- connection ---------- */
    async function connect() {
      phase = 'connecting'; render();
      let client;
      try { client = await EF.cloudClient(); } catch (e) { return fail(e.message || 'You’re offline. Live games need the internet.'); }
      if (!alive) return;
      ch = client.channel('live-' + code, { config: { broadcast: { self: false }, presence: { key: pid } } });
      ch.on('presence', { event: 'sync' }, onPresence);
      ch.on('broadcast', { event: 'g' }, ({ payload }) => onMsg(payload || {}));
      ch.subscribe(async (status) => {
        if (!alive) return;
        if (status === 'SUBSCRIBED') {
          await ch.track(trackInfo());
          if (phase === 'connecting') { phase = 'lobby'; lobbyAt = Date.now(); clearTimeout(aloneTimer); aloneTimer = setTimeout(() => { if (alive && phase === 'lobby') render(); }, 46000); render(); }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') fail('Couldn’t reach the game. Check your internet and try again.');
      });
      setTimeout(() => { if (alive && phase === 'connecting') fail('Couldn’t reach the game. Check your internet and try again.'); }, 15000);
    }
    const send = (payload) => { if (ch) ch.send({ type: 'broadcast', event: 'g', payload: Object.assign({ from: pid }, payload) }).catch(() => {}); };
    const trackInfo = () => Object.assign({ pid, name: me.name, avatar: me.avatar, host: isHost, at: me.at || (me.at = Date.now()) }, isHost ? { title, sid, tag } : {});
    function fail(msg) { errMsg = msg; phase = 'error'; render(); }

    function onPresence() {
      const before = Object.keys(players).length;
      players = {};
      const st = ch.presenceState();
      Object.keys(st).forEach((k) => {
        const m = st[k] && st[k][0];
        if (!m || typeof m.pid !== 'string' || Object.keys(players).length >= MAX_PLAYERS) return;
        players[m.pid] = { pid: m.pid.slice(0, 12), name: cleanName(m.name) || 'Player', avatar: EF.AVATARS.includes(m.avatar) ? m.avatar : 'fox', host: !!m.host, at: +m.at || 0 };
        if (m.host && !isHost) { title = cleanTitle(m.title); if (!sid && typeof m.sid === 'string' && EF.subject(m.sid)) sid = m.sid; }
      });
      if (!hostPid) { const h = Object.values(players).find((p) => p.host); if (h) hostPid = h.pid; }
      // the host left before the game started
      if (!isHost && hostPid && !players[hostPid] && phase !== 'end' && phase !== 'error' && phase !== 'name') { phase = 'gone'; render(); return; }
      // late joiners mid-game get the game sent to them
      if (isHost && Object.keys(players).length > before && qs.length && phase !== 'lobby') sendStart(true);
      if (phase === 'lobby') render();
      else paintPlayers();
    }

    /* ---------- messages ---------- */
    function onMsg(p) {
      if (typeof p.from !== 'string' || typeof p.t !== 'string') return;
      if (p.t === 'react') { if (REACTS.includes(p.e) && players[p.from]) bubble(players[p.from], p.e); return; }
      if (p.t === 'title') { if (!isHost && p.from === hostPid) { title = cleanTitle(p.title); if (phase === 'lobby') render(); } return; }
      if (p.t === 'ans') {
        if (!isHost || phase !== 'q' || p.i !== i || answers[p.from] || !players[p.from]) return;
        answers[p.from] = { c: Math.max(0, Math.min(3, p.c | 0)), ms: Math.max(0, Math.min(LIMIT, +p.ms || LIMIT)) };
        paintPlayers();
        if (Object.keys(players).every((k) => answers[k])) reveal();
        return;
      }
      // everything else comes from the host only
      if (isHost) return;
      if (!hostPid && p.t === 'start') hostPid = p.from;
      if (p.from !== hostPid) return;
      if (p.t === 'start') {
        const s = EF.subject(p.sid);
        if (!s || s.custom) return;
        if (qs.length && seed === (p.seed >>> 0) && phase !== 'end') return;
        sid = s.id; seed = p.seed >>> 0; tag = typeof p.tag === 'string' ? p.tag.slice(0, 80) : null;
        qs = EF.questionPool(s, EF.rng(seed), tag).slice(0, Math.min(N, p.n | 0 || N));
        // everyone builds the questions from the seed; a different copy of the deck would ask different ones
        if (p.h && p.h !== qsHash(qs)) { qs = []; fail('This game uses a different version of the questions. Refresh the page, then join again.'); return; }
        scores = typeof p.scores === 'object' && p.scores ? p.scores : {}; myRight = 0; awarded = false;
        i = -1; phase = p.late ? 'wait' : 'starting'; render();
      } else if (p.t === 'q') {
        if (!qs.length || (p.i | 0) >= qs.length) return;
        i = p.i | 0; answers = {}; mine = null; qStart = Date.now(); phase = 'q'; render(); startTick();
      } else if (p.t === 'reveal') {
        if ((p.i | 0) !== i) return;
        answers = sanitizeAns(p.ans); scores = p.scores || scores; phase = 'reveal'; stopTick();
        const a = answers[pid]; if (a && a.c === qs[i].answer) myRight++;
        render();
      } else if (p.t === 'board') { scores = p.scores || scores; phase = 'board'; render(); }
      else if (p.t === 'end') { scores = p.scores || scores; phase = 'end'; award(); render(); }
      else if (p.t === 'bye') { phase = 'gone'; stopTick(); render(); }
    }
    const sanitizeAns = (ans) => { const out = {}; if (ans && typeof ans === 'object') Object.keys(ans).slice(0, MAX_PLAYERS).forEach((k) => { const a = ans[k]; if (Array.isArray(a)) out[k] = { c: a[0] | 0, ms: +a[1] || 0, xp: a[2] | 0 }; }); return out; };

    /* ---------- the host runs the game ---------- */
    function sendStart(late) { send({ t: 'start', sid, seed, tag, n: qs.length, h: qsHash(qs), scores, late: !!late }); }
    function startGame(practice) {
      if (!isHost) return;
      solo = !!practice;
      if (!solo && Object.keys(players).length < 2) return;
      seed = (Math.random() * 4294967295) >>> 0;
      qs = EF.questionPool(subject(), EF.rng(seed), tag).slice(0, N);
      if (tag && qs.length < 5) { tag = null; qs = EF.questionPool(subject(), EF.rng(seed)).slice(0, N); } // too few on that topic: use the whole deck
      scores = {}; Object.keys(players).forEach((k) => { scores[k] = 0; }); scores[pid] = 0;
      myRight = 0; awarded = false;
      if (!solo) sendStart(false);
      nextQ(0);
    }
    function nextQ(k) {
      clearTimeout(auto);
      i = k; answers = {}; mine = null; qStart = Date.now(); phase = 'q';
      if (!solo) send({ t: 'q', i });
      render(); startTick();
      auto = setTimeout(reveal, LIMIT + 600);
    }
    function reveal() {
      if (!isHost || phase !== 'q') return;
      clearTimeout(auto); stopTick();
      const q = qs[i], out = {};
      Object.keys(answers).forEach((k) => {
        const a = answers[k], xp = a.c === q.answer ? pointsFor(a.ms) : 0;
        scores[k] = (scores[k] || 0) + xp;
        out[k] = [a.c, Math.round(a.ms), xp];
      });
      answers = sanitizeAns(out);
      if (answers[pid] && answers[pid].c === q.answer) myRight++;
      if (!solo) send({ t: 'reveal', i, ans: out, scores });
      phase = 'reveal'; render();
      auto = setTimeout(board, solo ? 3500 : REVEAL_MS);
    }
    function board() {
      if (!isHost) return;
      clearTimeout(auto);
      if (i + 1 >= qs.length) return finish();
      if (solo) return nextQ(i + 1);
      send({ t: 'board', i, scores });
      phase = 'board'; render();
      auto = setTimeout(() => nextQ(i + 1), BOARD_MS);
    }
    function finish() {
      clearTimeout(auto);
      if (!solo) send({ t: 'end', scores });
      phase = 'end'; award(); render();
    }
    function award() {
      if (awarded) return;
      awarded = true;
      const pts = scores[pid] || 0, xp = Math.max(1, Math.round(pts / 10));
      EF.store.addXP(xp); EF.store.touchDay();
      if (EF.daily && myRight) EF.daily.bump('correct', myRight);
      const rank = ranked().findIndex((p) => p.pid === pid);
      if (!solo && rank === 0 && pts > 0) EF.confetti();
    }

    /* ---------- answering ---------- */
    function pick(c) {
      if (phase !== 'q' || mine) return;
      const ms = Math.min(LIMIT, Date.now() - qStart);
      mine = { c, ms };
      EF.haptic('tap');
      if (isHost) {
        answers[pid] = { c, ms };
        if (Object.keys(players).every((k) => answers[k]) || solo) reveal();
        else render();
      } else { send({ t: 'ans', i, c, ms }); render(); }
    }
    function startTick() {
      stopTick();
      tick = setInterval(() => {
        const left = LIMIT - (Date.now() - qStart);
        const t = el.querySelector('[data-live-time]'), bar = el.querySelector('.live-timebar > span');
        if (t) t.textContent = fmt(left);
        if (bar) bar.style.width = Math.max(0, (left / LIMIT) * 100) + '%';
        if (left <= 0) { stopTick(); if (!mine && phase === 'q') { mine = { c: -1, ms: LIMIT }; render(); } }
      }, 100);
    }
    const stopTick = () => { clearInterval(tick); tick = null; };

    /* ---------- reactions ---------- */
    function react(e) {
      if (!REACTS.includes(e) || Date.now() - reactAt < 700) return;
      reactAt = Date.now();
      bubble(players[pid] || { name: me.name, avatar: me.avatar }, e);
      if (!solo) send({ t: 'react', e });
    }
    function bubble(p, e) {
      const host = el.querySelector('.live-bubbles'); if (!host) return;
      const b = document.createElement('div');
      b.className = 'live-bubble';
      b.innerHTML = `${EF.avatar(p.avatar, p.name, 26)}<span>${esc(e)}</span>`;
      host.appendChild(b);
      setTimeout(() => b.remove(), 2600);
      while (host.children.length > 6) host.firstChild.remove();
    }

    /* ---------- drawing ---------- */
    const ranked = () => Object.keys(Object.assign({}, scores, players)).map((k) => ({ pid: k, score: scores[k] || 0, p: players[k] || { name: 'Player', avatar: 'fox' } })).sort((a, b) => b.score - a.score);
    const medal = (r) => (r < 3 ? EF.img3d(['gold', 'silver', 'bronze'][r], 28) : `<span class="live-rank">${r + 1}</span>`);
    function head() {
      const s = subject();
      return `<header class="live-head">
        <button type="button" class="icon-btn" data-live-leave aria-label="Leave game">${icon('fa-xmark')}</button>
        ${s ? `<span class="live-chip tint" style="--c:${s.color}"><i class="dot"></i>${esc(title || s.name)}${title && title !== s.name ? `<small>${esc(s.short)}</small>` : ''}${isHost && phase === 'lobby' ? `<button type="button" class="live-rename" data-live-rename aria-label="Rename this game">${icon('fa-pen')}</button>` : ''}</span>` : '<span></span>'}
        <button type="button" class="icon-btn" data-live-invite aria-label="Invite friends">${icon('fa-arrow-up-from-bracket')}</button>
      </header>`;
    }
    const reactBar = () => `<div class="live-reacts" role="group" aria-label="Send a reaction">${REACTS.map((r) => `<button type="button" data-react="${esc(r)}">${esc(r)}</button>`).join('')}</div><div class="live-bubbles" aria-live="polite"></div>`;
    function paintPlayers() {
      const stack = el.querySelector('[data-live-answered]');
      if (stack) stack.innerHTML = Object.keys(answers).slice(0, 8).map((k) => players[k] ? EF.avatar(players[k].avatar, players[k].name, 26) : '').join('');
      const count = el.querySelector('[data-live-count]'); if (count) count.textContent = Object.keys(players).length;
    }
    function render() {
      if (!alive) return;
      const s = subject();
      if (phase === 'name') {
        el.innerHTML = `<form class="card live-name" data-live-name novalidate>
          ${EF.mascot ? EF.mascot('wave', 100) : ''}
          <h2>Joining game <span class="live-code-sm">${esc(code)}</span></h2>
          <label>What should everyone call you?<input name="n" maxlength="20" autocomplete="nickname" value="${esc(me.name)}" placeholder="Your first name"></label>
          <div class="live-avas" role="radiogroup" aria-label="Pick an avatar">${EF.AVATARS.slice(0, 8).map((a) => `<button type="button" role="radio" aria-checked="${a === me.avatar}" data-ava="${a}">${EF.avatar(a, '', 40)}</button>`).join('')}</div>
          <button class="btn btn-primary btn-lg btn-block" type="submit">${icon('fa-right-to-bracket')} Join</button>
        </form>`;
        return;
      }
      if (phase === 'connecting') { el.innerHTML = `<div class="live-loading">${EF.mascot ? EF.mascot('cheer', 120) : ''}<h2>Live loading<span class="live-dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></h2><p class="muted">${isHost ? 'Setting up your game' : 'Joining game'} <b>${esc(code)}</b></p></div>`; return; }
      if (phase === 'error') { el.innerHTML = `<div class="card live-off">${EF.mascot ? EF.mascot('think', 110) : ''}<h3>${esc(errMsg)}</h3><div class="btn-row center"><button type="button" class="btn btn-c" data-live-retry>${icon('fa-rotate-right')} Try again</button><a class="btn" href="#/live">Back</a></div></div>`; return; }
      if (phase === 'gone') { el.innerHTML = `<div class="card live-off">${EF.mascot ? EF.mascot('sad', 110) : ''}<h3>The host ended the game</h3><p class="muted">Ask them for a new code, or host your own.</p><a class="btn btn-c" href="#/live">${icon('fa-tower-broadcast')} Live games</a></div>`; return; }

      if (phase === 'lobby') {
        const list = playerList(), canStart = list.length >= 2;
        el.innerHTML = `${head()}
          <section class="card live-code-card">
            <div><span class="live-label">Game code</span><strong class="live-code">${esc(code)}</strong><span class="muted">Join at <b>${esc(location.host || 'zing')}/#/live</b></span>
              <div class="btn-row"><button type="button" class="btn" data-live-copy>${icon('fa-link')} Copy link</button>${isHost && EF.cloud.joined && EF.cloud.joined() ? `<button type="button" class="btn btn-primary" data-live-challenge>${icon('fa-user-plus')} Invite friends</button>` : `<button type="button" class="btn" data-live-invite>${icon('fa-user-plus')} Invite</button>`}</div></div>
            <div class="live-qr" data-live-qr aria-label="QR code to join"></div>
          </section>
          ${isHost && !canStart ? (Date.now() - lobbyAt > 45000
            ? `<section class="card live-alone is-long"><span class="live-alone-ic">${icon('fa-user-clock')}</span><div><strong>Couldn’t find a match yet…</strong><span>Invite more friends, or practice while you wait.</span></div><div class="btn-row"><button type="button" class="btn btn-sm btn-primary" data-live-challenge>${icon('fa-user-plus')} Invite friends</button><button type="button" class="btn btn-sm" data-live-practice>${icon('fa-play')} Practice</button></div></section>`
            : `<section class="card live-alone"><span class="live-alone-ic">${icon('fa-clock')}</span><div><strong>${invited ? `Waiting for ${esc(String(invited.name || invited.username).split(' ')[0])}…` : 'Waiting for friends…'}</strong><span>Practice while you wait for friends. The game starts when someone joins.</span></div><button type="button" class="btn btn-sm" data-live-practice>${icon('fa-play')} Practice</button></section>`) : ''}
          <h3 class="live-players-h"><span data-live-count>${list.length}</span> player${list.length === 1 ? '' : 's'}</h3>
          <div class="live-players">
            <button type="button" class="live-player live-add" data-live-invite><span class="live-plus">${icon('fa-plus')}</span><span class="nm">Add player</span></button>
            ${list.map((p) => `<div class="live-player">${EF.avatar(p.avatar, p.name, 64)}<span class="nm">${esc(p.name)}${p.pid === pid ? ' (you)' : ''}</span>${p.host ? '<small>Host</small>' : ''}</div>`).join('')}
            ${invited && !list.some((p) => p.name.toLowerCase() === cleanName(invited.username).toLowerCase()) ? `<div class="live-player is-invited">${EF.avatar(invited.avatar, invited.username, 64)}<span class="nm">${esc(invited.name || invited.username)}</span><small>Invited</small></div>` : ''}
          </div>
          <div class="live-foot">${isHost
            ? `<button type="button" class="btn btn-primary btn-lg btn-block" data-live-start ${canStart ? '' : 'disabled'}>${canStart ? `${icon('fa-play')} Start game` : 'Add an opponent to play'}</button>`
            : `<p class="live-waiting">${icon('fa-hourglass-half')} Waiting for ${esc(hostName())} to start…</p>`}</div>
          ${reactBar()}`;
        drawQR();
        return;
      }
      if (phase === 'starting' || phase === 'wait') {
        el.innerHTML = `${head()}<div class="live-wait">${icon('fa-spinner', 'fa-spin')} ${phase === 'wait' ? 'Game in progress: you’ll join from the next question…' : 'Get ready…'}</div>${reactBar()}`;
        return;
      }
      if (phase === 'q' || phase === 'reveal') {
        const q = qs[i], rev = phase === 'reveal';
        const left = LIMIT - (Date.now() - qStart);
        const a = answers[pid] || (mine && mine.c >= 0 ? mine : null);
        const ok = rev && a && a.c === q.answer, xp = rev && a ? (a.xp || 0) : 0;
        const pickedBy = (k) => Object.keys(answers).filter((pp) => answers[pp].c === k && players[pp]);
        el.innerHTML = `${head()}
          ${rev ? `<p class="live-status">${icon('fa-circle', 'live-dot')} ${isHost && !solo ? 'Tap Next when everyone’s ready' : isHost ? 'Next question coming…' : `Waiting for ${esc(hostName())}…`}</p>`
            : `<div class="live-top"><span class="live-time">${icon('fa-stopwatch')} <b data-live-time>${fmt(left)}</b></span><span class="live-timebar"><span style="width:${Math.max(0, (left / LIMIT) * 100)}%"></span></span><span class="live-answered" data-live-answered></span></div>`}
          <section class="live-q${rev ? (ok ? ' is-ok' : ' is-bad') : ''}"><span class="live-qn">${icon('fa-seedling')} Question ${i + 1} <small>of ${qs.length}</small></span><h3>${q.q}</h3></section>
          <div class="live-opts">${q.options.map((o, k) => {
            const cls = rev ? (k === q.answer ? ' is-right' : a && a.c === k ? ' is-wrong' : ' is-dim') : mine && mine.c === k ? ' is-picked' : '';
            return `<button type="button" class="live-opt${cls}" data-lopt="${k}" ${rev || mine ? 'disabled' : ''}><span>${o}</span>${rev ? `<span class="live-who">${pickedBy(k).slice(0, 6).map((pp) => EF.avatar(players[pp].avatar, players[pp].name, 24)).join('')}</span>` : ''}</button>`;
          }).join('')}</div>
          ${rev ? `<div class="live-result ${ok ? 'is-ok' : 'is-bad'}"><strong>${ok ? 'Correct answer!' : a ? 'Incorrect answer!' : 'Time’s up!'}</strong>${a ? `<span>${icon('fa-stopwatch')} ${fmt(a.ms)}</span>` : ''}<span class="live-xp">+${xp} XP</span></div>
              ${isHost ? `<button type="button" class="btn btn-primary btn-lg btn-block" data-live-next>Next ${icon('fa-arrow-right')}</button>` : ''}`
            : mine ? `<p class="live-waiting">${mine.c >= 0 ? `${icon('fa-lock')} Locked in. Waiting for the others…` : `${icon('fa-hourglass-end')} Time’s up…`}</p>` : ''}
          ${solo ? '' : reactBar()}`;
        paintPlayers();
        return;
      }
      if (phase === 'board' || phase === 'end') {
        const r = ranked(), end = phase === 'end';
        const myPts = scores[pid] || 0;
        el.innerHTML = `${head()}
          <section class="live-board">
            <h2 class="live-board-h">${end ? 'Final results' : 'Leaderboard'}</h2>
            <p class="muted">${end ? `${qs.length} questions · ${s ? esc(s.short) : ''}` : `Question ${i + 1} of ${qs.length}`}</p>
            ${end && r.length >= 2 && !solo ? `<div class="live-podium">${[1, 0, 2].filter((k) => r[k]).map((k) => `<div class="pod pod-${k + 1}">${EF.avatar(r[k].p.avatar, r[k].p.name, k === 0 ? 72 : 56)}<strong>${esc(r[k].p.name)}</strong><span>${r[k].score} XP</span><i>${k + 1}</i></div>`).join('')}</div>` : ''}
            <ol class="card live-rows">${r.map((x, k) => `<li class="${x.pid === pid ? 'is-me' : ''}">${medal(k)}${EF.avatar(x.p.avatar, x.p.name, 36)}<span class="nm">${esc(x.p.name)}${x.pid === pid ? ' (you)' : ''}</span><b class="${x.score ? 'is-pos' : ''}">${x.score} XP</b></li>`).join('')}</ol>
            ${end ? `<p class="live-earned">${icon('fa-star')} +${Math.max(1, Math.round(myPts / 10))} XP added to your total · ${myRight}/${qs.length} right</p>` : ''}
          </section>
          <div class="live-foot">${end
            ? `${isHost ? `<button type="button" class="btn btn-primary btn-lg btn-block" data-live-again>${icon('fa-rotate-right')} Play again</button>` : `<p class="live-waiting">${icon('fa-hourglass-half')} ${esc(hostName())} can start another round</p>`}<a class="btn btn-block" href="#/live">Leave</a>`
            : isHost ? `<button type="button" class="btn btn-primary btn-lg btn-block" data-live-next>Next ${icon('fa-arrow-right')}</button>` : `<p class="live-waiting">${icon('fa-hourglass-half')} Next question soon…</p>`}</div>
          ${solo ? '' : reactBar()}`;
      }
    }
    async function drawQR() {
      const box = el.querySelector('[data-live-qr]'); if (!box) return;
      try {
        await loadQR();
        const qr = window.qrcode(0, 'M'); qr.addData(gameLink(code)); qr.make();
        if (box.isConnected) box.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
      } catch (e) { box.hidden = true; }
    }
    function invite() {
      const s = subject(), url = gameLink(code);
      const text = `Join my Zing Live game${s ? ' on ' + s.name : ''}! Code ${code}`;
      if (navigator.share) navigator.share({ title: 'Zing Live', text, url }).catch(() => {});
      else if (navigator.clipboard) navigator.clipboard.writeText(text + ' ' + url).then(() => EF.toast('Invite copied: paste it to your friends', 'fa-link')).catch(() => window.prompt('Copy this link:', url));
      else window.prompt('Copy this link:', url);
    }

    /* ---------- events ---------- */
    const onClick = (e) => {
      const t = e.target.closest('button, a'); if (!t || !el.contains(t)) return;
      if (t.dataset.lopt != null) return pick(+t.dataset.lopt);
      if (t.dataset.react) return react(t.dataset.react);
      if (t.dataset.ava) { me.avatar = t.dataset.ava; ss.set('ef2:liveAva', me.avatar); el.querySelectorAll('[data-ava]').forEach((b) => b.setAttribute('aria-checked', b.dataset.ava === me.avatar)); return; }
      if (t.hasAttribute('data-live-start')) return startGame(false);
      if (t.hasAttribute('data-live-practice')) return startGame(true);
      if (t.hasAttribute('data-live-rename')) {
        const v = window.prompt('Name this game (everyone sees it)', title || (subject() || {}).name || '');
        if (v == null) return;
        title = cleanTitle(v); send({ t: 'title', title }); if (ch) ch.track(trackInfo()).catch(() => {}); render(); return;
      }
      if (t.hasAttribute('data-live-challenge')) {
        EF.pickFriends({ title: 'Invite friends to this game', multi: true, cta: 'Send invites' }).then(async (friends) => {
          let n = 0;
          for (const f of friends) { try { await EF.cloud.challenge(f.username, code, sid, tag); n++; } catch (er) { EF.toast(`${f.name || f.username}: ${er.message}`, 'fa-circle-exclamation'); } }
          if (n) EF.toast(`Invite${n === 1 ? '' : 's'} sent to ${n} friend${n === 1 ? '' : 's'}!`, 'fa-paper-plane');
        });
        return;
      }
      if (t.hasAttribute('data-live-again')) return startGame(solo || Object.keys(players).length < 2);
      if (t.hasAttribute('data-live-next')) { if (phase === 'reveal') board(); else if (phase === 'board') nextQ(i + 1); return; }
      if (t.hasAttribute('data-live-copy')) { if (navigator.clipboard) navigator.clipboard.writeText(gameLink(code)).then(() => EF.toast('Link copied', 'fa-link')).catch(() => {}); else window.prompt('Copy this link:', gameLink(code)); return; }
      if (t.hasAttribute('data-live-invite')) return invite();
      if (t.hasAttribute('data-live-retry')) return connect();
      if (t.hasAttribute('data-live-leave')) { location.hash = '#/live'; }
    };
    const onSubmit = (e) => {
      if (!e.target.matches('[data-live-name]')) return;
      e.preventDefault();
      const n = cleanName(e.target.n.value);
      if (!n) { EF.toast('Type a name first', 'fa-circle-exclamation'); e.target.n.focus(); return; }
      me.name = n;
      try { if (!(EF.cloud.joined && EF.cloud.joined())) localStorage.setItem('ef2:nick', n); } catch (er) { /* */ }
      connect();
    };
    const onKey = (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (phase === 'q' && /^[1-4]$/.test(e.key)) { e.preventDefault(); pick(+e.key - 1); }
    };
    el.addEventListener('click', onClick); el.addEventListener('submit', onSubmit); document.addEventListener('keydown', onKey);

    if (!EF.cloud.enabled) fail('Live games need the online features switched on.');
    else if (isHost && !subject()) fail('That game’s subject wasn’t found.');
    else if (me.name) connect();
    else render();

    return () => {
      alive = false; stopTick(); clearTimeout(auto); clearTimeout(aloneTimer);
      if (ch) { if (isHost) send({ t: 'bye' }); const c = ch; ch = null; setTimeout(() => { try { c.unsubscribe(); } catch (e) { /* */ } }, 150); }
      el.removeEventListener('click', onClick); el.removeEventListener('submit', onSubmit); document.removeEventListener('keydown', onKey);
    };
  };
})();
