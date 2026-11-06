/* ExamForge interactive tools — Business Basics (see assets/js/core/interactive.js for the tool kinds) */
window.EF = window.EF || {};
(function () {
  'use strict';
  const money = (n) => '$' + n.toLocaleString('en-JM', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  (EF.labs = EF.labs || {}).business = [
    { id: 'cashbook', kind: 'widget', name: 'cashbook', topic: 'biz-cashbook', title: 'Cash book', desc: 'Add money in and money out and watch the running balance.' },
    { id: 'paper-trail', kind: 'order', topic: 'biz-documents', title: 'The paper trail', desc: 'Put the documents of a sale in the right order.',
      prompt: 'Tap the documents in order, from the first one sent.',
      steps: [
        ['Order form', 'Buyer → seller: “Please send me these goods.”'],
        ['Invoice', 'Seller → buyer: “Here’s what you owe and when to pay.”'],
        ['Payment', 'Buyer → seller: bank transfer, cheque or cash'],
        ['Receipt', 'Seller → buyer: “Payment received, thanks!”'],
        ['Cash book', 'Both businesses record the money in and out']
      ] },
    { id: 'which-document', kind: 'sort', topic: 'biz-receipt', title: 'Which document?', desc: 'Order form, invoice or receipt? Sort the clues.',
      buckets: ['Order form', 'Invoice', 'Receipt'],
      items: [
        ['Sent by the buyer', 0], ['Asks for goods', 0], ['Delivery terms', 0],
        ['A bill from the seller', 1], ['Shows the tax and total due', 1], ['Payment due date', 1],
        ['Proof of payment', 2], ['Shows the payment method', 2], ['“Thank you for your payment!”', 2]
      ] },
    { id: 'invoice-builder', kind: 'lab', topic: 'biz-invoice', title: 'Invoice builder', desc: 'Change the quantity, price and tax and see the invoice add up.',
      inputs: [
        { id: 'q', label: 'Quantity', min: 1, max: 100, value: 12 },
        { id: 'p', label: 'Unit price', min: 1, max: 50, value: 15, unit: 'dollars' },
        { id: 't', label: 'Tax rate', value: 10, options: [[0, 'No tax (0%)'], [10, 'Tax 10%'], [15, 'GCT 15%']] }
      ],
      calc: (v) => {
        const S = EF.svg, sub = v.q * v.p, tax = Math.round(sub * v.t) / 100, total = sub + tax;
        const rows = [['Description', 'Amount'], [`${v.q} × ${money(v.p)}`, money(sub)], ['Subtotal', money(sub)], [`Tax (${v.t}%)`, money(tax)]];
        let body = S.bar(20, 14, 260, 252, 'sv-mut') + S.bar(20, 14, 260, 44, 'sv-cs') + S.text(36, 42, 'INVOICE', 'sv-t', 'start') + S.text(264, 42, 'INV-0001', 'sv-ts', 'end');
        rows.forEach(([a, b], i) => { const y = 88 + i * 34; body += S.text(36, y, a, i ? 'sv-t' : 'sv-ts', 'start') + S.text(264, y, b, i ? 'sv-t' : 'sv-ts', 'end') + S.line(36, y + 12, 264, y + 12); });
        body += S.text(36, 240, 'Total due', 'sv-t', 'start') + S.text(264, 240, money(total), 'sv-t', 'end');
        return {
          out: [['Subtotal', money(sub)], ['Tax', money(tax)], ['Total due', money(total)]],
          svg: S.wrap(300, 280, body, 'Invoice'),
          note: 'Subtotal = quantity × unit price. Tax = subtotal × rate. Total due = subtotal + tax.'
        };
      },
      goal: { text: 'Make an invoice with a total due of exactly $1,100.00 at 10% tax.', check: (v) => v.t === 10 && v.q * v.p === 1000 } },
    { id: 'org-structures', kind: 'sort', topic: 'biz-org-structure', title: 'Which structure?', desc: 'Hierarchical, flat or matrix? Sort the features.',
      buckets: ['Hierarchical', 'Flat', 'Matrix'],
      items: [
        ['Clear chain of command', 0], ['Authority flows from the top down', 0], ['Slow decisions', 0], ['Messages get lost going down the levels', 0],
        ['Fewer levels of management', 1], ['Wider span of control', 1], ['Faster decisions', 1], ['Fewer chances for promotion', 1],
        ['Report to two managers', 2], ['Teams work across departments', 2], ['Confusing with two bosses', 2], ['Common in project-based companies', 2]
      ] }
  ];
})();
