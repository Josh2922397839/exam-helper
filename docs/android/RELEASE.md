# Zing for Android: building and releasing

Nothing in this repository uploads to Google Play by itself. These are the steps to do by hand, in order.

## 0. Before the first upload (one time)

- [ ] Confirm the application ID in `android/gradle.properties` (`com.josh.zing`). **It can never be changed after the first upload.**
- [ ] Do [CONFIGURATION.md](CONFIGURATION.md) sections 2 to 7 on a test Supabase project, then on the real one.
- [ ] Decide the Zing Plus catalogue ([SUBSCRIPTIONS.md](SUBSCRIPTIONS.md)), or release without Plus on sale (the app handles that).
- [ ] Publish the updated Privacy Policy and Terms ([PRIVACY_AND_DATA_SAFETY.md](PRIVACY_AND_DATA_SAFETY.md) has the wording) and `delete-account.html`.
- [ ] Declare your trader status in Play Console (the banner on your developer account asks for it).

## 1. Open and check the project

1. Android Studio → **Open** → choose the `android` folder (not the repository root).
2. Let it sync. It needs JDK 21 (Android Studio's own is fine) and will offer to install Android SDK Platform 37.
3. Run everything that the pull request ran:

   ```bash
   cd android
   ```

   ```bash
   ./gradlew :core:test :app:testDebugUnitTest :app:lintDebug
   ```

4. Run the app on a real phone (Run ▶ with the `app` configuration) and go through [QA_MATRIX.md](QA_MATRIX.md) part B.

## 2. Build the signed bundle

**In Android Studio:** Build → Generate Signed App Bundle or APK → Android App Bundle → choose your upload keystore
(see CONFIGURATION.md section 7) → `release` → Create.

**Or on the command line** (uses `~/.zing/keystore.properties`):

```bash
./gradlew :app:bundleRelease
```

The bundle is `android/app/build/outputs/bundle/release/app-release.aab`.

Check it before uploading:

- [ ] It is signed with the upload key: `jarsigner -verify -verbose -certs app-release.aab` names your key
- [ ] `versionCode` is higher than the last upload
- [ ] Build → Analyze APK…: no file you don't recognise; `classes.dex` is minified (short class names)
- [ ] Install the release build on a phone and repeat the sign-in, sync, search and purchase checks. Bugs that only
      appear after minification show up here.

## 3. Play Console setup (one time)

1. **Create app** → name "Zing", language English, App, Free.
2. **App signing:** accept Play App Signing. Copy the SHA-1 and SHA-256 for CONFIGURATION.md sections 2 and 4.
3. **Store listing:** text and graphics from [STORE_LISTING.md](STORE_LISTING.md).
4. **App content:** Privacy policy URL, Data safety, Content rating, Target audience, Ads (none), App access
   (give the reviewer a test account), using [PRIVACY_AND_DATA_SAFETY.md](PRIVACY_AND_DATA_SAFETY.md).
5. **Account deletion:** the URL `https://exam-helper.edgeone.app/delete-account.html`.

## 4. Testing tracks

1. **Internal testing** → create a release → upload the `.aab` → add up to 100 testers by email → share the opt-in link.
   Use this to check Google sign-in and purchases with licence testers on the Play-signed build.
2. **Closed testing.** A personal developer account created after 13 November 2023 must run a closed test with
   **at least 12 testers who stay opted in for 14 days in a row** before Google lets you apply for production.
   Your account already has an app in production (FX Josh), so check Play Console → Dashboard: if it doesn't show
   this requirement for the new app, it doesn't apply to you.
3. Fix what testers find, raise `ZING_VERSION_CODE`, upload again.

## 5. Production

Promote only when [QA_MATRIX.md](QA_MATRIX.md) part A is green on the release commit **and** part B has been done on
real devices.

- First release: **staged rollout at 20%**, then 50%, then 100% over a few days.
- Watch **Quality → Android vitals** (crashes and ANRs) and the reviews each day of the rollout.
- **Rolling back:** Play can't put an old version back. Halt the rollout (Release → Manage rollout → Halt), fix,
  raise the version code and release the fix. The server side can be undone on its own with
  `supabase/migrations/20261110_android_v8_rollback.sql`, but not while people hold active Plus subscriptions.

## 6. Every update after that

1. Raise `ZING_VERSION_CODE` (and `ZING_VERSION_NAME` if users should see a new number).
2. Tests, lint, signed bundle, internal track first, then a staged rollout.
3. If the database changed, apply the migration **before** the app that needs it reaches users, and keep the
   website working with both the old and the new database. This release follows that rule: every new function is
   optional for the app and invisible to the website.
