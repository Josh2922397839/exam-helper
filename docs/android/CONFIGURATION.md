# Zing for Android: configuration guide

Everything that has to be set up outside the code before the app can sign people in, sell Zing Plus and be released.
No secret value belongs in this repository or in the app. Where a secret is needed, this guide says where it lives.

**Legend:** 🔓 public value (safe in the app) · 🔒 secret (never in the app or the repository)

## 1. Values in `android/gradle.properties` (all public)

| Property | What it is | Now |
| --- | --- | --- |
| `ZING_APPLICATION_ID` 🔓 | The app's ID on Google Play. **Permanent after the first upload.** | `com.josh.zing` (confirm before uploading) |
| `ZING_VERSION_CODE`, `ZING_VERSION_NAME` 🔓 | Raise the code by 1 for every upload | `1`, `1.0.0` |
| `ZING_SUPABASE_URL`, `ZING_SUPABASE_PUBLISHABLE_KEY` 🔓 | The same public values as `assets/js/config.js` | set |
| `ZING_WEB_HOST` 🔓 | The website's host, for links | `exam-helper.edgeone.app` |
| `ZING_GOOGLE_WEB_CLIENT_ID` 🔓 | The **web** OAuth client ID Supabase uses for Google | **empty: Google sign-in is hidden until you fill it in** |
| `ZING_PLUS_PRODUCT_ID` 🔓 | The subscription's product ID in Play Console | `zing_plus_test` |

The build refuses to run if the Supabase key looks like a secret key (`sb_secret_…` or `service_role`).

Debug builds are installed as `com.josh.zing.debug`, so they sit next to the real app.

## 2. Google sign-in

Android's Credential Manager asks Google for an ID token made for your **web** client, and Supabase checks it.

