/* ExamForge content — French */
window.EF = window.EF || {};
EF.subjects = EF.subjects || [];

(function () {
  var vocab = {
    'Chores': [
      ['faire la vaisselle', 'to do the dishes'], ['passer l’aspirateur', 'to vacuum'], ['sortir les poubelles', 'to take out the trash'],
      ['nettoyer la cuisine', 'to clean the kitchen'], ['faire le lit', 'to make the bed'], ['laver les vêtements', 'to wash clothes'],
      ['étendre le linge', 'to hang the laundry'], ['repasser', 'to iron'], ['balayer', 'to sweep'], ['ranger sa chambre', 'to tidy your room']
    ],
    'School day': [
      ['se réveiller', 'to wake up'], ['se lever', 'to get up'], ['prendre une douche', 'to shower'],
      ['se brosser les dents', 'to brush your teeth'], ['s’habiller', 'to get dressed'], ['prendre le petit déjeuner', 'to have breakfast'],
      ['un cahier', 'a notebook'], ['un stylo', 'a pen'], ['un crayon', 'a pencil'], ['une gomme', 'an eraser'],
      ['un sac à dos', 'a backpack'], ['un livre', 'a book'], ['une trousse', 'a pencil case'], ['une règle', 'a ruler']
    ],
    'Food': [
      ['le pain', 'bread'], ['le fromage', 'cheese'], ['les fruits', 'fruit'], ['les légumes', 'vegetables'],
      ['la viande', 'meat'], ['le poisson', 'fish'], ['le poulet', 'chicken'], ['l’eau', 'water'],
      ['le lait', 'milk'], ['le jus d’orange', 'orange juice'], ['le café', 'coffee'], ['le thé', 'tea'],
      ['le sucre', 'sugar'], ['le sel', 'salt'], ['le beurre', 'butter'], ['les œufs', 'eggs'],
      ['la salade', 'salad'], ['la soupe', 'soup'], ['le gâteau', 'cake'], ['le chocolat', 'chocolate']
    ],
    'Clothing': [
      ['une chemise', 'a shirt'], ['un t-shirt', 'a T-shirt'], ['un pantalon', 'trousers / pants'], ['un jean', 'jeans'],
      ['une jupe', 'a skirt'], ['une robe', 'a dress'], ['un pull', 'a sweater'], ['un manteau', 'a coat'],
      ['des chaussures', 'shoes'], ['des chaussettes', 'socks'], ['une veste', 'a jacket'],
      ['un chapeau', 'a hat'], ['une écharpe', 'a scarf'], ['des gants', 'gloves']
    ],
    'Aches & pains': [
      ['J’ai mal à la tête', 'I have a headache'], ['J’ai mal au dos', 'My back hurts'], ['J’ai mal à l’estomac', 'I have a stomach ache'],
      ['J’ai mal à la gorge', 'I have a sore throat'], ['J’ai mal à l’oreille', 'I have an earache'],
      ['J’ai mal au pied', 'My foot hurts'], ['J’ai mal à la main', 'My hand hurts'], ['J’ai mal au genou', 'My knee hurts']
    ],
    'Family': [
      ['la mère', 'mother'], ['le père', 'father'], ['la sœur', 'sister'], ['le frère', 'brother'],
      ['le fils', 'son'], ['la fille', 'daughter'], ['le grand-père', 'grandfather'], ['la grand-mère', 'grandmother'],
      ['l’oncle', 'uncle'], ['la tante', 'aunt'], ['le cousin', 'cousin (male)'], ['la cousine', 'cousin (female)']
    ]
  };

  var verbs = [
    { name: 'parler', meaning: 'to speak', type: 'Regular -er', forms: ['parle', 'parles', 'parle', 'parlons', 'parlez', 'parlent'] },
    { name: 'finir', meaning: 'to finish', type: 'Regular -ir', forms: ['finis', 'finis', 'finit', 'finissons', 'finissez', 'finissent'] },
    { name: 'vendre', meaning: 'to sell', type: 'Regular -re', forms: ['vends', 'vends', 'vend', 'vendons', 'vendez', 'vendent'] },
    { name: 'être', meaning: 'to be', type: 'Irregular', forms: ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'] },
    { name: 'avoir', meaning: 'to have', type: 'Irregular', elide: true, forms: ['ai', 'as', 'a', 'avons', 'avez', 'ont'] },
    { name: 'aller', meaning: 'to go', type: 'Irregular', forms: ['vais', 'vas', 'va', 'allons', 'allez', 'vont'] },
    { name: 'faire', meaning: 'to do / make', type: 'Irregular', forms: ['fais', 'fais', 'fait', 'faisons', 'faites', 'font'] },
    { name: 'venir', meaning: 'to come', type: 'Irregular', forms: ['viens', 'viens', 'vient', 'venons', 'venez', 'viennent'] },
    { name: 'pouvoir', meaning: 'can / to be able', type: 'Irregular', forms: ['peux', 'peux', 'peut', 'pouvons', 'pouvez', 'peuvent'] },
    { name: 'vouloir', meaning: 'to want', type: 'Irregular', forms: ['veux', 'veux', 'veut', 'voulons', 'voulez', 'veulent'] }
  ];

  // French numbers 0–100, generated with the real rules (vingt et un, soixante-dix, quatre-vingts…)
  function frenchNumber(n) {
    var units = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
    var tens = { 20: 'vingt', 30: 'trente', 40: 'quarante', 50: 'cinquante', 60: 'soixante' };
    if (n <= 16) return units[n];
    if (n < 20) return 'dix-' + units[n - 10];
    if (n === 100) return 'cent';
    if (n < 70) {
      var t = Math.floor(n / 10) * 10, u = n % 10;
      if (u === 0) return tens[t];
      if (u === 1) return tens[t] + ' et un';
      return tens[t] + '-' + units[u];
    }
    if (n < 80) {
      if (n === 71) return 'soixante et onze';
      return 'soixante-' + frenchNumber(n - 60);
    }
    if (n === 80) return 'quatre-vingts';
    return 'quatre-vingt-' + frenchNumber(n - 80);
  }
  var numbers = [];
  for (var i = 0; i <= 100; i++) numbers.push([i, frenchNumber(i)]);

  var vocabCards = [];
  Object.keys(vocab).forEach(function (k) { vocab[k].forEach(function (p) { vocabCards.push([p[0], p[1], k]); }); });

  EF.subjects.push({
    id: 'french',
    name: 'French',
    short: 'French',
    icon: 'fa-language',
    emoji: '🇫🇷',
    color: '#4f7cff',
    lang: 'fr-FR',
    tagline: 'Vocabulary, conjugation, numbers and ordering food',
    intro: 'Vocabulary flashcards with real pronunciation, a verb conjugation trainer, all the numbers from 0 to 100, and the phrases you need to order food.',

    data: { vocab: vocab, verbs: verbs, numbers: numbers },

    topics: [
      {
        id: 'vocabulary', title: 'Vocabulary', icon: 'fa-layer-group',
        blocks: [
          { type: 'text', html: 'Pick a topic, tap a card to flip it, and hit the speaker to hear it in French. Switch to <strong>Practice</strong> to test yourself.' },
          { type: 'widget', name: 'vocab' }
        ]
      },
      {
        id: 'conjugation', title: 'Verb Conjugation Trainer', nav: 'Conjugation', icon: 'fa-spell-check',
        blocks: [
          { type: 'text', html: 'Choose a verb to see it in the present tense. Regular verbs follow a pattern — irregular ones you just have to learn.' },
          { type: 'widget', name: 'conjugation' },
          {
            type: 'grid', cols: 3,
            items: [
              { title: '-er verbs', badge: 'parler', html: 'Drop -er, add: <strong>‑e, ‑es, ‑e, ‑ons, ‑ez, ‑ent</strong>' },
              { title: '-ir verbs', badge: 'finir', html: 'Drop -ir, add: <strong>‑is, ‑is, ‑it, ‑issons, ‑issez, ‑issent</strong>' },
              { title: '-re verbs', badge: 'vendre', html: 'Drop -re, add: <strong>‑s, ‑s, (nothing), ‑ons, ‑ez, ‑ent</strong>' }
            ]
          }
        ]
      },
      {
        id: 'numbers', title: 'Numbers 0–100', nav: 'Numbers', icon: 'fa-hashtag',
        blocks: [
          { type: 'text', html: 'Tap any number to hear it. Watch out for the tricky ones: <strong>70 = soixante-dix</strong> (60 + 10), <strong>80 = quatre-vingts</strong> (4 × 20), <strong>90 = quatre-vingt-dix</strong> (4 × 20 + 10).' },
          { type: 'widget', name: 'numbers' }
        ]
      },
      {
        id: 'prepositions', title: 'Prepositions', icon: 'fa-link',
        blocks: [
          { type: 'terms', items: [
            ['à', 'to, at, in'], ['de', 'of, from, about'], ['en', 'in, by'], ['sur', 'on, over'],
            ['sous', 'under, below'], ['devant', 'in front of'], ['derrière', 'behind'], ['dans', 'in, inside'],
            ['avec', 'with'], ['sans', 'without'], ['pour', 'for, in order to'], ['par', 'by, through']
          ], speak: true },
          { type: 'phrases', title: 'Example sentences', items: [
            ['Je vais à Paris.', 'I am going to Paris.'],
            ['Le livre est sur la table.', 'The book is on the table.'],
            ['Il habite en France.', 'He lives in France.'],
            ['C’est un cadeau pour toi.', 'This is a gift for you.']
          ] }
        ]
      },
      {
        id: 'reflexive', title: 'Reflexive Verbs & Pronouns', nav: 'Reflexive Verbs', icon: 'fa-arrows-rotate',
        blocks: [
          { type: 'text', html: 'Reflexive verbs describe something you do to <em>yourself</em>. They use a reflexive pronoun that matches the subject.' },
          {
            type: 'grid', cols: 2,
            items: [
              { title: 'Reflexive pronouns', rows: [['me', 'myself (je)'], ['te', 'yourself (tu, informal)'], ['se', 'himself / herself / itself / themselves (il, elle, on, ils, elles)'], ['nous', 'ourselves (nous)'], ['vous', 'yourself / yourselves (vous)']] },
              { title: 'Se laver — to wash oneself', html: '<p>Je <mark>me</mark> lave</p><p>Tu <mark>te</mark> laves</p><p>Il / Elle / On <mark>se</mark> lave</p><p>Nous <mark>nous</mark> lavons</p><p>Vous <mark>vous</mark> lavez</p><p>Ils / Elles <mark>se</mark> lavent</p>' }
            ]
          },
          { type: 'terms', title: 'Common reflexive verbs', items: [
            ['s’habiller', 'to get dressed'], ['se lever', 'to get up'], ['se coucher', 'to go to bed'],
            ['s’appeler', 'to be called'], ['se promener', 'to go for a walk'], ['s’intéresser à', 'to be interested in'],
            ['se réveiller', 'to wake up'], ['se brosser les dents', 'to brush your teeth'], ['se coiffer', 'to do your hair']
          ], speak: true }
        ]
      },
      {
        id: 'accents', title: 'French Accents', nav: 'Accents', icon: 'fa-pen-nib',
        blocks: [
          {
            type: 'grid', cols: 3,
            items: [
              { big: 'é', title: 'accent aigu', html: 'Sounds like “ay” in <em>say</em>.', foot: 'école (school)' },
              { big: 'è', title: 'accent grave', html: 'Sounds like “e” in <em>bet</em>.', foot: 'mère (mother)' },
              { big: 'ê', title: 'accent circonflexe', html: 'Sounds like è. Often shows a letter “s” used to be there (fête ≈ feast).', foot: 'fête (party)' },
              { big: 'ç', title: 'cédille', html: 'Goes under “c” before a, o, u to make a soft “s” sound.', foot: 'français (French)' },
              { big: 'à', title: 'accent grave on a', html: 'Tells <strong>à</strong> (to / at) apart from <strong>a</strong> (has).', foot: 'à bientôt (see you soon)' },
              { big: 'ù', title: 'accent grave on u', html: 'Only used in <strong>où</strong> (where) to tell it apart from <strong>ou</strong> (or).', foot: 'Où est… ? (Where is… ?)' }
            ]
          }
        ]
      },
      {
        id: 'ordering', title: 'How to Order Food', nav: 'Ordering Food', icon: 'fa-utensils',
        blocks: [
          { type: 'phrases', title: 'Key phrases', items: [
            ['Je voudrais…', 'I would like…'],
            ['Je vais prendre…', 'I will have…'],
            ['Pour moi, ce sera…', 'For me, it will be…'],
            ['Qu’est-ce que vous recommandez ?', 'What do you recommend?'],
            ['L’addition, s’il vous plaît.', 'The bill, please.'],
            ['C’est délicieux !', 'It’s delicious!']
          ] },
          { type: 'dialogue', title: 'Example dialogue', items: [
            ['Serveur', 'Bonjour, qu’est-ce que vous désirez ?', 'Hello, what would you like?'],
            ['Client', 'Bonjour. Je voudrais une salade verte et un verre de vin rouge, s’il vous plaît.', 'Hello. I would like a green salad and a glass of red wine, please.'],
            ['Serveur', 'Très bien. Et pour vous ?', 'Very good. And for you?'],
            ['Client', 'Pour moi, je vais prendre le poulet rôti.', 'For me, I will have the roast chicken.']
          ] }
        ]
      },
      {
        id: 'weather', title: 'Weather & Subject Pronouns', nav: 'Weather & Pronouns', icon: 'fa-cloud-sun',
        blocks: [
          { type: 'phrases', title: 'Weather phrases', items: [
            ['Il fait beau.', 'The weather is nice.'], ['Il fait chaud.', 'It’s hot.'], ['Il fait froid.', 'It’s cold.'],
            ['Il pleut.', 'It’s raining.'], ['Il neige.', 'It’s snowing.'], ['Il y a du soleil.', 'It’s sunny.'],
            ['Il y a du vent.', 'It’s windy.'], ['Le ciel est nuageux.', 'It’s cloudy.']
          ] },
          { type: 'terms', title: 'Subject pronouns', items: [
            ['je', 'I'], ['tu', 'you (informal)'], ['il', 'he / it'], ['elle', 'she / it'], ['on', 'one / we / people'],
            ['nous', 'we'], ['vous', 'you (formal or plural)'], ['ils', 'they (male / mixed)'], ['elles', 'they (female)']
          ], speak: true }
        ]
      }
    ],

    quiz: [
      { q: 'What does “faire la vaisselle” mean?', options: ['To vacuum', 'To do the dishes', 'To sweep', 'To iron'], answer: 1, why: '“La vaisselle” = the dishes. “Passer l’aspirateur” = to vacuum.' },
      { q: 'How do you say “I would like” in French?', options: ['J’ai besoin', 'Je voudrais', 'Je peux', 'Je vais'], answer: 1, why: '“Je voudrais” is the polite way to ask for something.' },
      { q: 'What number is “quatre-vingts”?', options: ['40', '60', '80', '90'], answer: 2, why: 'Quatre-vingts = 4 × 20 = 80.' },
      { q: 'Which is the correct form of “finir” for “nous”?', options: ['Nous finis', 'Nous finons', 'Nous finissons', 'Nous finissez'], answer: 2, why: 'Regular -ir verbs add -issons for nous: nous finissons.' },
      { q: '“Il fait froid” means:', options: ['It is hot', 'It is raining', 'It is cold', 'It is sunny'], answer: 2, why: 'Froid = cold. Chaud = hot.' },
      { q: 'The reflexive pronoun that goes with “je” is:', options: ['te', 'se', 'me', 'nous'], answer: 2, why: 'Je me lave — I wash myself.' },
      { q: 'What does “un sac à dos” mean?', options: ['A pencil case', 'A notebook', 'A backpack', 'A ruler'], answer: 2, why: 'Literally “a bag on the back.” A pencil case is “une trousse.”' },
      { q: 'The accent on “é” is called:', options: ['accent grave', 'accent aigu', 'accent circonflexe', 'cédille'], answer: 1, why: 'é = accent aigu, è = accent grave, ê = circonflexe, ç = cédille.' },
      { q: 'How do you say 71 in French?', options: ['soixante-et-un', 'soixante et onze', 'septante-un', 'soixante-onze-un'], answer: 1, why: '71 = 60 + 11 = soixante et onze.' },
      { q: '“Nous ___ (être)” — fill the gap:', options: ['sommes', 'êtes', 'sont', 'suis'], answer: 0, why: 'Être: je suis, tu es, il est, nous sommes, vous êtes, ils sont.' },
      { q: 'What does “J’ai mal à la gorge” mean?', options: ['I have a headache', 'I have a sore throat', 'My knee hurts', 'I have an earache'], answer: 1, why: 'La gorge = the throat.' },
      { q: 'Which preposition means “behind”?', options: ['devant', 'sous', 'derrière', 'dans'], answer: 2, why: 'Derrière = behind. Devant = in front of.' }
    ],

    flashcards: vocabCards.map(function (c) { return [c[0], c[1], c[2]]; })
  });
})();
