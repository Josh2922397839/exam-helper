#!/usr/bin/env node
/* Turns a study-archive "handoff" (the ===== SUBJECT ===== template in docs/chatgpt-content-prompt.md)
   into a subject file for the site.

     node tools/handoff/convert.mjs english path/to/claude-english-language-handoff.md

   writes assets/js/content/g10-english.js. Per-subject settings (short topic names, icons, units,
   widgets to keep, privacy fixes) live in tools/handoff/subjects.mjs.

   Privacy: the handoffs are private study records. Links to private chats/kits, photo file names,
   class names and personal scores are stripped here; only public reference links are kept. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SUBJECTS } from './subjects.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [id, file] = process.argv.slice(2);
const cfg = SUBJECTS[id];
if (!cfg || !file) { console.error('usage: convert.mjs <' + Object.keys(SUBJECTS).join('|') + '> <handoff.md>'); process.exit(1); }

/* ---------- privacy + tidy ---------- */
const PRIVATE_LINK = /(chatgpt\.com|chat\.openai\.com|thea\.study|theastudy\.com|gizmo\.ai|sandbox:|file:)/i;
function sanitize(t) {
  for (const [a, b] of cfg.fix || []) t = t.split(a).join(b);
  return t
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, txt, url) => (PRIVATE_LINK.test(url) ? txt : m))
    .replace(/,\s*(?:image-)?\d{5,}\.(?:jpe?g|png|heic|webp),/gi, '')
    .replace(/\s*\(?(?:image-)?\d{5,}\.(?:jpe?g|png|heic|webp)\)?/gi, '')
    .replace(/\b(?:class |group )?10 Holding\b/g, 'your class')
    .replace(/(\S) {2,}/g, '$1 ')
    .replace(/ ([,.;:])/g, '$1');
}

/* ---------- inline markdown → safe HTML ---------- */
const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function inline(s) {
  let h = escHtml(s.trim());
  h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (m, txt, url) => `<a href="${url}" target="_blank" rel="noopener">${txt}</a>`);
  h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
  h = h.replace(/&lt;(\/?)u&gt;/g, '<$1u>');
  h = h.replace(/\[CHECK\]/g, '<span class="chk" title="Not confirmed yet: check with your teacher">check</span>');
  h = h.replace(/\(I got this wrong\)/g, '<span class="missed" title="Got this wrong before">missed before</span>');
  return h;
}
const plain = (s) => s.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();

