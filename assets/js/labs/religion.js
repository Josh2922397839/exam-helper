/* Zing interactive tools — Religious Education (see assets/js/core/interactive.js for the tool kinds) */
window.EF = window.EF || {};
(EF.labs = EF.labs || {}).religion = [
  { id: 'which-religion', kind: 'sort', topic: 'world-religions', title: 'Which religion?', desc: 'Sort holy books, beliefs, practices and people into the five world religions.',
    buckets: ['Christianity', 'Islam', 'Judaism', 'Hinduism', 'Buddhism'],
    items: [
      ['The Bible', 0], ['Baptism and Holy Communion', 0], ['The Trinity', 0], ['The Apostles Peter and Paul', 0],
      ['The Quran', 1], ['The Five Pillars', 1], ['Hajj to Mecca', 1], ['Prophet Muhammad', 1],
      ['The Torah and the Talmud', 2], ['Keeping the Sabbath', 2], ['Passover and Yom Kippur', 2], ['Kosher food laws (Kashrut)', 2],
      ['The Vedas and the Bhagavad Gita', 3], ['Karma, Samsara and Moksha', 3], ['Vishnu, Shiva and Devi', 3],
      ['The Four Noble Truths', 4], ['The Eightfold Path', 4], ['Siddhartha Gautama', 4]
    ] },
  { id: 'jacobs-journey', kind: 'order', topic: 'genesis-27-33', title: 'Jacob’s journey', desc: 'Put the big moments of Jacob’s life in order, from Genesis 25 to 33.',
    prompt: 'Tap the events in the order they happen, starting with Esau and the stew.',
    steps: [
      ['Esau sells his birthright', 'For a bowl of red lentil stew (Genesis 25)'],
      ['Jacob tricks Isaac into blessing him', 'Wearing goat skins to feel hairy like Esau (Genesis 27)'],
      ['Jacob dreams of a ladder at Bethel', 'God repeats His promises to him (Genesis 28)'],
      ['Laban tricks Jacob into marrying Leah', 'After Jacob works seven years for Rachel (Genesis 29)'],
      ['Jacob marries Rachel too', 'Then he works seven more years for Laban'],
      ['Jacob grows rich and secretly leaves Laban', 'Rachel takes her father’s household idols (Genesis 30–31)'],
      ['Jacob wrestles with God and becomes Israel', 'By the Jabbok River, at Peniel (Genesis 32)'],
      ['Jacob and Esau make peace', 'Esau runs to hug and kiss him (Genesis 33)']
    ] }
];
