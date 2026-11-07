/* ExamForge look: 3D icons, the mascot, avatars and school crests.
   • 3D icons are Microsoft Fluent Emoji (MIT), stored in assets/img/3d (see LICENSE.txt there)
   • Emby, the mascot, is ExamForge's own character, drawn here in SVG and animated in CSS
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

  /* ---------- Emby, the mascot ----------
     moods: read (default), wave, cheer, sad, think, sleep */
  let uid = 0;
  EF.mascot = (mood, size) => {
    const m = mood || 'read', n = ++uid;
    const eyes = m === 'sleep'
      ? `<path d="M68 114 q12 9 24 0 M108 114 q12 9 24 0" stroke="#2a2140" stroke-width="4.5" stroke-linecap="round" fill="none"/>`
      : `<g class="m-eyes"><ellipse cx="80" cy="112" rx="13" ry="16" fill="#fff"/><ellipse cx="120" cy="112" rx="13" ry="16" fill="#fff"/>
          <g class="m-pupils"><circle cx="${m === 'think' ? 84 : 82}" cy="${m === 'read' ? 119 : m === 'think' ? 108 : 115}" r="8" fill="#2a2140"/><circle cx="${m === 'think' ? 124 : 122}" cy="${m === 'read' ? 119 : m === 'think' ? 108 : 115}" r="8" fill="#2a2140"/>
          <circle cx="${m === 'think' ? 87 : 85}" cy="${m === 'read' ? 115 : m === 'think' ? 104 : 111}" r="2.8" fill="#fff"/><circle cx="${m === 'think' ? 127 : 125}" cy="${m === 'read' ? 115 : m === 'think' ? 104 : 111}" r="2.8" fill="#fff"/></g></g>`;
    const mouth = {
      cheer: `<path d="M86 130 Q100 152 114 130 Z" fill="#2a2140"/><path d="M93 139 Q100 146 107 139 Q100 136 93 139Z" fill="#ff6f8f"/>`,
      sad: `<path d="M89 140 Q100 130 111 140" stroke="#2a2140" stroke-width="4.5" stroke-linecap="round" fill="none"/>`,
      think: `<ellipse cx="104" cy="136" rx="5" ry="4" fill="#2a2140"/>`,
      sleep: `<ellipse cx="100" cy="136" rx="4" ry="3" fill="#2a2140"/>`
    }[m] || `<path d="M89 131 Q100 142 111 131" stroke="#2a2140" stroke-width="4.5" stroke-linecap="round" fill="none"/>`;
    const arm = (d, cls) => `<path class="m-arm ${cls}" d="${d}" stroke="url(#mArm${n})" stroke-width="13" stroke-linecap="round" fill="none"/>`;
    const arms = {
      read: arm('M46 138 C36 146 40 158 58 160', 'm-arm-l') + arm('M154 138 C164 146 160 158 142 160', 'm-arm-r'),
      wave: arm('M46 140 C34 148 34 160 42 166', 'm-arm-l') + arm('M152 132 C168 122 174 104 168 90', 'm-arm-r m-wave'),
      cheer: arm('M48 128 C34 116 30 98 36 84', 'm-arm-l m-up') + arm('M152 128 C166 116 170 98 164 84', 'm-arm-r m-up'),
      sad: arm('M46 142 C38 154 40 166 48 172', 'm-arm-l') + arm('M154 142 C162 154 160 166 152 172', 'm-arm-r'),
      think: arm('M46 140 C34 148 34 160 42 166', 'm-arm-l') + arm('M152 138 C150 148 132 152 118 146', 'm-arm-r'),
      sleep: arm('M46 140 C34 148 34 160 42 166', 'm-arm-l') + arm('M154 140 C166 148 166 160 158 166', 'm-arm-r')
    }[m] || '';
    const extra = {
      read: `<g class="m-book"><path d="M58 148 L100 156 L142 148 L142 180 L100 188 L58 180 Z" fill="#2bb3c0"/><path d="M62 150 L98 157 V183 L62 176Z" fill="#fff"/><path d="M138 150 L102 157 V183 L138 176Z" fill="#f2fbfc"/><path d="M70 160 l20 4 M70 167 l20 4 M110 164 l20-4 M110 171 l20-4" stroke="#9fd8de" stroke-width="2.4" stroke-linecap="round"/><path d="M100 156 V188" stroke="#1d8792" stroke-width="3"/></g>`,
      cheer: `<g class="m-sparks"><path d="M30 60 l3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="#ffd23f"/><path d="M172 54 l2.4 5.6 5.6 2.4-5.6 2.4-2.4 5.6-2.4-5.6-5.6-2.4 5.6-2.4Z" fill="#7c5cff"/><path d="M160 20 l2 4.6 4.6 2-4.6 2-2 4.6-2-4.6-4.6-2 4.6-2Z" fill="#ff6f8f"/><path d="M44 22 l2 4.6 4.6 2-4.6 2-2 4.6-2-4.6-4.6-2 4.6-2Z" fill="#22c55e"/></g>`,
      sad: `<path class="m-tear" d="M134 124 q5 9 0 13 q-5-4 0-13Z" fill="#7cc4ff"/>`,
      think: `<g class="m-dots"><circle cx="150" cy="70" r="5" fill="#c8c4dc"/><circle cx="164" cy="54" r="7" fill="#c8c4dc"/><circle cx="182" cy="34" r="10" fill="#c8c4dc"/></g>`,
      sleep: `<g class="m-zzz" fill="#7c5cff" font-family="Nunito, system-ui, sans-serif" font-weight="900"><text x="140" y="62" font-size="18">z</text><text x="154" y="44" font-size="24">z</text><text x="170" y="22" font-size="30">Z</text></g>`
    }[m] || '';
    return `<svg class="mascot is-${m}" viewBox="0 0 200 212" width="${size || 160}" height="${Math.round((size || 160) * 1.06)}" role="img" aria-label="Emby, the ExamForge study buddy">
      <defs>
        <radialGradient id="mBody${n}" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#ffc27a"/><stop offset=".55" stop-color="#ff8a3d"/><stop offset="1" stop-color="#ef5443"/></radialGradient>
        <linearGradient id="mFlame${n}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff7a2f"/><stop offset=".6" stop-color="#ffb02e"/><stop offset="1" stop-color="#ffe066"/></linearGradient>
        <radialGradient id="mBelly${n}" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#fff4e3"/><stop offset="1" stop-color="#ffd2a6"/></radialGradient>
        <linearGradient id="mArm${n}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9a4a"/><stop offset="1" stop-color="#ef5f45"/></linearGradient>
      </defs>
      <ellipse class="m-shadow" cx="100" cy="204" rx="46" ry="7" fill="rgba(40,30,70,.16)"/>
      <g class="m-float">
        <g class="m-flame"><path d="M100 14 C92 32 78 36 83 56 C70 50 68 38 72 28 C58 42 58 62 74 72 L126 72 C142 62 142 42 128 28 C132 38 130 50 117 56 C122 36 108 32 100 14 Z" fill="url(#mFlame${n})"/><path d="M100 40 C96 50 90 54 93 66 L107 66 C110 54 104 50 100 40 Z" fill="#fff3b0" opacity=".85"/></g>
        <path class="m-body" d="M100 52 C150 52 174 94 171 136 C168 176 138 196 100 196 C62 196 32 176 29 136 C26 94 50 52 100 52 Z" fill="url(#mBody${n})"/>
        <path d="M70 70 C58 78 50 92 48 104" stroke="#ffd9a8" stroke-width="7" stroke-linecap="round" fill="none" opacity=".55"/>
        <ellipse class="m-belly" cx="100" cy="156" rx="44" ry="32" fill="url(#mBelly${n})"/>
        <g class="m-feet"><ellipse cx="78" cy="194" rx="16" ry="8" fill="#e0483d"/><ellipse cx="122" cy="194" rx="16" ry="8" fill="#e0483d"/></g>
        ${m === 'read' ? '' : arms}
        <g class="m-face">${eyes}<ellipse cx="66" cy="132" rx="10" ry="6" fill="#ff6f8f" opacity=".45"/><ellipse cx="134" cy="132" rx="10" ry="6" fill="#ff6f8f" opacity=".45"/>${mouth}</g>
        ${extra}${m === 'read' ? arms : ''}
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
