/* Per-subject settings for tools/handoff/convert.mjs.
   topics[] lines up with the handoff's topics in order: nav = short name for menus, icon = Font Awesome icon.
   units group topics on the subject page (topics are shown in unit order) and name the flashcard decks.
   fix = exact text swaps applied before parsing (privacy + tidying); drop = note bullets to leave out.
   carry = interactive blocks kept from the earlier hand-made pages. */

const PRACTICAL_STARCH = {
  type: 'gizmo', badge: 'Practical', icon: 'fa-flask', name: 'Testing a leaf for starch', topic: 'Evidence that photosynthesis has happened',
  goalLabel: 'Aim', goal: 'To show that a green leaf that has been in the light contains starch.',
  stepsLabel: 'Method',
  steps: [
    'Dip the leaf in <strong>boiling water</strong> for about a minute: kills the cells, stops reactions and softens the leaf.',
    'Turn the Bunsen <strong>off</strong>, then put the leaf in a tube of <strong>ethanol</strong> standing in the hot water: removes the <strong>chlorophyll</strong> (the leaf turns white).',
    'Dip the leaf in warm water again: softens it (ethanol makes it brittle).',
    'Spread it on a white tile and add <strong>iodine solution</strong>.'
  ],
  data: { title: 'Expected results', head: ['Result', 'Meaning'], rows: [['Blue-black', 'starch present → photosynthesis took place'], ['Stays orange-brown', 'no starch detected']] },
  extra: [
    { title: 'Controls and set-ups', list: ['<strong>Destarch</strong> the plant first by keeping it in the dark for about 48 hours.', 'Need for <strong>light</strong>: cover part of a leaf with foil; only the uncovered part turns blue-black.', 'Need for <strong>chlorophyll</strong>: use a variegated (green and white) leaf; only the green parts turn blue-black.', 'Need for <strong>CO₂</strong>: enclose a leaf with soda lime (absorbs CO₂); it stays orange-brown.'] },
    { title: 'Safety', list: ['Ethanol is <strong>flammable</strong>: never heat it over a flame; use a hot water bath.'] }
  ],
  conclusion: 'Green leaves kept in the light make glucose and store it as starch, so starch is evidence of photosynthesis.'
};
const PYRAMIDS = {
  type: 'tiers', items: [
    { tag: 'Pyramid of numbers', color: '#f59e0b', title: 'How many organisms at each level', html: 'Can be <strong>upside-down</strong>: one mango tree can feed hundreds of caterpillars.' },
    { tag: 'Pyramid of biomass', color: '#22c55e', title: 'Mass of living material at each level', html: 'Usually a proper pyramid shape.' },
    { tag: 'Pyramid of energy', color: '#3b82f6', title: 'Energy at each level', html: '<strong>Always</strong> a proper pyramid, because energy is lost at every level.' }
  ]
};

