// Checks the logic the play-verify and play-rtdn Edge Functions share (supabase/functions/_shared/play.ts) and the
// "answer" action's input rules in zing-ai, without Deno or a network.
// Run: node --experimental-strip-types tools/android/test-play-shared.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

globalThis.Deno = { env: { get: () => undefined }, serve: () => {} };
const play = await import("../../supabase/functions/_shared/play.ts");

// the same vector android/core's SyncThemeBillingTest checks: both sides must hash an account the same way
assert.equal(await play.obfuscatedAccountId("5b1f0c1e-0000-4000-8000-000000000001"), "2fcacabf28ba82e514d88ac8d54ede843c124961552858783d564095488e71a8");

// Google's states -> Zing's (the table in Entitlement.kt)
const now = 1_780_000_000_000;
const table = [
  ["SUBSCRIPTION_STATE_ACTIVE", now + 1, "active"], ["SUBSCRIPTION_STATE_IN_GRACE_PERIOD", now + 1, "grace"], ["SUBSCRIPTION_STATE_ON_HOLD", now + 1, "on_hold"],
  ["SUBSCRIPTION_STATE_PAUSED", now + 1, "paused"], ["SUBSCRIPTION_STATE_PENDING", null, "pending"], ["SUBSCRIPTION_STATE_CANCELED", now + 1, "canceled_active"],
  ["SUBSCRIPTION_STATE_CANCELED", now - 1, "expired"], ["SUBSCRIPTION_STATE_EXPIRED", now - 1, "expired"], ["SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED", null, "none"],
  ["SOMETHING_NEW", null, "none"], [undefined, null, "none"]
];
for (const [state, expires, want] of table) assert.equal(play.mapState(state, expires, now), want, String(state));
assert.equal(play.mapState("SUBSCRIPTION_STATE_ACTIVE", now + 1, now, true), "revoked");

// what is kept from Google's answer
const facts = play.summarise({
  subscriptionState: "SUBSCRIPTION_STATE_ACTIVE", latestOrderId: "GPA.1", linkedPurchaseToken: "old-token", acknowledgementState: "ACKNOWLEDGEMENT_STATE_PENDING",
  externalAccountIdentifiers: { obfuscatedExternalAccountId: "abc" },
  lineItems: [{ productId: "zing_plus", expiryTime: new Date(now + 86_400_000).toISOString(), autoRenewingPlan: { autoRenewEnabled: true }, offerDetails: { basePlanId: "monthly" } }]
}, now);
assert.deepEqual({ ...facts, expiresAt: undefined }, { state: "active", productId: "zing_plus", basePlanId: "monthly", expiresAt: undefined, expiresAtMs: now + 86_400_000,
  autoRenew: true, orderId: "GPA.1", linkedToken: "old-token", accountId: "abc", needsAck: true, testPurchase: false });
assert.equal(play.summarise({}, now).state, "none");
assert.equal(play.summarise(null, now).productId, null);

// a push that isn't a Google-signed token is refused before any network call
assert.equal(await play.verifyGoogleOidc("not.a.token", "aud", "a@b"), false);
assert.equal(await play.verifyGoogleOidc("nope", "aud", "a@b"), false);
const forged = [{ alg: "none" }, { iss: "https://accounts.google.com", aud: "aud", email: "a@b", email_verified: true, exp: now }].map((o) => Buffer.from(JSON.stringify(o)).toString("base64url")).join(".") + ".x";
assert.equal(await play.verifyGoogleOidc(forged, "aud", "a@b"), false);

// zing-ai: the "answer" action only accepts well-formed, bounded input, and the existing actions still parse
const source = fs.readFileSync(new URL("../../supabase/functions/zing-ai/index.ts", import.meta.url), "utf8");
const ctx = vm.createContext({ Deno: globalThis.Deno, Response, URL, console });
vm.runInContext(source.replace(/^Deno\.serve\([\s\S]*$/m, "") + "\nglobalThis.parseInput = parseInput; globalThis.squash = squash;", ctx);
const good = { action: "answer", question: "How do plants make glucose?", sources: [{ ref: "s1", title: "Photosynthesis", text: "Plants make glucose using light energy in the chloroplasts." }] };
assert.equal(ctx.parseInput(good).cost, 1);
assert.equal(ctx.parseInput({ ...good, sources: [] }), null);
assert.equal(ctx.parseInput({ ...good, sources: [{ ref: "note-id-123", text: "x".repeat(50) }] }), null);          // only throwaway labels are accepted
assert.equal(ctx.parseInput({ ...good, sources: [good.sources[0], good.sources[0]] }), null);                       // a label used twice
assert.equal(ctx.parseInput({ ...good, sources: [{ ref: "s1", text: "x".repeat(5000) }] }), null);                  // too long
assert.equal(ctx.parseInput({ ...good, sources: Array.from({ length: 9 }, (_, i) => ({ ref: "s" + (i + 1), text: "x".repeat(50) })) }), null);
assert.equal(ctx.parseInput({ ...good, question: "" }), null);
assert.equal(ctx.parseInput({ action: "status" }).action, "status");
assert.equal(ctx.parseInput({ action: "cards", text: "Osmosis is the movement of water across a membrane." }).cost, 1);
assert.equal(ctx.parseInput({ action: "nonsense" }), null);
assert.ok(ctx.squash("  “Plants”  make\nGLUCÓSE ").includes("plants make glucose"));
console.log("play + zing-ai checks passed");
