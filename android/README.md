# Zing for Android

The native Android app. It uses the same accounts, database functions and cloud save as the website in this
repository, so a student's decks and notes are the same in both.

Start with [`docs/android/ARCHITECTURE.md`](../docs/android/ARCHITECTURE.md).

## Open it

Android Studio → **Open** → this `android` folder. It needs JDK 21 and Android SDK Platform 37 (Studio offers to
install it).

## Run the checks

```bash
./gradlew :core:test :app:testDebugUnitTest :app:lintDebug
```

- `core/` is plain Kotlin: the rules (website save format, merging, search ranking, AI grounding, entitlements,
  themes). Its tests need no Android SDK.
- `app/` is the Android app. Its tests run on your computer with Robolectric against a pretend server
  (`src/test/java/com/josh/zing/TestSupport.kt`), so they need no phone and never touch the real database.

Screenshots of every theme are in `app/src/test/screenshots`. After changing how a screen looks:

```bash
./gradlew :app:recordRoborazziDebug
```

## Settings

Public settings are in `gradle.properties` (application ID, Supabase URL and public key, Google web client ID,
product ID). Secrets never go in this folder: see [`docs/android/CONFIGURATION.md`](../docs/android/CONFIGURATION.md).

Pictures (3D icons, avatars, school crests) are bundled straight from the website's `assets/img` folder; there is
no second copy.

## Other documents

| | |
| --- | --- |
| [CONFIGURATION.md](../docs/android/CONFIGURATION.md) | Google, Supabase, Play and signing setup |
| [RELEASE.md](../docs/android/RELEASE.md) | Building the signed bundle and releasing |
| [QA_MATRIX.md](../docs/android/QA_MATRIX.md) | What was tested, and what still needs a real device |
| [SUBSCRIPTIONS.md](../docs/android/SUBSCRIPTIONS.md) | Zing Plus checklist |
| [PRIVACY_AND_DATA_SAFETY.md](../docs/android/PRIVACY_AND_DATA_SAFETY.md) | Data safety form and policy wording |
| [STORE_LISTING.md](../docs/android/STORE_LISTING.md) | Play Store text |
| [RISKS.md](../docs/android/RISKS.md) | Risk register |
