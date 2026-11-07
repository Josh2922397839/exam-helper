/* ExamForge content — Chemistry */
window.EF = window.EF || {};
EF.subjects = EF.subjects || [];

(function () {
  // Elements 1–20. group/period place them on the mini periodic table.
  var atoms = [
    {z:1,symbol:'H',name:'Hydrogen',mass:1.008,neutrons:0,shells:[1],category:'Nonmetal',state:'Gas',config:'1s¹',group:1,period:1,en:2.20,melt:-259.16,boil:-252.87,density:0.00009,discovered:'Henry Cavendish (1766)',desc:'Lightest and most abundant element in the universe. Makes up about 75% of all normal matter by mass. Essential part of water (H₂O).',uses:'Rocket fuel, ammonia production, fuel cells, petroleum refining, hydrogen peroxide.',fact:'The famous “Pillars of Creation” in the Eagle Nebula are clouds made mostly of hydrogen gas — the tallest is about 4 light-years high!'},
    {z:2,symbol:'He',name:'Helium',mass:4.003,neutrons:2,shells:[2],category:'Noble Gas',state:'Gas',config:'1s²',group:18,period:1,en:null,melt:-272.2,boil:-268.93,density:0.000164,discovered:'Pierre Janssen & Joseph Lockyer (1868)',desc:'Second lightest and second most abundant element. Extremely unreactive noble gas. Has the lowest boiling point of any element.',uses:'Balloons, deep-sea diving gas, MRI coolant, welding shielding gas, leak detection.',fact:'Helium was discovered on the Sun before it was found on Earth — its name comes from “Helios,” the Greek sun god.'},
    {z:3,symbol:'Li',name:'Lithium',mass:6.941,neutrons:4,shells:[2,1],category:'Alkali Metal',state:'Solid',config:'1s² 2s¹',group:1,period:2,en:0.98,melt:180.54,boil:1342,density:0.534,discovered:'Johan August Arfwedson (1817)',desc:'Lightest metal and lightest solid element. Soft enough to cut with a knife. Floats on water and reacts with it.',uses:'Rechargeable batteries (Li-ion), mood-stabilising medicine, ceramics, lubricating greases.',fact:'Lithium is so light it floats on water — but it also reacts and fizzes when it touches water!'},
    {z:4,symbol:'Be',name:'Beryllium',mass:9.012,neutrons:5,shells:[2,2],category:'Alkaline Earth Metal',state:'Solid',config:'1s² 2s²',group:2,period:2,en:1.57,melt:1287,boil:2469,density:1.85,discovered:'Louis Nicolas Vauquelin (1798)',desc:'Rare, lightweight, steel-grey metal. Very stiff and resists corrosion. Transparent to X-rays.',uses:'Aerospace parts, X-ray windows, nuclear reactors, springs and connectors.',fact:'Beryllium is transparent to X-rays, so it is used to make the windows in X-ray tubes.'},
    {z:5,symbol:'B',name:'Boron',mass:10.81,neutrons:6,shells:[2,3],category:'Metalloid',state:'Solid',config:'1s² 2s² 2p¹',group:13,period:2,en:2.04,melt:2076,boil:3927,density:2.34,discovered:'Humphry Davy, Joseph Louis Gay-Lussac (1808)',desc:'A metalloid that plants need to grow. Extremely hard in crystal form — nearly as hard as diamond.',uses:'Borosilicate glass (Pyrex), detergents (borax), fibreglass insulation, rocket propellant.',fact:'Boron nitride (a boron compound) can be as hard as diamond and is used in cutting tools.'},
    {z:6,symbol:'C',name:'Carbon',mass:12.011,neutrons:6,shells:[2,4],category:'Nonmetal',state:'Solid',config:'1s² 2s² 2p²',group:14,period:2,en:2.55,melt:3550,boil:4027,density:2.267,discovered:'Known since ancient times',desc:'The basis of all known life. Forms more compounds than any other element. Exists as diamond, graphite, graphene and fullerenes.',uses:'Steel making, fuels, plastics, diamonds, pencils (graphite), charcoal filters.',fact:'The carbon atoms in your body were made inside stars — all carbon is forged by stellar fusion.'},
    {z:7,symbol:'N',name:'Nitrogen',mass:14.007,neutrons:7,shells:[2,5],category:'Nonmetal',state:'Gas',config:'1s² 2s² 2p³',group:15,period:2,en:3.04,melt:-210.0,boil:-195.79,density:0.0012506,discovered:'Daniel Rutherford (1772)',desc:'Makes up 78% of Earth’s atmosphere. Essential for amino acids and DNA. Quite unreactive as N₂ gas because of its strong triple bond.',uses:'Fertilisers (ammonia), food preservation, cryogenics (liquid nitrogen), explosives.',fact:'Liquid nitrogen is so cold (−196 °C) it can freeze a banana hard enough to hammer a nail.'},
    {z:8,symbol:'O',name:'Oxygen',mass:15.999,neutrons:8,shells:[2,6],category:'Nonmetal',state:'Gas',config:'1s² 2s² 2p⁴',group:16,period:2,en:3.44,melt:-218.79,boil:-182.96,density:0.001429,discovered:'Carl Wilhelm Scheele (1771), Joseph Priestley (1774)',desc:'Most abundant element in Earth’s crust (46% by mass). Needed for respiration and burning. Makes up 21% of the atmosphere.',uses:'Medical breathing, steel manufacturing, water treatment, welding, rocket propulsion.',fact:'Liquid oxygen is pale blue and is attracted to magnets (it’s paramagnetic)!'},
    {z:9,symbol:'F',name:'Fluorine',mass:18.998,neutrons:10,shells:[2,7],category:'Halogen',state:'Gas',config:'1s² 2s² 2p⁵',group:17,period:2,en:3.98,melt:-219.67,boil:-188.11,density:0.001696,discovered:'Henri Moissan (1886)',desc:'The most reactive and most electronegative element. A pale yellow, extremely dangerous gas that reacts with almost everything.',uses:'Toothpaste (fluoride), Teflon (PTFE), refrigerants, uranium enrichment, medicines.',fact:'Fluorine is so reactive it can even make some noble gases form compounds — once thought impossible.'},
    {z:10,symbol:'Ne',name:'Neon',mass:20.180,neutrons:10,shells:[2,8],category:'Noble Gas',state:'Gas',config:'1s² 2s² 2p⁶',group:18,period:2,en:null,melt:-248.59,boil:-246.08,density:0.0008999,discovered:'William Ramsay & Morris Travers (1898)',desc:'Rare noble gas that glows reddish-orange in a discharge tube. Completely inert — forms no known stable compounds.',uses:'Neon signs, high-voltage indicators, lightning arrestors, lasers.',fact:'“Neon signs” come in every colour, but real neon only glows reddish-orange. Other colours use other gases.'},
    {z:11,symbol:'Na',name:'Sodium',mass:22.990,neutrons:12,shells:[2,8,1],category:'Alkali Metal',state:'Solid',config:'1s² 2s² 2p⁶ 3s¹',group:1,period:3,en:0.93,melt:97.72,boil:883,density:0.971,discovered:'Humphry Davy (1807)',desc:'Soft, silvery-white alkali metal. Very reactive — stored under oil. Essential for nerve impulses and fluid balance in the body.',uses:'Table salt (NaCl), street lamps, de-icing roads, baking soda, soap making.',fact:'Sodium reacts so violently with water it can explode — and it burns with a bright yellow flame.'},
    {z:12,symbol:'Mg',name:'Magnesium',mass:24.305,neutrons:12,shells:[2,8,2],category:'Alkaline Earth Metal',state:'Solid',config:'1s² 2s² 2p⁶ 3s²',group:2,period:3,en:1.31,melt:650,boil:1091,density:1.738,discovered:'Joseph Black (1755)',desc:'Lightweight structural metal, two-thirds the density of aluminium. Burns with an intensely bright white flame. Essential for chlorophyll.',uses:'Alloys (aircraft, cars), fireworks, flares, antacids (milk of magnesia), supplements.',fact:'Magnesium burns so brightly it was used in early camera flash powder — and water can’t put it out!'},
    {z:13,symbol:'Al',name:'Aluminium',mass:26.982,neutrons:14,shells:[2,8,3],category:'Post-Transition Metal',state:'Solid',config:'1s² 2s² 2p⁶ 3s² 3p¹',group:13,period:3,en:1.61,melt:660.32,boil:2519,density:2.698,discovered:'Hans Christian Ørsted (1825)',desc:'Most abundant metal in Earth’s crust. Light, strong and corrosion-resistant thanks to a protective oxide layer.',uses:'Aircraft, cars, cans, foil, power lines, window frames, cookware.',fact:'Aluminium was once more valuable than gold — Napoleon III served his most honoured guests on aluminium plates!'},
    {z:14,symbol:'Si',name:'Silicon',mass:28.086,neutrons:14,shells:[2,8,4],category:'Metalloid',state:'Solid',config:'1s² 2s² 2p⁶ 3s² 3p²',group:14,period:3,en:1.90,melt:1414,boil:3265,density:2.3296,discovered:'Jöns Jacob Berzelius (1824)',desc:'Second most abundant element in Earth’s crust (after oxygen). A semiconductor — the basis of modern electronics.',uses:'Computer chips, solar cells, glass, silicone sealants, concrete, ceramics.',fact:'Silicon Valley is named after this element because silicon is the key material in microchips.'},
    {z:15,symbol:'P',name:'Phosphorus',mass:30.974,neutrons:16,shells:[2,8,5],category:'Nonmetal',state:'Solid',config:'1s² 2s² 2p⁶ 3s² 3p³',group:15,period:3,en:2.19,melt:44.15,boil:280.5,density:1.82,discovered:'Hennig Brand (1669)',desc:'Essential to life — found in DNA, RNA, ATP, bones and teeth. White phosphorus glows in the dark and is extremely toxic.',uses:'Fertilisers, matches, detergents, pesticides, steel production.',fact:'Phosphorus was discovered by an alchemist (Hennig Brand) who was boiling urine trying to make gold!'},
    {z:16,symbol:'S',name:'Sulfur',mass:32.06,neutrons:16,shells:[2,8,6],category:'Nonmetal',state:'Solid',config:'1s² 2s² 2p⁶ 3s² 3p⁴',group:16,period:3,en:2.58,melt:115.21,boil:444.6,density:2.067,discovered:'Known since ancient times',desc:'Bright yellow crystalline solid. Needed for some proteins (amino acids cysteine and methionine). Found near volcanoes.',uses:'Sulfuric acid (the most-produced industrial chemical), vulcanising rubber, fertilisers, gunpowder, medicine.',fact:'Sulfur is the “brimstone” in the Bible. Many sulfur compounds smell like rotten eggs.'},
    {z:17,symbol:'Cl',name:'Chlorine',mass:35.45,neutrons:18,shells:[2,8,7],category:'Halogen',state:'Gas',config:'1s² 2s² 2p⁶ 3s² 3p⁵',group:17,period:3,en:3.16,melt:-101.5,boil:-34.04,density:0.003214,discovered:'Carl Wilhelm Scheele (1774)',desc:'Yellow-green toxic gas with a sharp smell. Powerful disinfectant. Very reactive halogen.',uses:'Water purification, PVC plastic, bleach, disinfectants, hydrochloric acid, swimming pools.',fact:'Chlorine was used as a weapon in World War I but is now essential for making drinking water safe.'},
    {z:18,symbol:'Ar',name:'Argon',mass:39.948,neutrons:22,shells:[2,8,8],category:'Noble Gas',state:'Gas',config:'1s² 2s² 2p⁶ 3s² 3p⁶',group:18,period:3,en:null,melt:-189.34,boil:-185.85,density:0.0017837,discovered:'Lord Rayleigh & William Ramsay (1894)',desc:'Third most common gas in the atmosphere (0.93%). Completely inert noble gas. Its name means “lazy” in Greek.',uses:'Light bulbs, welding shielding, double-glazed windows, preserving documents.',fact:'Argon is almost 1% of the air — you breathe in a little argon with every single breath!'},
    {z:19,symbol:'K',name:'Potassium',mass:39.098,neutrons:20,shells:[2,8,8,1],category:'Alkali Metal',state:'Solid',config:'1s² 2s² 2p⁶ 3s² 3p⁶ 4s¹',group:1,period:4,en:0.82,melt:63.5,boil:759,density:0.862,discovered:'Humphry Davy (1807)',desc:'Soft, silvery alkali metal — even more reactive with water than sodium. Essential for nerves, muscles and heart rhythm.',uses:'Fertilisers (potash), soap, glass, gunpowder (saltpetre); bananas are a dietary source.',fact:'Bananas are very slightly radioactive because of their potassium — but you’d need to eat millions at once for it to matter!'},
    {z:20,symbol:'Ca',name:'Calcium',mass:40.078,neutrons:20,shells:[2,8,8,2],category:'Alkaline Earth Metal',state:'Solid',config:'1s² 2s² 2p⁶ 3s² 3p⁶ 4s²',group:2,period:4,en:1.00,melt:842,boil:1484,density:1.54,discovered:'Humphry Davy (1808)',desc:'Most abundant metal in the human body. Essential for bones, teeth, nerve signals and muscles. Fifth most abundant element in Earth’s crust.',uses:'Cement, chalk, lime, antacids, steel refining; bones and teeth.',fact:'Your body contains about 1 kg of calcium — 99% of it is in your bones and teeth!'}
  ];

  EF.subjects.push({
    id: 'chemistry',
    name: 'Chemistry',
    short: 'Chemistry',
    grade: 9,
    icon: 'fa-atom',
    emoji: '⚛️',
    color: '#14b8c4',
    tagline: 'Atomic structure, ions, bonding and the periodic table',
    intro: 'Spin real 3D models of the first 20 elements, then work through electron configuration, ions, ionic bonding and formulas.',

    data: { atoms: atoms },

    topics: [
      {
        id: 'atom-model', title: '3D Atom Viewer', icon: 'fa-atom',
        blocks: [
          { type: 'text', html: 'Pick any element from the mini periodic table. <strong>Drag</strong> to rotate, <strong>scroll or pinch</strong> to zoom.' },
          { type: 'widget', name: 'atom' }
        ]
      },
      {
        id: 'electron-config', title: 'Electron Configuration', icon: 'fa-layer-group',
        blocks: [
          { type: 'text', html: 'Electrons fill <strong>subshells</strong> (s, p, d, f) in order of increasing energy. Each subshell holds a set number of electrons.' },
          {
            type: 'stats', items: [
              { value: 's', label: '1 orbital · 2 e⁻ max' },
              { value: 'p', label: '3 orbitals · 6 e⁻ max' },
              { value: 'd', label: '5 orbitals · 10 e⁻ max' },
              { value: 'f', label: '7 orbitals · 14 e⁻ max' }
            ]
          },
          { type: 'callout', tone: 'info', icon: 'fa-arrow-down-1-9', title: 'Filling order', html: '<span class="mono">1s → 2s → 2p → 3s → 3p → 4s → 3d → 4p → 5s → 4d → 5p → 6s → 4f → 5d → 6p → 7s → 5f → 6d → 7p</span>' },
          {
            type: 'table', title: 'Worked examples',
            head: ['Element', 'Z', 'Configuration', 'Shells'],
            rows: [
              ['Nitrogen', '7', '<span class="mono">1s² 2s² 2p³</span>', '2, 5'],
              ['Sodium', '11', '<span class="mono">1s² 2s² 2p⁶ 3s¹</span>', '2, 8, 1'],
              ['Chlorine', '17', '<span class="mono">1s² 2s² 2p⁶ 3s² 3p⁵</span>', '2, 8, 7']
            ]
          },
          { type: 'callout', tone: 'tip', icon: 'fa-lightbulb', title: 'Exam tip', html: 'Add up the superscripts — they must equal the atomic number. Chlorine: 2 + 2 + 6 + 2 + 5 = <strong>17</strong> ✔' }
        ]
      },
      {
        id: 'ions', title: 'Ions and Charges', nav: 'Ions & Charges', icon: 'fa-bolt',
        blocks: [
          {
            type: 'grid', cols: 2,
            items: [
              { title: 'Cations (+)', color: '#f0506e', icon: 'fa-plus', html: 'Positive ions formed when an atom <strong>loses</strong> electrons. Example: Na loses 1 e⁻ → <strong>Na⁺</strong>. Metals form cations.' },
              { title: 'Anions (−)', color: '#4f7cff', icon: 'fa-minus', html: 'Negative ions formed when an atom <strong>gains</strong> electrons. Example: Cl gains 1 e⁻ → <strong>Cl⁻</strong>. Non-metals form anions.' }
            ]
          },
          { type: 'callout', tone: 'info', icon: 'fa-equals', title: 'Charge = protons − electrons', html: 'Valence electrons (in the outermost shell) are the ones involved in bonding and forming ions.' }
        ]
      },
      {
        id: 'periodic', title: 'Periods and Groups', nav: 'Periods & Groups', icon: 'fa-table-cells',
        blocks: [
          {
            type: 'grid', cols: 2,
            items: [
              { title: 'Periods (rows →)', html: 'Elements in the same period have the same number of electron <strong>shells</strong>. Period number = number of occupied shells.' },
              { title: 'Groups (columns ↓)', html: 'Elements in the same group have the same number of <strong>valence electrons</strong>, so they react in similar ways.' }
            ]
          },
          {
            type: 'table', title: 'Key groups',
            head: ['Group', 'Name', 'Valence e⁻', 'Behaviour'],
            rows: [
              ['1', 'Alkali metals', '1', 'Very reactive metals'],
              ['2', 'Alkaline earth metals', '2', 'Reactive metals'],
              ['3–12', 'Transition metals', 'varies', 'Varied properties, coloured compounds'],
              ['17', 'Halogens', '7', 'Very reactive non-metals'],
              ['18', 'Noble gases', 'full shell', 'Very unreactive']
            ]
          }
        ]
      },
      {
        id: 'ionic-bonding', title: 'Ionic Bonding', icon: 'fa-link',
        blocks: [
          { type: 'text', html: 'Ionic bonding is the <strong>electrostatic attraction</strong> between oppositely charged ions. It usually happens between a <strong>metal</strong> and a <strong>non-metal</strong>.' },
          {
            type: 'steps', items: [
              { title: 'Transfer', html: 'The metal atom gives one or more valence electrons to the non-metal atom.' },
              { title: 'Cation forms', html: 'The metal becomes a positively charged <strong>cation</strong>.' },
              { title: 'Anion forms', html: 'The non-metal becomes a negatively charged <strong>anion</strong>.' },
              { title: 'Attraction', html: 'The opposite charges attract — that attraction is the ionic bond.' }
            ]
          },
          { type: 'callout', tone: 'example', icon: 'fa-flask', title: 'Example: sodium chloride (NaCl)', html: '<p class="mono">Na (1s² 2s² 2p⁶ 3s¹) loses 1 e⁻ → Na⁺ (1s² 2s² 2p⁶)</p><p class="mono">Cl (1s² 2s² 2p⁶ 3s² 3p⁵) gains 1 e⁻ → Cl⁻ (1s² 2s² 2p⁶ 3s² 3p⁶)</p><p>Both ions now have full outer shells, like a noble gas.</p>' }
        ]
      },
      {
        id: 'formulas', title: 'Chemical Formulas & Valency', nav: 'Formulas & Valency', icon: 'fa-flask',
        blocks: [
          { type: 'text', html: 'A chemical formula shows which atoms are in a compound and how many. Subscripts give the number of atoms (no subscript = 1).' },
          { type: 'text', html: '<strong>Valency</strong> = the size of the charge on an element’s most common ion. Metals are positive, non-metals negative. In a neutral compound the charges must add up to <strong>zero</strong>.' },
          { type: 'callout', tone: 'example', icon: 'fa-calculator', title: 'Example: magnesium chloride', html: '<p>Mg (Group 2) → Mg²⁺, valency 2</p><p>Cl (Group 17) → Cl⁻, valency 1</p><p class="mono">+2 + x × (−1) = 0 → x = 2</p><p><strong>Formula: MgCl₂</strong></p>' },
          { type: 'callout', tone: 'tip', icon: 'fa-lightbulb', title: 'Shortcut: swap and drop', html: 'Write the charges, swap them over as subscripts, then simplify. Al³⁺ and O²⁻ → Al₂O₃.' }
        ]
      },
      {
        id: 'ionic-properties', title: 'Properties of Ionic Compounds', nav: 'Ionic Properties', icon: 'fa-gem',
        blocks: [
          {
            type: 'grid', cols: 3,
            items: [
              { emoji: '❄️', title: 'Solid at room temp', html: 'Form rigid 3D crystal lattices with ions in a repeating pattern.' },
              { emoji: '🔥', title: 'High melting & boiling points', html: 'Lots of energy is needed to break the strong electrostatic forces in the lattice.' },
              { emoji: '💧', title: 'Often soluble in water', html: 'Polar water molecules surround the ions and pull them apart.' },
              { emoji: '⚡', title: 'Conductivity', html: 'Don’t conduct as a solid (ions are fixed). Do conduct when molten or dissolved (ions can move).' },
              { emoji: '💥', title: 'Brittle', html: 'A force shifts the layers so like charges line up — they repel and the crystal shatters.' },
              { emoji: '🔬', title: 'Crystal lattice', html: 'Positive and negative ions in a repeating 3D pattern held together by electrostatic attraction.' }
            ]
          }
        ]
      },
      {
        id: 'calculations', title: 'Atomic & Mass Number Calculations', nav: 'Calculations', icon: 'fa-calculator',
        blocks: [
          {
            type: 'grid', cols: 2,
            items: [
              { title: 'Key formulas', rows: [['Atomic number (Z)', 'number of protons'], ['Mass number (A)', 'protons + neutrons'], ['Neutrons', 'A − Z'], ['Isotopes', 'same Z, different A (different number of neutrons)']] },
              { title: 'Isotope examples', rows: [['Cl-35', '17 p + 18 n = 35'], ['Cl-37', '17 p + 20 n = 37'], ['Na-23', '11 p + 12 n = 23']] }
            ]
          }
        ]
      }
    ],

    quiz: [
      { q: 'What charge does a proton have?', options: ['+1', '−1', '0', '+2'], answer: 0, why: 'Protons are +1, electrons −1, neutrons have no charge.' },
      { q: 'What decides an element’s atomic number?', options: ['Number of neutrons', 'Number of electrons', 'Number of protons', 'Mass number'], answer: 2, why: 'Atomic number (Z) = number of protons. It defines the element.' },
      { q: 'How many electrons can a p subshell hold?', options: ['2', '6', '10', '14'], answer: 1, why: 'p has 3 orbitals × 2 electrons = 6.' },
      { q: 'NaCl is held together by:', options: ['Covalent bonding', 'Ionic bonding', 'Metallic bonding', 'Hydrogen bonding'], answer: 1, why: 'Na⁺ and Cl⁻ ions attract each other — that’s ionic bonding.' },
      { q: 'Group 18 elements are called:', options: ['Alkali metals', 'Halogens', 'Noble gases', 'Transition metals'], answer: 2, why: 'They have full outer shells, so they’re very unreactive.' },
      { q: 'The electron configuration of nitrogen (Z = 7) is:', options: ['1s² 2s² 2p³', '1s² 2s² 2p⁴', '1s² 2s²', '1s² 2s² 2p⁶'], answer: 0, why: '2 + 2 + 3 = 7 electrons.' },
      { q: 'How many neutrons does chlorine-37 have?', options: ['17', '18', '20', '37'], answer: 2, why: 'Neutrons = A − Z = 37 − 17 = 20.' },
      { q: 'The formula for magnesium chloride is:', options: ['MgCl', 'MgCl₂', 'Mg₂Cl', 'Mg₂Cl₂'], answer: 1, why: 'Mg²⁺ needs two Cl⁻ ions to balance: MgCl₂.' },
      { q: 'An atom that loses electrons becomes a…', options: ['Anion', 'Cation', 'Isotope', 'Neutron'], answer: 1, why: 'Losing negative electrons leaves a positive ion — a cation.' },
      { q: 'Why do ionic compounds conduct electricity when molten?', options: ['The electrons are free', 'The ions can move', 'They become metals', 'The bonds get stronger'], answer: 1, why: 'In a solid the ions are fixed; melted or dissolved, they’re free to move and carry charge.' },
      { q: 'Elements in the same period have the same number of…', options: ['Valence electrons', 'Electron shells', 'Neutrons', 'Protons'], answer: 1, why: 'Period = row = number of occupied shells.' },
      { q: 'What is the shell arrangement of sodium (Z = 11)?', options: ['2, 9', '2, 8, 1', '8, 2, 1', '2, 2, 7'], answer: 1, why: 'Shells fill 2, then 8, then the rest: 2, 8, 1.' }
    ],

    flashcards: atoms.map(function (a) { return [a.symbol, a.name + ' — atomic number ' + a.z, 'Element']; }).concat([
      ['Atomic number (Z)', 'Number of protons', 'Concept'],
      ['Mass number (A)', 'Protons + neutrons', 'Concept'],
      ['Isotopes', 'Same number of protons, different number of neutrons', 'Concept'],
      ['Cation', 'Positive ion — formed by losing electrons', 'Concept'],
      ['Anion', 'Negative ion — formed by gaining electrons', 'Concept'],
      ['Ionic bond', 'Electrostatic attraction between oppositely charged ions', 'Concept'],
      ['Valency', 'Size of the charge on an element’s most common ion', 'Concept'],
      ['Period', 'A row — same number of electron shells', 'Concept'],
      ['Group', 'A column — same number of valence electrons', 'Concept']
    ])
  });
})();
