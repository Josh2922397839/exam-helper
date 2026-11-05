# ExamForge

Grade 9 exam prep for Religious Education, French, Chemistry, Biology, PE, Business and History — notes, 3D models, spaced-repetition flashcards and quizzes that explain every answer.

It's a plain static site: no build step, no installs. Open `index.html` in a browser, or deploy the folder to Vercel as-is.

## Editing the notes

Every subject lives in its own file in `assets/js/content/`:

| File | Subject |
| --- | --- |
| `religion.js` | Religious Education |
| `french.js` | French (vocab, verbs and numbers are generated from the lists at the top) |
| `chemistry.js` | Chemistry (the 20 elements for the 3D viewer are at the top) |
| `biology.js` | Biology |
| `pe.js` | Physical Education (bone names must match the 3D skeleton) |
| `business.js` | Business Basics |
| `history.js` | History |

Each subject has:

- `topics` — the sections of notes. Each topic is a list of `blocks` (text, cards, timelines, tables, callouts…). Copy an existing block and change the words.
- `quiz` — questions. `answer` is the position of the right option, counting from 0. `why` is the explanation shown after answering.
- `flashcards` — `[front, back]` pairs (an optional third item is the category).

Search, progress tracking and the sidebar all update automatically.

## How it's built

- `index.html` — the page shell
- `assets/css/app.css` — the design system (colours, light/dark themes, layout)
- `assets/js/core/` — the engine: routing, page rendering, quiz runner, flashcards and widgets
- `assets/js/core/three-scenes.js` — the shared 3D stage (smooth drag, zoom, focus) and the atom viewer
- `assets/js/core/skeleton.js` — the anatomical 3D skeleton. Each bone is built on real landmarks and merged into one mesh per bone, so the whole body is about 24 draw calls. Bone names must match the list in `pe.js`. Three.js only loads when you open a 3D section
- `sw.js` + `manifest.webmanifest` — make the site installable and work offline. **When you change files, bump `VERSION` in `sw.js`** so phones pick up the new version

Progress (streak, quiz scores, flashcard levels, topics read) is saved in the browser with `localStorage`, so it stays on the device you study on.

Keyboard shortcuts: `/` search · `D` dark/light · `1`–`4` answer a quiz question · `space` flip a flashcard · `?` show them all. On phones, flashcards can be swiped (right = got it, left = again).
