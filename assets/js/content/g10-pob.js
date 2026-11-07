/* Zing content — Grade 10 Principles of Business.
   Scope (the user's own words in the study inventory): "everything up to functional areas of business —
   barter & monetary system, forms of business, economic systems, and functional areas of business". */
window.EF = window.EF || {};
EF.subjects = EF.subjects || [];

EF.subjects.push({
  id: 'pob',
  iconKey: 'business',
  name: 'Principles of Business',
  short: 'POB',
  grade: 10,
  icon: 'fa-briefcase',
  color: '#a855f7',
  tagline: 'Barter and money, forms of business, economic systems and functional areas',
  intro: 'Why money replaced barter, every form of business ownership compared, the four economic systems, and the functional areas inside a firm, with Jamaican examples.',

  topics: [
    {
      id: 'barter', title: 'The barter system', nav: 'Barter', icon: 'fa-arrow-right-arrow-left',
      blocks: [
        { type: 'lead', html: '<strong>Barter</strong> is the direct exchange of goods or services for other goods or services, <strong>without using money</strong>.' },
        { type: 'callout', tone: 'info', icon: 'fa-handshake', title: 'Double coincidence of wants', html: 'For barter to work, each person must have <strong>what the other wants</strong> and want <strong>what the other has</strong>, at the same time. A farmer with yams who wants shoes must find a shoemaker who wants yams.' },
        {
          type: 'grid', cols: 2, expand: true, items: [
            { icon: 'fa-people-arrows', title: 'Double coincidence of wants', sub: 'Problem 1', more: 'It is hard and slow to find someone who wants exactly what you have and has exactly what you want.' },
            { icon: 'fa-scale-unbalanced', title: 'No common measure of value', sub: 'Problem 2', more: 'How many yams is one pair of shoes worth? Every pair of goods needs its own exchange rate.' },
            { icon: 'fa-cow', title: 'Goods cannot be divided', sub: 'Problem 3', more: 'You cannot cut a goat in half to pay for something worth half a goat.' },
            { icon: 'fa-apple-whole', title: 'Hard to store wealth', sub: 'Problem 4', more: 'Many goods are <strong>perishable</strong> (fish, fruit) or bulky, so you cannot save them for later.' },
            { icon: 'fa-calendar-xmark', title: 'Deferred payment is difficult', sub: 'Problem 5', more: 'Paying “later” is hard: the goods may change in value or quality.' },
            { icon: 'fa-truck', title: 'Hard to transport', sub: 'Problem 6', more: 'Carrying goods to market to trade them takes time and effort.' }
          ]
        }
      ]
    },
    {
      id: 'money', title: 'Money and the monetary system', nav: 'Money', icon: 'fa-coins',
      blocks: [
        { type: 'lead', html: '<strong>Money</strong> is anything that is <strong>generally accepted</strong> as payment for goods and services or to settle debts.' },
        {
          type: 'grid', cols: 4, numbered: true, items: [
            { title: 'Medium of exchange', html: 'Used to buy and sell: solves the double coincidence of wants.' },
            { title: 'Measure of value', html: 'Every good gets a price in the same unit (e.g. J$).' },
            { title: 'Store of value', html: 'Can be saved to spend later.' },
            { title: 'Standard of deferred payment', html: 'Lets people buy now and pay later (credit, loans).' }
          ]
        },
        {
          type: 'table', title: 'Characteristics of good money', head: ['Characteristic', 'Meaning'], rows: [
            ['Acceptability', 'everyone is willing to take it'],
            ['Durability', 'lasts a long time; does not rot or wear out quickly'],
            ['Portability', 'easy to carry'],
            ['Divisibility', 'can be split into smaller units (dollars and cents)'],
            ['Homogeneity (uniformity)', 'each unit is the same as the others'],
            ['Scarcity (limited supply)', 'cannot be produced by anyone, so it keeps its value'],
            ['Recognisability', 'easy to identify and hard to forge'],
            ['Stability', 'its value does not change much over time']
          ]
        },
        {
          type: 'grid', cols: 3, items: [
            { icon: 'fa-money-bill-wave', title: 'Cash', html: 'Notes and coins, <strong>legal tender</strong> issued by the Bank of Jamaica.' },
            { icon: 'fa-money-check', title: 'Cheque', html: 'A written order to a bank to pay a named person from your account.' },
            { icon: 'fa-credit-card', title: 'Debit card', html: 'Takes money straight from your bank account.' },
            { icon: 'fa-credit-card', title: 'Credit card', html: 'Buy now, pay the card company later (interest if you pay late).' },
            { icon: 'fa-building-columns', title: 'Bank transfer / online banking', html: 'Money moved electronically between accounts.' },
            { icon: 'fa-mobile-screen', title: 'Mobile payments', html: 'Paying with a phone app or wallet.' },
            { icon: 'fa-repeat', title: 'Standing order', html: 'The bank pays a <strong>fixed</strong> amount regularly (e.g. rent).' },
            { icon: 'fa-file-invoice-dollar', title: 'Money order', html: 'A prepaid payment order bought from a post office or bank.' }
          ]
        },
        { type: 'callout', tone: 'tip', icon: 'fa-lightbulb', title: 'Money vs a way of moving money', html: 'Cheques, cards and transfers are <strong>methods of payment</strong>: they move money from one account to another. The money itself is the bank balance.' }
      ]
    },
    {
      id: 'ownership', title: 'Forms of business ownership', nav: 'Forms of Business', icon: 'fa-building',
      blocks: [
        {
          type: 'terms', items: [
            ['Unlimited liability', 'the owner(s) are personally responsible for <strong>all</strong> the business’s debts: their own house or car can be sold to pay'],
            ['Limited liability', 'owners can only lose the money they <strong>invested</strong> (their shares)'],
            ['Separate legal identity', 'the business is a legal “person” separate from its owners: it can own property, sue and be sued'],
            ['Continuity', 'the business continues even if an owner dies or leaves']
          ]
        },
        {
          type: 'org', items: [
            { title: 'Sole trader', color: '#a855f7', html: 'Owned and controlled by <strong>one person</strong> (may employ workers). e.g. a corner shop, barber, hairdresser.', points: ['Easy and cheap to start', 'Owner keeps all the profit', 'Quick decisions, full control', 'Personal contact with customers'], cons: ['Unlimited liability', 'Limited capital', 'Long hours; no one to share the load', 'No continuity'] },
            { title: 'Partnership', color: '#3b82f6', html: '<strong>Two or more</strong> people (usually up to 20) own the business, often with a <strong>deed of partnership</strong> setting out capital, profit shares and duties. e.g. law firms, doctors, accountants.', points: ['More capital and skills', 'Shared workload and decisions', 'Losses shared'], cons: ['Usually unlimited liability (a limited / sleeping partner is the exception)', 'Disagreements', 'Profits shared', 'Ends if a partner dies or leaves'] },
            { title: 'Private limited company (Ltd)', color: '#22c55e', html: 'Owned by <strong>shareholders</strong>; shares are <strong>not</strong> sold to the public. Often family businesses.', points: ['Limited liability', 'Separate legal identity', 'Continuity', 'More capital than a partnership'], cons: ['Cannot sell shares to the public', 'Legal paperwork to set up', 'Shares cannot be transferred freely'] },
            { title: 'Public limited company (PLC)', color: '#f59e0b', html: 'Sells shares to the <strong>public</strong>, e.g. on the <strong>Jamaica Stock Exchange</strong>. Run by a board of directors elected by shareholders.', points: ['Raises very large capital', 'Limited liability', 'Continuity', 'Easier to borrow'], cons: ['Expensive to set up', 'Must publish accounts', 'Owners and managers are separate', 'Risk of takeover'] },
            { title: 'Co-operative', color: '#ef4444', html: 'Owned and run by its <strong>members</strong> for their benefit. <strong>One member, one vote</strong>. e.g. credit unions, farmers’ co-ops.', points: ['Democratic control', 'Profits shared among members (dividends)', 'Limited liability', 'Members help each other'], cons: ['Limited capital', 'Slow decisions', 'May lack expert managers'] },
            { title: 'Franchise', color: '#06b6d4', html: 'The <strong>franchisor</strong> lets a <strong>franchisee</strong> use its name, products and methods for a fee and royalties. e.g. many fast-food chains.', points: ['Known brand: less risk', 'Training and advertising provided', 'Proven business model'], cons: ['Fees and royalties', 'Strict rules; little freedom', 'Bad publicity elsewhere affects you'] }
          ]
        },
        {
          type: 'compare', items: [
            { title: 'Private sector', color: '#a855f7', summary: [['Owned by', 'private individuals'], ['Main aim', '<strong>profit</strong>']], phases: [['Examples', 'sole traders, partnerships, companies, co-ops, franchises']] },
            { title: 'Public sector', color: '#3b82f6', summary: [['Owned by', 'the <strong>government</strong>'], ['Main aim', 'provide <strong>essential services</strong> for the public good']], phases: [['Examples', 'government ministries and departments, statutory bodies such as the National Water Commission']] }
          ]
        },
        {
          type: 'components', title: 'What decides which form to choose?', items: [['fa-sack-dollar', 'capital needed'], ['fa-shield-halved', 'risk / liability'], ['fa-user-tie', 'how much control the owner wants'], ['fa-maximize', 'size of the business'], ['fa-file-signature', 'legal requirements'], ['fa-infinity', 'need for continuity'], ['fa-store', 'type of business']]
        }
      ]
    },
    {
      id: 'economic-systems', title: 'Scarcity and economic systems', nav: 'Economic Systems', icon: 'fa-earth-americas',
      blocks: [
        {
          type: 'steps', horizontal: true, items: [
            { title: 'Scarcity', html: 'Wants are <strong>unlimited</strong> but resources are <strong>limited</strong>.' },
            { title: 'Choice', html: 'So people, firms and governments must choose.' },
            { title: 'Opportunity cost', html: 'The <strong>next best alternative given up</strong> when you choose.' }
          ]
        },
        {
          type: 'grid', cols: 3, items: [
            { icon: 'fa-box-open', title: 'What to produce?', html: 'Which goods and services, and how many?' },
            { icon: 'fa-gears', title: 'How to produce?', html: 'Using more labour or more machines?' },
            { icon: 'fa-users', title: 'For whom to produce?', html: 'Who gets the goods and services?' }
          ]
        },
        {
          type: 'org', items: [
            { title: 'Traditional economy', color: '#a16207', html: 'Decisions based on <strong>custom and tradition</strong>; often farming, fishing and hunting for the family’s own use.', points: ['Clear roles', 'Close communities', 'Little pollution'], cons: ['Little progress or new technology', 'Low standard of living', 'Few choices'] },
            { title: 'Command (planned) economy', color: '#ef4444', html: 'The <strong>government</strong> owns most resources and decides what, how and for whom. e.g. Cuba, North Korea.', points: ['Basic needs provided for all', 'Less inequality', 'No wasteful competition'], cons: ['Little choice for consumers', 'Little incentive to work hard', 'Shortages and slow decisions'] },
            { title: 'Market (free enterprise) economy', color: '#3b82f6', html: '<strong>Private individuals</strong> own resources; <strong>supply and demand</strong> (prices) decide what is produced. e.g. the USA is the closest example.', points: ['Wide choice', 'Competition improves quality', 'Incentive to work and invent'], cons: ['Big gap between rich and poor', 'Essential services may be ignored if not profitable', 'Monopolies can form'] },
            { title: 'Mixed economy', color: '#22c55e', html: 'Both a <strong>private sector</strong> and a <strong>public sector</strong>. Government provides some services and controls some activities. e.g. <strong>Jamaica</strong>, the UK.', points: ['Choice and competition', 'Government provides essential services', 'Safety net for the poor'], cons: ['Taxes can be high', 'Government may be inefficient', 'Too much control can discourage business'] }
          ]
        },
        { type: 'callout', tone: 'tip', icon: 'fa-scale-balanced', title: 'Comparing systems', html: 'Exams judge systems on <strong>efficiency</strong> (no waste), <strong>equality</strong> (fair shares), <strong>choice</strong> (freedom for consumers) and <strong>public welfare</strong> (care for everyone).' }
      ]
    },
    {
      id: 'functional-areas', title: 'Functional areas of a business', nav: 'Functional Areas', icon: 'fa-sitemap',
      blocks: [
        { type: 'lead', html: 'Larger firms split their work into <strong>departments (functional areas)</strong>. This lets staff <strong>specialise</strong>, become experts and work faster.' },
        {
          type: 'accordion', items: [
            { badge: 'HR', color: '#ec4899', title: 'Human resources (personnel)', sub: 'Looks after the staff', points: [['Recruit and select', 'advertise jobs, interview, hire'], ['Train and develop', 'induction and training'], ['Welfare', 'health, safety and staff well-being'], ['Records and discipline', 'keep staff records, handle complaints, dismissals']] },
            { badge: 'FIN', color: '#22c55e', title: 'Finance / accounts', sub: 'Looks after the money', points: [['Records', 'keep accurate financial records'], ['Pay', 'wages, bills and suppliers'], ['Budgets', 'plan income and spending'], ['Capital', 'raise money; prepare financial statements']] },
            { badge: 'MKT', color: '#f59e0b', title: 'Marketing', sub: 'Finds and keeps customers', points: [['Market research', 'find out what customers want'], ['The 4 Ps', 'Product, Price, Place, Promotion'], ['Advertising', 'promote the business and its products']] },
            { badge: 'SALES', color: '#ef4444', title: 'Sales', sub: 'Sells the products', points: [['Selling', 'deal directly with customers and close sales'], ['Orders', 'process orders'], ['After-sales', 'follow up with customers']] },
            { badge: 'PROD', color: '#3b82f6', title: 'Production / operations', sub: 'Makes the goods or service', points: [['Turn inputs into outputs', 'manufacture the product'], ['Quality control', 'check products meet standards'], ['Plan', 'schedule production; maintain machines']] },
            { badge: 'PUR', color: '#06b6d4', title: 'Purchasing', sub: 'Buys what the business needs', points: [['Raw materials and equipment', 'buy them'], ['The five rights', 'right quality, quantity, price, time and supplier'], ['Stock control', 'avoid running out or over-stocking']] },
            { badge: 'ADMIN', color: '#a855f7', title: 'Administration', sub: 'Runs the office', points: [['Records and filing', 'keep information organised'], ['Communication', 'mail, reception, phones'], ['Support', 'help every other department']] },
            { badge: 'CS', color: '#14b8a6', title: 'Customer service', sub: 'Keeps customers happy', points: [['Queries and complaints', 'answer them politely and quickly'], ['Returns and refunds', 'handle them fairly'], ['Feedback', 'pass customer ideas to other departments']] }
          ]
        },
        { type: 'heading', text: 'Why the departments depend on each other' },
        {
          type: 'steps', horizontal: true, items: [
            { title: 'Marketing', html: 'forecasts how many will sell' },
            { title: 'Production', html: 'plans how many to make' },
            { title: 'Purchasing', html: 'buys the materials' },
            { title: 'Finance', html: 'provides the budget' },
            { title: 'HR', html: 'hires and trains the workers' }
          ]
        }
      ]
    }
  ],

  quiz: [
    { q: 'Barter is…', options: ['exchanging goods for goods without money', 'buying on credit', 'paying by cheque', 'selling shares'], answer: 0, why: 'Direct swap of goods and services.' },
    { q: 'The “double coincidence of wants” means…', options: ['each trader must want what the other has', 'two people want the same thing', 'prices are doubled', 'goods are divided in two'], answer: 0, why: 'Both sides must want each other’s goods at the same time.' },
    { q: 'Which is NOT a problem of barter?', options: ['Prices in one common unit', 'Goods cannot be divided', 'No store of value', 'No common measure of value'], answer: 0, why: 'A common unit of price is a benefit of money.' },
    { q: 'Money used to buy and sell is acting as a…', options: ['medium of exchange', 'store of value', 'measure of value', 'standard of deferred payment'], answer: 0, why: 'It is what you exchange for goods.' },
    { q: 'Being able to buy now and pay later is money acting as a…', options: ['standard of deferred payment', 'medium of exchange', 'store of value', 'unit of account'], answer: 0, why: 'Deferred = later.' },
    { q: 'Good money should be divisible, which means it…', options: ['can be split into smaller units', 'lasts a long time', 'is easy to carry', 'is accepted by everyone'], answer: 0, why: 'e.g. dollars into cents.' },
    { q: 'A credit card lets you…', options: ['buy now and pay the card company later', 'take money straight from your account', 'withdraw unlimited cash', 'avoid paying'], answer: 0, why: 'A debit card takes money straight from your account.' },
    { q: 'Unlimited liability means…', options: ['the owner’s personal possessions can be used to pay business debts', 'the business has unlimited profit', 'there is no limit on shareholders', 'the owner pays no tax'], answer: 0, why: 'Sole traders and general partners face this risk.' },
    { q: 'Which business has only ONE owner?', options: ['Sole trader', 'Partnership', 'Co-operative', 'PLC'], answer: 0, why: 'Sole = one.' },
    { q: 'A deed of partnership…', options: ['sets out how the partnership will be run and profits shared', 'sells shares to the public', 'gives limited liability to all partners', 'is a bank loan'], answer: 0, why: 'It prevents disagreements later.' },
    { q: 'Which can sell shares to the general public?', options: ['Public limited company', 'Private limited company', 'Sole trader', 'Partnership'], answer: 0, why: 'PLCs list shares on a stock exchange.' },
    { q: '“One member, one vote” describes a…', options: ['co-operative', 'PLC', 'franchise', 'sole trader'], answer: 0, why: 'Co-ops are run democratically by members.' },
    { q: 'A business that pays to use another firm’s brand and methods is a…', options: ['franchise', 'partnership', 'co-operative', 'public corporation'], answer: 0, why: 'The franchisee pays the franchisor.' },
    { q: 'Continuity means the business…', options: ['carries on if an owner dies or leaves', 'never makes a loss', 'always grows', 'has one owner'], answer: 0, why: 'Companies have continuity; sole traders do not.' },
    { q: 'The main aim of the public sector is to…', options: ['provide essential services', 'make maximum profit', 'sell shares', 'compete with co-ops'], answer: 0, why: 'It is owned by the government for the public good.' },
    { q: 'Opportunity cost is…', options: ['the next best alternative given up', 'the price of a good', 'the cost of opportunities', 'money saved'], answer: 0, why: 'What you give up when you choose.' },
    { q: 'Which is one of the three basic economic questions?', options: ['For whom to produce?', 'Where to advertise?', 'Who pays tax?', 'When to sell shares?'], answer: 0, why: 'What, how and for whom.' },
    { q: 'In a command economy, decisions are made by…', options: ['the government', 'consumers', 'tradition', 'the stock exchange'], answer: 0, why: 'The state plans the economy.' },
    { q: 'Jamaica is best described as a…', options: ['mixed economy', 'command economy', 'traditional economy', 'pure market economy'], answer: 0, why: 'It has both private and public sectors.' },
    { q: 'Which department recruits and trains staff?', options: ['Human resources', 'Finance', 'Purchasing', 'Production'], answer: 0, why: 'HR looks after the workers.' },
    { q: 'Which department uses the 4 Ps?', options: ['Marketing', 'Accounts', 'Administration', 'HR'], answer: 0, why: 'Product, Price, Place, Promotion.' },
    { q: 'Buying raw materials at the right price, quality and time is the job of…', options: ['purchasing', 'sales', 'customer service', 'HR'], answer: 0, why: 'The “five rights” of purchasing.' }
  ],

  flashcards: [
    ['Barter', 'Direct exchange of goods/services without money', 'Barter'],
    ['Double coincidence of wants', 'Each trader must have what the other wants and want what the other has', 'Barter'],
    ['Problems of barter', 'Double coincidence, no common measure of value, indivisibility, hard to store wealth, deferred payment, transport', 'Barter'],
    ['Money', 'Anything generally accepted as payment for goods, services or debts', 'Money'],
    ['Four functions of money', 'Medium of exchange, measure of value, store of value, standard of deferred payment', 'Money'],
    ['Characteristics of good money', 'Acceptable, durable, portable, divisible, homogeneous, scarce, recognisable, stable', 'Money'],
    ['Legal tender', 'Notes and coins that must be accepted as payment by law', 'Money'],
    ['Cheque', 'Written order telling a bank to pay a named person', 'Money'],
    ['Standing order', 'Instruction to a bank to pay a fixed amount regularly', 'Money'],
    ['Sole trader', 'One owner; unlimited liability; keeps all profit', 'Ownership'],
    ['Partnership', '2 or more owners (usually up to 20); deed of partnership; usually unlimited liability', 'Ownership'],
    ['Limited (sleeping) partner', 'Invests money but takes no part in running the business; has limited liability', 'Ownership'],
    ['Private limited company', 'Shareholders; shares not sold to the public; limited liability', 'Ownership'],
    ['Public limited company', 'Sells shares to the public on a stock exchange; limited liability', 'Ownership'],
    ['Co-operative', 'Owned and run by members; one member, one vote; e.g. credit unions', 'Ownership'],
    ['Franchise', 'Franchisee pays to use a franchisor’s brand, products and methods', 'Ownership'],
    ['Limited liability', 'Owners can lose only what they invested', 'Ownership'],
    ['Separate legal identity', 'Business is a legal person separate from its owners', 'Ownership'],
    ['Public sector', 'Government-owned; provides essential services', 'Ownership'],
    ['Scarcity', 'Unlimited wants but limited resources', 'Economics'],
    ['Opportunity cost', 'Next best alternative given up', 'Economics'],
    ['Three economic questions', 'What to produce, how to produce, for whom to produce', 'Economics'],
    ['Traditional economy', 'Decisions based on custom and tradition', 'Economics'],
    ['Command economy', 'Government owns resources and makes economic decisions', 'Economics'],
    ['Market economy', 'Private ownership; supply and demand decide', 'Economics'],
    ['Mixed economy', 'Private and public sectors together (e.g. Jamaica)', 'Economics'],
    ['Human resources', 'Recruits, trains, pays and looks after staff', 'Functional areas'],
    ['Finance department', 'Keeps records, pays bills and wages, budgets, raises capital', 'Functional areas'],
    ['Marketing department', 'Market research and the 4 Ps', 'Functional areas'],
    ['Production department', 'Turns inputs into goods; quality control', 'Functional areas'],
    ['Purchasing department', 'Buys materials: right quality, quantity, price, time, supplier', 'Functional areas'],
    ['Interdependence of departments', 'Each department relies on the others, e.g. production needs purchasing to buy materials']
  ]
});
