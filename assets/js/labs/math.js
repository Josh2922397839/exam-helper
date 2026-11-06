/* ExamForge interactive tools — Mathematics (see assets/js/core/interactive.js for the tool kinds) */
window.EF = window.EF || {};
(function () {
  'use strict';
  const money = (n) => '$' + n.toLocaleString('en-JM', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻' };
  const sup = (n) => String(n).replace(/./g, (c) => SUP[c] || c);
  const minus = (n) => (n < 0 ? '−' + -n : String(n));
  const fix = (n, d) => minus(Number(n.toFixed(d)));
  const dashed = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="sv-ln" stroke-dasharray="5 4"/>`;

  const EQS = [[3, 5, 20, '3x + 5 = 20'], [2, -4, 10, '2x − 4 = 10'], [5, 2, 37, '5x + 2 = 37'], [4, 4, 24, '4(x + 1) = 24']];
  const plain = (digits, shift) => { // the digits of a × 10ⁿ written out in full, without floating-point rounding
    if (shift >= 0) return Number(digits + '0'.repeat(shift)).toLocaleString('en-JM');
    const s = digits.padStart(-shift + 1, '0'), cut = s.length + shift, frac = s.slice(cut).replace(/0+$/, '');
    return s.slice(0, cut) + (frac ? '.' + frac : '');
  };

  (EF.labs = EF.labs || {}).math = [
    { id: 'expand', kind: 'widget', name: 'expand', topic: 'two-brackets', title: 'Bracket expander', desc: 'Expand two brackets step by step with the grid method.' },
    { id: 'discount', kind: 'lab', topic: 'percentages', title: 'Sale price maker', desc: 'Slide the discount and see what you save and what you pay.',
      inputs: [
        { id: 'p', label: 'Original price', min: 100, max: 5000, step: 100, value: 2000, unit: 'dollars' },
        { id: 'd', label: 'Discount', min: 0, max: 90, step: 5, value: 15, unit: '%' }
      ],
      calc: (v) => {
        const S = EF.svg, off = (v.p * v.d) / 100, pay = v.p - off, w = (260 * (100 - v.d)) / 100;
        const body = S.text(20, 30, 'Original price: ' + money(v.p), 'sv-t', 'start') +
          S.bar(20, 50, 260, 56, 'sv-mut') + S.bar(20, 50, w, 56, 'sv-c') +
          S.text(20, 132, `Pay ${100 - v.d}% = ${money(pay)}`, 'sv-t', 'start') + S.text(280, 132, `Save ${v.d}%`, 'sv-ts', 'end');
        return {
          out: [['Discount', money(off)], ['Sale price', money(pay)]],
          svg: S.wrap(300, 150, body, 'Price bar'),
          note: `A ${v.d}% discount leaves ${100 - v.d}% of the price: ${money(v.p)} × ${(100 - v.d) / 100} = ${money(pay)}.`
        };
      },
      goal: { text: 'A $2,400 phone is on sale for $1,800. Set the price and find the discount percentage.', check: (v) => v.p === 2400 && v.d === 25 } },
    { id: 'ratio-share', kind: 'lab', topic: 'ratio-and-proportion', title: 'Share it out', desc: 'Split money in any ratio and see how the parts work.',
      inputs: [
        { id: 't', label: 'Amount to share', min: 100, max: 1000, step: 20, value: 300, unit: 'dollars' },
        { id: 'a', label: 'Asha’s parts', min: 1, max: 9, value: 2 },
        { id: 'b', label: 'Ben’s parts', min: 1, max: 9, value: 3 }
      ],
      calc: (v) => {
        const S = EF.svg, parts = v.a + v.b, one = v.t / parts, w = 260 / parts;
        let body = S.text(20, 26, `Ratio ${v.a} : ${v.b} → ${parts} equal parts`, 'sv-t', 'start');
        for (let i = 0; i < parts; i++) body += `<rect x="${(20 + i * w + 1).toFixed(1)}" y="40" width="${(w - 2).toFixed(1)}" height="50" rx="5" class="${i < v.a ? 'sv-c' : 'sv-cs'}"/>`;
        body += S.text(20, 116, 'Asha: ' + money(one * v.a), 'sv-t', 'start') + S.text(280, 116, 'Ben: ' + money(one * v.b), 'sv-t', 'end');
        return {
          out: [['One part', money(one)], ['Asha gets', money(one * v.a)], ['Ben gets', money(one * v.b)]],
          svg: S.wrap(300, 132, body, 'Ratio bar'),
          note: `${v.a} + ${v.b} = ${parts} parts. One part = ${money(v.t)} ÷ ${parts} = ${money(one)}.`
        };
      },
      goal: { text: 'Share $480 between Asha and Ben in the ratio 1 : 3.', check: (v) => v.t === 480 && v.b === 3 * v.a } },
    { id: 'index-laws', kind: 'lab', topic: 'indices', title: 'Index laws', desc: 'See why you add, subtract or multiply the powers.',
      inputs: [
        { id: 'op', label: 'Rule', value: 'mul', options: [['mul', 'Multiply: aᵐ × aⁿ'], ['div', 'Divide: aᵐ ÷ aⁿ'], ['pow', 'Power of a power: (aᵐ)ⁿ']] },
        { id: 'a', label: 'Base a', min: 2, max: 5, value: 2 },
        { id: 'm', label: 'Power m', min: 1, max: 6, value: 3 },
        { id: 'n', label: 'Power n', min: 1, max: 6, value: 2 }
      ],
      calc: (v) => {
        const S = EF.svg, T = 22, G = 3, X0 = 10;
        const tile = (x, y, cls, crossed) => `<rect x="${x}" y="${y}" width="${T}" height="${T}" rx="5" class="${cls}"/>` + S.text(x + T / 2, y + 16, v.a, 'sv-t') + (crossed ? S.line(x + 3, y + T - 3, x + T - 3, y + 3) : '');
        let body = '', exp, head, H;
        if (v.op === 'mul') {
          exp = v.m + v.n; head = `${v.a}${sup(v.m)} × ${v.a}${sup(v.n)} = ${v.a}${sup(exp)}`; H = 42 + T + 10;
          for (let i = 0; i < exp; i++) body += tile(X0 + i * (T + G), 42, i < v.m ? 'sv-cs' : 'sv-mut');
        } else if (v.op === 'div') {
          exp = v.m - v.n; head = `${v.a}${sup(v.m)} ÷ ${v.a}${sup(v.n)} = ${v.a}${sup(exp)}`; H = 80 + T + 10;
          const k = Math.min(v.m, v.n);
          for (let i = 0; i < v.m; i++) body += tile(X0 + i * (T + G), 42, i < k ? 'sv-mut' : 'sv-cs', i < k);
          body += S.line(X0 - 4, 73, X0 + 4 + Math.max(v.m, v.n) * (T + G), 73);
          for (let i = 0; i < v.n; i++) body += tile(X0 + i * (T + G), 80, i < k ? 'sv-mut' : 'sv-cs', i < k);
        } else {
          exp = v.m * v.n; head = `(${v.a}${sup(v.m)})${sup(v.n)} = ${v.a}${sup(exp)}`; H = 42 + v.n * (T + G) + 8;
          for (let j = 0; j < v.n; j++) for (let i = 0; i < v.m; i++) body += tile(X0 + i * (T + G), 42 + j * (T + G), j % 2 ? 'sv-mut' : 'sv-cs');
        }
        const big = v.a ** Math.abs(exp), e10 = Math.floor(Math.log10(big));
        const shown = big >= 1e12 ? `about ${(big / 10 ** e10).toFixed(2)} × 10${sup(e10)}` : big.toLocaleString('en-JM');
        const value = exp >= 0 ? shown : '1/' + shown;
        const notes = { mul: `Same base: add the powers. ${v.m} + ${v.n} = ${exp}.`, div: `Same base: subtract the powers. ${v.m} − ${v.n} = ${minus(exp)}. Matching factors cancel.`, pow: `Power of a power: multiply the powers. ${v.m} × ${v.n} = ${exp}.` };
        let note = notes[v.op];
        if (exp === 0) note += ` Anything (except 0) to the power 0 is 1.`;
        if (exp < 0) note += ` A negative power means 1 over the positive power.`;
        return { out: [['Answer', v.a + sup(exp)], ['Value', value]], svg: S.wrap(320, H, S.text(X0, 26, head, 'sv-tl', 'start') + body, head), note };
      },
      goal: { text: 'Use the divide rule to make the power 0.', check: (v) => v.op === 'div' && v.m === v.n } },
    { id: 'pythagoras', kind: 'lab', topic: 'pythagoras', title: 'Pythagoras explorer', desc: 'Change the two short sides and find the hypotenuse.',
      inputs: [
        { id: 'a', label: 'Side a', min: 1, max: 20, value: 6 },
        { id: 'b', label: 'Side b', min: 1, max: 20, value: 8 }
      ],
      calc: (v) => {
        const S = EF.svg, sum = v.a * v.a + v.b * v.b, c = Math.sqrt(sum), whole = Number.isInteger(c);
        const k = 190 / Math.max(v.a, v.b), x0 = 70, y0 = 220, x1 = x0 + v.b * k, y1 = y0 - v.a * k;
        const body = `<polygon points="${x0},${y0} ${x1.toFixed(1)},${y0} ${x0},${y1.toFixed(1)}" class="sv-cs"/>` +
          `<rect x="${x0}" y="${y0 - 14}" width="14" height="14" class="sv-mut"/>` +
          S.text(x0 - 8, (y0 + y1) / 2 + 4, 'a = ' + v.a, 'sv-t', 'end') + S.text((x0 + x1) / 2, y0 + 22, 'b = ' + v.b, 'sv-t') +
          S.text((x0 + x1) / 2 + 10, (y0 + y1) / 2 - 8, 'c = ' + (whole ? c : c.toFixed(2)), 'sv-t', 'start');
        return {
          out: [['a²', v.a * v.a], ['b²', v.b * v.b], ['c² = a² + b²', sum], ['Hypotenuse c', whole ? c : Number(c.toFixed(2))]],
          svg: S.wrap(300, 250, body, 'Right-angled triangle'),
          note: whole ? `${v.a}–${v.b}–${c} is a Pythagorean triple: every side is a whole number!` : `c = √${sum} ≈ ${c.toFixed(2)}: not a whole number.`
        };
      },
      goal: { text: 'Find a whole-number right triangle that isn’t 3–4–5 or a multiple of it.', check: (v) => Number.isInteger(Math.sqrt(v.a * v.a + v.b * v.b)) && v.a * 4 !== v.b * 3 && v.a * 3 !== v.b * 4 } },
    { id: 'sohcahtoa', kind: 'lab', topic: 'trigonometry', title: 'SOHCAHTOA', desc: 'Turn the angle and watch sin, cos and tan change.',
      inputs: [
        { id: 't', label: 'Angle θ', min: 5, max: 85, value: 30, unit: '°' },
        { id: 'h', label: 'Hypotenuse', min: 1, max: 20, value: 10, unit: 'cm' }
      ],
      calc: (v) => {
        const S = EF.svg, r = (v.t * Math.PI) / 180, sn = Math.sin(r), cs = Math.cos(r), L = 200, x0 = 30, y0 = 230;
        const x1 = x0 + L * cs, y1 = y0 - L * sn;
        const hyp = (x, y, str, deg) => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="sv-ts" text-anchor="middle" transform="rotate(${deg} ${x.toFixed(1)} ${y.toFixed(1)})">${EF.esc(str)}</text>`;
        const body = `<polygon points="${x0},${y0} ${x1.toFixed(1)},${y0} ${x1.toFixed(1)},${y1.toFixed(1)}" class="sv-cs"/>` +
          `<rect x="${(x1 - 12).toFixed(1)}" y="${y0 - 12}" width="12" height="12" class="sv-mut"/>` +
          S.path(`M ${x0 + 34} ${y0} A 34 34 0 0 0 ${(x0 + 34 * cs).toFixed(1)} ${(y0 - 34 * sn).toFixed(1)}`) +
          S.text(x0 + 44, y0 - 8, 'θ', 'sv-t', 'start') +
          S.text((x0 + x1) / 2, y0 + 20, 'Adjacent ' + (v.h * cs).toFixed(2), 'sv-ts') +
          S.text(x1 + 8, (y0 + y1) / 2, 'Opposite', 'sv-ts', 'start') + S.text(x1 + 8, (y0 + y1) / 2 + 14, (v.h * sn).toFixed(2), 'sv-ts', 'start') +
          hyp((x0 + x1) / 2 - 12 * sn, (y0 + y1) / 2 - 12 * cs, 'Hypotenuse ' + v.h, -v.t);
        return {
          out: [['Opposite', fix(v.h * sn, 2)], ['Adjacent', fix(v.h * cs, 2)], ['sin θ = O/H', fix(sn, 3)], ['cos θ = A/H', fix(cs, 3)], ['tan θ = O/A', fix(sn / cs, 3)]],
          svg: S.wrap(320, 262, body, 'Right-angled triangle with angle ' + v.t + '°'),
          note: 'SOH: sin = opposite ÷ hypotenuse. CAH: cos = adjacent ÷ hypotenuse. TOA: tan = opposite ÷ adjacent.'
        };
      },
      goal: { text: 'Find the angle where the opposite and adjacent sides are equal (tan θ = 1).', check: (v) => v.t === 45 } },
    { id: 'circle', kind: 'lab', topic: 'circles-and-volume', title: 'Circle calculator', desc: 'Grow a circle and watch its circumference and area.',
      inputs: [
        { id: 'r', label: 'Radius', min: 1, max: 20, value: 5, unit: 'cm' },
        { id: 'pi', label: 'Value of π', value: 'calc', options: [['calc', 'π on a calculator'], ['3.14', 'π ≈ 3.14'], ['22/7', 'π ≈ 22/7']] }
      ],
      calc: (v) => {
        const S = EF.svg, pi = v.pi === '3.14' ? 3.14 : v.pi === '22/7' ? 22 / 7 : Math.PI, R = v.r * 6;
        const C = 2 * pi * v.r, A = pi * v.r * v.r;
        const body = S.circle(140, 140, R, 'sv-cs') + S.circle(140, 140, 3, 'sv-c') + S.line(140, 140, 140 + R, 140, 'sv-lc') + S.text(140 + R / 2, 132, 'r = ' + v.r, 'sv-t');
        return {
          out: [['Diameter', 2 * v.r + ' cm'], ['Circumference', fix(C, 2) + ' cm'], ['Area', fix(A, 2) + ' cm²']],
          svg: S.wrap(280, 280, body, 'Circle with radius ' + v.r + ' cm'),
          note: `Circumference = 2πr = 2 × π × ${v.r}. Area = πr² = π × ${v.r}².`
        };
      },
      goal: { text: 'Make a circle with an area of exactly 154 cm², using π ≈ 22/7.', check: (v) => v.pi === '22/7' && v.r === 7 } },
    { id: 'compound', kind: 'lab', topic: 'compound-interest', title: 'Compound interest', desc: 'Watch interest earn interest, year after year.',
      inputs: [
        { id: 'p', label: 'Principal P', min: 500, max: 10000, step: 500, value: 1000, unit: 'dollars' },
        { id: 'r', label: 'Rate per year', min: 1, max: 15, step: 0.5, value: 5, unit: '%' },
        { id: 'n', label: 'Years n', min: 1, max: 20, value: 5 }
      ],
      calc: (v) => {
        const S = EF.svg, B = v.p * (1 + v.r / 100) ** v.n, top = Math.max(B, 2 * v.p) * 1.08, base = 196, hgt = 160, X0 = 44, W = 266;
        const bw = W / (v.n + 1);
        let body = '';
        for (let y = 0; y <= v.n; y++) { const b = v.p * (1 + v.r / 100) ** y; body += S.bar(X0 + y * bw + 1, base - (b / top) * hgt, Math.max(1, bw - 2), (b / top) * hgt, y ? 'sv-c' : 'sv-cs'); }
        const dy = base - ((2 * v.p) / top) * hgt;
        body += dashed(X0, dy.toFixed(1), X0 + W, dy.toFixed(1)) + S.text(X0 - 4, dy + 4, '2×', 'sv-ts', 'end') +
          S.line(X0, base, X0 + W, base) + S.text(X0, base + 16, 'Year 0', 'sv-ts', 'start') + S.text(X0 + W, base + 16, 'Year ' + v.n, 'sv-ts', 'end');
        return {
          out: [['Final balance', money(B)], ['Interest earned', money(B - v.p)], ['Growth', (B / v.p).toFixed(2) + '×']],
          svg: S.wrap(320, 220, body, 'Balance each year'),
          note: `B = P(1 + r)ⁿ = ${money(v.p)} × ${(1 + v.r / 100).toFixed(3)}${sup(v.n)} = ${money(B)}`
        };
      },
      goal: { text: 'Make the money at least double in 10 years or fewer.', check: (v) => v.n <= 10 && (1 + v.r / 100) ** v.n >= 2 } },
    { id: 'speed', kind: 'lab', topic: 'speed-distance-time', title: 'Speed, distance, time', desc: 'Plan a trip and read the speed off the graph.',
      inputs: [
        { id: 'd', label: 'Distance', min: 10, max: 300, step: 10, value: 100, unit: 'km' },
        { id: 't', label: 'Time', min: 0.5, max: 6, step: 0.5, value: 2.5, unit: 'h' }
      ],
      calc: (v) => {
        const S = EF.svg, sp = v.d / v.t, X0 = 44, Y0 = 200, px = 260 / 6, py = 170 / 300;
        let body = '';
        for (let h = 1; h <= 6; h++) body += dashed(X0 + h * px, Y0, X0 + h * px, Y0 - 170) + S.text(X0 + h * px, Y0 + 16, h, 'sv-ts');
        body += S.line(X0, Y0, X0 + 260, Y0) + S.line(X0, Y0, X0, Y0 - 175) + S.text(X0 - 6, Y0 - 166, '300', 'sv-ts', 'end') + S.text(X0 - 6, Y0 + 4, '0', 'sv-ts', 'end') +
          S.line(X0, Y0, X0 + v.t * px, Y0 - v.d * py, 'sv-lc') + S.circle(X0 + v.t * px, Y0 - v.d * py, 6, 'sv-c') +
          S.text(X0 + 130, Y0 + 34, 'time (hours)', 'sv-ts') + S.text(X0 + 6, 18, 'distance (km)', 'sv-ts', 'start');
        return {
          out: [['Speed', fix(sp, 1) + ' km/h'], ['Time in minutes', v.t * 60 + ' min'], ['Speed in m/s', fix(sp / 3.6, 1)]],
          svg: S.wrap(320, 244, body, 'Distance–time graph'),
          note: 'Speed = distance ÷ time. On a distance–time graph, a steeper line means a greater speed.'
        };
      },
      goal: { text: 'Make the trip at exactly 60 km/h.', check: (v) => Math.abs(v.d / v.t - 60) < 1e-9 } },
    { id: 'balance', kind: 'lab', topic: 'linear-equations', title: 'Balance the equation', desc: 'Try values of x until both sides of the scale balance.',
      inputs: [
        { id: 'q', label: 'Equation', value: 0, options: EQS.map((e, i) => [i, e[3]]) },
        { id: 'x', label: 'x', min: -5, max: 10, value: 0 }
      ],
      calc: (v) => {
        const S = EF.svg, [a, b, c, txt] = EQS[v.q], left = a * v.x + b, ok = left === c;
        const tilt = Math.max(-0.26, Math.min(0.26, (left - c) * 0.012)), cx = 160, cy = 64, L = 100;
        const lx = cx - L * Math.cos(tilt), ly = cy + L * Math.sin(tilt), rx = cx + L * Math.cos(tilt), ry = cy - L * Math.sin(tilt);
        const pan = (x, y, label, val) => S.line(x, y, x, y + 46) + `<rect x="${(x - 50).toFixed(1)}" y="${(y + 46).toFixed(1)}" width="100" height="44" rx="10" class="sv-cs"/>` + S.text(x, y + 64, label, 'sv-t') + S.text(x, y + 81, '= ' + minus(val), 'sv-ts');
        const lhs = txt.split('=')[0].trim();
        const body = `<polygon points="${cx},${cy} ${cx - 22},226 ${cx + 22},226" class="sv-mut"/>` + S.line(lx, ly, rx, ry, 'sv-lc') + S.circle(cx, cy, 6, 'sv-c') +
          pan(lx, ly, lhs, left) + pan(rx, ry, String(c), c) + (ok ? S.text(cx, 30, 'Balanced ✓', 'sv-t') : '');
        let note;
        if (ok) {
          const steps = txt.startsWith('4(') ? `Divide both sides by 4: x + 1 = 6. Subtract 1: x = 5.` : `${b > 0 ? 'Subtract ' + b + ' from' : 'Add ' + -b + ' to'} both sides: ${a}x = ${c - b}. Divide by ${a}: x = ${v.x}.`;
          note = `Balanced! x = ${minus(v.x)} works. ${steps}`;
        } else note = `Left side = ${minus(left)}, right side = ${c}. ${left < c ? 'Too light: try a bigger x.' : 'Too heavy: try a smaller x.'}`;
        return { out: [['Left side', left], ['Right side', c], ['Balanced?', ok ? 'Yes ✓' : 'Not yet']], svg: S.wrap(320, 240, body, 'Balance scale for ' + txt), note };
      },
      goal: { text: 'Find the value of x that balances 3x + 5 = 20.', check: (v) => v.q === 0 && v.x === 5 } },
    { id: 'averages', kind: 'lab', topic: 'averages-and-probability', title: 'Mean, median, mode', desc: 'Change five scores and watch the averages move.',
      inputs: [1, 2, 3, 4, 5].map((i) => ({ id: 's' + i, label: 'Score ' + i, min: 1, max: 10, value: [2, 4, 4, 7, 9][i - 1] })),
      calc: (v) => {
        const S = EF.svg, xs = [v.s1, v.s2, v.s3, v.s4, v.s5], sorted = xs.slice().sort((p, q) => p - q), mean = xs.reduce((p, q) => p + q, 0) / 5;
        const count = {}; xs.forEach((x) => { count[x] = (count[x] || 0) + 1; });
        const most = Math.max(...Object.values(count)), modes = most > 1 ? Object.keys(count).filter((k) => count[k] === most).map(Number).sort((p, q) => p - q) : [];
        const base = 196, u = 16;
        let body = '';
        xs.forEach((x, i) => { const bx = 40 + i * 54; body += S.bar(bx, base - x * u, 40, x * u, modes.includes(x) ? 'sv-c' : 'sv-cs') + S.text(bx + 20, base - x * u - 6, x, 'sv-t'); });
        const my = base - mean * u;
        body += S.line(30, base, 300, base) + dashed(30, my.toFixed(1), 300, my.toFixed(1)) + S.text(300, my - 6, 'mean ' + fix(mean, 2), 'sv-ts', 'end');
        return {
          out: [['Mean', fix(mean, 2)], ['Median', sorted[2]], ['Mode', modes.length ? modes.join(', ') : 'none'], ['Range', sorted[4] - sorted[0]]],
          svg: S.wrap(320, 214, body, 'Bar chart of the scores'),
          note: `In order: ${sorted.join(', ')}. The median is the middle one; the mode is the most common.`
        };
      },
      goal: { text: 'Make the mean, the median and the mode all equal 5.', check: (v) => {
        const xs = [v.s1, v.s2, v.s3, v.s4, v.s5], sorted = xs.slice().sort((p, q) => p - q), fives = xs.filter((x) => x === 5).length;
        const other = Math.max(0, ...xs.filter((x) => x !== 5).map((x) => xs.filter((y) => y === x).length));
        return xs.reduce((p, q) => p + q, 0) === 25 && sorted[2] === 5 && fives > 1 && fives > other;
      } } },
    { id: 'standard-form', kind: 'lab', topic: 'standard-form', title: 'Standard form', desc: 'Build a × 10ⁿ and see the ordinary number.',
      inputs: [
        { id: 'a', label: 'Number a (1 to 9.9)', min: 1, max: 9.9, step: 0.1, value: 3.2 },
        { id: 'n', label: 'Power n', min: -6, max: 9, value: 3 }
      ],
      calc: (v) => {
        const S = EF.svg, d = String(Math.round(v.a * 10)), a = (Number(d) / 10).toFixed(1).replace(/\.0$/, ''), full = plain(d, v.n - 1);
        const body = S.text(160, 50, `${a} × 10${sup(v.n)}`, 'sv-tl') + S.text(160, 90, '= ' + full, 'sv-tl') +
          S.text(160, 124, v.n > 0 ? `decimal point moves ${v.n} place${v.n > 1 ? 's' : ''} right →` : v.n < 0 ? `← decimal point moves ${-v.n} place${v.n < -1 ? 's' : ''} left` : '10⁰ = 1', 'sv-ts');
        return {
          out: [['Standard form', `${a} × 10${sup(v.n)}`], ['Ordinary number', full]],
          svg: S.wrap(320, 144, body, 'Standard form'),
          note: 'Standard form is a × 10ⁿ, where a is at least 1 but less than 10, and n is a whole number.'
        };
      },
      goal: { text: 'Write 45,000 in standard form.', check: (v) => Math.round(v.a * 10) === 45 && v.n === 4 } },
    { id: 'inequality', kind: 'lab', topic: 'inequalities', title: 'Inequalities on a number line', desc: 'Pick a sign and a number and see the shading.',
      inputs: [
        { id: 's', label: 'Sign', value: '<', options: [['<', 'x < k (less than)'], ['<=', 'x ≤ k (less than or equal to)'], ['>', 'x > k (greater than)'], ['>=', 'x ≥ k (greater than or equal to)']] },
        { id: 'k', label: 'Number k', min: -5, max: 5, value: 1 }
      ],
      calc: (v) => {
        const S = EF.svg, X = (n) => 170 + n * 25, sym = { '<': '<', '<=': '≤', '>': '>', '>=': '≥' }[v.s], closed = v.s.length === 2, right = v.s[0] === '>';
        let body = S.line(14, 60, 326, 60);
        for (let n = -6; n <= 6; n++) body += S.line(X(n), 54, X(n), 66) + S.text(X(n), 86, minus(n), 'sv-ts');
        const end = right ? 322 : 18;
        body += S.line(X(v.k), 60, end, 60, 'sv-lc') + `<polygon points="${end},60 ${end + (right ? -12 : 12)},52 ${end + (right ? -12 : 12)},68" class="sv-c"/>`;
        body += `<circle cx="${X(v.k)}" cy="60" r="8" class="${closed ? 'sv-c' : 'sv-open'}"/>` + S.text(170, 22, `x ${sym} ${minus(v.k)}`, 'sv-t');
        const wholes = []; for (let n = -6; n <= 6; n++) if (right ? (closed ? n >= v.k : n > v.k) : (closed ? n <= v.k : n < v.k)) wholes.push(minus(n));
        const show = right ? wholes.slice(0, 4).join(', ') + ', …' : '…, ' + wholes.slice(-4).join(', ');
        return {
          out: [['Inequality', `x ${sym} ${minus(v.k)}`], ['Dot', closed ? 'Filled: k is included' : 'Open: k is not included'], ['Whole numbers that work', show]],
          svg: S.wrap(340, 100, body, 'Number line for x ' + sym + ' ' + v.k),
          note: 'Use a filled dot for ≤ or ≥ (the number is included) and an open dot for < or > (it isn’t).'
        };
      },
      goal: { text: 'Show x ≥ −2 on the number line.', check: (v) => v.s === '>=' && v.k === -2 } },
    { id: 'nth-term', kind: 'lab', topic: 'sequences', title: 'Sequence builder', desc: 'Choose the first term and the difference, and find the nth term.',
      inputs: [
        { id: 'a', label: 'First term', min: -10, max: 20, value: 2 },
        { id: 'd', label: 'Common difference', min: -5, max: 10, value: 4 }
      ],
      calc: (v) => {
        const S = EF.svg, terms = [1, 2, 3, 4, 5, 6].map((n) => v.a + (n - 1) * v.d), c = v.a - v.d;
        const coef = v.d === 0 ? '' : v.d === 1 ? 'n' : v.d === -1 ? '−n' : minus(v.d) + 'n';
        const rule = v.d === 0 ? minus(v.a) : coef + (c > 0 ? ' + ' + c : c < 0 ? ' − ' + -c : '');
        const lo = Math.min(0, ...terms), hi = Math.max(0, ...terms), span = hi - lo || 1, Y = (t) => 186 - ((t - lo) / span) * 150;
        let body = dashed(20, Y(0).toFixed(1), 310, Y(0).toFixed(1)) + S.text(16, Y(0) + 4, '0', 'sv-ts', 'end');
        body += `<polyline points="${terms.map((t, i) => `${40 + i * 52},${Y(t).toFixed(1)}`).join(' ')}" class="sv-lc"/>`;
        terms.forEach((t, i) => { body += S.circle(40 + i * 52, Y(t), 7, 'sv-c') + S.text(40 + i * 52, Y(t) - 12, minus(t), 'sv-t') + S.text(40 + i * 52, 212, 'n=' + (i + 1), 'sv-ts'); });
        return {
          out: [['Sequence', terms.slice(0, 5).map(minus).join(', ') + ', …'], ['nth term', rule], ['10th term', minus(v.a + 9 * v.d)]],
          svg: S.wrap(330, 222, body, 'Graph of the sequence'),
          note: `The terms ${v.d < 0 ? 'go down by ' + -v.d : 'go up by ' + v.d} each time, so the rule starts with ${v.d === 0 ? 'no n term' : coef}. Check n = 1: it gives ${minus(v.a)}.`
        };
      },
      goal: { text: 'Make the sequence 5, 8, 11, 14, … and read its nth term.', check: (v) => v.a === 5 && v.d === 3 } }
  ];
})();
