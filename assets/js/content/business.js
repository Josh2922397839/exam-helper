/* ExamForge content — Business Basics */
window.EF = window.EF || {};
EF.subjects = EF.subjects || [];

EF.subjects.push({
  id: 'business',
  name: 'Business Basics',
  short: 'Business',
  icon: 'fa-briefcase',
  emoji: '💼',
  color: '#d946ef',
  tagline: 'Business documents, the cash book and organisation structures',
  intro: 'See real examples of an order form, invoice and receipt, practise a cash book with a running balance, and compare organisation structures.',

  data: {
    cashbook: [
      ['2023-10-26', 'Opening balance', null, null, 1000],
      ['2023-10-26', 'Sale of goods', 500, null],
      ['2023-10-27', 'Payment to supplier', null, 200],
      ['2023-10-28', 'Office supplies', null, 75],
      ['2023-10-29', 'Customer payment', 350, null],
      ['2023-10-30', 'Rent payment', null, 500]
    ]
  },

  topics: [
    {
      id: 'biz-documents', title: 'How the documents connect', nav: 'Document Flow', icon: 'fa-arrow-right-arrow-left',
      blocks: [
        { type: 'text', html: 'Every sale follows the same paper trail. Learn the order and who sends each document — exam questions love this.' },
        {
          type: 'steps', horizontal: true, items: [
            { title: 'Order form', html: '<strong>Buyer → Seller.</strong> “Please send me these goods.”' },
            { title: 'Invoice', html: '<strong>Seller → Buyer.</strong> “Here’s what you owe and when to pay.”' },
            { title: 'Payment', html: '<strong>Buyer → Seller.</strong> Bank transfer, cheque or cash.' },
            { title: 'Receipt', html: '<strong>Seller → Buyer.</strong> “Payment received — thanks!”' },
            { title: 'Cash book', html: 'Both businesses <strong>record</strong> the money in and out.' }
          ]
        }
      ]
    },
    {
      id: 'biz-order-form', title: '1.1 Order Form', nav: 'Order Form', icon: 'fa-clipboard-list',
      blocks: [
        { type: 'text', html: 'An <strong>order form</strong> is used by a <strong>buyer</strong> to formally request goods or services from a seller. It’s a clear record of what the buyer wants to purchase.' },
        {
          type: 'document', variant: 'order', title: 'Purchase Order', tag: 'Example',
          meta: [['Order #', 'PO-2023-112'], ['Date', 'Oct 20, 2023']],
          parties: [
            ['From (buyer)', 'Sunrise Electronics Ltd.<br>42 Market Street, Dublin<br>Tel: 01-234-5678'],
            ['To (seller)', 'TechSupply Wholesale<br>88 Industrial Park, Cork<br>Tel: 021-987-6543']
          ],
          table: {
            head: ['Item', 'Description', 'Qty', 'Unit price', 'Subtotal'],
            align: ['l', 'l', 'r', 'r', 'r'],
            rows: [
              ['USB-C cable', '1 m braided', '50', '$4.99', '$249.50'],
              ['Wireless mouse', 'Bluetooth 5.0', '30', '$12.50', '$375.00'],
              ['Screen protector', 'Tempered glass', '100', '$2.99', '$299.00']
            ],
            foot: [['Total', '$923.50']]
          },
          notes: [['Payment terms', 'Net 30'], ['Delivery', 'Within 5 business days to buyer’s address']]
        },
        { type: 'components', title: 'Key parts', items: [['fa-user', 'Buyer info'], ['fa-store', 'Seller info'], ['fa-boxes-stacked', 'Items & quantity'], ['fa-truck', 'Delivery terms']] }
      ]
    },
    {
      id: 'biz-invoice', title: '1.2 Invoice', nav: 'Invoice', icon: 'fa-file-invoice-dollar',
      blocks: [
        { type: 'text', html: 'An <strong>invoice</strong> is a bill sent by the <strong>seller</strong> to the buyer. It lists the goods or services provided and the amount due — it’s how the seller asks to be paid.' },
        {
          type: 'document', variant: 'invoice', title: 'Invoice', tag: 'TechSupply Wholesale',
          meta: [['Invoice #', 'INV-2024-0847'], ['Date', 'Oct 26, 2023']],
          parties: [
            ['Bill to', 'Sunrise Electronics Ltd.<br>42 Market Street, Dublin'],
            ['Payment due', 'Nov 25, 2023 (Net 30)<br>Bank transfer or cheque']
          ],
          table: {
            head: ['Description', 'Qty', 'Unit price', 'Amount'],
            align: ['l', 'r', 'r', 'r'],
            rows: [
              ['USB-C cable (1 m braided)', '50', '$4.99', '$249.50'],
              ['Wireless mouse (Bluetooth 5.0)', '30', '$12.50', '$375.00'],
              ['Screen protector (tempered glass)', '100', '$2.99', '$299.00']
            ],
            foot: [['Subtotal', '$923.50'], ['Tax (10%)', '$92.35'], ['Total due', '$1,015.85']]
          }
        },
        { type: 'callout', tone: 'tip', icon: 'fa-lightbulb', title: 'Order form vs invoice', html: 'The invoice has things the order form doesn’t: an <strong>invoice number</strong>, <strong>tax</strong>, the <strong>total due</strong> and a <strong>payment due date</strong>.' }
      ]
    },
    {
      id: 'biz-receipt', title: '1.3 Receipt', nav: 'Receipt', icon: 'fa-receipt',
      blocks: [
        { type: 'text', html: 'A <strong>receipt</strong> is <strong>proof of payment</strong>. It confirms the transaction is complete and the money has been received.' },
        {
          type: 'receipt', business: 'TechSupply Wholesale', address: '88 Industrial Park, Cork',
          rows: [['Receipt #', 'REC-2024-1203'], ['Date', 'Nov 20, 2023'], ['Received from', 'Sunrise Electronics Ltd.']],
          lines: ['Payment for invoice INV-2024-0847', 'Electronics order (cables, mice, protectors)'],
          amount: '$1,015.85', method: 'Bank transfer', thanks: 'Thank you for your payment!'
        },
        { type: 'components', title: 'Key parts', items: [['fa-hashtag', 'Receipt #'], ['fa-calendar', 'Date'], ['fa-dollar-sign', 'Amount'], ['fa-credit-card', 'Payment method']] }
      ]
    },
    {
      id: 'biz-cashbook', title: '1.4 Cash Book', nav: 'Cash Book', icon: 'fa-book-open',
      blocks: [
        { type: 'text', html: 'A <strong>cash book</strong> records every cash transaction: <strong>receipts</strong> (money in) and <strong>payments</strong> (money out), with a running balance.' },
        { type: 'callout', tone: 'formula', icon: 'fa-equals', title: 'The formula', html: '<span class="mono">Balance = Previous balance + Amount received − Amount paid</span>' },
        { type: 'widget', name: 'cashbook' },
        { type: 'components', title: 'Columns', items: [['fa-calendar-day', 'Date'], ['fa-pen', 'Description'], ['fa-arrow-down', 'Debit (money in)'], ['fa-arrow-up', 'Credit (money out)'], ['fa-scale-balanced', 'Balance']] }
      ]
    },
    {
      id: 'biz-org-structure', title: '2. Organisation Structures', nav: 'Org Structures', icon: 'fa-sitemap',
      blocks: [
        { type: 'text', html: 'An <strong>organisation structure</strong> shows how the parts of a business are arranged — who reports to whom, how information flows and who is responsible for what.' },
        {
          type: 'org', items: [
            { title: 'Hierarchical', color: '#f5a524', diagram: 'hierarchy', html: 'The traditional model with a clear <strong>chain of command</strong>. Authority flows from the top down.', points: ['Clear lines of authority', 'Well-defined roles', 'Specialised tasks'], cons: ['Slow decisions', 'Communication can get lost going down the levels'] },
            { title: 'Flat', color: '#4f7cff', diagram: 'flat', html: '<strong>Fewer levels</strong> of management. Employees are more involved and decisions are faster.', points: ['Decentralised decisions', 'Wider span of control', 'More independence'], cons: ['Managers can be overloaded', 'Fewer chances for promotion'] },
            { title: 'Matrix', color: '#d946ef', diagram: 'matrix', html: 'Employees report to <strong>more than one manager</strong> — e.g. a department head and a project leader. Common in project-based companies.', points: ['Dual reporting', 'Teams work across departments', 'Skills used efficiently'], cons: ['Confusing with two bosses', 'Possible conflict between managers'] }
          ]
        },
        { type: 'terms', title: 'Words to know', items: [
          ['Chain of command', 'The line of authority from the top of a business to the bottom.'],
          ['Span of control', 'The number of people a manager is directly in charge of.'],
          ['Delegation', 'Passing authority to do a task down to someone lower in the structure.'],
          ['Centralised', 'Decisions are made at the top.'],
          ['Decentralised', 'Decisions are spread out to lower levels.']
        ] }
      ]
    }
  ],

  quiz: [
    { q: 'An order form is used by the:', options: ['Seller to request payment', 'Buyer to request goods', 'Bank to approve loans', 'Government to collect tax'], answer: 1, why: 'The buyer sends the order form to the seller.' },
    { q: 'Which document is proof of payment?', options: ['Invoice', 'Order form', 'Receipt', 'Cash book'], answer: 2, why: 'A receipt confirms the money has been received.' },
    { q: 'An invoice is sent by the:', options: ['Buyer to the seller', 'Seller to the buyer', 'Bank to the buyer', 'Government to the seller'], answer: 1, why: 'The seller sends the invoice asking to be paid.' },
    { q: 'In a cash book, “amount received” is also called:', options: ['Credit', 'Debit', 'Balance', 'Net'], answer: 1, why: 'Money in = debit side. Money out = credit side.' },
    { q: 'A hierarchical structure has:', options: ['No managers', 'Dual reporting', 'A clear chain of command', 'Complete independence'], answer: 2, why: 'Authority flows top-down through clear levels.' },
    { q: 'A flat structure has:', options: ['Many management levels', 'Fewer management levels', 'No employees', 'Two bosses per employee'], answer: 1, why: 'Flat = few levels, wide span of control.' },
    { q: 'A matrix structure involves:', options: ['One manager per employee', 'No managers', 'Employees reporting to more than one manager', 'Only top-level managers'], answer: 2, why: 'E.g. a department head and a project manager.' },
    { q: 'What appears on an invoice but NOT on an order form?', options: ['Item descriptions', 'Invoice number', 'Buyer information', 'Quantity'], answer: 1, why: 'The invoice number (plus tax and the total due) is added by the seller.' },
    { q: 'Opening balance $1,000, receive $500, pay $200. New balance?', options: ['$700', '$1,300', '$1,500', '$1,700'], answer: 1, why: '1,000 + 500 − 200 = $1,300.' },
    { q: 'What comes right after the invoice in the paper trail?', options: ['Order form', 'Payment', 'Receipt', 'Delivery note'], answer: 1, why: 'Order form → invoice → payment → receipt.' },
    { q: '“Span of control” means:', options: ['How long a manager works', 'How many people a manager is directly in charge of', 'The company’s total budget', 'The number of departments'], answer: 1, why: 'Flat structures have a wide span of control.' }
  ],

  flashcards: [
    ['Order form', 'Buyer → seller: a formal request for goods or services'],
    ['Invoice', 'Seller → buyer: a bill showing what is owed and when'],
    ['Receipt', 'Seller → buyer: proof that payment was received'],
    ['Cash book', 'Record of all cash in (receipts) and out (payments) with a running balance'],
    ['Debit (cash book)', 'Money in / amount received'],
    ['Credit (cash book)', 'Money out / amount paid'],
    ['Balance formula', 'Previous balance + received − paid'],
    ['Net 30', 'Payment is due within 30 days'],
    ['Hierarchical structure', 'Clear chain of command, authority flows top-down'],
    ['Flat structure', 'Few management levels, faster decisions, wide span of control'],
    ['Matrix structure', 'Employees report to more than one manager'],
    ['Chain of command', 'Line of authority from top to bottom'],
    ['Span of control', 'Number of people a manager directly supervises'],
    ['Delegation', 'Passing authority for a task to someone lower down']
  ]
});
