/* ExamForge content — Grade 10 English Language.
   Scope = topics in the study inventory: Paper 1 skills (synonyms, antonyms, usage/error detection, sentence completion,
   spelling, comprehension), clauses and sentence types, punctuation and commonly confused words, figurative language,
   narrative and descriptive writing, formal letter of request, incident report, transitions, exam timing.
   The letter and report layouts below are common standard formats; follow your teacher's sample if it differs. */
window.EF = window.EF || {};
EF.subjects = EF.subjects || [];

EF.subjects.push({
  id: 'english',
  name: 'English Language',
  short: 'English',
  grade: 10,
  icon: 'fa-feather',
  color: '#f472b6',
  tagline: 'Paper 1 skills, grammar, punctuation, figures of speech and writing formats',
  intro: 'Synonyms, antonyms and error spotting; clauses and sentence types; semicolons, colons and apostrophes; figures of speech; and model layouts for narratives, descriptions, letters of request and incident reports.',

  topics: [
    {
      id: 'paper1', title: 'Paper 1 skills', nav: 'Paper 1 Skills', icon: 'fa-list-check',
      blocks: [
        {
          type: 'grid', cols: 2, expand: true, items: [
            { icon: 'fa-equals', title: 'Synonyms', sub: 'Words with the SAME meaning', more: '<strong>enormous</strong> = huge, vast, immense · <strong>brave</strong> = courageous, bold · <strong>angry</strong> = furious, irate.<br>Tip: put each option into the sentence; the right one keeps the meaning.' },
            { icon: 'fa-not-equal', title: 'Antonyms', sub: 'Words with the OPPOSITE meaning', more: '<strong>generous</strong> ↔ stingy, mean · <strong>ancient</strong> ↔ modern · <strong>scarce</strong> ↔ plentiful.<br>Watch for options that are synonyms: they are traps.' },
            { icon: 'fa-magnifying-glass', title: 'Usage / error detection', sub: 'Find the mistake', more: 'Check: <strong>subject–verb agreement</strong> (“The list of names <u>is</u> long”), <strong>tense</strong> (stay in one tense), <strong>pronouns</strong> (“between you and <u>me</u>”), <strong>confused words</strong> (their/there).' },
            { icon: 'fa-pen-to-square', title: 'Sentence completion', sub: 'Choose the word that fits', more: 'Read the <strong>whole sentence</strong> first. Look for clue words: <em>although, but, however</em> signal a contrast; <em>and, also, because</em> signal the same idea continuing.' },
            { icon: 'fa-spell-check', title: 'Spelling', sub: 'Common traps', more: 'acco<strong>mm</strong>odate · nec<strong>e</strong>ssary (one c, two s) · recei<strong>ve</strong> (i before e except after c) · definit<strong>e</strong>ly · s<strong>e</strong>parate · occa<strong>s</strong>ion · embarra<strong>ss</strong> · bel<strong>ie</strong>ve.' },
            { icon: 'fa-book-open-reader', title: 'Comprehension', sub: 'Understanding a passage', more: 'Find the <strong>main idea</strong> (what the whole passage is about) and <strong>supporting details</strong>. For inference questions, use clues in the text: the answer is suggested, not stated.' }
          ]
        },
        {
          type: 'table', title: 'Subject–verb agreement', head: ['Rule', 'Correct example'], rows: [
            ['Singular subject → singular verb', 'The <strong>girl sings</strong> in the choir.'],
            ['Ignore the phrase in between', 'The <strong>box</strong> of mangoes <strong>is</strong> heavy.'],
            ['Each, every, everyone, neither are singular', '<strong>Each</strong> of the boys <strong>has</strong> a book.'],
            ['Two subjects joined by “and” → plural', 'Kemar and Tia <strong>are</strong> late.'],
            ['“Either…or / neither…nor”: verb agrees with the nearer subject', 'Neither the teacher nor the <strong>students were</strong> ready.']
          ]
        },
        {
          type: 'steps', items: [
            { title: 'Skim the passage first', html: 'Get the general idea before reading the questions.' },
            { title: 'Read the question carefully', html: 'Underline key words: <em>why, how, which word, in your own words</em>.' },
            { title: 'Find the evidence', html: 'Go back to the passage; the answer is usually in one or two lines.' },
            { title: 'Answer in your own words', html: 'Only copy when asked to “quote”; then use quotation marks.' }
          ]
        }
      ]
    },
    {
      id: 'sentences', title: 'Clauses and sentence types', nav: 'Sentences', icon: 'fa-paragraph',
      blocks: [
        {
          type: 'compare', items: [
            { title: 'Independent clause', color: '#f472b6', summary: [['Meaning', 'has a subject and verb and makes <strong>complete sense</strong> on its own']], phases: [['Example', 'The rain stopped.']] },
            { title: 'Subordinate (dependent) clause', color: '#8b5cf6', summary: [['Meaning', 'has a subject and verb but <strong>cannot stand alone</strong>; starts with a subordinator']], phases: [['Subordinators', 'because, although, when, if, since, while, unless, after'], ['Example', '…because the sun came out.']] }
          ]
        },
        {
          type: 'table', title: 'Sentence types by structure', head: ['Type', 'Made of', 'Example'], rows: [
            ['Simple', 'one independent clause', 'The bus arrived late.'],
            ['Compound', 'two independent clauses joined by a FANBOYS word (for, and, nor, but, or, yet, so) or a semicolon', 'The bus arrived late, <strong>so</strong> we missed assembly.'],
            ['Complex', 'one independent + at least one subordinate clause', '<strong>Because</strong> the bus arrived late, we missed assembly.'],
            ['Compound-complex', 'two or more independent + at least one subordinate clause', '<strong>Although</strong> we ran, the gate was locked, <strong>and</strong> we waited outside.']
          ]
        },
        {
          type: 'grid', cols: 4, items: [
            { icon: 'fa-circle', title: 'Declarative', html: 'Makes a statement. Ends with a full stop.' },
            { icon: 'fa-circle-question', title: 'Interrogative', html: 'Asks a question. Ends with a question mark.' },
            { icon: 'fa-hand-point-right', title: 'Imperative', html: 'Gives a command or request: “Close the door.”' },
            { icon: 'fa-circle-exclamation', title: 'Exclamatory', html: 'Shows strong feeling: “What a goal!”' }
          ]
        },
        { type: 'callout', tone: 'warn', icon: 'fa-triangle-exclamation', title: 'Avoid', html: '<strong>Fragments</strong>: “Because I was tired.” (not a full sentence).<br><strong>Run-ons / comma splices</strong>: “I was tired, I went to bed.” Fix with a full stop, a semicolon, or “so”.' }
      ]
    },
    {
      id: 'punctuation', title: 'Punctuation and confused words', nav: 'Punctuation', icon: 'fa-quote-left',
      blocks: [
        {
          type: 'grid', cols: 3, items: [
            { icon: 'fa-circle-dot', title: 'Semicolon ;', list: ['Joins two closely related <strong>complete</strong> sentences: “It was late; the shops were closed.”', 'Separates items in a list that already has commas: “Kingston, Jamaica; Bridgetown, Barbados; and Castries, St Lucia.”'] },
            { icon: 'fa-ellipsis-vertical', title: 'Colon :', list: ['Introduces a list after a complete sentence: “Bring three things: a pen, a ruler and a calculator.”', 'Introduces an explanation or a quotation.', 'Never after “such as” or “are”.'] },
            { icon: 'fa-quote-right', title: 'Apostrophe ’', list: ['<strong>Possession</strong>: the boy’s bag (one boy), the boys’ bags (more than one), the children’s toys.', '<strong>Contraction</strong>: don’t = do not, it’s = it is.', '<strong>its</strong> (belonging to it) has <strong>no</strong> apostrophe.'] }
          ]
        },
        {
          type: 'table', title: 'Homophones and commonly confused words', head: ['Word', 'Meaning / use', 'Example'], rows: [
            ['their / there / they’re', 'belonging to them / a place / they are', '<strong>They’re</strong> putting <strong>their</strong> bags over <strong>there</strong>.'],
            ['your / you’re', 'belonging to you / you are', '<strong>You’re</strong> forgetting <strong>your</strong> book.'],
            ['its / it’s', 'belonging to it / it is', '<strong>It’s</strong> wagging <strong>its</strong> tail.'],
            ['to / too / two', 'towards / also, very / 2', 'I went <strong>to</strong> buy <strong>two</strong> patties, but they were <strong>too</strong> hot.'],
            ['than / then', 'comparing / time', 'She is taller <strong>than</strong> me. We ate, <strong>then</strong> left.'],
            ['affect / effect', 'verb: to influence / noun: a result', 'Noise <strong>affects</strong> sleep. The <strong>effect</strong> was clear.'],
            ['accept / except', 'to receive / leaving out', 'I <strong>accept</strong> all <strong>except</strong> one.'],
            ['lose / loose', 'misplace, not win / not tight', 'Don’t <strong>lose</strong> that <strong>loose</strong> button.'],
            ['principal / principle', 'head of a school / a rule or belief', 'The <strong>principal</strong> has strong <strong>principles</strong>.'],
            ['stationary / stationery', 'not moving / pens and paper', 'The car was <strong>stationary</strong>. Buy <strong>stationery</strong>.'],
            ['whose / who’s', 'belonging to whom / who is', '<strong>Who’s</strong> the boy <strong>whose</strong> phone rang?'],
            ['compliment / complement', 'praise / complete something', 'She paid me a <strong>compliment</strong>.']
          ]
        }
      ]
    },
    {
      id: 'figurative', title: 'Figures of speech', nav: 'Figures of Speech', icon: 'fa-wand-magic-sparkles',
      blocks: [
        {
          type: 'grid', cols: 3, expand: true, items: [
            { icon: 'fa-equals', title: 'Simile', sub: 'Compares using “like” or “as”', more: '“The sea was <strong>as calm as</strong> a sleeping baby.” “She ran <strong>like</strong> the wind.”' },
            { icon: 'fa-shuffle', title: 'Metaphor', sub: 'Says one thing IS another', more: '“The classroom <strong>was a zoo</strong>.” “Time is a thief.”' },
            { icon: 'fa-user', title: 'Personification', sub: 'Gives human qualities to things', more: '“The wind <strong>whispered</strong> through the trees.” “The old bus <strong>groaned</strong> up the hill.”' },
            { icon: 'fa-maximize', title: 'Hyperbole', sub: 'Huge exaggeration for effect', more: '“I’ve told you <strong>a million times</strong>.” “This bag weighs a ton.”' },
            { icon: 'fa-font', title: 'Alliteration', sub: 'Same first sound repeated', more: '“<strong>S</strong>illy <strong>S</strong>ally <strong>s</strong>wiftly <strong>s</strong>hooed the <strong>s</strong>heep.”' },
            { icon: 'fa-volume-high', title: 'Onomatopoeia', sub: 'Words that sound like the noise', more: '“<strong>Bang!</strong>” “The rain <strong>pattered</strong>.” “The bees <strong>buzzed</strong>.”' }
          ]
        },
        { type: 'callout', tone: 'tip', icon: 'fa-lightbulb', title: 'Exam answers: name it, quote it, explain the effect', html: '“The writer uses a <strong>simile</strong>, ‘as calm as a sleeping baby’, to show how peaceful and still the sea was, which makes the reader feel relaxed.”' }
      ]
    },
    {
      id: 'narrative', title: 'Narrative and descriptive writing', nav: 'Narrative & Descriptive', icon: 'fa-book-open',
      blocks: [
        {
          type: 'steps', horizontal: true, items: [
            { title: 'Exposition', html: 'Introduce characters and setting.' },
            { title: 'Rising action', html: 'A problem appears; tension builds.' },
            { title: 'Climax', html: 'The most exciting / turning point.' },
            { title: 'Falling action', html: 'Things start to settle.' },
            { title: 'Resolution', html: 'How it ends; what was learned.' }
          ]
        },
        {
          type: 'compare', items: [
            { title: 'Telling (weak)', color: '#ef4444', summary: [['Example', '“Jada was nervous.”']], phases: [['Why weak', 'states the feeling; the reader sees nothing']] },
            { title: 'Showing (strong)', color: '#22c55e', summary: [['Example', '“Jada’s hands shook as she smoothed her skirt for the third time, her eyes fixed on the door.”']], phases: [['Why strong', 'actions and details let the reader work out the feeling']] }
          ]
        },
        {
          type: 'grid', cols: 2, items: [
            { icon: 'fa-pen-nib', title: 'Narrative tips', list: ['Start with a <strong>hook</strong>: action, dialogue or a question.', 'Keep to <strong>one tense</strong> (usually past).', 'Use <strong>dialogue</strong> correctly: new speaker, new line.', 'Vary sentence lengths: short ones build tension.', 'End with a satisfying resolution, not “and then I woke up”.'] },
            { icon: 'fa-eye', title: 'Descriptive tips (person or place)', list: ['Use all <strong>five senses</strong>.', 'Choose precise words: “sprinted” not “ran fast”.', 'Use figures of speech.', 'Organise it: near → far, top → bottom, or first impression → details.', 'Create a clear <strong>mood</strong>.'] }
          ]
        },
        { type: 'components', title: 'Useful transition words', items: [['fa-1', 'Firstly / To begin with'], ['fa-plus', 'Furthermore / In addition'], ['fa-right-left', 'However / On the other hand'], ['fa-arrow-right', 'Therefore / As a result'], ['fa-clock', 'Meanwhile / Later that day'], ['fa-flag-checkered', 'Finally / In conclusion']] }
      ]
    },
    {
      id: 'letter', title: 'Formal letter of request', nav: 'Letter of Request', icon: 'fa-envelope',
      blocks: [
        { type: 'lead', html: 'A <strong>formal letter of request</strong> politely asks someone in authority for something: permission, information, a donation or a service.' },
        {
          type: 'steps', items: [
            { title: 'Your address (top right) and the date', html: 'Write the date in full: <strong>5 November 2026</strong>.' },
            { title: 'Recipient’s title and address (left)', html: 'e.g. The Principal, then the school’s name and full address on separate lines.' },
            { title: 'Salutation', html: '<strong>Dear Sir/Madam:</strong> (name unknown) or <strong>Dear Mr Brown:</strong> (name known).' },
            { title: 'Subject line', html: 'e.g. <strong>RE: Request to Use the School Hall for a Charity Concert</strong>' },
            { title: 'Paragraph 1: purpose', html: 'Introduce yourself and say clearly what you are requesting.' },
            { title: 'Paragraph 2–3: details and reasons', html: 'When, where, how many, why it matters, and how you will handle any concerns.' },
            { title: 'Closing paragraph', html: 'Thank them and say how they can reply: “I look forward to your favourable response.”' },
            { title: 'Complimentary close and signature', html: '<strong>Yours faithfully</strong> (after Dear Sir/Madam) or <strong>Yours sincerely</strong> (after a name), then your signature and printed name.' }
          ]
        },
        { type: 'callout', tone: 'tip', icon: 'fa-lightbulb', title: 'Tone', html: 'Polite, formal and to the point. No slang, no contractions (write “I am”, not “I’m”), no emojis.' }
      ]
    },
    {
      id: 'report', title: 'Incident report', nav: 'Incident Report', icon: 'fa-file-lines',
      blocks: [
        { type: 'lead', html: 'An <strong>incident report</strong> is a factual, objective account of something that happened, such as an accident, a fight or damage, written for someone in authority.' },
        {
          type: 'steps', items: [
            { title: 'Heading', html: '<strong>To:</strong> (e.g. The Dean of Discipline) · <strong>From:</strong> (your name, class) · <strong>Date:</strong> · <strong>Subject:</strong> (e.g. Report on an Accident in the Chemistry Lab)' },
            { title: 'Introduction', html: 'Say what the report is about, when and where it happened.' },
            { title: 'Account of the incident', html: 'What happened, in <strong>time order</strong>: who was involved, what each person did, and the result. Answer <strong>who, what, when, where, how</strong>.' },
            { title: 'Action taken', html: 'What was done straight after (first aid, teacher called, area cleared).' },
            { title: 'Recommendations', html: 'Suggestions to stop it happening again.' },
            { title: 'Signature', html: 'Sign and print your name.' }
          ]
        },
        {
          type: 'grid', cols: 2, items: [
            { icon: 'fa-check', title: 'Do', list: ['Write in the <strong>past tense</strong>', 'Stick to <strong>facts</strong> you saw or were told', 'Use exact times and places', 'Use formal, clear language'] },
            { icon: 'fa-xmark', title: 'Don’t', list: ['Give your opinion or blame (“he is always rude”)', 'Exaggerate or use emotional words', 'Use slang', 'Skip what was done afterwards'] }
          ]
        },
        { type: 'callout', tone: 'info', icon: 'fa-stopwatch', title: 'Exam timing', html: 'Spend about <strong>5 minutes planning</strong>, most of the time writing, and the last <strong>5 minutes checking</strong> spelling, punctuation, tense and paragraphing.' }
      ]
    }
  ],

  quiz: [
    { q: 'Choose the SYNONYM of “enormous”.', options: ['huge', 'tiny', 'heavy', 'quiet'], answer: 0, why: 'Synonyms have the same meaning.' },
    { q: 'Choose the ANTONYM of “generous”.', options: ['stingy', 'kind', 'giving', 'wealthy'], answer: 0, why: 'Antonyms have opposite meanings.' },
    { q: 'Which sentence is correct?', options: ['The box of mangoes is heavy.', 'The box of mangoes are heavy.', 'The box of mangoes were heavy.', 'The box of mangoes be heavy.'], answer: 0, why: 'The subject is “box” (singular).' },
    { q: 'Which word is spelled correctly?', options: ['necessary', 'neccessary', 'necesary', 'neccesary'], answer: 0, why: 'One c, two s.' },
    { q: '“Although it rained, we played.” What kind of sentence is this?', options: ['Complex', 'Simple', 'Compound', 'Imperative'], answer: 0, why: 'One subordinate clause + one independent clause.' },
    { q: 'Which word begins a subordinate clause?', options: ['because', 'and', 'but', 'so'], answer: 0, why: 'The others are coordinating (FANBOYS) conjunctions.' },
    { q: '“Close the window.” is…', options: ['imperative', 'interrogative', 'exclamatory', 'declarative'], answer: 0, why: 'It gives a command.' },
    { q: 'Which is a sentence FRAGMENT?', options: ['Because I was tired.', 'I was tired.', 'I was tired, so I slept.', 'Tired, I slept.'], answer: 0, why: 'It cannot stand alone.' },
    { q: 'Where does the semicolon go? “It was late ___ the shops were closed.”', options: ['It was late; the shops were closed.', 'It was; late the shops were closed.', 'It was late the; shops were closed.', 'No semicolon is possible.'], answer: 0, why: 'A semicolon joins two complete, related sentences.' },
    { q: 'Which is correct?', options: ['The dog wagged its tail.', 'The dog wagged it’s tail.', 'The dog wagged its’ tail.', 'The dog wagged it is tail.'], answer: 0, why: '“its” = belonging to it, no apostrophe.' },
    { q: 'The bags belonging to several boys are the…', options: ['boys’ bags', 'boy’s bags', 'boys’s bags', 'boys bags’'], answer: 0, why: 'Plural ending in s: apostrophe after the s.' },
    { q: '“___ going to the match?”', options: ['Who’s', 'Whose', 'Whos', 'Who is’'], answer: 0, why: 'Who’s = who is.' },
    { q: '“The wind whispered through the trees” is an example of…', options: ['personification', 'simile', 'hyperbole', 'alliteration'], answer: 0, why: 'Wind cannot really whisper: a human action.' },
    { q: '“He is as brave as a lion” is a…', options: ['simile', 'metaphor', 'onomatopoeia', 'hyperbole'], answer: 0, why: 'It uses “as”.' },
    { q: '“I’ve told you a million times!” is…', options: ['hyperbole', 'personification', 'simile', 'alliteration'], answer: 0, why: 'A huge exaggeration.' },
    { q: 'The most exciting point of a story is the…', options: ['climax', 'exposition', 'resolution', 'falling action'], answer: 0, why: 'It is the turning point.' },
    { q: 'Which shows rather than tells?', options: ['Her hands trembled as she reached for the envelope.', 'She was scared.', 'She felt very nervous.', 'She was afraid of the letter.'], answer: 0, why: 'It gives actions the reader can picture.' },
    { q: 'A formal letter starting “Dear Sir/Madam” should end with…', options: ['Yours faithfully', 'Yours sincerely', 'Love', 'Cheers'], answer: 0, why: 'Yours sincerely is used when you know the name.' },
    { q: 'An incident report should be written…', options: ['in the past tense, stating facts', 'in the future tense', 'with your opinions of the people', 'as a story with dialogue'], answer: 0, why: 'It is objective and factual.' },
    { q: 'Which transition shows CONTRAST?', options: ['However', 'Furthermore', 'Therefore', 'Firstly'], answer: 0, why: 'However introduces an opposite idea.' }
  ],

  flashcards: [
    ['Synonym', 'A word with the same meaning (big / large)', 'Paper 1'],
    ['Antonym', 'A word with the opposite meaning (hot / cold)', 'Paper 1'],
    ['Subject–verb agreement', 'A singular subject takes a singular verb; ignore phrases in between', 'Paper 1'],
    ['Main idea', 'What the whole passage is mostly about', 'Paper 1'],
    ['Inference', 'A conclusion drawn from clues in the text (not stated directly)', 'Paper 1'],
    ['Independent clause', 'Subject + verb that makes complete sense alone', 'Sentences'],
    ['Subordinate clause', 'Subject + verb that cannot stand alone; starts with because, although, when, if…', 'Sentences'],
    ['FANBOYS', 'for, and, nor, but, or, yet, so: join two independent clauses', 'Sentences'],
    ['Simple sentence', 'One independent clause', 'Sentences'],
    ['Compound sentence', 'Two independent clauses joined by a FANBOYS word or a semicolon', 'Sentences'],
    ['Complex sentence', 'Independent clause + subordinate clause', 'Sentences'],
    ['Four sentence purposes', 'Declarative, interrogative, imperative, exclamatory', 'Sentences'],
    ['Comma splice', 'Two sentences joined only by a comma (an error)', 'Sentences'],
    ['Semicolon', 'Joins two related complete sentences; separates list items that contain commas', 'Punctuation'],
    ['Colon', 'Introduces a list, explanation or quotation after a complete sentence', 'Punctuation'],
    ['its vs it’s', 'its = belonging to it; it’s = it is', 'Punctuation'],
    ['boy’s vs boys’', 'One boy owns it / more than one boy owns it', 'Punctuation'],
    ['affect vs effect', 'Affect = verb (to influence); effect = noun (result)', 'Confused words'],
    ['principal vs principle', 'Head of a school / a rule or belief', 'Confused words'],
    ['stationary vs stationery', 'Not moving / writing materials', 'Confused words'],
    ['Simile', 'Comparison using like or as', 'Figures of speech'],
    ['Metaphor', 'Saying something IS something else', 'Figures of speech'],
    ['Personification', 'Giving human qualities to non-human things', 'Figures of speech'],
    ['Hyperbole', 'Extreme exaggeration', 'Figures of speech'],
    ['Alliteration', 'Repeating the same first sound', 'Figures of speech'],
    ['Onomatopoeia', 'A word that imitates a sound (bang, buzz)', 'Figures of speech'],
    ['Plot structure', 'Exposition → rising action → climax → falling action → resolution', 'Writing'],
    ['Show, don’t tell', 'Use actions and details instead of naming the feeling', 'Writing'],
    ['Yours faithfully vs sincerely', 'Faithfully after Dear Sir/Madam; sincerely after a name', 'Writing'],
    ['Parts of a letter of request', 'Addresses, date, salutation, subject line, purpose, details, closing, complimentary close, signature', 'Writing'],
    ['Incident report must include', 'To/From/Date/Subject, what happened in order, action taken, recommendations', 'Writing']
  ]
});