/* ---------- parse ---------- */
const raw = sanitize(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'));
const lines = raw.split('\n');
const start = lines.findIndex((l) => /^===== SUBJECT:/.test(l));
if (start < 0) throw new Error('No ===== SUBJECT line');
const sections = []; // {kind, title, body:[]}
let cur = null;
for (const l of lines.slice(start + 1)) {
  const m = /^--- (TOPIC|QUIZ|FLASHCARDS|TRICKY BITS|SOURCES|GIZMO)(?::\s*(.*?))?(?:\s*\(.*\))?\s*---\s*$/.exec(l);
  if (m) { cur = { kind: m[1], title: (m[2] || '').trim(), body: [] }; sections.push(cur); continue; }
  if (cur) cur.body.push(l);
}

const LABELS = /^(NOTES|KEY TERMS|FORMULAS \/ RULES|WORKED EXAMPLE|DIAGRAM|COMPARE(?: \(if useful\))?|TIMELINE(?: \(history only\))?):\s*(.*)$/;
/* Splits a label section into items: "- " starts an item, indented lines continue it (keeping line breaks),
   "| " lines form tables. Returns [{t:'item', text, extra:[lines]}, {t:'table', rows}] */
function items(body) {
  const out = [];
  let it = null, tbl = null;
  for (const l of body) {
    if (/^\s*\|/.test(l)) { if (!tbl) { tbl = { t: 'table', rows: [] }; out.push(tbl); it = null; } tbl.rows.push(l.trim()); continue; }
    tbl = null;
    if (/^- /.test(l)) { it = { t: 'item', text: l.slice(2).trim(), extra: [] }; out.push(it); continue; }
    if (!l.trim()) { if (it && it.extra.length) it.extra.push(''); continue; }
    if (it) { if (/^\s{2,}/.test(l)) it.extra.push(l.replace(/^\s{2}/, '')); else if (it.extra.length) it.extra.push(l); else it.text += ' ' + l.trim(); }
    else out.push({ t: 'item', text: l.trim(), extra: [] });
  }
  for (const x of out) if (x.extra) { while (x.extra.length && !x.extra[x.extra.length - 1].trim()) x.extra.pop(); }
  return out;
}
function mdTable(rows, title) {
  const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  const head = cells(rows[0]);
  const sep = rows[1] && /^[\s|:-]+$/.test(rows[1]) ? cells(rows[1]) : null;
  const body = rows.slice(sep ? 2 : 1).map(cells);
  const b = { type: 'table', head: head.map(plain), rows: body.map((r) => r.map(inline)) };
  if (sep && sep.some((c) => /-:$/.test(c))) b.align = sep.map((c) => (/-:$/.test(c) ? 'r' : ''));
  if (title) b.title = title;
  return b;
}

function cleanTitle(t) {
  let badge = null, title = t;
  const pre = /^(Grade 9 review|Older review)\s+—\s+(.*)$/i.exec(t);
  if (pre) { badge = /grade 9/i.test(pre[1]) ? 'Grade 9 review' : 'Older review'; title = pre[2]; }
  const suf = /^(.*?)\s+—\s+((?:confirmed )?Grade 10[^—]*|Grade 9[^—]*|older[^—]*|recorded textbook[^—]*|exercise grade[^—]*)$/i.exec(title);
  if (suf) {
    title = suf[1];
    if (!badge) badge = /^(confirmed )?Grade 10/i.test(suf[2]) ? 'Grade 10' : /^Grade 9/i.test(suf[2]) ? 'Grade 9 review' : 'Older review';
  }
  title = title.replace(/;\s*(?:school )?grade.*$/i, '').replace(/\s*\[CHECK\]\s*$/, '').trim();
  return { title, badge, unconfirmed: /\[CHECK\]/.test(t) };
}

/* Provenance sentences ("this is newly written practice", "not recovered from your notebook") are useful
   for the record but get in the way while revising: they move to a collapsed "Source notes" list. */
const META = [/\b(?:old|earlier) assistant\b/i, /\bgenerated (?:guide|study)/i, /\brecovered\b/i, /\bnewly (?:written|prepared)\b/i,
  /\bsaved(?:[- ](?:deck|Thea|kit|card))\b|\bThea (?:kit|test|card)s?\b/i, /\bnot (?:a |an )?(?:verified|proved|independently proved) teacher\b/i,
  /\bReview URL\b/, /\bis labelled older review\b/i, /\bno (?:student|original|personal|current)\b[^.]*\b(?:supplied|recovered|invented|verified|established)\b/i,
  /^(?:This|It) is (?:a |an )?(?:new|expected|standard|review|illustrative)\b[^.]*\b(?:example|result|explanation|practice)\b/i];
const TRIVIAL = /^(?:This is )?newly written practice\.?$/i;
const ABBR = /\b(St|Mr|Ms|Mrs|Dr|vs|No|Fig|p|e\.g|i\.e|approx|cf|Q)\.(?=\s)/g;
function splitMeta(text) {
  const prot = text.replace(ABBR, '$1\u2024');
  const parts = prot.split(/(?<=[.!?][”"’)]?)\s+(?=[A-Z“"(\[])/).map((x) => x.replace(/\u2024/g, '.'));
  const keep = [], meta = [];
  for (const x of parts) { if (TRIVIAL.test(x.trim())) continue; (META.some((re) => re.test(x)) ? meta : keep).push(x); }
  return { keep: keep.join(' ').trim(), meta: meta.join(' ').trim() };
}

const slug = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

const topicsRaw = sections.filter((s) => s.kind === 'TOPIC');
if (topicsRaw.length !== cfg.topics.length) throw new Error(`${id}: handoff has ${topicsRaw.length} topics, config has ${cfg.topics.length}`);
const warn = [];
const topics = topicsRaw.map((sec, ti) => {
  const tc = cfg.topics[ti];
  const ct = cleanTitle(sec.title);
  // split topic body by label
  const parts = [];
  let p = null;
  for (const l of sec.body) {
    const m = LABELS.exec(l);
    if (m) { p = { label: m[1].replace(/ \(.*\)$/, ''), first: m[2], body: [] }; parts.push(p); continue; }
    if (p) p.body.push(l);
  }
  const blocks = [], metaNotes = [];
  for (const part of parts) {
    const its = items(part.first ? [part.first, ...part.body] : part.body).filter((x) => !(x.t === 'item' && (cfg.drop || []).some((re) => re.test(x.text))));
    if (part.label === 'NOTES') {
      let run = [];
      const flush = () => { if (run.length) blocks.push({ type: 'notes', items: run }); run = []; };
      for (const x of its) {
        if (x.t === 'table') { flush(); blocks.push(mdTable(x.rows)); continue; }
        const sm = splitMeta(x.text + (x.extra.length ? ' ' + x.extra.join(' ') : ''));
        if (sm.meta) metaNotes.push(inline(sm.meta));
        if (sm.keep) run.push(inline(sm.keep));
      }
      flush();
    } else if (part.label === 'KEY TERMS') {
      const terms = its.filter((x) => x.t === 'item').map((x) => {
        const i = x.text.indexOf(' = ');
        if (i < 0) { warn.push(`${ti}: term without "=": ${x.text.slice(0, 60)}`); return [plain(x.text), '']; }
        return [plain(x.text.slice(0, i)), inline(x.text.slice(i + 3))];
      });
      if (terms.length) blocks.push({ type: 'terms', title: 'Key terms', items: terms });
    } else if (part.label === 'FORMULAS / RULES') {
      const r = its.filter((x) => x.t === 'item').map((x) => inline(x.text));
      if (r.length) blocks.push({ type: 'rules', items: r });
      its.filter((x) => x.t === 'table').forEach((x) => blocks.push(mdTable(x.rows)));
    } else if (part.label === 'WORKED EXAMPLE') {
      for (const x of its) {
        if (x.t === 'table') { blocks.push(mdTable(x.rows)); continue; }
        const m = /^Question:\s*(.*?)\s*\|\s*Steps:\s*(.*?)\s*\|\s*Answer:\s*(.*)$/s.exec(x.text);
        if (!m) { const sm = splitMeta(x.text); if (sm.meta) metaNotes.push(inline(sm.meta)); if (sm.keep) blocks.push({ type: 'callout', tone: 'note', icon: 'fa-circle-info', html: inline(sm.keep) }); continue; }
        const am = splitMeta(m[3] || ''); if (am.meta) metaNotes.push(inline(am.meta)); m[3] = am.keep;
        const qm = splitMeta(m[1]); if (qm.meta) metaNotes.push(inline(qm.meta)); m[1] = qm.keep;
        const steps = m[2].split(/;\s+(?![^()]*\))/).map((s) => s.trim()).filter(Boolean).map((s) => (/^[a-z]/.test(s) && !/^[a-z]\b|^(?:x|y|n|m|a|b)\s*[=+−-]/.test(s) ? s[0].toUpperCase() + s.slice(1) : s)).map(inline);
        const b = { type: 'worked', q: inline(m[1]), steps, answer: inline(m[3] || 'See the model answer below.') };
        if (x.extra.length) b.model = x.extra.map((l) => inline(l)).join('\n');
        if (!m[3] && !x.extra.length) warn.push(`${ti}: worked example without answer`);
        blocks.push(b);
      }
    } else if (part.label === 'DIAGRAM') {
      const txt = [part.first, ...part.body.filter((l) => l.trim())].join(' ').trim();
      const lm = /^(.*?)\bLabels:\s*([^.]*(?:\.\d[^.]*)*)\.?\s*$/s.exec(txt);
      if (lm && !/[.;]\s+[A-Z]/.test(lm[2])) blocks.push({ type: 'diagram', html: inline(lm[1].trim()), labels: lm[2].split(/,\s+(?![^()]*\))/).map((s) => plain(s.replace(/^and\s+/, '').trim())).filter(Boolean) });
      else blocks.push({ type: 'diagram', html: inline(txt) });
    } else if (part.label === 'COMPARE') {
      for (const x of its) {
        if (x.t === 'table') blocks.push(mdTable(x.rows, 'Compare'));
        else if (x.text) blocks.push({ type: 'callout', tone: 'info', icon: 'fa-scale-balanced', title: 'Compare', html: inline(x.text) });
      }
    }
  }
  for (const c of tc.carry || []) blocks.splice(c.at == null ? blocks.length : c.at, 0, c.block);
  if (metaNotes.length) blocks.push({ type: 'sources', items: metaNotes });
  const title = tc.title || ct.title;
  return { id: tc.id || slug(tc.nav), title, nav: tc.nav, icon: tc.icon, badge: ct.badge || undefined, unconfirmed: ct.unconfirmed || undefined, blocks };
});

/* ---------- quiz ---------- */
const quizSec = sections.find((s) => s.kind === 'QUIZ');
const quiz = [];
{
  let ctx = null, ctxRange = null, q = null;
  const body = quizSec.body;
  for (let i = 0; i < body.length; i++) {
    const l = body[i].trim();
    if (!l) continue;
    let m;
    if ((m = /^Q:\s*(?:(\d+)\.\s*)?(.*)$/.exec(l))) { q = { n: +m[1] || quiz.length + 1, q: m[2], opts: '' }; continue; }
    if (q && /^A\)/.test(l) && !q.opts) { q.opts = l; continue; }
    if (q && q.opts && !/^ANSWER:/.test(l)) { q.opts += ' ' + l; continue; }
    if (q && (m = /^ANSWER:\s*([A-D])\s*—\s*WHY:\s*(.*)$/.exec(l))) {
      const letters = ['A', 'B', 'C', 'D'];
      const pos = []; let from = 0;
      for (const L of letters) { const re = new RegExp((L === 'A' ? '^' : '\\s') + L + '\\)\\s'); const mm = re.exec(q.opts.slice(from)); if (!mm) break; pos.push(from + mm.index + (L === 'A' ? 0 : 1)); from = from + mm.index + 2; }
      if (pos.length !== 4) { warn.push('quiz ' + q.n + ': could not split options'); q = null; continue; }
      const options = pos.map((p0, k) => q.opts.slice(p0 + 2, k < 3 ? pos[k + 1] : undefined).trim()).map(inline);
      const item = { q: inline(q.q), options, answer: letters.indexOf(m[1]), why: inline(m[2]) };
      if (ctx && ctxRange && q.n >= ctxRange[0] && q.n <= ctxRange[1]) item.ctx = ctx;
      quiz.push(item); q = null; continue;
    }
    if (!q) {
      const r = /Questions?\s+(\d+)\s*[–-]\s*(\d+)/i.exec(l);
      if (r) { ctxRange = [+r[1], +r[2]]; ctx = ''; continue; }
      if (ctxRange && ctx === '') { ctx = inline(l.replace(/^[“"]|[”"]$/g, '')); continue; }
    }
  }
}