export const SUBJECTS = {
  english: {
    file: 'g10-english.js', id: 'english', name: 'English Language', short: 'English', grade: 10, icon: 'fa-feather', color: '#f472b6',
    tagline: 'Vocabulary, usage, sentences, punctuation, comprehension and four writing formats',
    intro: 'Context clues and shades of meaning, agreement and tense, clauses and sentence types, punctuation, comprehension skills, literary devices, and model narratives, descriptions, letters of request and incident reports.',
    source: 'Built from your Thea English kits, class handouts and homework. Anything marked “check” is not confirmed yet: ask your teacher.',
    units: [
      { name: 'Vocabulary & usage', icon: 'fa-spell-check', topics: [0, 1, 2, 3] },
      { name: 'Sentences & punctuation', icon: 'fa-paragraph', topics: [4, 5, 6, 7] },
      { name: 'Reading', icon: 'fa-book-open-reader', topics: [8, 9] },
      { name: 'Writing', icon: 'fa-pen-nib', topics: [10, 11, 12, 13, 14] }
    ],
    topics: [
      { nav: 'Vocabulary', icon: 'fa-spell-check' },
      { nav: 'Diction & Register', icon: 'fa-comment-dots' },
      { nav: 'Homophones & Spelling', icon: 'fa-ear-listen' },
      { nav: 'Usage & Errors', icon: 'fa-magnifying-glass' },
      { nav: 'Clauses', icon: 'fa-link' },
      { nav: 'Sentence Types', icon: 'fa-paragraph' },
      { nav: 'Punctuation', icon: 'fa-quote-left' },
      { nav: 'Transitions', icon: 'fa-arrow-right-arrow-left' },
      { nav: 'Comprehension', icon: 'fa-book-open-reader' },
      { nav: 'Literary Devices', icon: 'fa-wand-magic-sparkles' },
      { nav: 'Narrative Writing', icon: 'fa-book-open' },
      { nav: 'Descriptive Writing', icon: 'fa-eye' },
      { nav: 'Letter of Request', icon: 'fa-envelope' },
      { nav: 'Incident Report', icon: 'fa-file-lines', title: 'Formal incident report (Simple/Factual Report Format)' },
      { nav: 'Exam Method', icon: 'fa-list-check' }
    ],
    fix: [
      ['The original slide in chat “Answer” reads', 'The original class slide reads'],
      ['the Language chats and guides explicitly connect', 'the Language study guides explicitly connect'],
      ['  Kingston College\n', '  [School name]\n'],
      ['The original homework in “Write Incident Report” asks', 'The original homework asks']
    ],
    trickyDrop: [/^The Ultimate PDF/, /^No actual incorrect English response/, /^A generated guide or saved Thea card/],
    trickyEdit: [[/ The old generated guide's 5–7-line suggestion.*$/, '']]
  },

  geography: {
    file: 'g10-geography.js', id: 'geography', name: 'Geography', short: 'Geography', grade: 10, icon: 'fa-earth-americas', color: '#84cc16',
    tagline: 'Earth systems, rocks and tectonics, limestone, weather, climate and hurricanes',
    intro: 'Earth’s spheres and the water cycle, rocks and plate tectonics, volcanoes and earthquakes, Jamaica’s limestone landscapes, and weather and climate from instruments and isobars to climographs and hurricanes.',
    source: 'Built from your Geography notes, Thea kit and Test 1, the water-cycle project sheet and reference sites (USGS, NOAA). Anything marked “check” is not confirmed yet: ask your teacher.',
    units: [
      { name: 'Earth & environment', icon: 'fa-earth-americas', topics: [0, 1, 2] },
      { name: 'Rocks & tectonics', icon: 'fa-volcano', topics: [3, 4, 5, 6, 7, 8, 9] },
      { name: 'Limestone landscapes', icon: 'fa-mountain-sun', topics: [10, 11] },
      { name: 'Weather & climate', icon: 'fa-cloud-sun-rain', topics: [12, 13, 14, 15, 16, 17] },
      { name: 'Test review', icon: 'fa-clipboard-check', topics: [18] }
    ],
    topics: [
      { nav: 'Earth’s Spheres', icon: 'fa-earth-americas' },
      { nav: 'Water Cycle', icon: 'fa-droplet', title: 'The hydrologic cycle and the cycle project' },
      { nav: 'Environment', icon: 'fa-tree', title: 'Environment, deforestation and global warming' },
      { nav: 'Rocks', icon: 'fa-gem' },
      { nav: 'Earth’s Structure', icon: 'fa-circle-dot' },
      { nav: 'Plate Boundaries', icon: 'fa-map' },
      { nav: 'Folds & Faults', icon: 'fa-wave-square' },
      { nav: 'Earthquakes', icon: 'fa-house-crack' },
      { nav: 'Volcanoes', icon: 'fa-volcano' },
      { nav: 'Volcanic Landforms', icon: 'fa-mountain' },
      { nav: 'Limestone & Karst', icon: 'fa-mountain-sun' },
      { nav: 'Caves', icon: 'fa-icicles' },
      { nav: 'Weather & Climate', icon: 'fa-temperature-half' },
      { nav: 'Temperature Factors', icon: 'fa-sun' },
      { nav: 'Rainfall', icon: 'fa-cloud-rain', title: 'Rainfall mechanisms and Jamaican examples' },
      { nav: 'Pressure & Isobars', icon: 'fa-gauge' },
      { nav: 'Climographs', icon: 'fa-chart-column' },
      { nav: 'Hurricanes', icon: 'fa-hurricane' },
      { nav: 'Test 1 Review', icon: 'fa-clipboard-check', title: 'Test 1 review' }
    ],
    fix: [
      ['Original readable attachment 64206.jpg says:', 'The project sheet says:'],
      [', and the recovered chats do not prove the cause of a particular Portmore rainfall event.', '.'],
      ['The chat “Explain Portmore Rainfall” also mentions tropical waves and troughs. These systems can', 'Tropical waves and troughs can also'],
      ['Original Thea Test 1', 'Test 1'],
      ['original Thea Test 1', 'Test 1']
    ],
    drop: [/^Old chat claims/],
    trickyDrop: [/^Original Q10 was marked correct/],
    trickyEdit: [[/^Your verified personal mistake is Test 1 Q5:/, 'Test 1 Q5:'], [/, and the old Portmore chat does not verify exact temperature records\/times or the cause of a particular rainy day\./, '.']]
  },

  hsb: {
    file: 'g10-hsb.js', id: 'hsb', name: 'Human & Social Biology', short: 'HSB', grade: 10, icon: 'fa-microscope', color: '#22c55e',
    extra: { iconKey: 'biology' },
    tagline: 'Living things, cells, transport, photosynthesis, food chains and food tests',
    intro: 'MRS GREN and cell theory, plant, animal and bacterial cells, specialised cells, diffusion, osmosis and active transport, photosynthesis and the starch test, food chains and energy pyramids, and the four food tests.',
    source: 'Built from your HSB notebook, the standardised test topic list and reference sources. Anything marked “check” is not confirmed yet: ask your teacher.',
    units: [
      { name: 'Living things & cells', icon: 'fa-seedling', topics: [0, 1, 2, 3, 4, 5] },
      { name: 'Transport in cells', icon: 'fa-arrow-right-arrow-left', topics: [6, 7, 8] },
      { name: 'Plants & ecology', icon: 'fa-sun', topics: [9, 10, 11, 12] },
      { name: 'Food tests', icon: 'fa-vial', topics: [13] }
    ],
    topics: [
      { nav: 'MRS GREN', icon: 'fa-seedling' },
      { nav: 'Cell Theory', icon: 'fa-cubes' },
      { nav: 'Plant & Animal Cells', icon: 'fa-circle-nodes' },
      { nav: 'Prokaryotes & Microbes', icon: 'fa-bacterium' },
      { nav: 'Specialised Animal Cells', icon: 'fa-dna' },
      { nav: 'Specialised Plant Cells', icon: 'fa-leaf' },
      { nav: 'Diffusion', icon: 'fa-arrow-right-arrow-left' },
      { nav: 'Osmosis', icon: 'fa-droplet' },
      { nav: 'Active Transport', icon: 'fa-bolt' },
      { nav: 'Photosynthesis', icon: 'fa-sun' },
      { nav: 'Starch Test', icon: 'fa-flask', carry: [{ block: PRACTICAL_STARCH }] },
      { nav: 'Food Chains & Webs', icon: 'fa-fish' },
      { nav: 'Energy Pyramids', icon: 'fa-layer-group', carry: [{ block: PYRAMIDS, at: 1 }] },
      { nav: 'Food Tests', icon: 'fa-vial' }
    ],
    trickyDrop: [/^The four visibly crossed responses/, /^All hypothetical examples and predicted practical outcomes/],
    trickyEdit: [
      [/^Evidence-backed personal correction: the marked exercise confuses water movement with bursting\. Correct answer:/, 'Missed before: water movement vs bursting.'],
      [/^Evidence-backed personal correction:/, 'Missed before:'],
      [/ The submitted “turgid”.*$/, ' (I got this wrong)']
    ]
  },

  it: {
    file: 'g10-it.js', id: 'it', name: 'Information Technology', short: 'IT', grade: 10, icon: 'fa-table-cells', color: '#06b6d4',
    tagline: 'Spreadsheets in depth, plus computer systems, networks and problem solving',
    intro: 'The whole spreadsheet unit, from cells and formulas to VLOOKUP, IF, Advanced Filter, charts and error codes, with the class practicals. Then hardware, memory, software, networks, algorithms and computer safety for review. Try formulas in the live mini-spreadsheet.',
    source: 'Built from your IT notebook, the whiteboard test, the textbook practicals and Microsoft support pages. Anything marked “check” is not confirmed yet: ask your teacher.',
    extra: {
      data: { sheet: { head: ['Student', 'Maths', 'English', 'IT'], rows: [['Kemar', 78, 64, 85], ['Aaliyah', 92, 88, 79], ['Jordan', 45, 52, 61], ['Tia', 66, 71, 90], ['Andre', 38, 49, 55], ['Shanice', 84, 95, 72]] } }
    },
    units: [
      { name: 'Spreadsheets', icon: 'fa-table-cells', topics: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
      { name: 'Spreadsheet practicals', icon: 'fa-pen-to-square', topics: [10, 11] },
      { name: 'Computer systems', icon: 'fa-microchip', topics: [12, 13, 14, 15, 16] },
      { name: 'Networks', icon: 'fa-network-wired', topics: [17, 18] },
      { name: 'Problem solving', icon: 'fa-diagram-project', topics: [19, 20] },
      { name: 'Health & safety', icon: 'fa-shield-heart', topics: [21] }
    ],
    topics: [
      { nav: 'What Spreadsheets Do', icon: 'fa-table-cells' },
      { nav: 'Cells & Ranges', icon: 'fa-border-all' },
      { nav: 'Formulas & Operators', icon: 'fa-calculator' },
      { nav: 'SUM, AVERAGE & COUNT', icon: 'fa-code', carry: [{ block: { type: 'widget', name: 'sheet' } }] },
      { nav: 'Dates, RANK & VLOOKUP', icon: 'fa-calendar-days' },
      { nav: 'Cell References', icon: 'fa-dollar-sign' },
      { nav: 'IF Function', icon: 'fa-code-branch' },
      { nav: 'Sort & Filter', icon: 'fa-filter' },
      { nav: 'Charts', icon: 'fa-chart-pie', title: 'Charts and the whiteboard test' },
      { nav: 'Errors', icon: 'fa-triangle-exclamation' },
      { nav: 'Summer-Class Practical', icon: 'fa-pen-to-square', title: 'Summer-class formulas and structural edits (textbook p.167)' },
      { nav: 'DONATIONS Practical', icon: 'fa-hand-holding-heart', title: 'DONATIONS practical and formatting' },
      { nav: 'Hardware & CPU', icon: 'fa-microchip' },
      { nav: 'Memory & Storage', icon: 'fa-memory' },
      { nav: 'Input & Output', icon: 'fa-keyboard' },
      { nav: 'Software', icon: 'fa-window-maximize' },
      { nav: 'Interfaces & Files', icon: 'fa-folder-tree' },
      { nav: 'Networks', icon: 'fa-network-wired' },
      { nav: 'Transmission Media', icon: 'fa-wifi' },
      { nav: 'Problem Solving', icon: 'fa-lightbulb' },
      { nav: 'Algorithms & Flowcharts', icon: 'fa-diagram-project' },
      { nav: 'Health & Safety', icon: 'fa-shield-heart' }
    ],
    drop: [/^The old chat claims a DONATIONS\.xlsx/],
    trickyDrop: [/^The original notebook and whiteboard explicitly identify Grade 10/, /^No verified personal wrong-answer record/],
    trickyEdit: [[/ Earlier assistant substitutions with absolute F3 references should not be memorised\./, '']]
  },

  math: {
    file: 'g10-math.js', id: 'math', name: 'Mathematics', short: 'Maths', grade: 10, icon: 'fa-square-root-variable', color: '#3b82f6',
    tagline: 'Number, algebra, indices, percentages, sequences, geometry and data, plus review',
    intro: 'Everything on the Grade 10 core: number skills, expanding and factorising, indices, fractions, percentages, sequences, perimeter and angles, ratio and data. Then Grade 9 and older topics for review. Every worked example reveals its working one step at a time.',
    source: 'Built from your class revision worksheets, classwork, a marked practice paper and your topic list. Anything marked “check” is not confirmed yet: ask your teacher.',
    units: [
      { name: 'Number', icon: 'fa-plus-minus', topics: [0, 12, 13, 16] },
      { name: 'Algebra', icon: 'fa-square-root-variable', topics: [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 14] },
      { name: 'Shape & measures', icon: 'fa-draw-polygon', topics: [9, 15] },
      { name: 'Data & probability', icon: 'fa-chart-simple', topics: [17] },
      { name: 'Grade 9 review', icon: 'fa-clock-rotate-left', topics: [18, 19, 20, 21] },
      { name: 'Older review', icon: 'fa-box-archive', topics: [22, 23, 24, 25, 26, 27, 28, 29, 30] }
    ],
    topics: [
      { nav: 'Number Skills & HCF', icon: 'fa-plus-minus' },
      { nav: 'Algebra Words', icon: 'fa-font', title: 'Algebraic language, coefficients, factors and polynomials' },
      { nav: 'Like Terms', icon: 'fa-object-group' },
      { nav: 'Expanding Brackets', icon: 'fa-expand' },
      { nav: 'Two Brackets', icon: 'fa-table-cells-large', carry: [{ block: { type: 'widget', name: 'expand' } }] },
      { nav: 'Algebraic HCF', icon: 'fa-layer-group' },
      { nav: 'Common Factors', icon: 'fa-compress' },
      { nav: 'Grouping', icon: 'fa-object-ungroup' },
      { nav: 'Quadratics', icon: 'fa-superscript' },
      { nav: 'Area & Algebra', icon: 'fa-vector-square' },
      { nav: 'Indices', icon: 'fa-superscript' },
      { nav: 'Subtracting Expressions', icon: 'fa-minus' },
      { nav: 'Fractions & Decimals', icon: 'fa-divide', title: 'Fractions, mixed numbers and decimals' },
      { nav: 'Percentages', icon: 'fa-percent' },
      { nav: 'Sequences', icon: 'fa-list-ol' },
      { nav: 'Perimeter & Angles', icon: 'fa-draw-polygon' },
      { nav: 'Ratio & Proportion', icon: 'fa-scale-balanced', title: 'Ratio, direct proportion and scaling amounts' },
      { nav: 'Averages & Probability', icon: 'fa-chart-simple', title: 'Mean, median, data reading and probability' },
      { nav: 'Forming Expressions', icon: 'fa-pen' },
      { nav: 'Linear Equations', icon: 'fa-equals' },
      { nav: 'Algebraic Fractions', icon: 'fa-ruler' },
      { nav: 'Mixed Problems', icon: 'fa-puzzle-piece' },
      { nav: 'Compound Interest', icon: 'fa-sack-dollar' },
      { nav: 'Inequalities', icon: 'fa-less-than-equal' },
      { nav: 'Simultaneous Equations', icon: 'fa-arrows-to-dot' },
      { nav: 'Standard Form', icon: 'fa-hashtag' },
      { nav: 'Logarithms', icon: 'fa-chart-line' },
      { nav: 'Circles & Volume', icon: 'fa-circle-half-stroke' },
      { nav: 'Pythagoras', icon: 'fa-ruler-combined' },
      { nav: 'Trigonometry', icon: 'fa-mountain' },
      { nav: 'Speed, Distance, Time', icon: 'fa-gauge-high' }
    ],
    trickyTableHead: '| Original question | Wrong choice | Correct answer | Method / interpretation |',
    trickyDrop: [/^Original quiz numbers below refer/, /^Q21=B, Q23=C/, /^Source corrections are not extra personal mistakes/],
    trickyEdit: [
      [/^Your original marked answer sheet .*$/, 'Missed before on a 50-question practice paper: these are the traps to fix first.'],
      [/^Your evidence-backed priorities are/, 'Top priorities:'],
      [/ Your preferred continuous fraction-working style is used in the worked homework examples, with the LCM named\./, ''],
      [/ The Grade 9 no-calculator instruction and Stage 3 sample timing\/60-question format do not establish the rules or format of your current Grade 10 exam\./, '']
    ]
  }
};
