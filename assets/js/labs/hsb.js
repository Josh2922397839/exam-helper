/* Zing interactive tools — Human & Social Biology (see assets/js/core/interactive.js for the tool kinds) */
window.EF = window.EF || {};
(function () {
  'use strict';
  const fmt = (n) => (Math.round(n * 100) / 100).toLocaleString('en-JM');
  // water arrows for the osmosis cell: pointing in, out or both ways
  function flows(cx, cy, r, dir) {
    const S = EF.svg;
    let s = '';
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => {
      const far = r + 46, near = r + 10, x1 = cx + dx * (dir === 'in' ? far : near), y1 = cy + dy * (dir === 'in' ? far : near), x2 = cx + dx * (dir === 'in' ? near : far), y2 = cy + dy * (dir === 'in' ? near : far);
      if (dir === 'none') { s += S.line(cx + dx * near, cy + dy * near, cx + dx * far, cy + dy * far, 'sv-ln'); return; }
      const hx = x2 - dx * 10, hy = y2 - dy * 10;
      s += S.line(x1, y1, hx, hy, 'sv-lc') + `<polygon points="${x2},${y2} ${hx - dy * 6},${hy - dx * 6} ${hx + dy * 6},${hy + dx * 6}" class="sv-c"/>`;
    });
    return s;
  }
  const spiky = (cx, cy, r, n) => { let d = ''; for (let i = 0; i < n * 2; i++) { const a = (i * Math.PI) / n, rr = i % 2 ? r * 0.82 : r; d += (i ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(1) + ' ' + (cy + rr * Math.sin(a)).toFixed(1) + ' '; } return d + 'Z'; };

  // a typical plant cell for the label tool
  const PLANT_CELL = `
    <rect x="24" y="14" width="352" height="272" rx="26" class="sv-wall"/>
    <rect x="50" y="40" width="300" height="220" rx="16" class="sv-cyto"/>
    <ellipse cx="200" cy="152" rx="88" ry="66" class="sv-vac"/>
    <circle cx="318" cy="88" r="24" class="sv-nuc"/><circle cx="322" cy="84" r="8" class="sv-nucl"/>
    <ellipse cx="92" cy="70" rx="20" ry="10" class="sv-chl"/><ellipse cx="236" cy="62" rx="18" ry="9" class="sv-chl"/>
    <ellipse cx="112" cy="236" rx="19" ry="10" class="sv-chl"/><ellipse cx="300" cy="236" rx="18" ry="9" class="sv-chl"/>
    <ellipse cx="90" cy="160" rx="15" ry="8" class="sv-mito"/><path d="M80 160 q5 -6 10 0 t10 0" class="sv-ln"/>
    <ellipse cx="322" cy="168" rx="14" ry="7" class="sv-mito"/>`;

  (EF.labs = EF.labs || {}).hsb = [
    { id: 'mrs-gren', kind: 'sort', topic: 'mrs-gren', title: 'MRS GREN', desc: 'Which life process is each example showing?',
      buckets: ['Movement', 'Respiration', 'Sensitivity', 'Growth', 'Reproduction', 'Excretion', 'Nutrition'],
      items: [
        ['A plant shoot bends towards light', 0], ['A cheetah chases its prey', 0],
        ['Cells release energy from glucose', 1], ['Mitochondria make ATP', 1],
        ['Pulling your hand away from a hot pan', 2], ['Pupils get smaller in bright light', 2],
        ['A seedling gets taller and heavier', 3, 'A permanent increase in size and dry mass'], ['A baby’s cells divide and it gets bigger', 3],
        ['A cat has kittens', 4], ['A mango tree makes seeds', 4],
        ['Breathing out carbon dioxide', 5, 'CO₂ is metabolic waste from respiration'], ['Kidneys remove urea', 5],
        ['A green plant photosynthesises', 6], ['A goat eats grass', 6]
      ] },
    { id: 'organisation', kind: 'order', topic: 'cell-theory', title: 'From cell to organism', desc: 'Put the levels of organisation in order, smallest first.',
      prompt: 'Tap the levels from the smallest to the biggest.',
      steps: [
        ['Cell', 'The basic structural and functional unit, e.g. a muscle cell'],
        ['Tissue', 'Similar cells doing one job, e.g. muscle tissue'],
        ['Organ', 'Different tissues working together, e.g. the heart'],
        ['Organ system', 'Organs working together, e.g. the digestive system'],
        ['Organism', 'All the systems together: a whole living thing']
      ] },
    { id: 'plant-animal', kind: 'sort', topic: 'plant-and-animal-cells', title: 'Plant, animal or both?', desc: 'Where would you find each cell part?',
      buckets: ['Plant cells only', 'Animal cells only', 'Both'],
      items: [
        ['Cellulose cell wall', 0], ['Chloroplasts', 0, 'Many leaf cells have them, but root hair cells don’t'], ['Large permanent vacuole with cell sap', 0],
        ['Centrioles', 1, 'In the school comparison'], ['Small temporary vacuoles only', 1],
        ['Nucleus', 2], ['Cell membrane', 2], ['Cytoplasm', 2], ['Mitochondria', 2], ['Ribosomes', 2]
      ] },
    { id: 'plant-cell', kind: 'label', topic: 'plant-and-animal-cells', title: 'Label a plant cell', desc: 'Name the parts of a typical leaf cell.',
      viewBox: '0 0 400 300', svg: PLANT_CELL,
      spots: [
        [24, 150, 'Cell wall', 'Cellulose: supports the cell and stops it bursting'],
        [50, 204, 'Cell membrane', 'Partially permeable: controls what goes in and out'],
        [78, 114, 'Cytoplasm', 'Where many of the cell’s reactions happen'],
        [318, 88, 'Nucleus', 'Holds the DNA and controls the cell'],
        [200, 152, 'Vacuole', 'Holds cell sap and keeps the cell turgid'],
        [92, 70, 'Chloroplast', 'Chlorophyll absorbs light for photosynthesis'],
        [90, 160, 'Mitochondrion', 'Aerobic respiration releases usable energy']
      ] },
    { id: 'osmosis', kind: 'lab', topic: 'osmosis', title: 'Osmosis lab', desc: 'Put a cell in different solutions and watch the water move.',
      inputs: [
        { id: 'cell', label: 'Cell', value: 'animal', options: [['animal', 'Animal cell (red blood cell)'], ['plant', 'Plant cell']] },
        { id: 'sol', label: 'Solution outside', value: 'iso', options: [['water', 'Pure water (more dilute than the cell)'], ['iso', 'Same concentration as the cell'], ['conc', 'Strong sugar solution (more concentrated)']] }
      ],
      calc: (v) => {
        const S = EF.svg, cx = 160, cy = 120;
        const dir = v.sol === 'water' ? 'in' : v.sol === 'conc' ? 'out' : 'none';
        let body = `<rect x="0" y="0" width="320" height="240" class="${v.sol === 'conc' ? 'sv-sky' : 'sv-water'}" style="opacity:.3"/>`, result, note;
        if (v.cell === 'animal') {
          if (v.sol === 'water') { body += S.circle(cx, cy, 58, 'sv-cs') + S.path(`M ${cx - 20} ${cy - 58} l 8 -14 l 6 12 M ${cx + 30} ${cy + 50} l 12 10 l -2 -14`); result = 'Swells and bursts (lysis)'; note = 'Water moves in by osmosis. Animal cells have no cell wall, so the cell swells and can burst: lysis.'; }
          else if (v.sol === 'conc') { body += S.path(spiky(cx, cy, 38, 14), 'sv-cs'); result = 'Shrinks'; note = 'Water moves out by osmosis, from the more dilute cell to the more concentrated solution. The cell shrinks.'; }
          else { body += S.circle(cx, cy, 46, 'sv-cs'); result = 'No change'; note = 'Same concentration: no net water movement. Water still crosses both ways, but the cell keeps its size.'; }
          body += flows(cx, cy, v.sol === 'water' ? 58 : v.sol === 'conc' ? 38 : 46, dir);
        } else {
          body += `<rect x="${cx - 62}" y="${cy - 52}" width="124" height="104" rx="10" class="sv-wall"/>`;
          if (v.sol === 'water') { body += `<rect x="${cx - 56}" y="${cy - 46}" width="112" height="92" rx="8" class="sv-cyto"/><rect x="${cx - 40}" y="${cy - 32}" width="80" height="64" rx="14" class="sv-vac"/>`; result = 'Turgid'; note = 'Water moves in. The vacuole swells and presses the cytoplasm against the wall. The wall stops it bursting: the cell is turgid.'; }
          else if (v.sol === 'conc') { body += `<rect x="${cx - 32}" y="${cy - 26}" width="64" height="52" rx="20" class="sv-cyto"/><rect x="${cx - 16}" y="${cy - 12}" width="32" height="24" rx="10" class="sv-vac"/>`; result = 'Plasmolysed'; note = 'Water moves out. The cell goes flaccid, then the membrane and cytoplasm pull away from the wall: plasmolysis.'; }
          else { body += `<rect x="${cx - 54}" y="${cy - 44}" width="108" height="88" rx="10" class="sv-cyto"/><rect x="${cx - 32}" y="${cy - 26}" width="64" height="52" rx="12" class="sv-vac"/>`; result = 'No change'; note = 'Same concentration: no net water movement, so the cell stays the same.'; }
          body += flows(cx, cy, 62, dir);
        }
        return {
          out: [['Water moves', dir === 'in' ? 'Into the cell' : dir === 'out' ? 'Out of the cell' : 'No net movement'], ['Result', result]],
          svg: S.wrap(320, 240, body, result), note
        };
      },
      goal: { text: 'Make a plant cell plasmolysed.', check: (v) => v.cell === 'plant' && v.sol === 'conc' } },
    { id: 'energy-chain', kind: 'lab', topic: 'energy-pyramids', title: 'Energy down a food chain', desc: 'See how little energy reaches the top of a food chain.',
      inputs: [
        { id: 'e', label: 'Energy in the grass', min: 1000, max: 100000, step: 1000, value: 20000, unit: 'kJ' },
        { id: 'p', label: 'Energy passed on each step', value: 10, options: [[10, '10% (the rough school rule)'], [5, '5%'], [20, '20%']] }
      ],
      calc: (v) => {
        const S = EF.svg, names = ['Grass', 'Mouse', 'Snake', 'Hawk'], roles = ['producer', 'primary consumer', 'secondary consumer', 'tertiary consumer'];
        const es = names.map((_, i) => v.e * (v.p / 100) ** i);
        let body = '';
        es.forEach((e, i) => {
          const y = 200 - i * 56, w = 300 - i * 56, x = 160 - w / 2;
          body += S.bar(x, y, w, 46, i ? 'sv-cs' : 'sv-leaf') + S.text(160, y + 20, `${names[i]}: ${fmt(e)} kJ`, 'sv-t') + S.text(160, y + 37, roles[i], 'sv-ts');
        });
        return {
          out: names.map((n, i) => [n, fmt(es[i]) + ' kJ']),
          svg: S.wrap(320, 252, body, 'Energy at each level'),
          note: `Only about ${v.p}% passes to the next level; the rest is used in respiration and lost as heat, or stays in waste and dead material. (Bars not to scale.)`
        };
      },
      goal: { text: 'Using the 10% rule, how much energy reaches the hawk from 50,000 kJ of grass?', check: (v) => v.e === 50000 && v.p === 10 } },
    { id: 'limiting-factors', kind: 'lab', topic: 'photosynthesis', title: 'Photosynthesis rate', desc: 'Change light, carbon dioxide and temperature and find the limiting factor.',
      inputs: [
        { id: 'light', label: 'Light intensity', min: 0, max: 100, step: 5, value: 40, unit: '%' },
        { id: 'co2', label: 'Carbon dioxide', value: 60, options: [[30, 'Low'], [60, 'Normal air'], [100, 'Extra CO₂ (like a greenhouse)']] },
        { id: 't', label: 'Temperature', min: 0, max: 45, value: 20, unit: '°C' }
      ],
      calc: (v) => {
        // the slowest factor sets the rate (limiting factors); temperature works through the enzymes
        const S = EF.svg, heat = v.t <= 0 ? 0 : v.t < 25 ? v.t / 25 : v.t <= 35 ? 1 : Math.max(0, (45 - v.t) / 10);
        const tf = Math.round(100 * heat), rate = Math.min(v.light, v.co2, tf), lim = [];
        if (v.light === rate) lim.push('light');
        if (v.co2 === rate) lim.push('carbon dioxide');
        if (tf === rate) lim.push(v.t > 35 ? 'temperature (too hot)' : 'temperature (too cold)');
        const limit = rate >= 100 ? 'None: top speed!' : lim.join(' and ').replace(/^./, (c) => c.toUpperCase());
        let body = '';
        for (let i = 0; i < 12; i++) { const on = i < Math.round(rate / 100 * 12); body += S.circle(60 + (i % 6) * 40, 70 + Math.floor(i / 6) * 44 - (on ? 6 : 0), on ? 9 : 5, on ? 'sv-water' : 'sv-mut'); }
        body += S.bar(30, 160, 260, 26, 'sv-mut') + S.bar(30, 160, 2.6 * rate, 26, 'sv-leaf') + S.text(160, 210, 'Rate: ' + rate + ' (oxygen bubbles)', 'sv-t') + S.text(160, 30, 'Oxygen bubbles from pondweed', 'sv-ts');
        return {
          out: [['Rate', rate + ' / 100'], ['Limiting factor', limit]],
          svg: S.wrap(320, 226, body, 'Rate of photosynthesis'),
          note: 'Raising one factor only helps while it is the one holding the rate back. Very cold slows the enzymes; too hot damages them. (A simple model.)'
        };
      },
      goal: { text: 'Get the fastest rate: no limiting factor left.', check: (v) => v.light >= 100 && v.co2 >= 100 && v.t >= 25 && v.t <= 35 } },
    { id: 'food-tests', kind: 'sort', topic: 'food-tests', title: 'Food tests', desc: 'Match each reagent and result to the food it tests for.',
      buckets: ['Starch', 'Reducing sugar', 'Protein', 'Fat'],
      items: [
        ['Iodine solution', 0], ['Positive: blue-black', 0], ['Negative: stays yellow-brown', 0],
        ['Benedict’s solution', 1], ['Heat in a hot-water bath', 1], ['Positive: brick-red precipitate', 1],
        ['Biuret reagent', 2], ['Positive: lilac or purple', 2], ['No boiling needed', 2],
        ['Shake with ethanol, then add water', 3], ['Positive: cloudy white emulsion', 3], ['Translucent grease spot on paper', 3]
      ] }
  ];
})();
