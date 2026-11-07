// zing-ai-sample: the AI pilot (built first, with sample notes only). It sends one of two preset study texts to
// Gemma 4 on Cloudflare Workers AI and returns four cards for the student to review. Only signed-in students
// who are 13 or older, not guests, with a confirmed email can use it, twice a day each and 30 times a day in all
// (public.ef_ai_sample_quota). Secrets: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (Edge Function secrets).
const SITE_ORIGIN = "https://exam-helper.edgeone.app";
const MAX_REQUEST_BYTES = 128;
const MODEL = "@cf/google/gemma-4-26b-a4b-it";
const SAMPLE_NOTES = {
  photosynthesis: "Photosynthesis is the process by which plants make glucose using light energy. Chlorophyll absorbs light, and most photosynthesis happens in the chloroplasts of leaf cells. The plant takes in carbon dioxide and water. It makes glucose and releases oxygen. Plants use glucose for energy and growth, and can store it as starch.",
  "newton-laws": "Newton's first law says an object stays at rest or keeps moving at a constant velocity unless acted on by a net force. His second law says the net force is the product of mass and acceleration, F = ma. With the same mass, a larger net force gives greater acceleration. His third law says that when one object exerts a force on another, the second object exerts an equal force in the opposite direction on the first."
};
const RESPONSE_HEADERS = {
  "Access-Control-Allow-Origin": SITE_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};
function errorResponse(error, status) {
  return Response.json({
    error
  }, {
    status,
    headers: RESPONSE_HEADERS
  });
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function defaultSupabaseKey(variable, prefix) {
  const keys = JSON.parse(Deno.env.get(variable) ?? "{}");
  const key = isRecord(keys) ? keys.default : null;
  return typeof key === "string" && key.startsWith(prefix) && key.length > prefix.length ? key : null;
}
async function readTopic(request) {
  const mediaType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  const contentLength = Number(request.headers.get("content-length"));
  if (mediaType !== "application/json" || !request.body || contentLength > MAX_REQUEST_BYTES) {
    return null;
  }
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", {
    fatal: true
  });
  let size = 0;
  let body = "";
  try {
    while(true){
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_REQUEST_BYTES) {
        await reader.cancel();
        return null;
      }
      body += decoder.decode(chunk.value, {
        stream: true
      });
    }
    body += decoder.decode();
    const input = JSON.parse(body);
    if (!isRecord(input) || Object.keys(input).length !== 1 || typeof input.topic !== "string" || !Object.hasOwn(SAMPLE_NOTES, input.topic)) return null;
    return input.topic;
  } catch  {
    return null;
  } finally{
    reader.releaseLock();
  }
}
function cardText(value, maxLength) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text && text.length <= maxLength && !/[<>\u0000-\u001f\u007f]/u.test(text) ? text : null;
}
function parseCards(content) {
  const result = JSON.parse(content);
  if (!isRecord(result) || Object.keys(result).length !== 1 || !Array.isArray(result.cards) || result.cards.length !== 4) throw new Error("Unexpected card count");
  const cards = [];
  const questions = new Set();
  for (const card of result.cards){
    if (!isRecord(card) || Object.keys(card).length !== 2) {
      throw new Error("Invalid card format");
    }
    const question = cardText(card.question, 160);
    const answer = cardText(card.answer, 240);
    if (!question || !answer || questions.has(question.toLowerCase())) {
      throw new Error("Invalid card text");
    }
    questions.add(question.toLowerCase());
    cards.push({
      question,
      answer
    });
  }
  return cards;
}
async function generateCards(notes, accountId, token) {
  const url = "https://api.cloudflare.com/client/v4/accounts/" + encodeURIComponent(accountId) + "/ai/v1/chat/completions";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: 'Create exactly four distinct study cards using only the supplied notes. Return a JSON object {"cards":[{"question":"...","answer":"..."}]}. Use concise, single-line plain text for both fields. Ask one question per card. Do not include Markdown or extra keys.'
        },
        {
          role: "user",
          content: notes
        }
      ],
      response_format: {
        type: "json_object"
      },
      chat_template_kwargs: {
        enable_thinking: false
      },
      temperature: 0.2,
      max_completion_tokens: 512
    }),
    redirect: "error",
    signal: AbortSignal.timeout(20_000)
  });
  if (!response.ok) throw new Error("AI request failed: " + response.status);
  const result = await response.json();
  const content = result?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("Missing card output");
  return parseCards(content);
}
Deno.serve(async (request)=>{
  const origin = request.headers.get("origin");
  if (origin && origin !== SITE_ORIGIN) return errorResponse("invalid_request", 403);
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: RESPONSE_HEADERS
    });
  }
  if (request.method !== "POST") return errorResponse("invalid_request", 405);
  const authorization = request.headers.get("authorization") ?? "";
  if (!/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/i.test(authorization)) {
    return errorResponse("unauthorized", 401);
  }
  const topic = await readTopic(request);
  if (!topic) return errorResponse("invalid_request", 400);
  const projectUrl = Deno.env.get("SUPABASE_URL");
  const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
  const token = Deno.env.get("CLOUDFLARE_API_TOKEN");
  if (!projectUrl || !accountId || !token) {
    return errorResponse("temporarily_unavailable", 503);
  }
  try {
    const publishableKey = defaultSupabaseKey("SUPABASE_PUBLISHABLE_KEYS", "sb_publishable_");
    const secretKey = defaultSupabaseKey("SUPABASE_SECRET_KEYS", "sb_secret_");
    if (!publishableKey || !secretKey) return errorResponse("temporarily_unavailable", 503);
    const identityResponse = await fetch(projectUrl + "/auth/v1/user", {
      headers: {
        authorization,
        apikey: publishableKey
      },
      redirect: "error",
      signal: AbortSignal.timeout(5_000)
    });
    if ([
      401,
      403
    ].includes(identityResponse.status)) return errorResponse("unauthorized", 401);
    if (!identityResponse.ok) throw new Error("Auth request failed");
    const identity = await identityResponse.json();
    if (identity?.role !== "authenticated" || typeof identity?.id !== "string") {
      return errorResponse("unauthorized", 401);
    }
    if (identity.is_anonymous === true) return errorResponse("not_eligible", 403);
    // Only a Supabase Auth-verified user ID can be passed to the service-role-only quota RPC.
    const quotaResponse = await fetch(projectUrl + "/rest/v1/rpc/ef_ai_sample_quota", {
      method: "POST",
      headers: {
        apikey: secretKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        p_user_id: identity.id
      }),
      redirect: "error",
      signal: AbortSignal.timeout(5_000)
    });
    if (!quotaResponse.ok) throw new Error("Quota check failed");
    const quota = await quotaResponse.json();
    if (quota === "not_eligible") return errorResponse("not_eligible", 403);
    if (quota === "quota_exceeded") return errorResponse("quota_exceeded", 429);
    if (quota !== "allowed") throw new Error("Unknown quota result");
    const cards = await generateCards(SAMPLE_NOTES[topic], accountId, token);
    return Response.json({
      cards
    }, {
      headers: RESPONSE_HEADERS
    });
  } catch  {
    return errorResponse("temporarily_unavailable", 503);
  }
});
