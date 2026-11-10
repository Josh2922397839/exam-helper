# Zing for Android: privacy, Data safety and policy checklist

Written from what the code in this pull request actually does. If the code changes, change this too: Google checks
the Data safety form against the app.

## 1. What the Android app sends, and where

| Data | When | Goes to | Kept there? |
| --- | --- | --- | --- |
| Google ID token, or email address | Signing in | Supabase Auth | The account record (email, Google account ID) |
| First and last name, age (stored as a birth year), purpose, school year, school, avatar, username | Setup, Edit profile | Supabase (`profiles`) | Until changed or deleted |
| Study progress, decks, cards, notes (up to the cloud limit) | Sync | Supabase (`saves`) | Until changed or deleted |
| XP amounts | Studying | Supabase (`profiles`, `xp_days`, `deck_xp`) | Until deleted |
| Appearance and notebook details (archive, order, pins, icons, subject, topic) | Sync | Supabase (`app_prefs`) | Until deleted |
| Cards of a deck you choose to share | Share | Supabase (`shared_sets`) | Until you stop sharing or delete |
| Study text you pick for Zing AI (emails and phone numbers stripped), photos of notes, a recording, or a web address | Only when you use Zing AI | Supabase Edge Function → Cloudflare Workers AI | **Not stored or logged** by the function |
| A reason code and what was reported (a username, a deck ID, or a fingerprint of the question) | Tapping Report | Supabase (`reports`) | Until handled |
| Who you blocked | Tapping Block | Supabase (`blocks`) | Until unblocked or deleted |
| Purchase token and a one-way hash of your account ID | Buying Zing Plus | Google Play; the token to our `play-verify` function, which keeps only its hash | Hash kept for refunds |
| School crest picture requests | Showing some crests | Wikimedia | Their own logs |

**Never sent:** your contacts, location, device or advertising ID, the files you import (they are read on the phone;
only their text can go to Zing AI), your search history (kept on the phone), your coins (kept on the phone).
**No** analytics SDK, advertising SDK or crash SDK is in the app.

## 2. Play Console → Data safety form

- Does your app collect or share any of the required user data types? **Yes**
- Is all of the user data encrypted in transit? **Yes** (HTTPS only; plain HTTP is switched off in the manifest)
- Do you provide a way for users to request that their data is deleted? **Yes**: in the app and at
  `https://exam-helper.edgeone.app/delete-account.html`

"Shared" below means given to another company for *its own* use. Supabase, Cloudflare and Google Play process data
*for* Zing (service providers), which Google's form does not count as sharing.

| Data type | Collected | Shared | Optional? | Purpose | Notes |
| --- | --- | --- | --- | --- | --- |
| Personal info → Name | Yes | No | Required for an account | App functionality, Account management | First name and last initial shown only to classmates of findable students aged 13+ |
| Personal info → Email address | Yes | No | Optional (guest and Google also work) | Account management | Never shown to other students |
| Personal info → User IDs | Yes | No | Required | App functionality, Account management | Account ID, username |
| Personal info → Other info | Yes | No | Required | App functionality | Age (as birth year), school, school year |
| Financial info → Purchase history | Yes, once Plus is sold | No | Optional | App functionality | Subscription state and expiry; no card details ever reach Zing |
| Photos and videos → Photos | Yes | No | Optional | App functionality | Only photos you choose for Magic import. Tick **processed ephemerally** |
| Audio → Voice or sound recordings | Yes | No | Optional | App functionality | Only a recording you choose for Magic import. **Processed ephemerally** |
| Files and docs | Yes | No | Optional | App functionality | Scanned PDF pages you import with Zing AI. **Processed ephemerally** |
| App activity → App interactions | Yes | No | Required with an account | App functionality | XP, progress, quiz results |
| App activity → Other user-generated content | Yes | No | Required with an account | App functionality | Your notes, decks and cards |
| App activity → In-app search history | No | | | | Stays on the phone |
| App info and performance | No | | | | No crash or analytics SDK |
| Device or other IDs, Location, Contacts, Messages, Health, Calendar, Web browsing | No | | | | |

## 3. Decisions only you can make

