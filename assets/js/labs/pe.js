/* ExamForge interactive tools — Physical Education (see assets/js/core/interactive.js for the tool kinds) */
window.EF = window.EF || {};
(EF.labs = EF.labs || {}).pe = [
  { id: 'skeleton', kind: 'widget', name: 'skeleton', topic: 'pe-skeleton', title: '3D skeleton', desc: 'Spin a full 3D skeleton, tap any bone to learn about it, and play find-the-bone.' },
  { id: 'bone-types', kind: 'sort', topic: 'pe-bones', title: 'Sort the bones by type', desc: 'Long, short, flat, irregular or sesamoid? Sort the major bones.',
    buckets: ['Long', 'Short', 'Flat', 'Irregular', 'Sesamoid'],
    items: [
      ['Femur', 0], ['Humerus', 0], ['Tibia', 0], ['Clavicle', 0], ['Phalanges', 0],
      ['Carpals', 1], ['Tarsals', 1],
      ['Cranium', 2], ['Ribs', 2], ['Scapula', 2], ['Sternum', 2], ['Pelvis', 2],
      ['Vertebrae', 3], ['Mandible', 3],
      ['Patella', 4]
    ] },
  { id: 'muscle-types', kind: 'sort', topic: 'pe-muscles', title: 'Which muscle type?', desc: 'Sort each fact into skeletal, smooth or cardiac muscle.',
    buckets: ['Skeletal', 'Smooth', 'Cardiac'],
    items: [
      ['Attached to bones', 0], ['Voluntary', 0], ['Long cells with many nuclei', 0], ['Moves you and holds your posture', 0],
      ['In the walls of the stomach and gut', 1], ['Controls how wide blood vessels are', 1], ['Spindle-shaped cells', 1], ['Not striated', 1],
      ['Only in the heart', 2], ['Intercalated discs', 2], ['Branched cells', 2], ['Pumps blood around the body', 2]
    ] },
  { id: 'doping-drugs', kind: 'sort', topic: 'pe-drugs', title: 'What does each drug do?', desc: 'Match effects, examples and risks to the right banned drug.',
    buckets: ['Anabolic steroids', 'Stimulants', 'EPO', 'Diuretics'],
    items: [
      ['Build muscle like testosterone', 0], ['Nandrolone', 0], ['“Roid rage”', 0],
      ['Make you feel alert and less tired', 1], ['Amphetamines', 1], ['High blood pressure and addiction', 1],
      ['More red blood cells', 2], ['Thick blood: clots and strokes', 2], ['Misused by endurance athletes', 2],
      ['Lose weight fast', 3], ['Dilute urine to hide other drugs', 3], ['Misused to make a weight class', 3]
    ] }
];
