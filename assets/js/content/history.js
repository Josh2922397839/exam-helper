/* ExamForge content — History: The Haitian Revolution */
window.EF = window.EF || {};
EF.subjects = EF.subjects || [];

EF.subjects.push({
  id: 'history',
  name: 'History',
  short: 'History',
  icon: 'fa-landmark',
  emoji: '🏛️',
  color: '#9b6bff',
  tagline: 'The Haitian Revolution, slavery and social structure',
  intro: 'The causes, key figures and impact of the only successful large-scale slave revolt in history (1791–1804).',

  topics: [
    {
      id: 'hist-intro', title: 'Introduction', icon: 'fa-book-open',
      blocks: [
        { type: 'lead', html: 'The Haitian Revolution (1791–1804) was the most successful slave revolt in history. It took place in <strong>Saint-Domingue</strong>, a French colony on the western third of the island of Hispaniola (modern-day Haiti).' },
        { type: 'text', html: 'Saint-Domingue was the richest colony in the Caribbean, producing huge amounts of sugar, coffee and indigo — all through the brutal exploitation of enslaved Africans.' },
        { type: 'text', html: 'By the late 1700s it had about <strong>500,000 enslaved people</strong>, <strong>32,000 white colonists</strong> and <strong>28,000 free people of colour</strong> (gens de couleur libres). Enslaved people outnumbered free people by roughly 10 to 1.' },
        { type: 'text', html: 'The revolution ended slavery and created <strong>Haiti</strong>, the first free Black republic, on <strong>1 January 1804</strong> — the second independent nation in the Western Hemisphere, after the United States.' },
        {
          type: 'stats', items: [
            { value: '1791', label: 'Revolution began' },
            { value: '500,000', label: 'Enslaved Africans' },
            { value: '10 : 1', label: 'Enslaved to free' },
            { value: '1804', label: 'Independence declared' }
          ]
        }
      ]
    },
    {
      id: 'hist-causes', title: 'Causes of the Revolution', nav: 'Causes', icon: 'fa-fire',
      blocks: [
        {
          type: 'grid', cols: 3,
          items: [
            { icon: 'fa-link-slash', color: '#f0506e', title: 'Brutal slavery', html: 'Enslaved people suffered horrific conditions on sugar plantations. The <strong>Code Noir</strong> regulated their treatment but allowed extreme punishments such as branding, mutilation and execution. Life expectancy was very short.' },
            { icon: 'fa-scale-balanced', color: '#4f7cff', title: 'Enlightenment ideas', html: 'The French Revolution (1789) and its ideals of <strong>“liberty, equality, fraternity”</strong> inspired free people of colour and the enslaved. If all men are equal, slavery is a direct contradiction.' },
            { icon: 'fa-users', color: '#9b6bff', title: 'Social tensions', html: 'Free people of colour were often wealthy and educated but denied political rights. <strong>Grands Blancs</strong> and <strong>Petits Blancs</strong> competed for power. These divisions weakened the colony.' }
          ]
        }
      ]
    },
    {
      id: 'hist-slavery', title: 'Life of an Enslaved Person', nav: 'Life Under Slavery', icon: 'fa-link',
      blocks: [
        {
          type: 'grid', cols: 2,
          items: [
            { icon: 'fa-ship', color: '#4f7cff', title: 'The Middle Passage', html: 'Captured Africans were shipped across the Atlantic in horrific conditions. Packed tightly into ships, many died from disease, dehydration or violence. Survivors arrived traumatised and were sold at auction.' },
            { icon: 'fa-seedling', color: '#2fbf71', title: 'Plantation work', html: 'Enslaved people worked 16–18 hour days on sugar, coffee and indigo plantations. Sugar work was especially dangerous — burns, lost limbs in the mills, and whippings for slowing down.' },
            { icon: 'fa-gavel', color: '#f5a524', title: 'The Code Noir', html: 'This French law treated enslaved people as <strong>property</strong>. They couldn’t own land and had no legal rights. Punishments included branding with the fleur-de-lis, ear-cropping, and death for striking a master.' },
            { icon: 'fa-drum', color: '#9b6bff', title: 'Resistance & culture', html: 'Enslaved people kept African traditions alive through <strong>Vodou</strong> (African spirituality blended with Catholicism), music and oral history. <strong>Maroons</strong> — people who escaped — built free communities in the mountains.' }
          ]
        }
      ]
    },
    {
      id: 'hist-social', title: 'Social Structure of Saint-Domingue', nav: 'Social Structure', icon: 'fa-layer-group',
      blocks: [
        {
          type: 'tiers', items: [
            { tag: 'Top', color: '#f5a524', title: 'Grands Blancs (Big Whites)', html: 'Wealthy plantation owners and top colonial officials. They controlled the economy and politics and owned most of the land and enslaved people.' },
            { tag: 'Middle', color: '#4f7cff', title: 'Petits Blancs (Small Whites)', html: 'Shopkeepers, craftsmen, overseers and poorer whites. Fewer resources but still had legal privileges over all people of colour. Resented both the Grands Blancs and free people of colour.' },
            { tag: 'Restricted', color: '#9b6bff', title: 'Gens de Couleur Libres (Free People of Colour)', html: 'Mixed-race and free Black people. Many were educated and wealthy (some even owned plantations and enslaved people), but they were denied political rights and public office and faced discrimination.' },
            { tag: 'Bottom', color: '#f0506e', title: 'Enslaved Africans', html: 'About 500,000 people with no rights, treated as property. They did all the plantation labour and faced extreme violence — yet kept their cultural identity and ultimately led the revolution.' }
          ]
        }
      ]
    },
    {
      id: 'hist-leaders', title: 'Key Leaders', icon: 'fa-crown',
      blocks: [
        {
          type: 'people', items: [
            { initials: 'TL', color: '#9b6bff', name: 'Toussaint Louverture', dates: 'c. 1743–1803', html: 'A self-educated former slave who became the revolution’s greatest military and political leader. He united different groups, negotiated with European powers and wrote a constitution. Captured by the French through trickery, he died in a French prison in 1803.' },
            { initials: 'JD', color: '#f0506e', name: 'Jean-Jacques Dessalines', dates: 'c. 1758–1806', html: 'Born into slavery, he was a fierce military commander who took over after Louverture’s capture. He defeated Napoleon’s forces and declared Haiti’s independence on 1 January 1804, becoming its first ruler (Emperor Jacques I).' },
            { initials: 'BD', color: '#2fbf71', name: 'Dutty Boukman', dates: 'd. 1791', html: 'A Vodou priest (houngan) and enslaved man who led the <strong>Bois Caïman</strong> ceremony in August 1791 — the gathering that united the enslaved and sparked the uprising. He was killed early on but became a powerful symbol.' },
            { initials: 'HC', color: '#f5a524', name: 'Henri Christophe', dates: '1767–1820', html: 'A key military leader in the revolution. After independence he ruled northern Haiti as King Henri I and built the <strong>Citadelle Laferrière</strong>, a huge mountaintop fortress — the largest in the Americas.' }
          ]
        }
      ]
    },
    {
      id: 'hist-timeline', title: 'Timeline of Key Events', nav: 'Timeline', icon: 'fa-clock-rotate-left',
      blocks: [
        {
          type: 'timeline', items: [
            { label: '1789', title: 'French Revolution begins', html: 'Ideas of liberty and equality spread to the colonies, inspiring free people of colour and the enslaved.' },
            { label: 'Aug 1791', title: 'Bois Caïman ceremony & uprising', html: 'Dutty Boukman leads a Vodou ceremony that unites the enslaved. Within days the northern plains erupt in revolt — plantations burn and thousands join.' },
            { label: '1793', title: 'Slavery abolished in Saint-Domingue', html: 'French commissioners end slavery locally to win Black support against Spanish and British invasions. Toussaint Louverture rises as a leader.' },
            { label: '1801', title: 'Louverture’s constitution', html: 'Louverture writes a constitution making himself governor-for-life and abolishing slavery permanently. Napoleon sees a threat and sends about 20,000 troops.' },
            { label: '1802', title: 'Louverture captured', html: 'Tricked into a meeting, Louverture is arrested and deported to France, where he dies in prison in 1803. Dessalines takes command.' },
            { label: '1 Jan 1804', title: 'Haiti declares independence', html: 'Jean-Jacques Dessalines declares independence. Haiti becomes the first free Black republic and the second independent nation in the Western Hemisphere.', highlight: true }
          ]
        },
        { type: 'callout', tone: 'tip', icon: 'fa-lightbulb', title: 'Why it matters', html: 'Haiti’s revolution terrified slave-owning powers, inspired enslaved people across the Americas, and proved that enslaved people could defeat a European empire.' }
      ]
    }
  ],

  quiz: [
    { q: 'When did the Haitian Revolution begin?', options: ['1776', '1789', '1791', '1804'], answer: 2, why: 'It began in August 1791 after the Bois Caïman ceremony.' },
    { q: 'Which former slave became the revolution’s greatest leader?', options: ['Napoleon Bonaparte', 'Jean-Jacques Dessalines', 'Toussaint Louverture', 'Dutty Boukman'], answer: 2, why: 'Toussaint Louverture united the forces and wrote a constitution.' },
    { q: 'What was the French colony that became Haiti called?', options: ['Hispaniola', 'Saint-Domingue', 'Martinique', 'Guadeloupe'], answer: 1, why: 'Saint-Domingue was on the western third of the island of Hispaniola.' },
    { q: 'The Code Noir regulated:', options: ['Trade between colonies', 'The treatment and control of enslaved people', 'Voting rights', 'Military service'], answer: 1, why: 'It treated enslaved people as property and allowed brutal punishments.' },
    { q: 'Who declared Haiti independent on 1 January 1804?', options: ['Toussaint Louverture', 'Napoleon Bonaparte', 'Jean-Jacques Dessalines', 'Henri Christophe'], answer: 2, why: 'Dessalines took over after Louverture was captured.' },
    { q: 'The Bois Caïman ceremony in August 1791 was:', options: ['A French Catholic mass', 'A Vodou ceremony that sparked the revolution', 'A peace treaty signing', 'A slave auction'], answer: 1, why: 'Led by Dutty Boukman, it united the enslaved before the uprising.' },
    { q: 'Which group was at the top of Saint-Domingue’s social hierarchy?', options: ['Gens de Couleur Libres', 'Petits Blancs', 'Grands Blancs', 'Enslaved Africans'], answer: 2, why: 'Wealthy plantation owners and officials — the Grands Blancs.' },
    { q: 'The Middle Passage refers to:', options: ['A route through the Caribbean', 'The transatlantic voyage of enslaved Africans', 'A mountain pass in Haiti', 'A French trade agreement'], answer: 1, why: 'It was the brutal journey across the Atlantic.' },
    { q: 'Which ideals from the French Revolution inspired the revolt?', options: ['Faith, hope, charity', 'Liberty, equality, fraternity', 'Peace, land, bread', 'Life, liberty, property'], answer: 1, why: '“Liberté, égalité, fraternité” — which slavery directly contradicted.' },
    { q: 'What did Henri Christophe build?', options: ['The Palace of Versailles', 'The Citadelle Laferrière', 'Fort Liberté', 'The Cap-Français cathedral'], answer: 1, why: 'A massive mountaintop fortress — the largest in the Americas.' },
    { q: 'Maroons were:', options: ['French soldiers', 'Enslaved people who escaped and formed free communities', 'Plantation owners', 'British traders'], answer: 1, why: 'Maroon communities lived free in the mountains.' }
  ],

  flashcards: [
    ['Saint-Domingue', 'French colony on western Hispaniola — modern Haiti; richest colony in the Caribbean'],
    ['Code Noir', 'French law that treated enslaved people as property and allowed brutal punishments'],
    ['Middle Passage', 'The brutal transatlantic voyage of enslaved Africans'],
    ['Bois Caïman', 'Vodou ceremony (Aug 1791) led by Dutty Boukman that sparked the uprising'],
    ['Toussaint Louverture', 'Former slave; the revolution’s greatest leader; died in a French prison in 1803'],
    ['Jean-Jacques Dessalines', 'Declared Haiti independent on 1 January 1804'],
    ['Henri Christophe', 'King Henri I of northern Haiti; built the Citadelle Laferrière'],
    ['Dutty Boukman', 'Vodou priest who led the Bois Caïman ceremony'],
    ['Grands Blancs', 'Wealthy white plantation owners and officials — top of society'],
    ['Petits Blancs', 'Poorer whites: shopkeepers, craftsmen, overseers'],
    ['Gens de couleur libres', 'Free people of colour — often wealthy but denied political rights'],
    ['Maroons', 'Escaped enslaved people who formed free communities'],
    ['Vodou', 'African spirituality blended with Catholicism'],
    ['1 January 1804', 'Haiti becomes the first free Black republic']
  ]
});
