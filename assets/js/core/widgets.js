/* ExamForge core — interactive widgets. Each widget(el, subject) renders itself and returns a cleanup function. */
(function () {
  'use strict';
  const EF = window.EF;
  const esc = EF.esc, icon = EF.icon;
  const speakBtn = (text, label) => `<button type="button" class="speak" data-speak="${esc(text)}" aria-label="Hear “${esc(label || text)}”">${icon('fa-volume-high')}</button>`;
  const norm = (s) => String(s || '').trim().toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, ' ');
  const noAccents = (s) => norm(s).normalize('NFD').replace(/[̀-ͯ]/g, '');

  const W = {};

  /* ---------------- French vocabulary: flip cards + practice ---------------- */
  W.vocab = (el, s) => {
    const cats = Object.keys(s.data.vocab);
    let cat = cats[0], mode = 'cards', q = null, score = 0, streak = 0;

    function render() {
      el.innerHTML = `
        <div class="w-toolbar">
          <div class="seg" role="tablist" aria-label="Vocabulary topic">${cats.map((c) => `<button type="button" role="tab" aria-selected="${c === cat}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>
          <div class="seg seg-sm" role="group" aria-label="Mode">
            <button type="button" data-mode="cards" aria-pressed="${mode === 'cards'}">${icon('fa-clone')} Cards</button>
            <button type="button" data-mode="practice" aria-pressed="${mode === 'practice'}">${icon('fa-bullseye')} Practice</button>
          </div>
        </div>
        <div class="w-body"></div>`;
      body();
    }
    function body() {
      const b = el.querySelector('.w-body');
      const words = s.data.vocab[cat];
      if (mode === 'cards') {
        b.innerHTML = `<div class="vocab-grid">${words.map((w) => `
          <div class="vcard" role="button" tabindex="0" aria-pressed="false" data-action="flip" aria-label="${esc(w[0])} — flip for English">
            <div class="flip-inner">
              <div class="flip-face vcard-front"><span lang="fr">${esc(w[0])}</span>${speakBtn(w[0])}</div>
              <div class="flip-face vcard-back"><span>${esc(w[1])}</span></div>
            </div>
          </div>`).join('')}</div>`;
      } else {
        next(b);
      }
    }
    function next(b) {
      const words = s.data.vocab[cat];
      const ans = words[(Math.random() * words.length) | 0];
      const opts = EF.shuffle([ans].concat(EF.shuffle(words.filter((w) => w !== ans)).slice(0, 3)));
      q = { ans, opts };
      b.innerHTML = `
        <div class="practice">
          <div class="practice-meta"><span>${icon('fa-star')} Score <strong>${score}</strong></span><span>${icon('fa-fire')} Streak <strong>${streak}</strong></span></div>
          <p class="practice-q">What does <strong lang="fr">${esc(ans[0])}</strong> mean? ${speakBtn(ans[0])}</p>
          <div class="practice-opts">${opts.map((o, i) => `<button type="button" class="opt" data-pick="${i}"><span class="opt-key">${'ABCD'[i]}</span>${esc(o[1])}</button>`).join('')}</div>
          <p class="practice-fb" aria-live="polite"></p>
        </div>`;
      if (EF.canSpeak()) setTimeout(() => EF.speak(ans[0], 'fr-FR'), 150);
    }
    function onClick(e) {
      const t = e.target.closest('button');
      if (!t || !el.contains(t)) return;
      if (t.dataset.cat) { cat = t.dataset.cat; render(); }
      else if (t.dataset.mode) { mode = t.dataset.mode; render(); }
      else if (t.dataset.pick != null && q && !q.done) {
        q.done = true;
        const pick = q.opts[+t.dataset.pick];
        const ok = pick === q.ans;
        const btns = el.querySelectorAll('.opt');
        btns.forEach((b, i) => { b.disabled = true; if (q.opts[i] === q.ans) b.classList.add('is-right'); });
        if (!ok) t.classList.add('is-wrong');
        if (ok) { score++; streak++; } else streak = 0;
        EF.haptic(ok ? 'success' : 'error');
        el.querySelector('.practice-fb').innerHTML = ok ? `${icon('fa-circle-check')} Correct!` : `${icon('fa-circle-xmark')} It means “${esc(q.ans[1])}”.`;
        EF.store.touchDay();
        setTimeout(() => next(el.querySelector('.w-body')), ok ? 900 : 1800);
      }
    }
    el.addEventListener('click', onClick);
    render();
    return () => el.removeEventListener('click', onClick);
  };

  /* ---------------- Conjugation: learn + test ---------------- */
  W.conjugation = (el, s) => {
    const verbs = s.data.verbs;
    const PRON = ['je', 'tu', 'il / elle / on', 'nous', 'vous', 'ils / elles'];
    let v = verbs[0], test = false;
    const pron = (verb, i) => (i === 0 && verb.elide ? 'j’' : PRON[i] + ' ');

    function render() {
      el.innerHTML = `
        <div class="chips-row" role="group" aria-label="Choose a verb">${verbs.map((x) => `<button type="button" class="chip-btn${x === v ? ' is-on' : ''}" data-verb="${esc(x.name)}" aria-pressed="${x === v}"><span lang="fr">${esc(x.name)}</span><small>${esc(x.meaning)}</small></button>`).join('')}</div>
        <div class="conj card">
          <div class="conj-head">
            <div><h4 lang="fr">${esc(v.name)}</h4><span class="muted">${esc(v.meaning)} · ${esc(v.type)}</span></div>
            <div class="seg seg-sm" role="group" aria-label="Mode">
              <button type="button" data-test="0" aria-pressed="${!test}">${icon('fa-eye')} Learn</button>
              <button type="button" data-test="1" aria-pressed="${test}">${icon('fa-pen')} Test me</button>
            </div>
          </div>
          <form class="conj-grid" novalidate>
            ${v.forms.map((f, i) => `
              <div class="conj-cell">
                <span class="conj-p" lang="fr">${esc(pron(v, i).trim())}</span>
                ${test
                  ? `<input lang="fr" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="${esc(pron(v, i))} ${esc(v.name)}" data-i="${i}">`
                  : `<span class="conj-f" lang="fr">${esc(f)}</span>${speakBtn(pron(v, i) + f)}`}
              </div>`).join('')}
            ${test ? `<div class="conj-actions"><button class="btn btn-c" type="submit">${icon('fa-check')} Check</button><button class="btn" type="button" data-reveal>${icon('fa-eye')} Show answers</button><span class="conj-score" aria-live="polite"></span></div>` : ''}
          </form>
        </div>`;
      const first = el.querySelector('input');
      if (first) first.focus({ preventScroll: true });
    }
    function check(reveal) {
      let right = 0;
      el.querySelectorAll('.conj-grid input').forEach((inp) => {
        const want = v.forms[+inp.dataset.i];
        const got = inp.value;
        inp.classList.remove('is-right', 'is-close', 'is-wrong');
        if (reveal) { inp.value = want; inp.classList.add('is-right'); return; }
        if (norm(got) === norm(want)) { inp.classList.add('is-right'); right++; }
        else if (noAccents(got) === noAccents(want)) { inp.classList.add('is-close'); inp.title = 'Check your accents'; }
        else { inp.classList.add('is-wrong'); inp.title = 'Answer: ' + want; }
      });
      if (!reveal) {
        el.querySelector('.conj-score').innerHTML = right === 6 ? `${icon('fa-trophy')} 6/6 — parfait !` : `${right}/6 correct${el.querySelector('.is-close') ? ' · orange = check accents' : ''}`;
        if (right === 6) EF.confetti();
        EF.store.touchDay();
      }
    }
    const onClick = (e) => {
      const t = e.target.closest('button');
      if (!t || !el.contains(t)) return;
      if (t.dataset.verb) { v = verbs.find((x) => x.name === t.dataset.verb); render(); }
      else if (t.dataset.test != null) { test = t.dataset.test === '1'; render(); }
      else if (t.hasAttribute('data-reveal')) check(true);
    };
    const onSubmit = (e) => { if (e.target.closest('.conj-grid')) { e.preventDefault(); check(false); } };
    el.addEventListener('click', onClick);
    el.addEventListener('submit', onSubmit);
    render();
    return () => { el.removeEventListener('click', onClick); el.removeEventListener('submit', onSubmit); };
  };

  /* ---------------- Numbers 0–100 + listening game ---------------- */
  W.numbers = (el, s) => {
    const all = s.data.numbers;
    const ranges = { '0–20': [0, 20], '21–69': [21, 69], '70–100': [70, 100], 'All': [0, 100] };
    let range = '0–20', game = null;
    const list = () => all.filter((n) => n[0] >= ranges[range][0] && n[0] <= ranges[range][1]);

    function render() {
      el.innerHTML = `
        <div class="w-toolbar">
          <div class="seg" role="tablist" aria-label="Number range">${Object.keys(ranges).map((r) => `<button type="button" role="tab" aria-selected="${r === range}" data-range="${r}">${r}</button>`).join('')}</div>
          <button type="button" class="btn btn-c btn-sm" data-game>${icon(game ? 'fa-stop' : 'fa-headphones')} ${game ? 'Stop game' : 'Listen & tap game'}</button>
        </div>
        ${game ? `<div class="game-bar" aria-live="polite"><span>${icon('fa-ear-listen')} Tap the number you hear</span><button type="button" class="btn btn-sm" data-replay>${icon('fa-rotate-right')} Replay</button><span>Score <strong>${game.score}</strong>/${game.total}</span></div>` : ''}
        <div class="num-grid${game ? ' is-game' : ''}">${list().map((n) => `<button type="button" class="num" data-n="${n[0]}" aria-label="${n[0]}${game ? '' : ': ' + esc(n[1])}"><strong>${n[0]}</strong>${game ? '' : `<span lang="fr">${esc(n[1])}</span>`}</button>`).join('')}</div>`;
    }
    function newRound() {
      const pool = list();
      game.target = pool[(Math.random() * pool.length) | 0];
      EF.speak(game.target[1], 'fr-FR');
    }
    const onClick = (e) => {
      const t = e.target.closest('button');
      if (!t || !el.contains(t)) return;
      if (t.dataset.range) { range = t.dataset.range; render(); if (game) newRound(); }
      else if (t.hasAttribute('data-game')) {
        if (game) { game = null; render(); }
        else { if (!EF.canSpeak()) { EF.toast('Speech isn’t available in this browser', 'fa-volume-xmark'); return; } game = { score: 0, total: 0 }; render(); newRound(); }
      } else if (t.hasAttribute('data-replay') && game) EF.speak(game.target[1], 'fr-FR');
      else if (t.dataset.n != null) {
        const n = all[+t.dataset.n];
        if (!game) { EF.speak(n[1], 'fr-FR', t); return; }
        const ok = n === game.target;
        game.total++; if (ok) game.score++;
        t.classList.add(ok ? 'is-right' : 'is-wrong');
        if (!ok) { const r = el.querySelector(`.num[data-n="${game.target[0]}"]`); if (r) r.classList.add('is-right'); }
        EF.toast(ok ? 'Correct — ' + n[1] : `That was ${game.target[0]} (${game.target[1]})`, ok ? 'fa-circle-check' : 'fa-circle-xmark');
        EF.store.touchDay();
        setTimeout(() => { if (game) { render(); newRound(); } }, ok ? 800 : 1600);
      }
    };
    el.addEventListener('click', onClick);
    render();
    return () => { el.removeEventListener('click', onClick); EF.stopSpeaking(); };
  };

  /* ---------------- Atom explorer: mini periodic table + 3D + facts ---------------- */
  W.atom = (el, s) => {
    const atoms = s.data.atoms;
    let cur = atoms[5], scene = null, dead = false;
    const groups = [1, 2, 13, 14, 15, 16, 17, 18];
    const catCls = (c) => 'cat-' + c.toLowerCase().replace(/[^a-z]+/g, '-');

    el.innerHTML = `
      <div class="atom-layout">
        <div class="ptable" role="group" aria-label="Elements 1 to 20">
          <span class="ptable-g" aria-hidden="true"></span>${groups.map((g) => `<span class="ptable-g" aria-hidden="true">${g}</span>`).join('')}
          ${[1, 2, 3, 4].map((p) => `<span class="ptable-p" aria-hidden="true">${p}</span>` + groups.map((g) => {
            const a = atoms.find((x) => x.period === p && x.group === g);
            return a ? `<button type="button" class="el ${catCls(a.category)}" data-z="${a.z}" aria-label="${a.name}, ${a.z}" aria-pressed="false"><small>${a.z}</small><strong>${a.symbol}</strong></button>` : '<span class="el-empty"></span>';
          }).join('')).join('')}
        </div>
        <div class="stage stage-atom">
          <div class="stage-3d"></div>
          <div class="stage-legend"><span><i class="dot" style="background:#ff5a5a"></i>Proton (+)</span><span><i class="dot" style="background:#a6abb6"></i>Neutron (0)</span><span><i class="dot" style="background:#4fb3ff"></i>Electron (−)</span></div>
          <div class="stage-symbol" aria-hidden="true"></div>
          <div class="stage-controls">
            <button type="button" class="icon-btn" data-zoom="-1" aria-label="Zoom in">${icon('fa-plus')}</button>
            <button type="button" class="icon-btn" data-zoom="1" aria-label="Zoom out">${icon('fa-minus')}</button>
            <button type="button" class="icon-btn" data-reset aria-label="Reset view">${icon('fa-rotate-left')}</button>
          </div>
          <div class="stage-shells"></div>
        </div>
        <div class="atom-info" aria-live="polite"></div>
      </div>`;
    const stage3d = el.querySelector('.stage-3d');

    function info() {
      const a = cur;
      el.querySelectorAll('.el').forEach((b) => { const on = +b.dataset.z === a.z; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); });
      el.querySelector('.stage-symbol').innerHTML = `<small>${a.z}</small>${a.symbol}`;
      el.querySelector('.stage-shells').textContent = 'Shells: ' + a.shells.join(', ');
      const ion = a.group === 1 ? `${a.symbol}⁺` : a.group === 2 ? `${a.symbol}²⁺` : a.group === 13 && a.z === 13 ? `${a.symbol}³⁺` : a.group === 15 && a.z <= 15 ? `${a.symbol}³⁻` : a.group === 16 ? `${a.symbol}²⁻` : a.group === 17 ? `${a.symbol}⁻` : a.group === 18 ? 'none (full shell)' : '—';
      el.querySelector('.atom-info').innerHTML = `
        <div class="atom-title"><h4>${esc(a.name)} <span class="muted">(${esc(a.symbol)})</span></h4>
          <span class="pill ${catCls(a.category)}">${esc(a.category)}</span><span class="pill">${esc(a.state)} at room temp</span></div>
        <div class="atom-stats">
          <div class="as as-p"><strong>${a.z}</strong><span>Protons</span></div>
          <div class="as as-n"><strong>${a.neutrons}</strong><span>Neutrons</span></div>
          <div class="as as-e"><strong>${a.z}</strong><span>Electrons</span></div>
          <div class="as"><strong>${a.mass}</strong><span>Atomic mass</span></div>
        </div>
        <p>${esc(a.desc)}</p>
        <dl class="kv kv-2">
          <div><dt>Mass number</dt><dd>${a.z + a.neutrons} <small class="muted">(${a.z} p + ${a.neutrons} n)</small></dd></div>
          <div><dt>Group · Period</dt><dd>${a.group} · ${a.period}</dd></div>
          <div><dt>Configuration</dt><dd class="mono">${esc(a.config)}</dd></div>
          <div><dt>Common ion</dt><dd>${esc(ion)}</dd></div>
          <div><dt>Electronegativity</dt><dd>${a.en == null ? 'n/a' : a.en}</dd></div>
          <div><dt>Melting / boiling</dt><dd>${a.melt} °C / ${a.boil} °C</dd></div>
          <div><dt>Density</dt><dd>${a.density} g/cm³</dd></div>
          <div><dt>Discovered by</dt><dd>${esc(a.discovered)}</dd></div>
        </dl>
        <p><strong>Uses:</strong> ${esc(a.uses)}</p>
        <p class="fact">💡 ${esc(a.fact)}</p>`;
    }

    const onClick = (e) => {
      const t = e.target.closest('button');
      if (!t || !el.contains(t)) return;
      if (t.dataset.z) { cur = atoms.find((x) => x.z === +t.dataset.z); info(); if (scene) scene.setAtom(cur); }
      else if (t.dataset.zoom && scene) scene.zoom(+t.dataset.zoom);
      else if (t.hasAttribute('data-reset') && scene) scene.reset();
    };
    el.addEventListener('click', onClick);
    info();
    stage3d.innerHTML = `<div class="stage-msg">${icon('fa-spinner', 'fa-spin')} Loading 3D model…</div>`;
    EF.loadThree().then(() => {
      if (dead) return;
      stage3d.innerHTML = '';
      try { scene = EF.atomScene(stage3d, cur); } catch (err) { stage3d.innerHTML = `<div class="stage-msg">${icon('fa-triangle-exclamation')} ${esc(err.message)}</div>`; }
    }).catch(() => { if (!dead) stage3d.innerHTML = `<div class="stage-msg">${icon('fa-wifi')} Couldn’t load the 3D engine. Check your connection — all the facts still work.</div>`; });
    return () => { dead = true; el.removeEventListener('click', onClick); if (scene) scene.dispose(); };
  };

  /* ---------------- 3D skeleton: explore, labels, find-the-bone ---------------- */
  W.skeleton = (el, s) => {
    const bones = s.data.bones;
    const info = (n) => bones.find((x) => x.name === n);
    let sel = null, scene = null, dead = false, mode = 'explore', game = null, lw = {};
    const HINT = {
      explore: `${icon('fa-hand-pointer')} Drag to spin · tap a bone`,
      labels: `${icon('fa-tags')} Tap a label to learn about it`,
      find: `${icon('fa-crosshairs')} Tap the bone named above`
    };
    el.innerHTML = `
      <div class="skel-layout">
        <div class="stage stage-skel">
          <div class="stage-3d"></div>
          <svg class="skel-lines" aria-hidden="true"></svg>
          <div class="skel-labels" hidden>${bones.map((b) => `<button type="button" class="lbl" data-label="${esc(b.name)}">${esc(b.name)}</button>`).join('')}</div>
          <div class="stage-tip" hidden></div>
          <div class="seg seg-sm seg-dark skel-modes" role="tablist" aria-label="Skeleton mode">
            <button type="button" role="tab" data-mode="explore" aria-selected="true">${icon('fa-rotate')} Explore</button>
            <button type="button" role="tab" data-mode="labels" aria-selected="false">${icon('fa-tags')} Labels</button>
            <button type="button" role="tab" data-mode="find" aria-selected="false">${icon('fa-crosshairs')} Find the bone</button>
          </div>
          <div class="find-bar" hidden aria-live="polite"></div>
          <div class="stage-controls">
            <button type="button" class="icon-btn" data-zoom="-1" aria-label="Zoom in">${icon('fa-plus')}</button>
            <button type="button" class="icon-btn" data-zoom="1" aria-label="Zoom out">${icon('fa-minus')}</button>
            <button type="button" class="icon-btn" data-reset aria-label="Reset view">${icon('fa-expand')}</button>
          </div>
          <div class="stage-hint">${HINT.explore}</div>
        </div>
        <div class="skel-side">
          <div class="bone-chips" role="group" aria-label="Bones">${bones.map((b) => `<button type="button" class="chip-btn" data-bone="${esc(b.name)}" aria-pressed="false">${esc(b.name)}</button>`).join('')}</div>
          <div class="bone-info" aria-live="polite"></div>
        </div>
      </div>`;
    const stage = el.querySelector('.stage-skel'), stage3d = el.querySelector('.stage-3d');
    const svg = el.querySelector('.skel-lines'), labelsBox = el.querySelector('.skel-labels'), bar = el.querySelector('.find-bar');
    const labels = {};
    el.querySelectorAll('.lbl').forEach((l) => { labels[l.dataset.label] = l; });

    function infoPanel() {
      el.querySelectorAll('[data-bone]').forEach((b) => { const on = b.dataset.bone === sel; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); });
      Object.keys(labels).forEach((n) => labels[n].classList.toggle('is-on', n === sel));
      const b = info(sel);
      const i = bones.indexOf(b);
      el.querySelector('.bone-info').innerHTML = b ? `
        <div class="card bone-card">
          <div class="card-top"><span class="tile">${icon('fa-bone')}</span><div class="bone-card-title"><h4 class="card-title">${esc(b.name)}</h4><p class="card-sub">${esc(b.location)}</p></div>
            <div class="bone-nav"><button type="button" class="icon-btn" data-step="-1" aria-label="Previous bone">${icon('fa-chevron-left')}</button><button type="button" class="icon-btn" data-step="1" aria-label="Next bone">${icon('fa-chevron-right')}</button></div></div>
          <p>${esc(b.desc)}</p>
          <div class="pill-row"><span class="pill pill-c">${esc(b.type)}</span><span class="pill">Count: ${esc(b.count)}</span><span class="pill">${i + 1} of ${bones.length}</span></div>
          <p class="fact">💡 ${esc(b.fact)}</p>
        </div>` : `<div class="empty-hint">${icon('fa-hand-pointer')}<p>Tap a bone on the model, pick one above, or switch to <strong>Labels</strong> to see them all named.</p></div>`;
    }
    function select(name, focus) {
      sel = name;
      infoPanel();
      if (!scene) return;
      scene.set(name, 'sel');
      if (focus && name) scene.focus(name);
    }

    /* ---- labels: two columns with leader lines, laid out every frame ---- */
    function measure() { Object.keys(labels).forEach((n) => { lw[n] = labels[n].offsetWidth; }); }
    function layout(project) {
      const w = stage.clientWidth, h = stage.clientHeight, cx = w / 2;
      const pts = project().filter((p) => labels[p.name]);
      const left = [], right = [];
      pts.forEach((p) => (p.x < cx ? left : right).push(p));
      const gap = 25, top = 56, bottom = h - 58;
      [left, right].forEach((col) => {
        col.sort((a, b) => a.y - b.y);
        let y = top;
        col.forEach((p) => { p.ly = Math.max(p.y, y); y = p.ly + gap; });
        let max = bottom;
        for (let i = col.length - 1; i >= 0; i--) { if (col[i].ly > max) col[i].ly = max; max = col[i].ly - gap; }
      });
      let lines = '';
      pts.forEach((p) => {
        const isL = p.x < cx, wdt = lw[p.name] || 80;
        const lx = isL ? 10 : w - 10 - wdt;
        labels[p.name].style.transform = `translate(${lx}px, ${p.ly - 11}px)`;
        const ex = isL ? lx + wdt : lx;
        const on = p.name === sel ? ' is-on' : '';
        lines += `<path class="ll${on}" d="M${ex.toFixed(1)} ${p.ly.toFixed(1)} L${(isL ? ex + 10 : ex - 10).toFixed(1)} ${p.ly.toFixed(1)} L${p.x.toFixed(1)} ${p.y.toFixed(1)}"/><circle class="ld${on}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3"/>`;
      });
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      svg.innerHTML = lines;
    }

    /* ---- find-the-bone game ---- */
    function newGame() {
      game = { order: EF.shuffle(bones.map((b) => b.name)).slice(0, 10), i: 0, score: 0, busy: false, missed: [] };
      if (scene) scene.clear();
      ask();
    }
    function ask() {
      const g = game;
      if (g.i >= g.order.length) {
        const pct = Math.round((g.score / g.order.length) * 100);
        bar.innerHTML = `<div class="find-done"><strong>${g.score}/${g.order.length}</strong> found ${pct >= 80 ? '🔥' : ''}<button type="button" class="btn btn-c btn-sm" data-again>${icon('fa-rotate-right')} Play again</button></div>`;
        if (pct >= 80) EF.confetti();
        EF.store.touchDay();
        return;
      }
      bar.innerHTML = `<span class="find-q">Find the <strong>${esc(g.order[g.i])}</strong></span><span class="find-score">${g.i + 1}/${g.order.length} · ${icon('fa-check')} ${g.score}</span><button type="button" class="find-skip" data-skip aria-label="Skip">${icon('fa-forward')}</button>`;
    }
    function answer(name) {
      const g = game;
      if (!g || g.busy || g.i >= g.order.length || !name) return;
      const want = g.order[g.i];
      g.busy = true;
      EF.haptic(name === want ? 'success' : 'error');
      if (name === want) {
        g.score++;
        scene.flash(name, 'good');
        bar.innerHTML = `<span class="find-q good">${icon('fa-circle-check')} Yes — that’s the ${esc(want)}!</span>`;
      } else {
        g.missed.push(want);
        scene.flash(name, 'bad'); scene.flash(want, 'good');
        bar.innerHTML = `<span class="find-q bad">${icon('fa-circle-xmark')} That’s the ${esc(name)}. The ${esc(want)} is glowing green.</span>`;
      }
      setTimeout(() => { if (dead || !game) return; scene.clear(); g.i++; g.busy = false; ask(); }, name === want ? 900 : 2000);
    }

    function setMode(m) {
      mode = m;
      el.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-selected', b.dataset.mode === m));
      stage.dataset.mode = m;
      labelsBox.hidden = m !== 'labels';
      svg.style.display = m === 'labels' ? '' : 'none';
      bar.hidden = m !== 'find';
      el.querySelector('.stage-hint').innerHTML = HINT[m];
      if (scene) { scene.setMode(m); scene.clear(); }
      if (m === 'labels') { requestAnimationFrame(measure); if (sel && scene) scene.set(sel, 'sel'); }
      if (m === 'find') newGame(); else game = null;
      if (m === 'explore' && sel && scene) scene.set(sel, 'sel');
    }

    const onClick = (e) => {
      const t = e.target.closest('button');
      if (!t || !el.contains(t)) return;
      if (t.dataset.mode) setMode(t.dataset.mode);
      else if (t.dataset.bone) { if (mode === 'find') setMode('explore'); select(t.dataset.bone, true); }
      else if (t.dataset.label) select(t.dataset.label, false);
      else if (t.dataset.step) { const i = bones.findIndex((b) => b.name === sel); const n = bones[(i + +t.dataset.step + bones.length) % bones.length]; select(n.name, mode === 'explore'); }
      else if (t.dataset.zoom && scene) scene.zoom(+t.dataset.zoom);
      else if (t.hasAttribute('data-reset') && scene) scene.reset();
      else if (t.hasAttribute('data-again')) newGame();
      else if (t.hasAttribute('data-skip') && game && !game.busy) { game.missed.push(game.order[game.i]); game.i++; ask(); }
    };
    el.addEventListener('click', onClick);
    infoPanel();
    stage3d.innerHTML = `<div class="stage-msg">${icon('fa-spinner', 'fa-spin')} Building the skeleton…</div>`;
    EF.loadThree().then(() => {
      if (dead) return;
      stage3d.innerHTML = '';
      try {
        scene = EF.skeletonScene(stage3d, {
          tooltip: el.querySelector('.stage-tip'),
          onPick: (name) => {
            if (mode === 'find') answer(name);
            else if (name) select(name, false);
          },
          afterFrame: (project) => { if (mode === 'labels') layout(project); }
        });
        stage.classList.add('is-ready');
        if (sel) scene.set(sel, 'sel');
      } catch (err) { stage3d.innerHTML = `<div class="stage-msg">${icon('fa-triangle-exclamation')} ${esc(err.message)}</div>`; }
    }).catch(() => { if (!dead) stage3d.innerHTML = `<div class="stage-msg">${icon('fa-wifi')} Couldn’t load the 3D engine. The bone list still works.</div>`; });
    const onResize = () => { if (mode === 'labels') measure(); };
    window.addEventListener('resize', onResize);
    return () => { dead = true; el.removeEventListener('click', onClick); window.removeEventListener('resize', onResize); if (scene) scene.dispose(); };
  };

  /* ---------------- Menstrual cycle: interactive 28-day chart ---------------- */
  W.cycle = (el, s) => {
    const phases = s.data.cycle;
    let day = 14, timer = null;
    const phaseOf = (d) => phases.find((p) => d >= p.from && d <= p.to) || phases[0];
    // Schematic hormone curves (relative 0–1), shaped like the textbook diagram — not to scale.
    const g = (x, m, w) => Math.exp(-Math.pow((x - m) / w, 2));
    const H = {
      FSH: { color: '#f5a524', f: (d) => 0.35 + 0.25 * g(d, 3, 4) + 0.45 * g(d, 13.5, 1.2) - 0.2 * g(d, 22, 5) },
      LH: { color: '#2fbf71', f: (d) => 0.18 + 0.82 * g(d, 13.7, 0.9) },
      Oestrogen: { color: '#e255b4', f: (d) => 0.15 + 0.75 * g(d, 12.5, 2.6) + 0.35 * g(d, 21.5, 3.5) },
      Progesterone: { color: '#9b6bff', f: (d) => 0.08 + 0.85 * g(d, 21.5, 3.6) }
    };
    const X = (d) => 34 + ((d - 1) / 27) * 548, Y = (v) => 150 - v * 120;
    const path = (fn) => { let p = ''; for (let d = 1; d <= 28; d += 0.25) p += (p ? 'L' : 'M') + X(d).toFixed(1) + ' ' + Y(Math.max(0, Math.min(1, fn(d)))).toFixed(1); return p; };
    // Ring segments
    const R = 92, C = 110, seg = (d) => {
      const a0 = ((d - 1) / 28) * Math.PI * 2 - Math.PI / 2, a1 = (d / 28) * Math.PI * 2 - Math.PI / 2 - 0.02;
      const p = (a, r) => [C + Math.cos(a) * r, C + Math.sin(a) * r];
      const [x0, y0] = p(a0, R), [x1, y1] = p(a1, R), [x2, y2] = p(a1, R - 26), [x3, y3] = p(a0, R - 26);
      return `M${x0} ${y0}A${R} ${R} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${R - 26} ${R - 26} 0 0 0 ${x3} ${y3}Z`;
    };

    el.innerHTML = `
      <div class="cycle">
        <div class="cycle-ring">
          <svg viewBox="0 0 220 220" role="img" aria-label="28-day cycle wheel">
            ${Array.from({ length: 28 }, (_, i) => `<path class="cy-seg" data-day="${i + 1}" d="${seg(i + 1)}" fill="${phaseOf(i + 1).color}"><title>Day ${i + 1}</title></path>`).join('')}
            <text class="cy-day" x="110" y="104" text-anchor="middle"></text>
            <text class="cy-lbl" x="110" y="128" text-anchor="middle"></text>
          </svg>
        </div>
        <div class="cycle-side">
          <div class="cycle-controls">
            <button type="button" class="icon-btn" data-step="-1" aria-label="Previous day">${icon('fa-chevron-left')}</button>
            <input type="range" min="1" max="28" value="${day}" aria-label="Day of cycle">
            <button type="button" class="icon-btn" data-step="1" aria-label="Next day">${icon('fa-chevron-right')}</button>
            <button type="button" class="btn btn-sm" data-play>${icon('fa-play')} Play</button>
          </div>
          <div class="cycle-phase" aria-live="polite"></div>
          <div class="cycle-legend">${phases.map((p) => `<button type="button" class="chip-btn" data-goto="${p.from}"><i class="dot" style="background:${p.color}"></i>${esc(p.name)}</button>`).join('')}</div>
        </div>
        <figure class="cycle-chart">
          <svg viewBox="0 0 600 180" role="img" aria-label="Hormone levels across the cycle (schematic)">
            ${[1, 7, 14, 21, 28].map((d) => `<line class="cy-grid" x1="${X(d)}" x2="${X(d)}" y1="24" y2="152"/><text class="cy-axis" x="${X(d)}" y="170" text-anchor="middle">Day ${d}</text>`).join('')}
            ${Object.keys(H).map((k) => `<path d="${path(H[k].f)}" fill="none" stroke="${H[k].color}" stroke-width="2.5" stroke-linecap="round"/>`).join('')}
            <line class="cy-now" x1="0" x2="0" y1="18" y2="152"/>
          </svg>
          <figcaption>${Object.keys(H).map((k) => `<span><i class="dot" style="background:${H[k].color}"></i>${k}</span>`).join('')}<span class="muted">Schematic — not to scale</span></figcaption>
        </figure>
      </div>`;
    const range = el.querySelector('input[type=range]');
    function update() {
      const p = phaseOf(day);
      range.value = day;
      el.querySelectorAll('.cy-seg').forEach((sg) => sg.classList.toggle('is-on', +sg.dataset.day === day));
      el.querySelector('.cy-day').textContent = 'Day ' + day;
      el.querySelector('.cy-lbl').textContent = p.name;
      const now = el.querySelector('.cy-now'); now.setAttribute('x1', X(day)); now.setAttribute('x2', X(day));
      const lvl = Object.keys(H).map((k) => `<span><i class="dot" style="background:${H[k].color}"></i>${k} <strong>${H[k].f(day) > 0.6 ? 'high' : H[k].f(day) > 0.3 ? 'medium' : 'low'}</strong></span>`).join('');
      el.querySelector('.cycle-phase').innerHTML = `<div class="card tint" style="--c:${p.color}"><span class="pill pill-c">${esc(p.days)}</span><h4 class="card-title">${esc(p.name)}</h4><p>${p.html}</p><div class="levels">${lvl}</div></div>`;
    }
    const stop = () => { clearInterval(timer); timer = null; const b = el.querySelector('[data-play]'); if (b) b.innerHTML = icon('fa-play') + ' Play'; };
    const onClick = (e) => {
      const seg = e.target.closest('.cy-seg');
      if (seg) { stop(); day = +seg.dataset.day; update(); return; }
      const t = e.target.closest('button');
      if (!t || !el.contains(t)) return;
      if (t.dataset.step) { stop(); day = ((day - 1 + +t.dataset.step + 28) % 28) + 1; update(); }
      else if (t.dataset.goto) { stop(); day = +t.dataset.goto; update(); }
      else if (t.hasAttribute('data-play')) {
        if (timer) stop();
        else { t.innerHTML = icon('fa-pause') + ' Pause'; timer = setInterval(() => { day = (day % 28) + 1; update(); }, 450); }
      }
    };
    const onInput = () => { stop(); day = +range.value; update(); };
    el.addEventListener('click', onClick);
    range.addEventListener('input', onInput);
    update();
    return () => { stop(); el.removeEventListener('click', onClick); };
  };

  /* ---------------- Cash book with running balance ---------------- */
  W.cashbook = (el, s) => {
    const start = s.data.cashbook.map((r) => r.slice());
    let rows = start.map((r) => r.slice());
    const money = (n) => n == null ? '–' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    function render() {
      let bal = 0;
      const body = rows.map((r, i) => {
        if (i === 0 && r[4] != null) bal = r[4]; else bal = bal + (r[2] || 0) - (r[3] || 0);
        return `<tr><td>${esc(r[0])}</td><th scope="row">${esc(r[1])}</th><td class="r in">${r[2] ? money(r[2]) : '–'}</td><td class="r out">${r[3] ? money(r[3]) : '–'}</td><td class="r bal${bal < 0 ? ' neg' : ''}">${money(bal)}</td></tr>`;
      }).join('');
      el.innerHTML = `
        <div class="table-wrap" tabindex="0" role="region" aria-label="Cash book"><table class="table cash">
          <thead><tr><th scope="col">Date</th><th scope="col">Description</th><th scope="col" class="r">Received ($)</th><th scope="col" class="r">Paid ($)</th><th scope="col" class="r">Balance ($)</th></tr></thead>
          <tbody>${body}</tbody>
        </table></div>
        <form class="cash-form" novalidate>
          <span class="cash-form-title">${icon('fa-plus')} Try it — add a transaction</span>
          <input name="desc" placeholder="Description (e.g. Sold stock)" aria-label="Description" required maxlength="40">
          <select name="type" aria-label="Type"><option value="in">Money in</option><option value="out">Money out</option></select>
          <input name="amt" type="number" min="0.01" step="0.01" placeholder="Amount" aria-label="Amount" required>
          <button class="btn btn-c" type="submit">Add</button>
          <button class="btn" type="button" data-reset>${icon('fa-rotate-left')} Reset</button>
        </form>
        <p class="muted small">Closing balance: <strong>$${money(bal)}</strong> = opening $${money(rows[0][4])} + total received $${money(rows.reduce((a, r) => a + (r[2] || 0), 0))} − total paid $${money(rows.reduce((a, r) => a + (r[3] || 0), 0))}</p>`;
    }
    const onSubmit = (e) => {
      e.preventDefault();
      const f = e.target;
      const amt = parseFloat(f.amt.value), desc = f.desc.value.trim();
      if (!desc || !(amt > 0)) { EF.toast('Add a description and an amount', 'fa-circle-exclamation'); return; }
      const last = rows[rows.length - 1][0];
      rows.push([last, desc, f.type.value === 'in' ? amt : null, f.type.value === 'out' ? amt : null]);
      render();
      EF.store.touchDay();
    };
    const onClick = (e) => { if (e.target.closest('[data-reset]')) { rows = start.map((r) => r.slice()); render(); } };
    el.addEventListener('submit', onSubmit);
    el.addEventListener('click', onClick);
    render();
    return () => { el.removeEventListener('submit', onSubmit); el.removeEventListener('click', onClick); };
  };

  /* ================= Grade 10 tools ================= */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmtN = (n) => (Math.round(n * 100) / 100).toLocaleString('en-US');

  /* ---------------- Physics: Vernier caliper (practice reading it, or drag the slider to explore) ---------------- */
  W.vernier = (el) => {
    const PX = 20, X0 = 20, SPAN = 30; // 20 px per mm, 30 mm visible
    let mode = 'practice', R = 0, m0 = 0, shown = false;
    const rnd = () => Math.round((10 + Math.random() * 50) * 10) / 10;
    function frame() { m0 = clamp(Math.floor(R) - 9, 0, 1000); }
    function svg() {
      const fl = Math.floor(R + 1e-9), k = Math.round((R - fl) * 10) % 10;
      let main = '';
      for (let mm = m0; mm <= m0 + SPAN; mm++) {
        const x = X0 + (mm - m0) * PX, big = mm % 10 === 0, mid = mm % 5 === 0;
        const hi = shown && (mm === fl ? ' is-msr' : mm === fl + k ? ' is-hit' : '');
        main += `<line class="vc-t${hi}" x1="${x}" y1="86" x2="${x}" y2="${86 - (big ? 30 : mid ? 21 : 14)}"/>`;
        if (big) main += `<text class="vc-n" x="${x}" y="44">${mm / 10}</text>`;
      }
      const vx = X0 + (R - m0) * PX;
      let ver = '';
      for (let i = 0; i <= 10; i++) {
        const x = i * 0.9 * PX, hi = shown && i === k ? ' is-hit' : '';
        ver += `<line class="vc-t${hi}" x1="${x}" y1="0" x2="${x}" y2="${i % 5 === 0 ? 24 : 15}"/>`;
        if (i % 5 === 0) ver += `<text class="vc-n vc-n-s" x="${x}" y="40">${i}</text>`;
      }
      return `<svg class="vc-svg" viewBox="0 0 ${X0 * 2 + SPAN * PX} 150" role="img" aria-label="Vernier caliper scales">
        <rect class="vc-main" x="4" y="22" width="${X0 * 2 + SPAN * PX - 8}" height="64" rx="6"/>
        <text class="vc-cap" x="10" y="16">MAIN SCALE (cm)</text>
        ${main}
        <g class="vc-vernier${mode === 'explore' ? ' is-drag' : ''}" style="transform:translateX(${vx}px)">
          <rect class="vc-vbody" x="-14" y="86" width="${10 * 0.9 * PX + 28}" height="50" rx="6"/>
          <g transform="translate(0 86)">${ver}</g>
          <text class="vc-cap" x="-10" y="146">VERNIER</text>
        </g>
      </svg>`;
    }
    function working() {
      const fl = Math.floor(R + 1e-9), k = Math.round((R - fl) * 10) % 10;
      return `<ol class="vc-work"><li>Main scale (mark just before Vernier 0): <strong>${fl} mm</strong></li><li>Vernier line that lines up: <strong>${k}</strong> → ${k} × 0.1 = <strong>${(k / 10).toFixed(1)} mm</strong></li><li>Reading = ${fl} + ${(k / 10).toFixed(1)} = <strong>${R.toFixed(1)} mm = ${(R / 10).toFixed(2)} cm</strong></li></ol>`;
    }
    function render() {
      el.innerHTML = `<div class="tool-card vc">
        <div class="w-toolbar"><strong class="tool-title">${icon('fa-ruler-horizontal')} Vernier caliper</strong>
          <div class="seg" role="tablist" aria-label="Vernier mode"><button type="button" role="tab" aria-selected="${mode === 'practice'}" data-vmode="practice">Practice</button><button type="button" role="tab" aria-selected="${mode === 'explore'}" data-vmode="explore">Explore (drag)</button></div></div>
        <div class="vc-stage">${svg()}</div>
        ${mode === 'practice' ? `<form class="vc-form" novalidate><label>Your reading <input name="r" inputmode="decimal" autocomplete="off" placeholder="e.g. 23.7" aria-label="Your reading in millimetres"> mm</label><button class="btn btn-c btn-sm" type="submit">${icon('fa-check')} Check</button><button class="btn btn-sm" type="button" data-vshow>${icon('fa-eye')} Show me</button><button class="btn btn-sm" type="button" data-vnew>${icon('fa-shuffle')} New</button></form>`
          : `<p class="vc-live">Reading: <strong>${R.toFixed(1)} mm</strong> = ${(R / 10).toFixed(2)} cm <span class="muted">· drag the Vernier scale</span></p>`}
        <div class="vc-out">${shown ? working() : ''}</div>
      </div>`;
    }
    function redrawScale() { const st = el.querySelector('.vc-stage'); if (st) st.innerHTML = svg(); const live = el.querySelector('.vc-live strong'); if (live) live.parentElement.innerHTML = `Reading: <strong>${R.toFixed(1)} mm</strong> = ${(R / 10).toFixed(2)} cm <span class="muted">· drag the Vernier scale</span>`; if (shown) el.querySelector('.vc-out').innerHTML = working(); }
    function fresh() { R = rnd(); frame(); shown = false; render(); }
    let drag = null;
    const onDown = (e) => {
      const g = e.target.closest('.vc-vernier.is-drag'); if (!g) return;
      const svgEl = el.querySelector('.vc-svg'); const ctm = svgEl.getScreenCTM(); if (!ctm) return;
      drag = { x: e.clientX, R0: R, scale: ctm.a, id: e.pointerId }; g.setPointerCapture && g.setPointerCapture(e.pointerId); g.classList.add('is-grab'); e.preventDefault();
    };
    const onMove = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const next = clamp(Math.round((drag.R0 + (e.clientX - drag.x) / drag.scale / PX) * 10) / 10, m0, m0 + SPAN - 10);
      if (next !== R) { R = next; if (Math.abs(R * 10 % 10) < 1e-6) EF.haptic(); redrawScale(); const g = el.querySelector('.vc-vernier'); g && g.classList.add('is-grab'); }
    };
    const onUp = () => { if (!drag) return; drag = null; const g = el.querySelector('.vc-vernier'); g && g.classList.remove('is-grab'); };
    const onClick = (e) => {
      const m = e.target.closest('[data-vmode]');
      if (m) { mode = m.dataset.vmode; shown = mode === 'explore'; if (mode === 'practice') R = rnd(); frame(); render(); return; }
      if (e.target.closest('[data-vnew]')) { fresh(); return; }
      if (e.target.closest('[data-vshow]')) { shown = true; redrawScale(); return; }
    };
    const onSubmit = (e) => {
      e.preventDefault();
      const v = parseFloat(String(e.target.r.value).replace(',', '.'));
      if (!isFinite(v)) { EF.toast('Type your reading in mm, e.g. 23.7', 'fa-circle-exclamation'); return; }
      const cmGuess = Math.abs(v * 10 - R) < 0.05;
      if (Math.abs(v - R) < 0.05) { EF.toast(`Correct: ${R.toFixed(1)} mm!`, 'fa-circle-check'); EF.haptic('success'); shown = true; redrawScale(); EF.store.touchDay(); }
      else if (cmGuess) EF.toast('Right value, but in cm. The box wants mm.', 'fa-ruler');
      else { EF.toast('Not quite: find the mark just before the Vernier 0 first', 'fa-circle-xmark'); EF.haptic('error'); }
    };
    el.addEventListener('pointerdown', onDown); window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp);
    el.addEventListener('click', onClick); el.addEventListener('submit', onSubmit);
    fresh();
    return () => { el.removeEventListener('pointerdown', onDown); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp); el.removeEventListener('click', onClick); el.removeEventListener('submit', onSubmit); };
  };

  /* ---------------- Physics: moments see-saw ---------------- */
  W.moments = (el) => {
    const S = { lf: 400, ld: 2, rf: 300, rd: 1.5 };
    let challenge = null, wasBalanced = false;
    const PXM = 100, CX = 320; // 100 px per metre
    const box = (f) => 26 + Math.sqrt(f) * 1.6;
    function weight(side) {
      const f = S[side + 'f'], d = S[side + 'd'], s = box(f), x = CX + (side === 'l' ? -1 : 1) * d * PXM;
      return `<g class="mo-w mo-w-${side}" style="transform:translateX(${x}px)"><rect x="${-s / 2}" y="${-s}" width="${s}" height="${s}" rx="7"/><text x="0" y="${-s / 2 + 5}">${f} N</text></g>`;
    }
    function render() {
      const acw = S.lf * S.ld, cw = S.rf * S.rd, diff = cw - acw, ang = 13 * Math.tanh(diff / 500), bal = Math.abs(diff) < 1e-9;
      let ticks = '';
      for (let m = -2.5; m <= 2.5001; m += 0.5) { const x = CX + m * PXM; ticks += `<line x1="${x}" y1="6" x2="${x}" y2="${Math.abs(m % 1) < 1e-9 ? 18 : 13}"/>${Math.abs(m % 1) < 1e-9 && m !== 0 ? `<text x="${x}" y="32">${Math.abs(m)} m</text>` : ''}`; }
      el.innerHTML = `<div class="tool-card mo${bal ? ' is-balanced' : ''}">
        <div class="w-toolbar"><strong class="tool-title">${icon('fa-scale-balanced')} Moments see-saw</strong><button type="button" class="btn btn-sm" data-mchal>${icon('fa-bullseye')} ${challenge ? 'New challenge' : 'Challenge me'}</button></div>
        ${challenge ? `<p class="mo-task">${icon('fa-flag')} Find the force on the <strong>right</strong> (at ${S.rd} m) that balances the beam.</p>` : ''}
        <svg class="mo-svg" viewBox="0 44 640 200" role="img" aria-label="See-saw: ${S.lf} newtons at ${S.ld} metres left, ${S.rf} newtons at ${S.rd} metres right">
          <g class="mo-beam" style="transform:rotate(${ang.toFixed(2)}deg)">
            <rect class="mo-plank" x="${CX - 2.6 * PXM}" y="176" width="${5.2 * PXM}" height="12" rx="6"/>
            <g class="mo-ticks" transform="translate(0 188)">${ticks}</g>
            <g transform="translate(0 176)">${weight('l')}${weight('r')}</g>
          </g>
          <path class="mo-pivot" d="M${CX} 186 l-24 46 h48 z"/>
          <rect class="mo-ground" x="${CX - 80}" y="232" width="160" height="5" rx="2.5"/>
        </svg>
        <div class="mo-controls">
          <fieldset><legend>Left (anticlockwise)</legend>
            <label>Force <output>${S.lf} N</output><input type="range" min="50" max="800" step="50" value="${S.lf}" data-mk="lf" ${challenge ? 'disabled' : ''}></label>
            <label>Distance <output>${S.ld} m</output><input type="range" min="0.25" max="2.5" step="0.25" value="${S.ld}" data-mk="ld" ${challenge ? 'disabled' : ''}></label>
          </fieldset>
          <fieldset><legend>Right (clockwise)</legend>
            <label>Force <output>${S.rf} N</output><input type="range" min="10" max="1600" step="10" value="${S.rf}" data-mk="rf"></label>
            <label>Distance <output>${S.rd} m</output><input type="range" min="0.25" max="2.5" step="0.25" value="${S.rd}" data-mk="rd" ${challenge ? 'disabled' : ''}></label>
          </fieldset>
        </div>
        <div class="mo-sums">
          <span class="mo-sum"><small>Anticlockwise moment</small><strong>${S.lf} × ${S.ld} = ${fmtN(acw)} N m</strong></span>
          <span class="mo-sum"><small>Clockwise moment</small><strong>${S.rf} × ${S.rd} = ${fmtN(cw)} N m</strong></span>
          <span class="mo-verdict">${bal ? `${icon('fa-circle-check')} Balanced: clockwise = anticlockwise` : diff > 0 ? `${icon('fa-rotate-right')} Turns clockwise (right side down)` : `${icon('fa-rotate-left')} Turns anticlockwise (left side down)`}</span>
        </div>
      </div>`;
      if (bal && !wasBalanced) { EF.haptic('success'); if (challenge) { EF.toast(`Balanced! F = ${fmtN(acw)} ÷ ${S.rd} = ${S.rf} N`, 'fa-scale-balanced'); EF.store.touchDay(); } }
      wasBalanced = bal;
    }
    function update() { // keep the controls (so dragging a slider isn't interrupted); just move things
      const acw = S.lf * S.ld, cw = S.rf * S.rd, diff = cw - acw, bal = Math.abs(diff) < 1e-9;
      const card = el.querySelector('.mo'); card.classList.toggle('is-balanced', bal);
      el.querySelector('.mo-beam').style.transform = `rotate(${(13 * Math.tanh(diff / 500)).toFixed(2)}deg)`;
      ['l', 'r'].forEach((side) => { const g = el.querySelector('.mo-w-' + side); const tmp = document.createElement('div'); tmp.innerHTML = `<svg>${weight(side)}</svg>`; g.replaceWith(tmp.querySelector('g')); });
      el.querySelectorAll('[data-mk]').forEach((r) => { r.previousElementSibling.textContent = S[r.dataset.mk] + (r.dataset.mk.endsWith('f') ? ' N' : ' m'); });
      const sums = el.querySelectorAll('.mo-sum strong');
      sums[0].textContent = `${S.lf} × ${S.ld} = ${fmtN(acw)} N m`; sums[1].textContent = `${S.rf} × ${S.rd} = ${fmtN(cw)} N m`;
      el.querySelector('.mo-verdict').innerHTML = bal ? `${icon('fa-circle-check')} Balanced: clockwise = anticlockwise` : diff > 0 ? `${icon('fa-rotate-right')} Turns clockwise (right side down)` : `${icon('fa-rotate-left')} Turns anticlockwise (left side down)`;
      if (bal && !wasBalanced) { EF.haptic('success'); if (challenge) { EF.toast(`Balanced! F = ${fmtN(acw)} ÷ ${S.rd} = ${S.rf} N`, 'fa-scale-balanced'); EF.store.touchDay(); } }
      wasBalanced = bal;
    }
    function newChallenge() {
      const pick = (a) => a[Math.floor(Math.random() * a.length)];
      for (let tries = 0; tries < 200; tries++) {
        const rf = pick([100, 150, 200, 250, 300, 400, 450, 500, 600, 800]), rd = pick([0.5, 0.75, 1, 1.25, 1.5, 2, 2.5]);
        const M = rf * rd, ld = pick([0.5, 1, 1.5, 2, 2.5]), lf = M / ld;
        if (lf % 50 === 0 && lf >= 50 && lf <= 800 && Math.abs(rd - ld) > 0.01) { challenge = { rf }; Object.assign(S, { lf, ld, rd, rf: 10 + Math.round(Math.random() * 40) * 10 }); if (S.rf === rf) S.rf += 30; return; }
      }
    }
    const onInput = (e) => { const r = e.target.closest('[data-mk]'); if (!r) return; S[r.dataset.mk] = parseFloat(r.value); update(); };
    const onClick = (e) => { if (e.target.closest('[data-mchal]')) { newChallenge(); wasBalanced = false; render(); } };
    el.addEventListener('input', onInput); el.addEventListener('click', onClick);
    render();
    return () => { el.removeEventListener('input', onInput); el.removeEventListener('click', onClick); };
  };

  /* ---------------- Maths: FOIL / grid method for (ax + b)(cx + d) ---------------- */
  W.expand = (el) => {
    const S = { a: 2, b: 3, c: 1, d: -4 };
    const sup = { 2: '²' };
    const term = (k, p, first) => {
      if (k === 0) return '';
      const sign = k < 0 ? (first ? '−' : ' − ') : (first ? '' : ' + ');
      const n = Math.abs(k), v = p ? 'x' + (sup[p] || '') : '';
      return sign + (n === 1 && p ? '' : n) + v;
    };
    const poly = (cs) => { let out = '', first = true; cs.forEach(([k, p]) => { const t = term(k, p, first); if (t) { out += t; first = false; } }); return out || '0'; };
    const br = (a, b) => `(${poly([[a, 1], [b, 0]])})`;
    const neg = (n) => (n < 0 ? '−' + Math.abs(n) : String(n));
    function render(pop) {
      const { a, b, c, d } = S, x2 = a * c, x1 = a * d + b * c, x0 = b * d;
      const cell = (k, p, key) => `<td class="fg-cell${pop ? ' is-pop' : ''}" style="--d:${key * 70}ms">${poly([[k, p]])}</td>`;
      el.innerHTML = `<div class="tool-card fg">
        <div class="w-toolbar"><strong class="tool-title">${icon('fa-table-cells-large')} Grid method</strong><button type="button" class="btn btn-sm" data-frand>${icon('fa-shuffle')} Random</button></div>
        <div class="fg-inputs">( <input type="number" data-fk="a" value="${a}" min="-9" max="9" aria-label="a"> x + <input type="number" data-fk="b" value="${b}" min="-9" max="9" aria-label="b"> ) ( <input type="number" data-fk="c" value="${c}" min="-9" max="9" aria-label="c"> x + <input type="number" data-fk="d" value="${d}" min="-9" max="9" aria-label="d"> )</div>
        <div class="fg-body">
          <table class="fg-grid" aria-label="Grid for ${br(a, b)}${br(c, d)}">
            <tr><th>×</th><th class="fg-h">${poly([[c, 1]])}</th><th class="fg-h">${poly([[d, 0]])}</th></tr>
            <tr><th class="fg-h">${poly([[a, 1]])}</th>${cell(x2, 2, 0)}${cell(a * d, 1, 1)}</tr>
            <tr><th class="fg-h">${poly([[b, 0]])}</th>${cell(b * c, 1, 2)}${cell(x0, 0, 3)}</tr>
          </table>
          <div class="fg-steps">
            <p><span>Question</span><strong>${br(a, b)}${br(c, d)}</strong></p>
            <p><span>Add the 4 boxes</span><strong>${poly([[x2, 2]])} ${a * d < 0 ? '−' : '+'} ${poly([[Math.abs(a * d), 1]])} ${b * c < 0 ? '−' : '+'} ${poly([[Math.abs(b * c), 1]])} ${x0 < 0 ? '−' : '+'} ${Math.abs(x0)}</strong></p>
            <p class="fg-ans"><span>Collect like terms</span><strong>${poly([[x2, 2], [x1, 1], [x0, 0]])}</strong></p>
            <p class="muted small">Check with x = 2: ${br(a, b).replace(/x/g, '(2)')}${br(c, d).replace(/x/g, '(2)')} = ${neg((2 * a + b) * (2 * c + d))} and ${x2}(4) ${x1 < 0 ? '−' : '+'} ${Math.abs(x1)}(2) ${x0 < 0 ? '−' : '+'} ${Math.abs(x0)} = ${neg(4 * x2 + 2 * x1 + x0)} ✓</p>
          </div>
        </div>
      </div>`;
    }
    const onInput = (e) => { const i = e.target.closest('[data-fk]'); if (!i) return; const v = parseInt(i.value, 10); if (!isFinite(v)) return; S[i.dataset.fk] = clamp(v, -9, 9); const pos = i.selectionStart; const k = i.dataset.fk; render(true); const ni = el.querySelector(`[data-fk="${k}"]`); ni.focus(); try { ni.setSelectionRange(pos, pos); } catch (er) { /* number inputs */ } };
    const onClick = (e) => { if (e.target.closest('[data-frand]')) { const r = () => { let v = 0; while (!v) v = Math.round(Math.random() * 14 - 7); return v; }; S.a = 1 + Math.floor(Math.random() * 3); S.c = 1 + Math.floor(Math.random() * 3); S.b = r(); S.d = r(); render(true); EF.haptic(); } };
    el.addEventListener('input', onInput); el.addEventListener('click', onClick);
    render(false);
    return () => { el.removeEventListener('input', onInput); el.removeEventListener('click', onClick); };
  };

  /* ---------------- IT: a working mini-spreadsheet ---------------- */
  W.sheet = (el, s) => {
    const COLS = 'ABCDEF'.split(''), ROWS = 8;
    const ERR = { '#DIV/0!': 'You divided by zero or by an empty cell.', '#NAME?': 'Excel doesn’t recognise a name: a misspelled function, or text without "quotes".', '#VALUE!': 'Wrong type of data, e.g. doing maths with text.', '#REF!': 'The formula points to a cell that doesn’t exist.', '#N/A': 'The lookup value wasn’t found.', '#NUM!': 'An impossible number.', '#CIRC!': 'Circular reference: the formula refers to its own cell.', '#ERROR!': 'The formula has a typing mistake: check brackets, commas and operators.' };
    const start = () => { const g = {}; g.A1 = s.data.sheet.head[0]; s.data.sheet.head.forEach((h, i) => { g[COLS[i] + 1] = h; }); s.data.sheet.rows.forEach((r, ri) => r.forEach((v, ci) => { g[COLS[ci] + (ri + 2)] = String(v); })); return g; };
    let raw = start(), active = 'E2', refs = new Set();
    class E { constructor(c) { this.c = c; } }
    const isNum = (v) => typeof v === 'number';
    const colN = (L) => L.split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
    const colL = (n) => { let s2 = ''; while (n > 0) { const m = (n - 1) % 26; s2 = String.fromCharCode(65 + m) + s2; n = Math.floor((n - 1) / 26); } return s2; };
    const parseRef = (r) => { const m = /^\$?([A-Z]{1,2})\$?(\d+)$/i.exec(r); return m ? { c: colN(m[1].toUpperCase()), r: +m[2] } : null; };
    const inGrid = (p) => p.c >= 1 && p.c <= COLS.length && p.r >= 1 && p.r <= ROWS;
    function valueOf(addr, stack) {
      if (stack.includes(addr)) throw new E('#CIRC!');
      const v = raw[addr];
      if (v == null || v === '') return null;
      if (String(v).startsWith('=')) return evalFormula(String(v).slice(1), stack.concat(addr));
      const n = Number(v); return v.trim() !== '' && isFinite(n) ? n : v;
    }
    function evalFormula(src, stack) {
      const toks = [], re = /\s*(?:(\d+(?:\.\d+)?)|"([^"]*)"|(\$?[A-Za-z]{1,2}\$?\d+(?::\$?[A-Za-z]{1,2}\$?\d+)?)|([A-Za-z]+)|(<=|>=|<>|[-+*/^&=<>(),]))/y;
      let m; re.lastIndex = 0;
      while (re.lastIndex < src.length) {
        const at = re.lastIndex; m = re.exec(src);
        if (!m) { if (/^\s*$/.test(src.slice(at))) break; throw new E('#ERROR!'); }
        if (m[1] != null) toks.push({ t: 'n', v: +m[1] }); else if (m[2] != null) toks.push({ t: 's', v: m[2] }); else if (m[3]) toks.push({ t: 'r', v: m[3].toUpperCase() }); else if (m[4]) toks.push({ t: 'id', v: m[4].toUpperCase() }); else if (m[5]) toks.push({ t: 'op', v: m[5] });
      }
      let i = 0;
      const peek = () => toks[i], next = () => toks[i++];
      const expect = (v) => { const t = next(); if (!t || t.v !== v) throw new E('#ERROR!'); };
      const num = (v) => { if (v instanceof E) throw v; if (v == null || v === '') return 0; if (isNum(v)) return v; if (typeof v === 'boolean') return v ? 1 : 0; const n = Number(v); if (isFinite(n)) return n; throw new E('#VALUE!'); };
      const cellVal = (ref) => { const p = parseRef(ref); if (!p || !inGrid(p)) throw new E('#REF!'); const a = colL(p.c) + p.r; refs.add(a); return valueOf(a, stack); };
      const range = (ref) => { const [a, b] = ref.split(':').map(parseRef); if (!a || !b || !inGrid(a) || !inGrid(b)) throw new E('#REF!'); const rows = []; for (let r = Math.min(a.r, b.r); r <= Math.max(a.r, b.r); r++) { const row = []; for (let c = Math.min(a.c, b.c); c <= Math.max(a.c, b.c); c++) { const ad = colL(c) + r; refs.add(ad); row.push(valueOf(ad, stack)); } rows.push(row); } return { range: rows }; };
      const flat = (args) => args.flatMap((a) => (a && a.range ? a.range.flat() : [a]));
      const nums = (args) => flat(args).filter(isNum);
      const crit = (cv) => { const m2 = /^(<=|>=|<>|<|>|=)?(.*)$/.exec(String(cv)); const op = m2[1] || '=', rhs = m2[2], rn = Number(rhs), numeric = rhs !== '' && isFinite(rn); return (x) => { const a = numeric ? (isNum(x) ? x : NaN) : String(x == null ? '' : x).toLowerCase(), b = numeric ? rn : rhs.toLowerCase(); switch (op) { case '>': return a > b; case '<': return a < b; case '>=': return a >= b; case '<=': return a <= b; case '<>': return a !== b; default: return a === b; } }; };
      const F = {
        SUM: (a) => nums(a).reduce((x, y) => x + y, 0),
        AVERAGE: (a) => { const n = nums(a); if (!n.length) throw new E('#DIV/0!'); return n.reduce((x, y) => x + y, 0) / n.length; },
        MAX: (a) => { const n = nums(a); return n.length ? Math.max(...n) : 0; },
        MIN: (a) => { const n = nums(a); return n.length ? Math.min(...n) : 0; },
        COUNT: (a) => nums(a).length,
        COUNTA: (a) => flat(a).filter((x) => x != null && x !== '').length,
        COUNTIF: (a) => { if (!a[0] || !a[0].range) throw new E('#VALUE!'); const f = crit(a[1]); return a[0].range.flat().filter(f).length; },
        IF: (a) => (a[0] ? (a[1] === undefined ? true : a[1]) : (a[2] === undefined ? false : a[2])),
        RANK: (a) => { const n = num(a[0]); if (!a[1] || !a[1].range) throw new E('#VALUE!'); const list = a[1].range.flat().filter(isNum); if (!list.includes(n)) throw new E('#N/A'); return a[2] ? list.filter((x) => x < n).length + 1 : list.filter((x) => x > n).length + 1; },
        VLOOKUP: (a) => { const t = a[1]; if (!t || !t.range) throw new E('#VALUE!'); const col = num(a[2]); if (col < 1) throw new E('#VALUE!'); if (col > t.range[0].length) throw new E('#REF!'); const exact = a[3] === false || a[3] === 0; const key = a[0]; let hit = -1; t.range.forEach((row, ri) => { const v = row[0]; if (hit >= 0 && exact) return; if (exact) { if (String(v).toLowerCase() === String(key).toLowerCase()) hit = ri; } else if (isNum(key) ? isNum(v) && v <= key : String(v).toLowerCase() <= String(key).toLowerCase()) hit = ri; }); if (hit < 0) throw new E('#N/A'); return t.range[hit][col - 1]; },
        ROUND: (a) => { const p = Math.pow(10, num(a[1] || 0)); return Math.round(num(a[0]) * p) / p; },
        TODAY: () => new Date().toLocaleDateString('en-GB'),
        DATE: (a) => new Date(num(a[0]), num(a[1]) - 1, num(a[2])).toLocaleDateString('en-GB'),
        DAY: (a) => { const v = a[0]; const m3 = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(v)); if (m3) return +m3[1]; throw new E('#VALUE!'); },
        SQRT: (a) => { const n = num(a[0]); if (n < 0) throw new E('#NUM!'); return Math.sqrt(n); }
      };
      function primary() {
        const t = next();
        if (!t) throw new E('#ERROR!');
        if (t.t === 'n') return t.v;
        if (t.t === 's') return t.v;
        if (t.t === 'r') return t.v.includes(':') ? range(t.v) : cellVal(t.v);
        if (t.t === 'id') {
          if (peek() && peek().v === '(') {
            next(); const args = [];
            if (peek() && peek().v !== ')') { args.push(cmp()); while (peek() && peek().v === ',') { next(); args.push(cmp()); } }
            expect(')');
            const fn = F[t.v]; if (!fn) throw new E('#NAME?');
            return fn(args);
          }
          if (t.v === 'TRUE') return true; if (t.v === 'FALSE') return false;
          throw new E('#NAME?');
        }
        if (t.v === '(') { const v = cmp(); expect(')'); return v; }
        if (t.v === '-') return -num(unary());
        if (t.v === '+') return num(unary());
        throw new E('#ERROR!');
      }
      function unary() { if (peek() && (peek().v === '-' || peek().v === '+') && peek().t === 'op') { const o = next().v; const v = num(unary()); return o === '-' ? -v : v; } return primary(); }
      function power() { let v = unary(); while (peek() && peek().v === '^') { next(); v = Math.pow(num(v), num(unary())); } return v; }
      function term() { let v = power(); while (peek() && (peek().v === '*' || peek().v === '/')) { const o = next().v, r = num(power()); if (o === '*') v = num(v) * r; else { if (r === 0) throw new E('#DIV/0!'); v = num(v) / r; } } return v; }
      function add() { let v = term(); while (peek() && (peek().v === '+' || peek().v === '-' || peek().v === '&')) { const o = next().v, r = term(); v = o === '&' ? String(v == null ? '' : v) + String(r == null ? '' : r) : o === '+' ? num(v) + num(r) : num(v) - num(r); } return v; }
      function cmp() { const l = add(); const t = peek(); if (t && ['=', '<>', '<', '>', '<=', '>='].includes(t.v)) { next(); const r = add(); const a = isNum(l) || isNum(r) ? num(l) : String(l).toLowerCase(), b = isNum(l) || isNum(r) ? num(r) : String(r).toLowerCase(); return { '=': a === b, '<>': a !== b, '<': a < b, '>': a > b, '<=': a <= b, '>=': a >= b }[t.v]; } return l; }
      const out = cmp();
      if (i < toks.length) throw new E('#ERROR!');
      if (out && out.range) throw new E('#VALUE!');
      return out;
    }
    const show = (v) => (v == null ? '' : typeof v === 'boolean' ? (v ? 'TRUE' : 'FALSE') : isNum(v) ? fmtN(v) : String(v));
    function compute(addr) { try { const v = valueOf(addr, []); return { v }; } catch (e) { if (e instanceof E) return { err: e.c }; throw e; } }
    function shiftRefs(f, dr, dc) { return f.split('"').map((part, i) => (i % 2 ? part : part.replace(/(\$?)([A-Z]{1,2})(\$?)(\d+)/g, (m0, c$, c, r$, r) => (c$ ? '$' + c : colL(colN(c) + dc)) + (r$ ? '$' + r : String(+r + dr))))).join('"'); }
    const PRESETS = [['B8', '=SUM(B2:B7)'], ['C8', '=AVERAGE(C2:C7)'], ['D8', '=MAX(D2:D7)'], ['E2', '=IF(B2>=50,"Pass","Fail")'], ['F2', '=RANK(B2,$B$2:$B$7)'], ['E8', '=COUNTIF(B2:B7,">=50")'], ['F8', '=VLOOKUP("Tia",A2:D7,4,FALSE)'], ['E1', '=B2/0'], ['F1', '=SUMM(B2:B7)']];
    function render() {
      refs = new Set();
      const res = compute(active), rawA = raw[active] || '';
      const activeRefs = String(rawA).startsWith('=') ? new Set(refs) : new Set();
      const p = parseRef(active);
      let rows = `<tr><th class="sh-corner"></th>${COLS.map((c, ci) => `<th class="sh-col${p.c === ci + 1 ? ' is-on' : ''}" scope="col">${c}</th>`).join('')}</tr>`;
      for (let r = 1; r <= ROWS; r++) {
        rows += `<tr><th class="sh-row${p.r === r ? ' is-on' : ''}" scope="row">${r}</th>`;
        COLS.forEach((c) => {
          const a = c + r, v = raw[a], isF = v && String(v).startsWith('='); const out = isF ? compute(a) : null;
          const txt = isF ? (out.err || show(out.v)) : show(v == null ? '' : (isFinite(Number(v)) && String(v).trim() !== '' ? Number(v) : v));
          const numeric = isF ? out && !out.err && isNum(out.v) : v != null && String(v).trim() !== '' && isFinite(Number(v));
          rows += `<td class="sh-cell${a === active ? ' is-active' : ''}${activeRefs.has(a) ? ' is-ref' : ''}${isF ? ' is-f' : ''}${out && out.err ? ' is-err' : ''}${numeric ? ' r' : ''}${r === 1 ? ' is-head' : ''}" data-cell="${a}" tabindex="-1">${esc(txt)}</td>`;
        });
        rows += '</tr>';
      }
      const err = res.err;
      el.innerHTML = `<div class="tool-card sh">
        <div class="w-toolbar"><strong class="tool-title">${icon('fa-table-cells')} Try it: live spreadsheet</strong><button type="button" class="btn btn-sm" data-sreset>${icon('fa-rotate-left')} Reset</button></div>
        <form class="sh-bar" novalidate><span class="sh-name" title="Name Box">${active}</span><span class="sh-fx">fx</span><input name="f" value="${esc(rawA)}" autocomplete="off" spellcheck="false" aria-label="Formula bar for ${active}" placeholder="Type a value or a formula like =SUM(B2:B7)"><button class="btn btn-c btn-sm" type="submit">Enter</button></form>
        <div class="table-wrap sh-wrap" tabindex="0" role="region" aria-label="Spreadsheet"><table class="sh-grid">${rows}</table></div>
        <div class="sh-out${err ? ' is-err' : ''}">${String(rawA).startsWith('=') ? (err ? `${icon('fa-triangle-exclamation')} <strong>${err}</strong> ${ERR[err] || ''}` : `${icon('fa-equals')} <strong>${esc(show(res.v))}</strong>${activeRefs.size ? ` <span class="muted">· uses ${activeRefs.size} cell${activeRefs.size > 1 ? 's' : ''} (highlighted)</span>` : ''}`) : `<span class="muted">${icon('fa-hand-pointer')} Tap a cell, then type in the formula bar. Change a mark and every formula updates: that’s automatic recalculation.</span>`}</div>
        ${raw.E2 && String(raw.E2).startsWith('=') && !raw.E3 ? `<button type="button" class="btn btn-sm sh-fill" data-sfill>${icon('fa-arrow-down')} Fill E2 down to E7 (see relative references)</button>` : ''}
        <div class="chips-row sh-presets"><span class="muted small">Try:</span>${PRESETS.map(([a, f]) => `<button type="button" class="chip-btn" data-spre="${a}" data-f="${esc(f)}"><small>${a}</small> ${esc(f)}</button>`).join('')}</div>
      </div>`;
    }
    const onClick = (e) => {
      const c = e.target.closest('[data-cell]');
      if (c) { active = c.dataset.cell; render(); const inp = el.querySelector('.sh-bar input'); inp && inp.focus({ preventScroll: true }); return; }
      const pr = e.target.closest('[data-spre]');
      if (pr) { active = pr.dataset.spre; raw[active] = pr.dataset.f; render(); EF.haptic(); EF.store.touchDay(); return; }
      if (e.target.closest('[data-sfill]')) { for (let r = 3; r <= 7; r++) raw['E' + r] = shiftRefs(raw.E2, r - 2, 0); active = 'E7'; render(); EF.toast('Copied down: B2 became B3, B4… (relative references)', 'fa-arrow-down'); return; }
      if (e.target.closest('[data-sreset]')) { raw = start(); active = 'E2'; render(); }
    };
    const onSubmit = (e) => {
      e.preventDefault();
      const v = e.target.f.value.trim();
      if (v === '') delete raw[active]; else raw[active] = v;
      const p = parseRef(active); if (p.r < ROWS) active = colL(p.c) + (p.r + 1); // like Excel, Enter moves down
      const keep = active; render(); active = keep;
      EF.store.touchDay();
    };
    const onKey = (e) => {
      if (!e.target.closest('.sh-wrap')) return;
      const p = parseRef(active), mv = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
      if (!mv) return; e.preventDefault();
      active = colL(clamp(p.c + mv[0], 1, COLS.length)) + clamp(p.r + mv[1], 1, ROWS); render(); el.querySelector('.sh-wrap').focus();
    };
    el.addEventListener('click', onClick); el.addEventListener('submit', onSubmit); el.addEventListener('keydown', onKey);
    render();
    return () => { el.removeEventListener('click', onClick); el.removeEventListener('submit', onSubmit); el.removeEventListener('keydown', onKey); };
  };

  EF.mountWidgets = (root) => {
    const cleanups = [];
    root.querySelectorAll('[data-widget]').forEach((el) => {
      const fn = W[el.dataset.widget];
      const s = EF.subject(el.dataset.subject);
      if (!fn || !s) return;
      try { const c = fn(el, s); if (c) cleanups.push(c); }
      catch (err) { console.error(err); el.innerHTML = `<div class="stage-msg">${icon('fa-triangle-exclamation')} This tool failed to load.</div>`; }
    });
    return () => cleanups.forEach((c) => { try { c(); } catch (e) { /* ignore */ } });
  };
})();
