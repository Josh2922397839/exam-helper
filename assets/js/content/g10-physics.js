/* Zing content — Grade 10 Physics.
   Scope = the teacher's test-topic list from the study inventory: Vernier caliper; density; mass, weight, gravity;
   forces; moments and the principle of moments; stability; centre of gravity; vectors (right-angle and parallelogram).
   Explanations use standard physics facts; nothing here is claimed as the teacher's exact wording. */
window.EF = window.EF || {};
EF.subjects = EF.subjects || [];

EF.subjects.push({
  id: 'physics',
  name: 'Physics',
  short: 'Physics',
  grade: 10,
  icon: 'fa-bolt',
  color: '#f59e0b',
  tagline: 'Vernier caliper, density, forces, moments, stability and vectors',
  intro: 'Everything on the Grade 10 test-topic list: read a Vernier caliper, work out density, balance a see-saw with moments, find a centre of gravity and add vectors. Worked examples show every step.',

  topics: [
    {
      id: 'vernier', title: 'The Vernier caliper', nav: 'Vernier Caliper', icon: 'fa-ruler-horizontal',
      blocks: [
        { type: 'lead', html: 'A Vernier caliper measures small lengths to <strong>0.1 mm (0.01 cm)</strong>, which is ten times more precise than a normal ruler.' },
        {
          type: 'grid', cols: 3, expand: true, items: [
            { icon: 'fa-up-right-and-down-left-from-center', title: 'Outside jaws', sub: 'Measure external sizes', more: 'Close them on the outside of an object, for example the <strong>diameter of a rod or ball</strong> or the width of a block.' },
            { icon: 'fa-down-left-and-up-right-to-center', title: 'Inside jaws', sub: 'Measure internal sizes', more: 'The small upper jaws open outward to measure an <strong>internal diameter</strong>, like the inside of a pipe or a beaker.' },
            { icon: 'fa-arrow-down-long', title: 'Depth probe', sub: 'Measures depth', more: 'The thin rod that slides out of the end measures the <strong>depth</strong> of a hole or a container.' },
            { icon: 'fa-ruler', title: 'Main scale', sub: 'Fixed scale in mm', more: 'Gives the reading in whole millimetres (and cm). Read the mark <strong>just before</strong> the Vernier zero.' },
            { icon: 'fa-ruler-combined', title: 'Vernier scale', sub: 'Sliding scale, 10 divisions', more: '10 Vernier divisions fit into 9 mm, so each one is 0.9 mm. That 0.1 mm difference is the <strong>least count</strong>.' },
            { icon: 'fa-screwdriver', title: 'Lock screw', sub: 'Holds the jaws still', more: 'Tighten it so the reading does not change while you read the scales.' }
          ]
        },
        {
          type: 'formulas', items: [
            { name: 'Least count', f: '1 MSD − 1 VSD = 0.1 mm', html: 'Smallest length the caliper can measure (MSD = main-scale division, VSD = Vernier-scale division).', units: '0.1 mm = 0.01 cm' },
            { name: 'Reading', f: 'MSR + (VSR × LC)', html: 'Main-scale reading plus the number of the Vernier line that lines up, times the least count.', units: 'mm or cm' },
            { name: 'Corrected reading', f: 'Reading − zero error', html: 'Always subtract the zero error. A negative zero error means you end up adding.', units: 'same unit as reading' }
          ]
        },
        {
          type: 'worked', q: 'The Vernier zero is just past the <strong>23 mm</strong> mark on the main scale, and the <strong>7th</strong> Vernier line lines up exactly with a main-scale line. What is the reading?',
          steps: ['Main-scale reading (mark just before the Vernier zero) = <strong>23 mm</strong>', 'Vernier-scale reading = 7 × 0.1 mm = <strong>0.7 mm</strong>', 'Add them: 23 + 0.7 = <strong>23.7 mm</strong>', 'In centimetres: 23.7 mm ÷ 10 = <strong>2.37 cm</strong>'],
          answer: '23.7 mm = 2.37 cm'
        },
        { type: 'widget', name: 'vernier' },
        { type: 'heading', text: 'Zero error' },
        {
          type: 'compare', items: [
            { title: 'Positive zero error', color: '#f59e0b', summary: [['When jaws are closed', 'the Vernier zero is to the <strong>right</strong> of the main-scale zero'], ['Effect', 'every reading is too big']], phases: [['Example', 'Zero error = +0.3 mm'], ['Reading', '25.6 mm'], ['Corrected', '25.6 − 0.3 = 25.3 mm']] },
            { title: 'Negative zero error', color: '#3b82f6', summary: [['When jaws are closed', 'the Vernier zero is to the <strong>left</strong> of the main-scale zero'], ['Effect', 'every reading is too small']], phases: [['Example', 'Zero error = −0.2 mm'], ['Reading', '25.6 mm'], ['Corrected', '25.6 − (−0.2) = 25.8 mm']] }
          ]
        },
        { type: 'callout', tone: 'tip', icon: 'fa-lightbulb', title: 'Exam habits', html: '<ul><li>Close the jaws first and check for a zero error.</li><li>Do not squeeze the object too tightly.</li><li>Read with your eye level with the scale to avoid <strong>parallax error</strong>.</li><li>Take a few readings in different places and find the <strong>average</strong>.</li></ul>' }
      ]
    },
    {
      id: 'density', title: 'Density', nav: 'Density', icon: 'fa-cube',
      blocks: [
        { type: 'lead', html: '<strong>Density</strong> is the mass per unit volume of a substance. It tells you how tightly the matter is packed.' },
        {
          type: 'formulas', items: [
            { name: 'Density', f: 'ρ = m ÷ V', html: 'ρ (rho) = density, m = mass, V = volume.', units: 'g/cm³ or kg/m³' },
            { name: 'Mass', f: 'm = ρ × V', html: 'Rearranged to find mass.', units: 'g or kg' },
            { name: 'Volume', f: 'V = m ÷ ρ', html: 'Rearranged to find volume.', units: 'cm³ or m³' },
            { name: 'Unit change', f: '1 g/cm³ = 1000 kg/m³', html: 'Water: 1 g/cm³ = 1000 kg/m³.', units: 'multiply g/cm³ by 1000' }
          ]
        },
        { type: 'heading', text: 'Finding the volume' },
        {
          type: 'steps', items: [
            { title: 'Regular solid (box shape)', html: 'Measure length, width and height with a ruler or Vernier caliper. <strong>V = l × w × h</strong>. For a cylinder, V = πr²h.' },
            { title: 'Irregular solid (a stone)', html: 'Use <strong>displacement</strong>: read the water level in a measuring cylinder, lower the stone in on a thread, read again. Volume = final level − first level. A <strong>eureka (displacement) can</strong> works for big objects.' },
            { title: 'Liquid', html: 'Pour it into a measuring cylinder and read the bottom of the <strong>meniscus</strong> at eye level.' },
            { title: 'Mass of a liquid', html: 'Weigh the empty cylinder, then the cylinder + liquid. Mass of liquid = second reading − first reading.' }
          ]
        },
        {
          type: 'worked', q: 'An aluminium block measures 2 cm × 3 cm × 5 cm and has a mass of 81 g. Find its density in g/cm³ and kg/m³.',
          steps: ['Volume = 2 × 3 × 5 = <strong>30 cm³</strong>', 'Density = mass ÷ volume = 81 ÷ 30', '= <strong>2.7 g/cm³</strong>', 'Convert: 2.7 × 1000 = <strong>2700 kg/m³</strong>'],
          answer: '2.7 g/cm³ = 2700 kg/m³'
        },
        {
          type: 'worked', q: 'A stone is lowered into a measuring cylinder. The water rises from 50 cm³ to 62 cm³. The stone’s mass is 30 g. Find its density.',
          steps: ['Volume of stone = 62 − 50 = <strong>12 cm³</strong>', 'Density = 30 ÷ 12', '= <strong>2.5 g/cm³</strong>'],
          answer: '2.5 g/cm³'
        },
        {
          type: 'compare', items: [
            { title: 'Floats', color: '#22c55e', summary: [['Rule', 'object is <strong>less dense</strong> than the liquid'], ['Water', '1.0 g/cm³']], phases: [['Wood', 'about 0.6 g/cm³'], ['Ice', '0.92 g/cm³'], ['Cooking oil', 'about 0.92 g/cm³ (floats on water)']] },
            { title: 'Sinks', color: '#ef4444', summary: [['Rule', 'object is <strong>more dense</strong> than the liquid'], ['Water', '1.0 g/cm³']], phases: [['Aluminium', '2.7 g/cm³'], ['Iron', 'about 7.9 g/cm³'], ['Lead', '11.3 g/cm³']] }
          ]
        },
        { type: 'callout', tone: 'warn', icon: 'fa-triangle-exclamation', title: 'Common mistakes', html: 'Keep units matching: grams with cm³ gives g/cm³; kilograms with m³ gives kg/m³. Density of a substance does <strong>not</strong> change if you cut it in half: mass and volume both halve.' }
      ]
    },
    {
      id: 'mass-weight', title: 'Mass, weight and gravity', nav: 'Mass & Weight', icon: 'fa-weight-hanging',
      blocks: [
        {
          type: 'compare', items: [
            { title: 'Mass', color: '#3b82f6', summary: [['Meaning', 'amount of matter in an object'], ['Unit', 'kilogram (kg)'], ['Type', 'scalar (size only)']], phases: [['Changes on the Moon?', 'No: same everywhere'], ['Measured with', 'a balance (e.g. triple beam balance)']] },
            { title: 'Weight', color: '#f59e0b', summary: [['Meaning', 'the force of gravity pulling on a mass'], ['Unit', 'newton (N)'], ['Type', 'vector (size + direction: downward)']], phases: [['Changes on the Moon?', 'Yes: gravity is weaker'], ['Measured with', 'a spring balance / newton meter']] }
          ]
        },
        {
          type: 'formulas', items: [
            { name: 'Weight', f: 'W = m × g', html: 'W = weight (N), m = mass (kg), g = gravitational field strength (N/kg).', units: 'N' },
            { name: 'Earth', f: 'g ≈ 10 N/kg', html: 'More precisely 9.8 N/kg. Use whichever value the question gives.', units: 'N/kg' },
            { name: 'Moon', f: 'g ≈ 1.6 N/kg', html: 'About one-sixth of Earth’s, so you weigh about 1/6 as much.', units: 'N/kg' }
          ]
        },
        {
          type: 'worked', q: 'An astronaut has a mass of 60 kg. Find her weight on Earth (g = 10 N/kg) and on the Moon (g = 1.6 N/kg).',
          steps: ['On Earth: W = m × g = 60 × 10 = <strong>600 N</strong>', 'On the Moon: W = 60 × 1.6 = <strong>96 N</strong>', 'Her <strong>mass</strong> is still 60 kg in both places.'],
          answer: 'Earth 600 N · Moon 96 N · mass stays 60 kg'
        },
        {
          type: 'worked', q: 'A box weighs 250 N on Earth (g = 10 N/kg). What is its mass?',
          steps: ['Rearrange: m = W ÷ g', 'm = 250 ÷ 10 = <strong>25 kg</strong>'],
          answer: '25 kg'
        },
        { type: 'callout', tone: 'info', title: 'Gravitational field strength', html: '<strong>g</strong> is the force of gravity on each kilogram. A bigger planet with more mass has a bigger g. Gravity is a <strong>non-contact</strong> force: it acts without touching.' }
      ]
    },
    {
      id: 'forces', title: 'Forces and their effects', nav: 'Forces', icon: 'fa-hand-back-fist',
      blocks: [
        { type: 'lead', html: 'A <strong>force</strong> is a push or a pull. It is measured in <strong>newtons (N)</strong> and it is a <strong>vector</strong>: it has size and direction.' },
        { type: 'components', title: 'A force can change an object’s…', items: [['fa-gauge-high', 'speed'], ['fa-diamond-turn-right', 'direction'], ['fa-shapes', 'shape'], ['fa-play', 'start it moving'], ['fa-stop', 'stop it moving']] },
        {
          type: 'compare', items: [
            { title: 'Contact forces', color: '#f59e0b', summary: [['Need', 'the objects to touch']], phases: [['Friction', 'opposes motion between surfaces'], ['Normal reaction', 'a surface pushing back up on an object'], ['Tension', 'pull in a stretched rope or string'], ['Air resistance (drag)', 'friction from air or water'], ['Applied force', 'a direct push or pull'], ['Upthrust', 'upward push of a liquid or gas']] },
            { title: 'Non-contact forces', color: '#8b5cf6', summary: [['Need', 'no touching: they act across a gap (a field)']], phases: [['Gravitational', 'pull between masses (gives weight)'], ['Magnetic', 'between magnets / magnetic materials'], ['Electrostatic', 'between charged objects'], ['Nuclear', 'holds the nucleus together']] }
          ]
        },
        { type: 'heading', text: 'Balanced vs unbalanced' },
        {
          type: 'grid', cols: 2, items: [
            { icon: 'fa-scale-balanced', title: 'Balanced forces', sub: 'Resultant force = 0', html: 'Equal forces in opposite directions. The object stays <strong>still</strong> or keeps moving at a <strong>steady speed in a straight line</strong>.' },
            { icon: 'fa-scale-unbalanced', title: 'Unbalanced forces', sub: 'Resultant force ≠ 0', html: 'The object <strong>speeds up, slows down or changes direction</strong> in the direction of the resultant force.' }
          ]
        },
        {
          type: 'formulas', items: [
            { name: 'Same direction', f: 'R = F₁ + F₂', html: 'Add forces that point the same way.', units: 'N' },
            { name: 'Opposite directions', f: 'R = F₁ − F₂', html: 'Subtract; the resultant points the way of the bigger force.', units: 'N' },
            { name: 'Newton’s 2nd law', f: 'F = m × a', html: 'Resultant force = mass × acceleration.', units: 'N = kg × m/s²' }
          ]
        },
        {
          type: 'worked', q: 'A 1200 kg car has a driving force of 3000 N and friction + air resistance of 600 N. Find the resultant force and the acceleration.',
          steps: ['Forces are opposite, so subtract: 3000 − 600 = <strong>2400 N</strong> forward', 'a = F ÷ m = 2400 ÷ 1200', '= <strong>2 m/s²</strong>'],
          answer: 'Resultant 2400 N forward, acceleration 2 m/s²'
        },
        { type: 'callout', tone: 'tip', icon: 'fa-pen', title: 'Force diagrams (free-body diagrams)', html: 'Draw the object as a box or dot. Draw each force as an <strong>arrow</strong> starting on the object, pointing the way the force acts, longer arrows for bigger forces, and <strong>label each one</strong> with its name and size.' }
      ]
    },
    {
      id: 'moments', title: 'Moments and the principle of moments', nav: 'Moments', icon: 'fa-scale-balanced',
      blocks: [
        { type: 'lead', html: 'A <strong>moment</strong> is the turning effect of a force about a pivot (fulcrum).' },
        {
          type: 'formulas', items: [
            { name: 'Moment', f: 'M = F × d', html: 'd is the <strong>perpendicular</strong> distance from the pivot to the line of the force.', units: 'newton metre (N m)' },
            { name: 'Principle of moments', f: 'Σ clockwise = Σ anticlockwise', html: 'For an object in equilibrium, total clockwise moments equal total anticlockwise moments about any point.', units: 'N m' },
            { name: 'Also in equilibrium', f: 'Σ up = Σ down', html: 'Total upward forces equal total downward forces (so the pivot pushes up with the total weight).', units: 'N' }
          ]
        },
        { type: 'widget', name: 'moments' },
        {
          type: 'worked', q: 'Kemar (400 N) sits 2 m to the left of a see-saw’s pivot. Where must Andre (500 N) sit on the right to balance it?',
          steps: ['Anticlockwise moment (left) = 400 × 2 = <strong>800 N m</strong>', 'Clockwise moment (right) = 500 × d', 'Balanced, so 500 × d = 800', 'd = 800 ÷ 500 = <strong>1.6 m</strong> from the pivot'],
          answer: '1.6 m to the right of the pivot'
        },
        {
          type: 'worked', q: 'A uniform 1 m ruler is pivoted at the 50 cm mark. A 2 N weight hangs at the 10 cm mark. Where must a 4 N weight hang to balance it?',
          steps: ['The ruler is uniform and pivoted at its middle, so its own weight has <strong>no moment</strong> (it acts through the pivot).', 'Distance of 2 N from pivot = 50 − 10 = 40 cm = 0.4 m → moment = 2 × 0.4 = <strong>0.8 N m</strong> anticlockwise', '4 N × d = 0.8 → d = <strong>0.2 m</strong> = 20 cm', 'So hang it at 50 + 20 = <strong>70 cm mark</strong>'],
          answer: 'At the 70 cm mark'
        },
        {
          type: 'worked', q: 'A uniform beam 4 m long weighing 100 N is pivoted 1 m from its left end. What force on the left end will balance it?',
          steps: ['A uniform beam’s weight acts at its <strong>centre</strong>: 2 m from the left end, so 2 − 1 = <strong>1 m</strong> right of the pivot.', 'Clockwise moment of beam = 100 × 1 = <strong>100 N m</strong>', 'Force on left end is 1 m from pivot: F × 1 = 100', 'F = <strong>100 N</strong>'],
          answer: '100 N downward on the left end'
        },
        {
          type: 'grid', cols: 4, items: [
            { icon: 'fa-wrench', title: 'Spanner', html: 'A longer handle = bigger d = bigger moment, so a nut is easier to undo.' },
            { icon: 'fa-door-open', title: 'Door handle', html: 'Placed far from the hinges (pivot) so a small force opens the door.' },
            { icon: 'fa-dolly', title: 'Wheelbarrow', html: 'The wheel is the pivot; long handles let you lift a heavy load.' },
            { icon: 'fa-hammer', title: 'Crowbar / claw hammer', html: 'Long arm, small force → big turning effect at the short end.' }
          ]
        }
      ]
    },
    {
      id: 'stability', title: 'Centre of gravity and stability', nav: 'Stability & CoG', icon: 'fa-cubes-stacked',
      blocks: [
        { type: 'lead', html: 'The <strong>centre of gravity (CoG)</strong> is the point through which the whole weight of an object seems to act.' },
        {
          type: 'grid', cols: 3, items: [
            { icon: 'fa-circle-down', title: 'Stable equilibrium', sub: 'Returns to position', html: 'Tilt it slightly and it falls <strong>back</strong>. The CoG <strong>rises</strong> when it is tilted. Example: a cone on its base.' },
            { icon: 'fa-circle-up', title: 'Unstable equilibrium', sub: 'Falls over', html: 'Tilt it slightly and it topples. The CoG <strong>falls</strong> when tilted. Example: a cone balanced on its point.' },
            { icon: 'fa-circle-dot', title: 'Neutral equilibrium', sub: 'Stays in new position', html: 'The CoG stays at the <strong>same height</strong>. Example: a ball, or a cone on its side.' }
          ]
        },
        {
          type: 'grid', cols: 2, items: [
            { icon: 'fa-arrow-down', title: 'Low centre of gravity', html: 'Makes an object more stable: racing cars, buses with heavy engines low down, a wide-based lamp.' },
            { icon: 'fa-arrows-left-right', title: 'Wide base', html: 'The weight’s line of action stays inside the base for longer when tilted.' }
          ]
        },
        { type: 'callout', tone: 'info', icon: 'fa-person-falling', title: 'When does it topple?', html: 'An object topples when the vertical line through its centre of gravity falls <strong>outside its base</strong>. The weight then makes a moment that turns it over.' },
        {
          type: 'gizmo', badge: 'Practical', icon: 'fa-location-crosshairs', name: 'Finding the centre of gravity of an irregular lamina', topic: 'Mechanics practical: plumb-line method',
          goalLabel: 'Aim', goal: 'To find the centre of gravity of a flat, irregular piece of card (a lamina).',
          stepsLabel: 'Method',
          steps: [
            'Make three small holes near the edge of the card, far apart from each other.',
            'Hang the card from a pin through one hole so it can <strong>swing freely</strong>. Hang a <strong>plumb line</strong> (thread + small weight) from the same pin.',
            'When the card and plumb line stop moving, mark the line of the thread on the card and draw a straight line.',
            'Repeat by hanging the card from the second hole.',
            'The point where the lines cross is the <strong>centre of gravity</strong>.',
            'Check using the third hole: its line should pass through the same point.'
          ],
          extra: [
            { title: 'Precautions', list: ['Make sure the card swings freely on the pin (holes not too tight).', 'Wait until the card and plumb line are completely still before marking.', 'Mark the line with a sharp pencil.', 'Keep the plumb line close to, but not rubbing, the card.'] },
            { title: 'Sources of error', list: ['Friction at the pin stops the card hanging in its true position.', 'A thick pencil line makes the crossing point less exact.', 'Parallax when marking the thread’s position.', 'Draughts making the thread move.'] }
          ],
          conclusion: 'The weight of a freely hanging object always acts straight down through the point of suspension, so the centre of gravity lies on every vertical line drawn. Where the lines meet is the centre of gravity.',
          questions: [
            { q: 'Why does the centre of gravity lie on the plumb line?', a: 'A freely hanging object comes to rest with its centre of gravity directly below the pivot.', why: 'Then the weight has no turning moment about the pin.' },
            { q: 'Why use a third hole?', a: 'To check the result.', why: 'The third line should pass through the same crossing point.' }
          ]
        }
      ]
    },
    {
      id: 'vectors', title: 'Scalars and vectors', nav: 'Vectors', icon: 'fa-up-down-left-right',
      blocks: [
        {
          type: 'compare', items: [
            { title: 'Scalar', color: '#3b82f6', summary: [['Has', 'size (magnitude) only']], phases: [['Examples', 'mass, distance, speed, time, temperature, energy, volume, density']] },
            { title: 'Vector', color: '#f59e0b', summary: [['Has', 'size <strong>and</strong> direction']], phases: [['Examples', 'force, weight, displacement, velocity, acceleration, momentum']] }
          ]
        },
        { type: 'text', html: 'A vector is drawn as an <strong>arrow</strong>: the length (to scale) shows its size and the arrowhead shows its direction. The single vector that has the same effect as two or more vectors is the <strong>resultant</strong>. The <strong>equilibrant</strong> is equal in size but opposite in direction to the resultant: it would balance them.' },
        {
          type: 'formulas', items: [
            { name: 'Same direction', f: 'R = A + B', html: 'Arrows in line: add.', units: '' },
            { name: 'Opposite directions', f: 'R = A − B', html: 'Direction of the bigger one.', units: '' },
            { name: 'At right angles (size)', f: 'R = √(A² + B²)', html: 'Pythagoras.', units: '' },
            { name: 'At right angles (direction)', f: 'θ = tan⁻¹(opp ÷ adj)', html: 'Angle measured from the first vector.', units: 'degrees' }
          ]
        },
        {
          type: 'worked', q: 'Two forces act on a point: 3 N east and 4 N north. Find the resultant.',
          steps: ['They are at right angles, so use Pythagoras: R = √(3² + 4²) = √25 = <strong>5 N</strong>', 'Direction: tan θ = 4 ÷ 3 → θ = tan⁻¹(1.33) ≈ <strong>53°</strong>', 'So the resultant is <strong>5 N at 53° north of east</strong>.', 'The equilibrant is 5 N at 53° south of west.'],
          answer: '5 N at about 53° north of east'
        },
        { type: 'heading', text: 'Scale drawings' },
        {
          type: 'steps', items: [
            { title: 'Choose a scale', html: 'e.g. <strong>1 cm = 1 N</strong>. Write it on the diagram.' },
            { title: 'Triangle (head-to-tail) method', html: 'Draw the first vector. Start the second vector at the <strong>head</strong> of the first. The resultant goes from the tail of the first to the head of the last.' },
            { title: 'Parallelogram method', html: 'Draw both vectors from the <strong>same point</strong> at the correct angle. Complete the parallelogram with parallel lines. The <strong>diagonal</strong> from the start point is the resultant.' },
            { title: 'Measure', html: 'Measure the resultant’s length with a ruler and convert using the scale. Measure its angle with a protractor.' }
          ]
        },
        { type: 'callout', tone: 'tip', icon: 'fa-lightbulb', title: 'Check yourself', html: 'The resultant of two forces is always between (A − B) and (A + B). For 3 N and 4 N it must be between 1 N and 7 N.' }
      ]
    },
    {
      id: 'lab-skills', title: 'Lab skills and reports', nav: 'Lab Skills', icon: 'fa-clipboard-check',
      blocks: [
        {
          type: 'steps', items: [
            { title: 'Aim', html: 'What you are trying to find out.' },
            { title: 'Apparatus / materials', html: 'List of everything you used.' },
            { title: 'Method', html: 'Numbered steps, past tense, passive voice (“The card <strong>was</strong> hung…”).' },
            { title: 'Results', html: 'Tables with headings and <strong>units in the column heading</strong>. Graphs: title, labelled axes with units, sensible scale, best-fit line.' },
            { title: 'Calculations / discussion', html: 'Show the formula, substitution and answer with units. Explain what the results mean.' },
            { title: 'Precautions & sources of error', html: 'Precautions are things you <strong>did</strong> to get accurate results. Sources of error are things that may still make results wrong.' },
            { title: 'Conclusion', html: 'Answer the aim in one or two sentences.' }
          ]
        },
        {
          type: 'grid', cols: 2, items: [
            { icon: 'fa-hashtag', title: 'Significant figures', html: 'Count from the first non-zero digit. 0.0450 has <strong>3</strong> s.f. Give answers to the same s.f. as the least precise data.' },
            { icon: 'fa-chart-line', title: 'Gradient of a graph', html: 'Gradient = rise ÷ run = change in y ÷ change in x. Use a big triangle on the best-fit line.' }
          ]
        }
      ]
    }
  ],

  quiz: [
    { q: 'What is the least count of a standard Vernier caliper?', options: ['0.1 mm', '1 mm', '0.01 mm', '0.5 mm'], answer: 0, why: '10 Vernier divisions = 9 mm, so the difference is 1 − 0.9 = 0.1 mm.' },
    { q: 'Main scale = 41 mm, Vernier line 4 coincides. The reading is…', options: ['41.4 mm', '41.04 mm', '45 mm', '4.14 mm'], answer: 0, why: '41 + 4 × 0.1 = 41.4 mm.' },
    { q: 'A caliper reads 30.5 mm and has a zero error of +0.2 mm. The corrected reading is…', options: ['30.3 mm', '30.7 mm', '30.5 mm', '30.1 mm'], answer: 0, why: 'Corrected = reading − zero error = 30.5 − 0.2.' },
    { q: 'Which part of a Vernier caliper measures the inside diameter of a pipe?', options: ['Inside (upper) jaws', 'Outside jaws', 'Depth probe', 'Lock screw'], answer: 0, why: 'The small upper jaws open outward against the inner walls.' },
    { q: 'A block has mass 120 g and volume 40 cm³. Its density is…', options: ['3 g/cm³', '4800 g/cm³', '0.33 g/cm³', '160 g/cm³'], answer: 0, why: 'ρ = m ÷ V = 120 ÷ 40.' },
    { q: '2.5 g/cm³ in kg/m³ is…', options: ['2500 kg/m³', '25 kg/m³', '0.0025 kg/m³', '250 kg/m³'], answer: 0, why: 'Multiply by 1000.' },
    { q: 'An object of density 0.8 g/cm³ is placed in water. It will…', options: ['float', 'sink', 'stay at the bottom', 'dissolve'], answer: 0, why: 'It is less dense than water (1 g/cm³).' },
    { q: 'Water rises from 40 cm³ to 55 cm³ when a stone is added. The stone’s volume is…', options: ['15 cm³', '95 cm³', '55 cm³', '40 cm³'], answer: 0, why: 'Displacement: 55 − 40.' },
    { q: 'Which is true about mass?', options: ['It is the same on Earth and the Moon', 'It is measured in newtons', 'It is a vector', 'It changes with gravity'], answer: 0, why: 'Mass is the amount of matter; only weight changes.' },
    { q: 'A 5 kg bag on Earth (g = 10 N/kg) weighs…', options: ['50 N', '5 N', '0.5 N', '15 N'], answer: 0, why: 'W = mg = 5 × 10.' },
    { q: 'Which is a non-contact force?', options: ['Magnetic force', 'Friction', 'Tension', 'Normal reaction'], answer: 0, why: 'Magnetic, gravitational and electrostatic forces act at a distance.' },
    { q: 'Forces of 50 N right and 20 N left act on a box. The resultant is…', options: ['30 N right', '70 N right', '30 N left', '0 N'], answer: 0, why: 'Opposite: 50 − 20 = 30 N towards the bigger force.' },
    { q: 'The unit of a moment is…', options: ['N m', 'N', 'N/m', 'kg m'], answer: 0, why: 'Moment = force (N) × distance (m).' },
    { q: 'A 20 N force acts 0.5 m from a pivot. The moment is…', options: ['10 N m', '40 N m', '20.5 N m', '0.025 N m'], answer: 0, why: '20 × 0.5 = 10 N m.' },
    { q: 'A 300 N child sits 2 m left of a pivot. What force 1.5 m to the right balances it?', options: ['400 N', '225 N', '450 N', '600 N'], answer: 0, why: '300 × 2 = 600 N m; 600 ÷ 1.5 = 400 N.' },
    { q: 'The principle of moments says that in equilibrium…', options: ['total clockwise moments = total anticlockwise moments', 'all forces are equal', 'the pivot has no force', 'clockwise moments are bigger'], answer: 0, why: 'That is the condition for no turning.' },
    { q: 'Which makes an object MORE stable?', options: ['Low centre of gravity and wide base', 'High centre of gravity', 'Narrow base', 'Heavy top'], answer: 0, why: 'The line of the weight stays inside the base for longer.' },
    { q: 'An object topples when…', options: ['the line of action of its weight falls outside its base', 'its mass increases', 'its base is wide', 'it is in stable equilibrium'], answer: 0, why: 'Then the weight makes a turning moment that tips it over.' },
    { q: 'A ball on a flat floor is in…', options: ['neutral equilibrium', 'stable equilibrium', 'unstable equilibrium', 'no equilibrium'], answer: 0, why: 'Its centre of gravity stays at the same height when it rolls.' },
    { q: 'Which is a vector quantity?', options: ['Velocity', 'Speed', 'Mass', 'Time'], answer: 0, why: 'Velocity has size and direction.' },
    { q: 'Forces of 6 N and 8 N act at right angles. The resultant is…', options: ['10 N', '14 N', '2 N', '48 N'], answer: 0, why: '√(36 + 64) = √100 = 10 N.' },
    { q: 'The equilibrant of a resultant force is…', options: ['equal in size and opposite in direction', 'twice the resultant', 'at right angles to it', 'always zero'], answer: 0, why: 'It cancels the resultant to produce equilibrium.' }
  ],

  flashcards: [
    ['Least count of a Vernier caliper', '0.1 mm (0.01 cm)', 'Vernier'],
    ['Vernier reading formula', 'Main-scale reading + (coinciding Vernier line × 0.1 mm)', 'Vernier'],
    ['Corrected reading', 'Reading − zero error', 'Vernier'],
    ['Positive zero error', 'Vernier zero is to the right of main-scale zero when jaws are closed; readings too big', 'Vernier'],
    ['Negative zero error', 'Vernier zero is to the left of main-scale zero; readings too small, so you add', 'Vernier'],
    ['Parallax error', 'Error from reading a scale at an angle; avoid by keeping your eye level with the mark', 'Vernier'],
    ['Density', 'Mass per unit volume: ρ = m ÷ V', 'Density'],
    ['Units of density', 'g/cm³ or kg/m³ (1 g/cm³ = 1000 kg/m³)', 'Density'],
    ['Displacement method', 'Volume of irregular solid = rise in water level in a measuring cylinder', 'Density'],
    ['Why does ice float?', 'Ice (0.92 g/cm³) is less dense than water (1 g/cm³)', 'Density'],
    ['Mass', 'Amount of matter in an object; kg; scalar; same everywhere', 'Mass & weight'],
    ['Weight', 'Force of gravity on a mass; N; vector; W = mg', 'Mass & weight'],
    ['g on Earth', 'About 10 N/kg (9.8 N/kg)', 'Mass & weight'],
    ['Force', 'A push or pull, measured in newtons (N); a vector', 'Forces'],
    ['Contact forces', 'Friction, normal reaction, tension, air resistance, applied force, upthrust', 'Forces'],
    ['Non-contact forces', 'Gravitational, magnetic, electrostatic, nuclear', 'Forces'],
    ['Resultant force', 'The single force with the same effect as all the forces acting', 'Forces'],
    ['Balanced forces', 'Resultant = 0: object stays still or moves at constant velocity', 'Forces'],
    ['Newton’s 2nd law', 'F = ma (resultant force = mass × acceleration)', 'Forces'],
    ['Moment', 'Turning effect of a force: force × perpendicular distance from pivot (N m)', 'Moments'],
    ['Principle of moments', 'In equilibrium, sum of clockwise moments = sum of anticlockwise moments', 'Moments'],
    ['Where does a uniform beam’s weight act?', 'At its centre (midpoint)', 'Moments'],
    ['Centre of gravity', 'The point through which the whole weight of an object appears to act', 'Stability'],
    ['Stable equilibrium', 'Returns to its position when tilted; CoG rises when tilted', 'Stability'],
    ['Unstable equilibrium', 'Topples when tilted slightly; CoG falls', 'Stability'],
    ['Neutral equilibrium', 'Stays in its new position; CoG stays at the same height', 'Stability'],
    ['Two ways to increase stability', 'Lower the centre of gravity; widen the base', 'Stability'],
    ['Scalar', 'Size only: mass, speed, distance, time, energy', 'Vectors'],
    ['Vector', 'Size and direction: force, weight, velocity, displacement, acceleration', 'Vectors'],
    ['Equilibrant', 'Force equal in size and opposite in direction to the resultant', 'Vectors'],
    ['Parallelogram method', 'Draw both vectors from one point, complete the parallelogram; the diagonal is the resultant', 'Vectors']
  ]
});
