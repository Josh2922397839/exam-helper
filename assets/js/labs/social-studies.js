/* ExamForge interactive tools — Social Studies (see assets/js/core/interactive.js for the tool kinds) */
window.EF = window.EF || {};
(EF.labs = EF.labs || {})['social-studies'] = [
  { id: 'family-types', kind: 'sort', topic: 'family', title: 'Family types', desc: 'Sort each family into the right type.',
    buckets: ['Nuclear', 'Extended', 'Single-parent', 'Blended'],
    items: [
      ['Two parents and their children', 0], ['Mom, Dad and the kids in their own home', 0],
      ['Grandparents, parents and children together', 1, 'Three or more generations'], ['Aunts, uncles and cousins living close by', 1],
      ['A mother raising her children alone', 2], ['A father and his son, no other parent at home', 2],
      ['Parents with children from earlier relationships', 3], ['A stepfather, a mother and their children', 3]
    ] },
  { id: 'culture', kind: 'sort', topic: 'culture', title: 'Tangible or intangible culture?', desc: 'Can you touch it? Sort the parts of Jamaican culture.',
    buckets: ['Tangible (you can touch it)', 'Intangible (ideas and practices)'],
    items: [
      ['Ackee and saltfish', 0], ['Jerk chicken', 0], ['Clothing and dress', 0], ['Buildings', 0], ['Crafts and art', 0], ['Musical instruments', 0],
      ['Patois', 1, 'Language is intangible'], ['Beliefs and values', 1], ['Reggae as a music style', 1, 'UNESCO lists it as Intangible Cultural Heritage'], ['Anansi stories', 1], ['Dance', 1], ['Customs', 1]
    ] },
  { id: 'culture-roots', kind: 'sort', topic: 'culture', title: 'Where Jamaican culture comes from', desc: 'Match each part of Jamaican culture to the people who brought it.',
    buckets: ['African', 'European', 'Indian', 'Chinese', 'Taíno'],
    items: [
      ['Drumming and Kumina', 0], ['Jonkonnu', 0], ['Anansi stories', 0], ['Ackee (from West Africa)', 0],
      ['The English language', 1], ['Cricket', 1], ['Parliament and law', 1], ['Spanish place names like Ocho Rios', 1],
      ['Curry and roti', 2], ['The Hosay festival', 2],
      ['Shopkeeping and businesses', 3],
      ['The words hammock, canoe and barbecue', 4], ['The name Jamaica (from Xaymaca)', 4]
    ] },
  { id: 'integration', kind: 'order', topic: 'integration', title: 'Caribbean integration timeline', desc: 'Put the steps of regional integration in order.',
    prompt: 'Tap the events in order, starting with the earliest.',
    steps: [
      ['West Indies Federation begins', '1958: ten British colonies join as one country'],
      ['Jamaica votes to leave', '1961 referendum'],
      ['The Federation ends', '1962: Trinidad and Tobago leaves too'],
      ['CARIFTA', '1965 / 1968: the Caribbean Free Trade Association'],
      ['CARICOM', '1973: the Treaty of Chaguaramas'],
      ['CSME', '2001 onward: the Revised Treaty of Chaguaramas']
    ] },
  { id: 'government', kind: 'sort', topic: 'government', title: 'Branches of government', desc: 'Which branch does each job or group belong to?',
    buckets: ['Legislature (makes laws)', 'Executive (carries out laws)', 'Judiciary (interprets laws)'],
    items: [
      ['Parliament', 0], ['The House of Representatives and the Senate', 0], ['Debates and passes bills', 0], ['Approves the budget', 0],
      ['The Prime Minister and Cabinet', 1], ['Runs ministries and public services', 1], ['Prepares the budget', 1],
      ['Parish Courts and the Supreme Court', 2], ['Judges cases fairly', 2], ['Interprets laws and settles disputes', 2]
    ] }
];