/* ---------- flashcards ---------- */
const cards = (sections.find((s) => s.kind === 'FLASHCARDS') || { body: [] }).body
  .map((l) => l.trim()).filter((l) => l.includes(' | ') && !/^\|/.test(l))
  .map((l) => { const i = l.indexOf(' | '); return [plain(l.slice(0, i)), plain(l.slice(i + 3))]; });
// file each card under the unit of the topic it overlaps most
const words = (s) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length > 3));
const topicWords = topics.map((t) => { const w = words(t.title + ' ' + t.nav); const all = words(JSON.stringify(t.blocks).replace(/<[^>]+>/g, ' ')); return { w, all }; });
const unitOf = (ti) => (cfg.units.find((u) => u.topics.includes(ti)) || {}).name || '';
const flashcards = cards.map(([f, b]) => {
  const cw = words(f + ' ' + b);
  let best = -1, bi = 0;
  topicWords.forEach((tw, ti) => { let s = 0; cw.forEach((w) => { if (tw.w.has(w)) s += 3; else if (tw.all.has(w)) s += 1; }); if (s > best) { best = s; bi = ti; } });
  return [f, b, unitOf(bi)];
});

/* ---------- tricky bits + references ---------- */
const trickySec = sections.find((s) => s.kind === 'TRICKY BITS');
const tricky = [];
if (trickySec) {
  items(trickySec.body).forEach((x, i) => {
    if (x.t === 'table') { tricky.push({ table: mdTable(x.rows.map((r, k) => (k === 0 && cfg.trickyTableHead ? cfg.trickyTableHead : r))) }); return; }
    if ((cfg.trickyDrop || []).some((re) => re.test(x.text))) return;
    let t = x.text;
    for (const [re, to] of cfg.trickyEdit || []) t = t.replace(re, to);
    t = splitMeta(t).keep;
    if (t.trim()) tricky.push(inline(t));
  });
}
const refs = [];
const seen = new Set();
for (const m of raw.slice(raw.indexOf('===== SUBJECT')).matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g)) {
  if (PRIVATE_LINK.test(m[2]) || seen.has(m[2])) continue;
  seen.add(m[2]);
  let host = '';
  try { host = new URL(m[2]).hostname.replace(/^www\./, ''); } catch (e) { continue; }
  refs.push([plain(m[1]), m[2], host]);
}

