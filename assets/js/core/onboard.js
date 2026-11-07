/* Zing onboarding: the sign-in screen and the short setup every new student goes through once.
   It's mandatory: until it's finished, this screen covers the app on every visit (it remembers where
   you got to). Offline on the very first visit? You can study for now and finish when you're back.
   Steps: sign up / sign in → age → what brings you → year → school → friends & reminders → first name
   → last name → follow classmates. Under-13s skip the friend steps and are never findable. */
(function () {
  'use strict';
  const EF = window.EF;
  const esc = EF.esc, icon = EF.icon, ls = EF.ls;
  const DONE = 'ef2:onboarded', DRAFT = 'ef2:onboard', LATER = 'ef2:ob-later', LOCAL = 'ef2:me-local';
  const NAME_OK = /^[A-Za-zÀ-ÖØ-öø-ɏ][A-Za-zÀ-ÖØ-öø-ɏ '.-]{0,29}$/;
  const cloudOn = () => !!(EF.cloud && EF.cloud.enabled);
  const GOOGLE = '<svg viewBox="0 0 48 48" width="22" height="22" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>';
  const APPLE = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.9-3-.8-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.5-1-2.5-3.8zM14.2 5.8c.6-.8 1.1-1.8 1-2.9-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.8 1 .1 2.1-.5 2.7-1.3z"/></svg>';
  const PURPOSE = [['school', 'School', 'school', 'High school or prep'], ['university', 'University', 'grad', 'College or uni'], ['work', 'Work', 'chart', 'Training or a job exam'], ['other', 'Something else', 'sparkles', 'Just curious']];
  const GRADES = [12, 11, 10, 9, 8, 7];

  let root = null, st = null, busy = false, err = '', picker = null, people = null, followed = new Set(), searchTimer = 0, seq = 0, providers = null, emailSent = '';

  const read = () => { try { return JSON.parse(ls.get(DRAFT) || 'null'); } catch (e) { return null; } };
  const save = () => { if (st) ls.set(DRAFT, JSON.stringify(st)); };
  const age = () => +st.d.age || 0;
  const meNow = () => (EF.cloud && EF.cloud.joined() ? EF.cloud.cachedMe() : null);
  const refFromUrl = () => { try { const r = new URLSearchParams(location.search).get('ref'); return r && /^[A-Za-z0-9_]{3,20}$/.test(r) ? r : null; } catch (e) { return null; } };

  // which steps apply, given the answers so far
  const FLOW = ['age', 'purpose', 'grade', 'school', 'friends', 'first', 'last', 'follow'];
  const applies = (s) => {
    if (s === 'grade') return st.d.purpose === 'school';
    if (s === 'school' || s === 'friends') return cloudOn();
    if (s === 'follow') return cloudOn() && age() >= 13 && !!meNow();
    return true;
  };
  const flow = () => FLOW.filter(applies);
  const go = (s) => { st.step = s; err = ''; save(); render(); };
  function next() {
    const f = flow(), i = f.indexOf(st.step);
    if (i >= 0 && i < f.length - 1) go(f[i + 1]); else finish();
  }
  function back() {
    if (st.step === 'email' || st.step === 'code') return go('welcome');
    const f = flow(), i = f.indexOf(st.step);
    if (i > 0) go(f[i - 1]);
    else if (cloudOn() && !meNow()) go('welcome');
  }

  /* ---------------- drawing ---------------- */
  function frame(q, sub, body, foot, opts) {
    const o = opts || {}, f = flow(), i = f.indexOf(st.step);
    const pct = i < 0 ? 0 : Math.round(((i + 1) / (f.length + 1)) * 100);
    const canBack = st.step === 'email' || st.step === 'code' || i > 0 || (i === 0 && cloudOn() && !meNow());
    return `<div class="ob-card${o.cls ? ' ' + o.cls : ''}">
      ${o.noTop ? '' : `<div class="ob-top">
        <button type="button" class="ob-back" data-ob-back aria-label="Back"${canBack ? '' : ' hidden'}>${icon('fa-arrow-left')}</button>
        <div class="ob-progress" role="progressbar" aria-label="Setup progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div>
      </div>`}
      <div class="ob-ask">
        <span class="ob-zing" aria-hidden="true">${EF.mascot(o.mood || 'wave', o.big ? 120 : 64)}</span>
        <div class="ob-bubble"><h1 id="ob-q" tabindex="-1">${q}</h1>${sub ? `<p>${sub}</p>` : ''}</div>
      </div>
      <div class="ob-body">${body}</div>
      ${err ? `<p class="ob-err" role="alert">${icon('fa-circle-exclamation')} ${esc(err)}</p>` : ''}
      ${foot ? `<div class="ob-foot">${foot}</div>` : ''}
    </div>`;
  }
  const cont = (label, disabled) => `<button type="button" class="btn btn-primary btn-lg btn-block" data-ob-next${disabled ? ' disabled' : ''}>${busy ? `${icon('fa-spinner', 'fa-spin')} One sec…` : (label || 'Continue')}</button>`;
  const legal = () => `<p class="ob-legal">By continuing, you agree to our <a href="terms.html" target="_blank" rel="noopener">Terms of Use</a> and <a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.</p>`;
  const choice = (key, value, label, art, sub, on) => `<button type="button" class="ob-choice${on ? ' is-on' : ''}" data-ob-pick="${key}" data-v="${esc(value)}" aria-pressed="${!!on}">${art ? `<span class="ob-choice-art">${art}</span>` : ''}<span class="ob-choice-text"><strong>${esc(label)}</strong>${sub ? `<small>${esc(sub)}</small>` : ''}</span>${icon('fa-chevron-right', 'ob-chev')}</button>`;
  const toggle = (key, label, sub, on, disabled) => `<label class="ob-toggle${disabled ? ' is-off' : ''}"><span><strong>${esc(label)}</strong><small>${sub}</small></span><input type="checkbox" role="switch" data-ob-toggle="${key}"${on ? ' checked' : ''}${disabled ? ' disabled' : ''}><i aria-hidden="true"></i></label>`;
  const person = (p) => {
    const on = followed.has(p.username.toLowerCase()) || p.i_follow;
    return `<li class="ob-person">${EF.avatar(p.avatar, p.username, 46)}<span class="ob-person-text"><strong>${esc(p.name || p.username)}</strong><small>${[p.name ? '@' + p.username : '', p.grade ? 'Grade ' + p.grade : '', p.school].filter(Boolean).map(esc).join(' · ')}</small></span>
      <button type="button" class="btn btn-sm ${on ? '' : 'btn-primary'}" data-ob-follow="${esc(p.username)}" aria-pressed="${!!on}">${on ? `${icon('fa-check')} Following` : p.follows_me ? 'Follow back' : 'Follow'}</button></li>`;
  };

  function render() {
    if (!root) return;
    const s = st.step, d = st.d;
    let html = '';
    if (s === 'loading') html = `<div class="ob-card ob-center">${EF.mascot('read', 110)}<p class="muted">${icon('fa-spinner', 'fa-spin')} Getting things ready…</p></div>`;
    else if (s === 'welcome') {
      const up = st.mode !== 'in', pv = providers || {};
      html = frame(up ? 'Let’s get started!' : 'Welcome back!', up ? 'Make your free Zing account. It takes about a minute.' : 'Sign in the same way you did before.', `
        <div class="ob-switch" role="tablist" aria-label="Sign up or sign in"><button type="button" role="tab" data-ob-mode="up" aria-selected="${up}">Sign up</button><button type="button" role="tab" data-ob-mode="in" aria-selected="${!up}">Sign in</button></div>
        <div class="ob-providers">
          ${providers === null ? `<p class="muted ob-checking">${icon('fa-spinner', 'fa-spin')} Checking sign-in options…</p>` : ''}
          ${pv.google ? `<button type="button" class="ob-provider" data-ob-google>${GOOGLE}<span>Continue with Google</span></button>` : ''}
          ${pv.email ? `<button type="button" class="ob-provider" data-ob-email>${icon('fa-envelope')}<span>Continue with email</span></button>` : ''}
          ${providers ? `<button type="button" class="ob-more" data-ob-more aria-expanded="${!!st.more}">${st.more ? 'Fewer options' : 'More sign in options'} ${icon(st.more ? 'fa-chevron-up' : 'fa-chevron-down')}</button>
          <div class="ob-more-list"${st.more ? '' : ' hidden'}>
            ${pv.apple ? `<button type="button" class="ob-provider" data-ob-apple>${APPLE}<span>Continue with Apple</span></button>` : ''}
            ${up && pv.guest ? `<button type="button" class="ob-provider" data-ob-guest>${icon('fa-user-secret')}<span>Continue as a guest</span></button>` : ''}
            ${!up ? `<button type="button" class="ob-provider" data-ob-code>${icon('fa-key')}<span>Use a transfer code</span></button>` : ''}
          </div>` : ''}
          ${providers && providers.offline ? `<div class="ob-offline">${icon('fa-wifi')} <span>You’re offline right now. You can study, and finish setting up when you’re back online.</span><button type="button" class="btn btn-sm" data-ob-later>Study offline for now</button></div>` : ''}
        </div>${legal()}`, '', { noTop: true, mood: 'wave', big: true, cls: 'ob-welcome' });
    } else if (s === 'email') {
      html = emailSent
        ? frame('Check your email 📬', `We sent a sign-in link to <strong>${esc(emailSent)}</strong>. Open it <strong>on this device</strong> to keep going.`, `<div class="ob-mail-art">${EF.img3d('speech', 72)}</div><p class="muted small center">No email after a minute? Check your spam folder.</p>`,
          `<button type="button" class="btn btn-block" data-ob-email-again>${icon('fa-rotate-right')} Send it again</button><button type="button" class="btn btn-ghost btn-block" data-ob-back>Use another way</button>`, { mood: 'read' })
        : frame('What’s your email?', 'We’ll send you a sign-in link. No password needed.', `<input class="ob-input" type="email" name="email" autocomplete="email" inputmode="email" placeholder="you@example.com" value="${esc(d.email || '')}" aria-label="Email address">`, cont('Send me a link'), { mood: 'read' });
    } else if (s === 'code') {
      html = frame('Got a transfer code?', 'On your old device open <strong>Settings → Sign in and security</strong> to make one.', `<input class="ob-input ob-code" name="code" placeholder="XXXX-XXXX-XXXX" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" maxlength="16" aria-label="Transfer code">`, cont('Move my account here'), { mood: 'think' });
    } else if (s === 'age') {
      html = frame('How old are you?', 'This keeps Zing safe and right for you.', `<input class="ob-input ob-age" type="number" name="age" inputmode="numeric" min="5" max="100" placeholder="Age" value="${esc(d.age || '')}" aria-label="Your age">${legal()}`, cont('Continue', !(+d.age >= 5 && +d.age <= 100)), { mood: 'wave' });
    } else if (s === 'purpose') {
      html = frame('What brings you to Zing?', 'Pick one.', `<div class="ob-choices">${PURPOSE.map(([v, l, art, sub]) => choice('purpose', v, l, EF.img3d(art, 40), sub, d.purpose === v)).join('')}</div>`, '', { mood: 'read' });
    } else if (s === 'grade') {
      html = frame('What year are you in?', '', `<div class="ob-choices ob-grades">${GRADES.map((g) => choice('grade', g, 'Grade ' + g, `<b class="ob-num">${g}</b>`, g >= 12 ? 'CAPE' : g >= 10 ? 'CSEC years' : g === 9 ? 'GNAT / prep for CSEC' : '', +d.grade === g)).join('')}${choice('grade', '', 'Other', `<b class="ob-num">${icon('fa-ellipsis')}</b>`, '', d.grade === null)}</div>`, '', { mood: 'read' });
    } else if (s === 'school') {
      html = frame('What school do you go to?', 'Search, or browse by parish.', `<div class="ob-picker" data-ob-picker></div>`, `${cont('Continue', !d.school)}<button type="button" class="btn btn-ghost btn-block" data-ob-skip-school>I’ll add it later</button>`, { mood: 'think' });
    } else if (s === 'friends') {
      const sc = d.school, n = sc && sc.members != null ? +sc.members : null, kid = age() < 13;
      html = frame(sc ? 'Let’s find what your friends are studying' : 'Study with your friends', '', `
        ${sc ? `<div class="ob-school">${EF.schoolMark(sc, 72)}<div><strong class="ob-big">${n == null ? '—' : n.toLocaleString()}</strong><span>classmate${n === 1 ? '' : 's'} at ${esc(sc.name)} ${n === 1 ? 'already studies on Zing' : n ? 'already study on Zing' : 'on Zing so far. Be the first!'}</span></div></div>` : ''}
        ${toggle('reminders', 'Enable study reminders', 'A nudge when your streak needs you', d.reminders !== false)}
        ${toggle('findable', 'Enable friend finding', kid ? 'Friend finding is for students 13 and up, so it stays off for you.' : 'Classmates can find you and see your first name and last initial', !kid && d.findable !== false, kid)}
        <p class="ob-note">${icon('fa-shield-halved')} Your age, last name and email are never shown to anyone.</p>`, cont(), { mood: 'wave' });
    } else if (s === 'first') {
      html = frame('What’s your first name?', 'This is how Zing will greet you.', `<input class="ob-input" name="first" autocomplete="given-name" autocapitalize="words" maxlength="30" placeholder="First name" value="${esc(d.first || '')}" aria-label="First name">`, cont('Continue', !NAME_OK.test((d.first || '').trim())), { mood: 'wave' });
    } else if (s === 'last') {
      html = frame('And your last name?', age() >= 13 ? 'Classmates only ever see the first letter.' : 'It stays private: nobody else sees it.', `<input class="ob-input" name="last" autocomplete="family-name" autocapitalize="words" maxlength="30" placeholder="Last name" value="${esc(d.last || '')}" aria-label="Last name">`, cont(cloudOn() ? 'Create my account' : 'Continue', !NAME_OK.test((d.last || '').trim())), { mood: 'read' });
    } else if (s === 'follow') {
      const list = people || [], open = list.filter((p) => !(followed.has(p.username.toLowerCase()) || p.i_follow));
      html = frame('Follow your friends to get top grades together!', 'Friends you follow show up in your leaderboard and can challenge you to Live games.', `
        <label class="ob-search">${icon('fa-magnifying-glass')}<input type="search" name="q" placeholder="Search classmates or a username" autocomplete="off" aria-label="Search classmates" value="${esc(st.q || '')}"></label>
        ${people === null ? `<p class="muted center">${icon('fa-spinner', 'fa-spin')} Finding classmates…</p>`
          : list.length ? `<ul class="ob-people">${list.map(person).join('')}</ul>`
            : `<div class="ob-empty">${EF.mascot('think', 84)}<p>${st.q ? 'Nobody found. Check the spelling, or try their username.' : `No classmates on Zing yet. Invite them and you’ll both get coins!`}</p><button type="button" class="btn btn-sm" data-ob-invite>${icon('fa-user-plus')} Invite friends</button></div>`}`,
        `${open.length > 1 && !st.q ? `<button type="button" class="btn btn-primary btn-lg btn-block" data-ob-follow-all>${icon('fa-user-plus')} Follow all (${open.length})</button>` : ''}<button type="button" class="btn ${followed.size ? 'btn-primary btn-lg' : 'btn-ghost'} btn-block" data-ob-done>${followed.size ? 'Done' : 'Skip for now'}</button>`, { mood: 'cheer' });
    }
    root.innerHTML = `<div class="ob-bg" aria-hidden="true"><i></i><i></i><i></i><i></i></div>${html}`;
    if (s === 'school') mountPicker();
    if (s === 'follow' && people === null) loadPeople();
    const focus = root.querySelector('.ob-input') || root.querySelector('#ob-q');
    if (focus && !(EF.touchUI && EF.touchUI() && focus.classList.contains('ob-input'))) setTimeout(() => focus.focus({ preventScroll: true }), 30);
  }

  function mountPicker() {
    const host = root.querySelector('[data-ob-picker]');
    if (!host || !EF.schoolPicker) return;
    picker = EF.schoolPicker(host, (s) => {
      st.d.school = { id: s.id, name: s.name, region: s.region, logo: s.logo, logo_kind: s.logo_kind, members: s.members };
      save();
      const b = root.querySelector('[data-ob-next]'); if (b) b.disabled = false;
    }, st.d.school || null);
  }

  async function loadPeople(q) {
    const my = ++seq;
    try {
      const r = await EF.cloud.suggest(q || null, !q);
      if (my !== seq || !root) return;
      people = Array.isArray(r) ? r : [];
    } catch (e) { if (my === seq) { people = []; err = e.message; } }
    if (root && st.step === 'follow') { const had = root.querySelector('input[name=q]'), pos = had && had === document.activeElement; render(); if (pos) { const i = root.querySelector('input[name=q]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } } }
  }

  /* ---------------- actions ---------------- */
  async function withBusy(fn) {
    if (busy) return;
    busy = true; err = ''; render();
    try { await fn(); } catch (e) { err = (e && e.message) || 'Something went wrong. Try again.'; EF.haptic && EF.haptic('error'); }
    busy = false;
    if (root) render();
  }

  // after any sign-in: an onboarded profile means we're done; otherwise carry on with the questions
  async function afterSignIn() {
    const me = await EF.cloud.me(true).catch(() => null);
    if (me && me.onboarded) { complete(me, true); return; }
    prefill(me);
    go('age');
  }
  function prefill(me) {
    if (!me) return;
    const d = st.d;
    if (me.first_name && !d.first) d.first = me.first_name;
    if (me.last_name && !d.last) d.last = me.last_name;
    if (me.age && !d.age) d.age = me.age;
    if (me.grade && d.grade === undefined) { d.grade = me.grade; d.purpose = d.purpose || 'school'; }
    if (me.school && !d.school) d.school = me.school;
    save();
  }

  async function submitProfile() {
    const d = st.d;
    if (!cloudOn()) { next(); return; }
    await withBusy(async () => {
      const me = await EF.cloud.onboard({
        first: d.first.trim(), last: d.last.trim(), age: +d.age, purpose: d.purpose || 'other',
        grade: d.grade == null ? null : +d.grade, school: d.school ? d.school.id : null,
        findable: age() >= 13 && d.findable !== false, reminders: d.reminders !== false,
        avatar: d.avatar || EF.AVATARS[Math.floor(Math.random() * EF.AVATARS.length)], ref: d.ref || null
      });
      if (!me) throw new Error('Couldn’t make your account. Try again.');
      busy = false;
      if (applies('follow')) go('follow'); else complete(me);
    });
  }

  function complete(me, returning) {
    const d = st.d;
    ls.set(DONE, '1');
    ls.del(DRAFT);
    const first = (me && me.first_name) || (d.first || '').trim();
    ls.set(LOCAL, JSON.stringify({ first, last: (me && me.last_name) || (d.last || '').trim(), age: (me && me.age) || +d.age || null, purpose: d.purpose || null, grade: d.grade == null ? null : +d.grade }));
    if (d.grade === 9 || d.grade === 10) { if (EF.grades().includes(+d.grade)) EF.setGrade(+d.grade); }
    const from = st.from;
    close();
    if (!returning) {
      if (EF.coins) EF.coins.add(50, 'Welcome gift');
      EF.confetti();
      EF.toast(first ? `Welcome to Zing, ${first}! Here’s 50 coins to start` : 'Welcome to Zing!', 'fa-feather');
    } else EF.toast(first ? `Welcome back, ${first}!` : 'Welcome back!', 'fa-hand');
    EF.emit('onboarded', { returning: !!returning });
    if (from && from !== location.hash) location.hash = from; else EF.emit('rerender');
  }
  const finish = () => complete(meNow());

  async function signInGoogle(provider) {
    await withBusy(async () => {
      const r = await EF.accountAuth.start(provider);
      if (r && r.connected) await afterSignIn();
    });
  }

  function onClick(e) {
    const t = e.target.closest('button, a'); if (!t || !root.contains(t)) return;
    if (t.tagName === 'A') return;
    if (t.disabled) return;
    if (t.hasAttribute('data-ob-back')) { emailSent = ''; back(); return; }
    if (t.dataset.obMode) { st.mode = t.dataset.obMode; save(); render(); return; }
    if (t.hasAttribute('data-ob-more')) { st.more = !st.more; save(); render(); return; }
    if (t.hasAttribute('data-ob-google')) { signInGoogle('google'); return; }
    if (t.hasAttribute('data-ob-apple')) { signInGoogle('apple'); return; }
    if (t.hasAttribute('data-ob-email')) { emailSent = ''; go('email'); return; }
    if (t.hasAttribute('data-ob-email-again')) { const a = emailSent; emailSent = ''; st.d.email = a; render(); return; }
    if (t.hasAttribute('data-ob-code')) { go('code'); return; }
    if (t.hasAttribute('data-ob-later')) { try { sessionStorage.setItem(LATER, '1'); } catch (er) { /* private mode */ } close(); return; }
    if (t.hasAttribute('data-ob-guest')) {
      withBusy(async () => {
        if (!navigator.onLine) throw new Error('You’re offline. Connect to the internet to make your account.');
        await EF.cloud.guest();
        busy = false;
        await afterSignIn();
      });
      return;
    }
    if (t.dataset.obPick) {
      const k = t.dataset.obPick, v = t.dataset.v;
      st.d[k] = k === 'grade' ? (v === '' ? null : +v) : v;
      if (k === 'purpose' && v !== 'school') st.d.grade = null;
      save();
      root.querySelectorAll(`[data-ob-pick="${k}"]`).forEach((b) => { const on = b === t; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
      EF.haptic && EF.haptic();
      setTimeout(next, 180);
      return;
    }
    if (t.hasAttribute('data-ob-skip-school')) { st.d.school = null; save(); next(); return; }
    if (t.dataset.obFollow) { followOne(t.dataset.obFollow, t); return; }
    if (t.hasAttribute('data-ob-follow-all')) {
      const names = (people || []).filter((p) => !(followed.has(p.username.toLowerCase()) || p.i_follow)).map((p) => p.username);
      withBusy(async () => { await EF.cloud.followMany(names); names.forEach((n) => followed.add(n.toLowerCase())); EF.toast(`Following ${names.length} classmates`, 'fa-user-check'); });
      return;
    }
    if (t.hasAttribute('data-ob-invite')) { if (EF.inviteFriends) EF.inviteFriends(); return; }
    if (t.hasAttribute('data-ob-done')) { finish(); return; }
    if (t.hasAttribute('data-ob-next')) { submitStep(); }
  }

  async function followOne(name, btn) {
    const key = name.toLowerCase(), on = followed.has(key) || (people || []).some((p) => p.username.toLowerCase() === key && p.i_follow);
    btn.disabled = true;
    try {
      if (on) { await EF.cloud.unfollow(name); followed.delete(key); (people || []).forEach((p) => { if (p.username.toLowerCase() === key) p.i_follow = false; }); }
      else { await EF.cloud.follow(name); followed.add(key); EF.haptic && EF.haptic('success'); }
    } catch (er) { EF.toast(er.message, 'fa-circle-exclamation'); }
    render();
  }

  function submitStep() {
    const s = st.step, d = st.d, val = (n) => { const i = root.querySelector(`[name="${n}"]`); return i ? i.value.trim() : ''; };
    if (s === 'email') {
      const a = val('email');
      withBusy(async () => { const r = await EF.accountAuth.email(a); st.d.email = r.email; save(); emailSent = r.email; });
      return;
    }
    if (s === 'code') {
      const c = val('code');
      if (c.replace(/[^A-Za-z0-9]/g, '').length !== 12) { err = 'Codes look like XXXX-XXXX-XXXX'; render(); return; }
      withBusy(async () => { await EF.cloud.claim(c); busy = false; await afterSignIn(); });
      return;
    }
    if (s === 'age') { const a = Math.round(+val('age')); if (!(a >= 5 && a <= 100)) { err = 'Type your age in numbers (5–100).'; render(); return; } d.age = a; if (a < 13) d.findable = false; save(); next(); return; }
    if (s === 'school') { if (!d.school) { err = 'Pick your school, or tap “I’ll add it later”.'; render(); return; } next(); return; }
    if (s === 'friends') { root.querySelectorAll('[data-ob-toggle]').forEach((x) => { d[x.dataset.obToggle] = x.checked; }); if (age() < 13) d.findable = false; save(); next(); return; }
    if (s === 'first' || s === 'last') {
      const v = val(s).replace(/\s+/g, ' ');
      if (!NAME_OK.test(v)) { err = 'Use letters only (up to 30).'; render(); return; }
      d[s] = v.charAt(0).toUpperCase() + v.slice(1); save();
      if (s === 'last') submitProfile(); else next();
    }
  }

  function onInput(e) {
    const t = e.target;
    if (t.name === 'age' || t.name === 'first' || t.name === 'last') {
      const v = t.value.trim(), ok = t.name === 'age' ? +v >= 5 && +v <= 100 : NAME_OK.test(v);
      const b = root.querySelector('[data-ob-next]'); if (b) b.disabled = !ok;
      if (t.name !== 'age') st.d[t.name] = v; else st.d.age = v;
      save();
    }
    if (t.name === 'q') {
      st.q = t.value.trim();
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { people = null; loadPeople(st.q.length >= 2 ? st.q : null); }, 300);
    }
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); return; }
    if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('ob-input')) { e.preventDefault(); const b = root.querySelector('[data-ob-next]'); if (b && !b.disabled) submitStep(); }
  }

  /* ---------------- open / close ---------------- */
  function open(step) {
    if (!root) {
      root = document.createElement('div');
      root.className = 'ob';
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-modal', 'true');
      root.setAttribute('aria-labelledby', 'ob-q');
      document.body.appendChild(root);
      root.addEventListener('click', onClick);
      root.addEventListener('input', onInput);
      root.addEventListener('keydown', onKey);
      document.documentElement.classList.add('ob-open');
      document.documentElement.classList.remove('ob-pending');
      document.querySelectorAll('.shell, .tabbar, .skip-link').forEach((x) => { x.inert = true; });
    }
    st.step = step; save(); render();
  }
  function close() {
    if (!root) return;
    root.removeEventListener('click', onClick); root.removeEventListener('input', onInput); root.removeEventListener('keydown', onKey);
    root.classList.add('is-leaving');
    const r = root; root = null; picker = null;
    setTimeout(() => r.remove(), EF.reducedMotion && EF.reducedMotion() ? 0 : 320);
    document.documentElement.classList.remove('ob-open');
    document.querySelectorAll('.shell, .tabbar, .skip-link').forEach((x) => { x.inert = false; });
  }

  async function loadProviders() {
    if (!cloudOn() || !EF.accountAuth) { providers = { offline: false }; return; }
    try { providers = await EF.accountAuth.providers(); }
    catch (e) { providers = { offline: true }; }
    if (!navigator.onLine) providers = Object.assign({}, providers, { offline: true });
    if (root && st.step === 'welcome') render();
  }

  /* Decide on startup: done already? signed in but not set up? brand new? */
  const unveil = () => document.documentElement.classList.remove('ob-pending');
  async function start() {
    if (ls.get(DONE) === '1') { unveil(); return; }
    try { if (sessionStorage.getItem(LATER) === '1') { unveil(); return; } } catch (e) { /* private mode */ }
    st = Object.assign({ step: 'loading', mode: 'up', d: {} }, read() || {});
    st.d = st.d || {};
    const ref = refFromUrl(); if (ref) st.d.ref = ref;
    if (!st.from) st.from = /^#\/(live|vs|import|u|shared|school)\//.test(location.hash) ? location.hash : '';
    const resume = st.step && st.step !== 'loading' ? st.step : null;
    open('loading');
    if (!cloudOn()) { go(resume && FLOW.includes(resume) ? resume : 'age'); return; }
    loadProviders();
    if (EF.accountAuth) await EF.accountAuth.ready.catch(() => {});
    // an existing league profile: already onboarded → done; otherwise only the questions are left
    if (EF.cloud.joined()) {
      const me = await EF.cloud.me(true).catch(() => EF.cloud.cachedMe());
      if (me && me.onboarded) { complete(me, true); return; }
      if (me) { prefill(me); go(resume && FLOW.includes(resume) ? resume : 'age'); return; }
    }
    const session = await EF.cloud.hasSession();
    if (session) { go(resume && FLOW.includes(resume) ? resume : 'age'); return; }
    go(resume === 'email' || resume === 'code' ? resume : 'welcome');
  }

  EF.onboarding = { start, open: () => { ls.del(DONE); start(); }, done: () => ls.get(DONE) === '1' };
  // a local profile (first name for the greeting) for copies of Zing without the online features
  EF.localMe = () => { try { return JSON.parse(ls.get(LOCAL) || 'null'); } catch (e) { return null; } };
  window.addEventListener('online', () => { if (root && st && st.step === 'welcome') { providers = null; render(); loadProviders(); } });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else setTimeout(start, 0);
})();
