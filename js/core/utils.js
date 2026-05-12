export function launchConfetti() {
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#3b82f6', '#ec4899', '#10b981', '#f59e0b']
    });
  } else {
    // Fallback if confetti lib isn't loaded
    console.log('Confetti launched!');
  }
}

export function speak(text, lang = 'en') {
  if ('speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'fr' ? 'fr-FR' : 'en-US';
    u.rate = 0.9;
    speechSynthesis.speak(u);
  }
}

export function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
