/* Zing core — extra practice and habit mechanics:
   Speed run (90-second sprint), Fill the gap (complete the definition), daily challenges,
   and challenge-a-friend links (same questions, score to beat, no account needed). */
(function () {
  'use strict';
  const EF = window.EF;
  const esc = EF.esc, icon = EF.icon;
  const ls = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };

  /* Seeded random numbers: a challenge link gives a friend the very same questions in the same order */
  EF.rng = (seed) => {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };
  EF.shuffleWith = (arr, rnd) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // plain text from our own HTML snippets (an inert document: nothing in it can run or load)
  EF.htmlText = (h) => new DOMParser().parseFromString(String(h == null ? '' : h), 'text/html').body.textContent.replace(/\s+/g, ' ').trim();
  const dayKey = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

  /* ================= DAILY CHALLENGES =================
     Three small goals a day: one habit, one accuracy, one game. Each is worth +15 XP. */
  const POOL = {
    habit: [
      { id: 'topics', n: 2, label: 'Read 2 topics in a study guide', pic: 'book' },
      { id: 'cards', n: 15, label: 'Review 15 flashcards', pic: 'cards' }
    ],
    skill: [
      { id: 'correct', n: 10, label: 'Get 10 answers right', pic: 'target' },
      { id: 'row', n: 5, label: 'Get 5 right in a row', pic: 'fire' },
      { id: 'quiz80', n: 1, label: 'Score 80% or more on a quiz', pic: 'trophy' }
    ],
    play: [
      { id: 'speed', n: 1, label: 'Finish a Speed run', pic: 'stopwatch' },
      { id: 'gap', n: 6, label: 'Fill 6 gaps in Fill the gap', pic: 'pencil' },
      { id: 'match', n: 1, label: 'Finish a Match game', pic: 'puzzle' },
      { id: 'fixed', n: 3, label: 'Fix 3 questions you missed before', pic: 'medal', needs: () => EF.store.state().mistakes.length >= 3 }
    ]
  };
  const ALL = [].concat(POOL.habit, POOL.skill, POOL.play);
  let daily = null;
  function loadDaily() {
    const today = dayKey();
    if (daily && daily.day === today) return daily;
    try { daily = JSON.parse(ls.get('ef2:daily') || 'null'); } catch (e) { daily = null; }
    if (!daily || daily.day !== today || !Array.isArray(daily.picks)) {
      const seed = today.split('').reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) | 0, 7);
      const rnd = EF.rng(seed);
      const pick = (list) => { const ok = list.filter((c) => !c.needs || c.needs()); return ok[Math.floor(rnd() * ok.length)].id; };
      daily = { day: today, picks: [pick(POOL.habit), pick(POOL.skill), pick(POOL.play)], counts: {}, done: [] };
      ls.set('ef2:daily', JSON.stringify(daily));
    }
    return daily;
  }
  const saveDaily = () => ls.set('ef2:daily', JSON.stringify(daily));
  function check(id) {
    const d = loadDaily(), c = ALL.find((x) => x.id === id);
    if (!c || d.done.includes(id) || (d.counts[id] || 0) < c.n) return;
    d.done.push(id); saveDaily();
    EF.store.addXP(15);
    EF.toast(`Challenge done: ${c.label} · +15 XP`, 'fa-trophy');
    if (d.done.length === d.picks.length) { setTimeout(() => { EF.toast('All 3 daily challenges done. Legend! +20 XP', 'fa-crown'); EF.store.addXP(20); EF.confetti(); }, 900); }
    EF.emit('daily', d);
  }
  EF.daily = {
    list() {
      const d = loadDaily();
      return d.picks.map((id) => { const c = ALL.find((x) => x.id === id) || ALL[0]; const have = Math.min(c.n, d.counts[id] || 0); return Object.assign({}, c, { have, done: d.done.includes(id) }); });
    },
    bump(id, by) {
      const d = loadDaily();
      if (!d.picks.includes(id) || d.done.includes(id)) return;
      d.counts[id] = (d.counts[id] || 0) + (by || 1); saveDaily();
      EF.emit('daily', d); check(id);
    },
    max(id, v) {
      const d = loadDaily();
      if (!d.picks.includes(id) || d.done.includes(id) || !(v > (d.counts[id] || 0))) return;
      d.counts[id] = v; saveDaily();
      EF.emit('daily', d); check(id);
    }
  };
  /* the card on the home page (and the progress page) */
  // each challenge links straight to the place you can do it (your latest subject)
  const GO = { topics: 's', cards: 'cards', correct: 'learn', row: 'learn', quiz80: 'quiz', speed: 'speed', gap: 'gap', match: 'match' };
  const goHref = (id) => {
    if (id === 'fixed') return '#/quiz/mistakes';
    const st = EF.store.state();
    // no history yet: start with the newest grade's first subject
    const pool = (EF.inGrade && EF.grade ? EF.inGrade(EF.grade()) : EF.subjects).filter((x) => x.flashcards && x.flashcards.length)
      .map((x, k) => [x, k]).sort((a, b2) => ((EF.gradeOf ? EF.gradeOf(b2[0]) : 0) - (EF.gradeOf ? EF.gradeOf(a[0]) : 0)) || a[1] - b2[1]).map((x) => x[0]);
    const s = (st.last && EF.subject(st.last.s) && !EF.subject(st.last.s).custom && EF.subject(st.last.s)) || pool[0] || EF.subjects[0];
    return '#/' + GO[id] + '/' + s.id;
  };
  EF.dailyCard = () => {
    const list = EF.daily.list(), done = list.filter((c) => c.done).length;
    return `<section class="daily-card" data-daily-card aria-label="Today's challenges">
      <div class="daily-head"><strong>${icon('fa-calendar-check')} Today’s challenges</strong><span>${done}/${list.length} done</span></div>
      <ul>${list.map((c) => `<li class="${c.done ? 'is-done' : ''}"><a href="${goHref(c.id)}">
        ${EF.img3d(c.done ? 'check' : c.pic, 30)}
        <div><span>${esc(c.label)}</span><span class="daily-bar" aria-hidden="true"><span style="width:${(c.have / c.n) * 100}%"></span></span></div>
        <b>${c.done ? '+15' : `${c.have}/${c.n}`}</b>
      </a></li>`).join('')}</ul>
      <p class="daily-foot">${icon('fa-snowflake')} ${EF.store.freezes() ? `${EF.store.freezes()} streak freeze${EF.store.freezes() > 1 ? 's' : ''} ready: a missed day won’t break your streak` : 'Hit your daily goal 3 times to earn a streak freeze'}</p>
    </section>`;
  };
  // keep any visible challenge card fresh
  EF.on('daily', () => { document.querySelectorAll('[data-daily-card]').forEach((el) => { el.outerHTML = EF.dailyCard(); }); });
  EF.on('freeze-earned', () => EF.toast('You earned a streak freeze! It saves your streak if you miss a day.', 'fa-snowflake'));
  EF.on('freeze-used', (n) => EF.toast(`Streak saved! ${n} streak freeze${n > 1 ? 's' : ''} covered the day${n > 1 ? 's' : ''} you missed.`, 'fa-snowflake'));

  /* ================= CHALLENGE A FRIEND =================
     A link carries the subject, a seed, your score and your name. Your friend plays the same
     questions and sees who won. Nothing is stored on a server. */
  const b64 = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64 = (s) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
  const cleanName = (n) => String(n || '').replace(/[^\p{L}\p{N} _.'-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 20);
  EF.vs = {
    encode: (c) => b64(JSON.stringify({ m: c.m, s: c.s, seed: c.seed >>> 0, sc: c.sc | 0, of: c.of | 0, n: cleanName(c.n) })),
    decode(code) {
      try {
        const x = JSON.parse(unb64(String(code || '')));
        const s = EF.subject(x.s);
        if (!s || s.custom || !/^(quiz|speed)$/.test(x.m)) return null;
        const sc = Math.max(0, Math.min(999, x.sc | 0)), of = Math.max(0, Math.min(99, x.of | 0));
        return { m: x.m, s: s.id, seed: (x.seed >>> 0) || 1, sc, of, n: cleanName(x.n) || 'A friend' };
      } catch (e) { return null; }
    },
    myName() {
      const me = EF.cloud && EF.cloud.joined && EF.cloud.joined() ? EF.cloud.cachedMe() : null;
      return cleanName((me && me.username) || ls.get('ef2:nick') || '');
    },
    /* share a challenge; asks for a first name once if we don't know it */
    send(c) {
      let name = EF.vs.myName();
      if (!name) {
        name = cleanName(window.prompt('Your first name (so your friend knows who challenged them):', '') || '');
        if (!name) return;
        ls.set('ef2:nick', name);
      }
      const s = EF.subject(c.s);
      const url = location.href.split('#')[0] + '#/vs/' + EF.vs.encode(Object.assign({}, c, { n: name }));
      const text = c.m === 'speed' ? `I got ${c.sc} right in a 90-second ${s.short} Speed run on Zing. Beat that!` : `I scored ${c.sc}/${c.of} on the ${s.name} quiz on Zing. Think you can beat me?`;
      const done = (how) => EF.toast(how === 'copied' ? 'Challenge link copied: send it to a friend!' : 'Challenge sent!', 'fa-user-group');
      if (navigator.share) navigator.share({ title: 'Zing challenge', text, url }).then(() => done('shared')).catch(() => {});
      else if (navigator.clipboard) navigator.clipboard.writeText(text + ' ' + url).then(() => done('copied')).catch(() => window.prompt('Copy this link:', url));
      else window.prompt('Copy this link:', url);
    },
    /* the "who won" banner at the end of a challenge */
    verdict(c, mine, of) {
      const unit = c.m === 'speed' ? '' : '/' + of;
      const win = mine > c.sc, tie = mine === c.sc;
      return `<div class="vs-verdict ${win ? 'is-win' : tie ? 'is-tie' : 'is-lose'}">
        ${EF.img3d(win ? 'trophy' : tie ? 'people' : 'fire', 44)}
        <div><strong>${win ? `You beat ${esc(c.n)}!` : tie ? `It’s a tie with ${esc(c.n)}!` : `${esc(c.n)} wins this time`}</strong>
        <span>You ${mine}${unit} · ${esc(c.n)} ${c.sc}${unit}</span></div>
        <button type="button" class="btn btn-c btn-sm" data-vs-back>${icon('fa-paper-plane')} Send it back</button>
      </div>`;
    }
  };

  /* ================= QUESTION POOL (Speed run and Live) =================
     every card in the subject's deck, asked once: quiz questions as they are, other cards as
     multiple choice. A card's own wrong answers come first; otherwise wrong answers come from
     cards on the same topic, then from answers of a similar length, so they look believable. */
  const qKey = (t) => String(t).replace(/<[^>]+>/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  // every question a deck can ask (its quiz + multiple choice made from its cards); with a tag, only that topic's
  function pool(s, rnd, tag) {
    const out = [], asked = new Set();
    (s.quiz || []).forEach((q) => { asked.add(qKey(q.q)); if (tag && q.tag !== tag) return; out.push({ q: q.q, ctx: q.ctx, options: q.options.slice(), answer: q.answer }); });
    const all = (s.flashcards || []).filter((c) => c[1].length <= 110), cards = tag ? all.filter((c) => c[2] === tag) : all;
    cards.forEach((c) => {
      if (c[5] === 'quiz' || asked.has(qKey(esc(c[0])))) return;
      let wrong = Array.isArray(c[3]) && c[3].length >= 3 ? c[3].slice(0, 3) : null;
      if (!wrong) {
        const others = all.filter((d) => d !== c && d[1] !== c[1]);
        const near = (list) => EF.shuffleWith(list, rnd).sort((a, b) => Math.abs(a[1].length - c[1].length) - Math.abs(b[1].length - c[1].length));
        const same = c[2] ? near(others.filter((d) => d[2] === c[2])) : [];
        wrong = same.concat(near(others.filter((d) => !same.includes(d)))).slice(0, 3).map((d) => d[1]);
      }
      if (wrong.length < 3) return;
      const opts = EF.shuffleWith([c[1]].concat(wrong), rnd).map(esc);
      out.push({ q: esc(c[0]), options: opts, answer: opts.indexOf(esc(c[1])) });
    });
    // passages make a sprint too slow: leave those questions out
    return EF.shuffleWith(out.filter((x) => !x.ctx), rnd).map((x) => {
      const order = EF.shuffleWith(x.options.map((_, k) => k), rnd);
      return { q: x.q, options: order.map((k) => x.options[k]), answer: order.indexOf(x.answer) };
    });
  }

  EF.questionPool = pool;

  /* ================= SPEED RUN ================= */
  const SPEED_MS = 90000;
  const bestSpeed = (sid) => { try { return (JSON.parse(ls.get('ef2:speed') || '{}')[sid]) || 0; } catch (e) { return 0; } };
  const setBestSpeed = (sid, n) => { let m = {}; try { m = JSON.parse(ls.get('ef2:speed') || '{}'); } catch (e) { /* */ } if (n > (m[sid] || 0)) { m[sid] = n; ls.set('ef2:speed', JSON.stringify(m)); return true; } return false; };
  EF.bestSpeed = bestSpeed;

  EF.mountSpeed = (el, sid, opts = {}) => {
    const s = EF.subject(sid);
    const vs = opts.vs ? EF.vs.decode(opts.vs) : null;
    let items = [], i = 0, score = 0, row = 0, bestRow = 0, endAt = 0, timer = null, phase = 'start', lock = false, seed = 0;
    el.classList.add('speed', 'tint'); el.style.setProperty('--c', s.color);
    const fmt = (ms) => { const t = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };

    function intro() {
      phase = 'start';
      const best = bestSpeed(sid);
      el.innerHTML = `<div class="speed-start">
        ${EF.img3d('stopwatch', 64)}
        <div><h3>${vs ? `Beat ${esc(vs.n)}’s ${vs.sc} in 90 seconds` : '90 seconds. As many as you can.'}</h3>
        <p class="muted">Tap the right answer. A wrong answer just shows you the right one and moves on, so keep going.${best ? ` Your best: <strong>${best}</strong>.` : ''}</p></div>
        <button type="button" class="btn btn-c btn-lg" data-sgo>${icon('fa-play')} Start</button>
      </div>`;
    }
    function start() {
      seed = vs ? vs.seed : (Math.random() * 4294967295) >>> 0;
      items = pool(s, EF.rng(seed));
      if (items.length < 4) { el.innerHTML = `<p class="muted">Speed run needs a few more questions in this set.</p>`; return; }
      i = 0; score = 0; row = 0; bestRow = 0; phase = 'run'; lock = false;
      endAt = Date.now() + SPEED_MS;
      render();
      clearInterval(timer);
      timer = setInterval(tick, 200);
    }
    function tick() {
      const left = endAt - Date.now();
      const t = el.querySelector('.speed-time'), bar = el.querySelector('.speed-bar > span');
      if (t) { t.textContent = fmt(left); t.classList.toggle('is-low', left < 10000); }
      if (bar) bar.style.width = Math.max(0, (left / SPEED_MS) * 100) + '%';
      if (left <= 0) finish();
    }
    function render() {
      const q = items[i % items.length];
      el.innerHTML = `<div class="speed-top"><span class="speed-time">${fmt(endAt - Date.now())}</span><span class="speed-bar" aria-hidden="true"><span style="width:${((endAt - Date.now()) / SPEED_MS) * 100}%"></span></span><span class="speed-score">${icon('fa-check')} ${score}</span>${row >= 3 ? `<span class="speed-row">${icon('fa-fire')} ${row}</span>` : ''}</div>
        <h3 class="quiz-q speed-q">${q.q}</h3>
        <div class="quiz-opts">${q.options.map((o, k) => `<button type="button" class="opt" data-sopt="${k}"><span class="opt-key">${k + 1}</span><span>${o}</span></button>`).join('')}</div>`;
    }
    function choose(k) {
      if (phase !== 'run' || lock) return;
      const q = items[i % items.length], ok = k === q.answer;
      lock = true;
      const btns = el.querySelectorAll('[data-sopt]');
      btns.forEach((b, bk) => { b.disabled = true; if (bk === q.answer) b.classList.add('is-right'); else if (bk === k) b.classList.add('is-wrong'); else b.classList.add('is-dim'); });
      if (ok) { score++; row++; bestRow = Math.max(bestRow, row); EF.store.addXP(2); EF.haptic('success'); if (EF.daily) { EF.daily.bump('correct'); EF.daily.max('row', row); } }
      else { row = 0; EF.haptic('error'); }
      setTimeout(() => { lock = false; if (phase !== 'run') return; i++; render(); }, ok ? 260 : 900);
    }
    function finish() {
      if (phase !== 'run') return;
      phase = 'done'; clearInterval(timer);
      const pb = setBestSpeed(sid, score);
      EF.store.addXP(5); EF.store.touchDay();
      if (EF.daily) EF.daily.bump('speed');
      if (pb && score >= 5) EF.confetti();
      el.innerHTML = `<div class="speed-done">
        ${EF.mascot ? EF.mascot(score >= 10 ? 'cheer' : 'read', 110) : ''}
        <h3>${score} right in 90 seconds${pb && score ? ' · new best!' : ''}</h3>
        <p class="muted">Best streak ${bestRow} · Personal best ${bestSpeed(sid)}</p>
        ${vs ? EF.vs.verdict(vs, score, 0) : ''}
        <div class="btn-row center">
          <button type="button" class="btn btn-c" data-sagain>${icon('fa-rotate-right')} Play again</button>
          ${vs ? '' : `<button type="button" class="btn" data-schallenge>${icon('fa-user-group')} Challenge a friend</button>`}
          <a class="btn btn-ghost" href="#/set/${esc(sid)}">Other modes</a>
        </div>
      </div>`;
    }
    const onClick = (e) => {
      const t = e.target.closest('button'); if (!t || !el.contains(t)) return;
      if (t.hasAttribute('data-sgo') || t.hasAttribute('data-sagain')) start();
      else if (t.dataset.sopt != null) choose(+t.dataset.sopt);
      else if (t.hasAttribute('data-schallenge')) EF.vs.send({ m: 'speed', s: sid, seed, sc: score, of: 0 });
      else if (t.hasAttribute('data-vs-back')) EF.vs.send({ m: 'speed', s: sid, seed: vs.seed, sc: score, of: 0 });
    };
    const onKey = (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey || phase !== 'run') return;
      if (/^[1-4]$/.test(e.key)) { e.preventDefault(); choose(+e.key - 1); }
    };
    el.addEventListener('click', onClick); document.addEventListener('keydown', onKey);
    intro();
    return () => { clearInterval(timer); el.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey); };
  };

  /* ================= FILL THE GAP =================
     Each definition loses one key word; pick the word that completes it. Builds exact recall of definitions. */
  const STOP = new Set('about above after again against along also although among another because before being below between both cannot could different does doing during each either every from further have having into itself just made makes many might more most much must near never often only other others over same should since some such than that their them then there these they this those through under until upon very were what when where which while whose will with within without would your'.split(' '));
  const keyWord = (text, avoid) => {
    const words = (text.match(/[A-Za-z][A-Za-z'’-]{4,}/g) || []).filter((w) => !STOP.has(w.toLowerCase()) && !avoid.includes(w.toLowerCase()));
    return words.sort((a, b) => b.length - a.length)[0] || null;
  };
  EF.mountGap = (el, sid) => {
    const s = EF.subject(sid);
    const ROUND = 8;
    let items = [], i = 0, right = 0, picked = null;
    el.classList.add('gap', 'tint'); el.style.setProperty('--c', s.color);
    function build() {
      const cards = EF.shuffle(s.flashcards.slice()).filter((c) => c[1].split(/\s+/).length >= 4 && c[1].length <= 200);
      const made = [];
      const bank = [];
      cards.forEach((c) => { const avoid = c[0].toLowerCase().split(/[^a-z']+/); const w = keyWord(c[1], avoid); if (w) { made.push({ c, w }); bank.push(w); } });
      return made.slice(0, ROUND).map(({ c, w }) => {
        const near = EF.shuffle(bank.filter((x) => x.toLowerCase() !== w.toLowerCase())).sort((a, b) => Math.abs(a.length - w.length) - Math.abs(b.length - w.length));
        const others = []; near.forEach((x) => { if (others.length < 3 && !others.some((o) => o.toLowerCase() === x.toLowerCase())) others.push(x); });
        const at = c[1].indexOf(w);
        return { term: c[0], before: c[1].slice(0, at), after: c[1].slice(at + w.length), w, options: EF.shuffle([w].concat(others)) };
      }).filter((x) => x.options.length >= 3);
    }
    function start() { items = build(); i = 0; right = 0; picked = null; if (items.length < 3) { el.innerHTML = `<p class="muted">Fill the gap needs a few longer definitions in this set.</p>`; return; } render(); }
    function render() {
      if (i >= items.length) return finish();
      const it = items[i];
      el.innerHTML = `<div class="learn-top"><div class="learn-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${items.length}" aria-valuenow="${i}" aria-label="Progress"><span style="width:${(i / items.length) * 100}%"></span></div><span class="speed-score">${icon('fa-check')} ${right}</span></div>
        <div class="gap-card is-in">
          <h3 class="gap-term">${esc(it.term)}</h3>
          <p class="gap-def">${esc(it.before)}<span class="gap-slot${picked == null ? '' : picked === it.w ? ' is-right' : ' is-wrong'}">${picked == null ? '<span class="sr-only">blank</span>' : esc(it.w)}</span>${esc(it.after)}</p>
          <div class="gap-opts">${it.options.map((o, k) => `<button type="button" class="chip-btn gap-opt${picked == null ? '' : o === it.w ? ' is-right' : o === picked ? ' is-wrong' : ' is-dim'}" data-gopt="${k}" ${picked == null ? '' : 'disabled'}>${esc(o)}</button>`).join('')}</div>
          ${picked == null ? '' : `<div class="quiz-next"><button type="button" class="btn btn-c" data-gnext>${i + 1 < items.length ? 'Next ' + icon('fa-arrow-right') : 'See results ' + icon('fa-flag-checkered')}</button></div>`}
        </div>`;
      const nb = el.querySelector('[data-gnext]'); if (nb) nb.focus({ preventScroll: true });
    }
    function choose(k) {
      if (picked != null) return;
      const it = items[i]; picked = it.options[k];
      const ok = picked === it.w;
      if (ok) { right++; EF.store.addXP(5); EF.haptic('success'); if (EF.daily) { EF.daily.bump('gap'); EF.daily.bump('correct'); } }
      else EF.haptic('error');
      EF.store.touchDay();
      render();
    }
    function finish() {
      const pct = Math.round((right / items.length) * 100);
      if (pct >= 80) EF.confetti();
      el.innerHTML = `<div class="learn-card learn-done is-in">
        ${EF.mascot ? EF.mascot(pct >= 80 ? 'cheer' : pct >= 50 ? 'read' : 'sad', 110) : ''}
        <h2>${right} of ${items.length} gaps filled</h2>
        <p class="muted">${pct >= 80 ? 'Your definitions are sharp.' : 'Definitions win marks: run it again and they stick.'}</p>
        <div class="btn-row center"><button type="button" class="btn btn-c" data-gagain>${icon('fa-rotate-right')} New round</button><a class="btn" href="#/set/${esc(sid)}">Other modes</a></div>
      </div>`;
    }
    const onClick = (e) => {
      const t = e.target.closest('button'); if (!t || !el.contains(t)) return;
      if (t.dataset.gopt != null) choose(+t.dataset.gopt);
      else if (t.hasAttribute('data-gnext')) { i++; picked = null; render(); }
      else if (t.hasAttribute('data-gagain')) start();
    };
    const onKey = (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (picked == null && /^[1-4]$/.test(e.key)) { const b = el.querySelector(`[data-gopt="${+e.key - 1}"]`); if (b) { e.preventDefault(); b.click(); } }
      else if (picked != null && e.key === 'Enter') { const b = el.querySelector('[data-gnext]'); if (b && document.activeElement !== b) { e.preventDefault(); b.click(); } }
    };
    el.addEventListener('click', onClick); document.addEventListener('keydown', onKey);
    start();
    return () => { el.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey); };
  };
})();
