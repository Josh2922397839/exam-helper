/* ExamForge interactive tools — French (see assets/js/core/interactive.js for the tool kinds) */
window.EF = window.EF || {};
(EF.labs = EF.labs || {}).french = [
  { id: 'vocab-trainer', kind: 'widget', name: 'vocab', topic: 'vocabulary', title: 'Vocabulary trainer', desc: 'Practise French words by theme, with sound.' },
  { id: 'conjugator', kind: 'widget', name: 'conjugation', topic: 'conjugation', title: 'Verb conjugator', desc: 'Pick a verb and see every form, with sound.' },
  { id: 'numbers', kind: 'widget', name: 'numbers', topic: 'numbers', title: 'Number builder', desc: 'Turn any number into French words and hear it.' },
  { id: 'verb-groups', kind: 'sort', topic: 'conjugation', title: 'Sort the verbs', desc: 'Is each verb a regular -er, -ir or -re verb, or irregular?',
    buckets: ['Regular -er', 'Regular -ir', 'Regular -re', 'Irregular'],
    items: [
      ['parler (to speak)', 0], ['jouer (to play)', 0], ['regarder (to watch)', 0],
      ['finir (to finish)', 1], ['choisir (to choose)', 1], ['remplir (to fill)', 1],
      ['vendre (to sell)', 2], ['attendre (to wait)', 2], ['répondre (to answer)', 2],
      ['être (to be)', 3], ['avoir (to have)', 3], ['aller (to go)', 3], ['faire (to do, to make)', 3], ['venir (to come)', 3], ['pouvoir (to be able to)', 3], ['vouloir (to want)', 3]
    ] }
];
