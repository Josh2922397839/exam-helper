/* Zing deck — Business Basics (Grade 9): extra cards.
   Each card: [question, answer, [three wrong answers], why]. Cards are grouped by topic. */
window.EF = window.EF || {};
(EF.decks = EF.decks || {}).business = [
  { tag: 'Document flow', cards: [
    ['What is the correct order of the paper trail for a sale?', 'Order form → invoice → payment → receipt → cash book', ['Invoice → order form → receipt → payment → cash book', 'Receipt → invoice → order form → payment → cash book', 'Order form → receipt → invoice → payment → cash book'], 'The buyer orders, the seller bills, the buyer pays, the seller confirms, and both record it.'],
    ['Which document starts every sale?', 'The order form', ['The invoice', 'The receipt', 'The cash book'], 'The buyer first asks the seller for the goods.'],
    ['Who sends the receipt, and to whom?', 'The seller, to the buyer', ['The buyer, to the seller', 'The bank, to the seller', 'The buyer, to the bank'], 'The seller confirms that the payment arrived.'],
    ['Which document comes straight after the payment?', 'The receipt', ['The invoice', 'The order form', 'A new order'], 'Once the money arrives, the seller sends a receipt.'],
    ['Who records the money in a cash book?', 'Both businesses: buyer and seller', ['Only the seller', 'Only the buyer', 'Only the bank'], 'Each business records its own money in and out.'],
    ['Name three ways a buyer can pay.', 'Bank transfer, cheque or cash', ['Invoice, receipt or order form', 'Credit, debit or balance', 'Tax, subtotal or total'], 'The notes list bank transfer, cheque and cash.'],
    ['Which two documents does the seller send?', 'The invoice and the receipt', ['The order form and the receipt', 'The order form and the invoice', 'The order form and the payment'], 'The buyer sends the order form and the payment.'],
    ['Why is a paper trail useful?', 'It keeps a clear record of every step of a sale', ['It makes goods cheaper', 'It replaces payment', 'It hides prices from the buyer'], 'If there’s a dispute, the documents show what was ordered, billed and paid.']
  ] },
  { tag: 'Order form', cards: [
    ['Name the four key parts of an order form.', 'Buyer details, seller details, items and quantities, delivery terms', ['Receipt number, date of payment, amount paid and payment method', 'Invoice number, tax charged, total amount due and payment due date', 'Date, description of the entry, debit column and credit column'], 'These are the key parts listed in the notes.'],
    ['On an order form, what does “Qty” mean?', 'Quantity: how many of each item', ['The quality of the goods', 'The unit price', 'The order number'], 'Qty × unit price gives each line’s subtotal.'],
    ['50 USB-C cables cost $4.99 each. What is the line subtotal?', '$249.50', ['$54.99', '$24.95', '$499.00'], '50 × $4.99 = $249.50.'],
    ['30 wireless mice cost $12.50 each. What is the line subtotal?', '$375.00', ['$42.50', '$37.50', '$3,750.00'], '30 × $12.50 = $375.00.'],
    ['What is a purchase order (PO) number for?', 'To identify and track the order', ['To show the tax charged', 'To prove payment', 'To show the bank balance'], 'Both businesses can refer to it, for example PO-2023-112.'],
    ['“Delivery within 5 business days” is an example of:', 'Delivery terms', ['Payment terms', 'A receipt', 'Span of control'], 'Delivery terms say when and where the goods arrive.'],
    ['On an order form, is the buyer in the “From” or the “To” box?', 'From: the buyer sends the order', ['To: the buyer receives the order', 'Both boxes', 'Neither box'], 'The order goes from the buyer to the seller.']
  ] },
  { tag: 'Invoice', cards: [
    ['An invoice subtotal is $923.50 and tax is 10%. How much is the tax?', '$92.35', ['$9.24', '$923.50', '$92.00'], '10% of $923.50 = $92.35.'],
    ['Subtotal $923.50 plus tax $92.35. What is the total due?', '$1,015.85', ['$831.15', '$1,015.00', '$923.50'], 'Total due = subtotal + tax.'],
    ['An invoice is dated 26 October with terms Net 30. When is payment due?', 'About 25 November: 30 days later', ['30 October: four days later', '26 October: on the same day', '26 December: two months later'], 'Net 30 means pay within 30 days of the invoice date.'],
    ['Why does an invoice have an invoice number?', 'So the sale can be tracked and matched to the payment', ['So the buyer knows how many items to order', 'So the seller can work out the tax on each item', 'So the bank knows which account to pay into'], 'The receipt can then say “payment for invoice INV-2024-0847”.'],
    ['On an invoice, who goes under “Bill to”?', 'The buyer', ['The seller', 'The bank', 'The delivery driver'], '“Bill to” names the person or business that must pay.'],
    ['What does the seller ask for with an invoice?', 'Payment', ['Goods', 'A receipt', 'A new order'], 'The invoice tells the buyer what is owed and when.'],
    ['What does “subtotal” mean?', 'The total before tax', ['The total after tax', 'The tax only', 'The amount already paid'], 'Tax is added to the subtotal to give the total due.'],
    ['100 screen protectors cost $2.99 each. What is the line amount?', '$299.00', ['$29.90', '$102.99', '$2,990.00'], '100 × $2.99 = $299.00.'],
    ['If a buyer pays an invoice late, which terms did they break?', 'The payment terms, such as Net 30', ['The delivery terms', 'The span of control', 'The chain of command'], 'Payment terms set the deadline for paying.']
  ] },
  { tag: 'Receipt', cards: [
    ['Name the four key parts of a receipt.', 'Receipt number, date, amount and payment method', ['Buyer, seller, items and delivery terms', 'Invoice number, tax, total due and due date', 'Date, description, debit and credit'], 'These are the receipt’s key parts in the notes.'],
    ['Why should a buyer keep receipts?', 'As proof that they paid', ['To order more goods', 'To work out tax', 'To show who the manager is'], 'A receipt confirms the transaction is complete.'],
    ['A receipt says “Payment for invoice INV-2024-0847”. Why include this?', 'To link the payment to the right invoice', ['To show the delivery date', 'To list the items again', 'To show the next order'], 'Matching documents keeps the records clear.'],
    ['A receipt is evidence that a transaction is:', 'Complete', ['Just starting', 'Cancelled', 'Overdue'], 'It confirms the money has been received.'],
    ['A shop gives you a slip after you pay cash for lunch. What is it?', 'A receipt', ['An invoice', 'An order form', 'A cash book'], 'It proves you paid.'],
    ['On a receipt, “Bank transfer” is the:', 'Payment method', ['Receipt number', 'Amount', 'Date'], 'It shows how the money was paid.']
  ] },
  { tag: 'Cash book', cards: [
    ['Opening balance $500. Received $300, paid $150. New balance?', '$650', ['$950', '$350', '$800'], '500 + 300 − 150 = 650.'],
    ['Balance $1,200. Paid $450 for supplies. New balance?', '$750', ['$1,650', '$450', '$1,200'], '1,200 − 450 = 750.'],
    ['Balance $80. Received $120 from a customer. New balance?', '$200', ['$40', '$120', '$80'], '80 + 120 = 200.'],
    ['Balance $300. Received $250, paid $400. New balance?', '$150', ['$950', '$550', '$650'], '300 + 250 − 400 = 150.'],
    ['Start with $1,000. Receive $250 and $150, then pay $300. Balance?', '$1,100', ['$1,700', '$700', '$1,400'], '1,000 + 250 + 150 − 300 = 1,100.'],
    ['A business pays its electricity bill. Which cash book column is it in?', 'Credit: money out', ['Debit: money in', 'The balance column only', 'The description column only'], 'Payments are money out.'],
    ['A customer pays the business $500. Which cash book column is it in?', 'Debit: money in', ['Credit: money out', 'Tax', 'Qty'], 'Money received is money in.'],
    ['Name the five columns of a cash book.', 'Date, description, debit, credit, balance', ['Item, qty, unit price, subtotal, total', 'Receipt number, date, amount, method, thanks', 'Buyer, seller, items, delivery, terms'], 'The balance column keeps a running total.'],
    ['What does a running balance show?', 'How much money the business has after each entry', ['The total sales the business made this year', 'How much tax the business owes the government', 'How many items were sold on each day'], 'Each new line updates the balance.'],
    ['Why do businesses keep a cash book?', 'To track every cash transaction and always know the balance', ['To list the goods a buyer wants to order from them', 'To prove to customers that their payments arrived', 'To show who reports to whom in the business'], 'It records receipts (money in) and payments (money out).']
  ] },
  { tag: 'Organisation structures', cards: [
    ['What does an organisation structure show?', 'How a business is arranged: who reports to whom and who does what', ['How much money the business makes and spends each year', 'The order in which business documents are sent and received', 'The prices the business charges for each of its products'], 'It also shows how information flows.'],
    ['Give one disadvantage of a hierarchical structure.', 'Decisions can be slow', ['Managers have too many staff', 'Workers have two bosses', 'There is no chain of command'], 'Messages pass through many levels and can get lost on the way down.'],
    ['Give one advantage of a hierarchical structure.', 'Clear lines of authority', ['Very few levels of management', 'Workers report to two managers', 'Everyone makes the decisions'], 'Roles are well defined and tasks are specialised.'],
    ['Give one advantage of a flat structure.', 'Faster decisions', ['More chances for promotion', 'A narrow span of control', 'Many levels of management'], 'Fewer levels mean information moves quickly and staff are more involved.'],
    ['Give one disadvantage of a flat structure.', 'Managers can be overloaded', ['Decisions are very slow', 'Workers have two bosses', 'There are too many levels'], 'Each manager has a wide span of control.'],
    ['Why might a flat structure offer fewer chances for promotion?', 'There are fewer management levels to move up to', ['Managers never leave', 'Workers report to two bosses', 'Decisions are centralised'], 'Fewer levels means fewer senior posts.'],
    ['Give one disadvantage of a matrix structure.', 'Having two bosses can be confusing', ['Decisions are always slow', 'There is no teamwork', 'Skills are wasted'], 'Managers may also disagree about priorities.'],
    ['Give one advantage of a matrix structure.', 'Teams work across departments and skills are used well', ['Every worker has only one boss, so there is no confusion', 'It has the most levels, so there are many promotions', 'All decisions are made at the top, so they are quick'], 'Project teams draw people from different departments.'],
    ['A worker reports to the head of marketing and to a project leader. Which structure is this?', 'Matrix', ['Hierarchical', 'Flat', 'Centralised'], 'Dual reporting is the mark of a matrix structure.'],
    ['A small business has an owner and six staff with no middle managers. Which structure is it closest to?', 'Flat', ['Hierarchical', 'Matrix', 'Tall'], 'Few levels and a wide span of control.'],
    ['What does “centralised” mean?', 'Decisions are made at the top', ['Decisions are spread to lower levels', 'Workers have two bosses', 'Nobody makes decisions'], 'In a decentralised business, decisions are spread out to lower levels.'],
    ['What does “decentralised” mean?', 'Decisions are spread out to lower levels', ['Decisions are made only at the top', 'Workers report to two managers', 'The business has no managers'], 'Flat structures are usually decentralised.'],
    ['A manager directly supervises 8 workers. What is the span of control?', '8', ['1', '4', '16'], 'Span of control is the number of people a manager directly supervises.'],
    ['A manager asks a supervisor to plan the staff rota. What is this called?', 'Delegation', ['Centralisation', 'Span of control', 'Chain of command'], 'Delegation passes authority for a task to someone lower down.'],
    ['Which structure usually has the widest span of control?', 'Flat', ['Hierarchical', 'Tall', 'Centralised'], 'Fewer levels means each manager supervises more people.'],
    ['In a hierarchical structure, which way does authority flow?', 'From the top down', ['From the bottom up', 'Sideways only', 'In a circle'], 'Orders pass down the chain of command.']
  ] },
  { tag: 'More business documents', cards: [
    ['Which document tells a buyer the price of goods before they order?', 'A quotation', ['A receipt', 'A credit note', 'A cash book'], 'Buyers often compare quotations from different sellers before ordering.'],
    ['Which document comes with the goods so the buyer can check what arrived?', 'A delivery note', ['An invoice', 'A quotation', 'A receipt'], 'The buyer signs it to confirm the goods were received.'],
    ['Which document lowers what a buyer owes, for example after returning damaged goods?', 'A credit note', ['A debit note', 'A delivery note', 'An order form'], 'A credit note reduces the amount on the buyer’s account.'],
    ['Which document increases what a buyer owes after they were undercharged?', 'A debit note', ['A credit note', 'A receipt', 'A delivery note'], 'It corrects an undercharge on an invoice.'],
    ['Which document sums up what a buyer owes at the end of the month?', 'A statement of account', ['A receipt', 'A delivery note', 'A quotation'], 'It lists the month’s invoices, credit notes and payments.'],
    ['Which document does a buyer send to ask about prices and terms?', 'A letter of enquiry', ['An invoice', 'A receipt', 'A credit note'], 'The seller replies with a quotation or price list.'],
    ['In what order do these usually come: enquiry, quotation, order?', 'Enquiry → quotation → order', ['Order → quotation → enquiry', 'Quotation → enquiry → order', 'Enquiry → order → quotation'], 'The buyer asks, the seller quotes, then the buyer orders.']
  ] }
];
