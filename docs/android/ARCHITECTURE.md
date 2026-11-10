# Zing for Android: architecture and migration plan

This is the plan the Android work follows. It was written after reading the repository, the Zing web app
(`claude/inspiring-brown-c1d1wg`, the build deployed at `exam-helper.edgeone.app`), `supabase/schema.sql`, the
`zing-ai` Edge Function and the privacy and terms pages. Nothing in this plan changes production by itself: the
database migration and Edge Functions are files to review and apply by hand, and nothing is uploaded to Google Play.

## 1. What exists today (and what the Android app must not break)

| Area | How the web does it | What Android does |
| --- | --- | --- |
| Backend access | Only the `ef_*` Postgres functions (tables have RLS with no policies) | The same `ef_*` functions over PostgREST. No direct table access, no new access path |
| Accounts | Supabase Auth: Google (OAuth redirect), email link, guest (anonymous), one-time transfer code | The same Supabase users. Google through Credential Manager + ID-token exchange, email link/code, guest, transfer code |
| Progress | One JSON object (`ef2:state`) in the browser, backed up whole with `ef_save_put` | The same JSON object, kept in Room, merged with the web's own merge rules, unknown fields preserved |
| Decks, notes, subdecks | `ef2:sets`: decks with `cards`, `notes` (up to 40, 30,000 characters each), `parent`; backed up in the same save | **The same decks.** A notebook on Android *is* a top-level deck; sub-books are subdecks; notes are deck notes |
| XP, leagues, schools, friends | `ef_add_xp`, `ef_league_board`, `ef_school_board`, `ef_schools_board`, `ef_friends_board`, `ef_follow`… | Same functions |
| Sharing | `ef_deck_share` link (`#/shared/<id>`), school library, offline link (`#/import/<code>`) | Same functions, same link formats (opened as App Links) |
| Magic import + Zing AI | `zing-ai` Edge Function (Gemma 4 on Cloudflare), limits in `ef_ai_import_quota`, quick cards on the device | Same function and limits; the same quick-card rules ported to Kotlin |
| Coins | Kept on the device (`ef2:coins`), never on the server, no money value | Kept on the device with the same earning rules |
| Deleting an account | `ef_delete_me` removes app data, not the Supabase Auth record | Same, plus a new `delete-account` function that also removes the Auth record (Play requires it) |

**Why notebooks reuse decks instead of new tables.** Zing already stores notes inside decks, with subdecks. A second
"notebooks" store would split a student's notes in two (web notes in one place, Android notes in another). So the
Notebook Inventory is a new *view* of the decks a student already has: everything made on the web shows up on
Android on first sync, and notes written on Android show up on the web under the deck's Materials tab.

What the existing save cannot hold (archive, manual order, pins, icons, note topic/subject, theme) goes in one small
additive table (`app_prefs`, section 5). The web ignores it.

### Known limits inherited from the web (not changed here)

- The cloud save keeps at most 150,000 characters of note text (newest notes first); older notes are marked `cut`
  and stay only on the device that has them. Android follows the same rule so both clients agree, and shows a
  "Only on this device" label on those notes. Lifting the limit needs row-level note storage used by both clients;
  that is proposed as a follow-up, not done here.
- The web pushes its whole save without pulling first. Android always pulls and merges before it pushes, so it
  never overwrites newer web changes, but a web device can still overwrite the cloud copy with its own. Each
  device keeps its own decks either way; nothing is lost on the device that made it.

### Web features that stay web-only in this first Android version

