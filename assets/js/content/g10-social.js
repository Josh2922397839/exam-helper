/* Zing content — Grade 10 Social Studies.
   Scope = topics in the study inventory: the individual and the family, unions and marriage, family roles and change,
   culture (incl. Jamaican influences, diffusion, music, preservation), regional integration, and government.
   Names of current office-holders are deliberately left out because they change. */
window.EF = window.EF || {};
EF.subjects = EF.subjects || [];

EF.subjects.push({
  id: 'social-studies',
  iconKey: 'social',
  name: 'Social Studies',
  short: 'Soc. Studies',
  grade: 10,
  icon: 'fa-people-group',
  color: '#ef4444',
  tagline: 'Family, culture, regional integration and government',
  intro: 'Caribbean families and marriage customs, family roles and change, Jamaican culture and where it comes from, CARICOM and the West Indies Federation, and how Jamaica is governed.',

  topics: [
    {
      id: 'family', title: 'The individual and the family', nav: 'The Family', icon: 'fa-people-roof',
      blocks: [
        {
          type: 'terms', items: [
            ['Individual', 'a single human being with their own personality, needs and abilities'],
            ['Family', 'a group of people related by blood, marriage or adoption, usually sharing a home and caring for each other'],
            ['Kinship', 'the network of relationships between family members (by blood or marriage)']
          ]
        },
        {
          type: 'grid', cols: 2, expand: true, items: [
            { icon: 'fa-house', title: 'Nuclear family', sub: 'Parents + their children', more: 'Two parents and their children living together. Smaller, more independent, common in towns.' },
            { icon: 'fa-house-chimney', title: 'Extended family', sub: 'Three or more generations', more: 'Grandparents, aunts, uncles and cousins living together or close by. Shares childcare, money and support.' },
            { icon: 'fa-person-breastfeeding', title: 'Single-parent family', sub: 'One parent + children', more: 'Usually the mother in the Caribbean. The parent carries the load of earning and caring.' },
            { icon: 'fa-people-arrows', title: 'Blended (reconstituted) family', sub: 'Step-families', more: 'Parents with children from earlier relationships come together.' }
          ]
        },
        {
          type: 'components', title: 'Causes of single-parent families', items: [['fa-heart-crack', 'divorce or separation'], ['fa-cross', 'death of a parent'], ['fa-plane-departure', 'migration'], ['fa-baby', 'teenage pregnancy'], ['fa-person-walking-arrow-right', 'abandonment'], ['fa-house-user', 'visiting unions that end'], ['fa-hand', 'personal choice']]
        },
        { type: 'callout', tone: 'tip', icon: 'fa-sitemap', title: 'Drawing a three-generation family tree', html: 'Put the <strong>grandparents</strong> at the top, their <strong>children</strong> (your parents, aunts and uncles) in the middle, and <strong>you and your siblings/cousins</strong> at the bottom. Use = (or a horizontal line) for a marriage/union and vertical lines down to children. Add a key.' }
      ]
    },
    {
      id: 'unions', title: 'Unions and marriage customs', nav: 'Unions & Marriage', icon: 'fa-ring',
      blocks: [
        {
          type: 'grid', cols: 3, items: [
            { icon: 'fa-ring', title: 'Legal marriage', html: 'A union <strong>registered by law</strong> (civil or religious ceremony). Gives legal rights, e.g. to property and inheritance. Ends only by death or divorce.' },
            { icon: 'fa-house-user', title: 'Common-law union', html: 'A couple <strong>live together</strong> as husband and wife <strong>without</strong> being legally married. Very common in the Caribbean.' },
            { icon: 'fa-door-open', title: 'Visiting union', html: 'The partners <strong>live apart</strong>; the man visits the woman (often at her parents’ home). Often the first stage of a relationship.' }
          ]
        },
        {
          type: 'table', title: 'Marriage words you must know', head: ['Term', 'Meaning'], rows: [
            ['Monogamy', 'one husband and one wife'],
            ['Polygamy', 'more than one spouse at the same time'],
            ['Polygyny', 'one man with more than one wife'],
            ['Polyandry', 'one woman with more than one husband'],
            ['Endogamy', 'marrying <strong>within</strong> your own group (religion, race, class)'],
            ['Exogamy', 'marrying <strong>outside</strong> your own group'],
            ['Patrilocal residence', 'the couple lives with or near the <strong>husband’s</strong> family'],
            ['Matrilocal residence', 'the couple lives with or near the <strong>wife’s</strong> family'],
            ['Neolocal residence', 'the couple sets up a <strong>new</strong> home of their own'],
            ['Patrilineal descent', 'family name and inheritance pass through the <strong>father’s</strong> line'],
            ['Matrilineal descent', 'they pass through the <strong>mother’s</strong> line'],
            ['Bilateral descent', 'both sides of the family count equally'],
            ['Courtship', 'the period when a couple get to know each other before marriage'],
            ['Shotgun wedding', 'a rushed marriage, usually because of a pregnancy, to protect the family’s honour']
          ]
        },
        { type: 'callout', tone: 'info', icon: 'fa-venus', title: 'The changing status of women', html: 'Women in the Caribbean now have more <strong>education</strong>, <strong>paid jobs</strong> and <strong>legal rights</strong>, so many are heads of households and decision-makers, and roles in the home are more shared.' }
      ]
    },
    {
      id: 'roles', title: 'Family roles and change', nav: 'Roles & Change', icon: 'fa-users',
      blocks: [
        {
          type: 'grid', cols: 2, items: [
            { icon: 'fa-user-tie', title: 'Father', list: ['Provider and protector', 'Discipline and guidance', 'Role model, especially for sons', 'Shares household tasks'] },
            { icon: 'fa-user', title: 'Mother', list: ['Nurturing and care', 'Teaches values and manners', 'Often also earns an income', 'Manages the home'] },
            { icon: 'fa-children', title: 'Children', list: ['Respect and obey parents', 'Help with chores', 'Study and do their best in school', 'Care for parents in old age'] },
            { icon: 'fa-person-cane', title: 'Grandparents', list: ['Childcare while parents work', 'Pass on culture, stories and values', 'Advice from experience', 'Emotional support'] }
          ]
        },
        {
          type: 'components', title: 'Why roles may not be fulfilled', items: [['fa-sack-xmark', 'poverty / unemployment'], ['fa-plane', 'migration of parents'], ['fa-user-slash', 'absent fathers'], ['fa-clock', 'long working hours'], ['fa-wine-bottle', 'drug or alcohol abuse'], ['fa-notes-medical', 'illness or disability'], ['fa-heart-crack', 'family breakdown']]
        },
        { type: 'text', html: '<strong>Barrel children</strong> is a Caribbean term for children left with relatives when parents migrate; the parents send money and goods home in barrels. The children may get material things but miss daily care and guidance.' },
        {
          type: 'grid', cols: 3, items: [
            { icon: 'fa-mobile-screen', title: 'Generation gap', html: 'Differences in ideas between older and younger people, caused by <strong>technology, music and fashion, media, education and changing values</strong>.' },
            { icon: 'fa-clock-rotate-left', title: 'How Caribbean families changed', html: 'Slavery broke up African families; East Indian indentured workers brought the <strong>joint/extended family</strong>; today there are more nuclear and single-parent homes, more working mothers and more migration.' },
            { icon: 'fa-comments', title: 'Closing the gap', html: 'Talking openly, spending time together, respecting each other’s views and sharing activities.' }
          ]
        }
      ]
    },
    {
      id: 'culture', title: 'Culture', nav: 'Culture', icon: 'fa-masks-theater',
      blocks: [
        { type: 'lead', html: '<strong>Culture</strong> is the whole way of life of a group of people: their beliefs, values, customs, language, food, dress, music and religion. It is <strong>learned</strong> and <strong>passed on</strong> from one generation to the next.' },
        {
          type: 'compare', items: [
            { title: 'Tangible (material) culture', color: '#ef4444', summary: [['Meaning', 'things you can <strong>see and touch</strong>']], phases: [['Examples', 'food (ackee and saltfish, jerk), dress, buildings, crafts, art, musical instruments']] },
            { title: 'Intangible (non-material) culture', color: '#3b82f6', summary: [['Meaning', 'ideas and practices you <strong>cannot touch</strong>']], phases: [['Examples', 'language (Patois), beliefs, values, music styles, folk stories (Anansi), dance, customs']] }
          ]
        },
        {
          type: 'grid', cols: 2, items: [
            { icon: 'fa-lock', title: 'Static culture', html: 'Changes very little over time; holds strongly to tradition.' },
            { icon: 'fa-arrows-rotate', title: 'Dynamic culture', html: 'Keeps changing as it meets new ideas. Jamaican culture is dynamic.' }
          ]
        },
        {
          type: 'table', title: 'Where Jamaican culture comes from', head: ['Influence', 'Examples'], rows: [
            ['African', 'drumming, Kumina, Jonkonnu, Anansi stories, many Patois words, dishes such as ackee (from West Africa)'],
            ['European (British, Spanish)', 'English language, Christianity, parliament and law, cricket, Spanish place names (e.g. Ocho Rios, Montego Bay)'],
            ['Indian', 'curry, roti, Hosay festival'],
            ['Chinese', 'shopkeeping, foods and businesses'],
            ['Taíno (first people)', 'words like hammock, canoe, barbecue; the name Jamaica (from Xaymaca)']
          ]
        },
        { type: 'text', html: '<strong>Cultural diffusion</strong> is the spread of cultural traits (food, music, language, ideas) from one group to another, through <strong>migration, trade, media, the internet and tourism</strong>. Reggae spreading worldwide is diffusion; so is KFC arriving in Jamaica.' },
        {
          type: 'timeline', items: [
            { label: 'Late 1950s–early 1960s', title: 'Ska', html: 'Fast, upbeat, with horns; mixed mento, jazz and R&B.' },
            { label: 'Mid–late 1960s', title: 'Rocksteady', html: 'Slower and smoother, with a heavy bass line.' },
            { label: 'Late 1960s onward', title: 'Reggae', html: 'Made world-famous by artists such as Bob Marley; messages of love, unity and resistance.' },
            { label: '2018', title: 'Reggae on UNESCO’s list', highlight: true, html: 'Reggae music of Jamaica was added to UNESCO’s list of the Intangible Cultural Heritage of Humanity.' }
          ]
        },
        {
          type: 'grid', cols: 2, items: [
            { icon: 'fa-earth-americas', title: 'Globalisation and culture', html: 'Foreign TV, music, fashion and fast food can weaken local culture, but globalisation also spreads Jamaican culture worldwide and adds <strong>cultural diversity</strong>.' },
            { icon: 'fa-shield-heart', title: 'Preserving culture', list: ['Festivals and celebrations (Emancipation, Independence, Festival song competition)', 'Teaching it in schools', 'Museums, monuments and heritage sites', 'Documenting it: recordings, books, archives'] },
            { icon: 'fa-id-card', title: 'Identity and belonging', html: 'Culture gives people a sense of who they are and where they belong: national pride.' },
            { icon: 'fa-umbrella-beach', title: 'Culture and tourism', html: 'Visitors come for music, food and festivals, which earns money, but over-commercialising culture can change it.' }
          ]
        }
      ]
    },
    {
      id: 'integration', title: 'Caribbean regional integration', nav: 'Regional Integration', icon: 'fa-handshake',
      blocks: [
        { type: 'lead', html: '<strong>Regional integration</strong> is when countries in a region work together economically, politically and socially for the benefit of all.' },
        {
          type: 'timeline', items: [
            { label: '1958–1962', title: 'West Indies Federation', html: 'Ten British colonies joined as one country, with its capital at Port of Spain, Trinidad. It ended after Jamaica voted to leave in a <strong>1961 referendum</strong>, and Trinidad and Tobago then left too.' },
            { label: '1965 / 1968', title: 'CARIFTA', html: 'The Caribbean Free Trade Association: removed taxes on trade between members.' },
            { label: '1973', title: 'CARICOM', highlight: true, html: 'The <strong>Treaty of Chaguaramas</strong> set up the Caribbean Community. Founding members: Barbados, Guyana, Jamaica, Trinidad and Tobago. Secretariat in Georgetown, Guyana.' },
            { label: '2001 onward', title: 'CSME', html: 'The CARICOM Single Market and Economy (Revised Treaty of Chaguaramas): free movement of goods, services, capital and skilled people.' }
          ]
        },
        {
          type: 'components', title: 'Why the Federation failed', items: [['fa-map', 'islands far apart'], ['fa-flag', 'insularity: loyalty to own island first'], ['fa-sack-dollar', 'arguments over who pays (Jamaica, Trinidad)'], ['fa-landmark', 'weak central government'], ['fa-city', 'disputes over the capital'], ['fa-check-to-slot', 'Jamaica’s 1961 referendum']]
        },
        {
          type: 'table', title: 'Regional institutions', head: ['Institution', 'What it does'], rows: [
            ['CXC', 'Caribbean Examinations Council: sets CSEC and CAPE exams'],
            ['UWI', 'University of the West Indies: regional university (Mona campus in Jamaica)'],
            ['CDEMA', 'Caribbean Disaster Emergency Management Agency: coordinates help after hurricanes and disasters'],
            ['CARPHA', 'Caribbean Public Health Agency: tackles diseases and public health'],
            ['CCJ', 'Caribbean Court of Justice: the region’s court'],
            ['West Indies cricket', 'one regional team: a symbol of unity']
          ]
        },
        {
          type: 'compare', items: [
            { title: 'Benefits', color: '#22c55e', summary: [['Overall', 'small countries are stronger together']], phases: [['Bigger market', 'more customers for local firms'], ['Bargaining power', 'one voice in world trade talks'], ['Free movement', 'skilled people can work in other member states'], ['Shared services', 'CXC, UWI, CDEMA save money'], ['Disaster help', 'members support each other']] },
            { title: 'Obstacles', color: '#ef4444', summary: [['Overall', 'progress has been slow']], phases: [['Insularity', 'national interests come first'], ['Different levels of development', 'richer and poorer members'], ['Distance', 'high transport costs'], ['Similar products', 'members compete instead of trading'], ['Slow implementation', 'agreements are not always carried out']] }
          ]
        }
      ]
    },
    {
      id: 'government', title: 'Government', nav: 'Government', icon: 'fa-landmark',
      blocks: [
        { type: 'lead', html: '<strong>Government</strong> is the group of people with the authority to make and enforce laws and run a country.' },
        {
          type: 'grid', cols: 2, items: [
            { icon: 'fa-check-to-slot', title: 'Democracy', html: 'Rule by the people, through <strong>elected</strong> representatives. Free elections, free speech, rule of law.' },
            { icon: 'fa-crown', title: 'Monarchy', html: '<strong>Absolute</strong>: the king or queen has full power. <strong>Constitutional</strong>: the monarch is a symbolic head of state and an elected parliament governs.' },
            { icon: 'fa-user-shield', title: 'Dictatorship', html: 'One person or small group holds total power, often taken by force; no free elections.' },
            { icon: 'fa-building-flag', title: 'Republic', html: 'The head of state is an elected or appointed <strong>president</strong>, not a monarch.' }
          ]
        },
        { type: 'callout', tone: 'info', icon: 'fa-flag', title: 'Jamaica', html: 'Jamaica is a <strong>parliamentary democracy</strong> and a <strong>constitutional monarchy</strong>: the British monarch is head of state, represented by the <strong>Governor-General</strong>; the <strong>Prime Minister</strong> is head of government. (Jamaica has plans to become a republic; check the latest position with your teacher.)' },
        {
          type: 'org', items: [
            { title: 'Legislature (Parliament)', color: '#3b82f6', html: '<strong>Makes laws.</strong> The House of Representatives (elected MPs) and the Senate (appointed senators).', points: ['Debates and passes bills', 'Approves the budget', 'Questions the government'] },
            { title: 'Executive (Cabinet)', color: '#ef4444', html: '<strong>Carries out laws and runs the country.</strong> The Prime Minister and Cabinet ministers, each in charge of a ministry.', points: ['Makes policies', 'Runs ministries and public services', 'Prepares the budget'] },
            { title: 'Judiciary (courts)', color: '#a855f7', html: '<strong>Interprets laws and settles disputes.</strong> Parish Courts, Supreme Court, Court of Appeal; Jamaica’s final appeal court is the Privy Council in London.', points: ['Judges cases fairly', 'Protects citizens’ rights', 'Independent of the government'] }
          ]
        },
        { type: 'text', html: '<strong>Separation of powers</strong>: the three branches are kept separate so that no one group has all the power; each checks the others.' },
        {
          type: 'grid', cols: 2, items: [
            { icon: 'fa-check-to-slot', title: 'Elections', list: ['General elections at least every <strong>five years</strong>', 'Citizens aged <strong>18+</strong> can vote (universal adult suffrage)', 'The party that wins the most seats forms the government', 'Run by the Electoral Commission of Jamaica'] },
            { icon: 'fa-scale-balanced', title: 'Good governance', list: ['Accountability: leaders answer for their actions', 'Transparency: decisions are open', 'Rule of law: everyone obeys the same laws', 'Participation: citizens have a say', 'Responsiveness: meets people’s needs'] }
          ]
        }
      ]
    }
  ],

  quiz: [
    { q: 'A family made up of parents and their children only is a…', options: ['nuclear family', 'extended family', 'blended family', 'single-parent family'], answer: 0, why: 'Nuclear = parents + children.' },
    { q: 'An extended family includes…', options: ['three or more generations of relatives', 'only parents and children', 'only step-children', 'one parent'], answer: 0, why: 'Grandparents, aunts, uncles, cousins.' },
    { q: 'A couple living together without being legally married are in a…', options: ['common-law union', 'visiting union', 'legal marriage', 'polygamous marriage'], answer: 0, why: 'They share a home but are not legally married.' },
    { q: 'In a visiting union, the partners…', options: ['live apart', 'live with the man’s family', 'are legally married', 'have more than one spouse'], answer: 0, why: 'The man visits the woman.' },
    { q: 'One man with more than one wife is called…', options: ['polygyny', 'polyandry', 'monogamy', 'endogamy'], answer: 0, why: 'Polyandry is one woman with several husbands.' },
    { q: 'Marrying someone from outside your own group is…', options: ['exogamy', 'endogamy', 'monogamy', 'matrilocal'], answer: 0, why: 'Exo = outside.' },
    { q: 'A couple that sets up its own new home practises…', options: ['neolocal residence', 'patrilocal residence', 'matrilocal residence', 'bilateral descent'], answer: 0, why: 'Neo = new.' },
    { q: '“Barrel children” are children who…', options: ['are left behind when parents migrate', 'live in large families', 'run small businesses', 'are adopted'], answer: 0, why: 'Parents send barrels of goods home from abroad.' },
    { q: 'Which is an example of INTANGIBLE culture?', options: ['Language', 'A clay pot', 'A building', 'Clothing'], answer: 0, why: 'You cannot touch a language.' },
    { q: 'The spread of cultural traits from one group to another is…', options: ['cultural diffusion', 'cultural erosion', 'socialisation', 'integration'], answer: 0, why: 'It happens through migration, trade, media and tourism.' },
    { q: 'The Hosay festival in Jamaica comes from…', options: ['Indian influence', 'Taíno influence', 'Spanish influence', 'Chinese influence'], answer: 0, why: 'It was brought by Indian indentured workers.' },
    { q: 'Which music style came FIRST?', options: ['Ska', 'Reggae', 'Rocksteady', 'Dancehall'], answer: 0, why: 'Ska → rocksteady → reggae → dancehall.' },
    { q: 'The West Indies Federation lasted from…', options: ['1958 to 1962', '1973 to 1990', '1962 to 1968', '1945 to 1958'], answer: 0, why: 'It ended after Jamaica’s 1961 referendum.' },
    { q: 'CARICOM was set up by the…', options: ['Treaty of Chaguaramas (1973)', 'Treaty of Versailles', 'Lomé Convention', '1961 referendum'], answer: 0, why: 'Signed in Chaguaramas, Trinidad.' },
    { q: 'Which institution sets the CSEC exams?', options: ['CXC', 'UWI', 'CDEMA', 'CARPHA'], answer: 0, why: 'Caribbean Examinations Council.' },
    { q: 'CDEMA deals mainly with…', options: ['disasters and emergencies', 'exams', 'public health', 'cricket'], answer: 0, why: 'Caribbean Disaster Emergency Management Agency.' },
    { q: 'Insularity means…', options: ['putting your own island’s interests first', 'trading freely', 'joining a federation', 'being an island'], answer: 0, why: 'It is a major obstacle to integration.' },
    { q: 'Which branch of government MAKES laws?', options: ['Legislature', 'Executive', 'Judiciary', 'Police'], answer: 0, why: 'Parliament makes laws.' },
    { q: 'Which branch INTERPRETS laws?', options: ['Judiciary', 'Legislature', 'Executive', 'Senate'], answer: 0, why: 'The courts.' },
    { q: 'In Jamaica, the head of government is the…', options: ['Prime Minister', 'Governor-General', 'Chief Justice', 'Speaker'], answer: 0, why: 'The Governor-General represents the head of state.' },
    { q: 'The minimum voting age in Jamaica is…', options: ['18', '16', '21', '25'], answer: 0, why: 'Universal adult suffrage at 18.' },
    { q: 'Leaders having to answer for their actions is called…', options: ['accountability', 'transparency', 'participation', 'sovereignty'], answer: 0, why: 'A key part of good governance.' }
  ],

  flashcards: [
    ['Family', 'People related by blood, marriage or adoption who usually live together and care for each other', 'Family'],
    ['Nuclear family', 'Parents and their children', 'Family'],
    ['Extended family', 'Three or more generations of relatives', 'Family'],
    ['Blended family', 'Step-family: parents with children from earlier relationships', 'Family'],
    ['Common-law union', 'Living together as a couple without legal marriage', 'Unions'],
    ['Visiting union', 'Partners live apart; the man visits', 'Unions'],
    ['Monogamy', 'One husband, one wife', 'Unions'],
    ['Polygyny / polyandry', 'One man, several wives / one woman, several husbands', 'Unions'],
    ['Endogamy / exogamy', 'Marrying inside / outside your own group', 'Unions'],
    ['Patrilocal / matrilocal / neolocal', 'Live with husband’s family / wife’s family / in a new home', 'Unions'],
    ['Patrilineal descent', 'Name and inheritance pass through the father’s line', 'Unions'],
    ['Shotgun wedding', 'Rushed marriage, usually because of pregnancy, to protect family honour', 'Unions'],
    ['Barrel children', 'Children left with relatives when parents migrate', 'Roles'],
    ['Generation gap', 'Differences in values and ideas between older and younger people', 'Roles'],
    ['Culture', 'The whole way of life of a people; learned and passed on', 'Culture'],
    ['Tangible culture', 'Material things: food, dress, buildings, crafts', 'Culture'],
    ['Intangible culture', 'Language, beliefs, values, music, stories, customs', 'Culture'],
    ['Dynamic culture', 'A culture that keeps changing', 'Culture'],
    ['Cultural diffusion', 'Spread of cultural traits between groups', 'Culture'],
    ['Order of Jamaican music', 'Ska → rocksteady → reggae → dancehall', 'Culture'],
    ['Reggae and UNESCO', 'Added to the Intangible Cultural Heritage list in 2018', 'Culture'],
    ['Regional integration', 'Countries in a region working together for shared benefit', 'Integration'],
    ['West Indies Federation', '1958–1962; ended after Jamaica’s 1961 referendum', 'Integration'],
    ['CARICOM', 'Caribbean Community, set up by the Treaty of Chaguaramas, 1973', 'Integration'],
    ['CSME', 'CARICOM Single Market and Economy: free movement of goods, services, capital, skilled people', 'Integration'],
    ['CXC', 'Caribbean Examinations Council (CSEC, CAPE)', 'Integration'],
    ['CDEMA', 'Caribbean Disaster Emergency Management Agency', 'Integration'],
    ['CARPHA', 'Caribbean Public Health Agency', 'Integration'],
    ['Insularity', 'Putting your own country’s interests first', 'Integration'],
    ['Government', 'People with authority to make and enforce laws and run the country', 'Government'],
    ['Constitutional monarchy', 'A monarch is head of state but an elected parliament governs', 'Government'],
    ['Legislature', 'Makes laws (Parliament)', 'Government'],
    ['Executive', 'Carries out laws (PM and Cabinet)', 'Government'],
    ['Judiciary', 'Interprets laws (the courts)', 'Government'],
    ['Separation of powers', 'Keeping the three branches separate so each checks the others', 'Government'],
    ['Good governance', 'Accountability, transparency, rule of law, participation, responsiveness', 'Government']
  ]
});
