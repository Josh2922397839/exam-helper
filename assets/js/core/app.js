/* ExamForge core — app shell, router, pages, search and keyboard shortcuts */
(function () {
  'use strict';
  const EF = window.EF;
  const esc = EF.esc, icon = EF.icon, $ = EF.$, $$ = EF.$$;
  const main = $('#main');
  const sidebar = $('#sidebar');
  let cleanup = [];       // functions to run when leaving the current page
  let viewKey = '';       // e.g. "home", "s:chemistry", "quiz:exam"
  let spy = null;

  const totals = (list) => ({
    questions: list.reduce((n, s) => n + s.quiz.length, 0),
    cards: list.reduce((n, s) => n + (s.flashcards || []).length, 0),
    topics: list.reduce((n, s) => n + s.topics.length, 0)
  });
  /* Grade switch + grids grouped by grade (both only appear once there's more than one grade) */
  const gradeSwitch = () => EF.multiGrade() ? `<div class="seg seg-sm grade-switch" role="tablist" aria-label="Grade">${['all'].concat(EF.grades()).map((g) => `<button type="button" role="tab" data-set-grade="${g}" aria-selected="${String(EF.grade()) === String(g)}">${g === 'all' ? 'All grades' : 'Grade ' + g}</button>`).join('')}</div>` : '';
  const gradeGrid = (list, card) => {
    if (!EF.multiGrade() || EF.grade() !== 'all') return `<div class="subject-grid">${list.map(card).join('')}</div>`;
    return EF.grades().map((g) => { const l = list.filter((x) => EF.gradeOf(x) === g); return l.length ? `<h3 class="grade-head"><span>Grade ${g}</span><small>${l.length} subject${l.length === 1 ? '' : 's'}</small></h3><div class="subject-grid">${l.map(card).join('')}</div>` : ''; }).join('');
  };
  const vt = (name) => `style="view-transition-name:${name}"`;
  const topicLabel = (t) => t.nav || t.title;
  /* name of the unit a topic opens (subjects made from a study handoff group their topics into units) */
  const unitStart = (s, t) => { const u = (s.units || []).find((x) => x.topics[0] === t.id); return u && s.units.length > 1 ? u.name : ''; };
  const BADGE = { 'Grade 10': 'is-now', 'Grade 9 review': 'is-review', 'Older review': 'is-old' };
  // an unconfirmed badge is a button, so phones (no hover tooltips) can tap it for the reason
  const WHY = 'Grade not confirmed yet: check with your teacher';
  const topicBadge = (t) => (!t.badge ? '' : t.unconfirmed
    ? `<button type="button" class="t-badge ${BADGE[t.badge] || ''}" data-why="${WHY}" title="${WHY}">${esc(t.badge)} ${icon('fa-circle-question')}</button>`
    : `<span class="t-badge ${BADGE[t.badge] || ''}">${esc(t.badge)}</span>`);
  /* Exam traps: tips in order, with any table (e.g. past-paper mistakes) where it sits */
  function traps(s) {
    let out = '', run = [];
    const flush = () => { if (run.length) out += `<ul class="traps">${run.map((x) => `<li>${x}</li>`).join('')}</ul>`; run = []; };
    s.tricky.forEach((x) => { if (typeof x === 'string') run.push(x); else if (x && x.table) { flush(); out += EF.renderBlocks([x.table], s); } });
    flush();
    return out;
  }
  /* Contents card: topics grouped by unit, with read ticks */
  function contents(s, seen) {
    const groups = s.units && s.units.length ? s.units.map((u) => ({ name: u.name, icon: u.icon, list: u.topics.map((id) => s.topics.find((t) => t.id === id)).filter(Boolean) })) : [{ name: '', list: s.topics }];
    let n = 0;
    const view = (() => { try { return localStorage.getItem('ef2:tocView') === 'path' ? 'path' : 'list'; } catch (e) { return 'list'; } })();
    const toggle = `<div class="seg seg-sm toc-view" role="tablist" aria-label="Contents view"><button type="button" role="tab" data-toc-view="list" aria-selected="${view === 'list'}">${icon('fa-list-ul')} List</button><button type="button" role="tab" data-toc-view="path" aria-selected="${view === 'path'}">${icon('fa-route')} Path</button></div>`;
    if (view === 'path') {
      const nextId = (s.topics.find((t) => !seen.includes(t.id)) || {}).id;
      let k = 0;
      return `<nav class="toc card is-path" id="contents" aria-label="Learning path for ${esc(s.name)}">
        <div class="toc-head"><h2>${icon('fa-route')} Path</h2>${toggle}</div>
        ${groups.map((g) => `${g.name ? `<h3 class="path-unit">${g.icon ? icon(g.icon) : ''}${esc(g.name)}</h3>` : ''}
          <ol class="path">${g.list.map((t) => { const x = [0, 1, 0, -1][k++ % 4]; const st = seen.includes(t.id) ? 'is-done' : t.id === nextId ? 'is-next' : ''; return `<li style="--x:${x}"><a class="pnode ${st}" href="#/s/${s.id}/${t.id}" data-topic="${t.id}"><span class="pnode-ic">${seen.includes(t.id) ? icon('fa-check') : icon(t.icon || 'fa-book-open')}</span><span class="pnode-lb">${t.id === nextId ? '<small>Up next</small>' : ''}${esc(topicLabel(t))}</span></a></li>`; }).join('')}</ol>`).join('')}
        <ol class="path"><li style="--x:0"><a class="pnode pnode-quiz" href="#/s/${s.id}/quiz" data-topic="quiz"><span class="pnode-ic">${EF.img3d('trophy', 34)}</span><span class="pnode-lb">Final quiz</span></a></li></ol>
      </nav>`;
    }
    return `<nav class="toc card" id="contents" aria-label="Contents of ${esc(s.name)}">
      <div class="toc-head"><h2>${icon('fa-list-ul')} Contents</h2>${toggle}</div>
      <div class="toc-groups${groups.length > 1 ? ' is-multi' : ''}">${groups.map((g) => `
        <div class="toc-group">${g.name ? `<h3>${g.icon ? icon(g.icon) : ''}${esc(g.name)}</h3>` : ''}
          <ol>${g.list.map((t) => { n++; return `<li><a href="#/s/${s.id}/${t.id}" data-topic="${t.id}"${seen.includes(t.id) ? ' class="is-read"' : ''}><span class="toc-n">${seen.includes(t.id) ? icon('fa-check') : n}</span><span class="toc-t">${esc(topicLabel(t))}</span></a></li>`; }).join('')}</ol>
        </div>`).join('')}
      </div>
      <div class="toc-foot">${s.tricky && s.tricky.length ? `<a class="chip-link" href="#/s/${s.id}/traps" data-topic="traps">${icon('fa-triangle-exclamation')} Exam traps</a>` : ''}<a class="chip-link chip-quiz" href="#/s/${s.id}/quiz" data-topic="quiz">${icon('fa-bolt')} Quiz</a><a class="chip-link" href="#/cards/${s.id}">${icon('fa-clone')} Flashcards</a></div>
    </nav>`;
  }

  /* ================= SIDEBAR ================= */
  let lastSidebar = '';
  // theme button: the 3D sun/moon in the top bar, sun/moon plus words in the phone menu
  function themeFace(t, labelled) {
    const dark = t === 'dark';
    return labelled ? `${EF.img3d(dark ? 'sun' : 'moon', 30)}<span>${dark ? 'Light mode' : 'Dark mode'}</span>` : EF.img3d(dark ? 'sun' : 'moon', 24);
  }
  function renderSidebar() {
    const [a, sid] = parts();
    const here = a === 's' ? sid : null;
    const link = (href, art, label, key, extra) => `<a class="side-link${current(key) ? ' is-active' : ''}" href="${href}" ${current(key) ? 'aria-current="page"' : ''}>${art}<span>${label}</span>${extra || ''}</a>`;
    const navItem = (href, img, label, key, extra) => link(href, EF.img3d(img, 30), label, key, extra);
    const mistakes = EF.store.state().mistakes.length;
    const me = EF.cloud.joined() ? EF.cloud.cachedMe() : null;
    const st = EF.store.state(), lastS = st.last && EF.subject(st.last.s);
    const mine = EF.sets.list();
    const html = `
      <a class="side-brand" href="#/" aria-label="ExamForge home"><span class="brand-mark" aria-hidden="true"><img src="assets/img/emby-mark.svg" alt="" width="44" height="48"></span><span class="brand-name">Exam<b>Forge</b></span></a>
      <nav class="side-nav" aria-label="Main">
        ${navItem('#/', 'home', 'Home', 'home')}
        ${navItem('#/league', 'trophy', 'Leagues', 'league')}
        ${navItem('#/cards', 'cards', 'Study sets', 'cards')}
        ${navItem('#/quiz', 'bolt', 'Quiz Arena', 'quiz', mistakes ? `<span class="side-badge" title="Saved mistakes">${mistakes}</span>` : '')}
        ${navItem('#/sets', 'memo', 'My sets', 'sets')}
        ${navItem('#/progress', 'chart', 'Progress', 'progress')}
        ${me ? link('#/me', EF.myAvatar(me, 30), esc(me.username), 'me') : navItem('#/me', 'wave', 'Profile', 'me')}
        <button type="button" class="side-link side-theme" data-theme-toggle data-label aria-label="${EF.theme.get() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}">${themeFace(EF.theme.get(), true)}</button>
      </nav>
      <div class="side-cta">
        <a class="btn btn-ink btn-block side-study" href="${lastS ? '#/learn/' + lastS.id : '#/cards'}">${EF.img3d('game', 26)} Study</a>
        <a class="btn btn-block side-add" href="#/make">${icon('fa-plus')} Make a set</a>
      </div>
      ${(EF.multiGrade() ? EF.grades().map((g) => [g, EF.inGrade(g)]) : [[null, EF.subjects]]).map(([g, list]) => `
      <div class="side-head"><span>${g ? 'Grade ' + g : 'My subjects'}</span></div>
      <ul class="side-subjects">
        ${list.map((s) => {
          const on = here === s.id;
          const p = EF.store.progress(s.id);
          const seen = EF.store.state().visited[s.id] || [];
          return `<li class="side-subject tint${on ? ' is-open' : ''}" style="--c:${s.color}">
            <a class="side-link side-deck" href="#/s/${s.id}" ${on ? 'aria-current="page"' : ''}><span class="side-sq" aria-hidden="true"></span><span>${esc(s.name)}</span>${p.pct ? `<span class="side-pct" title="${p.pct}% complete">${p.pct}%</span>` : ''}</a>
            ${on ? `<ul class="side-topics">${s.topics.map((t) => `${unitStart(s, t) ? `<li class="side-unit" aria-hidden="true">${esc(unitStart(s, t))}</li>` : ''}<li><a href="#/s/${s.id}/${t.id}" data-topic="${t.id}">${seen.includes(t.id) ? icon('fa-circle-check', 'seen') : '<i class="dot-o" aria-hidden="true"></i>'}${esc(topicLabel(t))}</a></li>`).join('')}
              <li><a href="#/s/${s.id}/quiz" data-topic="quiz">${icon('fa-bolt')}Quiz</a></li>
              <li><a href="#/learn/${s.id}">${icon('fa-graduation-cap')}Learn</a></li>
              <li><a href="#/cards/${s.id}">${icon('fa-clone')}Flashcards</a></li></ul>` : ''}
          </li>`;
        }).join('')}
      </ul>`).join('')}
      ${mine.length ? `<div class="side-head"><span>My sets</span><a class="side-head-add" href="#/make" aria-label="Make a set">${icon('fa-plus')}</a></div>
      <ul class="side-subjects">${mine.slice(0, 8).map((x) => `<li class="side-subject tint" style="--c:${esc(x.color)}"><a class="side-link side-deck" href="#/set/${esc(x.id)}"><span class="side-sq" aria-hidden="true"></span><span>${esc(x.name)}</span></a></li>`).join('')}</ul>` : ''}
      <div class="side-foot">
        ${installEvt ? `<button type="button" class="btn btn-sm side-install" data-install>${icon('fa-download')} Install app</button>` : ''}
        <span><kbd>/</kbd> search</span><span><kbd>D</kbd> theme</span><button type="button" class="link" data-keys><kbd>?</kbd></button>
      </div>`;
    if (html === lastSidebar) { if (here && spy && spy.active) markTopic(spy.active); return; }
    lastSidebar = html;
    sidebar.innerHTML = html;
    if (here && here !== lastOpen) { const st2 = $('.side-topics', sidebar); if (st2) st2.classList.add('is-entering'); }
    lastOpen = here;
    if (here && spy && spy.active) markTopic(spy.active);
  }
  let lastOpen = null;
  function current(key) {
    const k = viewKey.split(':')[0];
    return viewKey === key || k === key || (key === 'cards' && ['set', 'learn', 'match'].includes(k)) || (key === 'sets' && ['make', 'import'].includes(k)) || (key === 'league' && ['join', 'school', 'shared'].includes(k)) || (key === 'me' && ['account', 'u'].includes(k));
  }

  /* ================= PAGES ================= */
  const pages = {};

  /* A study tile in the style of a card deck: coloured band, 3D icon, title, progress ring */
  const deckTile = (s) => {
    const p = EF.store.progress(s.id);
    return `<a class="deck-tile tint" href="#/s/${s.id}" style="--c:${s.color}">
      <span class="deck-band"><span class="deck-3d" ${vt('icon-' + s.id)}>${EF.subject3d(s.id, 60)}</span></span>
      <span class="deck-body"><strong><span ${vt('title-' + s.id)}>${esc(s.name)}</span></strong><small>${s.topics.length} topics · ${(s.flashcards || []).length} cards</small></span>
      <span class="deck-prog" title="${p.pct}% complete">${EF.ring(p.pct, 38, 4)}</span>
    </a>`;
  };

  function jumpBack(subs, last, lastTopic) {
    const items = [];
    if (last) { const p = EF.store.progress(last.id); items.push({ href: '#/s/' + last.id + (lastTopic ? '/' + lastTopic.id : ''), title: lastTopic ? topicLabel(lastTopic) : last.name, sub: (lastTopic ? 'Topic · ' : 'Subject · ') + last.short, pct: p.pct, c: last.color, id: last.id }); }
    subs.map((s) => [s, EF.store.progress(s.id)]).filter(([s, p]) => p.pct > 0 && p.pct < 100 && (!last || s.id !== last.id)).sort((x, y) => y[1].pct - x[1].pct).slice(0, Math.max(0, 3 - items.length))
      .forEach(([s, p]) => items.push({ href: '#/s/' + s.id, title: s.name, sub: `Subject · ${p.visited}/${p.total} topics`, pct: p.pct, c: s.color, id: s.id }));
    EF.sets.list().forEach((x) => { if (items.length < 4) { const s = EF.sets.get(x.id); items.push({ href: '#/set/' + s.id, title: s.name, sub: `My set · ${s.flashcards.length} cards`, pct: Math.round((EF.store.mastered(s.id) / Math.max(1, s.flashcards.length)) * 100), c: s.color, id: s.id }); } });
    if (!items.length) subs.slice().sort((x, y) => EF.gradeOf(y) - EF.gradeOf(x)).slice(0, 4).forEach((s) => items.push({ href: '#/s/' + s.id, title: s.name, sub: `Start here · ${s.topics.length} topics`, pct: 0, c: s.color, id: s.id }));
    return `<section class="home-section"><div class="section-head"><h2>${last ? 'Jump back in' : 'Start here'}</h2><a class="link" href="#/progress">View all</a></div>
      <div class="jump-row">${items.map((it) => `<a class="jump-card tint" href="${it.href}" style="--c:${esc(it.c)}">${EF.ring(it.pct, 50, 5)}<span class="jump-text"><strong>${esc(it.title)}</strong><small>${esc(it.sub)}</small></span><span class="jump-3d">${EF.subject3d(it.id, 36)}</span></a>`).join('')}</div></section>`;
  }

  /* The right-hand panel: invite card + your stats (like an inventory) */
  function rail() {
    const streak = EF.store.streak(), lv = EF.store.level(), today = EF.store.xpToday(), goal = EF.store.goal();
    const me = EF.cloud.joined() ? EF.cloud.cachedMe() : null;
    return `${EF.dailyCard ? EF.dailyCard() : ''}<div class="invite-card">
        <div class="invite-art" aria-hidden="true">${EF.img3d('star', 44)}${EF.img3d('sparkles', 34)}${EF.img3d('rocket', 46)}</div>
        <strong>Study with your friends</strong>
        <span>Share ExamForge and race your crew up the leagues</span>
        <button type="button" class="btn btn-block invite-btn" data-invite>${icon('fa-user-plus')} Invite friends</button>
      </div>
      <div class="stats-card">
        <a class="stats-head" href="#/progress">${EF.img3d('star', 32)}<strong>${EF.store.xp().toLocaleString()}</strong><span>XP · level ${lv.lvl}</span></a>
        <span class="lvl-bar" aria-hidden="true"><span style="width:${lv.pct}%"></span></span>
        <div class="stats-grid">
          <a href="#/progress" title="Day streak">${EF.img3d('fire', 40)}<b>${streak}</b><small>streak</small></a>
          <a href="#/progress" title="Today's goal">${EF.img3d('target', 40)}<b>${today}/${goal}</b><small>today</small></a>
          <a href="#/cards" title="Cards mastered">${EF.img3d('gem', 40)}<b>${EF.subjects.reduce((n, s) => n + EF.store.mastered(s.id), 0)}</b><small>mastered</small></a>
          <a href="#/league" title="Your league">${EF.img3d('trophy', 40)}<b>${me ? esc(EF.cloud.league(me.league)[0]) : '–'}</b><small>league</small></a>
        </div>
      </div>`;
  }
  EF.rail = rail;

  /* one practical line under the greeting: today's goal, cards due, streak */
  function todayLine() {
    const today = EF.store.xpToday(), goal = EF.store.goal(), streak = EF.store.streak();
    const due = EF.subjects.reduce((n, s) => n + EF.store.due(s.id).length, 0);
    const bits = [`${icon('fa-bullseye')} <b>${today}/${goal}</b> XP today`];
    if (due) bits.push(`<a href="#/cards">${icon('fa-clone')} <b>${due}</b> card${due === 1 ? '' : 's'} due</a>`);
    if (streak) bits.push(`${icon('fa-fire')} <b>${streak}</b>-day streak`);
    return bits.map((x) => `<span class="home-sub-item">${x}</span>`).join('<span class="dot-sep" aria-hidden="true">·</span>');
  }

  pages.home = () => {
    const st = EF.store.state();
    const last = st.last && EF.subject(st.last.s);
    const lastTopic = last && last.topics.find((t) => t.id === st.last.t);
    const subs = EF.inGrade(EF.grade());
    const g = EF.grade();
    const me = EF.cloud.joined() ? EF.cloud.cachedMe() : null;
    const h = new Date().getHours();
    const hello = (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening') + (me ? ', ' + esc(me.username) : '');
    return `
      <div class="page has-rail home">
        <div class="page-main">
          <section class="home-hero">
            <div class="home-mascot">${EF.mascot('read', 112)}</div>
            <div class="home-hello">
              <span class="home-hi">${hello}!</span>
              <h1>What shall we study today?</h1>
              <p class="home-sub">${todayLine()}</p>
            </div>
          </section>
          <div class="ask">
            <button type="button" class="ask-input" data-search-open><span>I want to study…</span>${EF.img3d('search', 28)}</button>
            <div class="ask-row">
              <a class="ask-btn" href="#/make">${EF.img3d('clipboard', 26)} Paste notes</a>
              <a class="ask-btn" href="${last ? '#/learn/' + last.id : '#/learn/' + subs[0].id}">${EF.img3d('grad', 26)} Learn</a>
              <a class="ask-btn" href="#/quiz/exam${g === 'all' ? '' : g}">${EF.img3d('bolt', 26)} Exam mode</a>
              <a class="ask-btn" href="#/cards">${EF.img3d('cards', 26)} Study sets</a>
            </div>
          </div>
          ${jumpBack(subs, last, lastTopic)}
          ${EF.cloud.enabled ? '<section class="home-section home-social" data-home-social></section>' : ''}
          <section class="home-section">
            <div class="section-head"><h2>Your subjects</h2>${gradeSwitch()}</div>
            ${gradeGrid(subs, deckTile)}
          </section>
          <section class="home-section rail-inline">${rail()}</section>
        </div>
        <aside class="rail" aria-label="Your stats">${rail()}</aside>
      </div>`;
  };

  pages.subject = (s) => {
    const p = EF.store.progress(s.id);
    const seen = EF.store.state().visited[s.id] || [];
    const same = EF.inGrade(EF.gradeOf(s));
    const idx = same.indexOf(s);
    const prev = same[(idx - 1 + same.length) % same.length];
    const next = same[(idx + 1) % same.length];
    return `
      <div class="page subject tint" style="--c:${s.color}">
        <header class="subject-hero">
          <div class="crumb-row"><a class="crumb" href="#/">${icon('fa-arrow-left')} All subjects</a>${EF.multiGrade() ? `<span class="pill pill-c">Grade ${EF.gradeOf(s)}</span>` : ''}</div>
          <div class="subject-hero-row">
            <span class="subject-emoji subject-emoji-lg" ${vt('icon-' + s.id)}>${EF.subject3d(s.id, 72)}</span>
            <div class="subject-hero-text"><h1><span ${vt('title-' + s.id)}>${esc(s.name)}</span></h1><p>${esc(s.intro)}</p></div>
            ${EF.ring(p.pct, 84, 8)}
          </div>
          <div class="subject-stats">
            <span>${icon('fa-book-open')} <strong>${p.visited}/${p.total}</strong> topics read</span>
            <span>${icon('fa-trophy')} <strong>${p.attempts ? p.best + '%' : '—'}</strong> best quiz</span>
            <span>${icon('fa-medal')} <strong>${p.mastered}/${p.cards}</strong> cards mastered</span>
          </div>
          <div class="btn-row">
            <a class="btn btn-c" href="#/s/${s.id}/quiz">${icon('fa-bolt')} Take the quiz</a>
            <a class="btn" href="#/learn/${s.id}">${icon('fa-graduation-cap')} Learn</a>
            <a class="btn" href="#/cards/${s.id}">${icon('fa-clone')} <span class="lbl-l">Flashcards</span><span class="lbl-s">Cards</span></a>
            <a class="btn" href="#/set/${s.id}">${icon('fa-shapes')} Games</a>
            <button type="button" class="btn btn-ghost" data-print>${icon('fa-print')} Print notes</button>
          </div>
        </header>

        ${contents(s, seen)}

        <a class="toc-float tint" style="--c:${esc(s.color)}" href="#contents" data-toc-float aria-label="Back to contents" hidden>${icon('fa-list-ul')}<span data-toc-now>Contents</span></a>

        ${s.topics.map((t, i) => `
          ${unitStart(s, t) ? `<div class="unit-break" aria-hidden="true"><span>${esc(unitStart(s, t))}</span></div>` : ''}
          <section class="topic" id="t-${t.id}" data-topic="${t.id}" aria-labelledby="h-${t.id}">
            <header class="topic-head">
              <span class="topic-icon">${icon(t.icon || 'fa-bookmark')}</span>
              <div><span class="topic-num">Topic ${i + 1} of ${s.topics.length}${topicBadge(t)}</span><h2 id="h-${t.id}">${esc(t.title)}</h2></div>
              <span class="topic-seen${seen.includes(t.id) ? ' is-on' : ''}" title="Read">${icon('fa-circle-check')}<span class="sr-only">Read</span></span>
            </header>
            ${EF.renderBlocks(t.blocks, s)}
          </section>`).join('')}

        ${s.tricky && s.tricky.length ? `
        <section class="topic topic-traps" id="t-traps" data-topic="traps" aria-labelledby="h-traps">
          <header class="topic-head">
            <span class="topic-icon">${icon('fa-triangle-exclamation')}</span>
            <div><span class="topic-num">Before the exam</span><h2 id="h-traps">Exam traps and tips</h2></div>
          </header>
          ${traps(s)}
        </section>` : ''}

        <section class="topic topic-quiz" id="t-quiz" data-topic="quiz" aria-labelledby="h-quiz">
          <header class="topic-head">
            <span class="topic-icon">${icon('fa-bolt')}</span>
            <div><span class="topic-num">Test yourself</span><h2 id="h-quiz">${esc(s.short)} Quiz</h2></div>
          </header>
          <div class="quiz-host" data-quiz="${s.id}"></div>
          <a class="cta-card" href="#/cards/${s.id}">${icon('fa-clone')}<div><strong>Lock it in with flashcards</strong><span>${(s.flashcards || []).length} cards · spaced repetition</span></div>${icon('fa-arrow-right')}</a>
        </section>

        ${s.source || (s.refs && s.refs.length) ? `<footer class="subject-refs">
          ${s.source ? `<p>${icon('fa-circle-info')} ${esc(s.source)}</p>` : ''}
          ${s.refs && s.refs.length ? `<details><summary>References (${s.refs.length})</summary><ul>${s.refs.map((r) => `<li><a href="${esc(r[1])}" target="_blank" rel="noopener">${esc(r[0])}</a> <small>${esc(r[2])}</small></li>`).join('')}</ul></details>` : ''}
        </footer>` : ''}

        <nav class="pager" aria-label="Other subjects">
          <a href="#/s/${prev.id}" class="pager-link tint" style="--c:${prev.color}"><small>${icon('fa-arrow-left')} Previous</small><span>${EF.subjectIcon(prev.id)} ${esc(prev.name)}</span></a>
          <a href="#/s/${next.id}" class="pager-link pager-next tint" style="--c:${next.color}"><small>Next ${icon('fa-arrow-right')}</small><span>${esc(next.name)} ${EF.subjectIcon(next.id)}</span></a>
        </nav>
      </div>`;
  };

  pages.arena = () => {
    const mistakes = EF.store.state().mistakes.length;
    const g = EF.grade(), examId = 'exam' + (g === 'all' ? '' : g);
    const exam = EF.store.quiz(examId), subs = EF.inGrade(g);
    return `
      <div class="page">
        <header class="page-head"><span class="eyebrow">${icon('fa-bolt')} Quiz Arena</span><h1>Test yourself</h1><p>Every question explains the answer. Get one wrong and it’s saved so you can fix it later.</p>${gradeSwitch()}</header>
        ${EF.cloud.enabled ? `<a class="live-banner" href="#/live">${EF.img3d('people', 44)}<div><strong>Live with friends</strong><span>Host or join a game with a code. Same questions, same time.</span></div><span class="btn btn-primary btn-sm">Play ${icon('fa-arrow-right')}</span></a>` : ''}
        <div class="arena-top">
          <a class="arena-card arena-exam" href="#/quiz/${examId}">
            <span class="arena-ic" ${vt('icon-exam')}>${EF.img3d('fire', 40)}</span>
            <div><h2>${g === 'all' ? '' : 'Grade ' + g + ' '}Exam Mode</h2><p>20 random questions from all ${subs.length} ${g === 'all' ? '' : 'Grade ' + g + ' '}subjects.</p>${exam ? `<span class="pill">${icon('fa-trophy')} Best ${exam.best}%</span>` : ''}</div>
            <span class="btn btn-primary">Start ${icon('fa-arrow-right')}</span>
          </a>
          <a class="arena-card arena-fix${mistakes ? '' : ' is-empty'}" href="#/quiz/mistakes">
            <span class="arena-ic">${EF.img3d(mistakes ? 'target' : 'check', 40)}</span>
            <div><h2>Fix my mistakes</h2><p>${mistakes ? `${mistakes} question${mistakes === 1 ? '' : 's'} waiting. Get them right to clear them.` : 'No saved mistakes yet — nice.'}</p></div>
            <span class="btn">${mistakes ? 'Practise' : 'Empty'} ${icon('fa-arrow-right')}</span>
          </a>
        </div>
        <h2 class="sub-heading">By subject</h2>
        ${gradeGrid(subs, (s) => {
          const q = EF.store.quiz(s.id);
          return `<a class="subject-card tint" href="#/quiz/${s.id}" style="--c:${s.color}">
            <div class="subject-card-top"><span class="subject-emoji" ${vt('icon-' + s.id)}>${EF.subjectIcon(s.id)}</span>${q ? EF.ring(q.best, 48, 5) : `<span class="pill">${s.quiz.length} Qs</span>`}</div>
            <h3>${esc(s.name)}</h3>
            <p>${q ? `Best ${q.best}% · last ${q.last}% · ${q.attempts} attempt${q.attempts === 1 ? '' : 's'}` : 'Not attempted yet'}</p>
            <div class="subject-card-meta"><span>${icon('fa-play')} Start quiz</span></div>
          </a>`;
        })}
      </div>`;
  };

  pages.quiz = (id) => {
    const meta = EF.quizMeta(id);
    return `<div class="page narrow">
      <a class="crumb" href="${EF.subject(id) && EF.subject(id).custom ? '#/set/' + esc(id) : '#/quiz'}">${icon('fa-arrow-left')} ${EF.subject(id) && EF.subject(id).custom ? esc(EF.subject(id).name) : 'Quiz Arena'}</a>
      <header class="page-head page-head-sm tint quiz-page-head" style="--c:${meta.color}"><span class="quiz-page-ic" ${vt(EF.subject(id) ? 'icon-' + id : /^exam/.test(id) ? 'icon-exam' : 'icon-fix')}>${EF.subject(id) ? EF.subjectIcon(id) : icon(meta.icon)}</span><div><span class="eyebrow">${esc(meta.sub)}</span><h1>${esc(meta.title)}</h1></div></header>
      <div class="quiz-host" data-quiz="${esc(id)}" data-autostart></div>
    </div>`;
  };

  pages.cardsHub = () => `
    <div class="page">
      <header class="page-head"><span class="eyebrow">${icon('fa-brain')} Spaced repetition</span><h1>Study sets</h1><p>Every subject is a study set with four modes: <strong>Flashcards</strong>, <strong>Learn</strong> (with lives), <strong>Match</strong> and a <strong>Test</strong>. Cards come back for review just before you’d forget them.</p>${gradeSwitch()}</header>
      ${mySetsStrip()}
      ${gradeGrid(EF.inGrade(EF.grade()), deckCard)}
    </div>`;

  // one card per study set (subject or your own), with a due badge
  function deckCard(s) {
    const n = (s.flashcards || []).length, m = EF.store.mastered(s.id), due = EF.store.due(s.id).length;
    return `<a class="subject-card tint" href="#/set/${esc(s.id)}" style="--c:${s.color}">
      <div class="subject-card-top"><span class="subject-emoji" ${vt('icon-' + s.id)}>${EF.subjectIcon(s.id)}</span>${due ? `<span class="due-badge" title="Cards due for review">${icon('fa-clock-rotate-left')} ${due} due</span>` : EF.ring(n ? (m / n) * 100 : 0, 48, 5)}</div>
      <h3>${esc(s.name)}</h3>
      <p>${m} of ${n} cards mastered</p>
      <div class="subject-card-meta"><span>${icon('fa-clone')} ${n} cards</span>${EF.store.bestMatch(s.id) ? `<span>${icon('fa-stopwatch')} ${(EF.store.bestMatch(s.id) / 1000).toFixed(1)}s</span>` : ''}</div>
    </a>`;
  }
  function mySetsStrip() {
    const mine = EF.sets.list();
    return `<section class="home-section my-sets">
      <div class="section-head"><h2>My sets</h2><a class="link" href="#/sets">Manage ${icon('fa-arrow-right')}</a></div>
      <div class="grid cols-3">
        <a class="cta-card make-cta" href="#/make"><span class="cta-ic">${icon('fa-plus')}</span><div><strong>Make a set</strong><span>Paste your notes; share it with friends by link</span></div></a>
        ${mine.slice(0, 5).map((x) => deckCard(EF.sets.get(x.id))).join('')}
      </div>
    </section>`;
  }
  function goalRing() {
    const t = EF.store.xpToday(), g = EF.store.goal();
    return `<span class="goal-big" style="--p:${Math.min(100, Math.round((t / g) * 100))}" aria-label="${t} of ${g} XP today">${icon(t >= g ? 'fa-check' : 'fa-bullseye')}</span>`;
  }

  /* A study set's home: all the ways to study it */
  pages.set = (s) => {
    const n = s.flashcards.length, m = EF.store.mastered(s.id), due = EF.store.due(s.id).length, best = EF.store.bestMatch(s.id), q = EF.store.quiz(s.id);
    const PIC = { 'fa-graduation-cap': 'grad', 'fa-clone': 'cards', 'fa-shapes': 'puzzle', 'fa-bolt': 'bolt', 'fa-book-open': 'book', 'fa-pen': 'pencil', 'fa-stopwatch': 'stopwatch', 'fa-tower-broadcast': 'people' };
    const mode = (href, ic, title, sub, extra) => `<a class="mode-card" href="${href}"><span class="mode-ic">${EF.img3d(PIC[ic] || 'star', 34)}</span><div><strong>${title}</strong><span>${sub}</span></div>${extra ? `<span class="mode-extra">${extra}</span>` : ''}${icon('fa-chevron-right', 'mode-go')}</a>`;
    return `<div class="page narrow tint" style="--c:${s.color}">
      <a class="crumb" href="#/cards">${icon('fa-arrow-left')} Study sets</a>
      <header class="page-head page-head-sm quiz-page-head"><span class="quiz-page-ic" ${vt('icon-' + s.id)}>${EF.subjectIcon(s.id)}</span><div><span class="eyebrow">${s.custom ? 'My set' : 'Grade ' + EF.gradeOf(s) + ' subject'} · ${n} cards</span><h1>${esc(s.name)}</h1></div></header>
      <div class="set-stats"><span>${icon('fa-medal')} <strong>${m}/${n}</strong> mastered</span><span>${icon('fa-clock-rotate-left')} <strong>${due}</strong> due today</span>${best ? `<span>${icon('fa-stopwatch')} best match <strong>${(best / 1000).toFixed(1)}s</strong></span>` : ''}${q ? `<span>${icon('fa-trophy')} best test <strong>${q.best}%</strong></span>` : ''}</div>
      <div class="modes">
        ${mode('#/learn/' + s.id, 'fa-graduation-cap', 'Learn', 'Choose, then type the answers. 3 lives per round.', '+6 XP each')}
        ${mode('#/cards/' + s.id, 'fa-clone', 'Flashcards', due ? `${due} due for review now` : 'Flip, then rate yourself', '')}
        ${mode('#/match/' + s.id, 'fa-shapes', 'Match', 'Pair them up against the clock', best ? (best / 1000).toFixed(1) + 's' : '')}
        ${mode('#/gap/' + s.id, 'fa-pen', 'Fill the gap', 'Complete the key word in each definition', '')}
        ${mode('#/speed/' + s.id, 'fa-stopwatch', 'Speed run', 'As many as you can in 90 seconds', EF.bestSpeed(s.id) ? 'best ' + EF.bestSpeed(s.id) : '')}
        ${!s.custom && EF.cloud.enabled ? mode('#/live/host/' + s.id, 'fa-tower-broadcast', 'Live with friends', 'Host a game: same questions, same time', '') : ''}
        ${s.quiz.length ? mode('#/quiz/' + s.id, 'fa-bolt', 'Test', s.quiz.length + ' questions with explanations', q ? q.best + '%' : '') : ''}
        ${s.custom ? '' : mode('#/s/' + s.id, 'fa-book-open', 'Study guide', 'Full notes, worked examples and tools', '')}
      </div>
      ${s.custom ? `<div class="btn-row"><button type="button" class="btn btn-primary" data-share="${esc(s.id)}">${icon('fa-link')} Share by link</button>${EF.cloud.joined() ? `<button type="button" class="btn" data-publish="${esc(s.id)}">${icon(EF.cloud.published(s.id) ? 'fa-rotate' : 'fa-school')} ${EF.cloud.published(s.id) ? 'Update in school library' : 'Share with my school'}</button>${EF.cloud.published(s.id) ? `<button type="button" class="btn btn-ghost" data-unpublish="${esc(s.id)}">${icon('fa-eye-slash')} Remove from library</button>` : ''}` : ''}<a class="btn" href="#/make/${esc(s.id)}">${icon('fa-pen')} Edit</a></div>` : ''}
      <details class="card set-list"><summary>${icon('fa-list')} See all ${n} cards</summary><ol>${s.flashcards.map((c) => `<li><strong>${esc(c[0])}</strong><span>${esc(c[1])}</span></li>`).join('')}</ol></details>
    </div>`;
  };
  const modePage = (s, kind, label, ic) => `<div class="page narrow">
      <a class="crumb" href="#/set/${esc(s.id)}">${icon('fa-arrow-left')} ${esc(s.name)}</a>
      <header class="page-head page-head-sm tint quiz-page-head" style="--c:${s.color}"><span class="quiz-page-ic" ${vt('icon-' + s.id)}>${EF.subjectIcon(s.id)}</span><div><span class="eyebrow">${icon(ic)} ${label}</span><h1>${esc(s.name)}</h1></div></header>
      <div data-${kind}="${esc(s.id)}"></div>
    </div>`;
  pages.learn = (s) => modePage(s, 'learn', 'Learn', 'fa-graduation-cap');
  pages.match = (s) => modePage(s, 'match', 'Match', 'fa-shapes');
  pages.speed = (s) => modePage(s, 'speed', 'Speed run', 'fa-stopwatch');
  pages.gap = (s) => modePage(s, 'gap', 'Fill the gap', 'fa-pen');
  /* a friend's challenge link: same questions, their score to beat, no account needed */
  pages.vs = (c, code) => {
    const s = EF.subject(c.s);
    return `<div class="page narrow">
      <header class="page-head page-head-sm tint quiz-page-head" style="--c:${s.color}"><span class="quiz-page-ic">${EF.subjectIcon(s.id)}</span><div><span class="eyebrow">${icon('fa-user-group')} Challenge · ${esc(s.name)}</span><h1>${esc(c.n)} challenged you!</h1></div></header>
      <div class="vs-banner tint" style="--c:${s.color}">${EF.img3d('trophy', 40)}<div><strong>Score to beat: ${c.m === 'speed' ? `${c.sc} right in a 90-second Speed run` : `${c.sc} out of ${c.of}`}</strong><span>${c.m === 'speed' ? 'Same questions, same order, same clock.' : 'The same questions, in a new order.'} No account needed. Good luck!</span></div></div>
      ${c.m === 'speed' ? `<div data-speed="${esc(s.id)}" data-vs="${esc(code)}"></div>` : `<div class="quiz-host" data-quiz="${esc(s.id)}" data-vs="${esc(code)}"></div>`}
    </div>`;
  };
  pages.live = () => `<div class="page narrow live-home">
      <header class="page-head"><span class="eyebrow">${icon('fa-tower-broadcast')} Live</span><h1>Play live with friends</h1><p>Same questions, same time, one winner. Share a code and race your friends or your whole class.</p></header>
      <div data-live-home></div>
    </div>`;
  pages.liveGame = (code) => `<div class="page narrow live-page" data-live="${esc(code)}"></div>`;
  pages.badChallenge = () => `<div class="page narrow center not-found">${EF.mascot ? EF.mascot('think', 140) : ''}<h1>That challenge link didn’t work</h1><p class="muted">It may have been cut off when it was copied. Ask your friend to send it again.</p><a class="btn btn-primary" href="#/">${icon('fa-house')} Go home</a></div>`;
  pages.sets = () => {
    const mine = EF.sets.list();
    return `<div class="page">
      <header class="page-head"><span class="eyebrow">${icon('fa-layer-group')} Saved on this device</span><h1>My sets</h1><p>Turn any notes into a study set: paste them in, then study with Learn, Flashcards, Match and Test. Tap <strong>Share</strong> to send a set to friends: the whole set travels inside the link, so no account is needed.</p></header>
      <div class="grid cols-3">
        <a class="cta-card make-cta" href="#/make"><span class="cta-ic">${icon('fa-plus')}</span><div><strong>Make a set</strong><span>Paste notes, one card per line</span></div></a>
        ${mine.map((x) => deckCard(EF.sets.get(x.id))).join('')}
      </div>
      ${mine.length ? '' : `<p class="muted center" style="margin-top:24px">No sets yet. Make one from your class notes, or open a link a friend shared.</p>`}
    </div>`;
  };
  pages.make = (id) => `<div class="page narrow">
      <a class="crumb" href="${id ? '#/set/' + esc(id) : '#/sets'}">${icon('fa-arrow-left')} ${id ? 'Back to set' : 'My sets'}</a>
      <header class="page-head page-head-sm"><span class="eyebrow">${icon('fa-wand-magic-sparkles')} ${id ? 'Edit set' : 'New set'}</span><h1>${id ? 'Edit your set' : 'Make a study set'}</h1></header>
      <div data-make="${id ? esc(id) : ''}"></div>
    </div>`;
  /* League pages (content comes from cloud.js) */
  const cloudPage = (kind, arg, head) => `<div class="page${kind === 'league' || kind === 'school' ? '' : ' narrow'}">${head || ''}<div data-cloud="${kind}"${arg != null ? ` data-arg="${esc(arg)}"` : ''}></div></div>`;
  pages.league = () => cloudPage('league', null, `<header class="page-head"><span class="eyebrow">${icon('fa-trophy')} Weekly leagues</span><h1>Leagues</h1><p>Earn XP by studying anything. Every Monday the top players in each league move up and the bottom ones move down. Your XP also pushes your school up the rankings.</p></header>`);
  pages.join = (mode) => cloudPage('join', mode || '', `<a class="crumb" href="#/league">${icon('fa-arrow-left')} Leagues</a><header class="page-head page-head-sm"><span class="eyebrow">${icon('fa-fire')} Join</span><h1>${mode === 'code' ? 'Welcome back' : 'Join the league'}</h1></header>`);
  pages.account = () => cloudPage('account', null, `<a class="crumb" href="#/league">${icon('fa-arrow-left')} Leagues</a><header class="page-head page-head-sm"><span class="eyebrow">${icon('fa-user')} Account</span><h1>Your account</h1></header>`);
  pages.me = () => cloudPage('me', null, '');
  pages.user = (name) => cloudPage('user', name, `<a class="crumb" href="javascript:history.back()">${icon('fa-arrow-left')} Back</a>`);
  pages.school = (id) => cloudPage('school', id, `<a class="crumb" href="#/league">${icon('fa-arrow-left')} Leagues</a>`);
  pages.shared = (id) => cloudPage('shared', id, `<a class="crumb" href="javascript:history.back()">${icon('fa-arrow-left')} Back</a>`);

  pages.importSet = (code) => `<div class="page narrow"><div data-import="${esc(code)}"></div></div>`;

  pages.cards = (s) => `
    <div class="page narrow">
      <a class="crumb" href="#/set/${esc(s.id)}">${icon('fa-arrow-left')} ${esc(s.name)}</a>
      <header class="page-head page-head-sm tint quiz-page-head" style="--c:${s.color}"><span class="quiz-page-ic" ${vt('icon-' + s.id)}>${EF.subjectIcon(s.id)}</span><div><span class="eyebrow">Flashcards</span><h1>${esc(s.name)}</h1></div></header>
      <div class="cards-host" data-cards="${s.id}"></div>
      <p class="muted small center kbd-hint">Shortcuts: <kbd>space</kbd> flip · <kbd>1</kbd> again · <kbd>2</kbd> unsure · <kbd>3</kbd> got it</p>
    </div>`;

  pages.progress = () => {
    const st = EF.store.state();
    const days = Array.from({ length: 35 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (34 - i)); return d; });
    return `
      <div class="page">
        <header class="page-head"><span class="eyebrow">${icon('fa-chart-simple')} Saved on this device</span><h1>My progress</h1><p>Progress = 40% topics read + 40% best quiz score + 20% flashcards mastered.</p></header>
        <div class="progress-top">
          <div class="card progress-overall">${EF.ring(EF.store.overall(), 120, 10)}<div><h3>Overall</h3><p class="muted">${st.answered} questions answered${st.answered ? ` · ${Math.round((st.correct / st.answered) * 100)}% correct` : ''}</p></div>${EF.mascot ? `<span class="progress-mascot">${EF.mascot(EF.store.overall() >= 70 ? 'cheer' : EF.store.streak() ? 'read' : 'sleep', 96)}</span>` : ''}</div>
          <div class="card">
            <h3>${EF.img3d ? EF.img3d('fire', 26) : icon('fa-fire')} ${EF.store.streak()}-day streak</h3>
            <div class="cal-days" aria-hidden="true">${days.slice(-7).map((d) => `<span>${d.toLocaleDateString(undefined, { weekday: 'narrow' })}</span>`).join('')}</div>
            <div class="cal" aria-label="Study days, last 5 weeks">${days.map((d) => `<i class="${EF.store.studiedOn(d) ? 'on' : ''}${EF.dayKey(d) === EF.dayKey() ? ' today' : ''}" title="${d.toDateString()}"></i>`).join('')}</div>
            <p class="muted small">Each square is a day. Study anything to light it up.</p>
          </div>
        </div>
        <div class="table-wrap"><table class="table progress-table">
          <thead><tr><th scope="col">Subject</th><th scope="col">Topics read</th><th scope="col">Best quiz</th><th scope="col">Cards mastered</th><th scope="col" class="r">Progress</th></tr></thead>
          <tbody>${(EF.multiGrade() ? EF.grades().flatMap((g) => EF.inGrade(g)) : EF.subjects).map((s, i, arr) => {
            const p = EF.store.progress(s.id);
            const head = EF.multiGrade() && (i === 0 || EF.gradeOf(arr[i - 1]) !== EF.gradeOf(s)) ? `<tr class="grade-row"><th colspan="5" scope="rowgroup">Grade ${EF.gradeOf(s)}</th></tr>` : '';
            return head + `<tr class="tint" style="--c:${s.color}">
              <th scope="row"><a href="#/s/${s.id}" class="tint" style="--c:${s.color}">${EF.subjectIcon(s.id)} ${esc(s.name)}</a></th>
              <td>${p.visited}/${p.total}</td>
              <td>${p.attempts ? p.best + '%' : '—'}</td>
              <td>${p.mastered}/${p.cards}</td>
              <td class="r"><div class="bar bar-inline"><span style="width:${p.pct}%"></span></div> ${p.pct}%</td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>
        <div class="danger-zone"><div><h3>Start fresh</h3><p class="muted">Clears your streak, quiz scores, flashcard levels and reading progress on this device.</p></div><button type="button" class="btn btn-danger" data-reset>${icon('fa-trash-can')} Reset progress</button></div>
      </div>`;
  };

  pages.notFound = () => `<div class="page narrow center not-found">${EF.mascot ? EF.mascot('think', 150) : ''}<h1>Page not found</h1><p class="muted">That link doesn’t go anywhere.</p><a class="btn btn-primary" href="#/">${icon('fa-house')} Go home</a></div>`;

  /* ================= ROUTER ================= */
  function parts() { return location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent); }

  function teardown() {
    cleanup.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
    cleanup = [];
    if (spy) { spy.io.disconnect(); spy = null; }
    EF.stopSpeaking();
  }

  let firstShow = true;
  const depth = (k) => { const [a, b] = k.split(':'); return a === 'home' ? 0 : b && a !== 's' ? 2 : 1; };
  function show(key, html, title, after) {
    const from = viewKey ? depth(viewKey) : 0, to = depth(key);
    document.documentElement.dataset.navdir = to > from ? 'forward' : to < from ? 'back' : 'fade';
    let viaVT = false;
    const swap = () => { render(key, html, title, after); if (viaVT) $$(':scope > .page', main).forEach((pg) => pg.classList.add('no-enter')); };
    // Cross-fade between pages where the browser supports it (not on first load or with reduced motion)
    if (document.startViewTransition && !firstShow && !EF.reducedMotion() && !document.documentElement.classList.contains('vt-theme')) {
      document.documentElement.classList.add('vt-page');
      viaVT = true;
      const t = document.startViewTransition(swap);
      // An interrupted transition (fast clicking, rotating the phone) is harmless — the page still updates
      t.ready.catch(() => {});
      t.finished.catch(() => {}).finally(() => document.documentElement.classList.remove('vt-page'));
    } else swap();
    firstShow = false;
  }
  function render(key, html, title, after) {
    teardown();
    viewKey = key;
    main.innerHTML = html;
    document.title = title ? title + ' · ExamForge' : 'ExamForge — Exam Prep';
    cleanup.push(EF.mountWidgets(main));
    $$('[data-quiz]', main).forEach((el) => cleanup.push(EF.mountQuiz(el, el.dataset.quiz, { inline: !el.hasAttribute('data-autostart') && !el.dataset.vs, autostart: el.hasAttribute('data-autostart'), vs: el.dataset.vs })));
    $$('[data-cards]', main).forEach((el) => cleanup.push(EF.mountCards(el, el.dataset.cards)));
    $$('[data-learn]', main).forEach((el) => cleanup.push(EF.mountLearn(el, el.dataset.learn)));
    $$('[data-match]', main).forEach((el) => cleanup.push(EF.mountMatch(el, el.dataset.match)));
    $$('[data-speed]', main).forEach((el) => cleanup.push(EF.mountSpeed(el, el.dataset.speed, { vs: el.dataset.vs })));
    $$('[data-gap]', main).forEach((el) => cleanup.push(EF.mountGap(el, el.dataset.gap)));
    $$('[data-live-home]', main).forEach((el) => cleanup.push(EF.mountLiveHome(el)));
    $$('[data-live]', main).forEach((el) => cleanup.push(EF.mountLive(el, el.dataset.live)));
    $$('[data-make]', main).forEach((el) => cleanup.push(EF.mountMake(el, el.dataset.make || null)));
    $$('[data-import]', main).forEach((el) => cleanup.push(EF.mountImport(el, el.dataset.import)));
    const CLOUD = { league: EF.mountLeague, join: EF.mountJoin, account: EF.mountAccount, school: EF.mountSchool, shared: EF.mountShared, me: EF.mountMe, user: EF.mountUser };
    $$('[data-cloud]', main).forEach((el) => { const fn = CLOUD[el.dataset.cloud]; if (fn) cleanup.push(fn(el, el.dataset.arg)); });
    const lc = $('[data-league-cta]', main); if (lc) EF.paintLeagueCta(lc);
    const hs = $('[data-home-social]', main); if (hs) EF.paintHomeSocial(hs);
    renderSidebar();
    closeDrawer();
    const tab = { set: 'cards', learn: 'cards', match: 'cards', sets: 'cards', make: 'cards', import: 'cards', join: 'league', account: 'league', school: 'league', shared: 'league', me: 'league', u: 'league' }[key.split(':')[0]] || key.split(':')[0];
    document.body.dataset.view = tab;
    if (after) after(); else window.scrollTo(0, 0);
    EF.countUp(main);
    updateReadBar();
    $$('.tabbar [data-tab]').forEach((t) => t.classList.toggle('is-active', t.dataset.tab === tab));
    EF.reveal(main);
    EF.inkAll();
  }

  function scrollToTopic(tid, smooth) {
    const el = document.getElementById('t-' + tid);
    if (!el) { window.scrollTo(0, 0); return; }
    el.scrollIntoView({ behavior: smooth && !EF.reducedMotion() ? 'smooth' : 'auto', block: 'start' });
    el.classList.remove('is-flash'); void el.offsetWidth; el.classList.add('is-flash');
  }

  function route() {
    const p = parts();
    const [a, b, c] = p;
    if (!a) return show('home', pages.home(), '');
    if (a === 's') {
      const s = EF.subject(b);
      if (!s) return show('404', pages.notFound(), 'Not found');
      if (viewKey === 's:' + s.id) { if (c) scrollToTopic(c, true); else window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      return show('s:' + s.id, pages.subject(s), s.name, () => {
        startSpy(s);
        cleanup.push(EF.watchTitle($('.subject-hero h1', main), s.short));
        if (c) requestAnimationFrame(() => scrollToTopic(c, false)); else window.scrollTo(0, 0);
      });
    }
    if (a === 'quiz') {
      if (!b) return show('quiz', pages.arena(), 'Quiz Arena');
      if (!EF.quizMeta(b)) return show('404', pages.notFound(), 'Not found');
      return show('quiz:' + b, pages.quiz(b), EF.quizMeta(b).title);
    }
    if (a === 'cards') {
      if (!b) return show('cards', pages.cardsHub(), 'Flashcards');
      const s = EF.subject(b);
      if (!s) return show('404', pages.notFound(), 'Not found');
      return show('cards:' + s.id, pages.cards(s), s.short + ' Flashcards');
    }
    if (a === 'progress') return show('progress', pages.progress(), 'My Progress');
    if (a === 'set' || a === 'learn' || a === 'match' || a === 'speed' || a === 'gap') {
      const s = EF.subject(b);
      if (!s || !s.flashcards || !s.flashcards.length) return show('404', pages.notFound(), 'Not found');
      return show(a + ':' + s.id, pages[a](s), s.short + ({ set: '', learn: ' · Learn', match: ' · Match', speed: ' · Speed run', gap: ' · Fill the gap' })[a]);
    }
    if (a === 'live') {
      if (!b) return show('live', pages.live(), 'Live');
      if (b === 'host') { const s = EF.subject(p[2]); if (s && !s.custom) { EF.liveHost(s.id); return; } return show('404', pages.notFound(), 'Not found'); }
      const code = EF.liveCode(b);
      return code ? show('live:' + code, pages.liveGame(code), 'Live · ' + code) : show('404', pages.notFound(), 'Not found');
    }
    if (a === 'vs') {
      const c = EF.vs.decode(b);
      return c ? show('vs:' + b, pages.vs(c, b), 'Challenge') : show('vs:bad', pages.badChallenge(), 'Challenge');
    }
    if (a === 'sets') return show('sets', pages.sets(), 'My sets');
    if (a === 'league') return show('league', pages.league(), 'Leagues');
    if (a === 'join') return show('join' + (b ? ':' + b : ''), pages.join(b), 'Join the league');
    if (a === 'account') return show('account', pages.account(), 'Account');
    if (a === 'me') return show('me', pages.me(), 'Profile');
    if (a === 'u' && b) return show('u:' + b.toLowerCase(), pages.user(b), b);
    if (a === 'school' && /^\d+$/.test(b || '')) return show('school:' + b, pages.school(b), 'School');
    if (a === 'shared' && /^[0-9a-f-]{36}$/.test(b || '')) return show('shared:' + b, pages.shared(b), 'Shared set');
    if (a === 'make') { if (b && !EF.sets.raw(b)) return show('404', pages.notFound(), 'Not found'); return show('make' + (b ? ':' + b : ''), pages.make(b), b ? 'Edit set' : 'Make a set'); }
    if (a === 'import' && b) return show('import:x', pages.importSet(p.slice(1).join('/')), 'Shared set');
    return show('404', pages.notFound(), 'Not found');
  }

  /* Scroll-spy: highlights the topic you're reading, marks it as read, keeps the URL in sync */
  function startSpy(s) {
    const sections = $$('.topic', main);
    const visible = new Map();
    let readTimer = null;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => visible.set(e.target.dataset.topic, e.isIntersecting ? e.intersectionRect.top : null));
      const tops = sections.map((sec) => sec.dataset.topic).filter((id) => visible.get(id) != null);
      const id = tops[0];
      if (!id || id === spy.active) return;
      spy.active = id;
      markTopic(id);
      const url = '#/s/' + s.id + '/' + id;
      if (location.hash !== url) history.replaceState(null, '', url);
      clearTimeout(readTimer);
      if (id !== 'quiz' && id !== 'traps') {
        EF.store.setLast(s.id, id);
        readTimer = setTimeout(() => {
          EF.store.markVisited(s.id, id);
          const sec = document.getElementById('t-' + id);
          if (sec) { const chk = sec.querySelector('.topic-seen'); if (chk) chk.classList.add('is-on'); }
        }, 2500);
      }
    }, { rootMargin: '-30% 0px -55% 0px' });
    sections.forEach((sec) => io.observe(sec));
    spy = { io, active: null };
    cleanup.push(() => clearTimeout(readTimer));
    // a small "Contents" pill appears once the contents card has scrolled away
    const toc = $('#contents', main), pill = $('[data-toc-float]', main);
    // fixed elements inside an animated page get pinned to the page, so the pill lives on <body>
    if (pill) { document.body.appendChild(pill); cleanup.push(() => pill.remove()); }
    if (toc && pill) {
      const tio = new IntersectionObserver(([e]) => { pill.hidden = e.isIntersecting || e.boundingClientRect.top > 0; });
      tio.observe(toc);
      cleanup.push(() => tio.disconnect());
    }
  }
  function markTopic(id) {
    const [, sid] = parts(), sub = EF.subject(sid), tp = sub && sub.topics.find((t) => t.id === id);
    EF.setTitleTopic(tp ? topicLabel(tp) : id === 'quiz' ? 'Quiz' : '');
    $$('[data-topic]', document).forEach((a) => {
      if (a.tagName !== 'A') return;
      const on = a.dataset.topic === id;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
    const now = $('[data-toc-now]');
    if (now) { const i = sub && tp ? sub.topics.indexOf(tp) : -1; now.textContent = i >= 0 ? `${i + 1}/${sub.topics.length} · ${topicLabel(tp)}` : id === 'quiz' ? 'Quiz' : id === 'traps' ? 'Exam traps' : 'Contents'; }
    const chip = $('.topic-chips .is-active', main);
    if (chip) { const bar = chip.parentElement; bar.scrollTo({ left: chip.offsetLeft - bar.clientWidth / 2 + chip.clientWidth / 2, behavior: EF.reducedMotion() ? 'auto' : 'smooth' }); }
  }

  /* ================= SEARCH ================= */
  let index = null;
  const fold = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function buildIndex() {
    index = [];
    EF.subjects.forEach((s) => {
      s.topics.forEach((t) => {
        const href = '#/s/' + s.id + '/' + t.id;
        index.push({ s, title: t.title, text: s.name, href, kind: 'Topic' });
        t.blocks.forEach((b) => {
          const items = Array.isArray(b.items) ? b.items : null;
          if (items && items.length && !Array.isArray(items[0]) && typeof items[0] === 'object') {
            items.forEach((it) => {
              const sub = Object.assign({}, it); const txt = EF.blockText({ items: [sub] });
              index.push({ s, title: it.title || it.name || t.title, text: txt, href, kind: t.nav || t.title });
            });
          } else if (items && Array.isArray(items[0])) {
            items.forEach((it) => index.push({ s, title: EF.strip(it[0]), text: it.slice(1).filter((x) => typeof x === 'string').map(EF.strip).join(' — '), href, kind: t.nav || t.title }));
          } else {
            const txt = EF.blockText(b);
            if (txt) index.push({ s, title: b.type === 'gizmo' ? 'Gizmo: ' + b.name : t.title, text: txt, href, kind: b.type === 'gizmo' ? 'Gizmo lab' : t.nav || t.title });
          }
        });
      });
      // Widget data that isn't in blocks
      if (s.data && s.data.atoms) s.data.atoms.forEach((a) => index.push({ s, title: `${a.name} (${a.symbol})`, text: `Element ${a.z} · ${a.category} · ${a.config} · ${a.desc}`, href: '#/s/' + s.id + '/atom-model', kind: 'Element' }));
      if (s.data && s.data.vocab) Object.keys(s.data.vocab).forEach((k) => s.data.vocab[k].forEach((w) => index.push({ s, title: w[0], text: w[1], href: '#/s/' + s.id + '/vocabulary', kind: 'Vocab · ' + k })));
      if (s.data && s.data.verbs) s.data.verbs.forEach((v) => index.push({ s, title: v.name, text: v.meaning + ' · ' + v.type + ' · ' + v.forms.join(', '), href: '#/s/' + s.id + '/conjugation', kind: 'Verb' }));
      s.quiz.forEach((q) => index.push({ s, title: EF.strip(q.q), text: 'Answer: ' + EF.strip(q.options[q.answer]) + (q.why ? ' — ' + EF.strip(q.why) : ''), href: '#/quiz/' + s.id, kind: 'Quiz question' }));
    });
    index.forEach((e) => { e.hay = fold(e.title + ' ' + e.text + ' ' + e.kind); e.ft = fold(e.title); });
  }
  function highlight(text, terms) {
    let out = esc(text);
    terms.forEach((t) => {
      if (t.length < 2) return;
      const re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
      out = out.replace(re, '<mark>$1</mark>');
    });
    return out;
  }
  function snippet(text, terms) {
    const f = fold(text);
    let at = -1;
    terms.some((t) => (at = f.indexOf(t)) >= 0);
    if (at < 0 || text.length < 140) return text.slice(0, 140) + (text.length > 140 ? '…' : '');
    const start = Math.max(0, at - 50);
    return (start ? '…' : '') + text.slice(start, start + 140) + (start + 140 < text.length ? '…' : '');
  }
  const dlg = $('#search'), input = $('#search-input'), results = $('#search-results');
  let sel = 0, found = [];
  function search() {
    if (!index) buildIndex();
    const q = fold(input.value.trim());
    const terms = q.split(/\s+/).filter(Boolean);
    if (!terms.length) {
      results.innerHTML = `<div class="search-empty">${icon('fa-wand-magic-sparkles')}<p>Search every subject — try <button type="button" class="link" data-q="ionic">ionic</button>, <button type="button" class="link" data-q="Dessalines">Dessalines</button>, <button type="button" class="link" data-q="femur">femur</button> or <button type="button" class="link" data-q="soixante">soixante</button>.</p></div>`;
      found = []; return;
    }
    found = index.filter((e) => terms.every((t) => e.hay.includes(t)))
      .map((e) => ({ e, score: terms.reduce((n, t) => n + (e.ft.includes(t) ? 4 : 1) + (e.ft.startsWith(t) ? 3 : 0), 0) + (e.kind === 'Topic' ? 2 : 0) }))
      .sort((x, y) => y.score - x.score).slice(0, 40).map((x) => x.e);
    sel = 0;
    if (!found.length) { results.innerHTML = `<div class="search-empty">${icon('fa-ghost')}<p>No results for “${esc(input.value)}”.</p></div>`; return; }
    results.innerHTML = found.map((e, i) => `
      <a class="result tint${i === sel ? ' is-sel' : ''}" href="${e.href}" role="option" aria-selected="${i === sel}" id="res-${i}" style="--c:${e.s.color}">
        <span class="result-ic">${EF.subjectIcon(e.s.id)}</span>
        <span class="result-body"><span class="result-kind">${EF.multiGrade() ? 'G' + EF.gradeOf(e.s) + ' · ' : ''}${esc(e.s.short)} · ${esc(e.kind)}</span><strong>${highlight(e.title, terms)}</strong><span class="result-text">${highlight(snippet(e.text, terms), terms)}</span></span>
      </a>`).join('');
  }
  function moveSel(d) {
    if (!found.length) return;
    sel = (sel + d + found.length) % found.length;
    $$('.result', results).forEach((r, i) => { r.classList.toggle('is-sel', i === sel); r.setAttribute('aria-selected', i === sel); });
    const r = $('#res-' + sel); if (r) { r.scrollIntoView({ block: 'nearest' }); input.setAttribute('aria-activedescendant', 'res-' + sel); }
  }
  EF.openSearch = (q) => {
    if (dlg.open) return;
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    if (q != null) input.value = q;
    search();
    input.focus(); input.select();
  };
  const closeSearch = () => { if (dlg.open) dlg.close ? dlg.close() : dlg.removeAttribute('open'); };
  input.addEventListener('input', search);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveSel(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveSel(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); const r = found[sel]; if (r) { closeSearch(); go(r.href); } }
  });
  results.addEventListener('click', (e) => {
    const q = e.target.closest('[data-q]');
    if (q) { input.value = q.dataset.q; search(); input.focus(); return; }
    const a = e.target.closest('a.result');
    if (a) { e.preventDefault(); closeSearch(); go(a.getAttribute('href')); }
  });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) closeSearch(); });

  function go(href) {
    if (location.hash === href) route(); else location.hash = href;
  }

  /* ================= DRAWER (mobile nav) ================= */
  const openDrawer = () => { document.body.classList.add('nav-open'); $('.menu-btn').setAttribute('aria-expanded', 'true'); const f = $('.side-link', sidebar); if (f) f.focus({ preventScroll: true }); };
  const closeDrawer = () => { if (!document.body.classList.contains('nav-open')) return; document.body.classList.remove('nav-open'); $('.menu-btn').setAttribute('aria-expanded', 'false'); };
  EF.closeDrawer = closeDrawer;

  /* Worked examples: one step at a time, then the answer */
  function stepWorked(box, how) {
    const steps = $$('.worked-steps > li', box), ans = $('.worked-ans', box);
    const next = $('[data-worked="next"], [data-worked="reset"]', box), all = $('[data-worked="all"]', box);
    const show = (el) => { if (!el.hidden) return; el.hidden = false; el.classList.remove('is-in'); void el.offsetWidth; el.classList.add('is-in'); };
    if (how === 'reset') { steps.forEach((li) => { li.hidden = true; }); ans.hidden = true; }
    else if (how === 'all') { steps.forEach(show); show(ans); }
    else { const h = steps.find((li) => li.hidden); show(h || ans); }
    const left = steps.filter((li) => li.hidden).length;
    if (how !== 'reset') EF.haptic(left || ans.hidden ? undefined : 'success');
    if (how !== 'reset' && !left && !ans.hidden && !box.dataset.xp) { box.dataset.xp = '1'; EF.store.addXP(3); }
    if (!left && !ans.hidden) { next.innerHTML = `${icon('fa-rotate-left')} Start again`; next.dataset.worked = 'reset'; all.hidden = true; }
    else { next.dataset.worked = 'next'; all.hidden = false; next.innerHTML = left ? `${icon('fa-forward-step')} Show step ${steps.length - left + 1}` : `${icon('fa-flag-checkered')} Show answer`; }
    if (how !== 'reset') { const last = !ans.hidden ? ans : steps[steps.length - left - 1]; if (last) last.scrollIntoView({ block: 'nearest', behavior: EF.reducedMotion() ? 'auto' : 'smooth' }); }
    EF.store.touchDay && EF.store.touchDay();
  }

  /* ================= GLOBAL EVENTS ================= */
  document.addEventListener('click', (e) => {
    const t = e.target;
    const flip = t.closest('[data-action="flip"]');
    if (flip && !t.closest('.speak')) { const on = !flip.classList.contains('is-flipped'); flip.classList.toggle('is-flipped', on); flip.setAttribute('aria-pressed', on); return; }
    const sp = t.closest('.speak');
    if (sp) { e.preventDefault(); e.stopPropagation(); EF.speak(sp.dataset.speak, 'fr-FR', sp); return; }
    if (t.closest('[data-theme-toggle]')) { EF.theme.toggle(t.closest('[data-theme-toggle]')); return; }
    if (t.closest('[data-search-open]')) { EF.openSearch(); return; }
    if (t.closest('[data-open-subjects]')) { openDrawer(); return; }
    const pb = t.closest('[data-publish]');
    if (pb) { EF.cloud.publish(pb.dataset.publish).then((r) => { EF.toast(r.updated ? 'Updated in your school library' : 'Shared with your school library!', 'fa-school'); EF.haptic('success'); if (!r.updated) EF.store.addXP(10); route(); }).catch((er) => EF.toast(er.message, 'fa-circle-exclamation')); return; }
    const upb = t.closest('[data-unpublish]');
    if (upb) { EF.cloud.unpublish(upb.dataset.unpublish).then(() => { EF.toast('Removed from your school library', 'fa-eye-slash'); route(); }).catch((er) => EF.toast(er.message, 'fa-circle-exclamation')); return; }
    if (t.closest('[data-invite]')) {
      const url = location.href.split('#')[0];
      const done = (how) => EF.toast(how === 'copied' ? 'Link copied: send it to your friends!' : 'Thanks for sharing!', 'fa-user-plus');
      if (navigator.share) navigator.share({ title: 'ExamForge', text: 'Study with me on ExamForge: notes, quizzes, flashcards and school leagues', url }).then(() => done('shared')).catch(() => {});
      else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => done('copied')).catch(() => window.prompt('Copy this link:', url));
      else window.prompt('Copy this link:', url);
      return;
    }
    const sh = t.closest('[data-share]');
    if (sh) { const set = EF.sets.raw(sh.dataset.share); if (set) EF.sets.share(set).then((r) => { if (r === 'copied') EF.toast('Link copied: send it to your friends!', 'fa-link'); else if (r === 'shared') EF.toast('Shared!', 'fa-share-nodes'); }); return; }
    const tv = t.closest('[data-toc-view]');
    if (tv) { try { localStorage.setItem('ef2:tocView', tv.dataset.tocView); } catch (er) { /* */ } const [, sid] = parts(), sub = EF.subject(sid), box = $('#contents', main); if (sub && box) { box.outerHTML = contents(sub, EF.store.state().visited[sub.id] || []); } return; }
    const why = t.closest('[data-why]');
    if (why) { EF.toast(why.dataset.why, 'fa-circle-question'); return; }
    if (t.closest('[data-toc-float]')) { e.preventDefault(); const toc = $('#contents', main); if (toc) toc.scrollIntoView({ behavior: EF.reducedMotion() ? 'auto' : 'smooth', block: 'start' }); return; }
    const wk = t.closest('[data-worked]');
    if (wk) { stepWorked(wk.closest('.worked'), wk.dataset.worked); return; }
    const gs = t.closest('[data-set-grade]');
    if (gs) { EF.setGrade(gs.dataset.setGrade); route(); return; }
    if (t.closest('[data-keys]')) { openKeys(); return; }
    if (t.closest('[data-install]') && installEvt) { installEvt.prompt(); installEvt.userChoice.finally(() => { installEvt = null; renderSidebar(); }); return; }
    if (t.closest('.menu-btn')) { document.body.classList.contains('nav-open') ? closeDrawer() : openDrawer(); return; }
    if (t.closest('.scrim')) { closeDrawer(); return; }
    if (t.closest('[data-print]')) { window.print(); return; }
    if (t.closest('[data-reset]') && viewKey === 'progress') {
      if (confirm('Reset all your progress on this device? This can’t be undone.')) { EF.store.reset(); route(); EF.toast('Progress reset — fresh start!', 'fa-broom'); }
      return;
    }
    // Clicking a link to the URL we're already on (e.g. same topic) should still scroll there
    const a = t.closest('a[href^="#/"]');
    if (a && !e.metaKey && !e.ctrlKey && !e.shiftKey && a.getAttribute('href') === location.hash) { e.preventDefault(); route(); closeDrawer(); }
  });
  document.addEventListener('keydown', (e) => {
    const flip = e.target.closest && e.target.closest('[data-action="flip"]');
    if (flip && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); flip.click(); return; }
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); EF.openSearch(); return; }
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === '/') { e.preventDefault(); EF.openSearch(); }
    else if (e.key === '?') { e.preventDefault(); openKeys(); }
    else if (e.key === 'd' || e.key === 'D') EF.theme.toggle($$('[data-theme-toggle]').find((b) => b.getClientRects().length));
    else if (e.key === 'Escape') closeDrawer();
  });
  // Open every collapsible bit before printing so the printout has all the notes
  let reopened = [];
  window.addEventListener('beforeprint', () => { reopened = $$('details:not([open])', main); reopened.forEach((d) => d.setAttribute('open', '')); });
  window.addEventListener('afterprint', () => { reopened.forEach((d) => d.removeAttribute('open')); reopened = []; });

  EF.on('theme', (t) => {
    $$('[data-theme-toggle]').forEach((b) => { b.innerHTML = themeFace(t, b.hasAttribute('data-label')); b.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'); });
    // the phone's status bar takes the page colour, so the top of the screen looks like one piece
    const m = document.querySelector('meta[name=theme-color]'), bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    if (m && bg) m.content = bg;
  });
  const paintStreak = () => { const n = EF.store.streak(); $$('.streak-chip').forEach((el) => { el.innerHTML = `${EF.img3d('fire', 24)}<strong>${n}</strong>`; el.title = n + '-day study streak' + (EF.store.freezes() ? ` · ${EF.store.freezes()} streak freeze${EF.store.freezes() > 1 ? 's' : ''} ready` : ''); el.classList.toggle('is-hot', n > 0); }); };
  EF.on('streak', () => { paintStreak(); EF.paintGoal(); });
  EF.on('sets', () => { clearTimeout(sideTimer); sideTimer = setTimeout(renderSidebar, 50); });
  EF.on('cloud', () => { clearTimeout(sideTimer); sideTimer = setTimeout(renderSidebar, 60); });
  let sideTimer = null;
  EF.on('progress', () => { clearTimeout(sideTimer); sideTimer = setTimeout(renderSidebar, 200); });

  const readBar = $('.read-bar > span');
  let readTick = false;
  function updateReadBar() {
    readTick = false;
    if (!readBar) return;
    const on = viewKey.startsWith('s:');
    readBar.parentElement.classList.toggle('is-on', on);
    if (!on) return;
    const h = document.documentElement.scrollHeight - innerHeight;
    readBar.style.transform = `scaleX(${h > 0 ? Math.min(1, scrollY / h) : 0})`;
  }
  window.addEventListener('scroll', () => { if (!readTick) { readTick = true; requestAnimationFrame(updateReadBar); } }, { passive: true });

  const keysDlg = $('#keys');
  function openKeys() { if (keysDlg && !keysDlg.open) { if (keysDlg.showModal) keysDlg.showModal(); else keysDlg.setAttribute('open', ''); } }
  if (keysDlg) keysDlg.addEventListener('click', (e) => { if (e.target === keysDlg) keysDlg.close(); });

  /* Installable + offline (only over http/https — service workers don't run from a local file) */
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; renderSidebar(); });
  window.addEventListener('appinstalled', () => { installEvt = null; renderSidebar(); EF.toast('ExamForge installed — study anywhere, even offline', 'fa-download'); });
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  window.addEventListener('hashchange', () => { closeSearch(); route(); });

  /* ================= BOOT ================= */
  const boot = () => {
  EF.emit('theme', EF.theme.get());
  paintStreak();
  EF.paintGoal();
  EF.paintTopMe();
  route();
  document.documentElement.classList.add('is-ready');
  };
  if (EF.accountAuth) EF.accountAuth.ready.then(boot); else boot();
})();
