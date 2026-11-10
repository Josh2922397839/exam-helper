package com.josh.zing.data.remote

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.longOrNull
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonObject
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.Request

data class AuthProviders(val google: Boolean = false, val email: Boolean = false, val guest: Boolean = false)

/**
 * Supabase Auth (GoTrue) over its REST API: the same endpoints the website's supabase-js client calls.
 * [publishableKey] is the public key that also ships in the website; it only allows what the server's rules allow.
 */
class SupabaseAuth(private val http: Http, baseUrl: String, private val publishableKey: String, private val nowSeconds: () -> Long = { System.currentTimeMillis() / 1000 }) {
    private val base = baseUrl.trimEnd('/') + "/auth/v1"

    private fun request(path: String, token: String? = null, query: Map<String, String> = emptyMap()): Request.Builder {
        val url = (base + path).toHttpUrl().newBuilder().apply { query.forEach { (k, v) -> addQueryParameter(k, v) } }.build()
        return Request.Builder().url(url).header("apikey", publishableKey).apply { token?.let { header("Authorization", "Bearer $it") } }
    }

    private fun fail(r: HttpResult): Nothing {
        val o = http.parse(r.body) as? JsonObject
        val code = Http.str(o, "error_code") ?: Http.str(o, "error") ?: Http.str(o, "code") ?: r.status.toString()
        throw ApiException(code, r.status, message(code))
    }

    private suspend fun post(path: String, body: JsonObject, token: String? = null, query: Map<String, String> = emptyMap()): JsonObject {
        val r = http.send(request(path, token, query).post(Http.body(body)).build())
        if (r.status !in 200..299) fail(r)
        return http.parse(r.body) as? JsonObject ?: JsonObject(emptyMap())
    }

    private fun session(o: JsonObject): Session {
        val user = o["user"] as? JsonObject ?: throw ApiException("no_session", 200, message("no_session"))
        val access = Http.str(o, "access_token") ?: throw ApiException("no_session", 200, message("no_session"))
        val refresh = Http.str(o, "refresh_token") ?: throw ApiException("no_session", 200, message("no_session"))
        val expiresAt = (o["expires_at"] as? JsonPrimitive)?.longOrNull ?: (nowSeconds() + ((o["expires_in"] as? JsonPrimitive)?.longOrNull ?: 3600))
        return session(user, access, refresh, expiresAt)
    }

    private fun session(user: JsonObject, access: String, refresh: String, expiresAt: Long): Session {
        val identities = (user["identities"] as? JsonArray).orEmpty().mapNotNull { Http.str(it as? JsonObject, "provider") }
        return Session(
            accessToken = access, refreshToken = refresh, expiresAt = expiresAt,
            userId = Http.str(user, "id") ?: throw ApiException("no_session", 200, message("no_session")),
            anonymous = (user["is_anonymous"] as? JsonPrimitive)?.booleanOrNull ?: false,
            email = Http.str(user, "email")?.takeIf { it.isNotBlank() },
            emailConfirmed = user["email_confirmed_at"].let { it != null && it !is JsonNull },
            providers = identities.distinct(),
        )
    }

    private val noCaptcha: JsonObject.() -> Unit = { }

    /** Which sign-in options the project has switched on (the same check the website makes). */
    suspend fun providers(): AuthProviders {
        val r = http.sendWithRetry { request("/settings").get().build() }
        if (r.status !in 200..299) fail(r)
        val o = http.parse(r.body) as? JsonObject
        val ext = o?.get("external") as? JsonObject
        fun on(k: String) = (ext?.get(k) as? JsonPrimitive)?.booleanOrNull == true
        val signupOff = (o?.get("disable_signup") as? JsonPrimitive)?.booleanOrNull == true
        return AuthProviders(google = on("google"), email = on("email") && !signupOff, guest = on("anonymous_users"))
    }

    /** A guest account: a private anonymous user, exactly like the website's "continue as a guest". */
    suspend fun signInAnonymously(): Session = session(post("/signup", buildJsonObject { putJsonObject("data") {}; putJsonObject("gotrue_meta_security") {} }))

