// Shared by play-verify and play-rtdn: talking to the Google Play Developer API, and turning what Google says about
// a subscription into Zing's entitlement states. Plain JavaScript, like zing-ai.
//
// The state table here must match android/core/.../billing/Entitlement.kt (PlayStates.map). Both are covered by
// tests: tools/android/test-play-shared.mjs and SyncThemeBillingTest.

export const reply = (body, status = 200, headers = {}) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers } });
export const isRecord = (v) => typeof v === "object" && v !== null && !Array.isArray(v);

export function defaultSupabaseKey(variable, prefix) {
  try {
    const keys = JSON.parse(Deno.env.get(variable) ?? "{}");
    const key = isRecord(keys) ? keys.default : null;
    return typeof key === "string" && key.startsWith(prefix) && key.length > prefix.length ? key : null;
  } catch {
    return null;
  }
}

export async function sha256Hex(text) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// The "obfuscated account ID" the app gives Google Play with a purchase: a one-way hash of the Zing account's ID.
export const obfuscatedAccountId = (userId) => sha256Hex("zing-play-account:" + userId);

// Google's subscriptionState -> Zing's entitlement state
export function mapState(subscriptionState, expiresAtMs, nowMs, revoked = false) {
  if (revoked) return "revoked";
  switch (subscriptionState) {
    case "SUBSCRIPTION_STATE_ACTIVE": return "active";
    case "SUBSCRIPTION_STATE_IN_GRACE_PERIOD": return "grace";
    case "SUBSCRIPTION_STATE_ON_HOLD": return "on_hold";
    case "SUBSCRIPTION_STATE_PAUSED": return "paused";
    case "SUBSCRIPTION_STATE_PENDING": return "pending";
    case "SUBSCRIPTION_STATE_CANCELED": return expiresAtMs != null && expiresAtMs > nowMs ? "canceled_active" : "expired";
    case "SUBSCRIPTION_STATE_EXPIRED": return "expired";
    default: return "none"; // includes SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED and anything new
  }
}

// The facts Zing keeps from purchases.subscriptionsv2.get
export function summarise(sub, nowMs) {
  const item = Array.isArray(sub?.lineItems) ? sub.lineItems[0] : null;
  const expiresAtMs = item?.expiryTime ? Date.parse(item.expiryTime) : null;
  const revoked = isRecord(sub?.canceledStateContext?.systemInitiatedCancellation) && false; // a refund arrives as a voided purchase
  return {
    state: mapState(sub?.subscriptionState, Number.isFinite(expiresAtMs) ? expiresAtMs : null, nowMs, revoked),
    productId: typeof item?.productId === "string" ? item.productId : null,
    basePlanId: typeof item?.offerDetails?.basePlanId === "string" ? item.offerDetails.basePlanId : null,
    expiresAt: Number.isFinite(expiresAtMs) ? new Date(expiresAtMs).toISOString() : null,
    expiresAtMs: Number.isFinite(expiresAtMs) ? expiresAtMs : null,
    autoRenew: item?.autoRenewingPlan?.autoRenewEnabled === true,
    orderId: typeof sub?.latestOrderId === "string" ? sub.latestOrderId : null,
    linkedToken: typeof sub?.linkedPurchaseToken === "string" ? sub.linkedPurchaseToken : null,
    accountId: typeof sub?.externalAccountIdentifiers?.obfuscatedExternalAccountId === "string" ? sub.externalAccountIdentifiers.obfuscatedExternalAccountId : null,
    needsAck: sub?.acknowledgementState === "ACKNOWLEDGEMENT_STATE_PENDING",
    testPurchase: isRecord(sub?.testPurchase)
  };
}

const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64urlText = (text) => b64url(new TextEncoder().encode(text));
const fromB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), (c) => c.charCodeAt(0));

