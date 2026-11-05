/* ExamForge content — Physical Education */
window.EF = window.EF || {};
EF.subjects = EF.subjects || [];

(function () {
  // The 3D skeleton uses these exact names, so keep them in sync with assets/js/core/three-scenes.js
  var bones = [
    { name: 'Cranium', location: 'Head (skull)', type: 'Flat bone', count: '8 cranial bones (22 in the whole skull)', desc: 'The cranium is the bony case that protects the brain. Its bones are fused together at immovable joints called sutures.', fact: 'A baby is born with about 300 bones, but many fuse together — adults end up with 206!' },
    { name: 'Clavicle', location: 'Shoulder (collarbone)', type: 'Long bone', count: '2 (left and right)', desc: 'The clavicle connects the arm to the body and helps stabilise the shoulder. It is one of the most commonly broken bones.', fact: 'The clavicle is the only long bone that lies horizontally in the body.' },
    { name: 'Scapula', location: 'Upper back (shoulder blade)', type: 'Flat bone', count: '2 (left and right)', desc: 'A triangular bone that connects the humerus with the clavicle. Many arm and chest muscles attach to it.', fact: 'The scapula can move in 6 different directions, making it one of the most mobile bones.' },
    { name: 'Humerus', location: 'Upper arm', type: 'Long bone', count: '2 (left and right)', desc: 'The largest bone in the arm. It connects the shoulder to the elbow.', fact: 'Hitting your “funny bone” is really hitting the ulnar nerve near the humerus — nothing funny about it!' },
    { name: 'Radius', location: 'Forearm (thumb side)', type: 'Long bone', count: '2 (left and right)', desc: 'The shorter forearm bone. It lets the forearm and hand rotate (pronation and supination).', fact: 'The radius rotates around the ulna when you turn your palm up and down.' },
    { name: 'Ulna', location: 'Forearm (little-finger side)', type: 'Long bone', count: '2 (left and right)', desc: 'The longer forearm bone. It forms the point of the elbow and stabilises the forearm.', fact: 'The ulna is the bone you lean on when you rest your elbow on a table.' },
    { name: 'Carpals', location: 'Wrist', type: 'Short bone', count: '16 (8 per wrist)', desc: 'Eight small bones in each wrist arranged in two rows. They connect the forearm to the hand and let the wrist bend and rotate smoothly.', fact: 'The scaphoid is the most commonly broken carpal — often from falling onto an outstretched hand!' },
    { name: 'Ribs', location: 'Chest (thorax)', type: 'Flat bone', count: '24 (12 pairs)', desc: 'The ribs form a cage that protects the heart and lungs. Pairs 1–7 are “true ribs” (joined to the sternum), 8–10 are “false ribs” and 11–12 are “floating ribs.”', fact: 'About 1 in 200 people are born with an extra (cervical) rib!' },
    { name: 'Sternum', location: 'Centre of chest (breastbone)', type: 'Flat bone', count: '1', desc: 'A flat bone at the front of the chest. It connects to the ribs with cartilage and protects the heart, lungs and major blood vessels.', fact: 'CPR chest compressions push down on the sternum about 5–6 cm to pump the heart by hand.' },
    { name: 'Vertebral Column', location: 'Spine (backbone)', type: 'Irregular bone', count: '33 vertebrae (26 bones in adults)', desc: '7 cervical, 12 thoracic, 5 lumbar, 5 sacral (fused) and 4 coccygeal (fused). It protects the spinal cord and holds the body upright.', fact: 'You’re about 1 cm taller in the morning — your spinal discs squash a little during the day!' },
    { name: 'Pelvis', location: 'Hip region', type: 'Flat bone', count: '1 (3 fused bones per side)', desc: 'The pelvis carries the weight of the upper body to the legs and protects the bladder and reproductive organs.', fact: 'The female pelvis is wider and rounder than the male pelvis to allow for childbirth.' },
    { name: 'Femur', location: 'Upper leg (thigh)', type: 'Long bone', count: '2 (left and right)', desc: 'The longest, heaviest and strongest bone in the body. It supports your full weight for walking, running and jumping.', fact: 'Bone for bone, the femur is incredibly strong — it can handle forces many times your body weight.' },
    { name: 'Patella', location: 'Knee (kneecap)', type: 'Sesamoid bone', count: '2 (left and right)', desc: 'A small triangular bone in front of the knee joint. It protects the joint and improves the leverage of the quadriceps.', fact: 'Babies’ kneecaps start as cartilage and only harden into bone between ages 2 and 6.' },
    { name: 'Tibia', location: 'Lower leg (shinbone)', type: 'Long bone', count: '2 (left and right)', desc: 'The larger lower-leg bone, carrying most of your weight. It connects the knee to the ankle.', fact: 'The tibia is the second largest bone in the body after the femur.' },
    { name: 'Fibula', location: 'Lower leg (outer side)', type: 'Long bone', count: '2 (left and right)', desc: 'The thin bone beside the tibia. Mainly a muscle attachment point that helps stabilise the ankle.', fact: 'Even though it’s a leg bone, the fibula carries very little of your body weight!' },
    { name: 'Tarsals', location: 'Ankle / foot', type: 'Short bone', count: '14 (7 per foot)', desc: 'Seven bones in each foot that form the ankle and back of the foot. The largest is the calcaneus (heel bone).', fact: 'Each foot has 26 bones, 33 joints and over 100 muscles, tendons and ligaments!' }
  ];

  var drugs = [
    { name: 'Anabolic steroids', icon: 'fa-pills', color: '#f0506e', desc: 'Synthetic versions of testosterone. Promote muscle growth and male characteristics.', examples: 'Nandrolone, Stanozolol, Testosterone', benefits: 'More muscle mass and strength, faster recovery', risks: 'Heart enlargement, liver damage, mood swings (“roid rage”), infertility, acne, hair loss' },
    { name: 'Stimulants', icon: 'fa-bolt', color: '#f5a524', desc: 'Increase alertness, attention and energy. Improve endurance and reduce tiredness.', examples: 'Amphetamines, Ephedrine, Cocaine', benefits: 'Better endurance and stamina, more focus', risks: 'High blood pressure, heart attack risk, anxiety, addiction' },
    { name: 'Hormones (EPO & HGH)', icon: 'fa-vial', color: '#9b6bff', desc: 'EPO makes the body produce more red blood cells. HGH promotes muscle growth and repair.', examples: 'Erythropoietin (EPO), Human Growth Hormone (HGH)', benefits: 'Carries more oxygen, muscle growth', risks: 'Blood clots, heart attack, stroke, abnormal organ growth' },
    { name: 'Diuretics', icon: 'fa-droplet', color: '#4f7cff', desc: 'Make you produce more urine. Used to lose weight fast or to hide other banned drugs.', examples: 'Furosemide, Hydrochlorothiazide', benefits: 'Rapid weight loss, masking other drugs', risks: 'Dehydration, kidney problems, electrolyte imbalance' },
    { name: 'Beta-2 agonists', icon: 'fa-wind', color: '#14b8a6', desc: 'Relax the airway muscles so breathing is easier. Some also build muscle.', examples: 'Salbutamol, Clenbuterol', benefits: 'Easier breathing, possible muscle growth', risks: 'Heart palpitations, tremors, headaches' },
    { name: 'Glucocorticoids', icon: 'fa-shield-halved', color: '#2fbf71', desc: 'Steroid hormones that reduce inflammation. Can be abused for pain relief.', examples: 'Cortisone, Prednisone', benefits: 'Pain relief, less inflammation, play through injuries', risks: 'Weaker immune system, bone density loss, weight gain' }
  ];

  EF.subjects.push({
    id: 'pe',
    name: 'Physical Education',
    short: 'PE',
    icon: 'fa-person-running',
    emoji: '🏃',
    color: '#f0506e',
    tagline: 'Skeletal system, muscles and drugs in sport',
    intro: 'Explore a 3D skeleton you can spin and click, learn the 16 major bones, the three muscle types, and why doping is banned.',

    data: { bones: bones },

    topics: [
      {
        id: 'pe-skeleton', title: 'Interactive 3D Skeleton', nav: '3D Skeleton', icon: 'fa-bone',
        blocks: [
          { type: 'text', html: 'Click any bone on the model (or pick one from the list) to learn about it. Drag to rotate.' },
          { type: 'widget', name: 'skeleton' }
        ]
      },
      {
        id: 'pe-bones', title: 'Major Bones of the Body', nav: 'Major Bones', icon: 'fa-list-ol',
        blocks: [
          { type: 'grid', cols: 3, expand: true, numbered: true, items: bones.map(function (b) {
            return { title: b.name, sub: b.location, html: b.desc, more: '<p><strong>Type:</strong> ' + b.type + ' · <strong>Count:</strong> ' + b.count + '</p><p class="fact">💡 ' + b.fact + '</p>' };
          }) },
          { type: 'table', title: 'Bone types', head: ['Type', 'Shape', 'Examples'], rows: [
            ['Long', 'Longer than wide; act as levers', 'Femur, humerus, tibia, radius'],
            ['Short', 'Cube-shaped; strength and small movements', 'Carpals, tarsals'],
            ['Flat', 'Thin and flat; protect organs, big muscle attachment', 'Cranium, sternum, ribs, scapula, pelvis'],
            ['Irregular', 'Complex shapes', 'Vertebrae'],
            ['Sesamoid', 'Sit inside a tendon', 'Patella']
          ] }
        ]
      },
      {
        id: 'pe-muscles', title: 'Types of Muscle', nav: 'Muscle Types', icon: 'fa-dumbbell',
        blocks: [
          { type: 'text', html: 'The muscular system lets you move, holds your posture, produces heat (about <strong>85% of body heat</strong>), protects internal organs and helps blood circulate.' },
          {
            type: 'grid', cols: 3,
            items: [
              { icon: 'fa-hand-fist', color: '#f0506e', title: 'Skeletal muscle', rows: [['Where', 'Attached to bones'], ['Looks', 'Striated (striped)'], ['Control', 'Voluntary'], ['Job', 'Movement, posture, heat'], ['Cells', 'Long, cylindrical, many nuclei']] },
              { icon: 'fa-lungs', color: '#e255b4', title: 'Smooth muscle', rows: [['Where', 'Walls of internal organs'], ['Looks', 'Not striated (smooth)'], ['Control', 'Involuntary'], ['Job', 'Pushes substances along, controls blood vessel width'], ['Cells', 'Spindle-shaped, one nucleus']] },
              { icon: 'fa-heart-pulse', color: '#d43c5c', title: 'Cardiac muscle', rows: [['Where', 'Wall of the heart'], ['Looks', 'Striated, with intercalated discs'], ['Control', 'Involuntary'], ['Job', 'Pumps blood around the body'], ['Cells', 'Branched, one nucleus, intercalated discs']] }
            ]
          }
        ]
      },
      {
        id: 'pe-drugs', title: 'Drugs in Sport', icon: 'fa-syringe',
        blocks: [
          { type: 'text', html: '<strong>Doping</strong> is using banned substances or methods to improve performance. <strong>Performance-enhancing drugs (PEDs)</strong> are substances taken to boost athletic ability. Tap a card for examples, “benefits” and risks.' },
          { type: 'grid', cols: 3, expand: true, items: drugs.map(function (d) {
            return { icon: d.icon, color: d.color, title: d.name, html: d.desc, more: '<p><strong>Examples:</strong> ' + d.examples + '</p><p class="good"><strong>Why athletes use it:</strong> ' + d.benefits + '</p><p class="bad"><strong>Risks:</strong> ' + d.risks + '</p>' };
          }) },
          { type: 'heading', text: 'Health consequences' },
          {
            type: 'grid', cols: 3,
            items: [
              { icon: 'fa-heart-crack', color: '#f0506e', title: 'Heart & blood', list: ['Higher blood pressure', 'Heart enlargement', 'Heart attack & stroke risk', 'Blood clots (especially EPO)'] },
              { icon: 'fa-flask-vial', color: '#f5a524', title: 'Liver & hormones', list: ['Liver damage & tumours', 'Hormone imbalances', 'Infertility', 'Changes to sex characteristics'] },
              { icon: 'fa-brain', color: '#9b6bff', title: 'Mind & body', list: ['Mood swings & aggression', 'Depression & anxiety', 'Acne & hair loss', 'Stunted growth (if used young)'] }
            ]
          }
        ]
      },
      {
        id: 'pe-wada', title: 'WADA — World Anti-Doping Agency', nav: 'WADA', icon: 'fa-scale-balanced',
        blocks: [
          { type: 'text', html: 'WADA is an international, independent agency that promotes, coordinates and monitors the fight against doping in sport.' },
          {
            type: 'grid', cols: 3,
            items: [
              { icon: 'fa-list-check', title: 'Prohibited List', html: 'Creates and updates the list of banned substances and methods.' },
              { icon: 'fa-book', title: 'World Anti-Doping Code', html: 'Sets the rules all sports organisations follow.' },
              { icon: 'fa-microscope', title: 'Research & labs', html: 'Funds anti-doping research and accredits testing laboratories.' },
              { icon: 'fa-vials', title: 'Testing', html: 'Oversees testing in competition and out of competition.' },
              { icon: 'fa-graduation-cap', title: 'Education', html: 'Runs education and training programmes for athletes.' },
              { icon: 'fa-bullseye', title: 'The goal', html: 'Fair play and protecting athletes’ health.' }
            ]
          }
        ]
      }
    ],

    quiz: [
      { q: 'Which bone protects the brain?', options: ['Sternum', 'Cranium', 'Scapula', 'Pelvis'], answer: 1, why: 'The cranium is the part of the skull that encases the brain.' },
      { q: 'Skeletal muscle is controlled…', options: ['Involuntarily', 'Voluntarily', 'By hormones only', 'Automatically'], answer: 1, why: 'You choose to move skeletal muscle. Smooth and cardiac muscle are involuntary.' },
      { q: 'EPO increases the production of:', options: ['White blood cells', 'Platelets', 'Red blood cells', 'Plasma'], answer: 2, why: 'More red blood cells = more oxygen carried — but thicker blood risks clots.' },
      { q: 'About how much of your body heat is produced by muscles?', options: ['50%', '65%', '75%', '85%'], answer: 3, why: 'Muscles produce around 85% of body heat.' },
      { q: 'Cardiac muscle is found in the:', options: ['Stomach', 'Heart', 'Lungs', 'Liver'], answer: 1, why: 'Cardiac = heart. It has intercalated discs and never gets tired.' },
      { q: 'WADA stands for:', options: ['World Anti-Drug Association', 'World Anti-Doping Agency', 'World Athletics Drug Authority', 'World Anti-Doping Alliance'], answer: 1, why: 'The World Anti-Doping Agency maintains the Prohibited List.' },
      { q: 'Anabolic steroids are synthetic versions of:', options: ['Insulin', 'Oestrogen', 'Testosterone', 'Adrenaline'], answer: 2, why: 'They mimic testosterone to build muscle.' },
      { q: 'The femur is in the:', options: ['Arm', 'Thigh', 'Chest', 'Spine'], answer: 1, why: 'The femur is the thigh bone — the longest and strongest bone.' },
      { q: 'Why might an athlete misuse diuretics?', options: ['To build muscle', 'To lose weight fast or hide other drugs', 'To breathe more easily', 'To reduce pain'], answer: 1, why: 'Diuretics flush water out — quick weight loss and masking banned substances.' },
      { q: 'Which type of muscle is found in the walls of internal organs?', options: ['Skeletal', 'Cardiac', 'Smooth', 'Striated'], answer: 2, why: 'Smooth muscle lines organs like the stomach, intestines and blood vessels.' },
      { q: 'How many pairs of ribs do most people have?', options: ['10', '12', '14', '24'], answer: 1, why: '12 pairs (24 ribs): 7 true, 3 false, 2 floating.' },
      { q: 'The patella is an example of which bone type?', options: ['Long', 'Flat', 'Sesamoid', 'Irregular'], answer: 2, why: 'Sesamoid bones sit inside a tendon — the kneecap sits in the quadriceps tendon.' }
    ],

    flashcards: bones.map(function (b) { return [b.name, b.location + ' — ' + b.type.toLowerCase(), 'Bones']; }).concat(drugs.map(function (d) {
      return [d.name, d.desc + ' Risks: ' + d.risks + '.', 'Drugs in sport'];
    })).concat([
      ['Skeletal muscle', 'Voluntary, striated, attached to bones', 'Muscles'],
      ['Smooth muscle', 'Involuntary, not striated, in organ walls', 'Muscles'],
      ['Cardiac muscle', 'Involuntary, striated, intercalated discs, heart only', 'Muscles'],
      ['WADA', 'World Anti-Doping Agency — keeps the Prohibited List', 'Doping']
    ])
  });
})();
