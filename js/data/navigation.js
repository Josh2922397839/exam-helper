export const navLinks = [
  { id: 'home', label: 'Home' },
  { id: 'religion', label: 'Religion' },
  { id: 'french', label: 'French' },
  { id: 'chemistry', label: 'Chemistry' },
  { id: 'biology', label: 'Biology' },
  { id: 'history', label: 'History' },
  { id: 'business', label: 'Business' },
  { id: 'pe', label: 'PE' }
];

export const sidebarData = [
  {
    id: 'religion',
    title: 'Religious Education',
    topics: [
      { id: 'world-religions', label: 'World Religions' },
      { id: 'genesis-25', label: 'Genesis 25' },
      { id: 'genesis-27-33', label: 'Jacob\'s Journey' },
      { id: 'religion-quiz', label: 'Religion Quiz' }
    ]
  },
  {
    id: 'french',
    title: 'French Language',
    topics: [
      { id: 'vocabulary', label: 'Vocabulary' },
      { id: 'conjugation', label: 'Conjugation' },
      { id: 'numbers', label: 'Numbers 0-100' },
      { id: 'prepositions', label: 'Prepositions' },
      { id: 'reflexive', label: 'Reflexive Verbs' },
      { id: 'accents', label: 'Accents' },
      { id: 'ordering', label: 'Ordering Food' },
      { id: 'french-quiz', label: 'French Quiz' }
    ]
  },
  {
    id: 'chemistry',
    title: 'Chemistry',
    topics: [
      { id: 'periodic-table', label: 'Periodic Table' },
      { id: 'atom-structure', label: 'Atomic Structure' },
      { id: 'bonds', label: 'Chemical Bonds' },
      { id: 'reactions', label: 'Reactions' },
      { id: 'chemistry-quiz', label: 'Chemistry Quiz' }
    ]
  }
  // ... to be expanded
];

export const subjectCards = [
  { id: 'religion', title: 'Religion', icon: 'fas fa-hands-praying', gradient: 'bg-gradient-to-br from-amber-500 to-orange-500', desc: 'World religions and Genesis stories.' },
  { id: 'french', title: 'French', icon: 'fas fa-language', gradient: 'bg-gradient-to-br from-blue-500 to-red-500', desc: 'Vocabulary and grammar mastery.' },
  { id: 'chemistry', title: 'Chemistry', icon: 'fas fa-flask', gradient: 'bg-gradient-to-br from-cyan-500 to-blue-500', desc: 'Atoms, molecules and reactions.' },
  { id: 'biology', title: 'Biology', icon: 'fas fa-dna', gradient: 'bg-gradient-to-br from-green-500 to-emerald-500', desc: 'Human body and life sciences.' },
  { id: 'history', title: 'History', icon: 'fas fa-landmark', gradient: 'bg-gradient-to-br from-brown-500 to-orange-700', desc: 'World wars and global events.' },
  { id: 'business', title: 'Business', icon: 'fas fa-chart-line', gradient: 'bg-gradient-to-br from-gray-700 to-black', desc: 'Basics of commerce and finance.' },
  { id: 'pe', title: 'PE', icon: 'fas fa-running', gradient: 'bg-gradient-to-br from-red-500 to-pink-500', desc: 'Physical health and sports.' }
];
