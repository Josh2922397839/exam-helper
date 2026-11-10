# Zing for Android: QA matrix

Part A is what was run for this pull request, with the real results. Part B is what **could not** be run here
(there is no phone or emulator on the build machine) and must be done by hand before release.

## A. Automated: run on 10 November 2026

| Check | Command | Result |
| --- | --- | --- |
| Rules (pure Kotlin) | `./gradlew :core:test` | **51 passed, 0 failed** |
| Data layer, on the JVM with Robolectric | `./gradlew :app:testDebugUnitTest` (`DataLayerTest`) | **17 passed** |
| UI flows, real screens with Robolectric | same task (`UiFlowTest`) | **13 passed** |
| Screenshots render | same task (`ScreenshotTest`), pictures in `android/app/src/test/screenshots` | **16 passed** |
| Android Lint | `./gradlew :app:lintDebug` | **0 errors**, 11 warnings (see below) |
| Release build, minified with R8 | `./gradlew :app:assembleRelease` | built, 5.0 MB (unsigned) |
| App bundle | `./gradlew :app:bundleRelease` | built, 9.7 MB (unsigned: no upload key on the build machine) |
| 16 KB page size | `zipalign -c -P 16 -v 4` on the release APK, and the ELF headers of all 8 native libraries | verified; every library loads at 16 KB alignment |
| No secret in the app | search of the release APK for `sb_secret` / `service_role` | none found; only the public publishable key |
| Database migration | `tools/android/test-migration.sh` on PostgreSQL 16 | schema + migration applied twice, 63 behaviour checks, rollback, re-apply: **all passed** |
| Server logic | `node --experimental-strip-types tools/android/test-play-shared.mjs` | passed |
| Website's own tests | `node tools/test-*.cjs` | 2 passed, **1 failed before this work** (`test-account-auth.cjs` expects `#/join`; the Zing branch changed it to `#/`). Not touched here |

### What the tests cover

| Area | Covered by |
| --- | --- |
| Website save format, merge rules, share links, quick cards, Quizlet/Anki/Sheets | `WebCompatTest` (14) |
| Search ranking, passages, highlights, filters; AI grounding and what is sent | `SearchAndGroundingTest` (13) |
| Sync conflicts, tombstones, overlay merge, themes and contrast, entitlement states, age rules, links, coins | `SyncThemeBillingTest` (21) |
| Word and PowerPoint reading | `OfficeTextTest` (3) |
| Sync end to end, working before the migration, idempotent XP, sign-in (Google nonce and linking, email PKCE), token refresh, account switching, deletion, AI limits and fallback | `DataLayerTest` (17) |
| Email sign-in and setup, under-13 rule, offline first run, notebooks, notes, search, archive/restore/delete with undo, import review, quiz, themes, Plus without billing, sign-out, account deletion, link before sign-in | `UiFlowTest` (13) |
| Every theme light and dark, tablet, large text, search, offline | `ScreenshotTest` (16) |

### Lint warnings left as they are

Two "no monochrome icon" (a themed icon needs artwork), four "use the KTX helper" style hints, one Compose parameter
order hint, two "split the `<data>` tag" hints on the App Links filter, one attribute that only matters on Android 13+,
and one "not targeting the newest Android" (the target is API 36 on purpose; see ARCHITECTURE.md).

### Not run, and why

| Check | Why not | Do it… |
| --- | --- | --- |
| Tests on a phone or emulator | No emulator can run on the build machine | Part B |
| Google sign-in | Needs Google Play services and your OAuth client | Part B |
| Play Billing with licence testers | Needs Play Console products and testers | SUBSCRIPTIONS.md |
| Against a Supabase **test project** | No test project or credentials were available; a pretend server was used instead | CONFIGURATION.md section 5, then Part B |
| Baseline profile, start-up time, memory, battery | Need a device | Part B |
| Dependency vulnerability scan | Not set up | Turn on GitHub's Dependabot alerts for the repository |
| Code formatter | None is configured (Kotlin's official style is set in `gradle.properties`) | Optional |

## B. By hand on real devices, before release

Use at least: a small phone (about 5"), a large phone, a tablet, Android 8 or 9 (the oldest supported), and the newest
Android. Tick each on the **release** build from the internal track.

**Sign-in**
- [ ] Fresh install → Google → setup → Home
- [ ] Fresh install → email code; and email link opened on the phone
- [ ] Guest → later connect Google (same profile kept)
- [ ] Transfer code from the website → account arrives
- [ ] Sign in with an account made on the website: decks, notes and XP appear
- [ ] Reinstall the app → sign in → everything is back
- [ ] Restore the phone from a Google backup → app asks to sign in (never crashes on the old session)
- [ ] Delete the account on the website while signed in on the phone → phone signs out with a clear message
- [ ] Open a shared-deck link with the app not installed, install, sign in → the deck is offered

**Offline and sync**
- [ ] Aeroplane mode: make a notebook, notes and cards; study; search. Go online: changes appear on the website
- [ ] Edit the same note on the phone and the website → "Changed on another device" with the three choices
- [ ] Slow network (developer options → rate limit): no frozen screens
- [ ] Rotate on every screen; put the app in the background and return; "Don't keep activities" on: nothing typed is lost

**Search and AI**
- [ ] Search finds notes in sub-books; highlights line up; filters and sort work
- [ ] Eligible account: "Summarise with Zing AI" answers with sources; a topic not in the notes says so
- [ ] Guest, under-14 and limit-reached accounts get the notes-only answer and the reason

**Import**
- [ ] PDF (text), PDF (scanned), Word, PowerPoint, photo, recording, pasted notes, Quizlet/Anki/Sheets paste, website link
- [ ] Cancel during "Crafting questions"; Retry after an error; Undo after saving

**Accessibility**
- [ ] TalkBack through sign-in, a notebook, the note editor, search and a quiz: everything is announced, nothing is a dead end
- [ ] System font size at the largest: nothing is cut off; touch targets stay easy to hit
- [ ] Keyboard only (tablet + keyboard): Tab reaches everything, Enter activates
- [ ] "Remove animations" and battery saver: motion stops
- [ ] Every theme in light and dark; High Contrast

**Performance**
- [ ] Cold start under 2 seconds on a mid-range phone (Android Studio → Profiler)
- [ ] 300 notes and 2,000 cards: lists scroll smoothly, search answers within a second
- [ ] Generate a baseline profile (Android Studio → Generate Baseline Profile) and add it before the production release
