// play-rtdn: Google Play's Real-time Developer Notifications, pushed here by Cloud Pub/Sub whenever a subscription
// changes (renewed, cancelled, payment failed, refunded, expired…). A notification is only a hint: this function asks
// the Play Developer API what is true now and records that, so replayed or out-of-order messages can't do harm.
//
// Deploy with JWT verification OFF for this function only (Pub/Sub can't send a Supabase token); it checks Google's
// own signed token instead.
//
// Secrets: GOOGLE_PLAY_SERVICE_ACCOUNT, PLAY_PACKAGE_NAME, PLAY_PRODUCT_IDS (as for play-verify), and
//   RTDN_AUDIENCE                the audience set on the Pub/Sub push subscription (this function's URL)
//   RTDN_SERVICE_ACCOUNT_EMAIL   the service account the push subscription signs its tokens as
//
// Always answers 2xx once a message is understood (so Pub/Sub stops retrying) and 5xx when it should be sent again.
import { defaultSupabaseKey, getSubscription, isRecord, reply, serviceRpc, sha256Hex, summarise, verifyGoogleOidc } from "../_shared/play.ts";

Deno.serve(async (request) => {
  if (request.method !== "POST") return reply({ error: "invalid_request" }, 405);
  const projectUrl = Deno.env.get("SUPABASE_URL");
  const packageName = Deno.env.get("PLAY_PACKAGE_NAME");
  const products = (Deno.env.get("PLAY_PRODUCT_IDS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const audience = Deno.env.get("RTDN_AUDIENCE");
  const sender = Deno.env.get("RTDN_SERVICE_ACCOUNT_EMAIL");
  const secretKey = defaultSupabaseKey("SUPABASE_SECRET_KEYS", "sb_secret_");
  if (!projectUrl || !packageName || !products.length || !audience || !sender || !secretKey) return reply({ error: "temporarily_unavailable" }, 503);

  const bearer = /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "");
  if (!bearer || !(await verifyGoogleOidc(bearer[1], audience, sender).catch(() => false))) return reply({ error: "unauthorized" }, 401);
  if (Number(request.headers.get("content-length")) > 100_000) return reply({ ok: true }); // not a notification; don't ask for it again

  let message, note;
  try {
    message = (await request.json())?.message;
    note = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(message.data), (c) => c.charCodeAt(0))));
  } catch { return reply({ ok: true }); }
  const messageId = typeof message?.messageId === "string" ? message.messageId : null;
  if (!messageId || !isRecord(note) || note.packageName !== packageName) return reply({ ok: true });

  try {
    if (await serviceRpc(projectUrl, secretKey, "zing_billing_rtdn_seen", { p_message_id: messageId, p_mark: false })) return reply({ ok: true });

    const subscription = isRecord(note.subscriptionNotification) ? note.subscriptionNotification : null;
    const voided = isRecord(note.voidedPurchaseNotification) ? note.voidedPurchaseNotification : null;
    const token = subscription?.purchaseToken ?? voided?.purchaseToken;
    if (typeof token === "string" && token.length >= 20) {
      const sub = await getSubscription(packageName, token);
      const facts = sub ? summarise(sub, Date.now()) : null;
      const productId = facts?.productId ?? (typeof subscription?.subscriptionId === "string" ? subscription.subscriptionId : null);
      if (productId && products.includes(productId)) {
        await serviceRpc(projectUrl, secretKey, "zing_billing_apply", {
          p_user_id: null, p_token_hash: await sha256Hex(token), p_product_id: productId, p_base_plan_id: facts?.basePlanId ?? null,
          // a voided purchase (refund or chargeback) and a purchase Google no longer knows both end the entitlement
          p_state: voided ? "revoked" : facts ? facts.state : "expired",
          p_expires_at: facts?.expiresAt ?? null, p_auto_renew: voided ? false : facts?.autoRenew ?? false, p_order_id: facts?.orderId ?? null,
          p_linked_from: facts?.linkedToken ? await sha256Hex(facts.linkedToken) : null
        });
      }
    }
    await serviceRpc(projectUrl, secretKey, "zing_billing_rtdn_seen", { p_message_id: messageId, p_mark: true });
    return reply({ ok: true });
  } catch {
    return reply({ error: "temporarily_unavailable" }, 503); // Pub/Sub will send it again
  }
});
