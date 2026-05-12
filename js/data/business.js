export const businessDocs = {
  orderForm: {
    title: 'Order Form',
    desc: 'Used by a buyer to formally request goods or services from a seller.',
    components: ['Buyer Info', 'Seller Info', 'Items & Qty', 'Delivery Terms']
  },
  invoice: {
    title: 'Invoice',
    desc: 'A bill sent by a seller to a buyer detailing goods/services and amount due.',
    components: ['Invoice #', 'Date', 'Bill To', 'Items', 'Total Due']
  },
  receipt: {
    title: 'Receipt',
    desc: 'Proof of payment received. Confirms completion of transaction.',
    components: ['Receipt #', 'Date', 'Amount Paid', 'Payment Method']
  }
};

export const cashBookExample = [
  { date: '2023-10-26', desc: 'Opening Balance', in: null, out: null, balance: 1000.00 },
  { date: '2023-10-26', desc: 'Sale of Goods', in: 500.00, out: null, balance: 1500.00 },
  { date: '2023-10-27', desc: 'Payment to Supplier', in: null, out: 200.00, balance: 1300.00 },
  { date: '2023-10-28', desc: 'Office Supplies', in: null, out: 75.00, balance: 1225.00 },
  { date: '2023-10-29', desc: 'Customer Payment', in: 350.00, out: null, balance: 1575.00 },
  { date: '2023-10-30', desc: 'Rent Payment', in: null, out: 500.00, balance: 1075.00 }
];

export const orgStructures = [
  {
    name: 'Hierarchical',
    icon: 'fas fa-layer-group',
    color: 'amber',
    desc: 'Traditional model with a clear chain of command. Authority flows top-down.',
    pros: ['Clear authority', 'Well-defined roles', 'Specialization']
  },
  {
    name: 'Flat',
    icon: 'fas fa-arrows-left-right',
    color: 'blue',
    desc: 'Fewer management levels. Promotes involvement and faster decisions.',
    pros: ['Decentralized', 'Wider span of control', 'Increased autonomy']
  },
  {
    name: 'Matrix',
    icon: 'fas fa-diagram-project',
    color: 'purple',
    desc: 'Employees report to multiple managers. Common in project-based orgs.',
    pros: ['Dual reporting', 'Cross-dept collaboration', 'Skill efficiency']
  }
];
