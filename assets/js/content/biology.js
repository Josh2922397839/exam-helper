/* ExamForge content — Biology */
window.EF = window.EF || {};
EF.subjects = EF.subjects || [];

(function () {
  var male = [
    ['Testes', 'Make sperm and testosterone.', 'Located in the scrotum. They produce sperm (spermatogenesis) and male sex hormones, mainly testosterone.'],
    ['Scrotum', 'Keeps the testes at the right temperature.', 'A sac of skin outside the body that holds the testes. It keeps them slightly cooler than body temperature, which sperm production needs.'],
    ['Epididymis', 'Coiled tube where sperm mature.', 'A coiled tube attached to the back of each testis. Sperm mature and are stored here.'],
    ['Vas deferens', 'Carries sperm to the ejaculatory duct.', 'A tube that carries mature sperm from the epididymis to the ejaculatory duct.'],
    ['Seminal vesicles', 'Make a fructose-rich fluid for sperm.', 'Glands that make fluid rich in fructose (energy for sperm) and prostaglandins (help uterine contractions).'],
    ['Prostate gland', 'Makes a fluid that activates sperm.', 'Secretes a milky fluid that helps activate sperm and neutralise the acidity of the female reproductive tract.'],
    ['Bulbourethral glands', 'Lubricate and neutralise the urethra.', 'Make clear, alkaline mucus that lubricates the urethra and neutralises leftover acidic urine before ejaculation.'],
    ['Urethra', 'Carries urine and semen out of the body.', 'Tube that carries urine from the bladder and semen from the ejaculatory ducts out through the penis.'],
    ['Penis', 'External organ with erectile tissue.', 'External male reproductive organ. Its erectile tissue fills with blood during arousal, allowing intercourse.']
  ];
  var female = [
    ['Ovaries', 'Make eggs and hormones.', 'The main female reproductive organs. They produce eggs (oogenesis) and female sex hormones, mainly oestrogen and progesterone.'],
    ['Fallopian tubes', 'Where fertilisation happens.', 'Tubes from near the ovaries to the uterus. Fertilisation usually happens here. Cilia and muscle contractions move the egg towards the uterus.'],
    ['Uterus', 'Where the fetus develops.', 'Muscular, pear-shaped organ where a fertilised egg implants and the fetus develops. Three layers: endometrium (inner, thickens for implantation), myometrium (muscle, contracts in labour), perimetrium (outer protective layer).'],
    ['Cervix', 'Lower opening of the uterus.', 'The narrow lower part of the uterus that opens into the vagina. Its mucus changes during the menstrual cycle.'],
    ['Vagina', 'Birth canal and menstrual passageway.', 'Muscular tube from the cervix to the outside. Receives sperm, is the birth canal, and lets menstrual flow out.'],
    ['Vulva', 'External female genitalia.', 'The external female genitalia: labia majora, labia minora, clitoris and vaginal opening.'],
    ['Mammary glands', 'Feed a newborn through lactation.', 'Not part of the reproductive tract itself, but essential for feeding a newborn with milk (lactation).']
  ];
  function organ(list, color) {
    return list.map(function (o) { return { title: o[0], color: color, html: o[1], more: o[2] }; });
  }

  EF.subjects.push({
    id: 'biology',
    name: 'Biology',
    short: 'Biology',
    grade: 9,
    icon: 'fa-dna',
    emoji: '🧬',
    color: '#2fbf71',
    tagline: 'Human reproduction, cell division and the menstrual cycle',
    intro: 'The reproductive systems, fertilisation, pregnancy, mitosis vs meiosis, the menstrual cycle and STDs — explained simply.',

    data: {
      // Phases of a typical 28-day cycle (start and end day, inclusive)
      cycle: [
        { name: 'Menstruation', days: 'Days 1–5', from: 1, to: 5, color: '#f0506e', html: 'The uterine lining (endometrium) is shed if pregnancy hasn’t happened, causing bleeding.' },
        { name: 'Follicular phase', days: 'Days 1–13', from: 6, to: 13, color: '#f5a524', html: 'The pituitary releases <strong>FSH</strong>, which makes a follicle grow. The follicle makes <strong>oestrogen</strong>, which thickens the endometrium. (It starts on day 1, overlapping menstruation.)' },
        { name: 'Ovulation', days: 'Around day 14', from: 14, to: 14, color: '#2fbf71', html: 'High oestrogen triggers an <strong>LH surge</strong>. LH makes the mature follicle burst and release an egg.' },
        { name: 'Luteal phase', days: 'Days 15–28', from: 15, to: 28, color: '#9b6bff', html: 'The burst follicle becomes the <strong>corpus luteum</strong>, which makes progesterone and oestrogen so the endometrium thickens more. If there’s no fertilisation, it breaks down, hormones drop, and menstruation starts again.' }
      ]
    },

    topics: [
      {
        id: 'male-system', title: 'Male Reproductive System', nav: 'Male System', icon: 'fa-mars',
        blocks: [
          { type: 'text', html: 'Tap an organ to see more detail.' },
          { type: 'grid', cols: 3, expand: true, items: organ(male, '#4f7cff') }
        ]
      },
      {
        id: 'female-system', title: 'Female Reproductive System', nav: 'Female System', icon: 'fa-venus',
        blocks: [
          { type: 'text', html: 'Tap an organ to see more detail.' },
          { type: 'grid', cols: 3, expand: true, items: organ(female, '#e255b4') }
        ]
      },
      {
        id: 'fertilization', title: 'Fertilisation & Implantation', nav: 'Fertilisation', icon: 'fa-circle-nodes',
        blocks: [
          {
            type: 'steps', items: [
              { title: 'Sperm production', html: 'Spermatogenesis happens in the testes. A sperm has a <strong>head</strong> (genetic material + acrosome enzymes), <strong>midpiece</strong> (mitochondria for energy) and <strong>tail</strong> (for swimming).' },
              { title: 'Egg production', html: 'Oogenesis happens in the ovaries. The egg (ovum) is large and can’t move. It contains cytoplasm, nutrients and genetic material.' },
              { title: 'Ovulation', html: 'A mature egg is released from an ovary, usually once per menstrual cycle.' },
              { title: 'Sperm transport', html: 'Sperm travel from the vagina, through the cervix and uterus, into the fallopian tubes.' },
              { title: 'Fusion', html: 'Fertilisation happens in the <strong>ampulla</strong> (widest part of the fallopian tube). Acrosome enzymes break down the egg’s outer layers. A block stops more than one sperm getting in.' },
              { title: 'Zygote', html: 'The sperm and egg nuclei fuse, restoring the diploid number (2n). This single cell is the <strong>zygote</strong>.' },
              { title: 'Cleavage', html: 'The zygote divides rapidly by mitosis into a ball of cells (morula, 16–32 cells), then a hollow <strong>blastocyst</strong>.' },
              { title: 'Implantation', html: '6–10 days after fertilisation, the blastocyst attaches to the endometrium and trophoblast cells invade the lining. Pregnancy begins.' }
            ]
          }
        ]
      },
      {
        id: 'pregnancy', title: 'Pregnancy & Development', nav: 'Pregnancy', icon: 'fa-baby',
        blocks: [
          {
            type: 'grid', cols: 3,
            items: [
              { icon: 'fa-calendar-days', title: 'Gestation', html: 'About <strong>40 weeks</strong> (280 days) from the last menstrual period, or about 38 weeks from fertilisation.' },
              { icon: 'fa-circle-dot', title: 'Placenta', html: 'Develops from the trophoblast and uterine tissue. Swaps nutrients and gases, removes waste and makes hormones.' },
              { icon: 'fa-droplet', title: 'Amniotic sac & fluid', html: 'Surrounds the fetus. Cushions it, keeps the temperature steady and lets it move.' }
            ]
          },
          { type: 'terms', title: 'Pregnancy hormones', items: [
            ['hCG', 'Made by the developing placenta. Tells the corpus luteum to keep making progesterone and oestrogen. (It’s what pregnancy tests detect!)'],
            ['Progesterone', 'Maintains the endometrium and prevents uterine contractions.'],
            ['Oestrogen', 'Supports growth of the uterus and mammary glands.']
          ] },
          {
            type: 'timeline', items: [
              { label: 'Weeks 1–8', title: 'Embryonic period', html: 'Major organs and body systems form. The three germ layers (ectoderm, mesoderm, endoderm) specialise. Recognisable human form by the end.' },
              { label: 'Week 9 → birth', title: 'Fetal period', html: 'Growth and maturing. Sex organs, bones and muscles develop. Can survive from about 24 weeks with medical support.' },
              { label: 'Birth', title: 'Parturition', html: 'Uterine contractions, the cervix widens (dilates), and the baby and then the placenta are pushed out.' }
            ]
          }
        ]
      },
      {
        id: 'cell-division', title: 'Cell Division: Mitosis vs Meiosis', nav: 'Cell Division', icon: 'fa-circle-half-stroke',
        blocks: [
          {
            type: 'compare', items: [
              { title: 'Mitosis', color: '#4f7cff', summary: [['Purpose', 'Growth, repair, asexual reproduction'], ['Result', '2 identical diploid (2n) cells']], phases: [
                ['Interphase', 'Cell grows, DNA copies itself, gets ready to divide.'],
                ['Prophase', 'Chromosomes condense; the nuclear envelope breaks down.'],
                ['Metaphase', 'Chromosomes line up in the middle (metaphase plate).'],
                ['Anaphase', 'Sister chromatids separate and move to opposite poles.'],
                ['Telophase', 'Chromosomes relax; nuclear envelopes re-form.'],
                ['Cytokinesis', 'The cytoplasm divides — two daughter cells.']
              ] },
              { title: 'Meiosis', color: '#9b6bff', summary: [['Purpose', 'Making gametes (sperm and eggs)'], ['Result', '4 genetically different haploid (n) cells']], phases: [
                ['Prophase I', 'Homologous chromosomes pair up (synapsis) and crossing over happens.'],
                ['Metaphase I', 'Homologous pairs line up in the middle.'],
                ['Anaphase I', 'Homologous chromosomes separate; sister chromatids stay together.'],
                ['Telophase I', 'Two haploid cells form.'],
                ['Meiosis II', 'Like mitosis — sister chromatids separate. Result: 4 haploid cells.']
              ] }
            ]
          },
          {
            type: 'table', title: 'Side by side',
            head: ['', 'Mitosis', 'Meiosis'],
            rows: [
              ['Divisions', '1', '2'],
              ['Cells made', '2', '4'],
              ['Chromosomes', 'Diploid (2n)', 'Haploid (n)'],
              ['Genetically', 'Identical', 'Different'],
              ['Crossing over', 'No', 'Yes (Prophase I)'],
              ['Used for', 'Growth & repair', 'Gametes']
            ]
          }
        ]
      },
      {
        id: 'gametes', title: 'Gametes & Fertilisation', nav: 'Gametes', icon: 'fa-venus-mars',
        blocks: [
          { type: 'terms', items: [
            ['Gametes', 'Haploid (n) sex cells with half the chromosomes: sperm (from testes) and egg/ovum (from ovaries).'],
            ['Spermatogenesis', 'Makes millions of sperm every day.'],
            ['Oogenesis', 'Makes one mature egg per menstrual cycle (plus polar bodies that don’t develop).'],
            ['Fertilisation', 'Sperm + egg = diploid (2n) zygote. Each gives 23 chromosomes → 46 total (23 pairs).'],
            ['Genetic diversity', 'Comes from crossing over and independent assortment in meiosis, plus mixing two parents’ DNA.']
          ] }
        ]
      },
      {
        id: 'menstrual-cycle', title: 'Menstrual Cycle', icon: 'fa-circle-notch',
        blocks: [
          { type: 'widget', name: 'cycle' },
          { type: 'terms', title: 'Key hormones', items: [
            ['FSH', 'Follicle-stimulating hormone — makes a follicle grow.'],
            ['LH', 'Luteinising hormone — the LH surge triggers ovulation and forms the corpus luteum.'],
            ['Oestrogen', 'Thickens the endometrium and triggers the LH surge.'],
            ['Progesterone', 'Maintains the thick endometrium.']
          ] }
        ]
      },
      {
        id: 'stds', title: 'Sexually Transmitted Diseases (STDs)', nav: 'STDs', icon: 'fa-shield-virus',
        blocks: [
          {
            type: 'grid', cols: 3,
            items: [
              { title: 'Bacterial', color: '#f0506e', icon: 'fa-bacterium', rows: [
                ['Chlamydia', 'Caused by <em>Chlamydia trachomatis</em>. Often no symptoms; can lead to PID and infertility. Treated with antibiotics.'],
                ['Gonorrhoea', 'Caused by <em>Neisseria gonorrhoeae</em>. Can cause PID and infertility; can pass to newborns.'],
                ['Syphilis', 'Caused by <em>Treponema pallidum</em>. Goes through stages (primary, secondary, latent, tertiary). Serious long-term damage if untreated.']
              ] },
              { title: 'Viral', color: '#9b6bff', icon: 'fa-virus', rows: [
                ['HPV', 'Some types cause genital warts; others can lead to cervical and other cancers. Vaccine available.'],
                ['Herpes (HSV)', 'Painful sores. A lifelong infection.'],
                ['HIV', 'Attacks the immune system; leads to AIDS if untreated. Managed with antiretroviral therapy.'],
                ['Hepatitis B', 'Affects the liver. Vaccine available.']
              ] },
              { title: 'Parasitic', color: '#2fbf71', icon: 'fa-bug', rows: [
                ['Trichomoniasis', 'Caused by <em>Trichomonas vaginalis</em>. Often no symptoms, but can cause discharge and irritation.']
              ] }
            ]
          },
          { type: 'callout', tone: 'tip', icon: 'fa-shield-heart', title: 'Prevention', html: 'Abstinence · consistent condom use · limiting partners · vaccination (HPV, Hepatitis B) · regular testing.' }
        ]
      }
    ],

    quiz: [
      { q: 'Where does fertilisation usually happen?', options: ['Uterus', 'Ovary', 'Fallopian tube', 'Vagina'], answer: 2, why: 'In the ampulla — the widest part of the fallopian tube.' },
      { q: 'Mitosis produces how many daughter cells?', options: ['1', '2', '4', '8'], answer: 1, why: 'Mitosis = 2 identical diploid cells. Meiosis = 4 haploid cells.' },
      { q: 'What does the trophoblast develop into?', options: ['The embryo', 'The placenta and chorion', 'Amniotic fluid', 'The umbilical cord'], answer: 1, why: 'The trophoblast invades the uterine lining and forms the placenta.' },
      { q: 'FSH stands for:', options: ['Female Sex Hormone', 'Follicle-Stimulating Hormone', 'Fetal Support Hormone', 'Fertile Stage Hormone'], answer: 1, why: 'FSH stimulates a follicle in the ovary to grow.' },
      { q: 'Human gestation is about:', options: ['30 weeks', '36 weeks', '40 weeks', '44 weeks'], answer: 2, why: 'About 40 weeks (280 days) from the last menstrual period.' },
      { q: 'Meiosis produces cells that are:', options: ['Diploid', 'Haploid', 'Triploid', 'Identical'], answer: 1, why: 'Haploid (n) — half the chromosomes — so that fertilisation restores 2n.' },
      { q: 'Which gland makes a milky fluid that activates sperm?', options: ['Seminal vesicles', 'Bulbourethral glands', 'Prostate gland', 'Testes'], answer: 2, why: 'The prostate’s fluid activates sperm and neutralises acidity.' },
      { q: 'Chlamydia is caused by:', options: ['A virus', 'A bacterium', 'A parasite', 'A fungus'], answer: 1, why: '<em>Chlamydia trachomatis</em> is a bacterium — so antibiotics can treat it.' },
      { q: 'What triggers ovulation?', options: ['A drop in oestrogen', 'An LH surge', 'Rising progesterone', 'hCG'], answer: 1, why: 'High oestrogen causes an LH surge, and LH makes the follicle release the egg.' },
      { q: 'How many chromosomes does a human zygote have?', options: ['23', '46', '92', '22'], answer: 1, why: '23 from the sperm + 23 from the egg = 46 (23 pairs).' },
      { q: 'Crossing over happens during…', options: ['Mitosis prophase', 'Prophase I of meiosis', 'Cytokinesis', 'Fertilisation'], answer: 1, why: 'Homologous chromosomes swap pieces in Prophase I — creating variation.' },
      { q: 'Which part of a sperm contains mitochondria?', options: ['Head', 'Midpiece', 'Tail', 'Acrosome'], answer: 1, why: 'The midpiece is packed with mitochondria to power the tail.' }
    ],

    flashcards: male.map(function (o) { return [o[0], o[1], 'Male system']; })
      .concat(female.map(function (o) { return [o[0], o[1], 'Female system']; }))
      .concat([
        ['Mitosis', '2 identical diploid cells — growth & repair', 'Cell division'],
        ['Meiosis', '4 different haploid cells — gametes', 'Cell division'],
        ['Zygote', 'The first cell formed when sperm and egg nuclei fuse (2n)', 'Fertilisation'],
        ['Blastocyst', 'Hollow ball of cells that implants in the endometrium', 'Fertilisation'],
        ['Implantation', 'Blastocyst attaches to the endometrium, 6–10 days after fertilisation', 'Fertilisation'],
        ['hCG', 'Hormone from the placenta that keeps the corpus luteum working', 'Hormones'],
        ['FSH', 'Makes a follicle grow', 'Hormones'],
        ['LH', 'Surge triggers ovulation', 'Hormones'],
        ['Corpus luteum', 'Leftover follicle that makes progesterone after ovulation', 'Cycle'],
        ['Endometrium', 'Inner lining of the uterus that thickens for implantation', 'Cycle']
      ])
  });
})();
