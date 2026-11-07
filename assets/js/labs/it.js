/* Zing interactive tools — Information Technology (see assets/js/core/interactive.js for the tool kinds) */
window.EF = window.EF || {};
(function () {
  'use strict';
  const OPS = { '>': (a, b) => a > b, '>=': (a, b) => a >= b, '<': (a, b) => a < b, '<=': (a, b) => a <= b, '=': (a, b) => a === b, '<>': (a, b) => a !== b };
  const COLS = 'ABCDEFGH';
  // a small spreadsheet grid: cells is a map like { 'E2': ['45', 'sv-cs'] }
  function grid(cols, rows, cells, formula) {
    const S = EF.svg, w = 44, h = 26, x0 = 34, y0 = 44;
    let s = S.bar(4, 4, Math.max(312, x0 + cols.length * w - 4), 28, 'sv-mut') + S.text(14, 23, 'fx', 'sv-ts', 'start') + S.text(40, 23, formula, 'sv-t', 'start');
    cols.forEach((c, i) => { s += S.text(x0 + i * w + w / 2, y0 - 4, c, 'sv-ts'); });
    for (let r = 0; r < rows; r++) {
      s += S.text(x0 - 8, y0 + r * h + 18, r + 1, 'sv-ts', 'end');
      cols.forEach((c, i) => {
        const cell = cells[c + (r + 1)];
        s += `<rect x="${x0 + i * w}" y="${y0 + r * h}" width="${w}" height="${h}" class="${cell && cell[1] ? cell[1] : 'sv-mut'}"/>`;
        if (cell && cell[0] !== '') s += S.text(x0 + i * w + w / 2, y0 + r * h + 18, cell[0], 'sv-t');
      });
    }
    return s;
  }

  (EF.labs = EF.labs || {}).it = [
    { id: 'sheet', kind: 'widget', name: 'sheet', topic: 'sum-average-and-count', title: 'Spreadsheet sandbox', desc: 'Type numbers and try SUM, AVERAGE, MIN, MAX and COUNT.' },
    { id: 'binary', kind: 'lab', topic: 'memory-and-storage', title: 'Binary switches', desc: 'Flip 8 bits (one byte) and watch the number change.',
      inputs: [{ id: 'b', label: 'Tap a bit to switch it on or off', bits: 8, value: 5 }],
      calc: (v) => {
        const bits = v.b.toString(2).padStart(8, '0'), on = [];
        for (let p = 7; p >= 0; p--) if ((v.b >> p) & 1) on.push(2 ** p);
        return {
          out: [['Decimal', v.b], ['Binary', bits], ['Add the place values', on.length ? on.join(' + ') + ' = ' + v.b : 'All off = 0']],
          note: '8 bits make 1 byte. Each bit is worth double the bit to its right, so one byte holds 0 to 255.'
        };
      },
      goal: { text: 'Make the number 42 in binary.', check: (v) => v.b === 42 } },
    { id: 'if-tester', kind: 'lab', topic: 'if-function', title: 'IF function tester', desc: 'Change the class size and the test, and watch the IF answer.',
      inputs: [
        { id: 'x', label: 'Class size in E2', min: 0, max: 60, value: 45 },
        { id: 'op', label: 'Comparison', value: '>', options: [['>', '> greater than'], ['>=', '>= greater than or equal to'], ['<', '< less than'], ['<=', '<= less than or equal to'], ['=', '= equal to'], ['<>', '<> not equal to']] },
        { id: 'k', label: 'Compare with', min: 0, max: 60, value: 30 }
      ],
      calc: (v) => {
        const yes = OPS[v.op](v.x, v.k), f = `=IF(E2${v.op}${v.k},"Yes","No")`, res = yes ? 'Yes' : 'No';
        const body = grid(['D', 'E', 'F'], 3, { E1: ['Size', ''], F1: ['Big?', ''], E2: [String(v.x), 'sv-cs'], F2: [res, yes ? 'sv-ok' : 'sv-cs'] }, f);
        return {
          out: [['Formula in F2', f], ['Test', `${v.x} ${v.op} ${v.k} is ${yes ? 'TRUE' : 'FALSE'}`], ['F2 shows', res]],
          svg: EF.svg.wrap(320, 130, body, 'Spreadsheet with ' + f),
          note: 'IF(test, value if TRUE, value if FALSE). “Over 30” means >30; “30 or more” means >=30. Always test the boundary value itself.'
        };
      },
      goal: { text: 'Test the boundary: with =IF(E2>30,"Yes","No"), put exactly 30 in E2.', check: (v) => v.op === '>' && v.k === 30 && v.x === 30 } },
    { id: 'references', kind: 'lab', topic: 'cell-references', title: 'Copy a formula', desc: 'See how relative, absolute and mixed references change when you copy.',
      inputs: [
        { id: 'ref', label: 'Reference in the formula', value: 'B2', options: [['B2', 'B2 (relative)'], ['$B$2', '$B$2 (absolute)'], ['$B2', '$B2 (column fixed)'], ['B$2', 'B$2 (row fixed)']] },
        { id: 'dn', label: 'Copy down (rows)', min: 0, max: 4, value: 2 },
        { id: 'rt', label: 'Copy across (columns)', min: 0, max: 3, value: 1 }
      ],
      calc: (v) => {
        const fixCol = v.ref[0] === '$', fixRow = v.ref.lastIndexOf('$') > 0;
        const col = fixCol ? 1 : 1 + v.rt, row = fixRow ? 2 : 2 + v.dn, newRef = (fixCol ? '$' : '') + COLS[col] + (fixRow ? '$' : '') + row;
        const dest = COLS[3 + v.rt] + (2 + v.dn), cells = {};
        cells['B2'] = ['10', 'sv-cs'];
        cells[COLS[col] + row] = [cells[COLS[col] + row] ? '10' : '', 'sv-cs'];
        cells['D2'] = ['=', 'sv-mut'];
        cells[dest] = ['✓', 'sv-ok'];
        if (dest === 'D2') cells['D2'] = ['✓', 'sv-ok'];
        const body = grid(['A', 'B', 'C', 'D', 'E', 'F', 'G'], 6, cells, `D2: =${v.ref}*2   →   ${dest}: =${newRef}*2`);
        return {
          out: [['Copied to', dest], ['New formula', `=${newRef}*2`]],
          svg: EF.svg.wrap(352, 210, body, 'Copying a formula'),
          note: (fixCol && fixRow ? 'Both parts are locked with $, so it always points to B2.' : fixCol ? 'The $ before B locks the column; the row number changes.' : fixRow ? 'The $ before 2 locks the row; the column letter changes.' : 'Relative: the reference moves the same number of rows and columns as the formula.') + ' The blue cell is the one the copied formula uses.'
        };
      },
      goal: { text: 'Copy the formula down and across so it still points to B2.', check: (v) => v.ref === '$B$2' && v.dn > 0 && v.rt > 0 } },
    { id: 'io-storage', kind: 'sort', topic: 'input-and-output', title: 'Input, output or storage?', desc: 'Sort the devices by the job they do.',
      buckets: ['Input', 'Output', 'Storage'],
      items: [
        ['Keyboard', 0], ['Mouse', 0], ['Scanner', 0], ['Microphone', 0], ['Webcam', 0],
        ['Monitor', 1], ['Projector', 1], ['Printer', 1, 'It makes hard copy'], ['Speakers', 1], ['Headphones', 1],
        ['Hard disk drive (HDD)', 2], ['Solid-state drive (SSD)', 2], ['USB flash drive', 2], ['DVD', 2, 'Optical media is read with a laser']
      ] },
    { id: 'cell-entries', kind: 'sort', topic: 'cells-and-ranges', title: 'Label, value or formula?', desc: 'What kind of entry is typed in each cell?',
      buckets: ['Label (text)', 'Value (number or date)', 'Formula'],
      items: [
        ['Total', 0], ['Student name', 0], ['Monthly Budget', 0],
        ['250', 1], ['15%', 1], ['$1,200.00', 1], ['12/05/2024', 1, 'A valid date is a value'],
        ['=SUM(B2:B9)', 2], ['=B2*C2', 2], ['=AVERAGE(C2:C11)', 2]
      ] },
    { id: 'errors', kind: 'sort', topic: 'errors', title: 'Name that error', desc: 'Match each cause to the error a spreadsheet shows.',
      buckets: ['#DIV/0!', '#NAME?', '#REF!', '#VALUE!', '#N/A', '#####'],
      items: [
        ['Dividing by zero', 0], ['Dividing by an empty cell', 0],
        ['A misspelled function, like =SUMM(A1:A3)', 1], ['Text typed without quotation marks', 1],
        ['The formula refers to deleted cells', 2], ['A referenced column was deleted', 2],
        ['Multiplying text by a number', 3], ['The wrong data type in a calculation', 3],
        ['A lookup can’t find its value', 4], ['VLOOKUP exact match finds nothing', 4],
        ['The column is too narrow to show the number', 5], ['Fixed by widening the column', 5]
      ] },
    { id: 'problem-solving', kind: 'order', topic: 'problem-solving', title: 'Problem-solving steps', desc: 'Put the five problem-solving steps in order.',
      steps: [
        ['Define the problem', 'Find the inputs, outputs, processing and limits'],
        ['Propose and evaluate solutions', 'Compare possible ways to solve it'],
        ['Determine the most efficient solution', 'Pick the best one'],
        ['Develop and represent the algorithm', 'Pseudocode or a flowchart'],
        ['Test and validate the solution', 'Use values with known answers, including boundaries']
      ] },
    { id: 'data-types', kind: 'sort', topic: 'problem-solving', title: 'Data types', desc: 'Integer, real, Boolean, character or string?',
      buckets: ['Integer', 'Real', 'Boolean', 'Character', 'String'],
      items: [
        ['42', 0], ['−7', 0],
        ['3.14', 1], ['98.6', 1],
        ['TRUE', 2], ['FALSE', 2],
        ['A', 3, 'One character'], ['?', 3],
        ['Kingston', 4], ['Hello world', 4], ['876-555-0123', 4, 'A phone number is text: you never do maths with it']
      ] },
    { id: 'machine-cycle', kind: 'order', topic: 'hardware-and-cpu', title: 'The machine cycle', desc: 'Put the CPU’s machine cycle in order.',
      prompt: 'Tap the stages in order, starting with getting the instruction.',
      steps: [
        ['Fetch', 'Get the next instruction from memory'],
        ['Decode', 'Work out what the instruction means'],
        ['Execute', 'Carry out the instruction'],
        ['Store', 'Save the result where it is needed']
      ] },
    { id: 'flowchart-symbols', kind: 'sort', topic: 'algorithms-and-flowcharts', title: 'Flowchart symbols', desc: 'Which symbol does each step go in?',
      buckets: ['Oval: start/stop', 'Parallelogram: input/output', 'Rectangle: process', 'Diamond: decision'],
      items: [
        ['START', 0], ['STOP', 0],
        ['READ num1, num2', 1], ['PRINT sum', 1], ['Input the student’s name', 1],
        ['sum ← num1 + num2', 2], ['avg ← sum ÷ 2', 2], ['total ← quantity × price', 2],
        ['Is E2 > 30?', 3, 'A decision has Yes/No branches'], ['Is age ≥ 18?', 3]
      ] },
    { id: 'duplex', kind: 'sort', topic: 'transmission-media', title: 'Simplex or duplex?', desc: 'Sort the transmission modes and their examples.',
      buckets: ['Simplex', 'Half-duplex', 'Full-duplex'],
      items: [
        ['One direction only', 0], ['Broadcast radio', 0],
        ['Both directions, one at a time', 1], ['Walkie-talkies', 1],
        ['Both directions at the same time', 2], ['A two-way telephone call', 2]
      ] }
  ];
})();
