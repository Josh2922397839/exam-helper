/* Zing interactive tools — Physics (see assets/js/core/interactive.js for the tool kinds) */
window.EF = window.EF || {};
(function () {
  'use strict';
  const LIQUIDS = { water: [1.0, 'fresh water'], sea: [1.03, 'sea water'], oil: [0.92, 'cooking oil'] };
  const WORLDS = { earth: [10, 'Earth'], moon: [1.6, 'the Moon'], mars: [3.7, 'Mars'], jupiter: [25, 'Jupiter'] };
  const r2 = (n) => Math.round(n * 100) / 100;
  // an arrow from (x1, y1) to (x2, y2); kind 'a' = force A, 'b' = force B, 'r' = resultant
  const ARROW = { a: ['sv-lc', 'sv-c'], b: ['sv-lb', 'sv-b'], r: ['sv-lr', 'sv-ok'] };
  const arrow = (x1, y1, x2, y2, kind) => {
    const [line, head] = ARROW[kind || 'a'], a = Math.atan2(y2 - y1, x2 - x1), h = 13, w = 7, bx = x2 - h * Math.cos(a), by = y2 - h * Math.sin(a);
    const p = (x, y) => x.toFixed(1) + ',' + y.toFixed(1);
    return EF.svg.line(x1, y1, bx, by, line) + `<polygon points="${p(x2, y2)} ${p(bx - w * Math.sin(a), by + w * Math.cos(a))} ${p(bx + w * Math.sin(a), by - w * Math.cos(a))}" class="${head}"/>`;
  };

  (EF.labs = EF.labs || {}).physics = [
    { id: 'vernier', kind: 'widget', name: 'vernier', topic: 'vernier', title: 'Vernier caliper', desc: 'Slide the jaws and practise reading the main and vernier scales.' },
    { id: 'moments', kind: 'widget', name: 'moments', topic: 'moments', title: 'See-saw of moments', desc: 'Move the weights until the clockwise and anticlockwise moments balance.' },
    { id: 'float-sink', kind: 'lab', topic: 'density', title: 'Float or sink?', desc: 'Change a block’s mass and volume and drop it in a liquid.',
      inputs: [
        { id: 'm', label: 'Mass', min: 10, max: 500, step: 10, value: 150, unit: 'g' },
        { id: 'V', label: 'Volume', min: 50, max: 500, step: 10, value: 100, unit: 'cm³' },
        { id: 'liq', label: 'Liquid', value: 'water', options: [['water', 'Fresh water (1.00 g/cm³)'], ['sea', 'Sea water (about 1.03 g/cm³)'], ['oil', 'Cooking oil (about 0.92 g/cm³)']] }
      ],
      calc: (v) => {
        const S = EF.svg, rho = v.m / v.V, [rl, name] = LIQUIDS[v.liq], same = Math.abs(rho - rl) < 1e-9, floats = !same && rho < rl;
        const side = 30 + (v.V / 500) * 50, top = 110, bottom = 230, x = 160 - side / 2;
        const y = floats ? top - side + (rho / rl) * side : same ? (top + bottom - side) / 2 : bottom - side;
        const body = S.bar(60, 30, 200, 202, 'sv-mut') + `<rect x="60" y="${top}" width="200" height="${bottom - top + 2}" class="sv-water"/>` +
          S.bar(x, y, side, side, rho > rl ? 'sv-rock' : 'sv-earth') + S.text(x + side + 8, y + side / 2 + 4, r2(rho) + ' g/cm³', 'sv-t', 'start') +
          S.text(160, 252, floats ? 'It floats' : same ? 'It hovers' : 'It sinks', 'sv-tl');
        return {
          out: [['Block density', r2(rho) + ' g/cm³'], ['Liquid density', rl + ' g/cm³'], ['Result', floats ? 'Floats' : same ? 'Hovers' : 'Sinks']],
          svg: S.wrap(320, 262, body, floats ? 'The block floats' : same ? 'The block hovers' : 'The block sinks'),
          note: `ρ = m ÷ V = ${v.m} ÷ ${v.V} = ${r2(rho)} g/cm³. ` + (floats ? `Less dense than ${name}, so it floats. About ${Math.round((rho / rl) * 100)}% of it sits under the surface.` : same ? `Exactly as dense as ${name}, so it hovers: it neither floats up nor sinks.` : `Denser than ${name}, so it sinks.`)
        };
      },
      goal: { text: 'Make a block that only just floats in fresh water: density from 0.90 up to (not including) 1.00 g/cm³.', check: (v) => v.liq === 'water' && v.m / v.V >= 0.9 - 1e-9 && v.m / v.V < 1 } },
    { id: 'weight-worlds', kind: 'lab', topic: 'mass-weight', title: 'Weight on other worlds', desc: 'Your mass stays the same everywhere, but your weight doesn’t.',
      inputs: [
        { id: 'm', label: 'Mass', min: 5, max: 150, step: 5, value: 60, unit: 'kg' },
        { id: 'w', label: 'Place', value: 'earth', options: [['earth', 'Earth (g ≈ 10 N/kg)'], ['moon', 'Moon (g ≈ 1.6 N/kg)'], ['mars', 'Mars (g ≈ 3.7 N/kg)'], ['jupiter', 'Jupiter (g ≈ 25 N/kg)']] }
      ],
      calc: (v) => {
        const S = EF.svg, keys = Object.keys(WORLDS), max = 150 * 25;
        let body = '';
        keys.forEach((k, i) => {
          const W = v.m * WORLDS[k][0], h = Math.max(2, (W / max) * 170), x = 30 + i * 72, here = k === v.w;
          body += S.bar(x, 200 - h, 52, h, here ? 'sv-c' : 'sv-cs') + S.text(x + 26, 194 - h, r2(W) + ' N', here ? 'sv-t' : 'sv-ts') + S.text(x + 26, 220, WORLDS[k][1].replace('the ', ''), here ? 'sv-t' : 'sv-ts');
        });
        body += S.line(20, 200, 310, 200);
        const [g, place] = WORLDS[v.w], W = v.m * g;
        return {
          out: [['Mass', v.m + ' kg'], ['g', g + ' N/kg'], ['Weight', r2(W) + ' N']],
          svg: S.wrap(320, 232, body, 'Weight on each world'),
          note: `W = m × g = ${v.m} × ${g} = ${r2(W)} N on ${place}. The mass is ${v.m} kg everywhere.`
        };
      },
      goal: { text: 'An astronaut weighs 160 N on the Moon. Find their mass.', check: (v) => v.w === 'moon' && v.m === 100 } },
    { id: 'add-forces', kind: 'lab', topic: 'vectors', title: 'Add two forces', desc: 'Find the resultant of two forces in a line or at right angles.',
      inputs: [
        { id: 'a', label: 'Force A', min: 0, max: 10, value: 6, unit: 'N' },
        { id: 'b', label: 'Force B', min: 0, max: 10, value: 2, unit: 'N' },
        { id: 'dir', label: 'Directions', value: 'same', options: [['same', 'Same direction'], ['opp', 'Opposite directions'], ['right', 'At right angles']] }
      ],
      calc: (v) => {
        const S = EF.svg, k = v.dir === 'same' ? Math.min(26, 250 / Math.max(1, v.a + v.b)) : v.dir === 'opp' ? Math.min(26, 120 / Math.max(1, v.a, v.b)) : Math.min(26, 180 / Math.max(1, v.a), 140 / Math.max(1, v.b));
        let body = '', R, note, ang = null, H = 176;
        const tag = (x, y, str, kind, anchor) => S.text(x, y, str, kind === 'r' ? 'sv-t' : 'sv-ts', anchor);
        if (v.dir === 'same') {
          R = v.a + v.b; note = `In line, same way: add. R = ${v.a} + ${v.b} = ${R} N.`;
          if (v.a) body += arrow(24, 56, 24 + v.a * k, 56, 'a') + tag(24 + (v.a * k) / 2, 42, 'A = ' + v.a + ' N', 'a');
          if (v.b) body += arrow(24 + v.a * k, 56, 24 + (v.a + v.b) * k, 56, 'b') + tag(24 + (v.a + v.b / 2) * k, 80, 'B = ' + v.b + ' N', 'b');
          if (R) body += arrow(24, 124, 24 + R * k, 124, 'r') + tag(24 + (R * k) / 2, 150, 'R = ' + r2(R) + ' N', 'r');
        } else if (v.dir === 'opp') {
          R = Math.abs(v.a - v.b); note = R ? `Opposite ways: subtract. R = ${Math.max(v.a, v.b)} − ${Math.min(v.a, v.b)} = ${R} N, in the direction of force ${v.a > v.b ? 'A' : 'B'}.` : 'Equal and opposite: the forces are balanced, so the resultant is 0 N.';
          body += `<circle cx="160" cy="70" r="5" class="sv-mut"/>`;
          if (v.a) body += arrow(160, 56, 160 + v.a * k, 56, 'a') + tag(166, 42, 'A = ' + v.a + ' N →', 'a', 'start');
          if (v.b) body += arrow(160, 84, 160 - v.b * k, 84, 'b') + tag(154, 106, '← B = ' + v.b + ' N', 'b', 'end');
          body += R ? arrow(160, 136, 160 + (v.a - v.b) * k, 136, 'r') + tag(160 + ((v.a - v.b) * k) / 2, 162, 'R = ' + R + ' N', 'r') : tag(160, 140, 'Balanced: R = 0 N', 'r');
        } else {
          R = Math.sqrt(v.a * v.a + v.b * v.b); ang = v.a ? Math.atan2(v.b, v.a) * 180 / Math.PI : 90; H = 200;
          note = `At right angles: use Pythagoras. R = √(${v.a}² + ${v.b}²) = ${r2(R)} N, at ${r2(ang)}° to force A.`;
          const x0 = 40, y0 = 166;
          if (v.a) body += arrow(x0, y0, x0 + v.a * k, y0, 'a') + tag(x0 + (v.a * k) / 2, y0 + 22, 'A = ' + v.a + ' N', 'a');
          if (v.b) body += arrow(x0 + v.a * k, y0, x0 + v.a * k, y0 - v.b * k, 'b') + tag(x0 + v.a * k + 10, y0 - (v.b * k) / 2 + 4, 'B = ' + v.b + ' N', 'b', 'start');
          if (R) body += arrow(x0, y0, x0 + v.a * k, y0 - v.b * k, 'r') + tag(x0 + (v.a * k) / 2 - (16 * v.b) / R, y0 - (v.b * k) / 2 - (16 * v.a) / R, 'R = ' + r2(R) + ' N', 'r');
        }
        const out = [['Resultant', r2(R) + ' N']];
        if (ang != null) out.push(['Angle to A', r2(ang) + '°']);
        return { out, svg: S.wrap(320, H, body, 'Two forces and their resultant'), note };
      },
      goal: { text: 'Make a 5 N resultant from two forces at right angles, without using a 5 N force.', check: (v) => v.dir === 'right' && v.a !== 5 && v.b !== 5 && v.a * v.a + v.b * v.b === 25 } },
    { id: 'scalar-vector', kind: 'sort', topic: 'vectors', title: 'Scalar or vector?', desc: 'Size only, or size and direction?',
      buckets: ['Scalar (size only)', 'Vector (size and direction)'],
      items: [
        ['Mass', 0], ['Distance', 0], ['Speed', 0], ['Time', 0], ['Temperature', 0], ['Energy', 0], ['Density', 0],
        ['Force', 1], ['Weight', 1, 'Weight always acts downward'], ['Displacement', 1], ['Velocity', 1], ['Acceleration', 1], ['Momentum', 1]
      ] },
    { id: 'contact-forces', kind: 'sort', topic: 'forces', title: 'Contact or non-contact?', desc: 'Do the objects need to touch for the force to act?',
      buckets: ['Contact', 'Non-contact'],
      items: [
        ['Friction', 0], ['Normal reaction', 0], ['Tension', 0], ['Air resistance (drag)', 0], ['Upthrust', 0], ['Applied push or pull', 0],
        ['Gravitational', 1], ['Magnetic', 1], ['Electrostatic', 1], ['Nuclear', 1]
      ] },
    { id: 'stability', kind: 'sort', topic: 'stability', title: 'Stable, unstable or neutral?', desc: 'Sort the objects and clues by type of equilibrium.',
      buckets: ['Stable', 'Unstable', 'Neutral'],
      items: [
        ['A cone on its base', 0], ['Falls back when tilted', 0], ['Centre of gravity rises when tilted', 0],
        ['A cone balanced on its point', 1], ['Topples when tilted', 1], ['Centre of gravity falls when tilted', 1],
        ['A ball on a flat floor', 2], ['A cone on its side', 2], ['Stays in its new position', 2], ['Centre of gravity stays at the same height', 2]
      ] }
  ];
})();
