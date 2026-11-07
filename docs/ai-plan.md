# Adding AI to Zing: how Gizmo does it, and the plan

> **Update, 7 November 2026: Zing AI is live.** Magic import uses **Gemma 4 on Cloudflare Workers AI** through the `zing-ai` Supabase Edge Function (free daily allowance, no card on file), not the Claude API this plan first suggested. See **Zing AI** in the [README](../README.md#zing-ai) for how it works, who can use it and the limits. The rest of this page is the original research and plan.

## The short version

- **Gizmo's AI does three main jobs.** It turns your notes into cards, it writes believable wrong answers for multiple choice, and it explains answers when you're stuck. It also has an AI tutor and marks written answers in practice tests.
- **Zing is already set up for this.** Every subject is now a deck of cards, and each card has a question, an answer, three wrong answers, a "why" and a topic. That is exactly the shape an AI would hand back.
- **The one rule that matters:** the AI key must **never** go in the website's code, because anyone could copy it and spend your money. It goes in a small server function on Supabase, which you already use.
- **What you'll need when you're ready:** an Anthropic API key (from console.anthropic.com, which needs a card on file) and about an hour to set up the server function. Steps are at the bottom.

## How Gizmo does it

These points come from Gizmo's own help centre unless marked otherwise.

**1. Making cards from your stuff ("Magic Import").** You open a deck and choose Add, then Magic Import. Gizmo accepts PDFs, recordings (it transcribes them), pasted notes, photos, PowerPoint, Quizlet, Anki, spreadsheets and website links. Before it generates anything you can:

- pick pages
- set how many cards you want
- give the AI instructions
- choose to keep the source's exact wording

Gizmo tells you to check the new cards afterwards, and to split big documents into smaller parts. ([Magic Import](https://help.gizmo.ai/en/articles/15647624-what-is-magic-import), [customising it](https://help.gizmo.ai/en/articles/15654559-how-do-i-customise-my-magic-import))

**2. Card types.** Gizmo supports seven:

- question/answer
- several correct answers
- fill the blank
- put in order
- matching
- true/false
- labelled pictures

The AI can generate every type except picture cards. ([card formats](https://help.gizmo.ai/en/articles/16527223-what-types-of-flashcards-can-i-make))

**3. Wrong answers and help.** Multiple choice always has four options, and the wrong ones are written by the AI. When you're stuck you get three kinds of help:

- **Hint:** shows the first letter, or crosses out a wrong option
- **Reveal:** shows the answer
- **Explain:** gives an explanation

([Memorise](https://help.gizmo.ai/en/articles/13906596-how-does-memorise-mode-work), [hints](https://help.gizmo.ai/en/articles/15504721-what-are-hints), [when you're stuck](https://help.gizmo.ai/en/articles/15935639-what-happens-if-i-m-stuck-or-get-a-question-wrong-in-memorise-mode))

**4. AI tutor and practice tests.** The tutor builds lessons, notes and quizzes from a deck or a topic. Practice tests mix choice questions with **written answers that the AI marks against a mark scheme**. Any reviewed answer can become a flashcard. ([AI tutor](https://help.gizmo.ai/en/articles/13011417-how-does-the-ai-tutor-work), [practice tests](https://help.gizmo.ai/en/articles/16310632-what-happens-during-a-practice-test))

**5. Which AI does Gizmo use?** Gizmo does not say publicly. Reviews only describe the AI reading your material and making question-and-answer pairs ([TechCrunch](https://techcrunch.com/2023/09/21/ai-startup-gizmo-funding-gamified-quizzes-flashcards-make-learning-fun/), [Save My Exams review](https://www.savemyexams.com/learning-hub/useful-resources/best-ai-flashcard-generator/)). Any claim about the exact model would be a guess.

## What Zing already has ready

- **One card format everywhere.** Look at `assets/js/core/deck.js`: `EF.cardsIn()` accepts plain card objects `{ q, a, wrong: [3], why, tag }`. Those cards appear in:
  - the flip-card deck view
  - Flashcards (with the "why" on the back)
  - Learn, Match, Fill the gap, Speed run and Test
  - Live games
- **Decks per subject.** `assets/js/decks/<subject>.js` holds the extra cards. Saved sets (`EF.sets`) hold students' own cards.
- **Accounts.** Supabase sign-in gives every student a user id. The AI function can use it to set limits per student.

## The plan

### 1. Keep the key secret: one Supabase Edge Function

```
student's browser ──(their sign-in token)──▶ Supabase Edge Function "ai" ──(secret key)──▶ Claude API
                    ◀── checked cards / explanation ──┘
```

- The function keeps the API key as a Supabase secret (`ANTHROPIC_API_KEY`), never in `assets/js`.
- It only answers students who are signed in, and checks a daily limit (for example, 10 card generations and 50 explanations a day) using a small table and an `ef_*` function, like the rest of the database.
- It checks every card before sending it back:
  - exactly 3 wrong answers
  - none of them equal to the answer
  - no HTML
  - sensible lengths
- Students' text is still escaped when shown, the same as now.

### 2. Feature A: "Make cards with AI" (like Magic Import)

On the **Make a set** page, add an AI button next to "paste your notes".

1. The student pastes notes (or picks a subject topic) and chooses how many cards (10–30).
2. The function asks Claude for cards as JSON in the deck format, using a fixed schema (structured outputs). It always comes back in the right shape.
3. **Review step (Gizmo does this too).** The cards appear in the existing editor. The student can fix or delete any card before saving. Nothing is saved without a human looking at it.
4. The saved set works in every mode straight away, Live games included.

Rules for the prompt:

- One fact per card.
- Use only facts found in the notes. Never invent dates, names or numbers.
- Wrong answers must be the same kind of thing as the answer, believable, and **about the same length**. When this repo's 582 cards were written, the right answer was often the longest option, which gives it away. That was fixed by hand, and the AI should avoid it from the start.
- Keep the "why" to one short sentence that teaches.
- Use Grade 9–10 Jamaican/CSEC wording.

### 3. Feature B: "Explain this" (like Gizmo's Explain)

In Test, Learn and Live results, a wrong answer gets an **Explain** button.

- The function sends the card, the answer the student picked and the right answer. Claude replies with 2–4 friendly sentences: why the right answer is right, and why the picked one is wrong.
- Explanations are saved by card, so the second student to ask gets it instantly and for free.
- Cards that already have a "why" show that first. The AI is only needed for "explain more".

### 4. Later

- **Mark written answers** against a mark scheme, like Gizmo's practice tests (good for CSEC-style questions).
- **AI tutor:** a short chat about one topic, using that subject's notes and cards as its source.
- **Make cards from a photo of notes:** Claude can read images.

### 5. Limits, costs and safety

- **Model.** Use Claude Opus 5.5 (`claude-opus-5-5`, $4 per million input tokens and $20 per million output tokens).
  - Rough cost: making 20 cards from a page of notes is about $0.05–0.10. One explanation is about $0.01, or close to free when it's already saved.
  - If explanations get very popular, the much cheaper Claude Haiku 5.5 ($0.10 / $0.50 per million tokens) is an option, but that's your choice to make.
- **Limits per student per day** keep costs predictable. Set a monthly spend limit in the Anthropic console too.
- **Students are under 18.** Read Anthropic's usage policy on apps used by minors before launching, and add what it asks for. Show a note that AI cards can contain mistakes. Never send names, emails or school details to the AI, only the study text.
- **Refusals.** The function should check `stop_reason` before reading the reply, and turn on the server-side `fallbacks` option (see the sketch). That way a wrongly blocked request is retried on another model instead of failing.

### 6. Code sketch for the function

This is a starting point for `supabase/functions/ai/index.ts` (Deno). It uses the official Anthropic TypeScript SDK. Check the SDK docs when building it, and test it before going live.

```ts
import Anthropic from "npm:@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

const CARDS_SCHEMA = {
  type: "object",
  properties: {
    cards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          q: { type: "string" },
          a: { type: "string" },
          wrong: { type: "array", items: { type: "string" } },
          why: { type: "string" },
          tag: { type: "string" },
        },
        required: ["q", "a", "wrong", "why", "tag"],
        additionalProperties: false,
      },
    },
  },
  required: ["cards"],
  additionalProperties: false,
};

async function makeCards(notes: string, count: number) {
  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default", // a declined request is retried on another model
    output_config: { effort: "medium", format: { type: "json_schema", schema: CARDS_SCHEMA } },
    system:
      "You write study flashcards for Grade 9-10 students in Jamaica (CSEC level). " +
      "Use only facts found in the notes. One fact per card. Each card has exactly 3 wrong answers: " +
      "the same kind of thing as the answer, believable, and about the same length. " +
      "'why' is one short sentence that teaches. 'tag' is the topic.",
    messages: [{ role: "user", content: `Make ${count} cards from these notes:\n\n${notes}` }],
  });
  if (response.stop_reason === "refusal") throw new Error("The AI could not make cards from these notes.");
  const block = response.content.find((b) => b.type === "text");
  const { cards } = JSON.parse(block && block.type === "text" ? block.text : "{}");
  // Check every card here (3 wrong answers, none equal to the answer, lengths) before returning it.
  return cards;
}
```

### 7. Steps when you're ready

1. Create an Anthropic account at console.anthropic.com, add a payment method, set a monthly limit and create an API key.
2. In Supabase, save the key as a secret named `ANTHROPIC_API_KEY`. Never paste it in chat or in the code.
3. Build and deploy the `ai` Edge Function, then add the daily-limit table and function.
4. Add the **Make cards with AI** button and the **Explain** button to the site, behind a switch in `assets/js/config.js` so they only show once the function is live.
5. Test with a few real pages of notes, check the cards by hand, then turn it on for everyone.
