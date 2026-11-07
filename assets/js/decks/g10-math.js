/* Zing deck — Mathematics (Grade 10): extra cards.
   Each card: [question, answer, [three wrong answers], why]. Cards are grouped by topic. */
window.EF = window.EF || {};
(EF.decks = EF.decks || {}).math = [
  { tag: 'Percentages and ratio', cards: [
    ['Increase $5,000 by 15%.', '$5,750', ['$5,150', '$750', '$5,015'], '15% of 5,000 = 750, and 5,000 + 750 = 5,750.'],
    ['A $1,200 phone is sold for $900. What is the percentage discount?', '25%', ['30%', '75%', '33%'], 'The discount is $300, and 300 ÷ 1,200 = 0.25.'],
    ['Share $120 in the ratio 1 : 3.', '$30 and $90', ['$40 and $80', '$20 and $100', '$60 and $60'], 'There are 4 parts, so each part is $30.'],
    ['4 pens cost $260. What do 7 pens cost?', '$455', ['$1,040', '$520', '$390'], 'One pen costs $65, and 7 × 65 = 455.']
  ] },
  { tag: 'Indices and standard form', cards: [
    ['Simplify x⁵ × x³.', 'x⁸', ['x¹⁵', 'x²', '2x⁸'], 'When multiplying, add the powers.'],
    ['Simplify y⁹ ÷ y⁴.', 'y⁵', ['y¹³', 'y³⁶', 'y⁴'], 'When dividing, subtract the powers.'],
    ['What is 5⁰?', '1', ['0', '5', '50'], 'Any nonzero number to the power 0 is 1.'],
    ['What is 2⁻³?', '1/8', ['−8', '−6', '8'], 'a⁻ⁿ = 1/aⁿ, so 2⁻³ = 1/2³ = 1/8.'],
    ['Write 45,000 in standard form.', '4.5 × 10⁴', ['45 × 10³', '4.5 × 10³', '0.45 × 10⁵'], 'The first number must be at least 1 and less than 10.'],
    ['Write 0.0062 in standard form.', '6.2 × 10⁻³', ['6.2 × 10³', '62 × 10⁻⁴', '0.62 × 10⁻²'], 'The decimal point moves 3 places right, so the power is −3.'],
    ['Round 3.4567 to 3 significant figures.', '3.46', ['3.45', '3.457', '3.4'], 'The 4th figure is 6 (5 or more), so round up.'],
    ['What is log₁₀ 1000?', '3', ['100', '30', '10'], '10³ = 1000.'],
    ['What is log₂ 32?', '5', ['16', '6', '4'], '2⁵ = 32.']
  ] },
  { tag: 'Equations', cards: [
    ['Solve 3x + 5 = 20.', 'x = 5', ['x = 25/3', 'x = 15', 'x = 8'], 'Subtract 5: 3x = 15, then divide by 3.'],
    ['Solve x + y = 10 and x − y = 4.', 'x = 7, y = 3', ['x = 3, y = 7', 'x = 6, y = 4', 'x = 14, y = −4'], 'Adding the equations gives 2x = 14, so x = 7 and y = 3.'],
    ['Solve 2x > 8.', 'x > 4', ['x < 4', 'x > 16', 'x > 6'], 'Divide both sides by 2; dividing by a positive number keeps the sign.']
  ] },
  { tag: 'Shape and space', cards: [
    ['Find the area of a circle with radius 7 cm (π = 22/7).', '154 cm²', ['44 cm²', '22 cm²', '308 cm²'], 'A = πr² = 22/7 × 49 = 154.'],
    ['Find the circumference of a circle with diameter 14 cm (π = 22/7).', '44 cm', ['154 cm', '22 cm', '88 cm'], 'C = πd = 22/7 × 14 = 44.'],
    ['Find the volume of a 5 cm × 4 cm × 3 cm cuboid.', '60 cm³', ['12 cm³', '47 cm³', '120 cm³'], 'V = length × width × height.'],
    ['What do the angles around a point add up to?', '360°', ['180°', '90°', '270°'], 'A full turn is 360°.'],
    ['A right triangle has legs of 6 cm and 8 cm. How long is the hypotenuse?', '10 cm', ['14 cm', '48 cm', '7 cm'], '√(6² + 8²) = √100 = 10.'],
    ['In a right triangle, what is sin θ?', 'Opposite ÷ hypotenuse', ['Adjacent ÷ hypotenuse', 'Opposite ÷ adjacent', 'Hypotenuse ÷ opposite'], 'SOH: sine = opposite over hypotenuse.'],
    ['If tan θ = 1, what is θ?', '45°', ['30°', '60°', '90°'], 'At 45° the opposite and adjacent sides are equal.'],
    ['What is an angle of elevation?', 'The angle measured up from the horizontal to an object', ['The angle measured down from the horizontal', 'Any angle over 90°', 'The angle at the top of a triangle'], 'Looking down from the horizontal gives an angle of depression.']
  ] },
  { tag: 'Speed and data', cards: [
    ['A bus travels 150 km in 3 hours. What is its average speed?', '50 km/h', ['450 km/h', '153 km/h', '0.02 km/h'], 'Speed = distance ÷ time.'],
    ['How long does 240 km take at 60 km/h?', '4 hours', ['14,400 hours', '0.25 hours', '3 hours'], 'Time = distance ÷ speed.'],
    ['On a distance–time graph, what does a flat (horizontal) line mean?', 'The object has stopped', ['A constant speed', 'Speeding up', 'Going backwards'], 'The distance isn’t changing.'],
    ['What is the mode of 3, 5, 5, 7, 9?', '5', ['7', '5.8', '6'], 'The mode is the most common value.'],
    ['Find the mean of 4, 6, 8 and 10.', '7', ['28', '6', '8'], '(4 + 6 + 8 + 10) ÷ 4 = 28 ÷ 4 = 7.'],
    ['What is the range of 2, 9, 4, 15, 7?', '13', ['15', '7', '9'], 'Range = largest − smallest = 15 − 2.']
  ] }
];
