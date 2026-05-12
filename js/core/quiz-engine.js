import { quizData } from '../data/quizzes.js';
import { launchConfetti } from './utils.js';

export function quizComponent(subject) {
  return {
    questions: quizData[subject] || [],
    answers: {},
    checked: false,
    score: null,

    selectAnswer(qi, oi) {
      if (this.checked) return;
      this.answers[qi] = oi;
    },

    allAnswered() {
      return Object.keys(this.answers).length === this.questions.length;
    },

    checkQuiz() {
      this.checked = true;
      let correct = 0;
      this.questions.forEach((q, i) => {
        if (this.answers[i] === q.correct) correct++;
      });
      this.score = Math.round((correct / this.questions.length) * 100);
      
      if (this.score >= 80) {
        launchConfetti();
      }

      // Update global progress if available
      if (window.Alpine && this.$root.__x_data_stack) {
        // This is a bit hacky, but in the final app.js we will have a cleaner way
        // to update the main app's progress state.
        const app = this.$root.closest('[x-data]')?.__x_model?.get?.() || {};
        if (app.progress && app.progress[subject] < this.score) {
          app.progress[subject] = this.score;
          localStorage.setItem('ef-progress', JSON.stringify(app.progress));
        }
      }
    },

    getOptionClass(qi, oi) {
      const isSelected = this.answers[qi] === oi;
      const isCorrect = this.questions[qi].correct === oi;

      if (!this.checked) {
        if (isSelected) return 'bg-primary-500/20 border-primary-500 text-primary-300';
        return 'border-white/10 hover:border-white/20 text-gray-300';
      }

      if (isCorrect) return 'bg-green-500/20 border-green-500 text-green-300';
      if (isSelected) return 'bg-red-500/20 border-red-500 text-red-300';
      
      return 'border-white/5 text-gray-600 opacity-50';
    }
  };
}
