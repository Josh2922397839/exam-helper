# Zing

Grade 9 and Grade 10 exam prep that you do with your friends: study guides, worked examples, interactive tools, Learn mode, Match, spaced-repetition flashcards, quizzes that explain every answer, study sets you make and share, Live games, challenges, study groups and school leaderboards. Your study buddy is **Zing, the Doctor Bird** (Jamaica's national bird).

It's a plain static site: no build step, no installs. Open `index.html` in a browser, or deploy the folder to Vercel as-is. Progress is saved in each person's browser (and backed up to their account when the online features are on), so any number of people can use it at once.

## Look and feel

Zing has its own look: cream paper, deep-green ink, emerald, coral and sun gold; **Bricolage Grotesque** for headings and **Figtree** for reading; chunky "key" buttons that press down; a deep-green sidebar and phone dock. The theme lives in `assets/css/zing.css` (loaded after the older layers), and the new screens are styled in `assets/css/social.css`. The mascot is drawn in SVG by `EF.mascot(mood)` in `assets/js/core/look.js` (moods: read, wave, cheer, sad, think, sleep) and animated in `skin.css` (wing flutters, tail sway, blinks).

## Sign-up and setup (mandatory)

Every new user goes through a short setup before using the app (`assets/js/core/onboard.js`): **Sign up / Sign in** (Google, email link, or "more options": Apple when it's switched on in Supabase, a guest account, or a transfer code) → age (with the Terms and Privacy note) → what brings you (school, university, work, other) → school year → school → friends and reminders (classmates on Zing, study reminders, friend finding) → first name → last name → follow classmates. It remembers where you got to, and a friend's invite link (`?ref=username`) gives you both 50 coins. If someone is offline on their very first visit they can study and finish setup later. Without Supabase keys the setup still runs (age, purpose, year, names) and is kept on the device.

Students **under 13** are never findable, never show their name, skip the follow step and can't use study groups.

## Friends, challenges and groups

- **Social** (`#/social`): a "You vs" rival card (your XP this week against a friend or classmate, with a refresh button and how many people are playing now), incoming **challenges** with a timer, your school's board (Week / Month / All time), study groups, suggested friends, an invite card, and **coins and power-ups** (a streak freeze, or Double XP for 15 minutes). Coins: 1 per 10 XP, 20 for each daily goal, 50 per friend who joins with your invite. They're kept on the device and have no money value.
- **Challenge a friend**: from a profile's **Play** button or the rival card. Pick a whole deck or one topic, and the friend gets an invite for 20 minutes (in their bell and as a pop-up). The Live lobby shows the code, QR, copy link, the invited friend (faded until they join), "Couldn't find a match… invite friends" after a while, and "Practice while you wait".
- **Study groups** (`#/groups`): group chats where messages are only emoji, ready-made phrases, cards from Zing decks (others answer them right in the chat) and Live game invites. No free typing, so nothing needs moderating.
- **The top bar**: Live, coins, streak, a notifications **bell** (challenges, new followers, group messages) and an avatar menu.
- **School pages** (`#/school/<id>`): Leaderboard and Decks tabs, with Week / Month / All time boards.
- **Settings** (`#/settings`): plan (Zing is free), invite friends, contact, help, sounds, music, haptics, dark mode, Do not disturb, study reminders, card reminder notifications, "decks are public", friend finding, font size, account information, sign-in and security, sign out, delete account, privacy policy and terms. **Help** is at `#/help`.

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

- **Make an account in the setup** with Google, an email link or as a guest (no email or password), and pick their school.
- **Find any school:** first from Zing's own list, then from **OpenStreetMap** (searched from the student's browser, so schools all over the world work), or by adding it by hand.
- **Compete in 9 weekly leagues** (Spark → Supernova). Every Monday the top 20% move up and the bottom 20% move down. There are also leaderboards for **my school**, **all schools** and **friends** (add by username).
- **Share sets with their school's library**: the most-saved sets rise to the top, and anyone can add them to their own sets.
- **Back up automatically and move to a new phone** with a one-time transfer code.

The v6 part of the schema adds the setup answers (stored privately; others only ever see a first name and last initial, and only for findable students aged 13+), XP per day for monthly boards, Live challenges, study groups and the Social page's functions. Email sign-in uses Supabase's email provider: Supabase's built-in mailer only delivers to the project's own team, so add a custom SMTP sender in Supabase (Authentication → Emails) before relying on email links for students. Rename the Google sign-in app to "Zing" in Google Cloud (OAuth consent screen) so the Google screen matches.

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
- `assets/js/core/cards.js`: Gizmo-style cards. Every deck shows as a list of cards (question, a dashed line, then the answer with its key words highlighted green; multiple-choice cards show ✓ and ✗ options) with search, topic chips and a Study deck button. It also highlights each topic's key terms in its notes, runs **Test me** on key-term cards, and adds a 3-question **Quick check** to the end of each topic (built from that topic's key terms, or the deck cards about it)
- `assets/js/core/onboard.js`: the sign-in screen and mandatory setup
- `assets/js/core/social.js`: preferences (sounds, music, haptics, font size), coins and power-ups, the bell and avatar menu, the Social page, "Start a Live with a friend" and the friend picker
- `assets/js/core/groups.js`: study groups, Settings and Help
- `assets/js/core/motion.js`: Apple-style motion (springs, sliding selection, card tilt, draggable drawer, scroll reveals); all of it turns off with Reduce Motion. Phones and tablets get calmer motion: a quick fade between pages instead of the page morph, no scroll reveals, and hover effects only for mouse users (`@media (hover: hover)`), so nothing stays highlighted after a tap
- `assets/js/core/three-scenes.js` + `skeleton.js`: the 3D stage, atom viewer and anatomical skeleton. Three.js only loads when you open a 3D section
- `sw.js` + `manifest.webmanifest`: make the site installable and work offline. **When you change files, bump `VERSION` in `sw.js`** so phones pick up the new version

Keyboard shortcuts: `/` search · `D` dark/light · `1`–`4` answer a quiz or Learn question · `space` flip a flashcard · `?` show them all. On phones, flashcards can be swiped (right = got it, left = again) and the menu drawer can be dragged closed.
