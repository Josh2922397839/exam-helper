/* ExamForge content — Grade 10 Human & Social Biology.
   Scope = the HSB topics in the study inventory (notebook "The Structure and Function of Living Cells", the HSB standardized-test
   guide and the Hsb Gizmo AI path). Explanations use standard biology facts; example numbers are practice data, not the user's results. */
window.EF = window.EF || {};
EF.subjects = EF.subjects || [];

EF.subjects.push({
  id: 'hsb',
  iconKey: 'biology',
  name: 'Human & Social Biology',
  short: 'HSB',
  grade: 10,
  icon: 'fa-microscope',
  color: '#22c55e',
  tagline: 'Living cells, transport, photosynthesis, food tests and food chains',
  intro: 'From MRS GREN to energy pyramids: cells and organelles, diffusion vs osmosis vs active transport, photosynthesis and the starch test, food tests, and feeding relationships.',

  topics: [
    {
      id: 'life', title: 'Characteristics of living things', nav: 'MRS GREN', icon: 'fa-seedling',
      blocks: [
        { type: 'lead', html: 'All living things carry out seven <strong>life processes</strong>. Remember them as <strong>MRS GREN</strong>.' },
        {
          type: 'grid', cols: 4, numbered: true, items: [
            { title: 'Movement', html: 'Changing position or moving parts (plants move slowly, e.g. leaves turning to light).' },
            { title: 'Respiration', html: 'Releasing <strong>energy</strong> from food (glucose) inside cells.' },
            { title: 'Sensitivity', html: 'Detecting and responding to changes (stimuli) in the surroundings.' },
            { title: 'Growth', html: 'A permanent increase in size and mass.' },
            { title: 'Reproduction', html: 'Producing new organisms of the same kind.' },
            { title: 'Excretion', html: 'Removing <strong>waste made by the body’s reactions</strong> (e.g. CO₂, urea). Not the same as egestion (getting rid of undigested food).' },
            { title: 'Nutrition', html: 'Taking in or making food for energy and growth.' }
          ]
        },
        { type: 'heading', text: 'Cell theory and levels of organisation' },
        {
          type: 'steps', items: [
            { title: 'Cell theory', html: '1. All living things are made of one or more <strong>cells</strong>. 2. The cell is the basic unit of life. 3. New cells come only from <strong>existing cells</strong> (by cell division).' }
          ]
        },
        {
          type: 'steps', horizontal: true, items: [
            { title: 'Cell', html: 'e.g. muscle cell' },
            { title: 'Tissue', html: 'group of similar cells doing one job, e.g. muscle tissue' },
            { title: 'Organ', html: 'different tissues working together, e.g. heart' },
            { title: 'Organ system', html: 'organs working together, e.g. circulatory system' },
            { title: 'Organism', html: 'the whole living thing, e.g. you' }
          ]
        }
      ]
    },
    {
      id: 'cells', title: 'Plant, animal and bacterial cells', nav: 'Cells', icon: 'fa-circle-nodes',
      blocks: [
        {
          type: 'table', title: 'Organelles and their jobs', head: ['Part', 'Job', 'Plant', 'Animal'], rows: [
            ['Nucleus', 'controls the cell; contains DNA (chromosomes)', '✔', '✔'],
            ['Cell membrane', 'controls what enters and leaves (partially permeable)', '✔', '✔'],
            ['Cytoplasm', 'jelly where most chemical reactions happen', '✔', '✔'],
            ['Mitochondria', 'aerobic respiration: releases energy', '✔', '✔'],
            ['Ribosomes', 'make proteins', '✔', '✔'],
            ['Cell wall (cellulose)', 'supports the cell and keeps its shape; stops it bursting', '✔', '✘'],
            ['Chloroplasts', 'contain chlorophyll; photosynthesis', '✔ (in green parts)', '✘'],
            ['Large permanent vacuole', 'holds cell sap; keeps the cell firm (turgid)', '✔', '✘ (small temporary ones only)']
          ]
        },
        {
          type: 'compare', items: [
            { title: 'Plant cell', color: '#22c55e', summary: [['Shape', 'regular, often box-shaped'], ['Food store', 'starch']], phases: [['Has', 'cell wall, chloroplasts, large vacuole'], ['Plus', 'nucleus, membrane, cytoplasm, mitochondria']] },
            { title: 'Animal cell', color: '#f97316', summary: [['Shape', 'irregular / round'], ['Food store', 'glycogen']], phases: [['No', 'cell wall, chloroplasts or large vacuole'], ['Has', 'nucleus, membrane, cytoplasm, mitochondria, centrioles']] }
          ]
        },
        {
          type: 'compare', items: [
            { title: 'Prokaryotic (bacteria)', color: '#a855f7', summary: [['Nucleus', '<strong>no</strong>: DNA is loose in the cytoplasm (a circular strand) plus small rings called plasmids'], ['Size', 'very small']], phases: [['Organelles', 'no membrane-bound organelles (no mitochondria or chloroplasts)'], ['Has', 'cell wall, membrane, cytoplasm, small ribosomes; some have a flagellum']] },
            { title: 'Eukaryotic (plants, animals, fungi)', color: '#3b82f6', summary: [['Nucleus', '<strong>yes</strong>: DNA inside a nucleus'], ['Size', 'larger']], phases: [['Organelles', 'membrane-bound organelles such as mitochondria'], ['Examples', 'your cells, leaf cells, yeast']] }
          ]
        }
      ]
    },
    {
      id: 'specialised', title: 'Specialised cells', nav: 'Specialised Cells', icon: 'fa-dna',
      blocks: [
        { type: 'lead', html: 'Specialised cells have a special <strong>shape or feature</strong> that suits their job. Exams ask you to link the <strong>adaptation</strong> to the <strong>function</strong>.' },
        {
          type: 'grid', cols: 2, expand: true, items: [
            { icon: 'fa-droplet', title: 'Red blood cell', sub: 'Carries oxygen', color: '#ef4444', more: '<ul><li><strong>Biconcave</strong> disc: large surface area for oxygen to diffuse in.</li><li><strong>No nucleus</strong>: more room for haemoglobin.</li><li>Full of <strong>haemoglobin</strong>, which carries oxygen.</li><li>Small and flexible: squeezes through capillaries.</li></ul>' },
            { icon: 'fa-bolt', title: 'Nerve cell (neurone)', sub: 'Carries impulses', color: '#f59e0b', more: '<ul><li>Very <strong>long</strong> axon: carries messages long distances.</li><li>Branched endings connect to many other cells.</li><li>Fatty (myelin) sheath speeds up impulses.</li></ul>' },
            { icon: 'fa-person-swimming', title: 'Sperm cell', sub: 'Fertilises the egg', color: '#3b82f6', more: '<ul><li><strong>Tail</strong> to swim.</li><li>Many <strong>mitochondria</strong> in the middle piece for energy.</li><li><strong>Acrosome</strong> holds enzymes to get into the egg.</li></ul>' },
            { icon: 'fa-wind', title: 'Ciliated cell', sub: 'Lines the windpipe', color: '#8b5cf6', more: '<ul><li>Tiny hairs (<strong>cilia</strong>) beat to sweep mucus, dust and germs up and away from the lungs.</li></ul>' },
            { icon: 'fa-seedling', title: 'Root hair cell', sub: 'Absorbs water and minerals', color: '#22c55e', more: '<ul><li>Long thin <strong>extension</strong>: large surface area.</li><li>No chloroplasts (underground).</li><li>Many mitochondria for <strong>active transport</strong> of mineral ions.</li></ul>' },
            { icon: 'fa-leaf', title: 'Palisade cell', sub: 'Main photosynthesis cell', color: '#16a34a', more: '<ul><li>Packed with <strong>chloroplasts</strong>.</li><li>Tall shape, near the top of the leaf to catch light.</li></ul>' },
            { icon: 'fa-door-open', title: 'Guard cells', sub: 'Open and close stomata', color: '#14b8a6', more: '<ul><li>A pair of cells around each <strong>stoma</strong> (pore); they swell to open it and go floppy to close it, controlling gas exchange and water loss.</li></ul>' },
            { icon: 'fa-grip-lines-vertical', title: 'Xylem vessel', sub: 'Carries water up the plant', color: '#84cc16', more: '<ul><li>Dead, <strong>hollow</strong> tubes with no end walls.</li><li>Walls strengthened with <strong>lignin</strong>.</li></ul>' }
          ]
        }
      ]
    },
    {
      id: 'transport', title: 'Diffusion, osmosis and active transport', nav: 'Transport in Cells', icon: 'fa-arrow-right-arrow-left',
      blocks: [
        {
          type: 'grid', cols: 3, items: [
            { icon: 'fa-wind', title: 'Diffusion', sub: 'Passive (no energy)', color: '#3b82f6', html: 'Net movement of particles from a region of <strong>higher concentration</strong> to <strong>lower concentration</strong>, down a concentration gradient. e.g. O₂ into cells, CO₂ out; smell of perfume spreading.' },
            { icon: 'fa-droplet', title: 'Osmosis', sub: 'Passive (no energy)', color: '#06b6d4', html: 'Net movement of <strong>water</strong> molecules from a <strong>dilute</strong> solution (lots of water) to a <strong>concentrated</strong> solution, through a <strong>partially permeable membrane</strong>.' },
            { icon: 'fa-battery-full', title: 'Active transport', sub: 'Needs energy', color: '#f59e0b', html: 'Movement of particles from <strong>low to high</strong> concentration, <strong>against</strong> the gradient, using energy from respiration and carrier proteins. e.g. root hairs taking in mineral ions.' }
          ]
        },
        { type: 'text', html: '<strong>Endocytosis</strong>: the cell membrane folds in around a large particle and pinches off to bring it in. White blood cells engulf bacteria this way (phagocytosis). It needs energy.' },
        { type: 'heading', text: 'What osmosis does to cells' },
        {
          type: 'table', head: ['Placed in…', 'Animal cell (e.g. red blood cell)', 'Plant cell'], rows: [
            ['Pure water / very dilute solution', 'water enters → swells and <strong>bursts</strong> (no cell wall)', 'water enters → <strong>turgid</strong> (firm); the wall stops it bursting'],
            ['Same concentration', 'no net change', 'no net change'],
            ['Concentrated (salt/sugar) solution', 'water leaves → <strong>shrinks</strong> (crenated)', 'water leaves → <strong>flaccid</strong>, then <strong>plasmolysed</strong> (membrane pulls away from wall)']
          ]
        },
        {
          type: 'worked', label: 'Interpreting osmosis results', q: 'A potato strip was 50 mm long. After 30 minutes in a sugar solution it was 46 mm. Calculate the percentage change and explain the result. (Practice numbers.)',
          steps: ['Change = final − initial = 46 − 50 = <strong>−4 mm</strong>', '% change = (change ÷ initial) × 100 = (−4 ÷ 50) × 100', '= <strong>−8%</strong> (a decrease)', 'Explanation: the sugar solution was <strong>more concentrated</strong> than the potato cells, so water left the cells by <strong>osmosis</strong> and the strip got shorter.'],
          answer: '−8%: water moved out of the potato by osmosis'
        },
        { type: 'callout', tone: 'tip', icon: 'fa-lightbulb', title: 'Reading an osmosis graph', html: 'Where the line crosses <strong>0% change</strong>, the solution has the <strong>same concentration</strong> as the cells. Strips in weaker solutions gain mass; in stronger solutions they lose mass.' }
      ]
    },
    {
      id: 'photosynthesis', title: 'Photosynthesis and the starch test', nav: 'Photosynthesis', icon: 'fa-sun',
      blocks: [
        {
          type: 'formulas', items: [
            { name: 'Word equation', f: 'carbon dioxide + water → glucose + oxygen', html: 'Needs <strong>light</strong> energy and <strong>chlorophyll</strong>.' },
            { name: 'Symbol equation', f: '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂', html: 'Balanced: 6 of each, apart from one glucose.' }
          ]
        },
        { type: 'components', title: 'Conditions needed', items: [['fa-sun', 'light'], ['fa-smog', 'carbon dioxide'], ['fa-droplet', 'water'], ['fa-leaf', 'chlorophyll'], ['fa-temperature-half', 'suitable temperature']] },
        {
          type: 'grid', cols: 3, items: [
            { icon: 'fa-fire', title: 'Respiration', html: 'Glucose is broken down to release energy.' },
            { icon: 'fa-box-archive', title: 'Stored as starch', html: 'Starch is insoluble, so it is a good store (e.g. in potatoes, seeds).' },
            { icon: 'fa-border-all', title: 'Cellulose', html: 'Builds cell walls.' },
            { icon: 'fa-truck-fast', title: 'Sucrose', html: 'Sugar transported around the plant in the phloem.' },
            { icon: 'fa-dumbbell', title: 'Proteins', html: 'Made using glucose + nitrates from the soil.' },
            { icon: 'fa-bottle-droplet', title: 'Fats and oils', html: 'Energy stores in seeds (e.g. peanuts, coconut).' }
          ]
        },
        { type: 'callout', tone: 'info', icon: 'fa-earth-americas', title: 'Why plants matter', html: 'They make the <strong>oxygen</strong> we breathe, are the <strong>start of every food chain</strong>, take in carbon dioxide, give habitats, and provide food, timber and medicines.' },
        {
          type: 'gizmo', badge: 'Practical', icon: 'fa-flask', name: 'Testing a leaf for starch', topic: 'Evidence that photosynthesis has happened',
          goalLabel: 'Aim', goal: 'To show that a green leaf that has been in the light contains starch.',
          stepsLabel: 'Method',
          steps: [
            'Dip the leaf in <strong>boiling water</strong> for about a minute: kills the cells, stops reactions and softens the leaf.',
            'Turn the Bunsen <strong>off</strong>, then put the leaf in a tube of <strong>ethanol</strong> standing in the hot water: removes the <strong>chlorophyll</strong> (the leaf turns white).',
            'Dip the leaf in warm water again: softens it (ethanol makes it brittle).',
            'Spread it on a white tile and add <strong>iodine solution</strong>.'
          ],
          data: { title: 'Expected results', head: ['Result', 'Meaning'], rows: [['Blue-black', 'starch present → photosynthesis took place'], ['Stays orange-brown', 'no starch']] },
          extra: [
            { title: 'Controls and set-ups', list: ['<strong>Destarch</strong> the plant first by keeping it in the dark for 48 hours.', 'Need for <strong>light</strong>: cover part of a leaf with foil; only the uncovered part turns blue-black.', 'Need for <strong>chlorophyll</strong>: use a variegated (green and white) leaf; only the green parts turn blue-black.', 'Need for <strong>CO₂</strong>: enclose a leaf with soda lime (absorbs CO₂); it stays orange-brown.'] },
            { title: 'Safety', list: ['Ethanol is <strong>flammable</strong>: never heat it over a flame; use a hot water bath.'] }
          ],
          conclusion: 'Green leaves kept in the light make glucose and store it as starch, so starch is evidence of photosynthesis.'
        }
      ]
    },
    {
      id: 'food-tests', title: 'Food tests', nav: 'Food Tests', icon: 'fa-vial',
      blocks: [
        {
          type: 'table', title: 'Tests for food substances', head: ['Food substance', 'Reagent and method', 'Negative', 'Positive'], rows: [
            ['Starch', 'add a few drops of <strong>iodine solution</strong>', 'orange-brown', '<strong>blue-black</strong>'],
            ['Reducing sugar (e.g. glucose)', 'add <strong>Benedict’s solution</strong>, heat in a water bath', 'stays blue', 'green → yellow → orange → <strong>brick-red</strong>'],
            ['Non-reducing sugar (sucrose)', 'boil with dilute <strong>hydrochloric acid</strong>, neutralise with sodium hydrogencarbonate, then do the Benedict’s test', 'stays blue', '<strong>brick-red</strong> (only after acid)'],
            ['Protein', '<strong>Biuret test</strong>: sodium hydroxide, then a few drops of copper sulfate (or Biuret reagent)', 'blue', '<strong>purple / lilac</strong>'],
            ['Fats and oils', '<strong>Emulsion test</strong>: shake with ethanol, pour into water', 'stays clear', '<strong>cloudy white</strong> emulsion'],
            ['Fats (quick test)', '<strong>Grease-spot test</strong>: rub on paper, let it dry', 'no spot', '<strong>translucent</strong> spot']
          ]
        },
        { type: 'callout', tone: 'tip', icon: 'fa-lightbulb', title: 'How much sugar?', html: 'In the Benedict’s test, the colour shows <strong>how much</strong> reducing sugar: green = a little, yellow/orange = more, <strong>brick-red = a lot</strong>.' }
      ]
    },
    {
      id: 'food-chains', title: 'Food chains, food webs and pyramids', nav: 'Food Chains', icon: 'fa-fish',
      blocks: [
        {
          type: 'terms', items: [
            ['Ecosystem', 'a community of living things and their non-living surroundings, interacting'],
            ['Habitat', 'the place where an organism lives'],
            ['Population', 'all the organisms of one species in an area'],
            ['Community', 'all the populations of different species in an area'],
            ['Producer', 'makes its own food by photosynthesis (green plants, algae)'],
            ['Consumer', 'gets energy by eating other organisms'],
            ['Herbivore', 'eats only plants (primary consumer)'],
            ['Carnivore', 'eats only animals'],
            ['Omnivore', 'eats plants and animals'],
            ['Decomposer', 'bacteria and fungi that break down dead material and recycle nutrients'],
            ['Trophic level', 'a feeding level in a chain (producer = level 1)']
          ]
        },
        {
          type: 'steps', horizontal: true, items: [
            { title: 'Producer', html: 'Sea grass' },
            { title: 'Primary consumer', html: 'Parrotfish (herbivore)' },
            { title: 'Secondary consumer', html: 'Grouper' },
            { title: 'Tertiary consumer', html: 'Shark' }
          ]
        },
        { type: 'callout', tone: 'info', icon: 'fa-arrow-right', title: 'Arrows show the flow of energy', html: 'The arrow points <strong>from</strong> the organism eaten <strong>to</strong> the one that eats it. A <strong>food web</strong> is many linked food chains; it is more stable because animals have other foods if one disappears.' },
        {
          type: 'tiers', items: [
            { tag: 'Pyramid of numbers', color: '#f59e0b', title: 'How many organisms at each level', html: 'Can be <strong>upside-down</strong>: one mango tree can feed hundreds of caterpillars.' },
            { tag: 'Pyramid of biomass', color: '#22c55e', title: 'Mass of living material at each level', html: 'Usually a proper pyramid shape.' },
            { tag: 'Pyramid of energy', color: '#3b82f6', title: 'Energy at each level', html: '<strong>Always</strong> a proper pyramid, because energy is lost at every level.' }
          ]
        },
        {
          type: 'worked', label: 'Energy transfer', q: 'Grass captures 10 000 kJ of energy. About 10% passes to each next level. How much energy reaches a secondary consumer?',
          steps: ['Primary consumer: 10% of 10 000 = <strong>1000 kJ</strong>', 'Secondary consumer: 10% of 1000 = <strong>100 kJ</strong>', 'Where did the rest go? Lost as <strong>heat from respiration</strong>, in movement, and in parts not eaten or not digested (faeces).'],
          answer: 'About 100 kJ'
        }
      ]
    }
  ],

  quiz: [
    { q: 'What does the “E” in MRS GREN stand for?', options: ['Excretion', 'Energy', 'Eating', 'Evolution'], answer: 0, why: 'Excretion: removing waste made by the body’s reactions.' },
    { q: 'Which part controls the activities of the cell?', options: ['Nucleus', 'Cell wall', 'Vacuole', 'Cytoplasm'], answer: 0, why: 'The nucleus holds DNA, the instructions for the cell.' },
    { q: 'Which structure is found in plant cells but NOT animal cells?', options: ['Cell wall', 'Cell membrane', 'Mitochondria', 'Nucleus'], answer: 0, why: 'Plant cells also have chloroplasts and a large permanent vacuole.' },
    { q: 'Where does aerobic respiration take place?', options: ['Mitochondria', 'Chloroplasts', 'Ribosomes', 'Nucleus'], answer: 0, why: 'Mitochondria release energy from glucose.' },
    { q: 'Ribosomes make…', options: ['proteins', 'glucose', 'starch', 'DNA'], answer: 0, why: 'Protein synthesis happens at the ribosomes.' },
    { q: 'Prokaryotic cells such as bacteria have NO…', options: ['nucleus', 'cell membrane', 'cytoplasm', 'ribosomes'], answer: 0, why: 'Their DNA is loose in the cytoplasm.' },
    { q: 'Which is the correct order of organisation?', options: ['cell → tissue → organ → organ system', 'tissue → cell → organ → system', 'organ → tissue → cell → system', 'cell → organ → tissue → system'], answer: 0, why: 'Cells form tissues, tissues form organs, organs form systems.' },
    { q: 'Why do red blood cells have no nucleus?', options: ['More room for haemoglobin', 'To swim faster', 'To make proteins', 'To store starch'], answer: 0, why: 'More haemoglobin = more oxygen carried.' },
    { q: 'Root hair cells are adapted by having…', options: ['a large surface area', 'many chloroplasts', 'a tail', 'cilia'], answer: 0, why: 'The long extension absorbs more water and minerals.' },
    { q: 'Osmosis is the movement of…', options: ['water through a partially permeable membrane', 'any particle from high to low concentration', 'particles against a gradient', 'glucose into cells using energy'], answer: 0, why: 'Osmosis is specifically about water.' },
    { q: 'Which process needs energy from respiration?', options: ['Active transport', 'Diffusion', 'Osmosis', 'Evaporation'], answer: 0, why: 'It moves particles against the concentration gradient.' },
    { q: 'A red blood cell is put in pure water. It will…', options: ['swell and burst', 'shrink', 'become plasmolysed', 'stay the same'], answer: 0, why: 'Water enters by osmosis and there is no cell wall.' },
    { q: 'A plant cell in concentrated salt solution becomes…', options: ['plasmolysed', 'turgid', 'burst', 'larger'], answer: 0, why: 'Water leaves and the membrane pulls away from the wall.' },
    { q: 'A potato strip goes from 40 mm to 44 mm. The percentage change is…', options: ['+10%', '+4%', '−10%', '+11%'], answer: 0, why: '(4 ÷ 40) × 100 = 10% increase.' },
    { q: 'The products of photosynthesis are…', options: ['glucose and oxygen', 'carbon dioxide and water', 'starch and carbon dioxide', 'oxygen and water'], answer: 0, why: 'CO₂ + water → glucose + oxygen.' },
    { q: 'In the starch test, why is the leaf placed in ethanol?', options: ['To remove chlorophyll', 'To kill the cells', 'To add starch', 'To soften the leaf'], answer: 0, why: 'Removing the green colour lets you see the iodine colour clearly.' },
    { q: 'Why is a plant destarched before an experiment?', options: ['So any starch found must have been made during the experiment', 'To kill it', 'To add chlorophyll', 'To make it grow'], answer: 0, why: 'It removes old starch stores.' },
    { q: 'Iodine solution turns blue-black with…', options: ['starch', 'protein', 'glucose', 'fat'], answer: 0, why: 'Iodine is the starch test.' },
    { q: 'A positive Biuret test (protein) is…', options: ['purple / lilac', 'brick-red', 'blue-black', 'cloudy white'], answer: 0, why: 'Biuret turns from blue to purple with protein.' },
    { q: 'Benedict’s solution needs to be…', options: ['heated', 'frozen', 'mixed with ethanol', 'left in the dark'], answer: 0, why: 'Heat in a water bath; a brick-red colour means lots of reducing sugar.' },
    { q: 'In a food chain, the arrows show…', options: ['the direction energy flows', 'which animal is bigger', 'who eats the plants only', 'where animals live'], answer: 0, why: 'From the food to the feeder.' },
    { q: 'Which pyramid is ALWAYS the right way up?', options: ['Pyramid of energy', 'Pyramid of numbers', 'Pyramid of biomass', 'None of them'], answer: 0, why: 'Energy is lost at each trophic level.' },
    { q: 'About how much energy passes from one trophic level to the next?', options: ['10%', '50%', '90%', '100%'], answer: 0, why: 'About 90% is lost, mostly as heat from respiration.' },
    { q: 'Decomposers are…', options: ['bacteria and fungi that break down dead material', 'animals that eat plants', 'top carnivores', 'green plants'], answer: 0, why: 'They recycle nutrients back into the soil.' }
  ],

  flashcards: [
    ['MRS GREN', 'Movement, Respiration, Sensitivity, Growth, Reproduction, Excretion, Nutrition', 'Life'],
    ['Cell theory', 'All living things are made of cells; the cell is the basic unit of life; cells come from existing cells', 'Life'],
    ['Tissue', 'A group of similar cells doing the same job', 'Life'],
    ['Organ', 'Different tissues working together, e.g. the heart', 'Life'],
    ['Nucleus', 'Controls the cell; contains DNA', 'Cells'],
    ['Cell membrane', 'Controls what enters and leaves the cell (partially permeable)', 'Cells'],
    ['Mitochondria', 'Site of aerobic respiration; release energy', 'Cells'],
    ['Ribosomes', 'Make proteins', 'Cells'],
    ['Cell wall', 'Made of cellulose; supports the plant cell and stops it bursting', 'Cells'],
    ['Chloroplast', 'Contains chlorophyll; site of photosynthesis', 'Cells'],
    ['Vacuole (plant)', 'Large, permanent, full of cell sap; keeps the cell turgid', 'Cells'],
    ['Three things only plant cells have', 'Cell wall, chloroplasts, large permanent vacuole', 'Cells'],
    ['Prokaryote', 'Cell with no nucleus or membrane-bound organelles, e.g. bacteria', 'Cells'],
    ['Eukaryote', 'Cell with a nucleus and membrane-bound organelles: plants, animals, fungi', 'Cells'],
    ['Red blood cell adaptations', 'Biconcave, no nucleus, full of haemoglobin', 'Specialised cells'],
    ['Root hair cell adaptation', 'Long extension = large surface area for absorbing water and minerals', 'Specialised cells'],
    ['Palisade cell adaptation', 'Packed with chloroplasts near the top of the leaf', 'Specialised cells'],
    ['Guard cells', 'Open and close stomata to control gas exchange and water loss', 'Specialised cells'],
    ['Diffusion', 'Net movement of particles from high to low concentration (passive)', 'Transport'],
    ['Osmosis', 'Net movement of water from a dilute to a concentrated solution through a partially permeable membrane', 'Transport'],
    ['Active transport', 'Movement against the concentration gradient using energy', 'Transport'],
    ['Turgid', 'Plant cell swollen with water, pressing on its wall', 'Transport'],
    ['Plasmolysis', 'Plant cell loses so much water that the membrane pulls away from the wall', 'Transport'],
    ['Percentage change', '(final − initial) ÷ initial × 100', 'Transport'],
    ['Photosynthesis (word equation)', 'Carbon dioxide + water → glucose + oxygen (light, chlorophyll)', 'Photosynthesis'],
    ['Photosynthesis (symbol equation)', '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂', 'Photosynthesis'],
    ['Uses of glucose in plants', 'Respiration, starch storage, cellulose, sucrose for transport, proteins, fats/oils', 'Photosynthesis'],
    ['Starch test steps', 'Boiling water → ethanol (water bath) → warm water → iodine', 'Photosynthesis'],
    ['Test for starch', 'Iodine: orange-brown → blue-black', 'Food tests'],
    ['Test for reducing sugar', 'Benedict’s + heat: blue → brick-red', 'Food tests'],
    ['Test for protein', 'Biuret: blue → purple', 'Food tests'],
    ['Test for fat', 'Ethanol emulsion: cloudy white (or translucent grease spot)', 'Food tests'],
    ['Producer', 'Makes its own food by photosynthesis', 'Ecology'],
    ['Decomposer', 'Breaks down dead material; recycles nutrients (bacteria, fungi)', 'Ecology'],
    ['Why energy is lost along a chain', 'Heat from respiration, movement, undigested waste and parts not eaten', 'Ecology'],
    ['Pyramid of numbers can be inverted because…', 'One large producer (a tree) can feed many consumers', 'Ecology']
  ]
});
