/* Zing interactive tools — English Language (see assets/js/core/interactive.js for the tool kinds) */
window.EF = window.EF || {};
(EF.labs = EF.labs || {}).english = [
  { id: 'sentence-purpose', kind: 'sort', topic: 'sentence-types', title: 'What is this sentence doing?', desc: 'Statement, question, command or strong feeling? Sort the sentences by purpose.',
    buckets: ['Declarative (statement)', 'Interrogative (question)', 'Imperative (command)', 'Exclamatory (strong feeling)'],
    items: [
      ['The bus leaves at seven.', 0], ['Mangoes grow in Jamaica.', 0], ['The corridor was empty.', 0],
      ['Did you finish your homework?', 1], ['Where is the library?', 1], ['Why was the gate open?', 1],
      ['Please close the gate.', 2, 'A polite request with “please” is still imperative'], ['Read carefully.', 2], ['Hand in your books by Friday.', 2],
      ['What a brilliant goal!', 3], ['I can’t believe we won!', 3], ['How kind you are!', 3]
    ] },
  { id: 'sentence-structure', kind: 'sort', topic: 'clauses', title: 'Simple, compound or complex?', desc: 'Count the clauses, then sort each sentence by its structure.',
    buckets: ['Simple', 'Compound', 'Complex'],
    items: [
      ['The students waited.', 0], ['Asha and Ben packed their bags and left.', 0, 'One clause with a compound subject and a compound verb'], ['Please close the gate.', 0],
      ['She practised, but she struggled.', 1], ['The corridor was empty; the bell had already rung.', 1], ['It rained, so we stayed indoors.', 1],
      ['Although it rained, we continued.', 2], ['We stayed indoors because it rained.', 2], ['When the bell rang, the students left.', 2]
    ] },
  { id: 'their-there', kind: 'sort', topic: 'homophones-and-spelling', title: 'Their, there or they’re?', desc: 'Pick the right word for each gap.',
    buckets: ['their', 'there', 'they’re'],
    items: [
      ['___ bags are on the bus.', 0, 'Their shows possession'], ['The twins lost ___ keys.', 0], ['Is that ___ dog?', 0],
      ['Put the box over ___.', 1, 'There can be a place'], ['___ is a problem with the printer.', 1, '“There is” is a set expression'], ['I have never been ___.', 1],
      ['___ late again!', 2, 'They’re = they are'], ['I think ___ coming tomorrow.', 2], ['___ the best team in the league.', 2]
    ] },
  { id: 'literary-devices', kind: 'sort', topic: 'literary-devices', title: 'Spot the device', desc: 'Simile, metaphor, personification and more. Sort the examples.',
    buckets: ['Simile', 'Metaphor', 'Personification', 'Hyperbole', 'Alliteration', 'Onomatopoeia'],
    items: [
      ['The room was as calm as still water.', 0, 'A comparison using “as”'], ['She ran like the wind.', 0],
      ['The wind was a thief stealing leaves.', 1], ['The classroom was a zoo.', 1, 'It suggests disorder; no real animals'],
      ['The old house sighed in the wind.', 2], ['The sun smiled down on the beach.', 2],
      ['I waited a thousand years for the bell.', 3], ['My bag weighs a ton.', 3],
      ['Cold currents curled around the canoe.', 4], ['Big brown bears bounced.', 4],
      ['The bees buzzed.', 5], ['Crash! The plates hit the floor.', 5]
    ] },
  { id: 'transitions', kind: 'sort', topic: 'transitions', title: 'Signal words', desc: 'What job does each transition do? Sort them by relationship.',
    buckets: ['Contrast', 'Cause and effect', 'Addition', 'Example', 'Sequence'],
    items: [
      ['however', 0], ['although', 0], ['nevertheless', 0],
      ['therefore', 1], ['consequently', 1], ['as a result', 1],
      ['furthermore', 2], ['moreover', 2], ['additionally', 2],
      ['for example', 3], ['for instance', 3], ['such as', 3],
      ['first', 4], ['next', 4], ['finally', 4]
    ] },
  { id: 'plot-shape', kind: 'order', topic: 'narrative-writing', title: 'The shape of a story', desc: 'Put the stages of a plot in order.',
    prompt: 'Tap the stages of a story in order, from the beginning.',
    steps: [
      ['Beginning (orientation)', 'Who, where and when: set the scene'],
      ['Rising action', 'The problem builds and tension grows'],
      ['Climax', 'The point of greatest tension or decisive action'],
      ['Falling action', 'What happens straight after the climax'],
      ['Resolution', 'How things end up']
    ] },
  { id: 'letter-layout', kind: 'order', topic: 'letter-of-request', title: 'Lay out a formal letter', desc: 'Build a letter of request from top to bottom.',
    prompt: 'Tap the parts of the letter from the top of the page to the bottom.',
    steps: [
      ['Sender’s address', 'Your address, at the top'],
      ['Date', 'Under your address'],
      ['Recipient’s details and address', 'Who you are writing to'],
      ['Salutation', '“Dear Sir/Madam,” or “Dear Ms Brown,”'],
      ['Body', 'The request, the reasons and details, then the action you want'],
      ['Closing', '“Yours faithfully,” or “Yours sincerely,”'],
      ['Signature', 'Sign by hand'],
      ['Full name', 'Printed under your signature']
    ] }
];
