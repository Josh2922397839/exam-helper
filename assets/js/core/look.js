/* Zing look: 3D icons, the mascot, avatars and school crests.
   • 3D icons are Microsoft Fluent Emoji (MIT), stored in assets/img/3d (see LICENSE.txt there)
   • Zing, the mascot, is a Doctor Bird (Jamaica's national bird), drawn here in SVG and animated in CSS
   • School crests are generated from the school's name, so every school in the world gets one */
(function () {
  'use strict';
  const EF = window.EF;
  const esc = EF.esc;
  const IMG = 'assets/img/3d/';

  /* ---------- 3D icons ---------- */
  EF.img3d = (name, size, alt) => `<img class="i3d" src="${IMG}${name}.webp" width="${size || 28}" height="${size || 28}" alt="${alt ? esc(alt) : ''}"${alt ? '' : ' aria-hidden="true"'} loading="lazy" decoding="async" draggable="false">`;

  const SUBJECT_3D = ['religion', 'french', 'chemistry', 'biology', 'pe', 'business', 'history', 'english', 'math', 'physics', 'hsb', 'it', 'geography', 'social-studies', 'pob'];
  // a subject's 3D icon; Grade 10 copies like "chemistry-g10" fall back to the base subject; your own sets get a card box
  EF.subject3dName = (id) => {
    const s = EF.subject(id);
    if (s && s.custom) return 'cards';
    const base = String(id).replace(/[-_](g|grade)?\d+$/i, '');
    return SUBJECT_3D.includes(id) ? 's-' + id : SUBJECT_3D.includes(base) ? 's-' + base : 'books';
  };
  EF.subject3d = (id, size) => EF.img3d(EF.subject3dName(id), size);
  // the rest of the app asks for EF.subjectIcon(): answer with the 3D icon (class "sicon" keeps the old sizing rules)
  EF.subjectIcon = (id, cls) => `<img class="sicon i3d${cls ? ' ' + cls : ''}" src="${IMG}${EF.subject3dName(id)}.webp" width="64" height="64" alt="" aria-hidden="true" loading="lazy" decoding="async" draggable="false">`;

  /* ---------- avatars ---------- */
  EF.AVATARS = ['fox', 'panda', 'frog', 'tiger', 'lion', 'koala', 'monkey', 'dog', 'cat', 'rabbit', 'bear', 'penguin', 'owl', 'octopus', 'unicorn', 'dragon'];
  const AVA_BG = { fox: '#ffe1cc', panda: '#e8ecf3', frog: '#d9f5d6', tiger: '#ffe6c2', lion: '#ffeccc', koala: '#e6ebef', monkey: '#f3e3d6', dog: '#f6e7d4', cat: '#ffefc7', rabbit: '#f1ecf7', bear: '#efe0d4', penguin: '#dfe8f4', owl: '#f3ead9', octopus: '#ffe0dc', unicorn: '#f3e6ff', dragon: '#d8f3ec' };
  const hash = (str) => { let h = 2166136261; for (const ch of String(str || '')) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  EF.avatarKey = (key, name) => (EF.AVATARS.includes(key) ? key : EF.AVATARS[hash(name) % EF.AVATARS.length]);
  EF.avatar = (key, name, size) => {
    const k = EF.avatarKey(key, name);
    return `<span class="ava" style="--s:${size || 40}px;--ab:${AVA_BG[k]}"><img src="${IMG}a-${k}.webp" alt="" aria-hidden="true" loading="lazy" decoding="async" draggable="false"></span>`;
  };

  /* ---------- school crests ---------- */
  const PAIRS = [['#1d3a8a', '#f2c94c'], ['#7a1f2b', '#f2c94c'], ['#14532d', '#e9f5ec'], ['#0f4c81', '#ffffff'], ['#5b21b6', '#fcd34d'], ['#b91c1c', '#111827'], ['#0e7490', '#fde68a'], ['#1f2937', '#f59e0b'], ['#9a3412', '#fef3c7'], ['#065f46', '#fbbf24'], ['#831843', '#fbcfe8'], ['#1e40af', '#ef4444']];
  const SKIP = new Set(['the', 'of', 'and', 'for', 'de', 'la', 'le', '&', 'at', 'in']);
  EF.crestInitials = (name) => {
    const words = String(name || '').replace(/[^\p{L}\p{N}\s'-]/gu, ' ').split(/\s+/).filter(Boolean);
    let letters = words.filter((w) => !SKIP.has(w.toLowerCase())).map((w) => w.replace(/^st\.?$/i, 'S')[0]).join('').toUpperCase();
    if (!letters) letters = (words[0] || '?').slice(0, 2).toUpperCase();
    return letters.slice(0, 3);
  };
  EF.crest = (name, size) => {
    const h = hash(name), [a, b] = PAIRS[h % PAIRS.length], style = (h >>> 4) % 4, motif = (h >>> 7) % 3;
    const ini = esc(EF.crestInitials(name));
    const fs = ini.length >= 3 ? 26 : ini.length === 2 ? 32 : 40;
    const shield = 'M50 3 L93 16 V50 C93 77 74 95 50 102 C26 95 7 77 7 50 V16 Z';
    const pattern = [
      `<path d="M7 16 L50 3 L93 16 V34 H7 Z" fill="${b}"/>`,
      `<path d="M50 3 L93 16 V50 C93 77 74 95 50 102 Z" fill="${b}" opacity=".9"/>`,
      `<path d="M7 60 L93 30 V46 L7 76 Z" fill="${b}" opacity=".85"/>`,
      `<path d="M7 40 L50 62 L93 40 V54 L50 76 L7 54 Z" fill="${b}" opacity=".85"/>`
    ][style];
    const motifs = [
      `<path d="M50 9 l2.6 5.3 5.8.8-4.2 4.1 1 5.8L50 22.3l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8Z" fill="${style === 0 ? a : b}"/>`,
      `<path d="M40 22 l10-10 10 10 M43 22 v-4 M57 22 v-4" stroke="${style === 0 ? a : b}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
      `<path d="M38 12 h10 a4 4 0 0 1 2 1 a4 4 0 0 1 2 -1 h10 v12 h-10 a4 4 0 0 0 -2 1 a4 4 0 0 0 -2 -1 h-10 Z" fill="${style === 0 ? a : b}"/>`
    ][motif];
    const ink = style === 1 ? '#fff' : '#fff';
    return `<svg class="crest" viewBox="0 0 100 106" width="${size || 40}" height="${Math.round((size || 40) * 1.06)}" role="img" aria-label="${esc(name)} crest">
      <path d="${shield}" fill="${a}"/>${pattern}
      <path d="${shield}" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="3"/>
      <path d="M50 9 L87 20 V50 C87 73 71 89 50 95 C29 89 13 73 13 50 V20 Z" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.6"/>
      ${motifs}
      <text x="50" y="${style === 0 ? 70 : 64}" text-anchor="middle" font-family="Nunito, system-ui, sans-serif" font-weight="900" font-size="${fs}" fill="${ink}" stroke="rgba(0,0,0,.35)" stroke-width="1.2" paint-order="stroke">${ini}</text>
    </svg>`;
  };

  /* ---------- a school's real crest or photo (from Wikimedia, or one shipped in assets/img/schools/),
     falling back to the generated crest when a school has none or the picture fails to load ---------- */
  const LOGO_OK = /^(https:\/\/(upload|thumb)\.wikimedia\.org\/[A-Za-z0-9/._%()~,!*+-]+|assets\/img\/schools\/[a-z0-9-]+\.(webp|png|jpg|svg))$/;
  EF.schoolLogoOk = (url) => typeof url === 'string' && LOGO_OK.test(url);
  EF.schoolMark = (s, size) => {
    const sz = size || 40, name = (s && s.name) || '';
    if (!s || !EF.schoolLogoOk(s.logo)) return EF.crest(name, sz);
    const kind = s.logo_kind === 'photo' ? 'photo' : 'logo';
    return `<span class="school-mark is-${kind}" style="--s:${sz}px" data-crest-name="${esc(name)}" data-crest-size="${sz}"><img src="${esc(s.logo)}" alt="${esc(name)} ${kind === 'photo' ? 'photo' : 'crest'}" width="${sz}" height="${sz}" loading="lazy" decoding="async" referrerpolicy="no-referrer" draggable="false"></span>`;
  };
  // a picture that can't load (offline, removed from Wikimedia) quietly becomes the generated crest
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (!img || img.tagName !== 'IMG') return;
    const box = img.parentElement;
    if (!box || !box.classList.contains('school-mark')) return;
    box.outerHTML = EF.crest(box.dataset.crestName || '', +box.dataset.crestSize || 40);
  }, true);

  /* ---------- Zing, the mascot: a Doctor Bird (red-billed streamertail), Jamaica's national bird ----------
     moods: read (default), wave, cheer, sad, think, sleep. Drawn in SVG, animated in CSS (zing.css). */
  let uid = 0;
  EF.mascot = (mood, size) => {
    const m = mood || 'read', n = ++uid;
    const INK = '#13261f';
    // eyes: open (pupils look down for read, up for think), happy arcs for cheer, closed for sleep, droopy for sad
    const pupil = (x, y) => `<circle cx="${x}" cy="${y}" r="7.5" fill="${INK}"/><circle cx="${x + 2.6}" cy="${y - 3.4}" r="2.6" fill="#fff"/>`;
    const py = m === 'think' ? -6 : m === 'read' ? 4 : 1, px = m === 'think' ? 3 : 2;
    let eyes;
    if (m === 'sleep') eyes = `<path d="M90 112 q10 8 20 0 M124 110 q10 8 20 0" stroke="${INK}" stroke-width="4.2" stroke-linecap="round" fill="none"/>`;
    else if (m === 'cheer') eyes = `<path d="M90 114 q10 -12 20 0 M124 112 q10 -12 20 0" stroke="${INK}" stroke-width="4.6" stroke-linecap="round" fill="none"/>`;
    else eyes = `<g class="m-eyes"><ellipse cx="100" cy="110" rx="12" ry="14" fill="#fff"/><ellipse cx="134" cy="108" rx="11" ry="13" fill="#fff"/>
        <g class="m-pupils">${pupil(100 + px, 110 + py)}${pupil(134 + px, 108 + py)}</g>
        ${m === 'sad' ? `<path d="M87 101 q13 -6 25 3 L112 98 L87 98Z M122 98 q12 -5 24 2 L146 95 L122 95Z" fill="url(#zBody${n})"/>` : ''}</g>`;
    const beak = m === 'cheer'
      ? `<path d="M148 106 C164 102 180 99 195 97 C198.5 96.8 199 100.5 195.5 101.5 C181 104.5 165 108 149 112 Z" fill="url(#zBeak${n})"/><path d="M149 116 C164 118 178 121 191 124 C194.5 125 193.5 128.5 190 128 C176 126 162 124 148 122 Z" fill="url(#zBeak${n})"/><path d="M181 100.2 L195.5 97.4 C199 97 199 100.8 195.6 101.5 L182.5 104.2 Z M178 121.6 L190.5 124.2 C194 125 193 128.4 189.6 128 L177.4 125.9 Z" fill="${INK}"/>`
      : `<path d="M146 106 C164 105 181 104.6 195.5 104.6 C199.8 104.6 199.8 110 195.5 110.4 C181 111.6 164 114.5 146 119 Z" fill="url(#zBeak${n})"/><path d="M182 104.8 L195.5 104.6 C199.8 104.6 199.8 110 195.5 110.4 L182.6 111.6 Z" fill="${INK}"/>`;
    const mouth = m === 'sad'
      ? `<path d="M126 132 q7 -5 14 0" stroke="${INK}" stroke-width="3.2" stroke-linecap="round" fill="none"/>`
      : m === 'sleep' || m === 'think' ? `<circle cx="133" cy="131" r="2.6" fill="${INK}"/>`
      : `<path d="M125 128 q8 7 16 0" stroke="${INK}" stroke-width="3.2" stroke-linecap="round" fill="none"/>`;
    const extra = {
      cheer: `<g class="m-sparks"><path d="M30 60 l3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="#ffc533"/><path d="M170 52 l2.4 5.6 5.6 2.4-5.6 2.4-2.4 5.6-2.4-5.6-5.6-2.4 5.6-2.4Z" fill="#ff5a45"/><path d="M150 18 l2 4.6 4.6 2-4.6 2-2 4.6-2-4.6-4.6-2 4.6-2Z" fill="#12a35f"/><path d="M60 22 l1.8 4.2 4.2 1.8-4.2 1.8-1.8 4.2-1.8-4.2-4.2-1.8 4.2-1.8Z" fill="#ffc533"/></g>`,
      sad: `<path class="m-tear" d="M146 122 q5 9 0 13 q-5-4 0-13Z" fill="#7cc4ff"/>`,
      think: `<g class="m-dots"><circle cx="158" cy="72" r="5" fill="#c3d6cc"/><circle cx="170" cy="56" r="7" fill="#c3d6cc"/><circle cx="186" cy="36" r="9.5" fill="#c3d6cc"/></g>`,
      sleep: `<g class="m-zzz" fill="#12a35f" font-family="'Bricolage Grotesque', system-ui, sans-serif" font-weight="800"><text x="146" y="62" font-size="18">z</text><text x="160" y="44" font-size="24">z</text><text x="176" y="22" font-size="30">Z</text></g>`
    }[m] || '';
    return `<svg class="mascot is-${m}" viewBox="0 0 200 212" width="${size || 160}" height="${Math.round((size || 160) * 1.06)}" role="img" aria-label="Zing, the Doctor Bird study buddy">
      <defs>
        <radialGradient id="zBody${n}" cx="58%" cy="30%" r="78%"><stop offset="0" stop-color="#7af2b6"/><stop offset=".5" stop-color="#1fc47f"/><stop offset="1" stop-color="#078255"/></radialGradient>
        <radialGradient id="zBelly${n}" cx="55%" cy="35%" r="70%"><stop offset="0" stop-color="#f5fff9"/><stop offset="1" stop-color="#c3f3d6"/></radialGradient>
        <linearGradient id="zWing${n}" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#18b06d"/><stop offset="1" stop-color="#4fe6a1"/></linearGradient>
        <linearGradient id="zWingB${n}" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#077a4f"/><stop offset="1" stop-color="#16a866"/></linearGradient>
        <linearGradient id="zBeak${n}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff7a52"/><stop offset="1" stop-color="#e8352a"/></linearGradient>
      </defs>
      <ellipse class="m-shadow" cx="104" cy="204" rx="40" ry="6" fill="rgba(19,38,31,.16)"/>
      <g class="m-float">
        <g class="m-tail">
          <path d="M60 156 C50 166 42 176 38 188 C50 182 60 174 70 164 Z" fill="#0a6b45"/>
          <path d="M58 162 C44 180 30 192 10 200" stroke="${INK}" stroke-width="5" stroke-linecap="round" fill="none"/>
          <path d="M64 168 C54 188 42 200 24 209" stroke="${INK}" stroke-width="4.4" stroke-linecap="round" fill="none"/>
          <path d="M14 196 q-8 4 -7 9 q6 -1 9 -6Z M28 205 q-8 4 -6 8 q6 -1 8 -6Z" fill="${INK}"/>
        </g>
        <g class="m-wing-b"><path d="M70 126 C54 104 44 76 46 44 C62 64 78 90 86 116 Z" fill="url(#zWingB${n})"/></g>
        <path class="m-body" d="M106 54 C146 54 168 86 166 124 C164 162 138 188 102 188 C64 188 40 162 40 124 C40 86 66 54 106 54 Z" fill="url(#zBody${n})"/>
        <ellipse class="m-belly" cx="108" cy="152" rx="40" ry="30" fill="url(#zBelly${n})"/>
        <path class="m-cap" d="M52 102 C52 72 74 54 104 54 C132 54 154 66 164 90 C150 82 130 78 108 80 C86 82 66 90 52 102 Z" fill="${INK}"/>
        <path d="M58 82 C46 74 34 70 22 70 C32 80 42 88 54 92 Z M66 70 C58 58 48 48 36 42 C40 56 48 68 60 76 Z" fill="${INK}"/>
        <path d="M74 66 C88 58 108 56 126 60" stroke="rgba(255,255,255,.22)" stroke-width="4" stroke-linecap="round" fill="none"/>
        <g class="m-feet"><path d="M96 186 v7 M90 193 h11 M112 186 v7 M106 193 h11" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/></g>
        <g class="m-wing-f"><path d="M70 146 C52 134 34 110 26 78 C46 92 64 112 82 134 C80 140 76 144 70 146 Z" fill="url(#zWing${n})"/><path d="M68 138 C56 126 46 112 40 98 M74 134 C64 122 56 112 50 102" stroke="rgba(255,255,255,.4)" stroke-width="2.4" stroke-linecap="round" fill="none"/></g>
        <g class="m-face">${eyes}<ellipse cx="88" cy="130" rx="9" ry="5.5" fill="#ff8fa3" opacity=".5"/><ellipse cx="150" cy="124" rx="7" ry="4.5" fill="#ff8fa3" opacity=".5"/>${mouth}${beak}</g>
        ${extra}
      </g>
    </svg>`;
  };

  // tap the mascot: a quick squash-and-stretch "boing"
  document.addEventListener('click', (e) => {
    const svg = e.target.closest && e.target.closest('.mascot');
    if (!svg || EF.reducedMotion()) return;
    svg.classList.remove('is-boing'); void svg.getBoundingClientRect(); svg.classList.add('is-boing');
    if (EF.haptic) EF.haptic();
  });
})();
