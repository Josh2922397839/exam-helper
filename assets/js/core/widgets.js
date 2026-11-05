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

  /* ---------------- 3D skeleton + bone picker ---------------- */
  W.skeleton = (el, s) => {
    const bones = s.data.bones;
    let sel = null, scene = null, dead = false;
    el.innerHTML = `
      <div class="skel-layout">
        <div class="stage stage-skel">
          <div class="stage-3d"></div>
          <div class="stage-tip" hidden></div>
          <div class="stage-controls">
            <button type="button" class="icon-btn" data-zoom="-1" aria-label="Zoom in">${icon('fa-plus')}</button>
            <button type="button" class="icon-btn" data-zoom="1" aria-label="Zoom out">${icon('fa-minus')}</button>
            <button type="button" class="icon-btn" data-reset aria-label="Reset view">${icon('fa-rotate-left')}</button>
          </div>
          <div class="stage-hint">${icon('fa-hand-pointer')} Drag to rotate · tap a bone</div>
        </div>
        <div class="skel-side">
          <div class="bone-chips" role="group" aria-label="Bones">${bones.map((b) => `<button type="button" class="chip-btn" data-bone="${esc(b.name)}" aria-pressed="false">${esc(b.name)}</button>`).join('')}</div>
          <div class="bone-info" aria-live="polite"></div>
        </div>
      </div>`;
    const stage3d = el.querySelector('.stage-3d');
    function info() {
      el.querySelectorAll('[data-bone]').forEach((b) => { const on = b.dataset.bone === sel; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); });
      const b = bones.find((x) => x.name === sel);
      el.querySelector('.bone-info').innerHTML = b ? `
        <div class="card bone-card">
          <div class="card-top"><span class="tile">${icon('fa-bone')}</span><div><h4 class="card-title">${esc(b.name)}</h4><p class="card-sub">${esc(b.location)}</p></div></div>
          <p>${esc(b.desc)}</p>
          <div class="pill-row"><span class="pill pill-c">${esc(b.type)}</span><span class="pill">Count: ${esc(b.count)}</span></div>
          <p class="fact">💡 ${esc(b.fact)}</p>
        </div>` : `<div class="empty-hint">${icon('fa-hand-pointer')}<p>Click a bone on the model or pick one above.</p></div>`;
    }
    const select = (name) => { sel = name; info(); if (scene) scene.highlight(name); };
    const onClick = (e) => {
      const t = e.target.closest('button');
      if (!t || !el.contains(t)) return;
      if (t.dataset.bone) select(t.dataset.bone);
      else if (t.dataset.zoom && scene) scene.zoom(+t.dataset.zoom);
      else if (t.hasAttribute('data-reset') && scene) scene.reset();
    };
    el.addEventListener('click', onClick);
    info();
    stage3d.innerHTML = `<div class="stage-msg">${icon('fa-spinner', 'fa-spin')} Loading 3D skeleton…</div>`;
    EF.loadThree().then(() => {
      if (dead) return;
      stage3d.innerHTML = '';
      try {
        scene = EF.skeletonScene(stage3d, { tooltip: el.querySelector('.stage-tip'), onSelect: (name) => { sel = name; info(); } });
      } catch (err) { stage3d.innerHTML = `<div class="stage-msg">${icon('fa-triangle-exclamation')} ${esc(err.message)}</div>`; }
    }).catch(() => { if (!dead) stage3d.innerHTML = `<div class="stage-msg">${icon('fa-wifi')} Couldn’t load the 3D engine. The bone list still works.</div>`; });
    return () => { dead = true; el.removeEventListener('click', onClick); if (scene) scene.dispose(); };
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