The built-in subject study guides (the 15 subjects' notes, quizzes and decks), Live multiplayer games, challenges,
study groups, the Interactive tab (98 tools), 3D models and widgets, and the Learn, Match, Speed run and
Fill-the-gap modes. The app's Me screen says so and links to the website for them. They are listed in the
[risk register](RISKS.md) so nobody assumes they were ported.

## 2. Project layout

```
android/
  settings.gradle.kts, build.gradle.kts, gradle.properties, gradle/libs.versions.toml
  core/      pure Kotlin (no Android): the rules, unit-tested on the JVM
    model      decks, cards, notes, progress, profiles
    web        save codec, merge rules, share-link codec, pasted-notes and table parsers, quick cards
    search     tokens, query, ranking, passages + highlights, grouping
    ai         grounding (citations must quote the notes), prompt-safety, redaction
    sync       deck merge with tombstones and conflicts, metadata overlay merge, idempotency keys
    billing    entitlement states, feature gates, obfuscated account id
    theme      presets, customisation, contrast validation
    account    age rules, deletion plan
  app/       Android (Compose, Material 3)
    data/local     Room database (+ FTS4 index), DataStore settings, encrypted session
    data/remote    Supabase Auth, ef_* RPC and Edge Function clients (OkHttp + kotlinx.serialization)
    data/repo      repositories used by the UI
    sync           SyncEngine + WorkManager worker
    auth           Credential Manager Google sign-in, email, guest, deep links
    billing        Play Billing client
    ui             theme, navigation, screens
tools/android/export-content.mjs   turns assets/js/content + decks into JSON the app bundles
supabase/migrations/…_android_v8.sql (+ rollback)   additive database changes (section 5)
supabase/functions/{delete-account,play-verify,play-rtdn}/   new Edge Functions
supabase/functions/zing-ai/        one new action ("answer"); existing actions untouched
```

Layers: **UI** (Compose screens + ViewModels exposing `StateFlow`) → **repositories** → **Room** (the single source of
truth the UI reads) and **remote clients**. The UI never waits for the network: every write goes to Room first and
is synced later.

### Stack

Kotlin 2.4, Android Gradle Plugin 9.5, Gradle 9.9, Jetpack Compose (BOM 2026.09) with Material 3, Navigation
Compose, coroutines + Flow, Room 2.8 (FTS4), DataStore, WorkManager. `minSdk 26`, `compileSdk 37` (the current
AndroidX libraries require it), `targetSdk 36` (Play's current requirement; moving to 37 needs a device test pass).

## 3. Third-party SDKs and permissions

| Library | Why | Data it handles |
| --- | --- | --- |
| AndroidX (Compose, Room, DataStore, WorkManager, Navigation, Lifecycle, Splash screen, Profile installer) | App framework | On device only |
| `androidx.credentials` + `credentials-play-services-auth` + `googleid` | Google sign-in through Credential Manager | Google account ID token, sent to Supabase Auth |
| `com.android.billingclient:billing-ktx` 9.1 | Zing Plus subscription | Purchase token; obfuscated account ID |
| OkHttp 5 | HTTPS to Supabase | Requests the app makes |
| kotlinx.serialization, kotlinx.coroutines | JSON, async | On device only |
| Coil 3 | School crests, avatars, GIFs | Image requests (Wikimedia for some crests) |
| Test only: JUnit, Robolectric, Roborazzi, MockWebServer | Tests | None at runtime |

No analytics SDK, no advertising SDK, no crash-reporting SDK. Crashes and ANRs are read from Play Console's Android
vitals, which needs no SDK and collects nothing extra.

Permissions the app asks for itself: `INTERNET`, `ACCESS_NETWORK_STATE` (wait for a connection before syncing) and
`POST_NOTIFICATIONS` (asked only when a student turns study reminders on). Files, photos, PDFs and recordings are
chosen with the system pickers, which need no storage, camera or microphone permission. No location or contacts
permission.

Permissions added by libraries, none of which shows a prompt: `com.android.vending.BILLING` (Play Billing);
`WAKE_LOCK`, `RECEIVE_BOOT_COMPLETED` and `FOREGROUND_SERVICE` (WorkManager, to run the sync and the reminder);
`USE_BIOMETRIC` and `USE_FINGERPRINT` (Credential Manager).

## 4. How the hard parts work

### Sign-in

1. **Google:** Credential Manager returns a Google ID token for the *web* OAuth client ID that Supabase's Google
   provider already uses. The app creates a random nonce, sends its SHA-256 to Google and the raw nonce to Supabase
   (`/auth/v1/token?grant_type=id_token`), so a stolen token can't be replayed. If a guest or email account is
   already on the device, the same call is made with `link_identity`, which attaches Google to that account instead
   of making a new one (the web's rule: never silently replace a profile).
2. **Email:** `/auth/v1/otp` with a PKCE challenge. The student either types the 6-digit code from the email
   (`/auth/v1/verify`) or taps the link, which returns to the app with a one-time code that is exchanged with the
   PKCE verifier (`grant_type=pkce`).
3. **Guest:** an anonymous Supabase user, as on the web. **Transfer code:** `ef_claim`.
4. Tokens are encrypted with an Android Keystore key and are excluded from device backup. Refresh is single-flight;
   a revoked refresh token or deleted account signs the device out with a clear message and keeps local study data.
5. Deep links (`https://exam-helper.edgeone.app/#/import/…`, `#/shared/…`, `#/u/…`, `#/school/…`, `?ref=`) are
   parsed into a pending destination that is held until sign-in and setup finish, so a link opened on a fresh
   install still lands in the right place.
6. Nothing sensitive is logged: the HTTP layer never logs bodies or headers, and errors shown to students never
   include tokens, emails or note text.

### Offline-first sync

`SyncEngine` runs when something changes, when the network returns, when the app opens, and every 6 hours:

1. **XP**: queued XP is sent in batches of at most 400. With the migration applied, each batch carries an operation
   ID (`ef_add_xp2`) so a retried request can't be counted twice; without it the app uses `ef_add_xp` as the web does.
2. **Save**: `ef_save_get` → merge → `ef_save_put` if anything differs. A full-state put is idempotent.
   - Progress merges with the web's own rules (keep the best of both: max XP, union of days, highest card boxes…).
   - Decks merge by `updated` (the web's rule), plus two things the web doesn't have: **tombstones**, so a deck
     deleted on Android isn't brought back by an old cloud copy, and **conflict detection**: if a deck changed both
     on this device and in the cloud since the last sync, notes are merged one by one (newer edit wins); if the
     *same note* or the card list changed on both sides, the cloud copy wins and this device's version is kept as a
     **conflict copy**. The student sees "Changed on another device" with *Keep mine*, *Keep theirs* and *Keep both*.
     Nothing is dropped silently, and the same inputs always give the same result.
3. **Metadata** (`app_prefs`): fetched, merged key by key (newest edit wins), written back with the revision it was
   read at. If someone else wrote in between, the server refuses and the app merges again.
4. **Entitlement**: `ef_entitlement()` is read; the server is the only source of truth for Zing Plus.

Every step tolerates the migration not being applied yet (a missing function just skips that step), so the app can be
tested against today's production database.

### Search and the topic assistant

- Notes are indexed in SQLite FTS4. A search turns the student's words into a safe prefix query, takes candidates
  from the index, then ranks them in Kotlin: title matches, phrase matches, how many of the words appear, how close
  together, pinned notes, and recency. Results come back grouped by notebook with the best passage of each note and
  the matching words marked, plus filters (notebook, kind, pinned, date) and sorting (best match, newest, title).
- "Synchronising remote search" means: when a search starts online and the last sync is stale, a sync is requested
  and results update as new notes arrive. Notes never leave the existing save channel and no new search endpoint
  is exposed.
- **AI answers** (optional, only for students the server says are eligible): the app sends the question and the
  passages the student selected, with emails and phone numbers stripped, to `zing-ai` (`action: "answer"`). The
  model must quote the notes. The server, and then the app again, check every quote really appears in the note it
  cites; anything else is dropped, and if nothing is left the student is told there's nothing in their notes about
  it. Without AI (offline, guest, under 14, limit reached) the assistant still works: it shows the best passages
  from the notes, clearly labelled as taken straight from them.

### Zing Plus

The app asks Google Play for the product's details and shows Play's own prices. A purchase is sent to the
`play-verify` function, which checks it with the Google Play Developer API, stores the result, and acknowledges it.
`play-rtdn` receives Google's Real-time Developer Notifications. The app only unlocks what `ef_entitlement()` says.
The list of gated features is empty until the catalogue is approved ([SUBSCRIPTIONS.md](SUBSCRIPTIONS.md)), so
nothing is taken away from free users by this change.

## 5. Database migration (not applied; review first)

File: `supabase/migrations/20261110_android_v8.sql`, rollback in `supabase/migrations/20261110_android_v8_rollback.sql`.
Every statement is additive (`create … if not exists`, new functions), follows the existing pattern (RLS on, no
policies, `security definer` functions that check `auth.uid()`), and is safe to run twice.

| Change | Why | Risk | Rollback |
| --- | --- | --- | --- |
| `app_prefs` table + `ef_prefs_get`, `ef_prefs_put` | Theme and notebook metadata across devices, with revision checks | None for the web (it never reads it). 64 KB cap per student | Drop the table and two functions |
| `xp_ops` table + `ef_add_xp2(n, op)` | Idempotent XP | `ef_add_xp` is untouched. Rows older than 7 days are cleaned up on use | Drop both |
| `reports`, `blocks` tables + `ef_report`, `ef_block`, `ef_unblock`, `ef_blocked` | In-app reporting and blocking (Play's user-generated-content policy) | New rows only | Drop them |
| `ef_can_reach`, `ef_follow`, `ef_follow_many` replaced | A blocked student can't challenge you, add you to a group, or follow you | **Changes existing functions.** Behaviour is identical when nobody is blocked | Rollback file restores the current bodies |
| `ef_billing_private` schema: `entitlements`, `purchases`, `rtdn_events`; `ef_entitlement()`; service-only `zing_billing_apply`, `zing_billing_rtdn_seen` | Server-side source of truth for Zing Plus | Private schema, reachable only with the service key, like `ef_ai_private`. The service-only functions are named `zing_*` so `schema.sql`'s "grant every `ef_*` function" loop never opens them | Drop the schema and functions |
| `ef_delete_me` replaced | Also clears the new tables. Entitlement rows are deleted; purchase tokens are kept only as a hash for fraud and refund handling | **Changes an existing function.** Old deletes keep working | Rollback file restores the current body |
| `ef_claim` replaced | Moving an account to a new device also moves the new rows | **Changes an existing function** | Rollback file restores the current body |

The migration, its rollback and a re-apply were run against PostgreSQL 16 with `tools/android/test-migration.sh`
(63 checks as student and service roles).

Edge Functions (deploy by hand when ready): `delete-account` (new), `play-verify` (new), `play-rtdn` (new), and
`zing-ai` gains one action. Their secrets are listed in [CONFIGURATION.md](CONFIGURATION.md).

## 6. Release plan (summary; exact steps in [RELEASE.md](RELEASE.md))

1. Review and merge this work. Confirm the application ID (`com.josh.zing` by default) **before** the first upload.
2. Create the app in Play Console, enrol in Play App Signing, create the upload key (kept outside the repository).
3. Configure Google sign-in (Android + web OAuth clients), Supabase redirect URLs and `assetlinks.json`.
4. Apply the migration and deploy the functions on a test project first, then production.
5. Internal testing → closed testing (a new personal developer account needs at least 12 testers for 14 days) →
   production with a staged rollout. Promote only when the [QA matrix](QA_MATRIX.md) is green.
6. Web and Android stay compatible throughout: no existing function signature, session or stored value is changed
   in a way the web would notice.
