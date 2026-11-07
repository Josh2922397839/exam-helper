/* ExamForge core — turns content blocks into HTML.
   Content is written by us (trusted), so fields named `html` may contain tags. Everything else is escaped. */
(function () {
  'use strict';
  const EF = window.EF;
  const esc = EF.esc, icon = EF.icon;
  const tint = (color) => (color ? ` tint" style="--c:${esc(color)}` : '');
  const speakBtn = (text, label) =>
    `<button type="button" class="speak" data-speak="${esc(text)}" aria-label="Hear “${esc(label || text)}”">${icon('fa-volume-high')}</button>`;
  const rows = (list) =>
    `<dl class="kv">${list.map((r) => `<div><dt>${esc(r[0])}</dt><dd>${r[1]}</dd></div>`).join('')}</dl>`;

  function cardInner(it, i, block) {
    let head = '';
    if (block.numbered) head += `<span class="num-badge">${i + 1}</span>`;
    if (it.icon) head += `<span class="tile">${icon(it.icon)}</span>`;
    if (it.emoji) head += `<span class="tile tile-emoji" aria-hidden="true">${it.emoji}</span>`;
    if (it.big) head += `<span class="big-char" lang="fr">${esc(it.big)}</span>`;
    let out = head ? `<div class="card-top">${head}</div>` : '';
    out += `<h4 class="card-title">${esc(it.title)}${it.badge ? ` <span class="pill">${esc(it.badge)}</span>` : ''}</h4>`;
    if (it.sub) out += `<p class="card-sub">${esc(it.sub)}</p>`;
    if (it.html) out += `<div class="card-text">${it.html}</div>`;
    if (it.rows) out += rows(it.rows);
    if (it.list) out += `<ul class="ticks">${it.list.map((l) => `<li>${l}</li>`).join('')}</ul>`;
    if (it.foot) out += `<p class="card-foot" lang="fr">${esc(it.foot)}</p>`;
    return out;
  }

  const R = {
    text: (b) => `<div class="prose">${/^\s*</.test(b.html) ? b.html : '<p>' + b.html + '</p>'}</div>`,
    lead: (b) => `<p class="lead">${b.html}</p>`,
    heading: (b) => `<h3 class="sub-heading">${esc(b.text)}</h3>`,

    flip: (b) => `<div class="grid cols-3 flip-grid">${b.items.map((it) => `
      <div class="flip tint" style="--c:${esc(it.color)}" role="button" tabindex="0" aria-pressed="false" data-action="flip" aria-label="${esc(it.title)} — flip card">
        <div class="flip-inner">
          <div class="flip-face flip-front">
            <span class="flip-icon">${icon(it.icon)}</span>
            <h4>${esc(it.title)}</h4>
            <p>${esc(it.sub)}</p>
            <span class="flip-hint">${icon('fa-rotate')} Tap to flip</span>
          </div>
          <div class="flip-face flip-back">
            <h4>${icon(it.icon)} ${esc(it.title)}</h4>
            ${rows(it.rows)}
          </div>
        </div>
      </div>`).join('')}</div>`,

    timeline: (b) => `<ol class="timeline">${b.items.map((it) => `
      <li class="tl-item${it.highlight ? ' is-highlight' : ''}">
        <span class="tl-dot" aria-hidden="true"></span>
        <span class="tl-label">${esc(it.label)}</span>
        <div class="tl-card"><h4>${esc(it.title)}</h4><p>${it.html}</p></div>
      </li>`).join('')}</ol>`,

    accordion: (b) => `<div class="accordion">${b.items.map((it) => `
      <details class="acc${tint(it.color)}">
        <summary>
          <span class="acc-badge">${esc(it.badge)}</span>
          <span class="acc-title"><strong>${esc(it.title)}</strong><small>${esc(it.sub || '')}</small></span>
          <span class="acc-chev">${icon('fa-chevron-down')}</span>
        </summary>
        <div class="acc-body"><ul class="points">${it.points.map((p) => `<li><strong>${esc(p[0])}</strong>${esc(p[1])}</li>`).join('')}</ul></div>
      </details>`).join('')}</div>`,

    steps: (b) => `<ol class="steps${b.horizontal ? ' steps-h' : ''}">${b.items.map((it, i) => `
      <li class="step"><span class="step-n">${i + 1}</span><div><h4>${esc(it.title)}</h4><p>${it.html}</p></div></li>`).join('')}</ol>`,

    callout: (b) => `<aside class="callout callout-${esc(b.tone || 'info')}">
      <span class="callout-icon">${icon(b.icon || 'fa-circle-info')}</span>
      <div class="callout-body">${b.title ? `<h4>${esc(b.title)}</h4>` : ''}<div class="prose">${/^\s*</.test(b.html) ? b.html : '<p>' + b.html + '</p>'}</div></div>
    </aside>`,

    table: (b) => {
      const al = b.align || [];
      const cls = (i) => (al[i] === 'r' ? ' class="r"' : '');
      return `${b.title ? `<h3 class="sub-heading">${esc(b.title)}</h3>` : ''}
      <div class="table-wrap" tabindex="0" role="region" aria-label="${esc(b.title || 'Table')}"><table class="table">
        <thead><tr>${b.head.map((h, i) => `<th scope="col"${cls(i)}>${esc(h)}</th>`).join('')}</tr></thead>
        <tbody>${b.rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${c}</th>` : `<td${cls(i)}>${c}</td>`)).join('')}</tr>`).join('')}</tbody>
      </table></div>`;
    },

    grid: (b) => `<div class="grid cols-${b.cols || 3}">${b.items.map((it, i) => {
      if (b.expand && it.more) {
        return `<details class="card card-x${tint(it.color)}"><summary>${cardInner(it, i, b)}<span class="more-hint">${icon('fa-plus')} More</span></summary><div class="card-more">${/^\s*</.test(it.more) ? it.more : '<p>' + it.more + '</p>'}</div></details>`;
      }
      return `<div class="card${tint(it.color)}">${cardInner(it, i, b)}</div>`;
    }).join('')}</div>`,

    compare: (b) => `<div class="grid cols-2">${b.items.map((it) => `
      <div class="card compare tint" style="--c:${esc(it.color)}">
        <h4 class="compare-title">${esc(it.title)}</h4>
        ${rows(it.summary)}
        <ol class="phase-list">${it.phases.map((p) => `<li><strong>${esc(p[0])}</strong><span>${esc(p[1])}</span></li>`).join('')}</ol>
      </div>`).join('')}</div>`,

    tiers: (b) => `<div class="tiers">${b.items.map((it, i) => `
      <div class="tier tint" style="--c:${esc(it.color)};--w:${100 - i * 9}%">
        <span class="pill pill-c">${esc(it.tag)}</span>
        <div><h4>${esc(it.title)}</h4><p>${it.html}</p></div>
      </div>`).join('')}</div>`,

    people: (b) => `<div class="grid cols-2">${b.items.map((it) => `
      <div class="card person tint" style="--c:${esc(it.color)}">
        <div class="person-head"><span class="avatar">${esc(it.initials)}</span><div><h4>${esc(it.name)}</h4><span class="person-dates">${esc(it.dates)}</span></div></div>
        <p>${it.html}</p>
      </div>`).join('')}</div>`,

    stats: (b) => `<div class="stats">${b.items.map((it) => `<div class="stat"><span class="stat-v">${esc(it.value)}</span><span class="stat-l">${esc(it.label)}</span></div>`).join('')}</div>`,

    /* Key terms as cards: the word, a dashed line, then its meaning. "Test me" hides the meanings until you tap Show */
    terms: (b, s) => `<div class="terms-box" data-terms>
      ${b.title || b.items.length > 1 ? `<div class="terms-head">${b.title ? `<h3 class="sub-heading">${esc(b.title)}</h3>` : '<span></span>'}${b.items.length > 1 ? `<button type="button" class="btn btn-sm terms-test" data-terms-test aria-pressed="false">${icon('fa-eye-slash')} Test me</button>` : ''}</div>` : ''}
      <div class="terms">${b.items.map((it) => `
      <div class="term"><span class="term-w"${s && s.lang ? ' lang="fr"' : ''}>${esc(it[0])}</span><span class="term-d">${it[1]}</span><button type="button" class="term-reveal" data-term-reveal hidden>${icon('fa-eye')} Show</button>${b.speak ? speakBtn(it[0]) : ''}</div>`).join('')}</div>
    </div>`,

    phrases: (b) => `${b.title ? `<h3 class="sub-heading">${esc(b.title)}</h3>` : ''}<ul class="phrases">${b.items.map((it) => `
      <li class="phrase">${speakBtn(it[0])}<span class="phrase-fr" lang="fr">${esc(it[0])}</span><span class="phrase-en">${esc(it[1])}</span></li>`).join('')}</ul>`,

    dialogue: (b) => `${b.title ? `<h3 class="sub-heading">${esc(b.title)}</h3>` : ''}<div class="dialogue">${b.items.map((it, i) => `
      <div class="bubble${i % 2 ? ' is-right' : ''}">
        <span class="bubble-who">${esc(it[0])}</span>
        <p class="bubble-fr" lang="fr">${esc(it[1])} ${speakBtn(it[1], it[0] + ' line')}</p>
        <p class="bubble-en">${esc(it[2])}</p>
      </div>`).join('')}</div>`,

    document: (b) => {
      const al = b.table.align || [];
      const cls = (i) => (al[i] === 'r' ? ' class="r"' : '');
      return `<figure class="doc doc-${esc(b.variant)}">
        <header class="doc-head">
          <div><span class="doc-title">${esc(b.title)}</span><span class="doc-tag">${esc(b.tag)}</span></div>
          <dl class="doc-meta">${(b.meta || []).map((m) => `<div><dt>${esc(m[0])}</dt><dd>${esc(m[1])}</dd></div>`).join('')}</dl>
        </header>
        <div class="doc-parties">${b.parties.map((p) => `<div><span class="doc-label">${esc(p[0])}</span><p>${p[1]}</p></div>`).join('')}</div>
        <div class="table-wrap"><table class="table doc-table">
          <thead><tr>${b.table.head.map((h, i) => `<th scope="col"${cls(i)}>${esc(h)}</th>`).join('')}</tr></thead>
          <tbody>${b.table.rows.map((r) => `<tr>${r.map((c, i) => `<td${cls(i)}>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
          <tfoot>${b.table.foot.map((f, fi) => `<tr class="${fi === b.table.foot.length - 1 ? 'is-total' : ''}"><td colspan="${b.table.head.length - 1}" class="r">${esc(f[0])}</td><td class="r">${esc(f[1])}</td></tr>`).join('')}</tfoot>
        </table></div>
        ${b.notes ? `<dl class="doc-notes">${b.notes.map((n) => `<div><dt>${esc(n[0])}</dt><dd>${esc(n[1])}</dd></div>`).join('')}</dl>` : ''}
      </figure>`;
    },

    receipt: (b) => `<figure class="receipt">
      <div class="receipt-head">${icon('fa-circle-check')}<span class="receipt-title">Receipt</span><strong>${esc(b.business)}</strong><small>${esc(b.address)}</small></div>
      <dl class="receipt-rows">${b.rows.map((r) => `<div><dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd></div>`).join('')}</dl>
      <div class="receipt-lines">${b.lines.map((l) => `<p>${esc(l)}</p>`).join('')}</div>
      <div class="receipt-total"><span>Amount paid</span><strong>${esc(b.amount)}</strong></div>
      <dl class="receipt-rows"><div><dt>Payment method</dt><dd>${esc(b.method)}</dd></div></dl>
      <p class="receipt-thanks">${esc(b.thanks)}</p>
    </figure>`,

    components: (b) => `<div class="components">${b.title ? `<span class="components-title">${esc(b.title)}</span>` : ''}${b.items.map((it) => `<span class="chip">${icon(it[0])}${esc(it[1])}</span>`).join('')}</div>`,

    org: (b) => {
      const box = (t, cls) => `<span class="org-box ${cls || ''}">${esc(t)}</span>`;
      const diagram = {
        hierarchy: `<div class="org-d org-h">${box('CEO', 'l1')}<span class="org-line"></span><div class="org-row">${box('VP', 'l2')}${box('VP', 'l2')}</div><span class="org-line"></span><div class="org-row">${box('Mgr', 'l3')}${box('Mgr', 'l3')}${box('Mgr', 'l3')}</div></div>`,
        flat: `<div class="org-d org-f">${box('Leader', 'l1')}<span class="org-line"></span><div class="org-row">${box('Team', 'l3')}${box('Team', 'l3')}${box('Team', 'l3')}${box('Team', 'l3')}${box('Team', 'l3')}</div></div>`,
        matrix: `<div class="org-d org-m"><span></span>${box('Dept A', 'l1')}${box('Dept B', 'l1 alt')}${box('Project 1', 'l2')}<span class="org-cell">●</span><span class="org-cell">●</span>${box('Project 2', 'l2')}<span class="org-cell">●</span><span class="org-cell">●</span></div>`
      };
      return `<div class="grid cols-3">${b.items.map((it) => `
        <div class="card org tint" style="--c:${esc(it.color)}">
          <h4 class="card-title">${esc(it.title)}</h4>
          ${diagram[it.diagram] || ''}
          <p class="card-text">${it.html}</p>
          <ul class="ticks">${it.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
          ${it.cons ? `<ul class="crosses">${it.cons.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
        </div>`).join('')}</div>`;
    },

    /* Formula cards: big formula, what it's for, units */
    formulas: (b) => `${b.title ? `<h3 class="sub-heading">${esc(b.title)}</h3>` : ''}<div class="formulas">${b.items.map((it) => `
      <div class="formula"><span class="formula-name">${esc(it.name)}</span><span class="formula-f">${it.f}</span>${it.html ? `<p>${it.html}</p>` : ''}${it.units ? `<span class="formula-u">${icon('fa-ruler')} ${it.units}</span>` : ''}</div>`).join('')}</div>`,

    /* Worked example: reveal the working one step at a time, then the answer (and a model answer, e.g. a letter) */
    worked: (b) => `<article class="worked">
      <header><span class="worked-badge">${icon(b.icon || 'fa-pen-ruler')} ${esc(b.label || 'Worked example')}</span><p class="worked-q">${b.q}</p></header>
      <ol class="worked-steps">${b.steps.map((x) => `<li hidden>${x}</li>`).join('')}</ol>
      <div class="worked-ans" hidden>${icon('fa-circle-check')}<span>${b.answer}</span>${b.model ? `<div class="worked-model">${b.model}</div>` : ''}</div>
      <div class="worked-ctrl"><button type="button" class="btn btn-sm btn-c" data-worked="next">${icon('fa-forward-step')} Show step 1</button><button type="button" class="btn btn-sm" data-worked="all">Show all</button></div>
    </article>`,

    /* Lab write-up (ExploreLearning Gizmo or a school practical): question, variables, steps, data, conclusion, vocab, self-test */
    gizmo: (b, s) => {
      const V = [['independent', 'You change', 'fa-sliders'], ['dependent', 'You measure', 'fa-ruler-combined'], ['controlled', 'Kept the same', 'fa-lock']];
      return `<article class="gizmo">
        <header class="gizmo-head">
          <span class="gizmo-ic">${icon(b.icon || 'fa-flask-vial')}</span>
          <div class="gizmo-title"><span class="gizmo-badge">${esc(b.badge || 'Gizmo lab')}</span><h3>${esc(b.name)}</h3>${b.topic ? `<p>${esc(b.topic)}</p>` : ''}</div>
          ${b.url ? `<a class="btn btn-sm" href="${esc(b.url)}" target="_blank" rel="noopener">${icon('fa-arrow-up-right-from-square')} ${esc(b.linkLabel || 'Open Gizmo')}</a>` : ''}
        </header>
        ${b.goal ? `<div class="gizmo-goal"><span>${icon('fa-circle-question')} ${esc(b.goalLabel || 'Question')}</span><p>${b.goal}</p></div>` : ''}
        ${b.variables ? `<div class="vars">${V.filter((v) => b.variables[v[0]]).map((v) => `<div class="var var-${v[0]}"><span class="var-k">${icon(v[2])} ${v[1]}</span><strong>${b.variables[v[0]]}</strong><small>${v[0]} variable</small></div>`).join('')}</div>` : ''}
        ${b.steps ? `<div class="gizmo-sec"><h4>${esc(b.stepsLabel || 'What you do')}</h4><ol class="gizmo-steps">${b.steps.map((x) => `<li>${x}</li>`).join('')}</ol></div>` : ''}
        ${b.data ? `<div class="gizmo-sec">${R.table({ title: b.data.title || 'Data & results', head: b.data.head, rows: b.data.rows, align: b.data.align })}</div>` : ''}
        ${b.extra ? b.extra.map((x) => `<div class="gizmo-sec"><h4>${esc(x.title)}</h4><ul class="ticks">${x.list.map((l) => `<li>${l}</li>`).join('')}</ul></div>`).join('') : ''}
        ${b.conclusion ? `<div class="gizmo-conc"><span>${icon('fa-lightbulb')} What it shows</span><p>${b.conclusion}</p></div>` : ''}
        ${b.vocab ? `<div class="gizmo-sec">${R.terms({ title: 'Vocabulary', items: b.vocab }, s)}</div>` : ''}
        ${b.questions ? `<div class="gizmo-sec"><h4>Test yourself</h4><div class="gizmo-qs">${b.questions.map((q, i) => `
          <details class="gq"><summary><span class="gq-n">${i + 1}</span><span class="gq-q">${q.q}</span><span class="gq-show">Show answer ${icon('fa-chevron-down')}</span></summary>
          <div class="gq-a"><strong>${q.a}</strong>${q.why ? `<p>${q.why}</p>` : ''}</div></details>`).join('')}</div></div>` : ''}
      </article>`;
    },

    /* Study-guide notes: one point per card, with the topic's key terms highlighted */
    notes: (b, s, terms) => `<ul class="notes">${b.items.map((x) => `<li>${EF.markHtml ? EF.markHtml(x, terms, 2) : x}</li>`).join('')}</ul>`,

    /* Formulas and rules to learn */
    rules: (b) => `<div class="rules"><span class="rules-head">${icon('fa-scale-balanced')} ${esc(b.title || 'Formulas & rules')}</span><ul>${b.items.map((x) => `<li>${x}</li>`).join('')}</ul></div>`,

    /* A diagram to practise drawing, with the labels it needs */
    diagram: (b) => `<figure class="draw">
      <span class="draw-ic" aria-hidden="true">${icon('fa-pen-ruler')}</span>
      <figcaption><span class="draw-head">Draw it</span><span class="draw-text">${b.html}</span>${b.labels && b.labels.length ? `<span class="draw-labels" aria-label="Labels">${b.labels.map((l) => `<span>${esc(l)}</span>`).join('')}</span>` : ''}</figcaption>
    </figure>`,

    /* Where a point came from, tucked away */
    sources: (b) => `<details class="src-notes"><summary>${icon('fa-circle-info')} Source notes <small>${b.items.length}</small></summary><ul>${b.items.map((x) => `<li>${x}</li>`).join('')}</ul></details>`,

    widget: (b, s) => `<div class="widget" data-widget="${esc(b.name)}" data-subject="${esc(s.id)}"><div class="widget-loading">${icon('fa-spinner', 'fa-spin')} Loading…</div></div>`
  };

  EF.renderBlocks = (blocks, subject) => {
    const terms = EF.topicTerms ? EF.topicTerms({ blocks }) : []; // this topic's key terms, highlighted in its notes
    return (blocks || []).map((b) => {
      const fn = R[b.type];
      if (!fn) { console.warn('Unknown block type', b.type); return ''; }
      return `<div class="block block-${b.type}">${fn(b, subject, terms)}</div>`;
    }).join('');
  };

  /* Plain text for the search index */
  EF.blockText = (b) => {
    const parts = [];
    const add = (x) => { if (x) parts.push(EF.strip(x)); };
    if (b.type === 'sources') return '';
    ['html', 'text', 'title', 'sub', 'more', 'name', 'topic', 'goal', 'conclusion', 'q', 'answer', 'model'].forEach((k) => add(b[k]));
    (b.labels || []).forEach(add);
    (b.extra || []).forEach((x) => { add(x.title); x.list.forEach(add); });
    if (b.variables) Object.keys(b.variables).forEach((k) => add(k + ' variable: ' + b.variables[k]));
    (b.steps || []).forEach(add);
    (b.vocab || []).forEach((v) => add(v.join(' ')));
    (b.questions || []).forEach((q) => add(q.q + ' ' + q.a));
    if (b.data && b.data.rows) b.data.rows.forEach((r) => add(r.join(' ')));
    (b.items || []).forEach((it) => {
      if (typeof it === 'string') add(it);
      else if (Array.isArray(it)) it.forEach((x) => typeof x === 'string' && add(x));
      else if (it && typeof it === 'object') {
        ['title', 'sub', 'html', 'more', 'label', 'name', 'badge', 'foot', 'desc', 'f', 'units'].forEach((k) => add(it[k]));
        (it.rows || it.points || it.summary || it.phases || []).forEach((r) => add(r.join ? r.join(' ') : r));
        (it.list || []).forEach(add);
      }
    });
    if (b.rows) b.rows.forEach((r) => add(r.join(' ')));
    if (b.parties) b.parties.forEach((p) => add(p.join(' ')));
    return parts.join(' · ');
  };
})();
