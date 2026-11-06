/* ExamForge core — Interactive: hands-on tools for every subject, like the 3D skeleton.
   Each subject's tools live in assets/js/labs/<subject>.js as EF.labs['<subject id>'] = [tool, ...].
   Every tool has: id, title, topic (a topic id in the study guide), desc (one line), kind, and:
     sort   buckets: ['A', 'B'], items: [['text', bucketIndex, 'why (optional)'], ...]
     order  steps: [['step', 'detail (optional)'], ...] listed in the right order; prompt (optional)
     lab    inputs: [...], calc: (v) => ({ out: [[label, value]], svg, note }), goal (optional): { text, check: (v, r) => true }
            an input is a slider { id, label, min, max, step, value, unit }, a choice { id, label, options: [[value, text]], value },
            typed text { id, label, text: true, value } or on/off switches { id, label, bits: 8, value }
     label  viewBox: '0 0 W H', svg: '<drawing>', spots: [[x, y, 'Label', 'fact (optional)'], ...]
     widget name: 'skeleton' (an existing tool from widgets.js)
   Sort, order and label tools are finished when everything is placed; a lab is finished when its goal is reached.
   Finishing gives +8 XP once a day per tool and a tick in the list. */
(function () {
  'use strict';
  const EF = window.EF;
  const esc = EF.esc, icon = EF.icon;
  EF.labs = EF.labs || {};
  EF.LAB_KINDS = { sort: ['Sort it', 'fa-shapes'], order: ['Put in order', 'fa-list-ol'], lab: ['Simulator', 'fa-sliders'], label: ['Label it', 'fa-tags'], widget: ['Explore', 'fa-cube'] };
  EF.labList = (sid) => EF.labs[sid] || [];
  EF.labTool = (sid, id) => EF.labList(sid).find((t) => t.id === id) || null;

  const DONE = 'ef2:labsDone';
  const doneMap = () => { try { return JSON.parse(localStorage.getItem(DONE) || '{}') || {}; } catch (e) { return {}; } };
  EF.labDone = (sid, id) => !!doneMap()[sid + '/' + id];
  EF.labDoneCount = (sid) => EF.labList(sid).filter((t) => EF.labDone(sid, t.id)).length;
  function finish(sid, id) {
    const m = doneMap(), k = sid + '/' + id, today = new Date().toDateString(), fresh = m[k] !== today;
    m[k] = today;
    try { localStorage.setItem(DONE, JSON.stringify(m)); } catch (e) { /* private mode */ }
    if (fresh) EF.store.addXP(8);
    return fresh;
  }
  const shake = (node) => { if (!node) return; node.classList.remove('is-wrong'); void node.offsetWidth; node.classList.add('is-wrong'); setTimeout(() => node.classList.remove('is-wrong'), 500); };
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  const doneBox = (fresh, line) => `
    <div class="lab-done" role="status">${EF.mascot ? EF.mascot('cheer', 64) : ''}
      <div><strong>${line}</strong><span>${fresh ? '+8 XP' : 'Done again today: no extra XP, but great practice'}</span></div>
      <button type="button" class="btn btn-c" data-lab-again>${icon('fa-rotate-right')} Play again</button>
    </div>`;
  // after a re-render, keyboard users keep their place (mouse and touch users don't need it)
  const refocus = (el, sel) => { if (el.dataset.kb !== '1') return; const n = el.querySelector(sel); if (n) n.focus(); };

  /* ---------- Sort it: tap a card, then the group it belongs in ---------- */
  // "Declarative (statement)" → the name, with the hint on a smaller second line
  const bucketLabel = (b) => { const m = /^(.*?)\s*\((.+)\)$/.exec(b); return m ? `${esc(m[1])}<small>${esc(m[2])}</small>` : esc(b); };
  function mountSort(el, s, t) {
    let pool, placed, pick, mistakes, fresh = false;
    // long single words don't fit two columns on small phones, so those tools stack their groups
    const longest = Math.max(...t.buckets.map((b) => Math.max(...b.replace(/\(.*\)/, '').split(/[\s/]+/).map((w) => w.length))));
    const long = longest >= 14 ? ' data-long="2"' : longest >= 11 ? ' data-long="1"' : '';
    const reset = () => { pool = EF.shuffle(t.items.map((_, i) => i)); placed = t.buckets.map(() => []); pick = null; mistakes = 0; render('', ''); };
    function render(msg, tone) {
      const done = !pool.length;
      el.innerHTML = `
        ${done ? '' : `<p class="lab-help">${icon('fa-hand-pointer')} Tap a card, then tap the group it belongs in.</p>
        <div class="sort-pool">${pool.map((i) => `<button type="button" class="lab-chip" data-item="${i}" aria-pressed="${pick === i}">${esc(t.items[i][0])}</button>`).join('')}</div>`}
        <div class="sort-buckets" style="--n:${Math.min(t.buckets.length, 3)}"${long}>${t.buckets.map((b, bi) => `
          <div class="sort-bucket">
            <button type="button" class="sort-drop" data-bucket="${bi}"${done ? ' disabled' : ''}>${bucketLabel(b)}</button>
            <div class="sort-in">${placed[bi].map((i) => `<span class="lab-chip is-placed">${esc(t.items[i][0])}</span>`).join('')}</div>
          </div>`).join('')}</div>
        ${done ? doneBox(fresh, mistakes ? `All sorted, with ${plural(mistakes, 'mistake')}` : 'All sorted, no mistakes! 🎉') : `<p class="lab-status${tone ? ' is-' + tone : ''}" role="status">${msg}</p>`}`;
    }
    function onClick(e) {
      const b = e.target.closest('button'); if (!b || !el.contains(b)) return;
      if (b.hasAttribute('data-lab-again')) { reset(); return; }
      if (b.dataset.item != null) { pick = +b.dataset.item === pick ? null : +b.dataset.item; render('', ''); refocus(el, `[data-item="${pick}"]`); return; }
      if (b.dataset.bucket == null) return;
      if (pick == null) { render('Pick a card first, then tap a group.', 'hint'); return; }
      const it = t.items[pick], bi = +b.dataset.bucket;
      if (it[1] === bi) {
        pool = pool.filter((i) => i !== pick); placed[bi].push(pick); pick = null;
        if (!pool.length) fresh = finish(s.id, t.id);
        render(`${icon('fa-check')} Yes! ${esc(it[0])} → ${esc(t.buckets[bi])}${it[2] ? ': ' + esc(it[2]) : ''}`, 'ok');
        refocus(el, '[data-item]');
      } else {
        mistakes++; render(`${icon('fa-xmark')} Not ${esc(t.buckets[bi])}. Try another group.`, 'bad');
        shake(el.querySelector(`[data-bucket="${bi}"]`)); refocus(el, `[data-item="${pick}"]`);
      }
    }
    el.addEventListener('click', onClick);
    reset();
    return () => el.removeEventListener('click', onClick);
  }

  /* ---------- Put in order: tap the steps in the right order ---------- */
  function mountOrder(el, s, t) {
    let pool, next, mistakes, fresh = false;
    const reset = () => { pool = EF.shuffle(t.steps.map((_, i) => i)); next = 0; mistakes = 0; render('', ''); };
    function render(msg, tone) {
      const done = next >= t.steps.length;
      el.innerHTML = `
        ${done ? '' : `<p class="lab-help">${icon('fa-hand-pointer')} ${esc(t.prompt || 'Tap the steps in the right order, starting with the first.')}</p>`}
        <ol class="order-done">${t.steps.slice(0, next).map((st) => `<li><strong>${esc(st[0])}</strong>${st[1] ? `<span>${esc(st[1])}</span>` : ''}</li>`).join('')}${done ? '' : `<li class="order-next" aria-hidden="true">?</li>`}</ol>
        ${done ? doneBox(fresh, mistakes ? `In order, with ${plural(mistakes, 'mistake')}` : 'Perfect order! 🎉') : `
        <div class="order-pool">${pool.map((i) => `<button type="button" class="lab-chip" data-step="${i}">${esc(t.steps[i][0])}</button>`).join('')}</div>
        <p class="lab-status${tone ? ' is-' + tone : ''}" role="status">${msg}</p>`}`;
    }
    function onClick(e) {
      const b = e.target.closest('button'); if (!b || !el.contains(b)) return;
      if (b.hasAttribute('data-lab-again')) { reset(); return; }
      if (b.dataset.step == null) return;
      const i = +b.dataset.step;
      if (i === next) {
        pool = pool.filter((x) => x !== i); next++;
        if (next >= t.steps.length) fresh = finish(s.id, t.id);
        render(`${icon('fa-check')} Step ${next} is right.`, 'ok'); refocus(el, '[data-step]');
      } else { mistakes++; shake(b); const st = el.querySelector('.lab-status'); if (st) { st.className = 'lab-status is-bad'; st.innerHTML = `${icon('fa-xmark')} Not yet: what comes next?`; } }
    }
    el.addEventListener('click', onClick);
    reset();
    return () => el.removeEventListener('click', onClick);
  }

  /* ---------- Label it: tap a label, then its number on the picture ---------- */
  function mountLabel(el, s, t) {
    const vb = t.viewBox.split(/\s+/).map(Number), R = Math.max(vb[2], vb[3]) * 0.032;
    let left, chips, pick, mistakes, fresh = false;
    const reset = () => { left = new Set(t.spots.map((_, i) => i)); chips = EF.shuffle(t.spots.map((_, i) => i)); pick = null; mistakes = 0; render('', ''); };
    function render(msg, tone) {
      const done = !left.size;
      el.innerHTML = `
        ${done ? '' : `<p class="lab-help">${icon('fa-hand-pointer')} Tap a label, then tap its number on the picture.</p>`}
        <figure class="label-fig"><svg viewBox="${esc(t.viewBox)}" role="img" aria-label="${esc(t.title)}">${t.svg}${t.spots.map(([x, y], i) => `
          <g class="spot${left.has(i) ? '' : ' is-done'}" data-spot="${i}"><circle cx="${x}" cy="${y}" r="${R}"/><text x="${x}" y="${y}" dy=".35em" font-size="${R * 1.1}">${i + 1}</text></g>`).join('')}</svg></figure>
        ${done ? '' : `<div class="label-chips">${chips.filter((i) => left.has(i)).map((i) => `<button type="button" class="lab-chip" data-label="${i}" aria-pressed="${pick === i}">${esc(t.spots[i][2])}</button>`).join('')}</div>`}
        <ol class="label-key">${t.spots.map((sp, i) => `<li${left.has(i) ? '' : ' class="is-done"'}><button type="button" data-spot="${i}"${left.has(i) && !done ? '' : ' disabled'}>${left.has(i) ? 'Which part?' : esc(sp[2])}</button>${!left.has(i) && sp[3] ? `<small>${esc(sp[3])}</small>` : ''}</li>`).join('')}</ol>
        ${done ? doneBox(fresh, mistakes ? `All labelled, with ${plural(mistakes, 'mistake')}` : 'All labelled, no mistakes! 🎉') : `<p class="lab-status${tone ? ' is-' + tone : ''}" role="status">${msg}</p>`}`;
    }
    function place(i) {
      if (pick == null) { render('Pick a label first, then tap a number.', 'hint'); return; }
      if (!left.has(i)) return;
      if (pick === i) {
        left.delete(i); const name = t.spots[i][2]; pick = null;
        if (!left.size) fresh = finish(s.id, t.id);
        render(`${icon('fa-check')} Yes! Number ${i + 1} is the ${esc(name)}.`, 'ok'); refocus(el, '[data-label]');
      } else { mistakes++; render(`${icon('fa-xmark')} That’s not number ${i + 1}. Try another spot.`, 'bad'); shake(el.querySelector(`.label-key [data-spot="${i}"]`)); shake(el.querySelector(`g[data-spot="${i}"]`)); }
    }
    function onClick(e) {
      const g = e.target.closest('g[data-spot]'); if (g && el.contains(g)) { place(+g.dataset.spot); return; }
      const b = e.target.closest('button'); if (!b || !el.contains(b)) return;
      if (b.hasAttribute('data-lab-again')) { reset(); return; }
      if (b.dataset.label != null) { pick = +b.dataset.label === pick ? null : +b.dataset.label; render('', ''); refocus(el, `[data-label="${pick}"]`); return; }
      if (b.dataset.spot != null) place(+b.dataset.spot);
    }
    el.addEventListener('click', onClick);
    reset();
    return () => el.removeEventListener('click', onClick);
  }

  /* ---------- Simulator: move the sliders, watch it change, hit the goal ---------- */
  const fmtNum = (x) => (typeof x === 'number' ? (Math.abs(x) >= 1000 ? x.toLocaleString('en-JM') : String(Math.round(x * 1000) / 1000)) : String(x));
  function mountSim(el, s, t) {
    const v = {};
    t.inputs.forEach((inp) => { v[inp.id] = inp.value; });
    let reached = false;
    const control = (inp) => {
      if (inp.options) return `<label class="sim-in"><span>${esc(inp.label)}</span><select data-in="${inp.id}">${inp.options.map(([val, txt]) => `<option value="${esc(String(val))}"${String(val) === String(inp.value) ? ' selected' : ''}>${esc(txt)}</option>`).join('')}</select></label>`;
      if (inp.text) return `<label class="sim-in"><span>${esc(inp.label)}</span><input type="text" data-in="${inp.id}" value="${esc(String(inp.value))}" autocomplete="off" spellcheck="false"></label>`;
      if (inp.bits) return `<fieldset class="sim-in sim-bits"><legend>${esc(inp.label)}</legend><div>${Array.from({ length: inp.bits }, (_, k) => inp.bits - 1 - k).map((p) => `<button type="button" class="bit" data-bit="${inp.id}:${p}" aria-pressed="${!!((inp.value >> p) & 1)}" aria-label="Bit worth ${2 ** p}"><b>${(inp.value >> p) & 1}</b><small>${2 ** p}</small></button>`).join('')}</div></fieldset>`;
      return `<label class="sim-in"><span>${esc(inp.label)} <b data-val="${inp.id}">${fmtNum(inp.value)}${inp.unit ? ' ' + esc(inp.unit) : ''}</b></span><input type="range" min="${inp.min}" max="${inp.max}" step="${inp.step || 1}" value="${inp.value}" data-in="${inp.id}"></label>`;
    };
    el.innerHTML = `<div class="sim">
        <div class="sim-view" data-view></div>
        <div class="sim-side">
          <div class="sim-controls">${t.inputs.map(control).join('')}</div>
          <dl class="sim-out" data-out></dl>
          <p class="sim-note" data-note></p>
          ${t.goal ? `<p class="sim-goal" data-goal>${icon('fa-bullseye')} <span>${esc(t.goal.text)}</span></p>` : ''}
        </div>
      </div>`;
    const view = el.querySelector('[data-view]'), out = el.querySelector('[data-out]'), note = el.querySelector('[data-note]'), goal = el.querySelector('[data-goal]');
    function update() {
      let r;
      try { r = t.calc(Object.assign({}, v)) || {}; } catch (err) { console.error(err); r = { note: 'Those numbers don’t work. Try others.' }; }
      view.innerHTML = r.svg || '';
      view.hidden = !r.svg;
      view.parentNode.classList.toggle('no-view', !r.svg);
      out.innerHTML = (r.out || []).map(([k, val]) => `<div><dt>${esc(k)}</dt><dd>${esc(fmtNum(val))}</dd></div>`).join('');
      note.textContent = r.note || '';
      if (goal && !reached && t.goal.check(v, r)) {
        reached = true;
        const fresh = finish(s.id, t.id);
        goal.classList.add('is-done');
        goal.innerHTML = `${icon('fa-circle-check')} <span><strong>Goal reached!</strong> ${esc(t.goal.text)}${fresh ? ' · +8 XP' : ''}</span>`;
        EF.haptic && EF.haptic('success');
      }
    }
    const onInput = (e) => {
      const n = e.target.closest('[data-in]'); if (!n) return;
      const inp = t.inputs.find((x) => x.id === n.dataset.in); if (!inp) return;
      v[inp.id] = inp.text ? n.value : inp.options ? (typeof inp.value === 'number' ? Number(n.value) : n.value) : Number(n.value);
      const lab = el.querySelector(`[data-val="${inp.id}"]`); if (lab) lab.textContent = fmtNum(v[inp.id]) + (inp.unit ? ' ' + inp.unit : '');
      update();
    };
    const onClick = (e) => {
      const b = e.target.closest('[data-bit]'); if (!b) return;
      const [id, p] = b.dataset.bit.split(':'); v[id] ^= 1 << +p;
      b.setAttribute('aria-pressed', String(!!((v[id] >> p) & 1))); b.querySelector('b').textContent = (v[id] >> p) & 1;
      update();
    };
    el.addEventListener('input', onInput); el.addEventListener('change', onInput); el.addEventListener('click', onClick);
    update();
    return () => { el.removeEventListener('input', onInput); el.removeEventListener('change', onInput); el.removeEventListener('click', onClick); };
  }

  // remember keyboard use, so focus only jumps around for people who navigate with keys
  document.addEventListener('keydown', (e) => { if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ') document.querySelectorAll('.lab').forEach((l) => { l.dataset.kb = '1'; }); });
  document.addEventListener('pointerdown', () => document.querySelectorAll('.lab').forEach((l) => { l.dataset.kb = '0'; }));

  EF.mountLab = (el, sid, id) => {
    const s = EF.subject(sid), t = EF.labTool(sid, id);
    if (!s || !t) return () => {};
    el.classList.add('lab', 'tint', 'lab-' + t.kind);
    el.style.setProperty('--c', s.color);
    const run = { sort: mountSort, order: mountOrder, label: mountLabel, lab: mountSim }[t.kind];
    if (!run) return () => {};
    try { return run(el, s, t) || (() => {}); }
    catch (err) { console.error(err); el.innerHTML = `<div class="stage-msg">${icon('fa-triangle-exclamation')} This tool failed to load.</div>`; return () => {}; }
  };

  /* small SVG helpers for the simulators */
  // text is always escaped, so it is safe to pass what a student typed
  const r1 = (n) => Math.round(n * 10) / 10;
  EF.svg = {
    wrap: (w, h, body, label) => `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label || 'Diagram')}" class="sim-svg">${body}</svg>`,
    text: (x, y, str, cls, anchor) => `<text x="${r1(x)}" y="${r1(y)}" class="${cls || 'sv-t'}" text-anchor="${anchor || 'middle'}">${esc(String(str))}</text>`,
    bar: (x, y, w, h, cls) => `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(Math.max(0, w))}" height="${r1(Math.max(0, h))}" rx="4" class="${cls || 'sv-c'}"/>`,
    line: (x1, y1, x2, y2, cls) => `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" class="${cls || 'sv-ln'}"/>`,
    circle: (cx, cy, r, cls) => `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(Math.max(0, r))}" class="${cls || 'sv-c'}"/>`,
    path: (d, cls) => `<path d="${d}" class="${cls || 'sv-lc'}"/>`
  };
})();
