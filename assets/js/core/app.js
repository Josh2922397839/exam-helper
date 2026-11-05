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

  /* ================= SIDEBAR ================= */
  function renderSidebar() {
    const [a, sid] = parts();
    const here = a === 's' ? sid : null;
    const navItem = (href, ic, label, key, extra) => `<a class="side-link${current(key) ? ' is-active' : ''}" href="${href}" ${current(key) ? 'aria-current="page"' : ''}>${icon(ic)}<span>${label}</span>${extra || ''}</a>`;
    const mistakes = EF.store.state().mistakes.length;
    sidebar.innerHTML = `
      <nav class="side-nav" aria-label="Study tools">
        ${navItem('#/', 'fa-house', 'Home', 'home')}
        ${navItem('#/quiz', 'fa-bolt', 'Quiz Arena', 'quiz', mistakes ? `<span class="side-badge" title="Saved mistakes">${mistakes}</span>` : '')}
        ${navItem('#/cards', 'fa-clone', 'Study sets', 'cards')}
        ${navItem('#/sets', 'fa-layer-group', 'My sets', 'sets')}
        ${navItem('#/progress', 'fa-chart-simple', 'My Progress', 'progress')}
      </nav>
      ${(EF.multiGrade() ? EF.grades().map((g) => [g, EF.inGrade(g)]) : [[null, EF.subjects]]).map(([g, list]) => `
      <p class="side-label">${g ? 'Grade ' + g : 'Subjects'}</p>
      <ul class="side-subjects">
        ${list.map((s) => {
          const on = here === s.id;
          const p = EF.store.progress(s.id);
          const seen = EF.store.state().visited[s.id] || [];
          return `<li class="side-subject tint${on ? ' is-open' : ''}" style="--c:${s.color}">
            <a class="side-link" href="#/s/${s.id}" ${on ? 'aria-current="page"' : ''}><span class="side-emoji">${EF.subjectIcon(s.id)}</span><span>${esc(s.name)}</span><span class="side-pct" title="${p.pct}% complete">${p.pct}%</span></a>
            ${on ? `<ul class="side-topics">${s.topics.map((t) => `<li><a href="#/s/${s.id}/${t.id}" data-topic="${t.id}">${seen.includes(t.id) ? icon('fa-circle-check', 'seen') : '<i class="dot-o" aria-hidden="true"></i>'}${esc(topicLabel(t))}</a></li>`).join('')}
              <li><a href="#/s/${s.id}/quiz" data-topic="quiz">${icon('fa-bolt')}Quiz</a></li>
              <li><a href="#/cards/${s.id}">${icon('fa-clone')}Flashcards</a></li></ul>` : ''}
          </li>`;
        }).join('')}
      </ul>`).join('')}
      <div class="side-foot">
        ${installEvt ? `<button type="button" class="btn btn-sm side-install" data-install>${icon('fa-download')} Install app</button>` : ''}
        <span><kbd>/</kbd> search</span><span><kbd>D</kbd> theme</span><button type="button" class="link" data-keys><kbd>?</kbd></button>
      </div>`;
    if (here && here !== lastOpen) { const st = $('.side-topics', sidebar); if (st) st.classList.add('is-entering'); }
    lastOpen = here;
    if (here && spy && spy.active) markTopic(spy.active);
  }
  let lastOpen = null;
  function current(key) {
    const k = viewKey.split(':')[0];
    return viewKey === key || k === key || (key === 'cards' && ['set', 'learn', 'match'].includes(k)) || (key === 'sets' && ['make', 'import'].includes(k));
  }

  /* ================= PAGES ================= */
  const pages = {};

  pages.home = () => {
    const st = EF.store.state();
    const last = st.last && EF.subject(st.last.s);
    const lastTopic = last && last.topics.find((t) => t.id === st.last.t);
    const subs = EF.inGrade(EF.grade());
    const tot = totals(subs);
    const g = EF.grade();
    const streak = EF.store.streak();
    const acc = st.answered ? Math.round((st.correct / st.answered) * 100) : 0;
    const mastered = EF.subjects.reduce((n, s) => n + EF.store.mastered(s.id), 0);
    const lv = EF.store.level();
    const dueAll = subs.concat(EF.sets.list().map((x) => EF.sets.get(x.id))).reduce((n, s) => n + EF.store.due(s.id).length, 0);
    const week = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d; });
    // the hero ring spaces itself evenly for however many subjects there are (newest grade first)
    const ring = subs.slice().sort((a, b) => EF.gradeOf(b) - EF.gradeOf(a)).slice(0, 10);
    const stickers = ring.map((s, i) => `<a class="sticker tint" href="#/s/${s.id}" style="--c:${s.color};--i:${i}" tabindex="-1">${EF.subjectIcon(s.id)}<b>${esc(s.short)}</b></a>`).join('');

    return `
      <div class="page home">
        <section class="hero">
          <div class="hero-copy">
            <span class="eyebrow">${icon('fa-graduation-cap')} ${g === 'all' ? EF.gradeLabel() : 'Grade ' + g} exam prep</span>
            <h1>Master every subject.<br><span class="hl">Crush every exam.</span></h1>
            <p class="hero-sub">Interactive 3D models, flashcards that remember what you struggle with, and practice quizzes that explain every answer — for all ${EF.subjects.length} of your subjects.</p>
            <div class="btn-row">
              ${last ? `<a class="btn btn-primary btn-lg" href="#/s/${last.id}${lastTopic ? '/' + lastTopic.id : ''}">${icon('fa-play')} Continue ${esc(last.short)}${lastTopic ? ` <small>· ${esc(topicLabel(lastTopic))}</small>` : ''}</a>`
                : `<a class="btn btn-primary btn-lg" href="#/s/${subs[0].id}">${icon('fa-play')} Start studying</a>`}
              <a class="btn btn-lg" href="#/quiz/exam${g === 'all' ? '' : g}">${icon('fa-fire-flame-curved')} Exam mode</a>
            </div>
            <ul class="hero-facts">
              <li><strong>${subs.length}</strong> subjects</li>
              <li><strong>${tot.topics}</strong> topics</li>
              <li><strong>${tot.questions}</strong> quiz questions</li>
              <li><strong>${tot.cards}</strong> flashcards</li>
            </ul>
          </div>
          <div class="hero-art${ring.length > 8 ? ' is-crowded' : ''}" aria-hidden="true" style="--n:${Math.max(ring.length, 5)}">
            <div class="orbit"><span></span><span></span><span></span></div>
            ${stickers}
            <span class="sticker sticker-grade">A+</span>
          </div>
        </section>

        <section class="dash" aria-label="Your stats">
          <div class="dash-tile">
            <span class="dash-ic dash-fire">${icon('fa-fire')}</span>
            <div><strong class="dash-v" data-count="${streak}">${streak}</strong><span class="dash-l">day streak</span></div>
            <div class="week" aria-label="Last 7 days">${week.map((d) => `<i class="${EF.store.studiedOn(d) ? 'on' : ''}" title="${d.toLocaleDateString(undefined, { weekday: 'short' })}">${d.toLocaleDateString(undefined, { weekday: 'narrow' })}</i>`).join('')}</div>
          </div>
          <div class="dash-tile">${EF.ring(EF.store.overall(), 64, 7)}<div><strong class="dash-v">Overall</strong><span class="dash-l">progress</span></div></div>
          <a class="dash-tile dash-goal" href="#/progress">${goalRing()}<div><strong class="dash-v">Level ${lv.lvl}</strong><span class="dash-l">${EF.store.xpToday()}/${EF.store.goal()} XP today</span><span class="lvl-bar" aria-hidden="true"><span style="width:${lv.pct}%"></span></span></div></a>
          <a class="dash-tile" href="#/cards"><span class="dash-ic">${icon(dueAll ? 'fa-clock-rotate-left' : 'fa-medal')}</span><div><strong class="dash-v" data-count="${dueAll || mastered}">${dueAll || mastered}</strong><span class="dash-l">${dueAll ? `card${dueAll === 1 ? '' : 's'} due for review` : `of ${tot.cards} cards mastered`}</span></div></a>
        </section>

        <section class="home-section">
          <div class="section-head"><h2>Your subjects</h2>${gradeSwitch()}<a class="link" href="#/progress">See progress ${icon('fa-arrow-right')}</a></div>
          ${gradeGrid(subs, (s) => {
            const p = EF.store.progress(s.id);
            return `<a class="subject-card tint" href="#/s/${s.id}" style="--c:${s.color}">
              <div class="subject-card-top"><span class="subject-emoji" ${vt('icon-' + s.id)}>${EF.subjectIcon(s.id)}</span>${EF.ring(p.pct, 48, 5)}</div>
              <h3><span ${vt('title-' + s.id)}>${esc(s.name)}</span></h3>
              <p>${esc(s.tagline)}</p>
              <div class="subject-card-meta"><span>${icon('fa-book-open')} ${p.visited}/${p.total} topics</span><span>${icon('fa-bolt')} ${p.attempts ? 'Best ' + p.best + '%' : s.quiz.length + ' Qs'}</span></div>
            </a>`;
          })}
        </section>

        <section class="home-section">
          <div class="section-head"><h2>Study your way</h2></div>
          <div class="tools">
            <a class="tool" href="#/s/chemistry/atom-model"><span class="tool-ic" style="--c:#14b8c4">${icon('fa-cube')}</span><h3>3D models</h3><p>Spin atoms 1–20 on a mini periodic table and click through a full 3D skeleton.</p></a>
            <a class="tool" href="#/cards"><span class="tool-ic" style="--c:#9b6bff">${icon('fa-brain')}</span><h3>Smart flashcards</h3><p>Spaced repetition: cards you miss come back sooner, cards you know level up.</p></a>
            <a class="tool" href="#/quiz"><span class="tool-ic" style="--c:#2fbf71">${icon('fa-check-double')}</span><h3>Quizzes that teach</h3><p>Instant feedback, an explanation for every answer, and a “fix my mistakes” mode.</p></a>
          </div>
        </section>
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
            <span class="subject-emoji subject-emoji-lg" ${vt('icon-' + s.id)}>${EF.subjectIcon(s.id)}</span>
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
            <a class="btn" href="#/cards/${s.id}">${icon('fa-clone')} Flashcards</a>
            <a class="btn" href="#/match/${s.id}">${icon('fa-shapes')} Match</a>
            <button type="button" class="btn btn-ghost" data-print>${icon('fa-print')} Print notes</button>
          </div>
        </header>

        <nav class="topic-chips" aria-label="Topics in ${esc(s.name)}">
          ${s.topics.map((t) => `<a class="chip-link" href="#/s/${s.id}/${t.id}" data-topic="${t.id}">${esc(topicLabel(t))}</a>`).join('')}
          <a class="chip-link chip-quiz" href="#/s/${s.id}/quiz" data-topic="quiz">${icon('fa-bolt')} Quiz</a>
        </nav>

        ${s.topics.map((t, i) => `
          <section class="topic" id="t-${t.id}" data-topic="${t.id}" aria-labelledby="h-${t.id}">
            <header class="topic-head">
              <span class="topic-icon">${icon(t.icon || 'fa-bookmark')}</span>
              <div><span class="topic-num">Topic ${i + 1} of ${s.topics.length}</span><h2 id="h-${t.id}">${esc(t.title)}</h2></div>
              <span class="topic-seen${seen.includes(t.id) ? ' is-on' : ''}" title="Read">${icon('fa-circle-check')}<span class="sr-only">Read</span></span>
            </header>
            ${EF.renderBlocks(t.blocks, s)}
          </section>`).join('')}

        <section class="topic topic-quiz" id="t-quiz" data-topic="quiz" aria-labelledby="h-quiz">
          <header class="topic-head">
            <span class="topic-icon">${icon('fa-bolt')}</span>
            <div><span class="topic-num">Test yourself</span><h2 id="h-quiz">${esc(s.short)} Quiz</h2></div>
          </header>
          <div class="quiz-host" data-quiz="${s.id}"></div>
          <a class="cta-card" href="#/cards/${s.id}">${icon('fa-clone')}<div><strong>Lock it in with flashcards</strong><span>${(s.flashcards || []).length} cards · spaced repetition</span></div>${icon('fa-arrow-right')}</a>
        </section>

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
        <div class="arena-top">
          <a class="arena-card arena-exam" href="#/quiz/${examId}">
            <span class="arena-ic" ${vt('icon-exam')}>${icon('fa-fire-flame-curved')}</span>
            <div><h2>${g === 'all' ? '' : 'Grade ' + g + ' '}Exam Mode</h2><p>20 random questions from all ${subs.length} ${g === 'all' ? '' : 'Grade ' + g + ' '}subjects.</p>${exam ? `<span class="pill">${icon('fa-trophy')} Best ${exam.best}%</span>` : ''}</div>
            <span class="btn btn-primary">Start ${icon('fa-arrow-right')}</span>
          </a>
          <a class="arena-card arena-fix${mistakes ? '' : ' is-empty'}" href="#/quiz/mistakes">
            <span class="arena-ic">${icon('fa-bandage')}</span>
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
    const mode = (href, ic, title, sub, extra) => `<a class="mode-card" href="${href}"><span class="mode-ic">${icon(ic)}</span><div><strong>${title}</strong><span>${sub}</span></div>${extra ? `<span class="mode-extra">${extra}</span>` : ''}${icon('fa-chevron-right', 'mode-go')}</a>`;
    return `<div class="page narrow tint" style="--c:${s.color}">
      <a class="crumb" href="#/cards">${icon('fa-arrow-left')} Study sets</a>
      <header class="page-head page-head-sm quiz-page-head"><span class="quiz-page-ic" ${vt('icon-' + s.id)}>${EF.subjectIcon(s.id)}</span><div><span class="eyebrow">${s.custom ? 'My set' : 'Grade ' + EF.gradeOf(s) + ' subject'} · ${n} cards</span><h1>${esc(s.name)}</h1></div></header>
      <div class="set-stats"><span>${icon('fa-medal')} <strong>${m}/${n}</strong> mastered</span><span>${icon('fa-clock-rotate-left')} <strong>${due}</strong> due today</span>${best ? `<span>${icon('fa-stopwatch')} best match <strong>${(best / 1000).toFixed(1)}s</strong></span>` : ''}${q ? `<span>${icon('fa-trophy')} best test <strong>${q.best}%</strong></span>` : ''}</div>
      <div class="modes">
        ${mode('#/learn/' + s.id, 'fa-graduation-cap', 'Learn', 'Choose, then type the answers. 3 lives per round.', '+6 XP each')}
        ${mode('#/cards/' + s.id, 'fa-clone', 'Flashcards', due ? `${due} due for review now` : 'Flip, then rate yourself', '')}
        ${mode('#/match/' + s.id, 'fa-shapes', 'Match', 'Pair them up against the clock', best ? (best / 1000).toFixed(1) + 's' : '')}
        ${s.quiz.length ? mode('#/quiz/' + s.id, 'fa-bolt', 'Test', s.quiz.length + ' questions with explanations', q ? q.best + '%' : '') : ''}
        ${s.custom ? '' : mode('#/s/' + s.id, 'fa-book-open', 'Study guide', 'Full notes, worked examples and tools', '')}
      </div>
      ${s.custom ? `<div class="btn-row"><button type="button" class="btn btn-primary" data-share="${esc(s.id)}">${icon('fa-share-nodes')} Share with friends</button><a class="btn" href="#/make/${esc(s.id)}">${icon('fa-pen')} Edit</a></div>` : ''}
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
  pages.importSet = (code) => `<div class="page narrow"><div data-import="${esc(code)}"></div></div>`;

  pages.cards = (s) => `
    <div class="page narrow">
      <a class="crumb" href="#/set/${esc(s.id)}">${icon('fa-arrow-left')} ${esc(s.name)}</a>
      <header class="page-head page-head-sm tint quiz-page-head" style="--c:${s.color}"><span class="quiz-page-ic" ${vt('icon-' + s.id)}>${EF.subjectIcon(s.id)}</span><div><span class="eyebrow">Flashcards</span><h1>${esc(s.name)}</h1></div></header>
      <div class="cards-host" data-cards="${s.id}"></div>
      <p class="muted small center">Shortcuts: <kbd>space</kbd> flip · <kbd>1</kbd> again · <kbd>2</kbd> got it</p>
    </div>`;

  pages.progress = () => {
    const st = EF.store.state();
    const days = Array.from({ length: 35 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (34 - i)); return d; });
    return `
      <div class="page">
        <header class="page-head"><span class="eyebrow">${icon('fa-chart-simple')} Saved on this device</span><h1>My progress</h1><p>Progress = 40% topics read + 40% best quiz score + 20% flashcards mastered.</p></header>
        <div class="progress-top">
          <div class="card progress-overall">${EF.ring(EF.store.overall(), 120, 10)}<div><h3>Overall</h3><p class="muted">${st.answered} questions answered${st.answered ? ` · ${Math.round((st.correct / st.answered) * 100)}% correct` : ''}</p></div></div>
          <div class="card">
            <h3>${icon('fa-fire')} ${EF.store.streak()}-day streak</h3>
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

  pages.notFound = () => `<div class="page narrow center"><h1>Page not found</h1><p class="muted">That link doesn’t go anywhere.</p><a class="btn btn-primary" href="#/">${icon('fa-house')} Go home</a></div>`;

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
    const swap = () => render(key, html, title, after);
    // Cross-fade between pages where the browser supports it (not on first load or with reduced motion)
    if (document.startViewTransition && !firstShow && !EF.reducedMotion() && !document.documentElement.classList.contains('vt-theme')) {
      document.documentElement.classList.add('vt-page');
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
    $$('[data-quiz]', main).forEach((el) => cleanup.push(EF.mountQuiz(el, el.dataset.quiz, { inline: !el.hasAttribute('data-autostart'), autostart: el.hasAttribute('data-autostart') })));
    $$('[data-cards]', main).forEach((el) => cleanup.push(EF.mountCards(el, el.dataset.cards)));
    $$('[data-learn]', main).forEach((el) => cleanup.push(EF.mountLearn(el, el.dataset.learn)));
    $$('[data-match]', main).forEach((el) => cleanup.push(EF.mountMatch(el, el.dataset.match)));
    $$('[data-make]', main).forEach((el) => cleanup.push(EF.mountMake(el, el.dataset.make || null)));
    $$('[data-import]', main).forEach((el) => cleanup.push(EF.mountImport(el, el.dataset.import)));
    renderSidebar();
    closeDrawer();
    const tab = { set: 'cards', learn: 'cards', match: 'cards', sets: 'cards', make: 'cards', import: 'cards' }[key.split(':')[0]] || key.split(':')[0];
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
    if (a === 'set' || a === 'learn' || a === 'match') {
      const s = EF.subject(b);
      if (!s || !s.flashcards || !s.flashcards.length) return show('404', pages.notFound(), 'Not found');
      return show(a + ':' + s.id, pages[a](s), s.short + (a === 'set' ? '' : a === 'learn' ? ' · Learn' : ' · Match'));
    }
    if (a === 'sets') return show('sets', pages.sets(), 'My sets');
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
      if (id !== 'quiz') {
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
    const sh = t.closest('[data-share]');
    if (sh) { const set = EF.sets.raw(sh.dataset.share); if (set) EF.sets.share(set).then((r) => { if (r === 'copied') EF.toast('Link copied: send it to your friends!', 'fa-link'); else if (r === 'shared') EF.toast('Shared!', 'fa-share-nodes'); }); return; }
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
    else if (e.key === 'd' || e.key === 'D') EF.theme.toggle($('[data-theme-toggle]'));
    else if (e.key === 'Escape') closeDrawer();
  });
  // Open every collapsible bit before printing so the printout has all the notes
  let reopened = [];
  window.addEventListener('beforeprint', () => { reopened = $$('details:not([open])', main); reopened.forEach((d) => d.setAttribute('open', '')); });
  window.addEventListener('afterprint', () => { reopened.forEach((d) => d.removeAttribute('open')); reopened = []; });

  EF.on('theme', (t) => { $$('[data-theme-toggle]').forEach((b) => { b.innerHTML = icon(t === 'dark' ? 'fa-sun' : 'fa-moon'); b.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'); }); });
  const paintStreak = () => { const n = EF.store.streak(); $$('.streak-chip').forEach((el) => { el.innerHTML = `${icon('fa-fire')}<strong>${n}</strong>`; el.title = n + '-day study streak'; el.classList.toggle('is-hot', n > 0); }); };
  EF.on('streak', () => { paintStreak(); EF.paintGoal(); });
  EF.on('sets', () => { clearTimeout(sideTimer); sideTimer = setTimeout(renderSidebar, 50); });
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

  window.addEventListener('hashchange', route);

  /* ================= BOOT ================= */
  EF.emit('theme', EF.theme.get());
  paintStreak();
  EF.paintGoal();
  route();
  document.documentElement.classList.add('is-ready');
})();
