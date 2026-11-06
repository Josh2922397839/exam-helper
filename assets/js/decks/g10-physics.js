/* ExamForge deck — Physics (Grade 10): extra cards.
   Each card: [question, answer, [three wrong answers], why]. Cards are grouped by topic. */
window.EF = window.EF || {};
(EF.decks = EF.decks || {}).physics = [
  { tag: 'Vernier caliper', cards: [
    ['Main scale 23 mm, Vernier line 7 coincides. What is the reading?', '23.7 mm', ['23.07 mm', '30 mm', '2.37 mm'], '23 + 7 × 0.1 = 23.7 mm.'],
    ['A caliper reads 15.4 mm with a zero error of −0.3 mm. What is the corrected reading?', '15.7 mm', ['15.1 mm', '15.4 mm', '14.8 mm'], 'Corrected = reading − zero error = 15.4 − (−0.3) = 15.7 mm.'],
    ['Which part of a Vernier caliper measures the depth of a hole?', 'The depth rod', ['The outside jaws', 'The inside jaws', 'The main scale'], 'The depth rod slides out of the end as the jaws open.'],
    ['How much more precise is a Vernier caliper than a normal ruler?', 'About ten times: 0.1 mm instead of 1 mm', ['About twice: 0.5 mm instead of 1 mm', 'About a hundred times: 0.01 mm instead of 1 mm', 'No more precise: both read to 1 mm'], 'A normal ruler only reads to 1 mm.'],
    ['Which jaws measure the outside diameter of a rod?', 'The outside (lower) jaws', ['The inside jaws', 'The depth rod', 'The locking screw'], 'Close them gently on the outside of the object.'],
    ['What does the locking screw on a caliper do?', 'Holds the jaws still so the reading doesn’t change', ['Moves the Vernier scale to correct any zero error', 'Pushes out the depth rod to measure a hole’s depth', 'Converts the reading from millimetres to centimetres'], 'Lock it before you take the caliper away to read it.']
  ] },
  { tag: 'Density', cards: [
    ['A 600 g stone has a volume of 200 cm³. What is its density?', '3 g/cm³', ['0.33 g/cm³', '1200 g/cm³', '800 g/cm³'], 'ρ = m ÷ V = 600 ÷ 200.'],
    ['A liquid’s density is 0.8 g/cm³. What is the mass of 50 cm³ of it?', '40 g', ['62.5 g', '0.016 g', '400 g'], 'm = ρ × V = 0.8 × 50.'],
    ['Aluminium’s density is 2.7 g/cm³. What volume does 54 g take up?', '20 cm³', ['145.8 cm³', '51.3 cm³', '2 cm³'], 'V = m ÷ ρ = 54 ÷ 2.7.'],
    ['Convert 1500 kg/m³ to g/cm³.', '1.5 g/cm³', ['15 g/cm³', '1,500,000 g/cm³', '0.15 g/cm³'], 'Divide kg/m³ by 1000 to get g/cm³.'],
    ['A 2 cm × 3 cm × 5 cm block has a mass of 60 g. What is its density?', '2 g/cm³', ['30 g/cm³', '0.5 g/cm³', '10 g/cm³'], 'Volume = 30 cm³, so ρ = 60 ÷ 30.'],
    ['Will an object of density 1.3 g/cm³ float or sink in water?', 'Sink', ['Float', 'Float halfway', 'Rise to the top'], 'It is denser than water (1 g/cm³).']
  ] },
  { tag: 'Mass and weight', cards: [
    ['A 60 kg astronaut lands on the Moon (g = 1.6 N/kg). What is their mass there?', '60 kg', ['9.6 kg', '96 kg', '10 kg'], 'Mass doesn’t change from place to place; only weight does.'],
    ['What does a 60 kg astronaut weigh on the Moon (g = 1.6 N/kg)?', '96 N', ['600 N', '60 N', '37.5 N'], 'W = mg = 60 × 1.6.'],
    ['An object weighs 50 N on Earth (g = 10 N/kg). What is its mass?', '5 kg', ['500 kg', '50 kg', '0.5 kg'], 'm = W ÷ g = 50 ÷ 10.'],
    ['Which instrument measures weight?', 'A spring balance (newton meter)', ['A triple beam balance', 'A Vernier caliper', 'A measuring cylinder'], 'Mass is measured with a balance; weight is a force.'],
    ['Is weight a scalar or a vector?', 'A vector: it has a size and acts downward', ['A scalar', 'Neither', 'It depends on the planet'], 'Weight is a force, and forces are vectors.']
  ] },
  { tag: 'Forces', cards: [
    ['Name three things a force can change about an object.', 'Its speed, direction and shape', ['Its mass, colour and density', 'Its volume, mass and temperature', 'Its material, age and mass'], 'A force can also start or stop it moving.'],
    ['A 4 kg trolley has a resultant force of 12 N. What is its acceleration?', '3 m/s²', ['48 m/s²', '0.33 m/s²', '16 m/s²'], 'a = F ÷ m = 12 ÷ 4.'],
    ['What force accelerates a 1000 kg car at 2 m/s²?', '2000 N', ['500 N', '1002 N', '20,000 N'], 'F = ma = 1000 × 2.'],
    ['Which force opposes motion between two surfaces?', 'Friction', ['Tension', 'Upthrust', 'Magnetism'], 'Friction is a contact force.'],
    ['Which force pushes up on an object in water?', 'Upthrust', ['Friction', 'Tension', 'Weight'], 'Upthrust is a contact force from the liquid.'],
    ['A box is pushed with 30 N forward while friction is 30 N backward. What happens?', 'It stays still or keeps moving at a constant velocity', ['It speeds up, because the push is still acting on it', 'It slows down, because friction always wins in the end', 'It moves backward, because friction acts last'], 'The forces are balanced: the resultant is 0.'],
    ['Which force acts in a stretched rope?', 'Tension', ['Upthrust', 'Normal reaction', 'Air resistance'], 'Tension is the pull in strings, ropes and cables.']
  ] },
  { tag: 'Moments', cards: [
    ['A 50 N force acts 0.4 m from a pivot. What is the moment?', '20 N m', ['125 N m', '50.4 N m', '200 N m'], 'M = F × d = 50 × 0.4.'],
    ['Why is a door easier to open when you push far from the hinge?', 'A bigger distance gives a bigger moment for the same force', ['The door is lighter at its edge than near the hinge', 'There is less friction at the edge of the door', 'The hinge pushes back less when you are far from it'], 'Moment = force × perpendicular distance.'],
    ['A 400 N person sits 1.5 m from a seesaw’s pivot. Where must a 300 N person sit to balance?', '2 m from the pivot', ['1.5 m from the pivot', '1.125 m from the pivot', '4 m from the pivot'], '400 × 1.5 = 300 × d, so d = 600 ÷ 300 = 2 m.'],
    ['In M = F × d, how is d measured?', 'From the pivot, perpendicular to the line of the force', ['Along the beam, from the pivot to the end of the beam', 'From the ground, straight up to where the force acts', 'From the centre of gravity to the end of the beam'], 'Only the perpendicular distance counts.'],
    ['30 N and 50 N weights hang from a beam balanced on a pivot. What is the upward force at the pivot (ignore the beam’s weight)?', '80 N', ['20 N', '50 N', '30 N'], 'In equilibrium, total upward force = total downward force.']
  ] },
  { tag: 'Stability', cards: [
    ['Why do racing cars have a low, wide shape?', 'A low centre of gravity and a wide base make them stable', ['It only helps them go fast in a straight line', 'It makes them lighter', 'It increases air friction'], 'They are much harder to topple on corners.'],
    ['A cone balanced on its tip is in which kind of equilibrium?', 'Unstable', ['Stable', 'Neutral', 'Balanced'], 'A slight tilt makes it fall, and its centre of gravity drops.'],
    ['How can you find the centre of gravity of a flat card shape?', 'Hang it from two points; it’s where the plumb lines cross', ['Weigh it on a balance; it’s where the scale points', 'Measure it; it’s halfway along the longest side', 'Float it in water; it’s the point that sinks first'], 'When hanging, the centre of gravity is always directly below the pivot.'],
    ['Why do bus designers keep heavy parts low down?', 'It lowers the centre of gravity, so the bus is less likely to tip', ['It makes the bus faster because the engine is near the road', 'It saves fuel because the wheels carry the weight better', 'It keeps passengers cool by moving the heat away from them'], 'A lower centre of gravity increases stability.']
  ] },
  { tag: 'Scalars and vectors', cards: [
    ['Is speed a scalar or a vector?', 'A scalar', ['A vector', 'Both', 'Neither'], 'Velocity is the vector version: speed with a direction.'],
    ['Is displacement a scalar or a vector?', 'A vector', ['A scalar', 'Both', 'Neither'], 'It has size and direction; distance is the scalar version.'],
    ['Forces of 3 N and 4 N act at right angles. What is the resultant?', '5 N', ['7 N', '1 N', '12 N'], 'Pythagoras: √(3² + 4²) = √25 = 5.'],
    ['Two 10 N forces act in the same direction. What is the resultant?', '20 N', ['0 N', '10 N', '100 N'], 'Forces in the same direction add up.'],
    ['How is a vector drawn?', 'As an arrow: its length shows the size, the arrowhead the direction', ['As a dot: the size of the dot shows how big the quantity is', 'As a circle: its radius shows the size of the quantity', 'As a number only, with the unit written after it'], 'Draw the arrow to scale.']
  ] },
  { tag: 'Lab skills', cards: [
    ['In which tense and voice should a method be written?', 'Past tense, passive voice', ['Future tense, active voice', 'Present tense, first person', 'Past tense, first person'], 'For example: “The card was hung from a pin.”'],
    ['Where do units go in a results table?', 'In the column headings', ['After every number', 'Only in the title', 'At the bottom of the table'], 'For example, a column headed “Mass / g”.'],
    ['Name four things a good graph needs.', 'A title, labelled axes with units, a sensible scale and a best-fit line', ['Bright colours, pictures, a key and a decorative border', 'Only the plotted points, joined dot to dot with a ruler', 'A title, a table of results, a method and a conclusion'], 'These make the graph clear and easy to read.'],
    ['What is the “aim” of an experiment?', 'What you are trying to find out', ['The list of equipment', 'The steps you followed', 'The final answer'], 'The aim comes first in a lab report.'],
    ['What should a calculation in a lab report show?', 'The formula, the substitution and the answer with units', ['Only the final answer, rounded to a whole number', 'The units only, since the numbers are in the table', 'A first guess, then the answer from the calculator'], 'This lets the reader check your working.']
  ] }
];
