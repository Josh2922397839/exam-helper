/* Zing interactive tools — Biology (see assets/js/core/interactive.js for the tool kinds) */
window.EF = window.EF || {};
(EF.labs = EF.labs || {}).biology = [
  { id: 'cycle', kind: 'widget', name: 'cycle', topic: 'menstrual-cycle', title: 'Menstrual cycle explorer', desc: 'Move through the 28 days and watch the hormones and the uterus lining change.' },
  { id: 'mitosis-order', kind: 'order', topic: 'cell-division', title: 'Mitosis step by step', desc: 'Put the stages of mitosis in the right order.',
    prompt: 'Tap the stages in order, starting before the cell divides.',
    steps: [
      ['Interphase', 'The cell grows and copies its DNA'],
      ['Prophase', 'Chromosomes condense; the nuclear envelope breaks down'],
      ['Metaphase', 'Chromosomes line up in the middle of the cell'],
      ['Anaphase', 'Sister chromatids separate and move to opposite poles'],
      ['Telophase', 'Chromosomes relax and nuclear envelopes re-form'],
      ['Cytokinesis', 'The cytoplasm divides: two identical daughter cells']
    ] },
  { id: 'mitosis-or-meiosis', kind: 'sort', topic: 'gametes', title: 'Mitosis or meiosis?', desc: 'Sort each fact into the right kind of cell division.',
    buckets: ['Mitosis', 'Meiosis'],
    items: [
      ['Growth and repair', 0], ['Makes 2 identical cells', 0], ['Daughter cells are diploid (2n)', 0], ['One division', 0], ['Asexual reproduction', 0],
      ['Makes gametes (sperm and eggs)', 1], ['Makes 4 different cells', 1], ['Daughter cells are haploid (n)', 1], ['Crossing over happens', 1], ['Two divisions', 1]
    ] },
  { id: 'egg-journey', kind: 'order', topic: 'fertilization', title: 'From ovulation to implantation', desc: 'Follow the egg from the ovary to the wall of the uterus.',
    steps: [
      ['Ovulation', 'A mature egg is released from an ovary'],
      ['Sperm travel up', 'Through the cervix and uterus into the fallopian tubes'],
      ['Fertilisation', 'In the ampulla of the fallopian tube; enzymes break the egg’s outer layers'],
      ['Zygote', 'The sperm and egg nuclei fuse: 46 chromosomes'],
      ['Blastocyst', 'The cells divide into a hollow ball as it moves to the uterus'],
      ['Implantation', 'The blastocyst attaches to the endometrium, 6–10 days after fertilisation']
    ] },
  { id: 'std-types', kind: 'sort', topic: 'stds', title: 'Bacterial or viral?', desc: 'Sort the STDs, and how they’re treated, into bacteria or viruses.',
    buckets: ['Bacterial', 'Viral'],
    items: [
      ['Chlamydia', 0], ['Gonorrhoea', 0], ['Syphilis', 0], ['Cured with antibiotics', 0], ['Caused by Treponema pallidum', 0],
      ['HIV', 1], ['Herpes (HSV)', 1], ['HPV', 1], ['Hepatitis B', 1], ['Managed with antiretroviral therapy', 1]
    ] }
];
