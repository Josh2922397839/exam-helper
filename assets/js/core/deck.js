/* Zing core — card decks.
   Like Gizmo, every subject is one deck of cards: a question, its answer, and (optionally)
   three wrong answers for multiple choice plus a short "why" that explains the answer.

   Cards come from three places and are merged here, before anything else reads them:
     1. the subject's flashcards            [front, back, topic]
     2. its quiz questions                  { q, options, answer, why }
     3. its deck file in assets/js/decks/   EF.decks[id] = [{ tag, cards: [[q, a, [wrong, wrong, wrong], why], ...] }, ...]
        (a plain card object { q, a, wrong, why, tag } works too: that's the shape an AI will return later)

   After the merge:
     s.flashcards = every card that makes sense on its own, as [q, a, topic, wrong, why]
     s.quiz       = every multiple-choice question; new ones go on the end, so saved mistakes keep their place
   Flashcards, Learn, Match, Fill the gap, Speed run, Test and Live all read from these. */
(function () {
  'use strict';
  const EF = (window.EF = window.EF || {});
  EF.decks = EF.decks || {};

  const htmlEsc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const toText = (h) => String(h || '').replace(/<sub>(\d+)<\/sub>/g, (_, d) => d.replace(/\d/g, (n) => '₀₁₂₃₄₅₆₇₈₉'[n]))
    .replace(/<sup>(\d+)<\/sup>/g, (_, d) => d.replace(/\d/g, (n) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[n])).replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim();
  const key = (t) => toText(t).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  // answers like Na⁺ / Na⁻ or x > 4 / x < 4 differ only in symbols, so compare them with the symbols kept
  const same = (a, b) => toText(a).toLowerCase().replace(/\s+/g, ' ') === toText(b).toLowerCase().replace(/\s+/g, ' ');
  // quiz questions that only make sense next to their options stay quiz-only
  const NEEDS_OPTIONS = /\b(of the following|of these|which statement|which option|which one|which answer|(all|none|both) of the above|true or false|best describes|most likely)\b/i;
  const NEEDS_OPTIONS_CAPS = /\b(NOT|EXCEPT)\b/;

  /* turn whatever a deck file holds into plain card objects */
  function cardsIn(list) {
    const out = [];
    (list || []).forEach((item) => {
      if (Array.isArray(item)) out.push({ q: item[0], a: item[1], wrong: item[2], why: item[3], tag: item[4] });
      else if (item && Array.isArray(item.cards)) item.cards.forEach((c) => out.push(Array.isArray(c) ? { q: c[0], a: c[1], wrong: c[2], why: c[3], tag: item.tag } : Object.assign({ tag: item.tag }, c)));
      else if (item && item.q) out.push(item);
    });
    return out.map((c) => ({
      q: String(c.q || '').trim(), a: String(c.a || '').trim(), tag: String(c.tag || '').trim(), why: String(c.why || '').trim(),
      wrong: Array.isArray(c.wrong) ? c.wrong.map((w) => String(w).trim()).filter((w) => w && !same(w, c.a)) : []
    })).filter((c) => c.q && c.a);
  }
  EF.cardsIn = cardsIn;

  function merge(s) {
    if (s.custom || s._decked) return;
    s._decked = true;
    s.flashcards = s.flashcards || []; s.quiz = s.quiz || [];
    const fronts = new Set(s.flashcards.map((c) => key(c[0])));
    const asked = new Set(s.quiz.map((x) => key(x.q)));
    // 1. quiz questions become cards too (their other options are ready-made wrong answers)
    s.quiz.slice().forEach((x) => {
      const q = toText(x.q), a = toText(x.options[x.answer]);
      if (x.ctx || !a || a.length > 180 || NEEDS_OPTIONS.test(q) || NEEDS_OPTIONS_CAPS.test(q) || fronts.has(key(q))) return;
      fronts.add(key(q));
      // the last 'quiz' marks it as a copy, so Speed run and Live don't ask the same question twice
      s.flashcards.push([q, a, x.tag || '', x.options.filter((_, i) => i !== x.answer).map(toText), toText(x.why), 'quiz']);
    });
    // 2. the deck file's cards join the flashcards, and the ones with wrong answers join the quiz
    cardsIn(EF.decks[s.id]).forEach((c) => {
      const k = key(c.q);
      if (!fronts.has(k)) { fronts.add(k); s.flashcards.push([c.q, c.a, c.tag, c.wrong.length >= 3 ? c.wrong.slice(0, 3) : null, c.why]); }
      if (c.wrong.length >= 3 && !asked.has(k)) {
        asked.add(k);
        s.quiz.push({ q: htmlEsc(c.q), options: [c.a].concat(c.wrong.slice(0, 3)).map(htmlEsc), answer: 0, why: htmlEsc(c.why), tag: c.tag });
      }
    });
  }
  (EF.subjects || []).forEach(merge);

  /* a card's topics, in the order they first appear */
  EF.deckTags = (s) => Array.from(new Set((s.flashcards || []).map((c) => c[2]).filter(Boolean)));
})();
