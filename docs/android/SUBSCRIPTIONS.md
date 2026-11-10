# Zing Plus: subscription checklist

The code for subscriptions is in place and tested, but **nothing is sold and nothing is locked** until the items
below are decided and ticked. `FeatureGate.gated` in `android/core/.../billing/Entitlement.kt` is empty on purpose.

## Decide first (the catalogue)

- [ ] Monthly price, and the countries it is sold in
- [ ] Annual price, and the countries it is sold in
- [ ] Tax settings in Play Console (Google collects tax in many countries; check each one you sell in)
- [ ] Free trial or intro price? Length, and who gets it (new subscribers only)
- [ ] Grace period and account hold lengths (Play Console defaults are fine to start)
- [ ] **What Plus gives.** Write the list. Rule: nothing that is free today may move behind Plus. Good candidates are
      extras, such as more Zing AI turns per day (enforced on the server in `ef_ai_import_quota`) or extra themes
- [ ] Can under-18s buy? Google Play applies the family payment rules of the account; decide whether the paywall is
      shown to under-13s at all (recommended: no)
- [ ] Refund wording for the store listing and Help

When this is approved: create the product `zing_plus` with base plans `monthly` and `annual`, set
`ZING_PLUS_PRODUCT_ID=zing_plus`, add the product ID to the `PLAY_PRODUCT_IDS` secret, and only then add features to
`FeatureGate.gated` (with a test for each).

## How a purchase works

1. The app asks Google Play for the product and shows **Play's own price text**. No price is written in the app.
2. The student taps Subscribe. Google Play's screen does the payment. The app passes a one-way hash of the account
   ID, never a name or email.
3. The app sends the purchase to `play-verify`. The function asks Google if it is real and belongs to this account,
   records it, and acknowledges it.
4. The app shows Plus only when `ef_entitlement()` says so.
5. Later changes (renewal, cancel, failed payment, refund) arrive from Google at `play-rtdn`, which asks Google what
   is true now and records that.

| What happened | What the student sees | Plus |
| --- | --- | --- |
| Bought, confirmed | "You're on Zing Plus" | on |
| Slow payment (pending) | "Your payment is still being confirmed…" | off until confirmed |
| Cancelled on Google's screen | "No problem: nothing was charged." | off |
| Renewal failed, Google retrying (grace) | "Update your payment method…" | on |
| Retry period over (on hold) | "Plus is on hold…" | off |
| Cancelled, time left | "Plus stays on until the end of the time you paid for." | on until then |
| Refund or chargeback | "This subscription was refunded…" | off at once |
| Changed plan | Switched at once (to annual) or at the end of the period (to monthly) | on |
| No connection | "Your purchase is safe and will be checked again…" | checked next start |
| No Google Play on the device | "Everything else in Zing still works." | not offered |

Offline, the last answer from the server is trusted for at most 3 days and never past the end of the paid period.

## Rules the screen follows

- Says first that Zing is free and nothing is being taken away.
- Shows the price, the period, that it renews, and how to cancel, before the button.
- One tap to **Restore purchases** and one to **Manage in Google Play**.
- No countdown timers, no pre-ticked boxes, no "No thanks, I don't want to learn" buttons.
- Guests are asked to sign in first, so a subscription can't be lost with the phone.

## Before selling: test with licence testers

- [ ] Buy monthly → Plus on; reinstall → Restore brings it back
- [ ] Buy on account A, sign in as B on the same phone → B does **not** get Plus
- [ ] Cancel → stays on until the period ends, then off
- [ ] Decline the payment (test card "always declines") → pending/failed message, no Plus
- [ ] Slow test card → pending, then on by itself
- [ ] Monthly → annual and back
- [ ] Refund from Play Console → off within a minute (RTDN)
- [ ] Turn the phone offline after buying → still on; wait past expiry in test time → off
- [ ] Delete the Zing account → entitlement gone; Google's subscription must still be cancelled in Play (the app says so)
