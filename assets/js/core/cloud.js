/* Zing cloud: leagues, schools, friends, cloud saves and school libraries (Supabase).
   Everything here is optional. With no keys in assets/js/config.js the site works exactly as before, fully offline.
   The browser only ever calls the ef_* database functions (see supabase/schema.sql); it can't touch tables directly.
   Text from other students (names, schools, sets) is always escaped before it's shown. */
(function () {
  'use strict';
  const EF = window.EF;
  const esc = EF.esc, icon = EF.icon;
  const cfg = window.EF_CONFIG || {};
  const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js';
  const JOINED = 'ef2:cloud', XPQ = 'ef2:xpq', PUB = 'ef2:published', LISTED = 'ef2:listed', SEEN = 'ef2:lastResultSeen', RESTORE = 'ef2:restore-pending';
  const readMap = (k) => { try { const m = JSON.parse(EF.ls.get(k) || '{}'); return m && typeof m === 'object' && !Array.isArray(m) ? m : {}; } catch (e) { return {}; } };
  const pubMap = () => readMap(PUB), listedMap = () => readMap(LISTED);
  const enabled = !!(cfg.supabaseUrl && cfg.supabaseKey);

  // Nine weekly leagues: the top 20% move up every Monday, the bottom 20% move down
  const LEAGUES = [
    ['Spark', '#9ca3af'], ['Ember', '#b45309'], ['Flame', '#f97316'], ['Blaze', '#ef4444'], ['Torch', '#eab308'],
    ['Forge', '#14b8a6'], ['Inferno', '#8b5cf6'], ['Phoenix', '#ec4899'], ['Supernova', '#38bdf8']
  ];
  const PARISHES = ['Kingston', 'St. Andrew', 'St. Catherine', 'Clarendon', 'Manchester', 'St. Elizabeth', 'Westmoreland', 'Hanover', 'St. James', 'Trelawny', 'St. Ann', 'St. Mary', 'Portland', 'St. Thomas'];
  const SP_GROUPS = [['high', 'High schools'], ['primary', 'Primary & prep'], ['tertiary', 'College & uni'], ['', 'All']];
  const KIND_LABEL = { 'Secondary High': 'High school', 'Kindergarten & Preparatory': 'Prep school', 'Preparatory': 'Prep school', 'Preparatory & Secondary High': 'Prep & high school', 'Primary': 'Primary school', 'All Age': 'All-age school', 'Special': 'Special school' };
  const kindLabel = (k) => (!k || /^(school|kindergarten)$/i.test(k) ? '' : KIND_LABEL[k] || k.charAt(0).toUpperCase() + k.slice(1));
  const COUNTRIES = [['JM', 'Jamaica'], ['TT', 'Trinidad & Tobago'], ['BB', 'Barbados'], ['BS', 'Bahamas'], ['GY', 'Guyana'], ['BZ', 'Belize'], ['KY', 'Cayman Islands'], ['LC', 'Saint Lucia'], ['GD', 'Grenada'], ['VC', 'St Vincent & the Grenadines'], ['AG', 'Antigua & Barbuda'], ['DM', 'Dominica'], ['KN', 'St Kitts & Nevis'], ['TC', 'Turks & Caicos'], ['US', 'United States'], ['CA', 'Canada'], ['GB', 'United Kingdom']];

  let client = null, loading = null, me = null;
  const ls = EF.ls;
  const joined = () => enabled && ls.get(JOINED) === '1';

  function load() {
    if (!enabled) return Promise.reject(new Error('Leagues aren’t switched on yet.'));
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      if (window.supabase && window.supabase.createClient) return resolve();
      const s = document.createElement('script');
      s.src = LIB; s.async = true; s.crossOrigin = 'anonymous';
      s.onload = () => resolve(); s.onerror = () => { loading = null; reject(new Error('You’re offline. Leagues need the internet.')); };
      document.head.appendChild(s);
    }).then(() => {
      client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'ef2-auth', flowType: 'pkce', detectSessionInUrl: false } });
      return client;
    });
    return loading;
  }
  EF.cloudClient = () => load();
  async function rpc(fn, args) {
    const c = await load();
    const { data, error } = await c.rpc(fn, args || {});
    if (error) throw new Error(error.message || 'Something went wrong. Try again.');
    if (data && typeof data === 'object' && !Array.isArray(data) && data.error) throw new Error(data.error);
    return data;
  }
  async function ensureUser() {
    const c = await load();
    const { data } = await c.auth.getSession();
    if (data && data.session) return data.session;
    const res = await c.auth.signInAnonymously();
    if (res.error) throw new Error(res.error.message || 'Couldn’t sign in. Try again.');
    return res.data.session;
  }

  /* ---------------- XP: batched up and sent every few seconds ---------------- */
  let xpTimer = 0, flushing = false;
  const pendingXP = () => +ls.get(XPQ) || 0;
  async function flushXP() {
    clearTimeout(xpTimer); xpTimer = 0;
    if (!joined() || flushing || !navigator.onLine) return;
    const n = Math.min(400, pendingXP());
    if (!n) return;
    flushing = true;
    try {
      const r = await rpc('ef_add_xp', { p_n: n });
      ls.set(XPQ, String(Math.max(0, pendingXP() - n)));
      if (me && r) { me.xp_week = r.xp_week; me.xp_total = r.xp_total; me.league = r.league; }
      EF.emit('cloud', { kind: 'xp' });
      if (pendingXP()) xpTimer = setTimeout(flushXP, 1500);
    } catch (e) { /* keep it queued; try again later */ }
    flushing = false;
  }
  EF.on('xp', (d) => {
    if (!joined() || !d || !(d.n > 0)) return;
    ls.set(XPQ, String(pendingXP() + d.n));
    if (!xpTimer) xpTimer = setTimeout(flushXP, 4000);
    saveSoon();
  });
  window.addEventListener('online', () => { flushXP(); });
  window.addEventListener('pagehide', () => { flushXP(); });

  /* ---------------- cloud save: your progress follows your account ---------------- */
  let saveTimer = 0;
  function saveSoon() { if (!joined()) return; clearTimeout(saveTimer); saveTimer = setTimeout(pushSave, 20000); }
  async function pushSave() {
    clearTimeout(saveTimer);
    if (!joined() || ls.get(RESTORE)) return;
    try { await rpc('ef_save_put', { p_data: { v: 1, at: Date.now(), state: EF.store.state(), sets: EF.sets.backup ? EF.sets.backup() : EF.sets.list() } }); } catch (e) { /* next time */ }
  }
  EF.on('progress', saveSoon);
  EF.on('sets', saveSoon);
  async function pullSave() {
    const data = await rpc('ef_save_get');
    if (data && data.state) EF.store.merge(data.state);
    if (data && Array.isArray(data.sets)) EF.sets.mergeIn(data.sets);
  }

  /* ---------------- schools ---------------- */
  // OpenStreetMap search runs from the student's own browser via the Overpass API (© OpenStreetMap contributors, ODbL)
  async function searchMap(q, country) {
    const pat = String(q).trim().replace(/[^\p{L}\p{N}\s-]/gu, '.').replace(/\s+/g, ' ');
    if (pat.replace(/[.\s]/g, '').length < 3) return [];
    const ql = `[out:json][timeout:25];area["ISO3166-1"="${country}"][admin_level=2]->.a;(nwr["amenity"~"^(school|college|university)$"]["name"~"${pat}",i](area.a););out center tags 40;`;
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 30000);
    try {
      const res = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(ql), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: ctl.signal });
      if (!res.ok) throw new Error('map');
      const j = await res.json();
      const seen = new Set();
      return (j.elements || []).filter((e) => e.tags && e.tags.name).map((e) => ({
        name: e.tags.name.slice(0, 120), osm: e.type + '/' + e.id,
        region: (e.tags['addr:city'] || e.tags['addr:district'] || e.tags['addr:parish'] || e.tags['is_in'] || '').slice(0, 80),
        kind: (e.tags['isced:level'] ? 'ISCED ' + e.tags['isced:level'] : e.tags.amenity || '').slice(0, 40),
        lat: e.lat != null ? e.lat : e.center && e.center.lat, lon: e.lon != null ? e.lon : e.center && e.center.lon
      })).filter((s) => { const k = s.name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
    } catch (e) { throw new Error('The world map search didn’t answer. Try again, or add your school yourself.'); }
    finally { clearTimeout(to); }
  }

  EF.cloud = {
    enabled, joined, LEAGUES, COUNTRIES,
    league: (n) => LEAGUES[Math.max(1, Math.min(9, n || 1)) - 1],
    async me(force) {
      if (!joined()) return null;
      if (me && !force) return me;
      me = await rpc('ef_me');
      if (!me) { ls.del(JOINED); EF.emit('cloud', { kind: 'left' }); }
      return me;
    },
    cachedMe: () => me,
    async restoreAuth() {
      ls.set(RESTORE, '1');
      me = await rpc('ef_me');
      if (me) {
        ls.set(JOINED, '1');
        ls.set(RESTORE, '1');
        try { await pullSave(); ls.del(RESTORE); } catch (error) { /* Keep the remote backup safe until a later retry. */ }
        EF.emit('cloud', { kind: 'joined' });
      } else { ls.del(JOINED); ls.del(RESTORE); EF.emit('cloud', { kind: 'left' }); }
      return me;
    },
    restoreWarning: () => ls.get(RESTORE) ? 'Your cloud progress could not be downloaded yet. Reload when you are online to try again; your cloud backup is safe.' : '',
    restorePending: () => !!ls.get(RESTORE),
    usernameFree: (n) => rpc('ef_username_free', { p_username: n }),
    async join({ username, schoolId, grade, avatar }) {
      if (ls.get(RESTORE)) throw new Error('Your account is still being restored. Reload when you are online before changing your profile.');
      await ensureUser();
      me = await rpc('ef_save_profile', { p_username: username, p_school: schoolId || null, p_grade: grade || null, p_avatar: avatar || null });
      ls.set(JOINED, '1'); ls.set(XPQ, '0');
      pushSave();
      EF.emit('cloud', { kind: 'joined' });
      return me;
    },
    async updateProfile({ username, schoolId, grade, avatar }) {
      me = await rpc('ef_save_profile', { p_username: username, p_school: schoolId || null, p_grade: grade || null, p_avatar: avatar || null });
      EF.emit('cloud', { kind: 'profile' });
      return me;
    },
    searchSchools: (q, country) => rpc('ef_search_schools', { p_q: q, p_country: country || null }),
    browseSchools: (country, region, group, offset) => rpc('ef_browse_schools', { p_country: country || 'JM', p_region: region || null, p_group: group || null, p_offset: offset || 0 }),
    searchMap,
    async addSchool(s) { await ensureUser(); return rpc('ef_add_school', { p_name: s.name, p_country: s.country || 'JM', p_region: s.region || null, p_kind: s.kind || null, p_osm: s.osm || null, p_lat: s.lat == null ? null : s.lat, p_lon: s.lon == null ? null : s.lon }); },
    leagueBoard: () => rpc('ef_league_board'),
    schoolBoard: (id, period) => rpc('ef_school_board', { p_school: +id, p_period: period || 'week' }),
    profile: (name) => rpc('ef_profile', { p_username: name }),
    schoolsBoard: (country) => rpc('ef_schools_board', { p_country: country || null }),
    friendsBoard: () => rpc('ef_friends_board'),
    follow: (name) => rpc('ef_follow', { p_username: name }),
    unfollow: (name) => rpc('ef_unfollow', { p_username: name }),
    transferCode: () => rpc('ef_transfer_code'),
    async claim(code) {
      await ensureUser();
      me = await rpc('ef_claim', { p_code: code });
      ls.del(RESTORE);
      ls.set(JOINED, '1'); ls.set(XPQ, '0');
      try { await pullSave(); } catch (e) { /* no save yet */ }
      pushSave();
      EF.emit('cloud', { kind: 'joined' });
      return me;
    },
    async signOut() {
      await flushXP(); await pushSave();
      try { const c = await load(); await c.auth.signOut(); } catch (e) { /* offline: still forget it here */ }
      ls.del(JOINED); ls.del(RESTORE); ls.del('ef2:onboarded'); me = null;
      EF.emit('cloud', { kind: 'left' });
      if (EF.onboarding) setTimeout(() => EF.onboarding.start(), 400);
    },
    async deleteMe() {
      await rpc('ef_delete_me');
      try { const c = await load(); await c.auth.signOut(); } catch (e) { /* ignore */ }
      ls.del(JOINED); ls.del(PUB); ls.del(LISTED); ls.del(RESTORE); ls.del('ef2:onboarded'); me = null;
      EF.emit('cloud', { kind: 'left' });
      if (EF.onboarding) setTimeout(() => EF.onboarding.start(), 400);
    },
    schoolSets: (id) => rpc('ef_school_sets', { p_school: +id }),
    getShared: (id) => rpc('ef_set_get', { p_id: id }),
    async saveShared(id) {
      const s = await rpc('ef_set_get', { p_id: id });
      if (!s) throw new Error('That deck was removed.');
      const local = EF.sets.list().find((x) => x.from === id) || EF.sets.save({ name: s.name, color: s.color, cards: s.cards, from: id });
      if (joined()) rpc('ef_set_saved', { p_id: id }).catch(() => {});
      return local;
    },
    published: (localId) => pubMap()[localId] || null,
    // which of your decks a shared link belongs to
    localFor: (cloudId) => { const m = pubMap(); return Object.keys(m).find((k) => m[k] === cloudId && EF.sets.raw(k)) || null; },
    listed: (localId) => !!listedMap()[localId],
    // share a deck by link (listed: also in your school's library). Sharing again updates the same link.
    async shareDeck(localId, listed) {
      const set = EF.sets.raw(localId);
      if (!set) throw new Error('Deck not found.');
      if (!set.cards.length) throw new Error('Add some cards first.');
      const r = await rpc('ef_deck_share', { p_id: EF.cloud.published(localId), p_name: set.name, p_color: set.color, p_cards: set.cards, p_listed: !!listed });
      const map = pubMap(); map[localId] = r.id; ls.set(PUB, JSON.stringify(map));
      const lm = listedMap(); if (listed) lm[localId] = 1; else delete lm[localId]; ls.set(LISTED, JSON.stringify(lm));
      return Object.assign({ url: location.origin + location.pathname + '#/shared/' + r.id }, r);
    },
    async publish(localId) { const r = await EF.cloud.shareDeck(localId, true); return r; },
    async unpublish(localId) {
      const id = EF.cloud.published(localId);
      if (id) await rpc('ef_set_delete', { p_id: id });
      const map = pubMap(); delete map[localId]; ls.set(PUB, JSON.stringify(map));
      const lm = listedMap(); delete lm[localId]; ls.set(LISTED, JSON.stringify(lm));
    },
    deckBoard: (cloudId) => rpc('ef_deck_board', { p_id: cloudId }),
    deckXp: (cloudId, n) => rpc('ef_deck_xp', { p_id: cloudId, p_xp: n }),
    // the signed-in account (guest or not, email confirmed or not), for Magic import's AI
    async sessionUser() { if (!enabled) return null; try { const c = await load(); const { data } = await c.auth.getSession(); return data && data.session ? data.session.user : null; } catch (e) { return null; } },
    // Zing AI (the zing-ai Edge Function). Errors carry a code: not_eligible, quota_exceeded, ai_daily_limit, …
    async ai(body, fn) {
      const c = await load();
      let res;
      try { res = await c.functions.invoke(fn || 'zing-ai', { body }); } catch (e) { const er = new Error('offline'); er.code = 'offline'; throw er; }
      if (!res.error) return res.data;
      let j = null;
      try { const ctx = res.error.context; j = ctx && typeof ctx.json === 'function' ? await ctx.json() : null; } catch (e) { j = null; }
      const code = (j && typeof j.error === 'string' && j.error) || (res.error.name === 'FunctionsFetchError' || res.error.name === 'FunctionsRelayError' ? 'offline' : 'ai_unavailable');
      const er = new Error(code); er.code = code; er.status = res.error.context && res.error.context.status; er.data = j;
      throw er;
    },
    flushXP, pushSave
  };

  /* ---------------- v6: onboarding, friends, Live challenges, the Social page, study groups ---------------- */
  Object.assign(EF.cloud, {
    // a private guest account (no email or password); onboarding turns it into a profile
    async guest() { await ensureUser(); return true; },
    async hasSession() { if (!enabled) return false; try { const c = await load(); const { data } = await c.auth.getSession(); return !!(data && data.session); } catch (e) { return false; } },
    async onboard(p) {
      if (ls.get(RESTORE)) throw new Error('Your account is still being restored. Reload when you are online, then try again.');
      await ensureUser();
      const was = joined();
      me = await rpc('ef_onboard', { p });
      ls.set(JOINED, '1');
      if (!was) ls.set(XPQ, '0');
      pushSave();
      EF.emit('cloud', { kind: was ? 'profile' : 'joined' });
      return me;
    },
    async setPrefs(p) { me = await rpc('ef_set_prefs', { p }); EF.emit('cloud', { kind: 'profile' }); return me; },
    suggest: (q, schoolOnly) => rpc('ef_suggest', { p_q: q || null, p_school_only: !!schoolOnly }),
    followMany: (names) => rpc('ef_follow_many', { p_usernames: names }),
    challenge: (username, code, sid, topic) => rpc('ef_challenge', { p_username: username, p_code: code, p_subject: sid, p_topic: topic || null }),
    challenges: () => rpc('ef_challenges'),
    answerChallenge: (id, status) => rpc('ef_challenge_answer', { p_id: id, p_status: status }),
    social: () => rpc('ef_social'),
    inbox: () => rpc('ef_inbox'),
    inboxSeen: () => rpc('ef_inbox_seen'),
    groups: () => rpc('ef_groups'),
    groupCreate: (name, users) => rpc('ef_group_create', { p_name: name, p_usernames: users || [] }),
    group: (id, after) => rpc('ef_group_get', { p_id: id, p_after: after || 0 }),
    groupSend: (id, kind, body) => rpc('ef_group_send', { p_id: id, p_kind: kind, p_body: body }),
    groupAdd: (id, username) => rpc('ef_group_add', { p_id: id, p_username: username }),
    groupLeave: (id) => rpc('ef_group_leave', { p_id: id })
  });

  const paintFooter = () => { const n = document.querySelector('.footer-note'); if (n) n.textContent = joined() ? 'Your progress is saved on this device and backed up to your league account.' : 'Your progress is saved on this device.'; };
  EF.on('cloud', paintFooter);
  paintFooter();

  // On startup: if this device has joined, make sure the session is alive and send any XP earned offline
  if (joined()) setTimeout(async () => {
    if (EF.accountAuth) await EF.accountAuth.ready;
    EF.cloud.me(true).then(async () => {
      if (ls.get(RESTORE)) { await pullSave(); ls.del(RESTORE); }
      flushXP(); EF.emit('cloud', { kind: 'ready' });
    }).catch(() => {});
  }, 1200);

  /* ================================================================= UI ================================================================= */
  const countdown = (iso) => {
    const ms = new Date(iso) - Date.now();
    if (!(ms > 0)) return 'ending now';
    const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4);
    return d ? `${d}d ${h}h left` : h ? `${h}h ${m}m left` : `${m}m left`;
  };
  const badge = (n, size) => { const [name, col] = EF.cloud.league(n); return `<span class="league-badge${size ? ' is-' + size : ''}" style="--lc:${col}" title="${name} League" role="img" aria-label="${name} League"><i class="fa-solid fa-fire" aria-hidden="true"></i><b aria-hidden="true">${n}</b></span>`; };
  const loadingRows = (n) => `<div class="lb-loading">${Array.from({ length: n || 5 }, () => '<span></span>').join('')}</div>`;
  const errBox = (e) => `<div class="cloud-msg is-err">${icon('fa-triangle-exclamation')} ${esc(e.message || String(e))}</div>`;
  const offBox = () => `<div class="cloud-off card">${EF.mascot ? EF.mascot('sleep', 120) : `<span class="cloud-off-ic">${icon('fa-trophy')}</span>`}<h2>Leagues are coming soon</h2><p class="muted">School leagues, friends and cloud saves aren’t switched on for this copy of Zing yet. Everything else works offline.</p></div>`;
  const fmtXP = (n) => { n = +n || 0; return n >= 10000 ? Math.round(n / 1000) + 'k' : n >= 1000 ? Math.round(n / 100) / 10 + 'k' : String(n); };
  const medal = (rank) => (rank <= 3 ? `<span class="lb-medal">${EF.img3d(['gold', 'silver', 'bronze'][rank - 1], 32, 'Rank ' + rank)}</span>` : `<span class="lb-num">${rank}</span>`);
  const row = (r, extra) => `<li class="lb-row${r.me ? ' is-me' : ''}${extra || ''}">${medal(r.rank)}${r.me && EF.myAvatar ? EF.myAvatar(me, 40) : EF.avatar(r.avatar, r.username, 40)}<a class="lb-name" href="#/u/${encodeURIComponent(r.username)}"><strong>${r.me ? 'You' : esc(r.name || r.username)}</strong>${r.school ? `<small>${esc(r.school)}</small>` : r.name || r.grade ? `<small>${[r.name && !r.me ? '@' + esc(r.username) : '', r.grade ? 'Grade ' + esc(r.grade) : ''].filter(Boolean).join(' · ')}</small>` : ''}</a>${r.friend ? `<span class="lb-friend" title="Friend">${icon('fa-user-check')}</span>` : ''}${r.league ? badge(r.league, 'xs') : ''}<span class="xp-pill${r.xp ? '' : ' is-zero'}">${fmtXP(r.xp)} XP</span></li>`;
  const schoolRow = (s, mine) => `<li class="lb-row is-link${mine ? ' is-me' : ''}"><a href="#/school/${s.id}">${medal(s.rank)}${EF.schoolMark(s, 38)}<span class="lb-name"><strong>${esc(s.name)}</strong><small>${s.members} student${s.members === 1 ? '' : 's'}${s.region ? ' · ' + esc(s.region) : ''}</small></span><span class="xp-pill${+s.xp ? '' : ' is-zero'}">${fmtXP(s.xp)} XP</span></a></li>`;

  function lastResultBanner(p) {
    const lr = p && p.last_result;
    if (!lr || !lr.week || ls.get(SEEN) === String(lr.week)) return '';
    const moved = p.league - (lr.from || p.league);
    const [name] = EF.cloud.league(p.league);
    const msg = moved > 0 ? `You moved up to <strong>${name} League</strong>! 🔥` : moved < 0 ? `You dropped to <strong>${name} League</strong>. You’ve got this week 💪` : `You stayed in <strong>${name} League</strong>.`;
    return `<div class="league-result ${moved > 0 ? 'is-up' : moved < 0 ? 'is-down' : ''}" data-week="${esc(lr.week)}">${icon(moved > 0 ? 'fa-arrow-trend-up' : moved < 0 ? 'fa-arrow-trend-down' : 'fa-equals')}<span>Last week${lr.rank ? ` you finished <strong>#${lr.rank}</strong> of ${lr.of}` : ' you didn’t earn XP'}. ${msg}</span><button type="button" class="icon-btn" data-dismiss-result aria-label="Dismiss">${icon('fa-xmark')}</button></div>`;
  }

  /* ---------------- #/league ---------------- */
  EF.mountLeague = (el) => {
    let tab = ls.get('ef2:leagueTab') || 'league', alive = true, country = ls.get('ef2:country') || 'JM', ticker = 0;
    const set = (h) => { if (alive) el.innerHTML = h; };
    if (!enabled) { set(offBox()); return () => {}; }
    async function render() {
      if (!joined()) {
        set(`<section class="league-hero card"><span class="league-hero-art">${badge(3, 'xl')}</span><div><h2>Compete with your school</h2><p>Join with a nickname and your school. Everything you study earns XP. Every Monday the top players in each of the <strong>9 leagues</strong> move up. Your school climbs the ranking too.</p><div class="btn-row"><a class="btn btn-primary" href="#/join">${icon('fa-user-plus')} Join the league</a><a class="btn" href="#/join/code">${icon('fa-key')} I have a transfer code</a></div></div></section>
          <section class="home-section"><div class="section-head"><h2>Top schools this week</h2>${countrySel()}</div><div data-board>${loadingRows(6)}</div></section>`);
        loadSchools();
        return;
      }
      let p;
      try { p = await EF.cloud.me(true); } catch (e) { set(errBox(e)); return; }
      if (!p) { render(); return; }
      const [name, col] = EF.cloud.league(p.league);
      set(`${lastResultBanner(p)}
        <section class="league-head card" style="--lc:${col}">
          ${badge(p.league, 'lg')}
          <div class="league-head-text"><span class="eyebrow">${icon('fa-trophy')} League ${p.league} of 9</span><h2>${name} League</h2><p class="muted"><span data-countdown="${esc(p.week_ends)}">${countdown(p.week_ends)}</span> · ${p.xp_week.toLocaleString()} XP this week</p></div>
          <a class="btn btn-sm" href="#/account">${icon('fa-user')} ${esc(p.username)}</a>
        </section>
        <div class="seg seg-scroll league-tabs" role="tablist" aria-label="Leaderboards">
          ${[['league', 'fa-fire', 'League'], ['school', 'fa-school', 'My school'], ['schools', 'fa-ranking-star', 'Schools'], ['friends', 'fa-user-group', 'Friends']].map(([k, ic, l]) => `<button type="button" role="tab" data-ltab="${k}" aria-selected="${tab === k}">${icon(ic)} ${l}</button>`).join('')}
        </div>
        <div class="league-body" data-board>${loadingRows(8)}</div>`);
      clearInterval(ticker);
      ticker = setInterval(() => { const c = el.querySelector('[data-countdown]'); if (c) c.textContent = countdown(c.dataset.countdown); }, 30000);
      loadTab(p);
    }
    const board = () => el.querySelector('[data-board]');
    const countrySel = () => `<select class="country-sel" data-country aria-label="Country">${COUNTRIES.map(([c, n]) => `<option value="${c}"${c === country ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>`;
    async function loadSchools() {
      try {
        const r = await EF.cloud.schoolsBoard(country);
        if (!alive || !board()) return;
        board().innerHTML = r.rows.length ? `<ol class="lb">${r.rows.map((s) => schoolRow(s)).join('')}</ol>` : `<p class="muted center lb-empty">No schools here yet. Be the first to put yours on the board!</p>`;
      } catch (e) { if (board()) board().innerHTML = errBox(e); }
    }
    async function loadTab(p) {
      const b = board(); if (!b) return;
      b.innerHTML = loadingRows(8);
      try {
        if (tab === 'league') {
          const r = await EF.cloud.leagueBoard();
          if (!alive || !board()) return;
          // moving up needs a top spot AND at least 30 XP that week (same rule as the database)
          const up = (x) => x.rank <= r.promote && x.xp >= 30;
          const down = (x) => r.demote && x.rank > r.total - r.demote;
          let shownUp = false, shownSafe = false, shownDown = false;
          board().innerHTML = `<p class="lb-note muted">${icon('fa-circle-info')} ${r.promote ? `Top ${r.promote} with 30+ XP move up` : 'Top league: hold your spot'}${r.demote ? `, bottom ${r.demote} move down` : ''} when the week ends.</p>
            <ol class="lb">${r.rows.map((x) => {
              let cut = '';
              if (up(x) && !shownUp) { shownUp = true; cut = `<li class="lb-cut is-up">${icon('fa-arrow-up')} Promotion zone</li>`; }
              else if (!up(x) && !down(x) && !shownSafe && shownUp) { shownSafe = true; cut = `<li class="lb-cut">${icon('fa-shield-halved')} Safe zone</li>`; }
              else if (down(x) && !shownDown) { shownDown = true; cut = `<li class="lb-cut is-down">${icon('fa-arrow-down')} Demotion zone</li>`; }
              return cut + row(x, up(x) ? ' is-up' : down(x) ? ' is-down' : '');
            }).join('')}</ol>
            ${r.rows.length === 1 ? `<p class="muted center lb-empty">Nobody else in your league has earned XP yet this week. Study to claim the top spot!</p>` : ''}
            ${r.my_rank > 50 ? `<p class="muted center">You’re #${r.my_rank} of ${r.total}</p>` : ''}`;
        } else if (tab === 'school') {
          if (!p.school) { board().innerHTML = `<div class="cloud-msg">${icon('fa-school')} Pick your school in <a href="#/account">your account</a> to see your school’s board.</div>`; return; }
          const r = await EF.cloud.schoolBoard(p.school.id);
          if (!alive || !board()) return;
          board().innerHTML = `<a class="school-strip" href="#/school/${r.school.id}">${EF.schoolMark(r.school, 40)}<span><strong>${esc(r.school.name)}</strong><small>${r.school.members} student${r.school.members === 1 ? '' : 's'} · ${(+r.school.xp_week).toLocaleString()} XP this week</small></span><span class="link">Library ${icon('fa-arrow-right')}</span></a><ol class="lb">${r.rows.map((x) => row(x)).join('')}</ol>`;
        } else if (tab === 'schools') {
          board().innerHTML = `<div class="lb-tools">${countrySel()}</div><div data-schools>${loadingRows(6)}</div>`;
          const r = await EF.cloud.schoolsBoard(country);
          if (!alive || !board()) return;
          const t = board().querySelector('[data-schools]');
          t.innerHTML = r.rows.length ? `<ol class="lb">${r.rows.map((s) => schoolRow(s, p.school && p.school.id === s.id)).join('')}</ol>` : `<p class="muted center lb-empty">No schools from here yet.</p>`;
        } else {
          const r = await EF.cloud.friendsBoard();
          if (!alive || !board()) return;
          board().innerHTML = `<form class="friend-add" novalidate><input name="u" placeholder="Friend’s username" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Friend’s username" maxlength="20"><button class="btn btn-c btn-sm" type="submit">${icon('fa-user-plus')} Add</button></form>
            <ol class="lb">${r.rows.map((x) => row(x).replace('</li>', x.me ? '</li>' : `<button type="button" class="icon-btn lb-x" data-unfollow="${esc(x.username)}" aria-label="Remove ${esc(x.username)}">${icon('fa-xmark')}</button></li>`)).join('')}</ol>
            ${r.rows.length < 2 ? `<p class="muted center lb-empty">Add friends by their username to race them every week. Your username is <strong>${esc(p.username)}</strong>.</p>` : ''}`;
        }
      } catch (e) { if (board()) board().innerHTML = errBox(e); }
    }
    const onClick = async (e) => {
      const t = e.target.closest('[data-ltab]');
      if (t) { tab = t.dataset.ltab; ls.set('ef2:leagueTab', tab); el.querySelectorAll('[data-ltab]').forEach((b) => b.setAttribute('aria-selected', b === t)); loadTab(EF.cloud.cachedMe()); return; }
      const d = e.target.closest('[data-dismiss-result]');
      if (d) { const box = d.closest('.league-result'); ls.set(SEEN, box.dataset.week); box.remove(); return; }
      const u = e.target.closest('[data-unfollow]');
      if (u) { try { await EF.cloud.unfollow(u.dataset.unfollow); loadTab(EF.cloud.cachedMe()); } catch (er) { EF.toast(er.message, 'fa-circle-exclamation'); } }
    };
    const onSubmit = async (e) => {
      if (!e.target.closest('.friend-add')) return;
      e.preventDefault();
      const v = e.target.u.value.trim(); if (!v) return;
      try { await EF.cloud.follow(v); EF.toast(`Added ${v}`, 'fa-user-check'); EF.haptic('success'); loadTab(EF.cloud.cachedMe()); } catch (er) { EF.toast(er.message, 'fa-circle-exclamation'); EF.haptic('error'); }
    };
    const onChange = (e) => { const c = e.target.closest('[data-country]'); if (!c) return; country = c.value; ls.set('ef2:country', country); if (joined()) loadTab(EF.cloud.cachedMe()); else loadSchools(); };
    el.addEventListener('click', onClick); el.addEventListener('submit', onSubmit); el.addEventListener('change', onChange);
    render();
    return () => { alive = false; clearInterval(ticker); el.removeEventListener('click', onClick); el.removeEventListener('submit', onSubmit); el.removeEventListener('change', onChange); };
  };

  /* ---------------- school picker (used by Join and Account) ---------------- */
  function schoolPicker(host, onPick, initial) {
    let country = ls.get('ef2:country') || 'JM', timer = 0, seq = 0, picked = initial || null;
    let group = ls.get('ef2:spGroup') || 'high', region = ls.get('ef2:spRegion') || '', offset = 0;
    host.innerHTML = `<div class="sp">
      <div class="sp-picked"${picked ? '' : ' hidden'}><span class="sp-crest">${picked ? EF.schoolMark(picked, 34) : ''}</span><span class="sp-picked-name">${picked ? esc(picked.name) : ''}</span><button type="button" class="link" data-sp-change>Change</button></div>
      <div class="sp-search"${picked ? ' hidden' : ''}>
        <div class="sp-row"><input type="search" class="sp-q" placeholder="Search your school, or pick below" autocomplete="off" aria-label="Search for your school"><select class="country-sel sp-country" aria-label="Country">${COUNTRIES.map(([c, n]) => `<option value="${c}"${c === country ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
        <div class="sp-browse" hidden>
          <div class="pill-tabs sp-groups" role="tablist" aria-label="Type of school">${SP_GROUPS.map(([g, label]) => `<button type="button" role="tab" data-sp-group="${g}" aria-selected="${g === group}">${label}</button>`).join('')}</div>
          <label class="pill-select sp-parish">${icon('fa-location-dot')}<select data-sp-region aria-label="Parish"><option value="">All parishes</option>${PARISHES.map((x) => `<option${x === region ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
        </div>
        <p class="sp-count muted small" aria-live="polite"></p>
        <ul class="sp-results" role="listbox" aria-label="Schools"></ul>
        <button type="button" class="btn btn-sm btn-ghost sp-loadmore" data-sp-more hidden>${icon('fa-chevron-down')} Show more schools</button>
        <div class="sp-more" hidden><button type="button" class="btn btn-sm" data-sp-map>${icon('fa-earth-americas')} Search the world map</button><button type="button" class="btn btn-sm btn-ghost" data-sp-add>${icon('fa-plus')} Add it myself</button></div>
        <div class="sp-add" hidden><input class="sp-add-n" placeholder="Full school name" maxlength="120" aria-label="School name"><input class="sp-add-r" placeholder="Parish / city" maxlength="80" aria-label="Parish or city"><button class="btn btn-c btn-sm" type="button" data-sp-addgo>Add school</button></div>
        <p class="sp-credit muted small">World map search: © OpenStreetMap contributors</p>
      </div>
    </div>`;
    const $ = (s) => host.querySelector(s);
    const list = $('.sp-results');
    const pick = (s) => { picked = s; $('.sp-picked-name').textContent = s.name; $('.sp-crest').innerHTML = EF.schoolMark(s, 34); $('.sp-picked').hidden = false; $('.sp-search').hidden = true; onPick(s); EF.haptic(); };
    const item = (s, i, from) => `<li><button type="button" class="sp-item" data-sp-i="${i}" data-from="${from}">${EF.schoolMark(s, 38)}<span><strong>${esc(s.name)}</strong><small>${[s.region, kindLabel(s.kind), from === 'map' ? 'from the world map' : '', s.members > 0 ? `${s.members} classmate${s.members === 1 ? '' : 's'} on Zing` : ''].filter(Boolean).map(esc).join(' · ')}</small></span>${s.members ? `<span class="sp-members" aria-hidden="true">${icon('fa-user-group')} ${s.members}</span>` : ''}</button></li>`;
    const show = (items, from, append) => {
      const start = append ? (list._items || []).length : 0;
      const html = items.map((s, i) => item(s, start + i, from)).join('');
      if (append) list.insertAdjacentHTML('beforeend', html); else list.innerHTML = html;
      list._items = append ? (list._items || []).concat(items) : items;
    };
    const browsing = () => country === 'JM' && $('.sp-q').value.trim().length < 2;
    async function browse(more) {
      const my = ++seq;
      $('.sp-browse').hidden = false; $('.sp-more').hidden = true;
      if (!more) { offset = 0; list.classList.add('is-loading'); }
      try {
        const r = await EF.cloud.browseSchools(country, region || null, group || null, offset);
        if (my !== seq) return;
        show(r.rows, 'db', more);
        offset += r.rows.length;
        const what = (SP_GROUPS.find(([g]) => g === group) || [0, 'schools'])[1].toLowerCase();
        $('.sp-count').textContent = r.total ? `${r.total.toLocaleString()} ${group ? what : 'schools'}${region ? ' in ' + region : ' in Jamaica'} · busiest first` : `No ${group ? what : 'schools'}${region ? ' in ' + region + ' yet. Try All parishes.' : ' yet.'}`;
        $('[data-sp-more]').hidden = offset >= r.total;
        if (!more) list.scrollTop = 0;
      } catch (e) { if (my === seq) list.innerHTML = `<li class="muted small">${esc(e.message)}</li>`; }
      list.classList.remove('is-loading');
    }
    async function search() {
      const q = $('.sp-q').value.trim(), my = ++seq;
      $('[data-sp-more]').hidden = true;
      if (browsing()) { browse(); return; }
      $('.sp-browse').hidden = true;
      $('.sp-more').hidden = q.length < 2;
      if (q.length < 2) { list.innerHTML = ''; $('.sp-count').textContent = ''; return; }
      try { const r = await EF.cloud.searchSchools(q, country); if (my === seq) { show(r, 'db'); $('.sp-count').textContent = r.length ? '' : 'No match yet. Try fewer letters, the world map, or add it.'; } } catch (e) { if (my === seq) list.innerHTML = `<li class="muted small">${esc(e.message)}</li>`; }
    }
    host.addEventListener('input', (e) => { if (e.target.classList.contains('sp-q')) { clearTimeout(timer); timer = setTimeout(search, 250); } });
    host.addEventListener('change', (e) => {
      if (e.target.classList.contains('sp-country')) { country = e.target.value; ls.set('ef2:country', country); search(); }
      if (e.target.matches('[data-sp-region]')) { region = e.target.value; ls.set('ef2:spRegion', region); browse(); }
    });
    host.addEventListener('click', async (e) => {
      if (e.target.closest('[data-sp-change]')) { $('.sp-picked').hidden = true; $('.sp-search').hidden = false; $('.sp-q').focus(); if (!list._items) search(); return; }
      const gb = e.target.closest('[data-sp-group]');
      if (gb) { group = gb.dataset.spGroup; ls.set('ef2:spGroup', group); host.querySelectorAll('[data-sp-group]').forEach((x) => x.setAttribute('aria-selected', String(x === gb))); browse(); return; }
      if (e.target.closest('[data-sp-more]')) { browse(true); return; }
      const it = e.target.closest('[data-sp-i]');
      if (it) {
        const s = list._items[+it.dataset.spI];
        if (it.dataset.from === 'db') { pick(s); return; }
        it.disabled = true;
        try { pick(await EF.cloud.addSchool(Object.assign({ country }, s))); } catch (er) { EF.toast(er.message, 'fa-circle-exclamation'); it.disabled = false; }
        return;
      }
      if (e.target.closest('[data-sp-map]')) {
        const b = e.target.closest('[data-sp-map]'); b.disabled = true; b.innerHTML = `${icon('fa-spinner', 'fa-spin')} Searching…`;
        try {
          const r = await EF.cloud.searchMap($('.sp-q').value, country);
          const have = new Set((list._items || []).filter((x) => x.members != null).map((x) => x.name.toLowerCase()));
          const fresh = r.filter((x) => !have.has(x.name.toLowerCase()));
          if (fresh.length) show(fresh, 'map'); else EF.toast('Not on the map either: add it yourself', 'fa-map');
        } catch (er) { EF.toast(er.message, 'fa-circle-exclamation'); }
        b.disabled = false; b.innerHTML = `${icon('fa-earth-americas')} Search the world map`;
        return;
      }
      if (e.target.closest('[data-sp-add]')) { $('.sp-add').hidden = false; $('.sp-add-n').value = $('.sp-q').value.trim(); $('.sp-add-r').focus(); return; }
      if (e.target.closest('[data-sp-addgo]')) addManual();
    });
    async function addManual() {
      const n = $('.sp-add-n').value.trim();
      if (n.length < 4) { EF.toast('Type the school’s full name', 'fa-circle-exclamation'); return; }
      try { pick(await EF.cloud.addSchool({ name: n, region: $('.sp-add-r').value, country })); $('.sp-add').hidden = true; } catch (er) { EF.toast(er.message, 'fa-circle-exclamation'); }
    }
    // the picker sits inside other forms, so Enter here must never submit them
    host.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || !e.target.matches('input')) return;
      e.preventDefault();
      if (e.target.classList.contains('sp-q')) { clearTimeout(timer); search(); } else addManual();
    });
    if (!picked) search();
    return { get: () => picked };
  }

  EF.schoolPicker = (host, onPick, initial) => schoolPicker(host, onPick, initial);
  EF.cloudUI = { row: (r, extra) => row(r, extra), badge: (n, size) => badge(n, size), fmtXP: (n) => fmtXP(n), countdown: (iso) => countdown(iso), loadingRows: (n) => loadingRows(n), errBox: (e) => errBox(e), offBox: () => offBox(), kindLabel: (k) => kindLabel(k) };

  const avatarPicker = (cur) => `<div class="ava-pick" role="radiogroup" aria-label="Avatar">${EF.AVATARS.map((k) => `<button type="button" role="radio" class="ava-opt" data-ava="${k}" aria-checked="${k === cur}" aria-label="${k}">${EF.avatar(k, k, 46)}</button>`).join('')}</div>`;

  const authPanel = () => `<section class="profile-auth" aria-label="Sign-in options" data-auth-panel hidden><h2>Keep your account with you</h2><p>Connect a sign-in to return to your profile on another device.</p><div class="auth-options">${['google', 'apple'].map((provider) => `<button type="button" class="auth-provider" data-social-login="${provider}"><i class="fa-brands fa-${provider}" aria-hidden="true"></i><span>Continue with ${provider === 'google' ? 'Google' : 'Apple'}</span></button>`).join('')}</div><form class="auth-email" data-auth-email novalidate hidden><input type="email" name="email" autocomplete="email" inputmode="email" placeholder="Add your email address" aria-label="Email address"><button type="submit" class="btn btn-sm">${icon('fa-envelope')} Send link</button></form><p class="auth-status" role="status">Checking sign-in options…</p></section>`;
  const restoreBox = () => `<section class="profile-auth" role="status"><h2>Let’s get your profile back</h2><p>We couldn’t finish downloading your account. Your cloud backup is safe. Check your connection, then try again.</p><button type="button" class="btn btn-primary" data-retry-restore>Try again</button></section>`;
  function paintAuthPanel(el) {
    const box = el.querySelector('[data-auth-panel]');
    if (!box || !EF.accountAuth) return;
    // The card stays hidden until a sign-in is switched on in Supabase, and only working buttons show: no dead ends.
    EF.accountAuth.status().then((state) => {
      if (!box.isConnected) return;
      let shown = 0;
      box.querySelectorAll('[data-social-login]').forEach((button) => {
        const provider = button.dataset.socialLogin, name = provider === 'google' ? 'Google' : 'Apple';
        const connected = state.connected.includes(provider);
        button.hidden = !(connected || state.providers[provider]);
        if (!button.hidden) shown++;
        button.disabled = connected;
        button.classList.toggle('is-connected', connected);
        button.querySelector('span').textContent = connected ? name + ' connected' : 'Continue with ' + name;
      });
      const em = box.querySelector('[data-auth-email]');
      if (em) {
        em.hidden = !(joined() && state.providers.email && !state.email);
        if (state.email) { em.hidden = true; box.querySelector('.auth-options').insertAdjacentHTML('beforeend', `<span class="auth-provider is-connected">${icon('fa-envelope')}<span>${esc(state.email)}</span></span>`); }
        else if (state.pendingEmail) { em.hidden = true; box.querySelector('.auth-options').insertAdjacentHTML('beforeend', `<span class="auth-provider">${icon('fa-envelope')}<span>Check ${esc(state.pendingEmail)} to confirm</span></span>`); }
        if (!em.hidden || state.email || state.pendingEmail) shown++;
      }
      box.hidden = !shown;
      box.querySelector('.auth-status').textContent = state.connected.length || state.email ? 'Your connected sign-in keeps this same profile and progress.'
        : joined() ? 'Already have a profile here? Connecting keeps your XP, friends and study progress.'
          : 'Used this sign-in on another device? It brings your profile back here. New? It starts a fresh one.';
    }).catch(() => { /* offline, or sign-in isn't set up: keep the card hidden */ });
  }
  // add an email to this account: a link is sent, and once it's opened the email signs in to this same profile
  document.addEventListener('submit', async (event) => {
    const f = event.target.closest && event.target.closest('[data-auth-email]');
    if (!f || !EF.accountAuth) return;
    event.preventDefault();
    const status = f.parentElement.querySelector('.auth-status'), b = f.querySelector('button');
    b.disabled = true;
    try { const r = await EF.accountAuth.linkEmail(f.email.value); status.textContent = `Check ${r.email} and open the link to finish adding it.`; f.hidden = true; }
    catch (error) { status.textContent = error.message; }
    b.disabled = false;
  });
  document.addEventListener('click', async (event) => {
    if (event.target.closest('[data-retry-restore]')) { location.reload(); return; }
    const button = event.target.closest('[data-social-login]');
    if (!button || !EF.accountAuth) return;
    const box = button.closest('[data-auth-panel]'), status = box.querySelector('.auth-status');
    button.disabled = true; status.textContent = 'Opening secure sign-in…';
    try { const result = await EF.accountAuth.start(button.dataset.socialLogin); if (result.connected) { paintAuthPanel(box.parentElement); } }
    catch (error) { status.textContent = error.message; button.disabled = false; }
  });

  /* ---------------- #/join ---------------- */
  EF.mountJoin = (el, mode) => {
    if (!enabled) { el.innerHTML = offBox(); return () => {}; }
    if (ls.get(RESTORE) && !joined()) { el.innerHTML = restoreBox(); return () => {}; }
    if (joined()) { el.innerHTML = `<div class="cloud-msg">${icon('fa-circle-check')} You’re all set up on this device. <a href="#/social">Go to Social</a>.</div>`; return () => {}; }
    el.innerHTML = `<div class="empty-state">${EF.mascot('wave', 120)}<h2>${mode === 'code' ? 'Welcome back!' : 'Let’s make your account'}</h2><p class="muted">It takes about a minute.</p><button type="button" class="btn btn-primary btn-lg" data-ob-again>${icon('fa-user-plus')} ${mode === 'code' ? 'Sign in' : 'Get started'}</button></div>`;
    if (EF.onboarding && !document.querySelector('.ob')) setTimeout(() => EF.onboarding.open(), 50);
    return () => {};
  };

  /* ---------------- #/account ---------------- */
  EF.mountAccount = (el) => {
    if (!enabled) { el.innerHTML = offBox(); return () => {}; }
    if (!joined()) { el.innerHTML = `<div class="cloud-msg">${icon('fa-user')} You haven’t joined yet. <a href="#/join">Join the league</a> or <a href="#/join/code">use a transfer code</a>.</div>`; return () => {}; }
    let alive = true, school = null, grade = null, avatar = null, acct = null;
    el.innerHTML = loadingRows(4);
    EF.cloud.me(true).then((p) => {
      if (!alive) return;
      if (!p) { el.innerHTML = `<div class="cloud-msg">${icon('fa-user')} This device isn’t signed in any more. <a href="#/join">Join again</a>.</div>`; return; }
      school = p.school; grade = p.grade; avatar = EF.avatarKey(p.avatar, p.username);
      const [lname] = EF.cloud.league(p.league);
      el.innerHTML = `<section class="card acct-card">
          <div class="acct-top">${EF.avatar(p.avatar, p.username, 64)}<div><h2>${esc(p.username)}</h2><p class="muted">${lname} League · ${p.xp_total.toLocaleString()} XP all time${p.school ? ' · ' + esc(p.school.name) : ''}</p></div></div>
          <form class="acct-form" novalidate>
            <div class="make-field"><span>Avatar</span>${avatarPicker(avatar)}</div>
            <div class="acct-names"><label class="make-field"><span>First name</span><input name="fn" value="${esc(p.first_name || '')}" maxlength="30" autocomplete="given-name" autocapitalize="words"></label><label class="make-field"><span>Last name</span><input name="ln" value="${esc(p.last_name || '')}" maxlength="30" autocomplete="family-name" autocapitalize="words"></label><label class="make-field acct-age"><span>Age</span><input name="age" type="number" inputmode="numeric" min="5" max="100" value="${esc(p.age || '')}"></label></div>
            <small class="muted">${icon('fa-shield-halved')} Others only see your first name and last initial (if you’re 13+ and friend finding is on). Your age and last name stay private.</small>
            <label class="make-field"><span>Username</span><input name="u" value="${esc(p.username)}" maxlength="20" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
            <div class="make-field"><span>Grade</span><div class="seg seg-wrap" role="radiogroup" aria-label="Grade">${[7, 8, 9, 10, 11, 12].map((g) => `<button type="button" role="radio" data-grade="${g}" aria-pressed="${g === p.grade}">Grade ${g}</button>`).join('')}</div></div>
            <div class="make-field"><span>School</span><div data-picker></div></div>
            <button class="btn btn-c" type="submit">${icon('fa-floppy-disk')} Save changes</button>
          </form>
        </section>
        <section class="card acct-card" id="security" data-security>
          <h3>${icon('fa-mobile-screen')} Move to another device</h3>
          <p class="muted">Get a one-time code, then on the new phone or computer tap <strong>Join → I have a transfer code</strong>. Keep it secret: anyone with the code can take your account.</p>
          <div class="btn-row"><button type="button" class="btn" data-code>${icon('fa-key')} ${p.has_code ? 'Make a new code' : 'Get my code'}</button></div>
          <div class="code-out" hidden></div>
        </section>
        <section class="card acct-card">
          <h3>${icon('fa-cloud')} Cloud save</h3>
          <p class="muted">Your progress, XP and sets are backed up to your account automatically.</p>
          <div class="btn-row"><button type="button" class="btn" data-backup>${icon('fa-cloud-arrow-up')} Back up now</button><a class="btn btn-ghost" href="#/progress">${icon('fa-chart-simple')} My progress</a></div>
        </section>
        ${authPanel()}
        <section class="card acct-card danger-zone">
          <h3>${icon('fa-door-open')} Sign out or delete</h3>
          <p class="muted">Signing out keeps your progress on this device. Without a transfer code you can’t get back into this account, so make one first.</p>
          <div class="btn-row"><button type="button" class="btn" data-signout>${icon('fa-right-from-bracket')} Sign out</button><button type="button" class="btn btn-danger" data-delete>${icon('fa-trash')} Delete my account</button></div>
        </section>`;
      paintAuthPanel(el);
      schoolPicker(el.querySelector('[data-picker]'), (s) => { school = s; }, p.school);
      acct = p;
      if (/\/security$/.test(location.hash)) requestAnimationFrame(() => { const sec = el.querySelector('[data-security]'); if (sec) sec.scrollIntoView({ block: 'start' }); });
    }).catch((e) => { if (alive) el.innerHTML = errBox(e); });
    const onClick = async (e) => {
      const g = e.target.closest('[data-grade]');
      if (g) { grade = +g.dataset.grade; el.querySelectorAll('[data-grade]').forEach((b) => b.setAttribute('aria-pressed', b === g)); return; }
      const av = e.target.closest('[data-ava]');
      if (av) { avatar = av.dataset.ava; el.querySelectorAll('[data-ava]').forEach((b) => b.setAttribute('aria-checked', b === av)); EF.haptic(); return; }
      if (e.target.closest('[data-code]')) {
        try { const r = await EF.cloud.transferCode(); const box = el.querySelector('.code-out'); box.hidden = false; box.innerHTML = `<code class="code-big">${esc(r.code)}</code><button type="button" class="btn btn-sm" data-copy="${esc(r.code)}">${icon('fa-copy')} Copy</button><p class="muted small">Works once. Making a new code cancels the old one.</p>`; }
        catch (er) { EF.toast(er.message, 'fa-circle-exclamation'); }
        return;
      }
      const cp = e.target.closest('[data-copy]');
      if (cp) { try { await navigator.clipboard.writeText(cp.dataset.copy); EF.toast('Code copied', 'fa-copy'); } catch (er) { /* select it instead */ } return; }
      if (e.target.closest('[data-backup]')) { await EF.cloud.flushXP(); await EF.cloud.pushSave(); EF.toast('Backed up', 'fa-cloud'); return; }
      if (e.target.closest('[data-signout]')) { if (confirm('Sign out on this device? Your progress stays here.')) { await EF.cloud.signOut(); EF.toast('Signed out', 'fa-right-from-bracket'); location.hash = '#/league'; } return; }
      if (e.target.closest('[data-delete]')) {
        if (!confirm('Delete your Zing account? Your profile, friends, groups, Live invites and shared sets are removed for good. Progress on this device stays.')) return;
        try { await EF.cloud.deleteMe(); ls.del('ef2:onboarded'); EF.toast('Account deleted', 'fa-trash'); location.hash = '#/'; } catch (er) { EF.toast(er.message, 'fa-circle-exclamation'); }
      }
    };
    const onSubmit = async (e) => {
      if (!e.target.classList.contains('acct-form')) return;
      e.preventDefault();
      const f = e.target, fn = f.fn.value.trim(), ln = f.ln.value.trim(), age = +f.age.value;
      try {
        await EF.cloud.updateProfile({ username: f.u.value.trim(), schoolId: school && school.id, grade, avatar });
        if (fn && ln && age) await EF.cloud.onboard({ first: fn, last: ln, age, purpose: (acct && acct.purpose) || 'school', grade, school: school ? school.id : null, findable: acct ? acct.findable !== false : true, reminders: acct ? acct.reminders !== false : true, avatar });
        EF.toast('Saved', 'fa-circle-check'); EF.haptic('success'); EF.emit('cloud', { kind: 'profile' });
      } catch (er) { EF.toast(er.message, 'fa-circle-exclamation'); }
    };
    el.addEventListener('click', onClick); el.addEventListener('submit', onSubmit);
    return () => { alive = false; el.removeEventListener('click', onClick); el.removeEventListener('submit', onSubmit); };
  };

  /* ---------------- #/school/:id: the school's leaderboard + its shared sets ---------------- */
  EF.mountSchool = (el, id) => {
    if (!enabled) { el.innerHTML = offBox(); return () => {}; }
    let alive = true, tab = 'all', period = ls.get('ef2:sbPeriod') || 'week', view = ls.get('ef2:sbView') || 'board', data = null, sets = [], me = null;
    el.innerHTML = loadingRows(6);
    function draw() {
      const b = data, mineHere = me && me.school && me.school.id === b.school.id, myLocal = EF.sets.list();
      const rows = b.rows.filter((r) => tab === 'all' || r.friend || r.me);
      el.innerHTML = `<section class="school-board">
          <header class="sb-head">${EF.schoolMark(b.school, 58)}<div><span class="sb-name">${esc(b.school.name)}${b.school.region ? ' · ' + esc(b.school.region) : ''}</span><h1>${b.school.members} classmate${b.school.members === 1 ? '' : 's'} on Zing</h1>${kindLabel(b.school.kind) ? `<span class="sb-kind">${esc(kindLabel(b.school.kind))}</span>` : ''}</div>
            <div class="sb-cta">${mineHere ? `<span class="sb-mine">${icon('fa-circle-check')} Your school</span>` : joined() ? `<button type="button" class="btn btn-sm" data-switch-school>${icon('fa-right-left')} Switch to this school</button>` : `<a class="btn btn-primary btn-sm" href="#/join" data-join-school>${icon('fa-fire')} Join with this school</a>`}</div></header>
          <div class="sb-views seg" role="tablist" aria-label="School page"><button type="button" role="tab" data-sbview="board" aria-selected="${view === 'board'}">${icon('fa-trophy')} Leaderboard</button><button type="button" role="tab" data-sbview="decks" aria-selected="${view === 'decks'}">${icon('fa-layer-group')} Decks (${sets.length})</button></div>
          <div class="sb-board"${view === 'board' ? '' : ' hidden'}>
          <div class="sb-tools">
            <div class="pill-tabs" role="tablist" aria-label="Who"><button type="button" role="tab" data-sbtab="all" aria-selected="${tab === 'all'}">All (${b.school.members})</button><button type="button" role="tab" data-sbtab="friends" aria-selected="${tab === 'friends'}">Friends (${b.school.friends || 0})</button></div>
            <div class="seg seg-sm" role="tablist" aria-label="Time period">${[['week', 'Week'], ['month', 'Month'], ['all', 'All time']].map(([k, l]) => `<button type="button" role="tab" data-period="${k}" aria-selected="${period === k}">${l}</button>`).join('')}</div>
          </div>
          <ol class="lb lb-big">${rows.length ? rows.map((r) => row(r)).join('') : `<li class="lb-empty-row">${tab === 'friends' ? 'No friends from this school yet. Add some in <a href="#/league" data-goto-friends>Leagues → Friends</a>.' : 'Nobody has joined from here yet.'}</li>`}</ol>
          ${period === 'week' ? `<p class="muted small sb-foot">${icon('fa-clock')} This week’s board resets ${countdown(b.week_ends).replace(' left', '')} from now</p>` : period === 'month' && b.month_ends ? `<p class="muted small sb-foot">${icon('fa-calendar')} This month’s board resets ${countdown(b.month_ends).replace(' left', '')} from now</p>` : ''}
          </div>
        </section>
        <section class="home-section sb-decks"${view === 'decks' ? '' : ' hidden'}><div class="section-head"><h2>${EF.img3d('books', 30)} ${esc(b.school.name)} decks</h2></div>
          ${mineHere && myLocal.length ? `<div class="share-row"><select data-share-pick aria-label="Choose one of your sets">${myLocal.map((s) => `<option value="${esc(s.id)}">${esc(s.name)} (${s.cards.length})</option>`).join('')}</select><button type="button" class="btn btn-ink btn-sm" data-share-school>${icon('fa-share-nodes')} Share with ${esc(b.school.name)}</button></div>` : mineHere ? `<p class="muted small">${icon('fa-lightbulb')} <a href="#/make">Make a set</a> and share it here so everyone at your school can study it.</p>` : ''}
          ${sets.length ? `<div class="deck-grid">${sets.map((s) => `<a class="deck-tile tint" href="#/shared/${esc(s.id)}" style="--c:${esc(s.color)}"><span class="deck-band"><span class="deck-3d">${EF.img3d('cards', 56)}</span></span><span class="deck-body"><strong>${esc(s.name)}</strong><small>${s.card_count} cards · by ${esc(s.author || 'someone')}</small></span>${s.saves ? `<span class="deck-prog"><span class="xp-pill">${icon('fa-bookmark')} ${s.saves}</span></span>` : ''}</a>`).join('')}</div>` : `<p class="muted lb-empty">No shared sets yet.${mineHere ? ' Be the first!' : ''}</p>`}
        </section>`;
    }
    const load = () => Promise.all([EF.cloud.schoolBoard(id, period), EF.cloud.schoolSets(id), joined() ? EF.cloud.me().catch(() => null) : null]).then(([b, s, m]) => {
      if (!alive) return;
      if (!b) { el.innerHTML = `<div class="cloud-msg">${icon('fa-school')} School not found.</div>`; return; }
      data = b; sets = s; me = m; draw();
    }).catch((e) => { if (alive) el.innerHTML = errBox(e); });
    const onClick = async (e) => {
      const t = e.target.closest('[data-sbtab]');
      if (t) { tab = t.dataset.sbtab; draw(); return; }
      const v = e.target.closest('[data-sbview]');
      if (v) { view = v.dataset.sbview; ls.set('ef2:sbView', view); draw(); return; }
      const pr = e.target.closest('[data-period]');
      if (pr) { period = pr.dataset.period; ls.set('ef2:sbPeriod', period); const lb = el.querySelector('.lb'); if (lb) lb.classList.add('is-loading'); load(); return; }
      if (e.target.closest('[data-join-school]')) { try { sessionStorage.setItem('ef2:joinSchool', JSON.stringify(data.school)); } catch (er) { /* private mode */ } return; }
      if (e.target.closest('[data-switch-school]')) {
        if (!me || !confirm(`Move to ${data.school.name}? Your XP and league come with you.`)) return;
        try { await EF.cloud.updateProfile({ username: me.username, schoolId: data.school.id, grade: me.grade, avatar: me.avatar }); EF.toast(`Welcome to ${data.school.name}!`, 'fa-school'); EF.haptic('success'); load(); }
        catch (er) { EF.toast(er.message, 'fa-circle-exclamation'); }
        return;
      }
      if (!e.target.closest('[data-share-school]')) return;
      const sel = el.querySelector('[data-share-pick]');
      try { const r = await EF.cloud.publish(sel.value); EF.toast(r.updated ? 'Updated in your school library' : 'Shared with your school!', 'fa-share-nodes'); EF.haptic('success'); if (!r.updated) EF.store.addXP(10); load(); }
      catch (er) { EF.toast(er.message, 'fa-circle-exclamation'); }
    };
    el.addEventListener('click', onClick);
    load();
    return () => { alive = false; el.removeEventListener('click', onClick); };
  };

  /* ---------------- profiles: #/me (yours) and #/u/:name (anyone's) ---------------- */
  const joinPitch = (title) => `<section class="social-card">${EF.mascot('wave', 120)}<div><h2>${title || 'Race your school'}</h2><p class="muted">Join with a nickname and your school. Everything you study earns XP, and every Monday the top players move up a league.</p><div class="btn-row"><a class="btn btn-ink" href="#/join">${EF.img3d('trophy', 22)} Join the league</a><a class="btn" href="#/join/code">${icon('fa-key')} I have a code</a></div></div></section>`;
  const profileHead = (p, actions, own) => `<section class="profile-head">
      ${own ? `<button type="button" class="profile-ava profile-ava-edit" data-edit-pic aria-label="Edit profile picture">${EF.myAvatar(p, 116)}<span class="pic-edit">${icon('fa-camera')}</span>${p.league ? `<span class="profile-league">${badge(p.league)}</span>` : ''}</button>`
        : `<div class="profile-ava">${EF.avatar(p.avatar, p.username, 116)}${p.league ? `<span class="profile-league">${badge(p.league)}</span>` : ''}</div>`}
      <div class="profile-info">
        <h1>${esc(own && p.first_name ? p.first_name + ' ' + (p.last_name || '') : p.name || p.username)}</h1>${own || p.name ? `<p class="profile-handle">@${esc(p.username)}${p.online ? ' · <span class="on-dot">online</span>' : ''}</p>` : p.online ? '<p class="profile-handle"><span class="on-dot">online</span></p>' : ''}
        <p class="profile-sub">${p.school ? `<a href="#/school/${p.school.id}">${EF.schoolMark(p.school, 22)} ${esc(p.school.name)}</a>` : 'No school yet'}${p.grade ? ` · Grade ${esc(p.grade)}` : ''}</p>
        <p class="profile-follow"><strong>${p.followers || 0}</strong> follower${p.followers === 1 ? '' : 's'} · <strong>${p.following || 0}</strong> following</p>
        <div class="btn-row">${actions}</div>
      </div>
    </section>`;
  const statTiles = (list) => `<div class="stat-tiles">${list.map(([img, v, l]) => `<div class="stat-tile">${EF.img3d(img, 44)}<b>${v}</b><small>${l}</small></div>`).join('')}</div>`;

  /* ---------- profile picture: your own photo (kept on this device) or an avatar ---------- */
  EF.myPhoto = () => { const d = ls.get('ef2:photo'); return d && d.length <= 2900000 && /^data:image\/(webp|jpeg|png|gif);base64,[A-Za-z0-9+/=]+$/.test(d) ? d : null; };
  EF.myAvatar = (p, size) => {
    const ph = EF.myPhoto();
    return ph ? `<span class="ava ava-photo" style="--s:${size}px"><img src="${ph}" alt="" aria-hidden="true" draggable="false"></span>` : EF.avatar(p && p.avatar, p ? p.username : 'me', size);
  };
  async function photoFrom(file) {
    return EF.profileMedia.read(file);
  }
  EF.editPicture = () => {
    const me0 = EF.cloud.cachedMe();
    let tab = EF.myPhoto() ? 'custom' : 'avatar';
    const dlg = document.createElement('dialog');
    dlg.className = 'pic-dlg';
    const draw = () => {
      const me1 = EF.cloud.cachedMe() || me0 || {};
      dlg.innerHTML = `<form method="dialog" class="pic-box">
        <header><h2>Edit profile picture</h2><button class="icon-btn" value="close" aria-label="Close">${icon('fa-xmark')}</button></header>
        <div class="pic-tabs" role="tablist"><button type="button" role="tab" data-pic-tab="custom" aria-selected="${tab === 'custom'}">Custom</button><button type="button" role="tab" data-pic-tab="avatar" aria-selected="${tab === 'avatar'}">Avatar</button></div>
        ${tab === 'custom' ? `
          <div class="pic-custom">
            <h3>A picture that feels like you</h3>
            <div class="pic-preview">${EF.myAvatar(me1, 168)}</div>
            <p class="muted">Photos and animated GIFs from your gallery. GIFs up to 2 MB; photos up to 10 MB.</p>
            <p class="muted">${icon('fa-lock')} Your picture stays on this device. Everyone else still sees your avatar.</p>
            <label class="btn btn-primary btn-lg btn-block">${icon('fa-camera')} Take a selfie<input type="file" accept="image/*" capture="user" data-pic-file hidden></label>
            <label class="btn btn-lg btn-block">${icon('fa-image')} Choose photo or GIF<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" data-pic-file hidden></label>
            ${EF.myPhoto() ? `<button type="button" class="link pic-remove" data-pic-remove>${icon('fa-trash')} Remove photo</button>` : ''}
          </div>` : `
          <div class="pic-avatars">${EF.AVATARS.map((k) => `<button type="button" class="ava-opt" data-pic-ava="${k}" aria-pressed="${k === me1.avatar && !EF.myPhoto()}" aria-label="${k}">${EF.avatar(k, '', 64)}</button>`).join('')}</div>
          <p class="muted center">Your avatar shows on leaderboards, Live games and your profile.</p>`}
      </form>`;
    };
    draw();
    document.body.appendChild(dlg);
    dlg.addEventListener('close', () => { dlg.remove(); EF.paintTopMe(); EF.emit('cloud', { kind: 'profile' }); document.dispatchEvent(new Event('profile-picture-updated')); });
    dlg.addEventListener('click', async (e) => {
      if (e.target === dlg) { dlg.close(); return; }
      const t = e.target.closest('[data-pic-tab], [data-pic-ava], [data-pic-remove]');
      if (!t) return;
      if (t.dataset.picTab) { tab = t.dataset.picTab; draw(); return; }
      if (t.hasAttribute('data-pic-remove')) { ls.del('ef2:photo'); EF.toast('Photo removed', 'fa-trash'); draw(); return; }
      if (t.dataset.picAva) {
        const m = EF.cloud.cachedMe();
        ls.del('ef2:photo');
        if (m && m.avatar !== t.dataset.picAva) {
          try { await EF.cloud.updateProfile({ username: m.username, schoolId: m.school && m.school.id, grade: m.grade, avatar: t.dataset.picAva }); EF.toast('Avatar updated', 'fa-circle-check'); }
          catch (er) { EF.toast(er.message, 'fa-circle-exclamation'); }
        }
        dlg.close();
      }
    });
    dlg.addEventListener('change', async (e) => {
      if (!e.target.matches('[data-pic-file]')) return;
      if (!e.target.files.length) return;
      try {
        const url = await photoFrom(e.target.files[0]);
        try { localStorage.setItem('ef2:photo', url); } catch (error) { throw new Error('Not enough space to save that picture. Try a smaller file.'); }
        if (ls.get('ef2:photo') !== url) throw new Error('Your browser could not save that picture. Try a smaller file.');
        EF.toast('Profile picture updated', 'fa-camera'); EF.haptic('success'); draw();
      } catch (er) { EF.toast(er.message || 'That picture didn’t work. Try another one.', 'fa-circle-exclamation'); }
    });
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  };
  document.addEventListener('click', (e) => { if (e.target.closest('[data-edit-pic]')) EF.editPicture(); });

  EF.mountMe = (el) => {
    el.classList.add('profile-page');
    if (!enabled) { el.innerHTML = offBox(); return () => {}; }
    if (ls.get(RESTORE) && !joined()) { el.innerHTML = restoreBox(); return () => {}; }
    if (!joined()) { el.innerHTML = joinPitch('Make your profile'); return () => {}; }
    let alive = true, tab = ls.get('ef2:meTab') || 'overview', p = null;
    el.innerHTML = loadingRows(4);
    function body() {
      const [lname] = EF.cloud.league(p.league), st = EF.store.state();
      if (tab === 'stats') return statTiles([['star', fmtXP(p.xp_total), 'XP all time'], ['bolt', fmtXP(p.xp_week), 'XP this week'], ['fire', EF.store.streak(), 'day streak'], ['trophy', lname, 'league'], ['gem', EF.subjects.reduce((n, s) => n + EF.store.mastered(s.id), 0), 'cards mastered'], ['target', st.answered, 'questions answered']]);
      if (tab === 'sets') {
        const mine = EF.sets.list();
        return mine.length ? `<div class="deck-grid">${mine.map((x) => `<a class="deck-tile tint" href="#/deck/${esc(x.id)}" style="--c:${esc(x.color)}"><span class="deck-band"><span class="deck-3d">${EF.img3d('cards', 56)}</span></span><span class="deck-body"><strong>${esc(x.name)}</strong><small>${x.cards.length} cards${EF.cloud.listed(x.id) ? ' · in your school library' : EF.cloud.published(x.id) ? ' · shared' : ''}</small></span></a>`).join('')}</div>`
          : `<div class="profile-empty">${EF.img3d('memo', 64)}<h3>Your next study set starts here</h3><p>Turn your notes into flashcards, then learn at your own pace.</p><a class="btn btn-primary" href="#/make">${icon('fa-plus')} Create a study set</a></div>`;
      }
      return `<div class="lb-links">
          <a class="lb-link" href="#/league" data-goto-friends>${EF.img3d('heart', 40)}<span><strong>My friends</strong><small>${p.friends_rank ? '#' + p.friends_rank + ' position' : 'Add friends to race them'}</small></span>${icon('fa-chevron-right')}</a>
          ${p.school ? `<a class="lb-link" href="#/school/${p.school.id}">${EF.schoolMark(p.school, 40)}<span><strong>${esc(p.school.name)}</strong><small>#${p.school_rank || '–'} position this week</small></span>${icon('fa-chevron-right')}</a>` : ''}
          <a class="lb-link" href="#/league">${badge(p.league)}<span><strong>${lname} League</strong><small>${countdown(p.week_ends)} · ${fmtXP(p.xp_week)} XP this week</small></span>${icon('fa-chevron-right')}</a>
        </div>`;
    }
    function draw() {
      el.innerHTML = profileHead(p, `<a class="btn btn-ink" href="#/account">${icon('fa-pen')} Edit profile</a><a class="btn" href="#/league" data-goto-friends>${icon('fa-user-plus')} Find friends</a><button type="button" class="icon-btn" data-share-profile="${esc(p.username)}" aria-label="Share your profile">${icon('fa-arrow-up-from-bracket')}</button>`, true)
        + `<div class="profile-highlights" aria-label="Your study highlights"><div>${EF.img3d('bolt', 30)}<span><strong>${fmtXP(p.xp_week)}</strong><small>XP this week</small></span></div><div>${EF.img3d('fire', 30)}<span><strong>${EF.store.streak()}</strong><small>day streak</small></span></div><div>${EF.img3d('cards', 30)}<span><strong>${EF.sets.list().length}</strong><small>my decks</small></span></div></div>
        <div class="pill-tabs profile-tabs" role="tablist" aria-label="Profile sections">${[['overview', 'Leaderboards'], ['stats', 'Stats'], ['sets', 'Decks']].map(([k, l]) => `<button type="button" role="tab" id="profile-tab-${k}" data-ptab="${k}" aria-controls="profile-content" tabindex="${tab === k ? 0 : -1}" aria-selected="${tab === k}">${l}</button>`).join('')}</div>
        <section class="profile-body" id="profile-content" role="tabpanel" aria-labelledby="profile-tab-${tab}">${body()}</section>${authPanel()}`;
      paintAuthPanel(el);
    }
    EF.cloud.me(true).then((r) => { if (!alive) return; if (!r) { el.innerHTML = joinPitch('Make your profile'); return; } p = r; draw(); }).catch((e) => { if (alive) el.innerHTML = errBox(e); });
    const onClick = (e) => { const t = e.target.closest('[data-ptab]'); if (t) { tab = t.dataset.ptab; ls.set('ef2:meTab', tab); draw(); } };
    const onKey = (e) => {
      const t = e.target.closest('[data-ptab]');
      if (!t || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const keys = ['overview', 'stats', 'sets'], index = keys.indexOf(tab);
      tab = keys[e.key === 'Home' ? 0 : e.key === 'End' ? 2 : (index + (e.key === 'ArrowRight' ? 1 : 2)) % 3];
      ls.set('ef2:meTab', tab); draw(); el.querySelector('[data-ptab="' + tab + '"]').focus();
    };
    const onPicture = () => { if (alive && p) draw(); };
    document.addEventListener('profile-picture-updated', onPicture);
    el.addEventListener('click', onClick);
    el.addEventListener('keydown', onKey);
    return () => { alive = false; el.removeEventListener('click', onClick); el.removeEventListener('keydown', onKey); document.removeEventListener('profile-picture-updated', onPicture); };
  };

  EF.mountUser = (el, name) => {
    if (!enabled) { el.innerHTML = offBox(); return () => {}; }
    let alive = true, p = null;
    el.innerHTML = loadingRows(3);
    function draw() {
      const act = p.me ? `<a class="btn btn-ink" href="#/me">${icon('fa-user')} This is you</a>`
        : joined() ? `<button type="button" class="btn ${p.i_follow ? '' : 'btn-primary'}" data-follow>${icon(p.i_follow ? 'fa-user-check' : 'fa-user-plus')} ${p.i_follow ? 'Following' : p.follows_me ? 'Follow back' : 'Follow'}</button>${p.can_challenge ? `<button type="button" class="btn btn-coral" data-play-user>${icon('fa-bolt')} Play</button>` : ''}`
          : `<button type="button" class="btn btn-primary" data-ob-again>${icon('fa-user-plus')} Join to follow</button>`;
      const [lname] = EF.cloud.league(p.league);
      el.innerHTML = profileHead(p, act) + statTiles([['star', fmtXP(p.xp_total), 'XP all time'], ['bolt', fmtXP(p.xp_week), 'XP this week'], ['trophy', lname, 'league'], ['medal', p.school_rank ? '#' + p.school_rank : '–', 'at school']]);
    }
    EF.cloud.profile(name).then((r) => {
      if (!alive) return;
      if (!r) { el.innerHTML = `<div class="empty-state">${EF.mascot('think', 120)}<h2>Nobody called “${esc(name)}”</h2><p class="muted">Check the spelling, or they may have changed their name.</p></div>`; return; }
      p = r; draw();
    }).catch((e) => { if (alive) el.innerHTML = errBox(e); });
    const onClick = async (e) => {
      if (e.target.closest('[data-play-user]') && p) { EF.openChallenge({ username: p.username, avatar: p.avatar, name: p.name }); return; }
      if (!e.target.closest('[data-follow]') || !p) return;
      try { if (p.i_follow) await EF.cloud.unfollow(p.username); else await EF.cloud.follow(p.username); p.i_follow = !p.i_follow; p.followers += p.i_follow ? 1 : -1; EF.haptic('success'); draw(); }
      catch (er) { EF.toast(er.message, 'fa-circle-exclamation'); }
    };
    el.addEventListener('click', onClick);
    return () => { alive = false; el.removeEventListener('click', onClick); };
  };

  /* top-right: your avatar (or a Join button) */
  EF.paintTopMe = () => {
    document.querySelectorAll('[data-top-me]').forEach((a) => {
      if (!enabled) { a.hidden = true; return; }
      a.hidden = false;
      if (joined()) { a.href = '#/me'; a.className = 'top-me'; const av = EF.myAvatar(me, 38); if (a.innerHTML !== av) a.innerHTML = av; a.setAttribute('aria-label', 'Your profile' + (me ? ': ' + me.username : '')); }
      else { a.href = '#/join'; a.className = 'top-me top-join'; a.innerHTML = `${EF.img3d('trophy', 22)}<span>Join</span>`; a.setAttribute('aria-label', 'Join the league'); }
    });
  };
  EF.on('cloud', () => EF.paintTopMe());

  /* home: "Challenge friends" (or an invitation to join) */
  EF.paintHomeSocial = async (el) => {
    if (!el) return;
    if (!enabled) { el.remove(); return; }
    if (!joined()) { el.innerHTML = joinPitch(); return; }
    const head = `<div class="section-head"><h2>Challenge friends</h2><a class="link" href="#/social">Social ${icon('fa-arrow-right')}</a></div>`;
    el.innerHTML = head + loadingRows(1);
    try {
      const [fr, lb] = await Promise.all([EF.cloud.friendsBoard(), EF.cloud.leagueBoard()]);
      if (!el.isConnected || !lb) return;
      const friends = fr.rows.filter((r) => !r.me).slice(0, 3), [lname, lcol] = EF.cloud.league(lb.league);
      el.innerHTML = head + `<div class="challenge-row">
          <a class="challenge-card is-league" href="#/league" style="--lc:${lcol}"><span class="ch-tag">This week</span>${badge(lb.league, 'lg')}<strong>${lname} League</strong><small>#${lb.my_rank || '–'} of ${lb.total} · ${countdown(lb.week_ends)}</small></a>
          ${friends.map((f) => `<a class="challenge-card" href="#/u/${encodeURIComponent(f.username)}" data-challenge="${esc(f.username)}"><span class="ch-tag is-purple">Challenge</span>${EF.avatar(f.avatar, f.username, 58)}<strong>${esc(f.name || f.username)}</strong><small>${fmtXP(f.xp)} XP this week</small></a>`).join('')}
          ${friends.length < 3 ? `<a class="challenge-card is-add" href="#/groups">${EF.img3d('people', 52)}<strong>Add friends</strong><small>Race them every week</small></a>` : ''}
        </div>`;
    } catch (e) { el.innerHTML = ''; }
  };
  document.addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest('[data-goto-friends]')) ls.set('ef2:leagueTab', 'friends');
    const sp = e.target.closest && e.target.closest('[data-share-profile]');
    if (sp) {
      const url = location.href.split('#')[0] + '#/u/' + encodeURIComponent(sp.dataset.shareProfile);
      if (navigator.share) navigator.share({ title: 'Zing', text: 'Follow me on Zing', url }).catch(() => {});
      else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => EF.toast('Profile link copied', 'fa-link')).catch(() => {});
    }
  });

  /* ---------------- #/shared/:id: a set from a school library ---------------- */
  EF.mountShared = (el, id) => {
    if (!enabled) { el.innerHTML = offBox(); return () => {}; }
    let alive = true;
    el.innerHTML = loadingRows(4);
    EF.cloud.getShared(id).then((s) => {
      if (!alive) return;
      if (!s) { el.innerHTML = `<div class="cloud-msg">${icon('fa-circle-xmark')} That deck was removed.</div>`; return; }
      const mineLocal = s.mine && EF.cloud.localFor(id);
      const have = EF.sets.list().find((x) => x.from === id);
      el.innerHTML = `<div class="learn-card import-card is-in tint" style="--c:${esc(s.color)}">
        <span class="learn-done-ic">${EF.img3d ? EF.img3d('cards', 44) : icon('fa-book-bookmark')}</span>
        <h2>${esc(s.name)}</h2>
        <p class="muted">${s.cards.length} cards · shared by ${s.mine ? 'you' : esc(s.author || 'someone')}${s.school && s.listed ? ' at ' + esc(s.school) : ''}${s.saves ? ` · saved ${s.saves} time${s.saves === 1 ? '' : 's'}` : ''}</p>
        <ol class="make-cards">${s.cards.slice(0, 6).map((c) => `<li><strong>${esc(c[0])}</strong><span>${esc(c[1])}</span></li>`).join('')}${s.cards.length > 6 ? `<li class="muted">+ ${s.cards.length - 6} more</li>` : ''}</ol>
        <div class="btn-row center">${s.mine
          ? (mineLocal ? `<a class="btn btn-primary" href="#/deck/${esc(mineLocal)}">${icon('fa-layer-group')} Open your deck</a>` : `<span class="muted">${icon('fa-circle-check')} This is your deck</span>`)
          : have ? `<a class="btn btn-primary" href="#/deck/${esc(have.id)}">${icon('fa-layer-group')} Open it in my decks</a>`
          : `<button type="button" class="btn btn-primary" data-save-shared>${icon('fa-plus')} Save to my decks</button>`}</div>
      </div>`;
    }).catch((e) => { if (alive) el.innerHTML = errBox(e); });
    const onClick = async (e) => {
      if (!e.target.closest('[data-save-shared]')) return;
      try { const local = await EF.cloud.saveShared(id); EF.toast('Saved to your decks', 'fa-layer-group'); location.hash = '#/deck/' + local.id; } catch (er) { EF.toast(er.message, 'fa-circle-exclamation'); }
    };
    el.addEventListener('click', onClick);
    return () => { alive = false; el.removeEventListener('click', onClick); };
  };

  /* ---------------- little league card on the home page ---------------- */
  EF.paintLeagueCta = async (el) => {
    if (!el) return;
    if (!enabled) { el.remove(); return; }
    if (!joined()) { el.innerHTML = `<span class="league-cta-ic">${badge(3)}</span><span><strong>Join your school’s league</strong><small>Race your friends and your school every week</small></span>${icon('fa-arrow-right')}`; return; }
    try {
      const r = await EF.cloud.leagueBoard();
      if (!r || !el.isConnected) return;
      const [name] = EF.cloud.league(r.league);
      el.innerHTML = `<span class="league-cta-ic">${badge(r.league)}</span><span><strong>${name} League · #${r.my_rank || '–'} of ${r.total}</strong><small>${countdown(r.week_ends)} · top ${r.promote} move up</small></span>${icon('fa-arrow-right')}`;
    } catch (e) { el.innerHTML = `<span class="league-cta-ic">${icon('fa-trophy')}</span><span><strong>Your league</strong><small>Connect to the internet to see your rank</small></span>${icon('fa-arrow-right')}`; }
  };
})();
