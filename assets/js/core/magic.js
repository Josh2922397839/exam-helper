/* Zing — Magic import: turn notes, files, photos, recordings and links into cards.
   • Files are read right here in the browser: PDFs with PDF.js, Word and PowerPoint by unzipping them, text and
     spreadsheets as they are. Quizlet, Anki and spreadsheet exports become cards straight away (no AI needed).
   • Everything else goes to Zing AI (the zing-ai Edge Function: Gemma 4 on Cloudflare Workers AI). It only receives
     the study material: never the student's name, email or school. Photos and recordings always need it.
   • Without Zing AI (offline, guests, under 14s, or today's limit used) Zing makes quick cards from the text instead.
   • While cards are made, the deck shows "Crafting questions"; then a toast says how many were made, with Start quiz. */
(function () {
  'use strict';
  const EF = window.EF;
  const esc = EF.esc, icon = EF.icon;
  const brand = (name) => `<i class="fa-brands ${name}" aria-hidden="true"></i>`;
  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  const MAX_TEXT = 24000, MAX_PHOTOS = 4, MAX_REC = 5 * 60, MAX_AUDIO = 4.4 * 1024 * 1024;
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

  /* ================= jobs (what a deck shows while its cards are being made) ================= */
  const jobs = new Map(), fresh = new Map();
  EF.magic = {
    job: (id) => jobs.get(id) || null,
    fresh: (id) => fresh.get(id) || null,
    clearFresh(id) { fresh.delete(id); EF.emit('magic', id); },
    open: (o) => open(o || {}),
    fromText: (o) => run(Object.assign({ kind: 'note' }, o, { structured: false })),
    quick: (t) => quick(t),
    structured: (t) => structured(t),
    status: (force) => aiStatus(force)
  };

  /* ================= is Zing AI available? ================= */
  const WHY = {
    off: 'Zing AI isn’t switched on for this copy of Zing.',
    offline: 'You’re offline, so Zing AI can’t help right now.',
    signin: 'Finish setting up your account to use Zing AI.',
    guest: 'Zing AI needs a Google or email sign-in (guest accounts can’t use it).',
    age: 'Zing AI is for students 14 and up.',
    not_eligible: 'Zing AI is for students 14 and up who sign in with Google or a confirmed email.',
    quota_exceeded: 'You’ve used today’s Magic imports. They come back tomorrow.',
    ai_daily_limit: 'Zing AI is resting for today (everyone used it up). It’s back tomorrow.',
    ai_unavailable: 'Zing AI didn’t answer. Try again in a minute.',
    temporarily_unavailable: 'Zing AI didn’t answer. Try again in a minute.',
    unauthorized: 'Sign in again to use Zing AI.',
    page_unreadable: 'That page wouldn’t open. Copy its text into Paste notes instead.',
    no_cards: 'Couldn’t find anything to study in that. Try clearer notes.',
    no_speech: 'Couldn’t hear enough in that recording. Try again closer to the speaker.',
    too_big: 'That’s too big. Try fewer pages or a shorter recording.',
    too_big_or_bad: 'That’s too big. Try fewer pages or a shorter recording.',
    invalid_request: 'That didn’t work. Try a different file or link.'
  };
  const why = (code) => WHY[code] || WHY.ai_unavailable;
  let statusCache = null;
  async function aiStatus(force) {
    if (!EF.cloud || !EF.cloud.enabled) return { ok: false, reason: 'off' };
    if (!navigator.onLine) return { ok: false, reason: 'offline' };
    if (!EF.cloud.joined()) return { ok: false, reason: 'signin' };
    const me = EF.cloud.cachedMe();
    if (me && me.age != null && me.age < 14) return { ok: false, reason: 'age' };
    const user = await EF.cloud.sessionUser();
    if (!user) return { ok: false, reason: 'signin' };
    if (user.is_anonymous) return { ok: false, reason: 'guest' };
    if (!force && statusCache && Date.now() - statusCache.at < 60000) return statusCache;
    try {
      const r = await EF.cloud.ai({ action: 'status' });
      statusCache = { at: Date.now(), ok: !!r.eligible && r.left > 0, reason: !r.eligible ? 'not_eligible' : r.left > 0 ? '' : 'quota_exceeded', left: +r.left || 0 };
    } catch (e) { statusCache = { at: Date.now(), ok: false, reason: e.code === 'offline' ? 'offline' : e.code || 'ai_unavailable' }; }
    return statusCache;
  }

  /* ================= cards without AI ================= */
  // tables: tab- or comma-separated, with "quoted, cells" (Quizlet, Anki and spreadsheet exports)
  function table(text) {
    const t = String(text).replace(/\r\n?/g, '\n').replace(/^﻿/, '');
    const lines = t.split('\n').filter((l) => l.trim() && !/^#[a-z ]+:/i.test(l)); // Anki puts "#separator:tab" lines first
    const sep = lines.some((l) => l.includes('\t')) ? '\t' : lines.filter((l) => l.includes(',')).length >= lines.length * 0.6 ? ',' : lines.filter((l) => l.includes(';')).length >= lines.length * 0.6 ? ';' : null;
    if (!sep) return [];
    const rows = [];
    let row = [], cell = '', q = false;
    const src = lines.join('\n') + '\n';
    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      if (q) { if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; continue; }
      if (ch === '"' && !cell) { q = true; continue; }
      if (ch === sep) { row.push(cell); cell = ''; continue; }
      if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
      cell += ch;
    }
    const strip = (s) => String(s).replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
    return rows.map((r) => r.map(strip)).filter((r) => r.filter(Boolean).length >= 2);
  }
  // Quizlet, Anki and sheets: question, answer, then (optionally) 3 wrong answers and a "why"
  function structured(text) {
    let rows = table(text);
    if (rows.length && /^(question|term|front|q|word)s?$/i.test(rows[0][0]) && /^(answer|definition|back|a|meaning)s?$/i.test(rows[0][1] || '')) rows = rows.slice(1);
    const cards = rows.map((r) => [r[0], r[1], r.length >= 5 ? r.slice(2, 5).filter(Boolean) : [], r[5] || '']).filter((c) => c[0] && c[1]);
    return cards.length ? cards : EF.sets.parse(text);
  }
  // is pasted text already "term - meaning" lines? (then it doesn't need AI)
  function looksStructured(text) {
    const lines = String(text).split('\n').filter((l) => l.trim());
    const n = structured(text).length;
    return n >= 3 && n >= lines.length * 0.6;
  }
  // notes in sentences: definitions become "What is …?" and names, places and numbers become fill-the-gap cards
  function quick(text) {
    const t = String(text || '').replace(/\r/g, '');
    const parsed = EF.sets.parse(t);
    if (parsed.length >= 3) return parsed.slice(0, 40);
    const out = [], seen = new Set();
    const add = (q, a) => { q = q.trim(); a = a.trim().replace(/[.;,:]+$/, ''); const k = q.toLowerCase(); if (q.length < 8 || !a || a.length > 160 || seen.has(k)) return; seen.add(k); out.push([q, a]); };
    // (not after "St.", "Mr.", "Dr." and friends)
    const sentences = t.split(/\n+/).flatMap((l) => l.split(/(?<!\b(?:St|Mr|Mrs|Ms|Dr|Mt|No|Jr|Sr|vs|etc|e\.g|i\.e)\.)(?<=[.!?])\s+(?=["“(A-Z0-9])/)).map((s) => s.replace(/^[\s•*\-–\d.)]+/, '').trim()).filter((s) => s.length >= 25 && s.length <= 260);
    sentences.forEach((s) => {
      if (out.length >= 25) return;
      // (not passives like "was signed in 1763": those make better fill-the-gap cards)
      const m = /^((?:An?|The)\s+)?([A-Za-z][\w'’\- ]{1,40}?)\s+(is|are|was|were|means|refers to)\s+(?!\w+ed\s)(.{3,200}?)[.!?]?$/.exec(s);
      if (m && m[2].split(' ').length <= 5) {
        const term = (m[1] || '').toLowerCase() + m[2];
        add(/^(means|refers to)$/.test(m[3]) ? `What does “${m[2]}” mean?` : `What ${m[3]} ${term}?`, m[4]);
        return;
      }
      // "The nucleus controls the cell." → "What controls the cell?" · "The nucleus"
      const v = /^((?:An?|The)\s+)?([A-Za-z][\w'’\- ]{1,30}?)\s+(controls|contains|produces|makes|releases|stores|carries|causes|absorbs|transports|protects|supports|converts|breaks down|holds|forms|allows|prevents)\s+(.{2,160}?)[.!?]?$/.exec(s);
      if (v && v[2].split(' ').length <= 4) { add(`What ${v[3]} ${v[4]}?`, ((v[1] || '') + v[2]).replace(/^./, (c) => c.toUpperCase())); return; }
      // a number or date first, then a name or place, then an abbreviation like DNA
      const key = /\b(1[0-9]{3}|20[0-9]{2})\b/.exec(s) || /\b(\d+(?:[.,]\d+)?\s?(?:%|°C|km|kg|cm|mm|m|g|years?|days?|hours?)|\d{2,4}(?:[.,]\d+)?)(?=[\s,.;)]|$)/.exec(s) || /(?:^|[^.!?]\s)((?:[A-Z][a-z’'\-]+)(?:\s+(?:of\s+|the\s+|de\s+|and\s+|St\.\s+)?[A-Z][a-z’'\-.]+)+)/.exec(s) || /\s([A-Z]{2,6}\d?)(?=[\s,.;)]|$)/.exec(s);
      if (key) { const k = key[1].trim(); if (k.length >= 2 && k.length < s.length - 12) add('Fill the gap: ' + s.replace(k, '_____'), k); }
    });
    return parsed.concat(out).slice(0, 30);
  }

  /* ================= reading files in the browser ================= */
  let pdfLib = null;
  function loadPdf() {
    if (pdfLib) return pdfLib;
    pdfLib = new Promise((res, rej) => {
      if (window.pdfjsLib) { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; return res(window.pdfjsLib); }
      const s = document.createElement('script');
      s.src = PDFJS + 'pdf.min.js'; s.async = true; s.crossOrigin = 'anonymous';
      s.onload = () => { const lib = window.pdfjsLib; if (!lib) { pdfLib = null; return rej(new Error('Couldn’t open the PDF reader.')); } lib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; res(lib); };
      s.onerror = () => { pdfLib = null; rej(new Error('Couldn’t load the PDF reader. Check your internet.')); };
      document.head.appendChild(s);
    });
    return pdfLib;
  }
  async function readPdf(file, title) {
    const lib = await loadPdf();
    // isEvalSupported: false keeps PDF fonts from running code (the fix for CVE-2024-4367)
    const doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
    const pages = Math.min(doc.numPages, 80);
    let text = '';
    for (let i = 1; i <= pages && text.length < MAX_TEXT * 1.3; i++) {
      const page = await doc.getPage(i), tc = await page.getTextContent();
      const lines = []; let line = '', lastY = null;
      tc.items.forEach((it) => {
        if (typeof it.str !== 'string') return;
        const y = Math.round(it.transform[5]);
        if (lastY !== null && Math.abs(y - lastY) > 2) { lines.push(line); line = ''; }
        line += (line && !/\s$/.test(line) && !/^\s/.test(it.str) ? ' ' : '') + it.str;
        lastY = y;
        if (it.hasEOL) { lines.push(line); line = ''; lastY = null; }
      });
      if (line) lines.push(line);
      text += lines.map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n') + '\n\n';
    }
    text = text.replace(/\n{3,}/g, '\n\n').trim();
    if (text.replace(/\s/g, '').length >= 200) return { kind: 'pdf', title, text, info: `${plural(doc.numPages, 'page')} · ${plural(words(text), 'word')}` };
    // scanned pages (pictures, no text): Zing AI reads the first few pages as photos
    const images = [];
    for (let i = 1; i <= Math.min(doc.numPages, MAX_PHOTOS); i++) {
      const page = await doc.getPage(i), vp0 = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: Math.min(2, 1400 / Math.max(vp0.width, vp0.height)) });
      const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      images.push(c.toDataURL('image/jpeg', 0.8));
    }
    return { kind: 'pdf', title, images, scanned: true, info: `${plural(doc.numPages, 'scanned page')} · Zing AI reads the first ${Math.min(doc.numPages, MAX_PHOTOS)}` };
  }
  // a tiny zip reader (Word .docx and PowerPoint .pptx are zip files of XML)
  async function unzip(buf, want) {
    const dv = new DataView(buf), out = {};
    let e = -1;
    for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error('That file looks damaged.');
    const count = dv.getUint16(e + 10, true);
    let p = dv.getUint32(e + 16, true), total = 0;
    for (let k = 0; k < count && p + 46 <= buf.byteLength; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true), size = dv.getUint32(p + 20, true), full = dv.getUint32(p + 24, true);
      const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
      const name = new TextDecoder().decode(new Uint8Array(buf, p + 46, nlen));
      p += 46 + nlen + xlen + clen;
      if (!want(name)) continue;
      total += full; if (total > 40 * 1024 * 1024) throw new Error('That file is too big to read.');
      const start = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true);
      const data = new Uint8Array(buf, start, size);
      let bytes;
      if (method === 0) bytes = data;
      else if (method === 8 && typeof DecompressionStream === 'function') bytes = new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
      else continue;
      out[name] = new TextDecoder().decode(bytes);
    }
    return out;
  }
  const xmlText = (x) => x.replace(/<w:tab\/>|<a:tab\/>/g, '\t').replace(/<w:br\/>|<a:br\/>|<\/w:p>|<\/a:p>/g, '\n').replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&');
  async function readDocx(file, title) {
    const files = await unzip(await file.arrayBuffer(), (n) => n === 'word/document.xml');
    if (!files['word/document.xml']) throw new Error('That Word file looks empty or damaged.');
    const text = xmlText(files['word/document.xml']).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    return { kind: 'doc', title, text, info: plural(words(text), 'word') };
  }
  async function readPptx(file, title) {
    const files = await unzip(await file.arrayBuffer(), (n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
    const slides = Object.keys(files).sort((a, b) => +a.match(/\d+/)[0] - +b.match(/\d+/)[0]);
    if (!slides.length) throw new Error('That PowerPoint has no slides Zing can read.');
    const text = slides.map((k, i) => `Slide ${i + 1}\n` + xmlText(files[k]).replace(/\n{2,}/g, '\n').trim()).join('\n\n');
    return { kind: 'slides', title, text, info: `${plural(slides.length, 'slide')} · ${plural(words(text), 'word')}` };
  }
  const words = (t) => (String(t || '').match(/\S+/g) || []).length;
  // "Clarke Electrical Services is a sole trader business…" → "Clarke Electrical Services is a sole…"
  const cutTitle = (t, n = 40) => { t = String(t).replace(/\s+/g, ' ').trim(); if (t.length <= n) return t; const c = t.slice(0, n); const sp = c.lastIndexOf(' '); return (sp > 12 ? c.slice(0, sp) : c).replace(/[,.;:]$/, '') + '…'; };
  // photos: shrunk to 1400 px so they upload fast (and fit Zing AI's limits)
  async function shrink(file) {
    let src;
    try { src = await createImageBitmap(file); }
    catch (e) {
      src = await new Promise((res, rej) => { const img = new Image(); const u = URL.createObjectURL(file); img.onload = () => { URL.revokeObjectURL(u); res(img); }; img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('That photo can’t be read here. Try a JPG or PNG.')); }; img.src = u; });
    }
    const w = src.width, h = src.height, k = Math.min(1, 1400 / Math.max(w, h));
    const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(src, 0, 0, c.width, c.height);
    let url = c.toDataURL('image/jpeg', 0.82);
    if (url.length > 1400000) url = c.toDataURL('image/jpeg', 0.6);
    return url;
  }
  const dataUrl = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('Couldn’t read that file.')); r.readAsDataURL(blob); });
  const AUDIO_TYPES = { mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', ogg: 'audio/ogg', webm: 'audio/webm', aac: 'audio/aac', mp4: 'audio/mp4' };
  async function readFile(file) {
    const name = file.name || 'file', ext = (name.includes('.') ? name.split('.').pop() : '').toLowerCase(), type = (file.type || '').toLowerCase();
    const title = name.replace(/\.[a-z0-9]{1,5}$/i, '').replace(/[_-]+/g, ' ').trim().slice(0, 60) || 'Imported notes';
    if (file.size > 30 * 1024 * 1024) throw new Error('That file is over 30 MB. Try a smaller one.');
    if (type.startsWith('image/') || /^(jpe?g|png|webp|gif|heic|heif)$/.test(ext)) return { kind: 'photo', title, photos: [file] };
    if (type.startsWith('audio/') || AUDIO_TYPES[ext]) {
      if (file.size > MAX_AUDIO) throw new Error('That recording is too long. Use one under about 5 minutes.');
      const t = type.startsWith('audio/') ? file : new Blob([file], { type: AUDIO_TYPES[ext] });
      return { kind: 'audio', title, audio: await dataUrl(t), info: (file.size / 1048576).toFixed(1) + ' MB recording' };
    }
    if (ext === 'pdf' || type === 'application/pdf') return readPdf(file, title);
    if (ext === 'docx') return readDocx(file, title);
    if (ext === 'pptx') return readPptx(file, title);
    if (/^(csv|tsv)$/.test(ext)) { const text = await file.text(); return { kind: 'sheet', title, text, structured: true, info: plural(structured(text).length, 'card') + ' found' }; }
    if (/^(txt|md|text|markdown)$/.test(ext) || type.startsWith('text/')) { const text = await file.text(); return looksStructured(text) ? { kind: 'sheet', title, text, structured: true, info: plural(structured(text).length, 'card') + ' found' } : { kind: 'text', title, text, info: plural(words(text), 'word') }; }
    if (/^(doc|ppt|pages|key|odt|odp|rtf|xls|xlsx|numbers)$/.test(ext)) throw new Error(`Zing can’t open .${ext} files. Save it as a PDF${/^(xls|xlsx|numbers)$/.test(ext) ? ' or CSV' : ', .docx or .pptx'} first.`);
    throw new Error('Zing can’t read that kind of file yet. Try a PDF, Word, PowerPoint, photo or recording.');
  }

  /* ================= making the cards ================= */
  function doneToast(deckId, n, firstQ, note) {
    const d = EF.sets.raw(deckId), wrap = document.getElementById('toasts');
    if (!d || !wrap) return;
    wrap.querySelectorAll('.dk-toast').forEach((x) => x.remove());
    const t = document.createElement('div');
    t.className = 'toast dk-toast'; t.setAttribute('role', 'status');
    const href = EF.deckStudyHref ? EF.deckStudyHref(deckId) : '#/deck/' + deckId;
    t.innerHTML = `<span class="dk-toast-sq" style="--c:${esc(d.color)}" aria-hidden="true"></span>
      <span class="dk-toast-t"><strong>${esc(d.name)}</strong><span><b>${n}</b> card${n === 1 ? '' : 's'} created${note ? ` · ${esc(note)}` : ''}</span>${firstQ ? `<em>${esc(firstQ)}</em>` : ''}</span>
      ${href ? `<a class="btn btn-ink btn-sm" href="${href}">${EF.img3d('game', 20)} Start quiz</a>` : ''}<button type="button" class="toast-x" aria-label="Dismiss">${icon('fa-xmark')}</button>`;
    wrap.appendChild(t);
    requestAnimationFrame(() => t.classList.add('is-in'));
    const bye = () => { t.classList.remove('is-in'); setTimeout(() => t.remove(), 300); };
    t.addEventListener('click', (e) => { if (e.target.closest('.toast-x, a')) bye(); });
    setTimeout(bye, 12000);
  }
  const LABEL = { pdf: 'Reading your PDF', doc: 'Reading your Word file', slides: 'Reading your slides', photo: 'Reading your photos', audio: 'Listening to the recording', web: 'Reading the web page', yt: 'Reading the video transcript', paste: 'Reading your notes', note: 'Reading your notes', text: 'Reading your file', sheet: 'Turning rows into cards', sample: 'Trying Zing AI on sample notes' };
  async function run(src) {
    let deckId = src.deckId && EF.sets.raw(src.deckId) ? src.deckId : null, madeDeck = false;
    if (!deckId) {
      const colors = EF.sets.colors;
      deckId = EF.sets.save({ name: (src.title || 'My notes').slice(0, 60), color: colors[Math.floor(Math.random() * colors.length)], cards: [] }).id;
      madeDeck = true;
    }
    if (jobs.has(deckId)) { EF.toast('Still making cards for this deck. One moment!', 'fa-hourglass-half'); return; }
    jobs.set(deckId, { label: LABEL[src.kind] || 'Reading your notes', at: Date.now() });
    EF.emit('magic', deckId);
    if (location.hash !== '#/deck/' + deckId && location.hash !== '#/deck/' + deckId + '/materials') location.hash = '#/deck/' + deckId + '/materials';
    let cards = [], ai = false, note = '', material = src.text || '', title = '', firstQ = '';
    try {
      if (src.structured) cards = structured(src.text);
      else if (src.sample) {
        const r = await EF.cloud.ai({ topic: src.sample }, 'zing-ai-sample');
        cards = (r.cards || []).map((c) => [c.question, c.answer]); ai = true;
      } else {
        const st = await aiStatus(true);
        if (st.ok) {
          try {
            const body = { action: 'cards', count: src.count || 12 };
            if (src.text) body.text = src.text.slice(0, MAX_TEXT);
            if (src.images && src.images.length) body.images = src.images.slice(0, MAX_PHOTOS);
            if (src.audio) body.audio = src.audio;
            if (src.url) body.url = src.url;
            const r = await EF.cloud.ai(body);
            cards = (r.cards || []).map((c) => [c.q, c.a, c.wrong, c.why]); ai = true;
            title = r.title || r.pageTitle || '';
            if (r.page) material = r.page;
            if (r.transcript) material = r.transcript;
            if (statusCache) { statusCache.left = +r.left || 0; statusCache.ok = statusCache.left > 0; }
          } catch (e) {
            if (!src.text || ['unauthorized', 'invalid_request', 'too_big', 'too_big_or_bad'].includes(e.code)) throw e;
            cards = quick(src.text); note = 'quick cards'; EF.toast(why(e.code) + ' Made quick cards instead.', 'fa-circle-info');
          }
        } else if (src.text) { cards = quick(src.text); note = 'quick cards'; }
        else { const er = new Error(why(st.reason)); er.code = st.reason; throw er; }
      }
      if (!cards.length) { const er = new Error(why('no_cards')); er.code = 'no_cards'; throw er; }
    } catch (e) {
      jobs.delete(deckId);
      // a deck made only for this import goes away again if nothing came of it
      if (madeDeck && !(EF.sets.raw(deckId).cards || []).length) { EF.sets.remove(deckId); location.hash = '#/decks'; }
      EF.emit('magic', deckId);
      EF.toast(e.code ? why(e.code) : e.message || why('ai_unavailable'), 'fa-circle-exclamation');
      return;
    }
    let from = 0, added = 0;
    EF.sets.patch(deckId, (d) => {
      from = d.cards.length;
      const clean = cards.map(EF.sets.cardOf).filter(Boolean);
      d.cards = d.cards.concat(clean).slice(0, 400);
      added = d.cards.length - from;
      firstQ = added ? d.cards[from][0] : '';
      // keep what was imported as a note to read again (not for Quizlet/Anki/sheet rows, which are the cards)
      const same = (d.notes || []).some((n) => n.x.trim() === material.trim().slice(0, 30000).trim());
      if (!src.structured && !src.sample && !src.noteId && material && material.trim().length >= 40 && !same) {
        const loose = ['paste', 'web', 'yt', 'audio', 'photo'].includes(src.kind);
        d.notes = (d.notes || []).concat({ id: EF.sets.newNoteId(), t: ((loose && title) || src.title || title || 'Imported notes').slice(0, 80), x: material.slice(0, 30000), k: src.kind || 'paste', src: src.url || src.link || undefined, at: Date.now() });
      }
      if (madeDeck && title && ['paste', 'photo', 'audio', 'web', 'yt'].includes(src.kind)) d.name = title.slice(0, 60);
    });
    jobs.delete(deckId);
    if (added) fresh.set(deckId, { from, n: added, ai });
    EF.emit('magic', deckId);
    if (!added) { EF.toast('Your deck is full (400 cards). Make a subdeck for more.', 'fa-circle-info'); return; }
    EF.store.addXP(10);
    EF.haptic && EF.haptic('success');
    doneToast(deckId, added, firstQ, note);
  }

  /* ================= the Magic import window ================= */
  const VIEWS = {
    paste: { title: 'Paste notes', art: icon('fa-align-left') },
    youtube: { title: 'YouTube', art: brand('fa-youtube') },
    quizlet: { title: 'Quizlet', art: '<span class="mi-q" aria-hidden="true">Q</span>' },
    record: { title: 'Lecture recording', art: icon('fa-microphone') },
    anki: { title: 'Anki', art: '<span class="mi-q mi-anki" aria-hidden="true">A</span>' },
    sheets: { title: 'Sheets', art: icon('fa-table') },
    photo: { title: 'Photograph your notes', art: icon('fa-camera') },
    link: { title: 'Website link', art: icon('fa-link') }
  };
  const chip = (k) => `<button type="button" class="mi-chip" data-mi-view="${k}">${VIEWS[k].art}<span>${VIEWS[k].title}</span></button>`;
  function open(opts) {
    const deckId = opts.deckId && EF.sets.raw(opts.deckId) ? opts.deckId : null;
    let view = opts.view || 'home', more = false, st = null, file = null, photos = [], rec = null;
    const dlg = document.createElement('dialog');
    dlg.className = 'zdlg mi-dlg';
    const aiLine = () => {
      if (!st) return `<p class="mi-ai is-wait">${icon('fa-spinner', 'fa-spin')} Checking Zing AI…</p>`;
      if (st.ok && short()) return `<p class="mi-ai">${icon('fa-circle-info')} <span>Photos and recordings use 2 of your daily imports, and you have <b>1</b> left today. Try notes, a file or a link instead.</span></p>`;
      if (st.ok) return `<p class="mi-ai is-on">${icon('fa-wand-magic-sparkles')} <span>Zing AI is on: <b>${plural(st.left, 'import')}</b> left today. It writes questions, wrong answers and explanations.${needsAi() && cost() > 1 ? ' This uses 2.' : ''}</span></p>`;
      return `<p class="mi-ai">${icon('fa-circle-info')} <span>${esc(why(st.reason))} You can still import Quizlet, Anki and Sheets, and Zing makes quick cards from notes and files.</span>${st.reason === 'signin' ? ` <button type="button" class="link" data-ob-again>Set up</button>` : ''}</p>`;
    };
    const steps = (list) => `<ol class="mi-steps">${list.map((s) => `<li>${s}</li>`).join('')}</ol>`;
    const textBox = (ph, rows) => `<textarea class="mi-text" data-mi-text rows="${rows || 9}" placeholder="${esc(ph)}" aria-label="Your text" spellcheck="true"></textarea>`;
    function body() {
      if (view === 'home') return `<label class="mi-drop" data-mi-drop tabindex="0">
          <input type="file" data-mi-file accept=".pdf,.docx,.pptx,.txt,.md,.csv,.tsv,image/*,audio/*" hidden>
          <span class="mi-drop-ic">${icon('fa-arrow-up-from-bracket')}</span><strong>Drop a file here</strong><span>or click to upload</span><small>PDF, PowerPoint, Word, images or audio</small>
        </label>
        <div class="mi-or" role="separator"><span>or</span></div>
        <div class="mi-chips">${['paste', 'youtube', 'quizlet'].map(chip).join('')}<button type="button" class="mi-chip mi-more" data-mi-more aria-expanded="${more}">More ${icon(more ? 'fa-chevron-up' : 'fa-chevron-down')}</button></div>
        ${more ? `<div class="mi-chips">${['record', 'anki', 'sheets', 'photo', 'link'].map(chip).join('')}</div>` : ''}
        ${aiLine()}
        ${st && st.ok ? `<p class="mi-sample">No notes handy? Try Zing AI on sample notes: <button type="button" class="link" data-mi-sample="photosynthesis">Photosynthesis</button> · <button type="button" class="link" data-mi-sample="newton-laws">Newton’s laws</button></p>` : ''}`;
      if (view === 'file') return `<div class="mi-file">${icon(file && file.kind === 'audio' ? 'fa-file-audio' : file && file.kind === 'photo' ? 'fa-file-image' : 'fa-file-lines')}<span><strong>${esc(file ? file.name : '')}</strong><small data-mi-info>${file && file.data ? esc(file.data.info || '') : `${icon('fa-spinner', 'fa-spin')} Reading…`}</small></span></div>
        ${file && file.err ? `<p class="mi-err">${icon('fa-circle-exclamation')} ${esc(file.err)}</p>` : ''}
        ${file && file.data && file.data.text && !file.data.structured ? `<details class="mi-peek"><summary>See the text Zing found</summary><pre>${esc(file.data.text.slice(0, 1500))}${file.data.text.length > 1500 ? '…' : ''}</pre></details>` : ''}
        ${file && file.data && file.data.text && file.data.text.length > MAX_TEXT && st && st.ok ? `<p class="muted small">${icon('fa-circle-info')} It’s long, so Zing AI uses the first part (about ${Math.round(MAX_TEXT / 6)} words).</p>` : ''}
        ${aiLine()}`;
      if (view === 'paste') return `<label class="mi-label">Paste or type your notes</label>${textBox('e.g. Enzymes are proteins that speed up chemical reactions. They work best at body temperature (37 °C)…', 10)}
        <p class="muted small">${icon('fa-circle-info')} Lines like <b>term - meaning</b> become cards straight away. Anything else goes to Zing AI.</p>${aiLine()}`;
      if (view === 'youtube') return `<label class="mi-label" for="mi-url">Video link</label><input id="mi-url" class="mi-input" data-mi-url type="url" inputmode="url" placeholder="https://www.youtube.com/watch?v=…" autocomplete="off">
        ${steps(['Open the video on YouTube.', 'Under the video, tap <b>…more</b>, then <b>Show transcript</b>.', 'Select all of the transcript, copy it and paste it here.'])}${textBox('Paste the transcript here', 7)}${aiLine()}`;
      if (view === 'quizlet') return `${steps(['Open your Quizlet set.', 'Tap <b>…</b> then <b>Export</b>.', 'Keep <b>Tab</b> between term and definition, tap <b>Copy text</b>, and paste it here.'])}${textBox('term[Tab]definition', 9)}<p class="muted small">${icon('fa-bolt')} Becomes cards straight away. No AI needed.</p>`;
      if (view === 'anki') return `${steps(['In Anki, choose <b>File → Export</b>.', 'Pick <b>Notes in Plain Text (.txt)</b> and export.', 'Choose the file below, or open it and paste what’s inside.'])}
        <label class="btn btn-block mi-pick">${icon('fa-file-import')} Choose the .txt file<input type="file" data-mi-file accept=".txt,.tsv,.csv,text/plain" hidden></label>${textBox('front[Tab]back', 6)}<p class="muted small">${icon('fa-bolt')} Becomes cards straight away. No AI needed.</p>`;
      if (view === 'sheets') return `${steps(['Put questions in column A and answers in column B. Add 3 wrong answers in C, D and E if you like.', 'Select the cells and copy them (or <b>File → Download → CSV</b>).', 'Paste them here, or choose the CSV file.'])}
        <label class="btn btn-block mi-pick">${icon('fa-file-csv')} Choose a CSV file<input type="file" data-mi-file accept=".csv,.tsv,.txt" hidden></label>${textBox('Question[Tab]Answer', 6)}<p class="muted small">${icon('fa-bolt')} Becomes cards straight away. No AI needed.</p>`;
      if (view === 'photo') return `<div class="mi-photo-btns"><label class="btn btn-primary">${icon('fa-camera')} Take a photo<input type="file" accept="image/*" capture="environment" data-mi-photo hidden></label><label class="btn">${icon('fa-images')} Choose photos<input type="file" accept="image/*" multiple data-mi-photo hidden></label></div>
        ${photos.length ? `<ul class="mi-photos">${photos.map((p, i) => `<li><img src="${p}" alt="Photo ${i + 1}"><button type="button" class="icon-btn" data-mi-unphoto="${i}" aria-label="Remove photo ${i + 1}">${icon('fa-xmark')}</button></li>`).join('')}</ul>` : `<p class="mi-hint">${EF.img3d('memo', 40)}<span>Up to ${MAX_PHOTOS} pages of notes or a textbook. Get the whole page in, in good light.</span></p>`}
        <p class="muted small">${icon('fa-user-shield')} Only photograph study notes: no faces, names or phone numbers.</p>${aiLine()}`;
      if (view === 'record') return `<div class="mi-rec${rec && rec.on ? ' is-on' : ''}"><button type="button" class="mi-rec-btn" data-mi-rec aria-label="${rec && rec.on ? 'Stop recording' : 'Start recording'}">${icon(rec && rec.on ? 'fa-stop' : 'fa-microphone')}</button>
          <strong class="mi-rec-time" data-mi-time>${rec ? fmt(rec.secs || 0) : '0:00'} / ${fmt(MAX_REC)}</strong><span class="muted small">${rec && rec.on ? 'Recording… tap to stop' : rec && rec.url ? 'Recorded. Tap Make cards, or record again.' : 'Tap to record (up to 5 minutes)'}</span></div>
        ${rec && rec.url ? `<audio controls src="${rec.url}" class="mi-audio"></audio>` : ''}
        <p class="muted small">${icon('fa-circle-info')} Ask your teacher before recording a lesson. You can also upload a recording on the first screen.</p>${aiLine()}`;
      if (view === 'link') return `<label class="mi-label" for="mi-url">Web page link</label><input id="mi-url" class="mi-input" data-mi-url type="url" inputmode="url" placeholder="https://…" autocomplete="off">
        <p class="muted small">${icon('fa-circle-info')} Works with articles and notes pages. For a video use YouTube, and for a PDF download it and upload the file.</p>${aiLine()}`;
      return '';
    }
    const fmt = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
    const needsAi = () => view === 'photo' || view === 'record' || view === 'link' || (view === 'file' && file && file.data && !file.data.text && !file.data.structured);
    const cost = () => (view === 'photo' || view === 'record' || (view === 'file' && file && file.data && (file.data.images || file.data.audio)) ? 2 : 1);
    const short = () => needsAi() && st && st.ok && st.left < cost();
    function footer() {
      if (view === 'home') return '';
      const off = needsAi() && st && (!st.ok || st.left < cost());
      const ready = view === 'photo' ? photos.length : view === 'record' ? rec && rec.url && !rec.on : view === 'file' ? file && file.data : true;
      return `<footer class="zdlg-foot mi-foot"><button type="button" class="btn" data-mi-back>${icon('fa-arrow-left')} Back</button><button type="button" class="btn btn-primary btn-lg" data-mi-go${ready && !off ? '' : ' disabled'}>${icon('fa-wand-magic-sparkles')} Make cards</button></footer>`;
    }
    function draw(focus) {
      const t = view === 'home' || view === 'file' ? 'Magic import' : VIEWS[view].title;
      const keep = dlg.querySelector('[data-mi-text]'), keepUrl = dlg.querySelector('[data-mi-url]');
      const saved = keep ? keep.value : null, savedUrl = keepUrl ? keepUrl.value : null;
      dlg.innerHTML = `<form method="dialog" class="zdlg-box mi-box" novalidate>
        <header class="zdlg-head mi-head"><span class="mi-wand" aria-hidden="true">${view === 'home' || view === 'file' ? icon('fa-wand-magic-sparkles') : VIEWS[view].art}</span><h2>${esc(t)}</h2><button type="submit" value="x" class="icon-btn" aria-label="Close" formnovalidate>${icon('fa-xmark')}</button></header>
        <div class="mi-body zdlg-scroll">${body()}</div>${footer()}</form>`;
      const ta = dlg.querySelector('[data-mi-text]'), u = dlg.querySelector('[data-mi-url]');
      if (ta && saved != null) ta.value = saved;
      if (u && savedUrl != null) u.value = savedUrl;
      if (focus) { const f = dlg.querySelector('[data-mi-url], [data-mi-text], [data-mi-drop]'); if (f) f.focus({ preventScroll: true }); }
    }
    async function takeFile(f) {
      if (!f) return;
      if (view === 'anki' || view === 'sheets') {
        try { const text = await f.text(); const ta = dlg.querySelector('[data-mi-text]'); if (ta) ta.value = text; EF.toast(plural(structured(text).length, 'card') + ' found', 'fa-table'); } catch (e) { EF.toast('Couldn’t read that file', 'fa-circle-exclamation'); }
        return;
      }
      file = { name: f.name || 'File', kind: '', data: null, err: '' };
      view = 'file'; draw();
      try {
        const data = await readFile(f);
        if (data.kind === 'photo') { file = null; view = 'photo'; draw(); await addPhotos(data.photos); return; }
        file.kind = data.kind; file.data = data;
      } catch (e) { file.err = e.message || 'Couldn’t read that file.'; }
      if (dlg.open) draw();
    }
    async function addPhotos(list) {
      for (const f of Array.from(list || [])) {
        if (photos.length >= MAX_PHOTOS) { EF.toast(`Up to ${MAX_PHOTOS} photos at a time`, 'fa-circle-info'); break; }
        try { photos.push(await shrink(f)); } catch (e) { EF.toast(e.message, 'fa-circle-exclamation'); }
      }
      if (dlg.open) draw();
    }
    async function toggleRec() {
      if (rec && rec.on) { rec.stop(); return; }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') { EF.toast('This browser can’t record. Upload a recording instead.', 'fa-circle-exclamation'); return; }
      let stream;
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { EF.toast('Zing needs the microphone to record. Allow it, then try again.', 'fa-microphone-slash'); return; }
      const type = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
      const mr = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 32000 } : { audioBitsPerSecond: 32000 });
      const chunks = [];
      if (rec && rec.url) URL.revokeObjectURL(rec.url);
      rec = { on: true, secs: 0, t0: Date.now(), url: null, data: null };
      rec.stop = () => { if (mr.state !== 'inactive') mr.stop(); };
      mr.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      mr.onstop = async () => {
        clearInterval(rec.timer); stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: (mr.mimeType || type || 'audio/webm').split(';')[0] === 'audio/mp4' ? 'audio/mp4' : mr.mimeType || type || 'audio/webm' });
        rec.on = false;
        if (blob.size > MAX_AUDIO) { EF.toast('That recording is too long. Keep it under 5 minutes.', 'fa-circle-exclamation'); if (dlg.open) draw(); return; }
        rec.url = URL.createObjectURL(blob); rec.data = await dataUrl(blob);
        if (dlg.open) draw();
      };
      rec.timer = setInterval(() => { rec.secs = (Date.now() - rec.t0) / 1000; const el = dlg.querySelector('[data-mi-time]'); if (el) el.textContent = fmt(rec.secs) + ' / ' + fmt(MAX_REC); if (rec.secs >= MAX_REC) rec.stop(); }, 250);
      mr.start(1000);
      draw();
    }
    function go() {
      const ta = dlg.querySelector('[data-mi-text]'), text = ta ? ta.value.trim() : '', u = dlg.querySelector('[data-mi-url]'), link = u ? u.value.trim() : '';
      let src = null;
      if (view === 'paste') {
        if (text.length < 20) { EF.toast('Paste a bit more first (a few lines)', 'fa-circle-info'); if (ta) ta.focus(); return; }
        const first = cutTitle((text.split('\n').find((l) => l.trim()) || 'My notes').replace(/^[#*\s-]+/, ''));
        src = looksStructured(text) ? { kind: 'sheet', title: first, text, structured: true } : { kind: 'paste', title: first, text };
      } else if (view === 'youtube') {
        if (link && !/^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//i.test(link)) { EF.toast('That isn’t a YouTube link', 'fa-circle-exclamation'); return; }
        if (text.length < 40) { EF.toast('Paste the video’s transcript too (see the steps)', 'fa-circle-info'); if (ta) ta.focus(); return; }
        src = { kind: 'yt', title: 'Video notes', text, link: link || undefined };
      } else if (view === 'quizlet' || view === 'anki' || view === 'sheets') {
        const n = structured(text).length;
        if (!n) { EF.toast('No cards found. Put a tab or comma between each question and answer.', 'fa-circle-exclamation'); if (ta) ta.focus(); return; }
        src = { kind: 'sheet', title: VIEWS[view].title + ' cards', text, structured: true };
      } else if (view === 'photo') src = { kind: 'photo', title: 'Photo notes', images: photos.slice() };
      else if (view === 'record') src = { kind: 'audio', title: 'Lesson recording', audio: rec && rec.data };
      else if (view === 'link') {
        let ok = false; try { const x = new URL(link); ok = x.protocol === 'https:' || x.protocol === 'http:'; } catch (e) { ok = false; }
        if (!ok) { EF.toast('Paste a full link, starting with https://', 'fa-circle-exclamation'); if (u) u.focus(); return; }
        const url = link.replace(/^http:/i, 'https:');
        src = { kind: 'web', title: (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return 'Web page'; } })(), url };
      } else if (view === 'file' && file && file.data) src = Object.assign({}, file.data);
      if (!src) return;
      src.deckId = deckId;
      dlg.close();
      run(src);
    }
    dlg.addEventListener('click', (e) => {
      const t = e.target;
      if (t === dlg) { dlg.close(); return; }
      const v = t.closest('[data-mi-view]'); if (v) { view = v.dataset.miView; draw(true); return; }
      if (t.closest('[data-mi-more]')) { more = !more; draw(); return; }
      if (t.closest('[data-mi-back]')) { if (rec && rec.on) rec.stop(); view = 'home'; file = null; draw(); return; }
      if (t.closest('[data-mi-go]')) { go(); return; }
      if (t.closest('[data-mi-rec]')) { toggleRec(); return; }
      const un = t.closest('[data-mi-unphoto]'); if (un) { photos.splice(+un.dataset.miUnphoto, 1); draw(); return; }
      const sm = t.closest('[data-mi-sample]');
      if (sm) { dlg.close(); run({ deckId, kind: 'sample', title: sm.dataset.miSample === 'photosynthesis' ? 'Photosynthesis' : 'Newton’s laws', sample: sm.dataset.miSample }); return; }
      if (t.closest('[data-ob-again]')) dlg.close();
    });
    dlg.addEventListener('change', (e) => {
      if (e.target.matches('[data-mi-file]')) { takeFile(e.target.files && e.target.files[0]); e.target.value = ''; }
      else if (e.target.matches('[data-mi-photo]')) { addPhotos(e.target.files); e.target.value = ''; }
    });
    dlg.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-mi-drop]')) { e.preventDefault(); e.target.querySelector('input').click(); }
      if (e.key === 'Enter' && e.target.matches('[data-mi-url]') && view === 'link') { e.preventDefault(); go(); }
    });
    // drag and drop a file anywhere on the window
    dlg.addEventListener('dragover', (e) => { e.preventDefault(); const d = dlg.querySelector('[data-mi-drop]'); if (d) d.classList.add('is-over'); });
    dlg.addEventListener('dragleave', (e) => { if (e.target.matches && e.target.matches('[data-mi-drop]')) e.target.classList.remove('is-over'); });
    dlg.addEventListener('drop', (e) => {
      e.preventDefault();
      const files = e.dataTransfer && e.dataTransfer.files;
      if (!files || !files.length) return;
      if (view === 'photo') addPhotos(files); else takeFile(files[0]);
    });
    dlg.addEventListener('close', () => { if (rec && rec.on) rec.stop(); if (rec && rec.url) URL.revokeObjectURL(rec.url); dlg.remove(); });
    document.body.appendChild(dlg);
    draw();
    dlg.showModal();
    const f = dlg.querySelector('[data-mi-drop], [data-mi-text]'); if (f) f.focus({ preventScroll: true });
    aiStatus(true).then((s) => { st = s; if (dlg.open) draw(); });
  }
})();
