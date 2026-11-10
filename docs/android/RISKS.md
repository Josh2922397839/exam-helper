# Zing for Android: risk register

What could go wrong, what already guards against it, and what is still open. "Open" items are the honest list of
what this pull request does not solve.

| # | Area | Risk | Guard in place | Still open |
| --- | --- | --- | --- | --- |
| 1 | Sign-in | Google sign-in fails on real devices (wrong client ID or fingerprint) | Hidden until the web client ID is set; clear messages; hashed nonce; tests cover the token exchange | **Never run on a device.** Needs the three Android OAuth clients (CONFIGURATION.md §2) and a test on the Play-signed build |
| 2 | Sign-in | Connecting Google to a guest account relies on Supabase's `link_identity` for ID tokens | Falls back to a clear "belongs to another account" message; never replaces a profile silently | Confirm on a test project that the hosted Auth version accepts it |
| 3 | Sign-in | Email code not in the email | The link in the same email also works | Add `{{ .Token }}` to the template; set up SMTP (CONFIGURATION.md §3) |
| 4 | Sign-in | Session stolen from a backup or another app | Tokens sealed with an Android Keystore key, excluded from backups, never logged | None known |
| 5 | Sync | The website pushes its whole save without pulling, so it can overwrite the cloud copy of an Android edit | Android merges before every push, keeps tombstones, and turns real clashes into a conflict the student resolves; each device keeps its own data | The website would need the same merge-before-push to close this fully |
| 6 | Sync | Long notes are not fully backed up (150,000 characters in total, the website's rule) | Android follows the same rule and labels those notes "only on this device" | Row-level note storage used by both apps (a follow-up; needs a web change) |
| 7 | Sync | XP counted twice after a lost reply | `ef_add_xp2` with operation IDs (in the migration); the queue re-sends the same batch with the same ID | Until the migration is applied the app uses the website's own call, which has this weakness |
| 8 | Migration | A changed function breaks the website | Only five functions change, each identical when nobody is blocked and no new rows exist; tested on PostgreSQL 16 with rollback and re-apply | Apply on a test project first; the test stands in for Supabase with a minimal `auth` schema |
| 9 | AI safety | The model invents an answer | Every citation must quote the note word for word (checked on the server and again in the app); answers that mostly use words not in the notes are dropped; "not in your notes" is shown instead | The check proves the quotes are real, not that the summary is perfect; the screen says AI can be wrong and has a Report button |
| 10 | AI safety | Notes contain instructions aimed at the model | Notes are wrapped as data, wrapper tags and hidden characters are stripped, the prompt says to ignore instructions in them, the output is JSON that is validated | A determined injection could still bias wording; it can't add uncited facts |
| 11 | AI safety | Younger students use AI | Server-side: 14+ by birth year, confirmed sign-in, no guests, daily limits per student and overall | Age is self-declared |
| 12 | AI safety | A student in distress types into search | First-person self-harm phrases get a supportive message pointing to a trusted adult, not an AI answer | The wording should be reviewed by an adult responsible for safeguarding; add a local helpline |
| 13 | Privacy | Personal details reach the AI provider | Only the chosen passages, with emails and phone numbers removed; no names, IDs or school; nothing stored by the function | Names written inside a student's own notes are still text in those notes |
| 14 | Privacy | Two students share a phone | Signing in as a different account wipes the previous student's local data first | A student who signs out and hands over the phone: their data stays until someone else signs in. Sign-out says so |
| 15 | Privacy | Target audience and children's privacy law | Under-13 limits enforced by the server | **Your decision** (PRIVACY_AND_DATA_SAFETY.md §3); no parental-consent flow exists |
| 16 | Billing | Plus granted without payment, or a purchase shared between accounts | Server verifies with Google; the purchase must carry this account's hash; one token can't serve two accounts; the app only reads the entitlement | **Never run against Google Play.** Needs licence testers (SUBSCRIPTIONS.md) |
| 17 | Billing | Paid but not delivered | Acknowledged only after the server has recorded it; unacknowledged purchases are retried at start and refunded by Google after 3 days | Test the "server down during purchase" case with a licence tester |
| 18 | Billing | Catalogue, prices and tax not decided | Nothing is gated; the paywall shows only what Play returns; test product ID by default | **Your decision** before anything is sold |
| 19 | Deletion | Sign-in record left behind | `delete-account` removes it; cascades clear anything tied to it | Until the function is deployed the app falls back to the website's deletion, which leaves the sign-in record |
| 20 | Deletion | Subscription keeps billing after deletion | The deletion page and Terms wording say to cancel in Google Play | Consider cancelling through the Play API on deletion (follow-up) |
| 21 | Moderation | Reports nobody reads | Reports land in one table with a "not handled" filter | **Decide who checks it and how often** |
| 22 | Moderation | Blocked students still appear on leaderboards | The app hides blocked students from its lists; the server stops follows, challenges and group adds | The website's boards don't filter blocks |
| 23 | School assets | A crest is used without permission | Crests come from the website's own folder with its `SOURCES.md`; schools without one get a generated shield | Same position as the website: review `SOURCES.md` before the store listing shows any crest |
| 24 | Accessibility | A screen is hard to use with TalkBack or large text | Labels on icon buttons, headings, live regions, 48dp targets from Material components, contrast checked for every theme and accent by tests, large-text screenshot | **No manual TalkBack pass has been done** (QA_MATRIX.md part B) |
| 25 | Performance | Slow start or jank on cheap phones | R8, small APK (5 MB), lists are lazy, search is indexed | Not measured on a device; no baseline profile yet |
| 26 | Platform | Target is API 36, compile is 37 | Meets Play's current rule | Moving the target to 37 needs a device test pass first |
| 27 | Rollout | A bad release reaches everyone | Internal → closed → staged production; the app tolerates a missing migration, so app and server can ship in either order | Play can't roll back a version: fix forward |
| 28 | Scope | Students expect everything from the website | The Me screen says what is web-only and links to it | **Not ported:** subject study guides, Live games, challenges, study groups, the Interactive tab, 3D, Learn/Match/Speed run/Fill-the-gap |
| 29 | App Links | Website links don't open the app | The email flow doesn't depend on it | Publish `/.well-known/assetlinks.json` (CONFIGURATION.md §4) |
| 30 | Website | The Android folder gets served by the website | `.vercelignore` excludes `android/` on Vercel | EdgeOne Pages: check its ignore setting, or accept that source files are downloadable (they contain no secrets) |
