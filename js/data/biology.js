export const maleOrgans = [
  { name: 'Testes', short: 'Primary male reproductive organs in scrotum.', desc: 'Located in the scrotum, these produce sperm (spermatogenesis) and male sex hormones, primarily testosterone.', open: false },
  { name: 'Scrotum', short: 'Sac regulating testes temperature.', desc: 'A sac of skin hanging outside the body, containing the testes. Regulates temperature crucial for sperm production (slightly cooler than body temperature).', open: false },
  { name: 'Epididymis', short: 'Coiled tube for sperm maturation.', desc: 'A coiled tube attached to the back of each testis. Sperm mature and are stored here.', open: false },
  { name: 'Vas Deferens', short: 'Tube carrying sperm to ejaculatory duct.', desc: 'A tube that carries mature sperm from the epididymis to the ejaculatory duct.', open: false },
  { name: 'Seminal Vesicles', short: 'Produce fructose-rich fluid for sperm.', desc: 'Glands that produce fluid rich in fructose (energy for sperm) and prostaglandins (stimulate uterine contractions).', open: false },
  { name: 'Prostate Gland', short: 'Secretes fluid to activate sperm.', desc: 'Secretes a milky fluid that helps activate sperm and neutralize the acidity of the female reproductive tract.', open: false },
  { name: 'Bulbourethral Glands', short: 'Lubricate and neutralize urethra.', desc: 'Produce clear, alkaline mucus that lubricates the urethra and neutralizes acidic urine residue before ejaculation.', open: false },
  { name: 'Urethra', short: 'Carries urine and semen out of body.', desc: 'Tube carrying urine from the bladder and semen from the ejaculatory ducts out through the penis.', open: false },
  { name: 'Penis', short: 'External organ with erectile tissue.', desc: 'External male reproductive organ containing erectile tissue that becomes engorged with blood during sexual arousal, facilitating intercourse.', open: false }
];

export const femaleOrgans = [
  { name: 'Ovaries', short: 'Produce eggs and hormones.', desc: 'Primary female reproductive organs. Produce eggs (oogenesis) and female sex hormones, primarily estrogen and progesterone.', open: false },
  { name: 'Fallopian Tubes', short: 'Site of fertilization.', desc: 'Tubes extending from near ovaries to uterus. Fertilization typically occurs here. Cilia and muscular contractions move the egg toward uterus.', open: false },
  { name: 'Uterus', short: 'Where fetus develops.', desc: 'Muscular, pear-shaped organ where fertilized egg implants and fetus develops. Three layers: Endometrium (inner, thickens for implantation), Myometrium (muscular, contractions in labor), Perimetrium (outer protective).', open: false },
  { name: 'Cervix', short: 'Lower part opening to vagina.', desc: 'Lower, narrow part of uterus opening into vagina. Produces mucus that changes consistency during menstrual cycle.', open: false },
  { name: 'Vagina', short: 'Birth canal and menstrual passageway.', desc: 'Muscular tube connecting cervix to outside. Receptacle for sperm, birth canal, and passageway for menstrual flow.', open: false },
  { name: 'Vulva', short: 'External female genitalia.', desc: 'External female genitalia including labia majora, labia minora, clitoris, and vaginal opening.', open: false }
];

export const fertilizationSteps = [
  { title: 'Sperm Production', desc: 'Spermatogenesis occurs in testes. Mature sperm has head (genetic material + acrosome enzymes), midpiece (mitochondria for energy), tail (motility).' },
  { title: 'Egg Production', desc: 'Oogenesis occurs in ovaries. Mature egg (ovum) is large, non-motile, containing cytoplasm, nutrients, and genetic material.' },
  { title: 'Ovulation', desc: 'Release of mature egg from an ovary, typically once per menstrual cycle.' },
  { title: 'Sperm Transport', desc: 'Sperm deposited in vagina, travel through cervix, uterus, into fallopian tubes.' },
  { title: 'Fusion', desc: 'Fertilization occurs in the ampulla (widest part of fallopian tube). Acrosome enzymes break down egg layers.' },
  { title: 'Zygote Formation', desc: 'Nuclei of sperm and egg fuse, restoring diploid chromosome number (2n).' }
];

export const menstrualPhases = [
  { name: 'Menstruation', days: 'Days 1-5', color: '#ef4444', desc: 'Shedding of the uterine lining (endometrium) if pregnancy has not occurred.' },
  { name: 'Follicular Phase', days: 'Days 1-14', color: '#f59e0b', desc: 'Pituitary releases FSH, stimulating follicle development.' },
  { name: 'Ovulation', days: 'Day 14', color: '#10b981', desc: 'High estrogen triggers LH surge, causing egg release.' },
  { name: 'Luteal Phase', days: 'Days 14-28', color: '#8b5cf6', desc: 'Ruptured follicle becomes corpus luteum, producing progesterone.' }
];

export const stdsData = [
  { name: 'Chlamydia', type: 'Bacterial', symptoms: 'Often silent, discharge, pain during urination.', treatment: 'Antibiotics' },
  { name: 'Gonorrhea', type: 'Bacterial', symptoms: 'Discharge, pelvic pain.', treatment: 'Antibiotics' },
  { name: 'HIV/AIDS', type: 'Viral', symptoms: 'Flu-like symptoms initially, then immune system failure.', treatment: 'Antiretroviral therapy' },
  { name: 'Syphilis', type: 'Bacterial', symptoms: 'Sores, rashes, long-term organ damage.', treatment: 'Penicillin' }
];
