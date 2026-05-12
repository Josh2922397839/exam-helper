export function initHeroParticles() {
  return {
    init() {
      const canvas = this.$refs.heroCanvas;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      let particles = [];
      let w, h;

      const resize = () => {
        w = canvas.width = canvas.parentElement.offsetWidth;
        h = canvas.height = canvas.parentElement.offsetHeight;
      };
      resize();
      window.addEventListener('resize', resize);

      for (let i = 0; i < 50; i++) {
        particles.push({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
          r: Math.random() * 2 + 1,
          alpha: Math.random() * 0.5 + 0.1
        });
      }

      const draw = () => {
        ctx.clearRect(0, 0, w, h);
        particles.forEach(p => {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
          if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(99,102,241,${p.alpha})`;
          ctx.fill();
        });
        
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120) {
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.strokeStyle = `rgba(99,102,241,${0.1 * (1 - dist / 120)})`;
              ctx.stroke();
            }
          }
        }
        requestAnimationFrame(draw);
      };
      draw();
    }
  };
}
