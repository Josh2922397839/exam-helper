// delete-account: deletes a student's Zing account completely, when they ask for it in the app.
//  1. the app's data, with the student's own sign-in (public.ef_delete_me: profile, cloud save, friends, shared decks,
//     appearance and notebook details, blocks, Zing Plus entitlement);
//  2. the sign-in record itself in Supabase Auth, which only the service key can remove. Anything still tied to it is
//     removed by the database's "on delete cascade" rules.
// Safe to call twice: a second call finds nothing left to delete.
//
// POST { confirm: true } with the student's sign-in -> { deleted: true }
const ORIGINS = ["https://exam-helper.edgeone.app"];
const isRecord = (v) => typeof v === "object" && v !== null && !Array.isArray(v);

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin && ORIGINS.includes(origin) ? origin : ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Vary": "Origin", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"
  };
}
const reply = (body, status, headers) => Response.json(body, { status, headers });

function defaultSupabaseKey(variable, prefix) {
  try {
    const keys = JSON.parse(Deno.env.get(variable) ?? "{}");
    const key = isRecord(keys) ? keys.default : null;
    return typeof key === "string" && key.startsWith(prefix) && key.length > prefix.length ? key : null;
  } catch {
    return null;
  }
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);
  if (origin && !ORIGINS.includes(origin)) return reply({ error: "invalid_request" }, 403, headers);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return reply({ error: "invalid_request" }, 405, headers);
  const authorization = request.headers.get("authorization") ?? "";
  if (!/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/.test(authorization)) return reply({ error: "unauthorized" }, 401, headers);
  let body;
  try { body = await request.json(); } catch { body = null; }
  if (!isRecord(body) || body.confirm !== true) return reply({ error: "invalid_request" }, 400, headers);

  const projectUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = defaultSupabaseKey("SUPABASE_PUBLISHABLE_KEYS", "sb_publishable_");
  const secretKey = defaultSupabaseKey("SUPABASE_SECRET_KEYS", "sb_secret_");
  if (!projectUrl || !publishableKey || !secretKey) return reply({ error: "temporarily_unavailable" }, 503, headers);

  try {
    const who = await fetch(projectUrl + "/auth/v1/user", { headers: { authorization, apikey: publishableKey }, redirect: "error", signal: AbortSignal.timeout(5_000) });
    if (who.status === 401 || who.status === 403) return reply({ error: "unauthorized" }, 401, headers);
    if (!who.ok) throw new Error("auth " + who.status);
    const identity = await who.json();
    if (identity?.role !== "authenticated" || typeof identity?.id !== "string" || !/^[0-9a-f-]{36}$/.test(identity.id)) return reply({ error: "unauthorized" }, 401, headers);

    // 1. the app's data, as the student (the function only ever deletes the caller's own rows)
    const data = await fetch(projectUrl + "/rest/v1/rpc/ef_delete_me", {
      method: "POST", headers: { authorization, apikey: publishableKey, "Content-Type": "application/json" }, body: "{}",
      redirect: "error", signal: AbortSignal.timeout(8_000)
    });
    await data.body?.cancel();
    if (!data.ok) return reply({ error: "delete_failed" }, 502, headers);

    // 2. the sign-in record
    const gone = await fetch(projectUrl + "/auth/v1/admin/users/" + identity.id, {
      method: "DELETE", headers: { apikey: secretKey, Authorization: "Bearer " + secretKey, "Content-Type": "application/json" },
      body: JSON.stringify({ should_soft_delete: false }), redirect: "error", signal: AbortSignal.timeout(8_000)
    });
    await gone.body?.cancel();
    if (!gone.ok && gone.status !== 404) return reply({ error: "auth_delete_failed" }, 502, headers);
    return reply({ deleted: true }, 200, headers);
  } catch {
    return reply({ error: "temporarily_unavailable" }, 503, headers);
  }
});