1. **Google Cloud Console → APIs & Services → Credentials** (the project Supabase's Google provider already uses).
2. Find the existing **Web application** client. Copy its client ID into `ZING_GOOGLE_WEB_CLIENT_ID`.
3. Create an **Android** client for each of these (package name + SHA-1):

   | Package | SHA-1 comes from |
   | --- | --- |
   | `com.josh.zing` | Play Console → Test and release → Setup → **App signing** → *App signing key certificate* (this is what real users get) |
   | `com.josh.zing` | The same page → *Upload key certificate* (for builds you install yourself) |
   | `com.josh.zing.debug` | Your computer's debug key: `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android` |

   You don't put these Android client IDs anywhere in the app. They only have to exist.
4. **OAuth consent screen:** rename the app to "Zing" (the README already asks for this) and keep the scopes at `openid`, `email`, `profile`.
5. **Supabase → Authentication → Sign In / Providers → Google:** keep the web client ID and secret 🔒 as they are. If there is a field for extra **Client IDs**, add the Android client IDs there, separated by commas. Leave "Skip nonce checks" **off**: the app sends a nonce.
6. To let a guest or email account connect Google later, **Authentication → Sign In / Providers → "Allow manual linking"** must be on (the website already depends on it).

## 3. Email sign-in

1. **Supabase → Authentication → URL Configuration → Redirect URLs:** add
   - `com.josh.zing://auth/callback`
   - `com.josh.zing.debug://auth/callback`

   Keep the website's URL as the Site URL.
2. **Authentication → Emails → Magic Link template:** add the code to the email so students can type it, for example:
   `Your Zing code is {{ .Token }}`. The link in the same email also works when it is opened on the phone.
3. Supabase's built-in mailer only delivers to your own team (the README says so too). Set up a custom SMTP sender before real students use email sign-in.

## 4. Links that open the app (App Links)

The app claims `https://exam-helper.edgeone.app/` so shared-deck, profile and invite links open in it. Android only
allows that if the website says so.

1. Play Console → App signing → copy the **SHA-256** of the *App signing key certificate*.
2. Put it into [`assetlinks.template.json`](assetlinks.template.json), and publish the result on the website as
   `/.well-known/assetlinks.json` (it must be served as `application/json`, with no redirect).
3. Check it: `adb shell pm get-app-links com.josh.zing` should say `verified`.

Until that file is live, website links simply keep opening in the browser. Email sign-in does not depend on it.

## 5. Database and server functions

Do this on a **test Supabase project first**.

1. Read [ARCHITECTURE.md](ARCHITECTURE.md) section 5, then run `supabase/migrations/20261110_android_v8.sql` in the SQL editor.
   The undo file is next to it. `tools/android/test-migration.sh` runs both against a throwaway PostgreSQL.
2. Deploy the functions:

   ```bash
   supabase functions deploy zing-ai
   ```

   ```bash
   supabase functions deploy delete-account
   ```

   ```bash
   supabase functions deploy play-verify
   ```

   ```bash
   supabase functions deploy play-rtdn --no-verify-jwt
   ```

   `play-rtdn` is the only one without Supabase's token check: Google can't send one, so the function checks Google's
   own signed token instead.
3. Secrets (**Supabase → Edge Functions → Secrets**):

   | Secret | Used by | What it is |
   | --- | --- | --- |
   | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` 🔒 | `zing-ai` | Already set |
   | `GOOGLE_PLAY_SERVICE_ACCOUNT` 🔒 | `play-verify`, `play-rtdn` | The whole JSON key of a Google Cloud service account (step 6) |
   | `PLAY_PACKAGE_NAME` | both | `com.josh.zing` |
   | `PLAY_PRODUCT_IDS` | both | The subscription product IDs that give Plus, e.g. `zing_plus` |
   | `RTDN_AUDIENCE` | `play-rtdn` | The function's full URL, the same text you put in the Pub/Sub subscription |
   | `RTDN_SERVICE_ACCOUNT_EMAIL` | `play-rtdn` | The service account the Pub/Sub push subscription signs as |

The app works before any of this is done: it notices a missing function and carries on without that feature.

## 6. Google Play Billing

1. **Play Console → Monetise → Subscriptions:** create the product only after the catalogue is approved
   ([SUBSCRIPTIONS.md](SUBSCRIPTIONS.md)). For internal testing use the product ID `zing_plus_test`.
2. **Service account:** Google Cloud Console → IAM → Service accounts → create one, make a JSON key 🔒, and store it
   only as the `GOOGLE_PLAY_SERVICE_ACCOUNT` secret. In **Play Console → Users and permissions** invite that
   account's email with *View financial data* and *Manage orders and subscriptions* for this app only.
3. **Real-time notifications:** Google Cloud Console → Pub/Sub → create a topic → give
   `google-play-developer-notifications@system.gserviceaccount.com` the *Pub/Sub Publisher* role on it → create a
   **push** subscription to `https://<project>.supabase.co/functions/v1/play-rtdn` with **authentication on**
   (pick a service account, and set the audience to the same URL). Then Play Console → Monetisation setup → paste the
   topic name and send a test notification.
4. **Licence testers:** Play Console → Settings → Licence testing → add the testers' Google accounts.

## 7. Signing

- Enrol in **Play App Signing** when you create the app. Google keeps the real signing key.
- You keep the **upload key**. Make it once:

  ```bash
  keytool -genkeypair -v -keystore ~/.zing/zing-upload.jks -alias zing-upload -keyalg RSA -keysize 4096 -validity 9125
  ```

- Tell the build where it is with a file **outside the repository**, `~/.zing/keystore.properties`:

  ```properties
  storeFile=/home/you/.zing/zing-upload.jks
  storePassword=…
  keyAlias=zing-upload
  keyPassword=…
  ```

  (or point the `ZING_KEYSTORE_PROPERTIES` environment variable at it). `android/.gitignore` blocks `*.jks`,
  `*.keystore` and `keystore.properties` from being committed.
- **If the upload key is lost:** Play Console → App signing → *Request upload key reset*. Write down who owns the
  key file and its passwords, and keep a backup in a password manager, not in email or chat.
