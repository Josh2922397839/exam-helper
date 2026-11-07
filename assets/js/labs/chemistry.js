/* Zing interactive tools — Chemistry (see assets/js/core/interactive.js for the tool kinds) */
window.EF = window.EF || {};
(function () {
  'use strict';
  // the first 20 elements: [symbol, name, mass number of the most common isotope]
  const EL = [null,
    ['H', 'Hydrogen', 1], ['He', 'Helium', 4], ['Li', 'Lithium', 7], ['Be', 'Beryllium', 9], ['B', 'Boron', 11],
    ['C', 'Carbon', 12], ['N', 'Nitrogen', 14], ['O', 'Oxygen', 16], ['F', 'Fluorine', 19], ['Ne', 'Neon', 20],
    ['Na', 'Sodium', 23], ['Mg', 'Magnesium', 24], ['Al', 'Aluminium', 27], ['Si', 'Silicon', 28], ['P', 'Phosphorus', 31],
    ['S', 'Sulfur', 32], ['Cl', 'Chlorine', 35], ['Ar', 'Argon', 40], ['K', 'Potassium', 39], ['Ca', 'Calcium', 40]];
  const Z = {}; EL.forEach((e, i) => { if (e) Z[e[0]] = i; });
  const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '+': '⁺', '-': '⁻' };
  const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' };
  const sup = (s) => String(s).replace(/./g, (c) => SUP[c] || c);
  const sub = (n) => (n > 1 ? String(n).replace(/./g, (c) => SUB[c]) : '');
  const signed = (q) => (q > 0 ? '+' + q : q < 0 ? '−' + -q : '0');
  const ionMark = (q) => (q === 0 ? '' : sup((Math.abs(q) > 1 ? Math.abs(q) : '') + (q > 0 ? '+' : '-')));
  // shells fill 2, 8, 8, 2 for the first 20 elements
  const shells = (e) => { const out = []; let left = e; for (const cap of [2, 8, 8, 8]) { if (left <= 0) break; out.push(Math.min(cap, left)); left -= cap; } return out; };
  const fullOuter = (sh) => sh.length > 0 && sh[sh.length - 1] === (sh.length === 1 ? 2 : 8);
  const configOf = (e) => {
    const out = []; let left = e;
    for (const [n, cap] of [['1s', 2], ['2s', 2], ['2p', 6], ['3s', 2], ['3p', 6], ['4s', 2], ['3d', 10]]) { if (left <= 0) break; const k = Math.min(cap, left); out.push(n + sup(k)); left -= k; }
    return out.join(' ') || '(no electrons)';
  };
  // a Bohr-style drawing: nucleus in the middle, electrons on rings
  function atomSvg(p, n, sh, label) {
    const S = EF.svg, R = [52, 80, 106, 130];
    let body = '';
    sh.forEach((count, k) => {
      body += `<circle cx="150" cy="150" r="${R[k]}" class="sv-ln" stroke-dasharray="3 5"/>`;
      for (let j = 0; j < count; j++) {
        const a = -Math.PI / 2 + (j * 2 * Math.PI) / count + k * 0.35;
        body += S.circle(150 + R[k] * Math.cos(a), 150 + R[k] * Math.sin(a), 6, 'sv-c');
      }
    });
    body += S.circle(150, 150, 30, 'sv-cs') + S.text(150, 147, p + ' p⁺', 'sv-t') + (n == null ? '' : S.text(150, 163, n + ' n', 'sv-ts'));
    body += S.text(150, 292, label, 'sv-t');
    return S.wrap(300, 300, body, label);
  }

  const METALS = { Li: 1, Na: 1, K: 1, Mg: 2, Ca: 2, Al: 3 };
  const NONMETALS = { N: -3, O: -2, S: -2, F: -1, Cl: -1 };
  const IDE = { N: 'nitride', O: 'oxide', S: 'sulfide', F: 'fluoride', Cl: 'chloride' };
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);

  (EF.labs = EF.labs || {}).chemistry = [
    { id: 'atom', kind: 'widget', name: 'atom', topic: 'atom-model', title: '3D atom viewer', desc: 'Pick any element and spin its atom in 3D.' },
    { id: 'atom-builder', kind: 'lab', topic: 'calculations', title: 'Build an atom', desc: 'Add protons, neutrons and electrons and watch the element, mass number and charge change.',
      inputs: [
        { id: 'p', label: 'Protons', min: 1, max: 20, value: 6 },
        { id: 'n', label: 'Neutrons', min: 0, max: 22, value: 6 },
        { id: 'e', label: 'Electrons', min: 0, max: 20, value: 6 }
      ],
      calc: (v) => {
        const el = EL[v.p], A = v.p + v.n, q = v.p - v.e, sh = shells(v.e);
        const sym = sup(A) + el[0] + ionMark(q);
        let note = q === 0 ? 'Neutral atom: protons = electrons.' : q > 0 ? `Positive ion (cation): it has ${q} more proton${q > 1 ? 's' : ''} than electrons.` : `Negative ion (anion): it has ${-q} more electron${q < -1 ? 's' : ''} than protons.`;
        note += A === el[2] ? ` ${el[1]}-${A} is the most common isotope.` : v.n < v.p - 1 || v.n > v.p + 4 ? ` A nucleus with ${v.n} neutrons and ${v.p} protons would be very unstable.` : ` This is the isotope ${el[1]}-${A}.`;
        return {
          out: [['Element', el[1]], ['Symbol', sym], ['Mass number (A)', A], ['Charge', signed(q)], ['Shells', sh.join(', ') || '0'], ['Configuration', configOf(v.e)]],
          svg: atomSvg(v.p, v.n, sh, `${el[1]}-${A}${q ? ' ion' : ' atom'}`),
          note
        };
      },
      goal: { text: 'Build a neutral atom of chlorine-37.', check: (v) => v.p === 17 && v.n === 20 && v.e === 17 } },
    { id: 'ion-maker', kind: 'lab', topic: 'ions', title: 'Ion maker', desc: 'Make atoms lose or gain electrons until they have a full outer shell.',
      inputs: [
        { id: 'el', label: 'Element', value: 'Na', options: [['Li', 'Lithium (Li)'], ['Na', 'Sodium (Na)'], ['K', 'Potassium (K)'], ['Mg', 'Magnesium (Mg)'], ['Ca', 'Calcium (Ca)'], ['Al', 'Aluminium (Al)'], ['N', 'Nitrogen (N)'], ['O', 'Oxygen (O)'], ['S', 'Sulfur (S)'], ['F', 'Fluorine (F)'], ['Cl', 'Chlorine (Cl)']] },
        { id: 'd', label: 'Electrons lost (−) or gained (+)', min: -3, max: 3, value: 0 }
      ],
      calc: (v) => {
        const p = Z[v.el], el = EL[p], e = p + v.d, q = -v.d, sh = shells(e), metal = v.el in METALS;
        const name = q === 0 ? el[1] + ' atom' : el[0] + ionMark(q) + (q > 0 ? ' (cation)' : ' (anion)');
        let note;
        if (q > 0 && !metal) note = `Non-metals like ${el[1].toLowerCase()} gain electrons to make negative ions. Try gaining instead.`;
        else if (q < 0 && metal) note = `Metals like ${el[1].toLowerCase()} lose electrons to make positive ions. Try losing instead.`;
        else if (fullOuter(sh)) note = q === 0 ? 'Already a full outer shell.' : `Full outer shell, like a noble gas. ${el[0] + ionMark(q)} is a stable ion!`;
        else note = `Outer shell has ${sh[sh.length - 1] || 0} electron${sh[sh.length - 1] === 1 ? '' : 's'}: not full yet.`;
        return {
          out: [['Particle', name], ['Protons', p], ['Electrons', e], ['Charge', signed(q)], ['Shells', sh.join(', ')]],
          svg: atomSvg(p, null, sh, q === 0 ? el[1] + ' atom' : el[0] + ionMark(q) + ' ion'),
          note
        };
      },
      goal: { text: 'Turn aluminium into its stable ion.', check: (v) => v.el === 'Al' && v.d === -3 } },
    { id: 'formula-builder', kind: 'lab', topic: 'formulas', title: 'Formula builder', desc: 'Add ions until the charges cancel out, then read off the formula.',
      inputs: [
        { id: 'm', label: 'Metal ion', value: 'Mg', options: [['Na', 'Sodium Na⁺'], ['K', 'Potassium K⁺'], ['Mg', 'Magnesium Mg²⁺'], ['Ca', 'Calcium Ca²⁺'], ['Al', 'Aluminium Al³⁺']] },
        { id: 'a', label: 'How many metal ions', min: 1, max: 3, value: 1 },
        { id: 'x', label: 'Non-metal ion', value: 'Cl', options: [['Cl', 'Chloride Cl⁻'], ['F', 'Fluoride F⁻'], ['O', 'Oxide O²⁻'], ['S', 'Sulfide S²⁻'], ['N', 'Nitride N³⁻']] },
        { id: 'b', label: 'How many non-metal ions', min: 1, max: 3, value: 1 }
      ],
      calc: (v) => {
        const S = EF.svg, cm = METALS[v.m], cx = NONMETALS[v.x], plus = v.a * cm, minus = v.b * cx, total = plus + minus;
        const g = gcd(v.a, v.b), simple = g === 1, formula = v.m + sub(v.a) + v.x + sub(v.b);
        const cName = EL[Z[v.m]][1] + ' ' + IDE[v.x];
        let body = '';
        const row = (count, y, sym, q, cls) => { for (let i = 0; i < count; i++) { const x = 150 + (i - (count - 1) / 2) * 76; body += S.circle(x, y, 30, cls) + S.text(x, y + 5, sym + ionMark(q), 'sv-t'); } };
        row(v.a, 70, v.m, cm, 'sv-cs'); row(v.b, 160, v.x, cx, 'sv-mut');
        body += S.text(150, 232, 'Total charge: ' + signed(total) + (total === 0 ? ' ✓' : ''), total === 0 ? 'sv-t' : 'sv-ts');
        let note;
        if (total !== 0) note = total > 0 ? `Too much positive charge (${signed(total)}). Add more ${IDE[v.x]} ions or fewer metal ions.` : `Too much negative charge (${signed(total)}). Add more metal ions or fewer ${IDE[v.x]} ions.`;
        else if (!simple) note = `Balanced, but simplify the ratio: divide both by ${g}.`;
        else note = `Balanced! ${cName} is ${formula}.`;
        return { out: [['Positive', signed(plus)], ['Negative', signed(minus)], ['Total', signed(total)], ['Formula', total === 0 && simple ? formula : '…']], svg: S.wrap(300, 250, body, cName), note };
      },
      goal: { text: 'Write the formula for aluminium oxide.', check: (v) => v.m === 'Al' && v.x === 'O' && v.a === 2 && v.b === 3 } },
    { id: 'group-families', kind: 'sort', topic: 'periodic', title: 'Element families', desc: 'Sort elements and facts into Group 1, Group 17 or Group 18.',
      buckets: ['Alkali metals (Group 1)', 'Halogens (Group 17)', 'Noble gases (Group 18)'],
      items: [
        ['Lithium', 0], ['Sodium', 0], ['Potassium', 0], ['1 valence electron', 0], ['Very reactive metals', 0],
        ['Fluorine', 1], ['Chlorine', 1], ['Bromine', 1], ['7 valence electrons', 1], ['Very reactive non-metals', 1],
        ['Helium', 2], ['Neon', 2], ['Argon', 2], ['Full outer shell', 2], ['Very unreactive', 2]
      ] },
    { id: 'ionic-properties', kind: 'sort', topic: 'ionic-properties', title: 'Ionic compounds: true or false?', desc: 'Which facts are true of ionic compounds like table salt?',
      buckets: ['True', 'False'],
      items: [
        ['Solid at room temperature', 0], ['High melting and boiling points', 0], ['Often soluble in water', 0], ['Conduct when molten or dissolved', 0], ['Brittle: they shatter', 0], ['Ions sit in a 3D crystal lattice', 0],
        ['Conduct electricity as a solid', 1, 'The ions are fixed in place in a solid'], ['Low melting points', 1, 'Strong forces in the lattice need lots of energy to break'], ['Bend without breaking', 1, 'Like charges line up, repel, and the crystal shatters'], ['Made of two non-metals', 1, 'Ionic bonds usually form between a metal and a non-metal']
      ] }
  ];
})();
