/* Zing core — quiz runner and spaced-repetition flashcards */
(function () {
  'use strict';
  const EF = window.EF;
  const esc = EF.esc, icon = EF.icon;
  const typing = (e) => e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
  const inView = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 80 && r.top < innerHeight - 40; };

  /* ================= QUIZ ================= */
  EF.quizMeta = (id) => {
    const ex = /^exam(\d*)$/.exec(id);
    if (ex) return { id, title: ex[1] ? `Grade ${ex[1]} Exam Mode` : 'Exam Mode', sub: `20 mixed questions from every${ex[1] ? ' Grade ' + ex[1] : ''} subject`, color: '#ff5e4d', icon: 'fa-fire-flame-curved' };
    if (id === 'mistakes') return { id, title: 'Fix My Mistakes', sub: 'Questions you got wrong before', color: '#f0506e', icon: 'fa-bandage' };
    const s = EF.subject(id);
    return s ? { id, title: s.name + ' Quiz', sub: s.quiz.length > TEST_N && !s.custom ? `${TEST_N} questions picked from ${s.quiz.length}` : s.quiz.length + ' questions', color: s.color, icon: s.icon } : null;
  };

  // a subject test is 20 questions picked from its whole deck; the same seed always picks the same ones (challenge links)
  const TEST_N = 20;
  EF.buildQuiz = (id, seed) => {
    const all = [];
    EF.subjects.forEach((s) => s.quiz.forEach((q, i) => all.push(Object.assign({ key: s.id + ':' + i, sid: s.id }, q))));
    let list;
    const ex = /^exam(\d*)$/.exec(id);
    // questions from your own sets (they live outside EF.subjects)
    const mine = () => EF.sets.list().map((x) => EF.sets.get(x.id)).flatMap((s) => s.quiz.map((q, i) => Object.assign({ key: s.id + ':' + i, sid: s.id }, q)));
    if (ex) list = EF.shuffle(ex[1] ? all.filter((q) => EF.gradeOf(EF.subject(q.sid)) === +ex[1]) : all).slice(0, 20);
    else if (id === 'mistakes') { const m = EF.store.state().mistakes; list = EF.shuffle(all.concat(mine()).filter((q) => m.includes(q.key))); }
    else if (EF.subjects.some((s) => s.id === id)) { const mineOnly = all.filter((q) => q.sid === id); list = (seed ? EF.shuffleWith(mineOnly, EF.rng(seed)) : EF.shuffle(mineOnly)).slice(0, TEST_N); }
    else list = EF.shuffle(mine().filter((q) => q.sid === id));
    // Shuffle answer order too, remembering where the right one went
    return list.map((q) => {
      const order = EF.shuffle(q.options.map((_, i) => i));
      return Object.assign({}, q, { options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) });
    });
  };

  EF.mountQuiz = (el, id, opts = {}) => {
    const meta = EF.quizMeta(id);
    let qs = [], i = 0, picked = null, right = 0, wrong = [], phase = 'start', barFrom = 0, entering = false, removed = -1, row = 0;
    const vs = opts.vs ? EF.vs.decode(opts.vs) : null;
    el.classList.add('quiz', 'tint');
    el.style.setProperty('--c', meta.color);

    let seed = 0;
    const start = (list) => {
      if (!list) seed = vs ? vs.seed : ((Math.random() * 4294967295) >>> 0) || 1;
      qs = list || EF.buildQuiz(id, seed);
      i = 0; picked = null; right = 0; wrong = []; phase = qs.length ? 'q' : 'empty'; barFrom = 0; entering = true; removed = -1; row = 0;
      render();
      if (opts.inline) el.scrollIntoView({ behavior: EF.reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    };

    function render() {
      if (phase === 'start') {
        const best = EF.store.quiz(id);
        el.innerHTML = `
          <div class="quiz-start">
            <span class="quiz-icon">${icon(meta.icon)}</span>
            <div><h3>${esc(meta.title)}</h3><p class="muted">${esc(meta.sub)} · instant feedback · explanations</p>
            ${best ? `<p class="quiz-best">${icon('fa-trophy')} Best ${best.best}% · ${best.attempts} attempt${best.attempts === 1 ? '' : 's'}</p>` : ''}</div>
            <button type="button" class="btn btn-c btn-lg" data-start>${icon('fa-play')} Start quiz</button>
          </div>`;
        return;
      }
      if (phase === 'empty') {
        el.innerHTML = `<div class="quiz-start"><span class="quiz-icon">${icon('fa-circle-check')}</span><div><h3>Nothing to fix!</h3><p class="muted">You have no saved mistakes. Take a quiz and any question you miss will show up here.</p></div><a class="btn btn-c" href="#/quiz">${icon('fa-arrow-left')} Quiz Arena</a></div>`;
        return;
      }
      if (phase === 'done') return results();
      const q = qs[i];
      const subj = /^exam/.test(id) || id === 'mistakes' ? EF.subject(q.sid) : null;
      el.innerHTML = `
        <div class="quiz-top">
          <span class="quiz-count">Question <strong>${i + 1}</strong> of ${qs.length}</span>
          ${subj ? `<span class="pill tint" style="--c:${subj.color}">${EF.subjectIcon(subj.id)} ${esc(subj.short)}</span>` : ''}
          <span class="quiz-score${picked != null && picked === q.answer ? ' bump' : ''}">${icon('fa-check')} ${right}</span>
        </div>
        <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${qs.length}" aria-valuenow="${i}"><span style="width:${barFrom}%"></span></div>
        ${q.ctx ? `<blockquote class="quiz-ctx"><span>${icon('fa-book-open')} Read this first</span>${q.ctx}</blockquote>` : ''}
        <h3 class="quiz-q" id="qq-${esc(id)}">${q.q}</h3>
        <div class="quiz-opts" role="group" aria-labelledby="qq-${esc(id)}">
          ${q.options.map((o, oi) => `<button type="button" class="opt${picked == null ? (oi === removed ? ' is-removed' : '') : oi === q.answer ? ' is-right' : oi === picked ? ' is-wrong' : ' is-dim'}${picked === oi ? ' is-picked' : ''}" data-opt="${oi}" ${picked == null && oi !== removed ? '' : 'disabled'}><span class="opt-key">${'ABCD'[oi]}</span><span>${o}</span>${picked != null && oi === q.answer ? icon('fa-circle-check', 'opt-mark') : picked === oi ? icon('fa-circle-xmark', 'opt-mark') : ''}</button>`).join('')}
        </div>
        ${picked == null ? `<div class="quiz-help"><p class="quiz-hint muted">Press <kbd>1</kbd>–<kbd>4</kbd> or tap an answer</p>${q.options.length >= 3 ? `<button type="button" class="link quiz-hint-btn" data-hint ${removed >= 0 ? 'disabled' : ''}>${icon('fa-lightbulb')} ${removed >= 0 ? 'Hint used: half XP' : 'Hint: remove a wrong answer'}</button>` : ''}</div>` : `
        <div class="quiz-fb ${picked === q.answer ? 'is-right' : 'is-wrong'}" role="status">
          <strong>${picked === q.answer ? icon('fa-circle-check') + ' Correct!' : icon('fa-circle-xmark') + ' Not quite.'}</strong>
          ${q.why ? `<p>${q.why}</p>` : ''}
        </div>
        <div class="quiz-next"><button type="button" class="btn btn-c" data-next>${i + 1 < qs.length ? 'Next question ' + icon('fa-arrow-right') : 'See results ' + icon('fa-flag-checkered')}</button></div>`}`;
      const nb = el.querySelector('[data-next]');
      if (nb) { nb.focus({ preventScroll: true }); requestAnimationFrame(() => nb.scrollIntoView({ block: 'nearest', behavior: EF.reducedMotion() ? 'auto' : 'smooth' })); }
      const target = (i / qs.length) * 100, barEl = el.querySelector('.bar > span');
      if (barEl) requestAnimationFrame(() => { barEl.style.width = target + '%'; });
      barFrom = target;
      el.classList.toggle('is-entering', entering);
      if (entering) { entering = false; setTimeout(() => el.classList.remove('is-entering'), 600); }
    }

    function results() {
      const pct = Math.round((right / qs.length) * 100);
      const msg = pct === 100 ? 'Perfect score. You’re cooking! 🔥' : pct >= 80 ? 'Great work — exam ready.' : pct >= 50 ? 'Solid start. Review the misses below.' : 'Keep going — every attempt makes it stick.';
      el.innerHTML = `
        <div class="quiz-done">
          ${EF.mascot ? `<span class="quiz-done-zing">${EF.mascot(pct >= 80 ? 'cheer' : pct >= 50 ? 'read' : 'sad', 110)}</span>` : ''}
          ${EF.ring(pct, 120, 10)}
          <div>
            <h3>${esc(msg)}</h3>
            <p class="muted">${right} of ${qs.length} correct${id !== 'mistakes' && EF.store.quiz(id) ? ` · best ${EF.store.quiz(id).best}%` : ''}</p>
            ${vs ? EF.vs.verdict(vs, right, qs.length) : ''}
            <div class="btn-row">
              <button type="button" class="btn btn-c" data-retry>${icon('fa-rotate-right')} Try again</button>
              ${wrong.length ? `<button type="button" class="btn" data-retry-wrong>${icon('fa-bandage')} Redo the ${wrong.length} I missed</button>` : ''}
              ${wrong.length ? `<button type="button" class="btn" data-to-cards>${icon('fa-clone')} Make flashcards from my mistakes</button>` : ''}
              ${!vs && canChallenge ? `<button type="button" class="btn" data-challenge>${icon('fa-user-group')} Challenge a friend</button>` : ''}
              ${opts.inline ? '' : `<a class="btn btn-ghost" href="#/quiz">${icon('fa-arrow-left')} Quiz Arena</a>`}
            </div>
          </div>
        </div>
        ${wrong.length ? `<h4 class="sub-heading">Review</h4><ol class="review">${wrong.map((q) => `<li><p class="review-q">${q.q}</p><p class="review-a">${icon('fa-xmark')} You said: ${q.options[q.picked]}</p><p class="review-c">${icon('fa-check')} Answer: ${q.options[q.answer]}</p>${q.why ? `<p class="muted">${q.why}</p>` : ''}</li>`).join('')}</ol>` : ''}`;
    }

    const canChallenge = !!(EF.subject(id) && !EF.subject(id).custom && EF.vs);
    /* save the questions you missed as a flashcard set you can drill later */
    function toCards() {
      const subj = EF.subject(id) || (wrong[0] && EF.subject(wrong[0].sid));
      const cards = wrong.map((q) => [(q.ctx ? '(Passage) ' : '') + EF.htmlText(q.q), EF.htmlText(q.options[q.answer])]).filter((c) => c[0] && c[1]);
      if (!cards.length) return;
      const set = EF.sets.save({ name: `${meta.title.replace(/ Quiz$/, '')}: my mistakes`, color: subj ? subj.color : undefined, cards });
      EF.toast(`Saved ${cards.length} card${cards.length === 1 ? '' : 's'} to “${set.name}”`, 'fa-clone');
      location.hash = '#/deck/' + set.id;
    }
    function choose(oi) {
      if (phase !== 'q' || picked != null) return;
      const q = qs[i];
      picked = oi;
      const ok = oi === q.answer;
      if (ok) { right++; row++; if (EF.daily) EF.daily.max('row', row); } else { row = 0; wrong.push(Object.assign({ picked: oi }, q)); }
      EF.store.answer(q.key, ok, removed >= 0);
      EF.haptic(ok ? 'success' : 'error');
      render();
    }
    /* Hint: cross out one wrong answer (the question then earns half XP) */
    function hint() {
      if (phase !== 'q' || picked != null || removed >= 0) return;
      const q = qs[i], wrongs = q.options.map((_, k) => k).filter((k) => k !== q.answer);
      removed = wrongs[Math.floor(Math.random() * wrongs.length)];
      render();
    }
    function next() {
      if (picked == null) return;
      if (i + 1 < qs.length) { i++; picked = null; removed = -1; entering = true; render(); const t = el.querySelector('.quiz-q'); if (t && !inView(t)) el.scrollIntoView({ block: 'start' }); return; }
      phase = 'done';
      const pct = Math.round((right / qs.length) * 100);
      if (id !== 'mistakes') EF.store.recordQuiz(id, pct);
      if (pct >= 80) EF.confetti();
      render();
    }

    const onClick = (e) => {
      const t = e.target.closest('button');
      if (!t || !el.contains(t)) return;
      if (t.hasAttribute('data-start') || t.hasAttribute('data-retry')) start();
      else if (t.hasAttribute('data-retry-wrong')) start(EF.shuffle(wrong.map((q) => Object.assign({}, q))));
      else if (t.dataset.opt != null) choose(+t.dataset.opt);
      else if (t.hasAttribute('data-next')) next();
      else if (t.hasAttribute('data-hint')) hint();
      else if (t.hasAttribute('data-to-cards')) toCards();
      else if (t.hasAttribute('data-challenge')) EF.vs.send({ m: 'quiz', s: id, seed, sc: right, of: qs.length });
      else if (t.hasAttribute('data-vs-back')) EF.vs.send({ m: 'quiz', s: id, seed: vs.seed, sc: right, of: qs.length });
    };
    const onKey = (e) => {
      if (typing(e) || e.metaKey || e.ctrlKey || e.altKey || phase !== 'q' || !inView(el)) return;
      const k = e.key.toLowerCase();
      const n = '1234'.indexOf(k) >= 0 ? '1234'.indexOf(k) : 'abcd'.indexOf(k);
      if (n >= 0 && picked == null && n < qs[i].options.length && n !== removed) { e.preventDefault(); choose(n); }
      else if (k === 'h' && picked == null) { e.preventDefault(); hint(); }
      else if ((k === 'enter' || k === 'arrowright') && picked != null) { e.preventDefault(); next(); }
    };
    el.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    if (opts.autostart) start(); else render();
    return () => { el.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey); };
  };

  /* ================= FLASHCARDS (Leitner boxes 0–5, mastered at 3+) ================= */
  EF.mountCards = (el, sid) => {
    const s = EF.subject(sid);
    const all = s.flashcards.map((c) => ({ front: c[0], back: c[1], cat: c[2] || '', why: c[4] || '' }));
    const cats = Array.from(new Set(all.map((c) => c.cat).filter(Boolean)));
    let cat = '', deck = [], i = 0, flipped = false, got = 0, again = 0, unsure = 0, mode = 'due';
    let rev = (() => { try { return localStorage.getItem('ef2:cardsRev') === '1'; } catch (e) { return false; } })();
    el.classList.add('cards', 'tint');
    el.style.setProperty('--c', s.color);
    const box = (c) => EF.store.cardBox(sid, c.front);
    const pool = () => all.filter((c) => !cat || c.cat === cat);

    function newSession(m) {
      mode = m || mode;
      const p = pool();
      // review order: cards that are due today first, then cards you haven't mastered yet
      const due = new Set(EF.store.due(sid).map((c) => c[0]));
      let list = mode === 'all' ? EF.shuffle(p) : EF.shuffle(p.filter((c) => due.has(c.front) || box(c) < 3)).sort((a, b) => (due.has(b.front) - due.has(a.front)) || box(a) - box(b));
      deck = list.slice(0, 15); i = 0; flipped = false; got = 0; again = 0; unsure = 0;
      render();
    }

    function header() {
      const p = pool();
      const m = p.filter((c) => box(c) >= 3).length;
      const fresh = p.filter((c) => box(c) === 0).length, learning = p.length - fresh - m;
      return `
        <div class="cards-head">
          <div class="cards-mastery"><span>${icon('fa-medal')} <strong>${m}</strong> / ${p.length} mastered</span><div class="bar"><span style="width:${p.length ? (m / p.length) * 100 : 0}%"></span></div>
            <span class="cards-status"><span class="st-new">${fresh} new</span><span class="st-learn">${learning} learning</span><span class="st-done">${m} mastered</span>
            <button type="button" class="link cards-rev" data-rev aria-pressed="${rev}">${icon('fa-right-left')} ${rev ? 'Answer first' : 'Question first'}</button></span></div>
          ${cats.length ? `<div class="seg seg-sm seg-scroll" role="tablist" aria-label="Category"><button type="button" role="tab" data-cat="" aria-selected="${!cat}">All</button>${cats.map((c) => `<button type="button" role="tab" data-cat="${esc(c)}" aria-selected="${cat === c}">${esc(c)}</button>`).join('')}</div>` : ''}
        </div>`;
    }

    function render() {
      if (!deck.length || i >= deck.length) {
        const done = deck.length && i >= deck.length;
        const left = pool().filter((c) => box(c) < 3).length;
        el.innerHTML = header() + `
          <div class="cards-done">
            <span class="quiz-icon">${icon(done ? 'fa-flag-checkered' : 'fa-medal')}</span>
            <h3>${done ? 'Session complete!' : 'Everything here is mastered 🎉'}</h3>
            <p class="muted">${done ? `${got} got it · ${unsure} unsure · ${again} to review again` : 'You’ve mastered every card in this deck. Review them all anyway to keep them fresh.'}</p>
            <div class="btn-row">
              ${left ? `<button type="button" class="btn btn-c" data-session="due">${icon('fa-forward')} Next session (${Math.min(left, 15)} cards)</button>` : ''}
              <button type="button" class="btn${left ? '' : ' btn-c'}" data-session="all">${icon('fa-shuffle')} Review all</button>
            </div>
          </div>`;
        return;
      }
      const c = deck[i];
      const b = box(c);
      el.innerHTML = header() + `
        <div class="cards-meta"><span>Card <strong>${i + 1}</strong> of ${deck.length}</span>${c.cat ? `<span class="pill">${esc(c.cat)}</span>` : ''}<span class="boxes" title="Memory level ${b} of 5" aria-label="Memory level ${b} of 5">${[1, 2, 3, 4, 5].map((n) => `<i class="${n <= b ? 'on' : ''}"></i>`).join('')}</span></div>
        <div class="deck" data-left="${Math.min(2, deck.length - i - 1)}"><div class="bigcard${flipped ? ' is-flipped' : ' is-new'}" role="button" tabindex="0" aria-pressed="${flipped}" data-flipcard aria-label="${flipped ? 'Answer: ' + esc(rev ? c.front : c.back) : esc(rev ? c.back : c.front) + ' — press to reveal'}">
          <div class="flip-inner">
            <div class="flip-face bigcard-front"><span class="bigcard-tag">${rev ? 'Answer' : 'Question'}</span><p${s.lang && !rev ? ' lang="fr"' : ''}>${esc(rev ? c.back : c.front)}</p>${s.lang ? `<button type="button" class="speak" data-speak="${esc(c.front)}" aria-label="Hear it">${icon('fa-volume-high')}</button>` : ''}<span class="flip-hint">${icon('fa-rotate')} Tap or press space</span></div>
            <div class="flip-face bigcard-back"><span class="bigcard-tag">${rev ? 'Question' : 'Answer'}</span><p${s.lang && rev ? ' lang="fr"' : ''}>${esc(rev ? c.front : c.back)}</p>${!rev && c.why ? `<small class="bigcard-why">${esc(c.why)}</small>` : ''}</div>
          </div>
        </div></div>
        <div class="cards-actions">${actions()}</div>`;
    }
    const actions = () => flipped ? `
            <button type="button" class="btn btn-again" data-grade="0">${icon('fa-rotate-left')} Again <kbd>1</kbd></button>
            <button type="button" class="btn btn-unsure" data-grade="1">${icon('fa-circle-question')} Unsure <kbd>2</kbd></button>
            <button type="button" class="btn btn-got" data-grade="2">${icon('fa-check')} Got it <kbd>3</kbd></button>
            <p class="swipe-hint">Again: back later in this session · Unsure: back tomorrow · Got it: spaced further apart<span class="swipe-only"> · Swipe right = got it, left = again</span></p>` : `
            <button type="button" class="btn btn-c btn-lg" data-reveal>${icon('fa-eye')} Show answer <kbd>space</kbd></button>`;

    /* 0 = again (box 1, back in this session), 1 = unsure (same box, seen again soon), 2 = got it (next box) */
    function grade(level) {
      const c = deck[i];
      const b = box(c);
      EF.store.setCardBox(sid, c.front, level === 2 ? Math.min(5, b + 1) : level === 1 ? Math.max(1, Math.min(b, 2)) : 1);
      if (level === 2) got++;
      else if (level === 1) unsure++;
      else { again++; if (deck.length < 25) deck.push(c); } // missed cards come back later in the session
      i++; flipped = false; render();
    }
    // Flip in place so the 3D turn actually animates (re-rendering would just swap the faces)
    const flip = () => {
      const card = el.querySelector('[data-flipcard]');
      if (!card) return;
      flipped = !flipped;
      const c = deck[i];
      card.classList.remove('is-new');
      card.classList.toggle('is-flipped', flipped);
      card.setAttribute('aria-pressed', flipped);
      card.setAttribute('aria-label', flipped ? 'Answer: ' + (rev ? c.front : c.back) : (rev ? c.back : c.front) + ' — press to reveal');
      el.querySelector('.cards-actions').innerHTML = actions();
      card.focus({ preventScroll: true });
    };

    /* Swipe the card: right = Got it, left = Again (after it's flipped). A drag never counts as a tap. */
    let drag = null, justDragged = false;
    const onDown = (e) => {
      const card = e.target.closest('[data-flipcard]');
      if (!card || e.target.closest('.speak') || (e.pointerType === 'mouse' && e.button !== 0)) return;
      drag = { card, x: e.clientX, y: e.clientY, dx: 0, id: e.pointerId, moved: false, v: 0, lx: e.clientX, lt: performance.now() };
    };
    const onMove = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag.dx = e.clientX - drag.x;
      const now = performance.now();
      drag.v = drag.v * 0.4 + ((e.clientX - drag.lx) / Math.max(1, now - drag.lt)) * 0.6;
      drag.lx = e.clientX; drag.lt = now;
      const dy = e.clientY - drag.y;
      if (!drag.moved && Math.abs(drag.dx) > 8 && Math.abs(drag.dx) > Math.abs(dy)) { drag.moved = true; drag.card.classList.add('is-dragging'); try { drag.card.setPointerCapture(drag.id); } catch (err) { /* ignore */ } }
      if (!drag.moved) return;
      const dx = flipped ? drag.dx : drag.dx * 0.35;
      drag.card.style.transform = `translateX(${dx}px) rotate(${dx * 0.04}deg)`;
      drag.card.dataset.swipe = flipped && Math.abs(dx) > 50 ? (dx > 0 ? 'got' : 'again') : '';
    };
    const onUp = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag; drag = null;
      if (!d.moved) return;
      justDragged = true; setTimeout(() => { justDragged = false; }, 50);
      d.card.classList.remove('is-dragging');
      // far enough, or flicked fast enough → it flies off in that direction, at the speed you threw it
      const flick = Math.abs(d.v) > 0.55 && Math.abs(d.dx) > 30 && Math.sign(d.v) === Math.sign(d.dx);
      if (flipped && (Math.abs(d.dx) > 90 || flick)) {
        const ok = d.dx > 0, speed = Math.max(0.9, Math.abs(d.v));
        const ms = Math.round(Math.max(160, Math.min(320, 380 / speed)));
        d.card.style.transition = `transform ${ms}ms cubic-bezier(.2,.6,.4,1), opacity ${ms}ms ease-in`;
        d.card.style.transform = `translateX(${ok ? '' : '-'}${Math.round(innerWidth * 0.9)}px) rotate(${ok ? 18 : -18}deg)`;
        d.card.style.opacity = '0';
        EF.haptic(ok ? 'success' : 'error');
        setTimeout(() => grade(ok ? 2 : 0), ms - 40);
      } else {
        d.card.style.transition = 'transform .55s var(--spring)';
        d.card.style.transform = ''; d.card.dataset.swipe = '';
        setTimeout(() => { d.card.style.transition = ''; }, 560);
      }
    };
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    const onClick = (e) => {
      if (justDragged) return;
      if (e.target.closest('.speak')) return;
      const t = e.target.closest('button,[data-flipcard]');
      if (!t || !el.contains(t)) return;
      if (t.hasAttribute('data-flipcard') || t.hasAttribute('data-reveal')) flip();
      else if (t.dataset.grade != null) grade(+t.dataset.grade);
      else if (t.hasAttribute('data-rev')) { rev = !rev; try { localStorage.setItem('ef2:cardsRev', rev ? '1' : '0'); } catch (err) { /* */ } flipped = false; render(); }
      else if (t.dataset.session) newSession(t.dataset.session);
      else if (t.dataset.cat != null) { cat = t.dataset.cat; newSession('due'); }
    };
    const onKey = (e) => {
      if (typing(e) || e.metaKey || e.ctrlKey || e.altKey || !deck.length || i >= deck.length || !inView(el)) return;
      if (e.key === ' ' || e.key === 'Enter') { if (e.target.closest && e.target.closest('button, a')) return; e.preventDefault(); flip(); }
      else if (flipped && e.key === '1') grade(0);
      else if (flipped && e.key === '2') grade(1);
      else if (flipped && e.key === '3') grade(2);
    };
    el.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    newSession('due');
    return () => {
      el.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey);
      el.removeEventListener('pointerdown', onDown); window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
    };
  };
})();
