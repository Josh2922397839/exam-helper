/* ExamForge interactive tools — Principles of Business (see assets/js/core/interactive.js for the tool kinds) */
window.EF = window.EF || {};
(EF.labs = EF.labs || {}).pob = [
  { id: 'money-functions', kind: 'sort', topic: 'money', title: 'What is money doing?', desc: 'Sort each example into the function of money it shows.',
    buckets: ['Medium of exchange', 'Measure of value', 'Store of value', 'Standard of deferred payment'],
    items: [
      ['Paying $500 for a patty and a drink', 0], ['Buying shoes without finding someone who wants yams', 0, 'Money solves the double coincidence of wants'],
      ['A shirt is priced at J$2,000', 1], ['Comparing the prices of two bikes', 1],
      ['Saving money to spend next year', 2], ['Keeping cash in a savings account', 2],
      ['Paying for a car in monthly instalments', 3], ['Repaying a loan over five years', 3]
    ] },
  { id: 'ownership', kind: 'sort', topic: 'ownership', title: 'Forms of business ownership', desc: 'Sort the clues into the right kind of business.',
    buckets: ['Sole trader', 'Partnership', 'Limited company', 'Co-operative'],
    items: [
      ['One owner keeps all the profit', 0], ['A corner shop or barber', 0], ['No continuity if the owner dies', 0],
      ['Two or more owners, usually up to 20', 1], ['A deed of partnership', 1], ['Law firms and doctors', 1],
      ['Owned by shareholders', 2], ['Limited liability', 2], ['Can sell shares on the Jamaica Stock Exchange (PLC)', 2],
      ['Owned and run by its members', 3], ['One member, one vote', 3]
    ] },
  { id: 'economic-systems', kind: 'sort', topic: 'economic-systems', title: 'Economic systems', desc: 'Traditional, command, market or mixed?',
    buckets: ['Traditional', 'Command (planned)', 'Market (free enterprise)', 'Mixed'],
    items: [
      ['Decisions follow custom and tradition', 0], ['Farming and fishing for the family’s own use', 0],
      ['The government owns most resources', 1], ['The government decides what, how and for whom', 1], ['Cuba and North Korea', 1],
      ['Supply and demand decide what is made', 2], ['Private individuals own the resources', 2], ['The USA is the closest example', 2],
      ['A private sector and a public sector', 3], ['Jamaica and the UK', 3]
    ] },
  { id: 'departments', kind: 'sort', topic: 'functional-areas', title: 'Which department?', desc: 'Sort each job into the functional area that does it.',
    buckets: ['Human resources', 'Finance', 'Marketing', 'Production', 'Purchasing'],
    items: [
      ['Advertise jobs and interview', 0], ['Induction and training', 0],
      ['Pay wages and bills', 1], ['Plan budgets', 1],
      ['Market research', 2], ['The 4 Ps: product, price, place, promotion', 2],
      ['Quality control', 3], ['Schedule production and maintain machines', 3],
      ['Buy raw materials and equipment', 4], ['Stock control', 4]
    ] }
];