/* ---------- order topics by unit ---------- */
const order = cfg.units.flatMap((u) => u.topics);
if (order.length !== topics.length || new Set(order).size !== topics.length) throw new Error(id + ': units must list every topic once');
const units = cfg.units.map((u) => ({ name: u.name, icon: u.icon, topics: u.topics.map((i) => topics[i].id) }));
const ids = new Set();
topics.forEach((t) => { if (ids.has(t.id)) throw new Error('duplicate topic id ' + t.id); ids.add(t.id); });

const subject = {
  id: cfg.id, name: cfg.name, short: cfg.short, grade: cfg.grade, icon: cfg.icon, color: cfg.color,
  tagline: cfg.tagline, intro: cfg.intro, source: cfg.source,
  ...(cfg.extra || {}),
  units, topics: order.map((i) => topics[i]), quiz, flashcards, tricky, refs
};
const out = `/* ExamForge content — Grade ${cfg.grade} ${cfg.name}.
   Generated by tools/handoff/convert.mjs from the student's study-archive handoff (${new Date().toISOString().slice(0, 10)}).
   Edit tools/handoff/subjects.mjs (names, icons, units) and re-run rather than editing by hand. */
window.EF = window.EF || {};
EF.subjects = EF.subjects || [];
EF.subjects.push(${JSON.stringify(subject, null, 1)});
`;
const dest = path.join(ROOT, 'assets/js/content', cfg.file);
fs.writeFileSync(dest, out);
const nBlocks = subject.topics.reduce((n, t) => n + t.blocks.length, 0);
console.log(`${id}: ${subject.topics.length} topics, ${nBlocks} blocks, ${quiz.length} quiz, ${flashcards.length} cards, ${tricky.length} tricky, ${refs.length} refs → ${path.relative(ROOT, dest)} (${(out.length / 1024).toFixed(0)} KB)`);
if (warn.length) console.log('  warnings:\n  - ' + warn.join('\n  - '));