    /**
     * Exchanges a Google ID token for a session. [rawNonce] is the nonce whose SHA-256 was given to Google.
     * With [linkTo] (the current session's token) Google is attached to that account instead of signing in afresh.
     */
    suspend fun signInWithGoogle(idToken: String, rawNonce: String, linkTo: String? = null): Session = session(
        post("/token", buildJsonObject {
            put("provider", "google"); put("id_token", idToken); put("nonce", rawNonce)
            if (linkTo != null) put("link_identity", true)
            putJsonObject("gotrue_meta_security") {}
        }, token = linkTo, query = mapOf("grant_type" to "id_token")),
    )

    /** Emails a sign-in link and code. PKCE: only this app, holding the verifier, can finish the sign-in. */
    suspend fun sendEmailOtp(email: String, codeChallenge: String, redirectTo: String) {
        post("/otp", buildJsonObject {
            put("email", email); put("create_user", true); putJsonObject("data") {}
            put("code_challenge", codeChallenge); put("code_challenge_method", "s256")
            putJsonObject("gotrue_meta_security") {}
        }, query = mapOf("redirect_to" to redirectTo))
    }

    /** Adds an email address to the account already on this device (a guest keeps their progress). */
    suspend fun linkEmail(token: String, email: String, codeChallenge: String, redirectTo: String) {
        val body = buildJsonObject { put("email", email); put("code_challenge", codeChallenge); put("code_challenge_method", "s256") }
        val r = http.send(request("/user", token, mapOf("redirect_to" to redirectTo)).put(Http.body(body)).build())
        if (r.status !in 200..299) fail(r)
    }

    suspend fun verifyEmailCode(email: String, code: String): Session =
        session(post("/verify", buildJsonObject { put("email", email); put("token", code); put("type", "email"); putJsonObject("gotrue_meta_security") {} }))

    suspend fun exchangeCode(authCode: String, codeVerifier: String): Session =
        session(post("/token", buildJsonObject { put("auth_code", authCode); put("code_verifier", codeVerifier) }, query = mapOf("grant_type" to "pkce")))

    suspend fun refresh(refreshToken: String): Session =
        session(post("/token", buildJsonObject { put("refresh_token", refreshToken) }, query = mapOf("grant_type" to "refresh_token")))

    /** Re-reads the user (after linking, or to notice a deleted account). Keeps the current tokens. */
    suspend fun user(current: Session): Session {
        val r = http.sendWithRetry { request("/user", current.accessToken).get().build() }
        if (r.status !in 200..299) fail(r)
        val user = http.parse(r.body) as? JsonObject ?: throw ApiException("no_session", r.status, message("no_session"))
        return session(user, current.accessToken, current.refreshToken, current.expiresAt)
    }

    /** [everywhere] also ends this account's sessions on other devices (the website's sign-out does that). */
    suspend fun signOut(token: String, everywhere: Boolean) {
        runCatching { http.send(request("/logout", token, mapOf("scope" to if (everywhere) "global" else "local")).post(Http.body(JsonObject(emptyMap()))).build()) }
    }

    companion object {
        /** The website's own wording for sign-in problems (assets/js/core/account-auth.js), so both apps say the same. */
        fun message(code: String): String = when {
            Regex("identity_already_exists|email_exists|user_already_exists").containsMatchIn(code) ->
                "That sign-in belongs to another account. Your current profile is unchanged. Save its transfer code before signing into a different account."
            "manual_linking_disabled" in code -> "Account linking is not available yet. Your current profile and progress are safe."
            Regex("provider_disabled|validation_failed|anonymous_provider_disabled|email_provider_disabled").containsMatchIn(code) ->
                "This sign-in option is not available yet. You can continue with your current profile."
            Regex("bad_code_verifier|flow_state|otp_expired|invalid_grant|bad_code").containsMatchIn(code) -> "That sign-in link or code expired. Ask for a new one and try again."
            Regex("over_email_send_rate_limit|over_request_rate_limit|rate_limit").containsMatchIn(code) -> "Too many tries. Wait a little while, then try again."
            Regex("email_address_not_authorized").containsMatchIn(code) -> "Email sign-in isn't open to everyone yet. Use Google, or continue as a guest for now."
            Regex("email_address_invalid").containsMatchIn(code) -> "That email address doesn't look right. Check it and try again."
            Regex("user_not_found|session_not_found|bad_jwt|no_session").containsMatchIn(code) -> "You've been signed out. Sign in again to carry on; your study progress is still on this device."
            else -> "Could not finish sign-in. Check your connection and try again. Your saved progress is still on this device."
        }

        @Suppress("unused") private fun unused(e: JsonElement) = e
    }
}
