import { navigation, subjectCards } from '../data/navigation.js';
import { genesis25Events, jacobsJourney, genesisThemes } from '../data/religion.js';
import { frenchVocab, frenchNumbers, frenchPrepositions, frenchAccents } from '../data/french.js';
import { atomsData, ionicProperties } from '../data/chemistry.js';
import { maleOrgans, femaleOrgans, fertilizationSteps, menstrualPhases } from '../data/biology.js';
import { majorBones, muscleTypes, drugsInSport, wadaRoles } from '../data/pe.js';
import { businessDocs, cashBookExample, orgStructures } from '../data/business.js';
import { historyIntro, historyCauses, slaveLife, historySocialStructure, historyLeaders, historyTimeline } from '../data/history.js';

import { quizComponent } from './quiz-engine.js';
import { speak, throttle } from './utils.js';

document.addEventListener('alpine:init', () => {
  Alpine.data('app', () => ({
    darkMode: JSON.parse(localStorage.getItem('ef-dark') ?? 'true'),
    currentSection: 'home',
    mobileMenu: false,
    showSearch: false,
    searchQuery: '',
    searchResults: [],
    
    // Progress state
    progress: Object.assign(
      { religion: 0, french: 0, chemistry: 0, biology: 0, pe: 0, business: 0, history: 0 },
      JSON.parse(localStorage.getItem('ef-progress') || '{}')
    ),

    // Data from modules
    navLinks: navigation,
    subjectCards: subjectCards,
    
    // Subject specific data
    religion: { genesis25Events, jacobsJourney, genesisThemes },
    french: { vocab: frenchVocab, numbers: frenchNumbers, prepositions: frenchPrepositions, accents: frenchAccents },
    chemistry: { atoms: atomsData, ionicProperties },
    biology: { maleOrgans, femaleOrgans, fertilizationSteps, menstrualPhases },
    pe: { bones: majorBones, muscles: muscleTypes, drugs: drugsInSport, wada: wadaRoles },
    business: { docs: businessDocs, cashBook: cashBookExample, orgs: orgStructures },
    history: { intro: historyIntro, causes: historyCauses, slavery: slaveLife, social: historySocialStructure, leaders: historyLeaders, timeline: historyTimeline },

    // State for interactive components
    selectedAtomZ: 6,
    
    init() {
      // Global key listeners
      window.addEventListener('keydown', (e) => {
        if (e.key === '/' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT') {
          e.preventDefault();
          this.showSearch = true;
        }
        if ((e.key === 'd' || e.key === 'D') && document.activeElement.tagName !== 'INPUT' && !e.ctrlKey && !e.metaKey) {
          this.toggleDark();
        }
        if (e.key === 'Escape') {
          this.showSearch = false;
          this.mobileMenu = false;
        }
      });

      // Persist dark mode
      this.$watch('darkMode', val => {
        document.documentElement.classList.toggle('dark', val);
        localStorage.setItem('ef-dark', JSON.stringify(val));
      });

      // Initialize dark mode on start
      document.documentElement.classList.toggle('dark', this.darkMode);
    },

    toggleDark() {
      this.darkMode = !this.darkMode;
    },

    selectAtom(z) {
      this.selectedAtomZ = z;
      // Trigger Three.js update via event
      window.dispatchEvent(new CustomEvent('atom-selected', { detail: { z } }));
    },

    getSelectedAtom() {
      return this.chemistry.atoms.find(a => a.z === this.selectedAtomZ) || this.chemistry.atoms[5];
    },

    speak(text, lang) {
      speak(text, lang);
    },

    performSearch: throttle(function() {
      if (this.searchQuery.length < 2) {
        this.searchResults = [];
        return;
      }
      const q = this.searchQuery.toLowerCase();
      // Simple search logic - can be expanded
      const results = [];
      
      // Search in subject names and descriptions
      this.subjectCards.forEach(s => {
        if (s.title.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q)) {
          results.push({ subject: s.title, text: s.desc, section: s.id });
        }
      });

      this.searchResults = results.slice(0, 8);
    }, 300),

    goToResult(result) {
      this.currentSection = result.section;
      this.showSearch = false;
      this.searchQuery = '';
    }
  }));

  // Register shared quiz component
  Alpine.data('quizComponent', (subject) => quizComponent(subject));
});
