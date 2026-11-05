/* ExamForge content — Grade 10 Mathematics.
   Scope = topics of the KC G10 CT1 Math Revision Worksheet listed in the study inventory: number operations and HCF,
   signed numbers and squaring negatives, terms/coefficients/like terms, simplifying, expanding one and two brackets,
   algebraic HCF, common-factor factorisation, grouping, quadratic trinomials (incl. leading coefficient > 1),
   area/substitution and index laws. All examples are new practice questions, not copied from the worksheet. */
window.EF = window.EF || {};
EF.subjects = EF.subjects || [];

EF.subjects.push({
  id: 'math',
  name: 'Mathematics',
  short: 'Maths',
  grade: 10,
  icon: 'fa-square-root-variable',
  color: '#3b82f6',
  tagline: 'Signed numbers, expanding, factorising, indices and substitution',
  intro: 'The algebra on your Grade 10 Common Test worksheet, one skill at a time. Every worked example reveals the working step by step, so try it first, then check each line.',

  topics: [
    {
      id: 'numbers', title: 'Signed numbers, order of operations and HCF', nav: 'Numbers & HCF', icon: 'fa-plus-minus',
      blocks: [
        {
          type: 'grid', cols: 2, items: [
            { icon: 'fa-list-ol', title: 'Order of operations: BODMAS', html: '<strong>B</strong>rackets → <strong>O</strong>rders (powers, roots) → <strong>D</strong>ivision & <strong>M</strong>ultiplication (left to right) → <strong>A</strong>ddition & <strong>S</strong>ubtraction (left to right).' },
            { icon: 'fa-plus-minus', title: 'Multiplying & dividing signs', html: 'Same signs → <strong>positive</strong>: (−4) × (−3) = 12.<br>Different signs → <strong>negative</strong>: (−12) ÷ 4 = −3.' },
            { icon: 'fa-arrows-left-right', title: 'Adding & subtracting signs', html: 'Subtracting a negative = adding: 5 − (−3) = 5 + 3 = <strong>8</strong>.<br>−7 + 4 = <strong>−3</strong> (think of a number line).' },
            { icon: 'fa-superscript', title: 'Squaring negatives', html: '(−3)² = (−3) × (−3) = <strong>9</strong>.<br>But −3² = −(3 × 3) = <strong>−9</strong>. The bracket matters!' }
          ]
        },
        {
          type: 'worked', q: 'Work out 18 − 4 × (6 − 9)² ÷ 3.',
          steps: ['Brackets first: 6 − 9 = <strong>−3</strong>', 'Orders: (−3)² = <strong>9</strong>', 'Multiply / divide left to right: 4 × 9 = 36, then 36 ÷ 3 = <strong>12</strong>', 'Subtract: 18 − 12 = <strong>6</strong>'],
          answer: '6'
        },
        { type: 'heading', text: 'Highest Common Factor (HCF)' },
        { type: 'text', html: 'The <strong>HCF</strong> is the biggest number that divides exactly into all the numbers. Write each number as a product of primes, then multiply the primes they <strong>share</strong>.' },
        {
          type: 'worked', q: 'Find the HCF of 36 and 60.',
          steps: ['36 = 2 × 2 × 3 × 3 = 2² × 3²', '60 = 2 × 2 × 3 × 5 = 2² × 3 × 5', 'Shared primes (lowest powers): 2² × 3', '= 4 × 3 = <strong>12</strong>'],
          answer: 'HCF = 12'
        }
      ]
    },
    {
      id: 'algebra-language', title: 'Terms, coefficients and simplifying', nav: 'Simplifying', icon: 'fa-font',
      blocks: [
        {
          type: 'terms', items: [
            ['Variable', 'a letter that stands for a number, e.g. <em>x</em>'],
            ['Term', 'one part of an expression, separated by + or −, e.g. 5<em>x</em>, −3<em>y</em>², 7'],
            ['Coefficient', 'the number in front of a variable: in −3<em>y</em>² it is <strong>−3</strong>'],
            ['Constant', 'a term with no variable, e.g. +7'],
            ['Like terms', 'same letters with the same powers: 4<em>ab</em> and −<em>ab</em> are like; <em>x</em>² and <em>x</em> are <strong>not</strong>'],
            ['Expression', 'terms with no equals sign: 3<em>x</em> + 2'],
            ['Equation', 'two expressions that are equal: 3<em>x</em> + 2 = 14 (it can be solved)']
          ]
        },
        {
          type: 'worked', q: 'Simplify 5x² + 3x − 2x² − 7x + 4.',
          steps: ['Group like terms: (5x² − 2x²) + (3x − 7x) + 4', '= <strong>3x² − 4x + 4</strong>'],
          answer: '3x² − 4x + 4'
        },
        { type: 'heading', text: 'Subtracting one expression from another' },
        { type: 'callout', tone: 'warn', icon: 'fa-triangle-exclamation', title: 'The minus sign belongs to the whole bracket', html: '“Subtract (2x − 4) from (5x + 3)” means <strong>(5x + 3) − (2x − 4)</strong>. The minus changes the sign of <strong>every</strong> term in the second bracket.' },
        {
          type: 'worked', q: 'Subtract (2x − 4) from (5x + 3).',
          steps: ['Write it in the right order: (5x + 3) − (2x − 4)', 'Remove the bracket, changing both signs: 5x + 3 − 2x <strong>+ 4</strong>', 'Collect like terms: <strong>3x + 7</strong>'],
          answer: '3x + 7'
        },
        {
          type: 'worked', q: 'Simplify 4a − 3(2a − 5b) + b.',
          steps: ['Expand: −3 × 2a = −6a and −3 × −5b = <strong>+15b</strong>', '4a − 6a + 15b + b', '= <strong>−2a + 16b</strong>'],
          answer: '−2a + 16b'
        }
      ]
    },
    {
      id: 'expanding', title: 'Expanding brackets', nav: 'Expanding', icon: 'fa-expand',
      blocks: [
        { type: 'lead', html: 'To <strong>expand</strong> means to multiply out the brackets. It is the opposite of factorising.' },
        {
          type: 'formulas', items: [
            { name: 'Single bracket', f: 'a(b + c) = ab + ac', html: 'Multiply the outside term by <strong>every</strong> term inside.' },
            { name: 'Two brackets (FOIL)', f: '(a + b)(c + d) = ac + ad + bc + bd', html: '<strong>F</strong>irst, <strong>O</strong>uter, <strong>I</strong>nner, <strong>L</strong>ast.' },
            { name: 'Perfect square', f: '(x + a)² = x² + 2ax + a²', html: 'Not x² + a²! Write it as (x + a)(x + a).' },
            { name: 'Difference of two squares', f: '(x + a)(x − a) = x² − a²', html: 'The middle terms cancel.' }
          ]
        },
        {
          type: 'worked', q: 'Expand −2x(3x − 5).',
          steps: ['−2x × 3x = <strong>−6x²</strong>', '−2x × −5 = <strong>+10x</strong>', 'Answer: <strong>−6x² + 10x</strong>'],
          answer: '−6x² + 10x'
        },
        { type: 'widget', name: 'expand' },
        {
          type: 'worked', q: 'Expand and simplify (2x + 3)(x − 4).',
          steps: ['First: 2x × x = 2x²', 'Outer: 2x × −4 = −8x', 'Inner: 3 × x = 3x', 'Last: 3 × −4 = −12', 'Collect: 2x² − 8x + 3x − 12 = <strong>2x² − 5x − 12</strong>'],
          answer: '2x² − 5x − 12'
        },
        {
          type: 'worked', q: 'Expand (x − 5)².',
          steps: ['Write it out: (x − 5)(x − 5)', 'x² − 5x − 5x + 25', '= <strong>x² − 10x + 25</strong>'],
          answer: 'x² − 10x + 25'
        }
      ]
    },
    {
      id: 'factorising', title: 'Factorising', nav: 'Factorising', icon: 'fa-compress',
      blocks: [
        { type: 'lead', html: 'To <strong>factorise</strong> means to put an expression back into brackets. Always look for a <strong>common factor first</strong>.' },
        { type: 'heading', text: '1 · HCF of algebraic terms' },
        {
          type: 'worked', q: 'Find the HCF of 12x²y and 18xy².',
          steps: ['Numbers: HCF of 12 and 18 = <strong>6</strong>', 'x: lowest power shared is <strong>x</strong>', 'y: lowest power shared is <strong>y</strong>', 'HCF = <strong>6xy</strong>'],
          answer: '6xy'
        },
        { type: 'heading', text: '2 · Common factor' },
        {
          type: 'worked', q: 'Factorise 8x² − 12x.',
          steps: ['HCF of 8x² and 12x is <strong>4x</strong>', '8x² ÷ 4x = 2x and 12x ÷ 4x = 3', 'Answer: <strong>4x(2x − 3)</strong>', 'Check by expanding: 4x × 2x − 4x × 3 = 8x² − 12x ✓'],
          answer: '4x(2x − 3)'
        },
        { type: 'heading', text: '3 · Grouping (four terms)' },
        {
          type: 'worked', q: 'Factorise xy + 3x + 2y + 6.',
          steps: ['Group in pairs: (xy + 3x) + (2y + 6)', 'Factor each pair: x(y + 3) + 2(y + 3)', 'The bracket (y + 3) is common: <strong>(y + 3)(x + 2)</strong>'],
          answer: '(y + 3)(x + 2)'
        },
        { type: 'heading', text: '4 · Quadratic trinomials x² + bx + c' },
        { type: 'callout', tone: 'tip', icon: 'fa-lightbulb', title: 'The rule', html: 'Find two numbers that <strong>multiply to c</strong> and <strong>add to b</strong>. Then x² + bx + c = (x + p)(x + q).' },
        {
          type: 'worked', q: 'Factorise x² + 7x + 12.',
          steps: ['Need two numbers that multiply to <strong>12</strong> and add to <strong>7</strong>', 'Try pairs: 1 & 12, 2 & 6, <strong>3 & 4</strong> → 3 + 4 = 7 ✓', 'Answer: <strong>(x + 3)(x + 4)</strong>'],
          answer: '(x + 3)(x + 4)'
        },
        {
          type: 'worked', q: 'Factorise x² − x − 12.',
          steps: ['Multiply to <strong>−12</strong>, add to <strong>−1</strong>', 'One must be negative: −4 and +3 → −4 × 3 = −12 and −4 + 3 = −1 ✓', 'Answer: <strong>(x − 4)(x + 3)</strong>'],
          answer: '(x − 4)(x + 3)'
        },
        { type: 'heading', text: '5 · When the x² coefficient is more than 1: split the middle term' },
        {
          type: 'worked', q: 'Factorise 2x² + 7x + 3.',
          steps: ['Multiply a × c = 2 × 3 = <strong>6</strong>', 'Find two numbers that multiply to 6 and add to 7: <strong>6 and 1</strong>', 'Split the middle term: 2x² + 6x + x + 3', 'Group: 2x(x + 3) + 1(x + 3)', 'Answer: <strong>(2x + 1)(x + 3)</strong>'],
          answer: '(2x + 1)(x + 3)'
        },
        {
          type: 'worked', q: 'Factorise 3x² − 10x + 8.',
          steps: ['a × c = 3 × 8 = <strong>24</strong>; need two numbers that multiply to 24 and add to −10', '−6 and −4 ✓', 'Split: 3x² − 6x − 4x + 8', 'Group: 3x(x − 2) − 4(x − 2)', 'Answer: <strong>(3x − 4)(x − 2)</strong>'],
          answer: '(3x − 4)(x − 2)'
        },
        { type: 'callout', tone: 'info', title: 'Always check', html: 'Expand your answer. If you get back the question, it is right.' }
      ]
    },
    {
      id: 'indices', title: 'Index laws', nav: 'Indices', icon: 'fa-superscript',
      blocks: [
        {
          type: 'formulas', items: [
            { name: 'Multiply: add the powers', f: 'aᵐ × aⁿ = aᵐ⁺ⁿ', html: 'x³ × x⁴ = x⁷' },
            { name: 'Divide: subtract the powers', f: 'aᵐ ÷ aⁿ = aᵐ⁻ⁿ', html: 'y⁹ ÷ y⁵ = y⁴' },
            { name: 'Power of a power: multiply', f: '(aᵐ)ⁿ = aᵐⁿ', html: '(x²)⁵ = x¹⁰' },
            { name: 'Power zero', f: 'a⁰ = 1', html: '7⁰ = 1, x⁰ = 1' },
            { name: 'Negative power', f: 'a⁻ⁿ = 1 ÷ aⁿ', html: '2⁻³ = 1/8' },
            { name: 'Bracket with a number', f: '(ab)ⁿ = aⁿbⁿ', html: '(3x²)² = 9x⁴ (square the 3 too!)' }
          ]
        },
        {
          type: 'worked', q: 'Simplify 6x⁵y² × 2x³y.',
          steps: ['Numbers: 6 × 2 = <strong>12</strong>', 'x: x⁵ × x³ = <strong>x⁸</strong>', 'y: y² × y¹ = <strong>y³</strong>', 'Answer: <strong>12x⁸y³</strong>'],
          answer: '12x⁸y³'
        },
        {
          type: 'worked', q: 'Simplify (2a³)⁴ ÷ 8a⁵.',
          steps: ['(2a³)⁴ = 2⁴ × a¹² = <strong>16a¹²</strong>', 'Divide numbers: 16 ÷ 8 = 2', 'Divide powers: a¹² ÷ a⁵ = a⁷', 'Answer: <strong>2a⁷</strong>'],
          answer: '2a⁷'
        }
      ]
    },
    {
      id: 'substitution', title: 'Substitution and area problems', nav: 'Substitution & Area', icon: 'fa-vector-square',
      blocks: [
        { type: 'callout', tone: 'tip', icon: 'fa-lightbulb', title: 'Put negatives in brackets', html: 'When x = −2, write 3x² as 3(−2)² = 3 × 4 = 12. Without brackets it is easy to get −12.' },
        {
          type: 'worked', q: 'If x = −2 and y = 3, find the value of 3x² − 2xy + y.',
          steps: ['3x² = 3(−2)² = 3 × 4 = <strong>12</strong>', '−2xy = −2(−2)(3) = <strong>+12</strong>', 'y = <strong>3</strong>', 'Total: 12 + 12 + 3 = <strong>27</strong>'],
          answer: '27'
        },
        {
          type: 'worked', q: 'A rectangle is (x + 5) cm long and (x − 2) cm wide. Write an expression for its area, then find the area when x = 6.',
          steps: ['Area = length × width = (x + 5)(x − 2)', 'Expand: x² − 2x + 5x − 10 = <strong>x² + 3x − 10</strong>', 'When x = 6: 36 + 18 − 10 = <strong>44 cm²</strong>', 'Check: (6 + 5)(6 − 2) = 11 × 4 = 44 ✓'],
          answer: 'Area = x² + 3x − 10; 44 cm² when x = 6'
        },
        {
          type: 'worked', q: 'A rectangle has area x² + 8x + 15. Find expressions for its length and width.',
          steps: ['Factorise: two numbers that multiply to 15 and add to 8 → <strong>3 and 5</strong>', 'x² + 8x + 15 = (x + 3)(x + 5)', 'So the sides are <strong>(x + 5)</strong> and <strong>(x + 3)</strong>'],
          answer: 'Length (x + 5), width (x + 3)'
        },
        {
          type: 'worked', q: 'The perimeter of a rectangle with sides (2x + 1) and (x + 4) is 40 cm. Find x.',
          steps: ['Perimeter = 2(length + width) = 2(2x + 1 + x + 4)', '= 2(3x + 5) = <strong>6x + 10</strong>', '6x + 10 = 40 → 6x = 30 → <strong>x = 5</strong>', 'Sides: 11 cm and 9 cm. Check: 2(11 + 9) = 40 ✓'],
          answer: 'x = 5'
        }
      ]
    }
  ],

  quiz: [
    { q: 'What is (−4)²?', options: ['16', '−16', '−8', '8'], answer: 0, why: '(−4) × (−4) = 16: two negatives make a positive.' },
    { q: 'What is −4²?', options: ['−16', '16', '8', '−8'], answer: 0, why: 'Only the 4 is squared: −(4 × 4) = −16.' },
    { q: '7 − (−5) = ?', options: ['12', '2', '−12', '−2'], answer: 0, why: 'Subtracting a negative is adding: 7 + 5.' },
    { q: '10 + 6 ÷ 2 × 3 = ?', options: ['19', '8', '13', '24'], answer: 0, why: '6 ÷ 2 = 3, × 3 = 9, then 10 + 9 = 19.' },
    { q: 'HCF of 24 and 40 is…', options: ['8', '4', '120', '2'], answer: 0, why: '24 = 2³ × 3 and 40 = 2³ × 5, so HCF = 2³ = 8.' },
    { q: 'In −7x²y, the coefficient is…', options: ['−7', '7', 'x²y', '2'], answer: 0, why: 'The coefficient is the number (with its sign) in front.' },
    { q: 'Which pair are like terms?', options: ['3ab and −5ba', '2x and 2x²', '4y and 4', 'x²y and xy²'], answer: 0, why: 'ab and ba are the same letters with the same powers.' },
    { q: 'Simplify (6x + 2) − (4x − 3).', options: ['2x + 5', '2x − 1', '10x − 1', '2x + 1'], answer: 0, why: '6x + 2 − 4x + 3 = 2x + 5.' },
    { q: 'Expand 3(2x − 7).', options: ['6x − 21', '6x − 7', '5x − 21', '6x + 21'], answer: 0, why: 'Multiply 3 by both terms.' },
    { q: 'Expand (x + 2)(x + 6).', options: ['x² + 8x + 12', 'x² + 12x + 8', 'x² + 8', 'x² + 12'], answer: 0, why: 'x² + 6x + 2x + 12.' },
    { q: 'Expand (x − 3)².', options: ['x² − 6x + 9', 'x² + 9', 'x² − 9', 'x² − 6x − 9'], answer: 0, why: '(x − 3)(x − 3) = x² − 3x − 3x + 9.' },
    { q: 'Factorise 10x² + 15x.', options: ['5x(2x + 3)', '5(2x² + 3x)', 'x(10x + 15)', '5x(2x + 15)'], answer: 0, why: 'The HCF is 5x; fully factorised means taking out the highest factor.' },
    { q: 'Factorise ab + 4a + 3b + 12.', options: ['(b + 4)(a + 3)', '(a + 4)(b + 3)', '(ab + 4)(3 + 12)', 'a(b + 4) + 3b'], answer: 0, why: 'a(b + 4) + 3(b + 4) = (b + 4)(a + 3).' },
    { q: 'Factorise x² + 9x + 20.', options: ['(x + 4)(x + 5)', '(x + 2)(x + 10)', '(x + 9)(x + 20)', '(x − 4)(x − 5)'], answer: 0, why: '4 × 5 = 20 and 4 + 5 = 9.' },
    { q: 'Factorise x² − 2x − 15.', options: ['(x − 5)(x + 3)', '(x + 5)(x − 3)', '(x − 5)(x − 3)', '(x − 15)(x + 1)'], answer: 0, why: '−5 × 3 = −15 and −5 + 3 = −2.' },
    { q: 'Factorise 2x² + 5x + 2.', options: ['(2x + 1)(x + 2)', '(2x + 2)(x + 1)', '(x + 2)(x + 1)', '(2x − 1)(x − 2)'], answer: 0, why: 'ac = 4 → 4 and 1: 2x² + 4x + x + 2 = 2x(x + 2) + 1(x + 2).' },
    { q: 'Simplify x⁴ × x³.', options: ['x⁷', 'x¹²', 'x', '2x⁷'], answer: 0, why: 'Add the powers when multiplying.' },
    { q: 'Simplify (y³)⁴.', options: ['y¹²', 'y⁷', 'y⁸¹', '4y³'], answer: 0, why: 'Multiply the powers.' },
    { q: 'Simplify 15a⁶ ÷ 3a².', options: ['5a⁴', '5a³', '12a⁴', '5a⁸'], answer: 0, why: '15 ÷ 3 = 5 and a⁶ ÷ a² = a⁴.' },
    { q: 'What is 9⁰?', options: ['1', '0', '9', '90'], answer: 0, why: 'Any non-zero number to the power 0 is 1.' },
    { q: 'If x = −3, what is 2x²?', options: ['18', '−18', '36', '−36'], answer: 0, why: '2 × (−3)² = 2 × 9 = 18.' },
    { q: 'A square has side (x + 1). Its area is…', options: ['x² + 2x + 1', 'x² + 1', '4x + 4', 'x² + x + 1'], answer: 0, why: '(x + 1)² = x² + 2x + 1.' }
  ],

  flashcards: [
    ['BODMAS', 'Brackets, Orders, Division/Multiplication, Addition/Subtraction', 'Numbers'],
    ['(−a)² vs −a²', '(−3)² = 9 but −3² = −9', 'Numbers'],
    ['Signs rule for × and ÷', 'Same signs → positive; different signs → negative', 'Numbers'],
    ['HCF', 'Highest Common Factor: the biggest number that divides into all of them', 'Numbers'],
    ['Coefficient', 'The number in front of a variable (including its sign)', 'Algebra'],
    ['Like terms', 'Same letters with the same powers, e.g. 3x² and −x²', 'Algebra'],
    ['Expression vs equation', 'An expression has no = sign; an equation does and can be solved', 'Algebra'],
    ['Subtracting a bracket', 'Change the sign of EVERY term inside: −(2x − 4) = −2x + 4', 'Algebra'],
    ['Expand a(b + c)', 'ab + ac', 'Expanding'],
    ['FOIL', 'First, Outer, Inner, Last: how to expand two brackets', 'Expanding'],
    ['(x + a)²', 'x² + 2ax + a² (NOT x² + a²)', 'Expanding'],
    ['(x + a)(x − a)', 'x² − a² (difference of two squares)', 'Expanding'],
    ['First step in factorising', 'Take out the HCF (common factor)', 'Factorising'],
    ['Factorise by grouping', 'Pair the terms, factor each pair, take out the common bracket', 'Factorising'],
    ['Factorise x² + bx + c', 'Find two numbers that multiply to c and add to b', 'Factorising'],
    ['Factorise ax² + bx + c (a > 1)', 'Find two numbers that multiply to a × c and add to b, split the middle term, then group', 'Factorising'],
    ['How to check a factorisation', 'Expand it: you should get the original expression', 'Factorising'],
    ['aᵐ × aⁿ', 'aᵐ⁺ⁿ (add powers)', 'Indices'],
    ['aᵐ ÷ aⁿ', 'aᵐ⁻ⁿ (subtract powers)', 'Indices'],
    ['(aᵐ)ⁿ', 'aᵐⁿ (multiply powers)', 'Indices'],
    ['a⁰', '1', 'Indices'],
    ['a⁻ⁿ', '1 ÷ aⁿ', 'Indices'],
    ['Substituting a negative', 'Put it in brackets: 3(−2)² = 12', 'Substitution'],
    ['Area of a rectangle with sides (x + p) and (x + q)', 'Expand (x + p)(x + q)', 'Substitution']
  ]
});