1. **Target audience.** Zing's setup accepts ages 5 to 100 and limits what under-13s can do. In Play Console you
   must pick the age groups the app is *for*.
   - If you choose **13 and over only**: keep the age question (it is neutral and already there) and make sure the
     store listing and graphics don't target young children. This is the simpler path.
   - If you include **under 13**: Google's Families policy applies in full, and children's privacy laws (such as
     COPPA in the United States) usually require a parent's consent before collecting a child's name. The app does
     not collect parental consent today. Get advice before choosing this.
2. **Content rating questionnaire.** Answer from the app as built: users can interact (leaderboards, follows,
   shared decks) → say yes to "users can interact or exchange content"; no free-text chat on Android; no
   gambling, violence or location sharing; digital purchases yes once Plus is sold.
3. **Ads:** No.
4. **AI:** the app has AI-generated content (cards and answers). Both have an in-app Report button, as Google's
   AI-generated content policy asks.

## 4. Other people's content (Google's user-generated content policy)

| Google asks for | In the app |
| --- | --- |
| Users accept terms before making content | Setup shows the Terms and Privacy links before the first step |
| Report content | Shared deck → Report; AI answer → Report; AI cards → Report |
| Report users | Profile → Report |
| Block users | Profile → Block (needs the migration). Removes follows both ways, stops challenges and group adds, hides them from your lists |
| Someone acts on reports | **You do.** Supabase → Table Editor → `reports` where `handled_at` is empty. Decide who checks it and how often (daily during rollout). Remove a deck in `shared_sets`, a username in `profiles`. Set `handled_at` when done |
| Under-13 protections | Never findable, real name never shown, no follow suggestions (enforced by the server) |

Free-text places other students can see on Android: usernames, shared deck names and cards. Usernames and deck names
pass the server's word filter; card text does not, which is why decks have a Report button.

## 5. Proposed additions to the Privacy Policy and Terms (to review, not yet applied)

`privacy.html` and `terms.html` are **not changed** by this pull request, so nothing new is published before you have
read it. Add these when the Android app is about to be released.

**Privacy Policy, new section "The Android app":**

> The Zing app for Android uses the same account and cloud save as the website. On Android, your study progress,
> decks, cards and notes are kept in the app's private storage on your phone and backed up to your account when you
> are signed in. Your sign-in is stored encrypted on the phone and is not included in device backups.
>
> The app also saves your appearance settings and notebook details (such as which notebooks are archived or pinned)
> to your account so they follow you to another phone.
>
> Search runs on your phone. Your search history stays on your phone.
>
> When you ask Zing AI to summarise notes, the app sends your question and the passages you chose to our server,
> which passes them to Cloudflare Workers AI and returns the answer. Email addresses and phone numbers are removed
> first. The server does not store or log them.
>
> If you report a profile, a shared deck or an AI answer, we store the reason you chose and what you reported. If
> you block someone, we store that so they can't challenge you or add you to a group.
>
> The app has no advertising and no analytics or tracking tools. Google Play gives us anonymous crash statistics.
>
> **Zing Plus.** Zing Plus is sold through Google Play. Google handles the payment; we never receive your card
> details. We receive a purchase token from Google Play, check it with Google, and store whether your subscription
> is active and when it ends. We keep a scrambled fingerprint of the purchase so we can handle refunds.
>
> **Deleting your account** in the Android app removes your Zing data and your sign-in record. See
> [Delete your account](delete-account.html).

Also update section 6 ("Your controls and deletion"): the sentence saying deletion does not remove the sign-in
record is no longer true for the Android app once `delete-account` is deployed.

**Terms of Use, new section "Zing Plus":**

> Zing Plus is an optional subscription bought through Google Play. The price, the billing period and any free trial
> are shown before you subscribe. It renews automatically until you cancel in Google Play. Cancelling stops the next
> renewal; you keep Zing Plus until the end of the period you paid for. Refunds follow Google Play's rules. Deleting
> your Zing account does not cancel a Google Play subscription.

**Terms of Use, add to "Keep participation respectful":**

> You can report a profile, a shared deck or an AI answer in the app, and block another student. We may remove
> content or accounts that break these terms.
