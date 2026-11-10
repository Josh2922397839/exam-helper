// play-verify: the app sends a Google Play purchase here straight after buying (and on "Restore purchases").
// Nothing the app says is trusted: the purchase is looked up with the Google Play Developer API, recorded with
// public.zing_billing_apply (service key), acknowledged with Google, and only then does the student have Zing Plus.
// Calling it again with the same purchase changes nothing.
//
// Secrets (Supabase -> Edge Functions -> Secrets):
//   GOOGLE_PLAY_SERVICE_ACCOUNT  the service account's JSON key (Play Console -> Users and permissions: view financial
//                                data + manage orders and subscriptions). Never put this in the app or the repository.
//   PLAY_PACKAGE_NAME            the app's application ID, e.g. com.josh.zing
//   PLAY_PRODUCT_IDS             the subscription product IDs that give Zing Plus, comma-separated
//
// POST { product_id, purchase_token } with the student's sign-in -> { state, product_id, expires_at, auto_renew }
import { acknowledge, defaultSupabaseKey, getSubscription, isRecord, obfuscatedAccountId, reply, serviceRpc, sha256Hex, summarise } from "../_shared/play.ts";

const TOKEN = /^[A-Za-z0-9._-]{20,2000}$/;
const PRODUCT = /^[a-z0-9][a-z0-9._]{0,148}$/;

Deno.serve(async (request) => {
  if (request.method !== "POST") return reply({ error: "invalid_request" }, 405);
  const authorization = request.headers.get("authorization") ?? "";
  if (!/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/.test(authorization)) return reply({ error: "unauthorized" }, 401);
  if (Number(request.headers.get("content-length")) > 8_000) return reply({ error: "invalid_request" }, 400);
  let body;
  try { body = await request.json(); } catch { return reply({ error: "invalid_request" }, 400); }
  if (!isRecord(body) || typeof body.product_id !== "string" || !PRODUCT.test(body.product_id) || typeof body.purchase_token !== "string" || !TOKEN.test(body.purchase_token)) {
    return reply({ error: "invalid_request" }, 400);
  }

  const projectUrl = Deno.env.get("SUPABASE_URL");
  const packageName = Deno.env.get("PLAY_PACKAGE_NAME");
  const products = (Deno.env.get("PLAY_PRODUCT_IDS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const publishableKey = defaultSupabaseKey("SUPABASE_PUBLISHABLE_KEYS", "sb_publishable_");
  const secretKey = defaultSupabaseKey("SUPABASE_SECRET_KEYS", "sb_secret_");
  if (!projectUrl || !packageName || !products.length || !publishableKey || !secretKey || !Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT")) {
    return reply({ error: "temporarily_unavailable" }, 503);
  }

  try {
    const who = await fetch(projectUrl + "/auth/v1/user", { headers: { authorization, apikey: publishableKey }, redirect: "error", signal: AbortSignal.timeout(5_000) });
    if (who.status === 401 || who.status === 403) return reply({ error: "unauthorized" }, 401);
    if (!who.ok) throw new Error("auth " + who.status);
    const identity = await who.json();
    if (identity?.role !== "authenticated" || typeof identity?.id !== "string") return reply({ error: "unauthorized" }, 401);
    // a guest account can be lost with the phone; a subscription must belong to an account that can be signed into again
    if (identity.is_anonymous === true) return reply({ error: "not_eligible", reason: "guest" }, 403);

    const sub = await getSubscription(packageName, body.purchase_token);
    if (!sub) return reply({ error: "unknown_purchase" }, 404);
    const facts = summarise(sub, Date.now());
    if (!facts.productId || !products.includes(facts.productId) || facts.productId !== body.product_id) return reply({ error: "wrong_product" }, 422);
    // the purchase must have been made by this account: the app sent Google a hash of the account's ID with it
    if (facts.accountId !== (await obfuscatedAccountId(identity.id))) return reply({ error: "not_your_purchase" }, 403);

    const applied = await serviceRpc(projectUrl, secretKey, "zing_billing_apply", {
      p_user_id: identity.id, p_token_hash: await sha256Hex(body.purchase_token), p_product_id: facts.productId, p_base_plan_id: facts.basePlanId,
      p_state: facts.state, p_expires_at: facts.expiresAt, p_auto_renew: facts.autoRenew, p_order_id: facts.orderId,
      p_linked_from: facts.linkedToken ? await sha256Hex(facts.linkedToken) : null
    });
    if (applied?.status === "token_in_use") return reply({ error: "not_your_purchase" }, 403);
    if (applied?.status !== "applied" && applied?.status !== "kept") throw new Error("apply");

    // only now, with the entitlement safely recorded, is Google told the purchase was delivered
    if (facts.needsAck && ["active", "grace", "canceled_active"].includes(facts.state)) await acknowledge(packageName, facts.productId, body.purchase_token);

    return reply({ state: facts.state, product_id: facts.productId, expires_at: facts.expiresAtMs, auto_renew: facts.autoRenew });
  } catch {
    // nothing about the purchase or the student is logged
    return reply({ error: "temporarily_unavailable" }, 503);
  }
});
