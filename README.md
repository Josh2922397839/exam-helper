# ExamForge

Grade 9 and Grade 10 exam prep: study guides, worked examples, interactive tools, Learn mode, Match, spaced-repetition flashcards, quizzes that explain every answer, and study sets you can make yourself and share with friends.

It's a plain static site: no build step, no installs, no accounts. Open `index.html` in a browser, or deploy the folder to Vercel as-is. Everyone's progress is saved in their own browser, so any number of people can use it at once.

## Study modes

Every subject (and every set a student makes) is a **study set** with:

- **Study guide**: the full notes, worked examples that reveal one step at a time, and interactive tools
- **Learn**: multiple choice, then type the answer, with 3 lives per round; a card is learned once it's right in both rounds
- **Flashcards**: Leitner boxes with review dates, so cards come back just before you'd forget them
- **Match**: pair terms and answers against the clock; best times are saved
- **Test**: the quiz, with explanations; wrong answers are saved for "Fix my mistakes"

Studying earns **XP** (quiz answers, cards, topics, Learn, Match). Today's XP fills the daily-goal ring next to the streak, and total XP sets your level.

### Make and share sets

`#/make` turns pasted notes into a set (one card per line: `term - meaning`, `term: meaning`, a tab, or `Q:` / `A:` lines). **Share** puts the whole set, compressed, inside the link (`#/import/…`), so a friend can open it and add it to their own sets with no server or account. Everything typed into a set is shown as plain text, never as HTML.

## Leagues, schools and cloud saves (optional)

With a free Supabase database connected (see [`docs/cloud-setup.md`](docs/cloud-setup.md)), students can:

- **Join with a nickname and their school.** There's no email or password; each device gets a private guest account.
- **Find any school:** first from ExamForge's own list, then from **OpenStreetMap** (searched from the student's browser, so schools all over the world work), or by adding it by hand.
- **Compete in 9 weekly leagues** (Spark → Supernova). Every Monday the top 20% move up and the bottom 20% move down. There are also leaderboards for **my school**, **all schools** and **friends** (add by username).
- **Share sets with their school's library**: the most-saved sets rise to the top, and anyone can add them to their own sets.
- **Back up automatically and move to a new phone** with a one-time transfer code.

All database access goes through the checked `ef_*` functions in [`supabase/schema.sql`](supabase/schema.sql). Tables have row-level security with no direct access, XP is capped (400 per update, 5,000 per day), and names, schools and sets from other students are always shown as plain text. Without keys in `assets/js/config.js`, the site runs fully offline and the league pages say "coming soon".

## Editing the notes

Every subject lives in its own file in `assets/js/content/`:

| File | Subject | Grade |
| --- | --- | --- |
| `religion.js` | Religious Education | 9 |
| `french.js` | French (vocab, verbs and numbers are generated from the lists at the top) | 9 |
| `chemistry.js` | Chemistry (the 20 elements for the 3D viewer are at the top) | 9 |
| `biology.js` | Biology | 9 |
| `pe.js` | Physical Education (bone names must match the 3D skeleton) | 9 |
| `business.js` | Business Basics | 9 |
| `history.js` | History | 9 |
| `g10-english.js` | English Language | 10 |
| `g10-math.js` | Mathematics | 10 |
| `g10-physics.js` | Physics | 10 |
| `g10-hsb.js` | Human & Social Biology | 10 |
| `g10-it.js` | Information Technology (the mini-spreadsheet's data is at the top) | 10 |
| `g10-geography.js` | Geography | 10 |
| `g10-social.js` | Social Studies | 10 |
| `g10-pob.js` | Principles of Business | 10 |

Each subject has:

- `grade`: which grade it belongs to. The grade switch, sidebar groups and per-grade exam mode (`#/quiz/exam10`) appear automatically.
- `topics`: the sections of notes. Each topic is a list of `blocks` (text, cards, timelines, tables, callouts, `formulas`, `worked` examples, `gizmo` lab / practical write-ups, `widget` tools…). Copy an existing block and change the words.
- `quiz`: questions. `answer` is the position of the right option, counting from 0. `why` is the explanation shown after answering.
- `flashcards`: `[front, back]` pairs (an optional third item is the category). These power Learn, Match and Flashcards.

To add a subject, create a new file, add a `<script>` tag for it in `index.html` (after the other content files) and add it to `SHELL` in `sw.js`. Search, progress, the sidebar and every study mode pick it up automatically.

`docs/chatgpt-content-prompt.md` is the prompt used to collect study material from other apps.

## How it's built

- `index.html`: the page shell
- `assets/css/app.css`: the design system (colours, light/dark themes, layout, spring motion tokens)
- `assets/js/core/ui.js`: helpers, subject icons, the progress store (streak, XP, levels, review dates)
- `assets/js/core/app.js`: routing and page rendering
- `assets/js/core/study.js`: quiz runner and flashcards
- `assets/js/core/learn.js`: Learn, Match, make / share sets, the XP ring
- `assets/js/core/cloud.js` + `assets/js/config.js`: leagues, schools, friends, cloud saves and school libraries (Supabase; loads only when switched on)
- `supabase/schema.sql`: the database (tables, security rules and the `ef_*` functions); run it in the Supabase SQL editor
- `assets/js/core/widgets.js`: interactive tools (French drills, atom, skeleton, cell cycle, cash book, Vernier caliper, moments see-saw, grid method, mini-spreadsheet)
- `assets/js/core/interactive.js` + `assets/js/labs/<subject>.js`: the Interactive tab. Each subject's file lists its hands-on tools: **sort it**, **put in order**, **label it** (a drawing with numbered spots) and **simulators** (sliders and choices, a live drawing and a goal). The format of each kind is explained at the top of `interactive.js`. To add a tool, copy one from the same subject's file and change the words; a new subject's file also needs a `<script>` tag in `index.html` and a line in `SHELL` in `sw.js`
- `assets/js/core/motion.js`: Apple-style motion (springs, sliding selection, card tilt, draggable drawer, scroll reveals); all of it turns off with Reduce Motion
- `assets/js/core/three-scenes.js` + `skeleton.js`: the 3D stage, atom viewer and anatomical skeleton. Three.js only loads when you open a 3D section
- `sw.js` + `manifest.webmanifest`: make the site installable and work offline. **When you change files, bump `VERSION` in `sw.js`** so phones pick up the new version

Keyboard shortcuts: `/` search · `D` dark/light · `1`–`4` answer a quiz or Learn question · `space` flip a flashcard · `?` show them all. On phones, flashcards can be swiped (right = got it, left = again) and the menu drawer can be dragged closed.
