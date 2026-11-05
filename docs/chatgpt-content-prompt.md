# Prompt for gathering study material with ChatGPT

Paste this into ChatGPT (with memory / chat history turned on), upload any Thea study sets and Gizmo Student Exploration Sheets, then say "go" and "next" for each subject. Bring the results back and they can be added to `assets/js/content/` as new subjects (with `grade: 10`). Gizmos become `type: 'gizmo'` blocks.

```text
I'm building a revision website for my exams and I need ALL of my study material gathered in one place. Act as my study archivist.

SOURCES — use all of these:
1. Everything in our past chats (use your memory and chat history) where I studied, asked homework questions, made notes, flashcards or quizzes.
2. Any files, screenshots or text I paste or upload in this chat — especially my Thea study material (study guides, flashcards, practice tests) and my ExploreLearning Gizmos (Student Exploration Sheets, Gizmo assessment questions and my answers).

Grade 9 subjects ALREADY on my site (only include Grade 9 material if it is NOT one of these): Religious Education (world religions, Genesis 25–33), French (vocab, verbs, numbers, ordering food), Chemistry (atoms 1–20, ions, ionic bonding, formulas), Biology (reproduction, cell division, menstrual cycle, STDs), PE (skeleton, muscles, drugs in sport, WADA), Business (order form, invoice, receipt, cash book, org structures), History (Haitian Revolution).

RULES
- Do not make anything up. Only include what is in my material, or a standard correct fact for that topic. If you are not sure something is right, write [CHECK] after it.
- Keep the exact wording my teachers used for definitions, formulas and names.
- Write so a Grade 10 student understands it.
- If I got a Gizmo or quiz answer wrong, give the correct answer and add "(I got this wrong)".
- Do not skip anything that could be on an exam.

STEP 1 — INVENTORY. List every subject, every topic in it, every Gizmo (exact name) and every Thea set you can find, with the grade (9 or 10) and where you found it. Then stop and wait for me to say "go".

STEP 2 — When I say "go", write ONE subject per message using EXACTLY this template. When a subject is finished, stop and wait for me to say "next".

===== SUBJECT: [name] | GRADE: [10] | EXAM DATE: [if known] =====
OVERVIEW: [2–3 sentences on what this exam covers]

--- TOPIC: [title] ---
NOTES:
- [every key point, one per line]
KEY TERMS:
- [term] = [meaning]
FORMULAS / RULES:
- [formula] — [what each letter means, with units]
WORKED EXAMPLE:
- Question: … | Steps: … | Answer: …
DIAGRAM: [describe it and list every label]
TIMELINE (history only):
- [date] — [event] — [why it matters]
COMPARE (if useful): [A vs B as a table]
(repeat for every topic)

--- GIZMO: [exact Gizmo name] ---
TOPIC IT COVERS:
QUESTION / GOAL:
VARIABLES: independent = … | dependent = … | controlled = …
WHAT I DID: 1. … 2. … 3. …
DATA / RESULTS: [table]
WHAT IT SHOWS: [conclusion]
VOCABULARY: [term] = [meaning]
ASSESSMENT QUESTIONS: [question] → [correct answer] — [why]
(repeat for every Gizmo)

--- QUIZ (at least 12 questions) ---
Q: …
A) … B) … C) … D) …
ANSWER: [letter] — WHY: [one sentence]

--- FLASHCARDS (at least 20) ---
[front] | [back]

--- TRICKY BITS ---
- [common mistakes, things I found hard, tips my teacher gave]

--- SOURCES ---
- [which chats / Thea sets / Gizmos this came from]
```