// An access token for the Play Developer API, from the service account kept in the GOOGLE_PLAY_SERVICE_ACCOUNT secret
let cachedToken = null;
export async function googleAccessToken() {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.value;
  const account = JSON.parse(Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT") ?? "{}");
  if (typeof account.client_email !== "string" || typeof account.private_key !== "string") throw new Error("service account");
  const now = Math.floor(Date.now() / 1000);
  const unsigned = b64urlText(JSON.stringify({ alg: "RS256", typ: "JWT" })) + "." + b64urlText(JSON.stringify({
    iss: account.client_email, scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 600
  }));
  const pem = account.private_key.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, "");
  const key = await crypto.subtle.importKey("pkcs8", Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: unsigned + "." + b64url(signature) }),
    redirect: "error", signal: AbortSignal.timeout(8_000)
  });
  if (!res.ok) { await res.body?.cancel(); throw new Error("google token " + res.status); }
  const out = await res.json();
  cachedToken = { value: out.access_token, expires: Date.now() + (Number(out.expires_in) || 3000) * 1000 };
  return cachedToken.value;
}

const PUBLISHER = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/";

// What Google says about a subscription purchase right now. Returns null when Google doesn't know the token.
export async function getSubscription(packageName, purchaseToken) {
  const res = await fetch(PUBLISHER + encodeURIComponent(packageName) + "/purchases/subscriptionsv2/tokens/" + encodeURIComponent(purchaseToken), {
    headers: { Authorization: "Bearer " + (await googleAccessToken()) }, redirect: "error", signal: AbortSignal.timeout(10_000)
  });
  if (res.status === 400 || res.status === 404 || res.status === 410) { await res.body?.cancel(); return null; }
  if (!res.ok) { await res.body?.cancel(); throw new Error("google " + res.status); }
  return res.json();
}

// Tells Google the purchase was delivered. Without this, Google refunds it after three days.
export async function acknowledge(packageName, productId, purchaseToken) {
  const res = await fetch(PUBLISHER + encodeURIComponent(packageName) + "/purchases/subscriptions/" + encodeURIComponent(productId) + "/tokens/" + encodeURIComponent(purchaseToken) + ":acknowledge", {
    method: "POST", headers: { Authorization: "Bearer " + (await googleAccessToken()), "Content-Type": "application/json" }, body: "{}",
    redirect: "error", signal: AbortSignal.timeout(10_000)
  });
  await res.body?.cancel();
  return res.ok;
}

// A database function, called with the service key (never with a student's token)
export async function serviceRpc(projectUrl, secretKey, fn, args) {
  const res = await fetch(projectUrl + "/rest/v1/rpc/" + fn, {
    method: "POST", headers: { apikey: secretKey, "Content-Type": "application/json" }, body: JSON.stringify(args),
    redirect: "error", signal: AbortSignal.timeout(6_000)
  });
  if (!res.ok) { await res.body?.cancel(); throw new Error(fn + " " + res.status); }
  return res.status === 204 ? null : res.json();
}

// Checks that a push really comes from Google Pub/Sub: an OIDC token signed by Google, made for this endpoint, for
// the service account the subscription was set up with. Returns true only when every check passes.
let googleKeys = null;
export async function verifyGoogleOidc(token, audience, email) {
  const parts = String(token).split(".");
  if (parts.length !== 3) return false;
  let header, claims;
  try {
    header = JSON.parse(new TextDecoder().decode(fromB64url(parts[0])));
    claims = JSON.parse(new TextDecoder().decode(fromB64url(parts[1])));
  } catch { return false; }
  const now = Date.now() / 1000;
  if (header.alg !== "RS256" || !["accounts.google.com", "https://accounts.google.com"].includes(claims.iss)) return false;
  if (claims.aud !== audience || claims.email !== email || claims.email_verified !== true) return false;
  if (!(Number(claims.exp) > now - 30) || Number(claims.iat) > now + 300) return false;
  if (!googleKeys || googleKeys.at < Date.now() - 3_600_000 || !googleKeys.keys.some((k) => k.kid === header.kid)) {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/certs", { redirect: "error", signal: AbortSignal.timeout(6_000) });
    if (!res.ok) { await res.body?.cancel(); return false; }
    googleKeys = { at: Date.now(), keys: (await res.json()).keys ?? [] };
  }
  const jwk = googleKeys.keys.find((k) => k.kid === header.kid);
  if (!jwk) return false;
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  return crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, fromB64url(parts[2]), new TextEncoder().encode(parts[0] + "." + parts[1]));
}
