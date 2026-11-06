/* ExamForge interactive tools — History: the Haitian Revolution (see assets/js/core/interactive.js for the tool kinds) */
window.EF = window.EF || {};
(EF.labs = EF.labs || {}).history = [
  { id: 'revolution-timeline', kind: 'order', topic: 'hist-timeline', title: 'Revolution timeline', desc: 'Put the big events of the Haitian Revolution in order, 1789 to 1804.',
    prompt: 'Tap the events in order, starting with the earliest.',
    steps: [
      ['French Revolution begins', '1789: ideas of liberty and equality spread to the colonies'],
      ['Bois Caïman ceremony and uprising', 'August 1791: Dutty Boukman unites the enslaved'],
      ['Slavery abolished in Saint-Domingue', '1793: French commissioners need Black support'],
      ['Louverture’s constitution', '1801: Napoleon sends about 20,000 troops'],
      ['Louverture captured', '1802: tricked, arrested and sent to France'],
      ['Haiti declares independence', '1 January 1804: the first free Black republic']
    ] },
  { id: 'social-pyramid', kind: 'order', topic: 'hist-social', title: 'Saint-Domingue’s social pyramid', desc: 'Rebuild the colony’s social structure from the top to the bottom.',
    prompt: 'Tap the groups from the top of society to the bottom.',
    steps: [
      ['Grands Blancs (Big Whites)', 'Rich plantation owners and top officials'],
      ['Petits Blancs (Small Whites)', 'Shopkeepers, craftsmen and overseers'],
      ['Gens de couleur libres', 'Free people of colour: often wealthy, but no political rights'],
      ['Enslaved Africans', 'About 500,000 people, treated as property']
    ] },
  { id: 'who-did-it', kind: 'sort', topic: 'hist-leaders', title: 'Who did it?', desc: 'Match each deed to the leader of the revolution who did it.',
    buckets: ['Toussaint Louverture', 'Jean-Jacques Dessalines', 'Dutty Boukman', 'Henri Christophe'],
    items: [
      ['Self-educated former slave and top general', 0], ['Wrote a constitution in 1801', 0], ['Died in a French prison in 1803', 0],
      ['Declared independence on 1 January 1804', 1], ['Defeated Napoleon’s forces', 1], ['Became Emperor Jacques I', 1],
      ['Vodou priest (houngan)', 2], ['Led the Bois Caïman ceremony', 2], ['Killed early in the uprising, in 1791', 2],
      ['Ruled northern Haiti as King Henri I', 3], ['Built the Citadelle Laferrière', 3]
    ] },
  { id: 'causes', kind: 'sort', topic: 'hist-causes', title: 'Causes of the revolution', desc: 'Sort each fact into the cause it belongs to.',
    buckets: ['Brutal slavery', 'Enlightenment ideas', 'Social tensions'],
    items: [
      ['The Code Noir allowed branding and mutilation', 0], ['16–18 hour days on sugar plantations', 0], ['Very short life expectancy', 0],
      ['The French Revolution of 1789', 1], ['“Liberty, equality, fraternity”', 1], ['If all men are equal, slavery is wrong', 1],
      ['Free people of colour denied political rights', 2], ['Grands Blancs and Petits Blancs fought for power', 2], ['Divisions weakened the colony', 2]
    ] }
];
