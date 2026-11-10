package com.josh.zing

import android.app.Application
import android.content.Context
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.josh.zing.data.local.SecretBox
import com.josh.zing.data.local.Settings
import com.josh.zing.data.local.ZingDatabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.put
import mockwebserver3.Dispatcher
import mockwebserver3.MockResponse
import mockwebserver3.MockWebServer
import mockwebserver3.RecordedRequest
import okhttp3.Headers
import java.io.File
import java.util.UUID
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.atomic.AtomicInteger

/** The application used in tests: no real container is built, so nothing touches the network or the Keystore. */
class TestApp : Application()

/** Session "encryption" for tests (the Android Keystore doesn't exist off a device). */
class PlainBox : SecretBox {
    override fun seal(plain: String) = "sealed:$plain"
    override fun open(sealed: String): String? = sealed.removePrefix("sealed:").takeIf { sealed.startsWith("sealed:") }
}

data class Call(val path: String, val body: JsonObject, val auth: String?)

/**
 * A pretend Supabase project: Auth, the ef_* functions the app calls and the Edge Functions, with just enough
 * behaviour to exercise the app end to end. It keeps one user's cloud save in memory, like the real `saves` table.
 */
class FakeZing {
    val server = MockWebServer()
    val calls = CopyOnWriteArrayList<Call>()
    val json = Json { ignoreUnknownKeys = true }

    // ---- state the tests can set up and inspect
    @Volatile var save: JsonObject? = null
    @Volatile var profile: JsonObject? = null
    @Volatile var prefs: JsonElement = JsonNull
    @Volatile var prefsRev = 0L
    @Volatile var xpTotal = 0
    val xpOps = HashSet<String>()
    /** Functions that aren't deployed yet (the Android migration not applied). */
    val missing = HashSet<String>()
    /** Paths that should fail with this status once, then work. */
    val failOnce = HashMap<String, Int>()
    @Volatile var offline = false
    @Volatile var refreshRevoked = false
    @Volatile var userDeleted = false
    @Volatile var aiStatus = buildJsonObject { put("eligible", true); put("left", 5) }
    @Volatile var aiCards: JsonObject? = null
    @Volatile var aiAnswer: JsonObject? = null
    @Volatile var aiError: Pair<Int, String>? = null
    private val tokens = AtomicInteger(0)
    var userId = "11111111-1111-4111-8111-111111111111"
    var anonymous = false
    var identities = listOf("google")

    val url: String get() = server.url("/").toString().trimEnd('/')

    fun start(): FakeZing { server.dispatcher = dispatcher; server.start(); return this }
    fun stop() = server.close()
    fun called(path: String) = calls.filter { it.path.endsWith(path) || it.path.substringBefore('?').endsWith(path) || (path.contains('=') && it.path.contains(path)) }

    private fun ok(body: JsonElement) = MockResponse(200, Headers.headersOf("Content-Type", "application/json"), body.toString())
    private fun error(status: Int, body: JsonObject) = MockResponse(status, Headers.headersOf("Content-Type", "application/json"), body.toString())

    fun sessionJson(): JsonObject = buildJsonObject {
        val n = tokens.incrementAndGet()
        put("access_token", "access-$n"); put("refresh_token", "refresh-$n"); put("expires_in", 3600); put("expires_at", System.currentTimeMillis() / 1000 + 3600)
        put("user", userJson())
    }

    private fun userJson() = buildJsonObject {
        put("id", userId); put("is_anonymous", anonymous)
        if (!anonymous) { put("email", "student@example.com"); put("email_confirmed_at", "2026-01-01T00:00:00Z") }
        put("identities", buildJsonArray { if (!anonymous) identities.forEach { add(buildJsonObject { put("provider", it) }) } })
    }

    fun meJson(onboarded: Boolean = true, username: String = "AnaB482") = buildJsonObject {
        put("id", userId); put("username", username); put("avatar", "fox"); put("grade", 10); put("league", 2); put("name", "Ana B.")
        put("xp_total", xpTotal); put("xp_week", xpTotal); put("first_name", "Ana"); put("last_name", "Brown"); put("age", 15)
        put("findable", true); put("reminders", false); put("onboarded", onboarded); put("referrals", 0); put("deck_saves", 0)
    }

    private val dispatcher = object : Dispatcher() {
        override fun dispatch(request: RecordedRequest): MockResponse {
            val path = request.url.encodedPath
            val body = runCatching { json.parseToJsonElement(request.body?.utf8().orEmpty()).jsonObject }.getOrDefault(JsonObject(emptyMap()))
            calls += Call(path + (request.url.encodedQuery?.let { "?$it" } ?: ""), body, request.headers["Authorization"])
            failOnce.remove(path)?.let { return error(it, buildJsonObject { put("message", "try later") }) }
            return when {
                path == "/auth/v1/settings" -> ok(buildJsonObject { put("external", buildJsonObject { put("google", true); put("email", true); put("anonymous_users", true) }); put("disable_signup", false) })
                path == "/auth/v1/signup" -> { anonymous = true; ok(sessionJson()) }
                path == "/auth/v1/otp" -> ok(JsonObject(emptyMap()))
                path == "/auth/v1/verify" -> if ((body["token"] as? JsonPrimitive)?.content == "123456") { anonymous = false; identities = listOf("email"); ok(sessionJson()) } else error(403, buildJsonObject { put("error_code", "otp_expired") })
                path == "/auth/v1/token" -> when (request.url.queryParameter("grant_type")) {
                    "refresh_token" -> if (refreshRevoked) error(400, buildJsonObject { put("error_code", "refresh_token_not_found") }) else ok(sessionJson())
                    "id_token" -> { anonymous = false; identities = (identities + "google").distinct(); ok(sessionJson()) }
                    "pkce" -> { anonymous = false; ok(sessionJson()) }
                    else -> error(400, buildJsonObject { put("error_code", "validation_failed") })
                }
                path == "/auth/v1/user" -> if (userDeleted) error(403, buildJsonObject { put("error_code", "user_not_found") }) else ok(userJson())
                path == "/auth/v1/logout" -> MockResponse(204, Headers.headersOf(), "")
                path.startsWith("/rest/v1/rpc/") -> rpc(path.removePrefix("/rest/v1/rpc/"), body)
                path.startsWith("/functions/v1/") -> function(path.removePrefix("/functions/v1/"), body)
                else -> error(404, buildJsonObject { put("message", "not found") })
            }
        }
    }

    private fun rpc(fn: String, body: JsonObject): MockResponse {
        if (fn in missing) return error(404, buildJsonObject { put("code", "PGRST202"); put("message", "Could not find the function public.$fn") })
        return when (fn) {
            "ef_me" -> ok(profile ?: JsonNull)
            "ef_onboard" -> { profile = meJson(); ok(profile!!) }
            "ef_save_profile" -> { profile = JsonObject(profile.orEmpty() + ("username" to body["p_username"]!!)); ok(profile!!) }
            "ef_save_get" -> ok(save ?: JsonNull)
            "ef_save_put" -> { save = body["p_data"] as JsonObject; ok(buildJsonObject { put("saved_at", "now") }) }
            "ef_add_xp" -> { xpTotal += (body["p_n"] as JsonPrimitive).content.toInt(); ok(buildJsonObject { put("added", 1); put("xp_total", xpTotal) }) }
            "ef_add_xp2" -> {
                val fresh = xpOps.add((body["p_op"] as JsonPrimitive).content)
                if (fresh) xpTotal += (body["p_n"] as JsonPrimitive).content.toInt()
                ok(buildJsonObject { put("added", if (fresh) 1 else 0); put("xp_total", xpTotal); put("duplicate", !fresh) })
            }
            "ef_prefs_get" -> ok(buildJsonObject { put("data", prefs); put("rev", prefsRev) })
            "ef_prefs_put" -> if ((body["p_base_rev"] as JsonPrimitive).content.toLong() != prefsRev) ok(buildJsonObject { put("data", prefs); put("rev", prefsRev); put("conflict", true) })
                else { prefs = body["p_data"]!!; prefsRev++; ok(buildJsonObject { put("data", prefs); put("rev", prefsRev); put("conflict", false) }) }
            "ef_entitlement" -> ok(buildJsonObject { put("state", "none") })
            "ef_delete_me" -> { profile = null; save = null; ok(buildJsonObject { put("deleted", true) }) }
            "ef_blocked" -> ok(JsonArray(emptyList()))
            "ef_report" -> ok(buildJsonObject { put("ok", true) })
            "ef_search_schools" -> ok(buildJsonArray { add(buildJsonObject { put("id", 1); put("name", "Kingston College"); put("region", "Kingston"); put("members", 4) }) })
            "ef_league_board" -> ok(buildJsonObject { put("league", 2); put("rows", buildJsonArray { add(buildJsonObject { put("rank", 1); put("username", "AnaB482"); put("xp", 120); put("me", true) }) }); put("promote", 1); put("demote", 0) })
            else -> error(404, buildJsonObject { put("code", "PGRST202"); put("message", "no $fn") })
        }
    }

    private fun function(name: String, body: JsonObject): MockResponse {
        if (name in missing) return error(404, buildJsonObject { put("code", "NOT_FOUND"); put("message", "Requested function was not found") })
        return when (name) {
            "zing-ai" -> {
                aiError?.let { (status, code) -> return error(status, buildJsonObject { put("error", code) }) }
                when ((body["action"] as? JsonPrimitive)?.content) {
                    "status" -> ok(aiStatus)
                    "cards" -> ok(aiCards ?: buildJsonObject { put("cards", JsonArray(emptyList())); put("title", ""); put("left", 4) })
                    "answer" -> ok(aiAnswer ?: buildJsonObject { put("found", false); put("answer", ""); put("citations", JsonArray(emptyList())) })
                    else -> error(400, buildJsonObject { put("error", "invalid_request") })
                }
            }
            "delete-account" -> { profile = null; save = null; userDeleted = true; ok(buildJsonObject { put("deleted", true) }) }
            "play-verify" -> ok(buildJsonObject { put("state", "active"); put("product_id", "zing_plus_test"); put("expires_at", System.currentTimeMillis() + 86_400_000L); put("auto_renew", true) })
            else -> error(404, buildJsonObject { put("code", "NOT_FOUND") })
        }
    }
}

/** A complete app object graph for a test: in-memory database, fresh settings files, and the pretend server. */
class TestEnv(val fake: FakeZing = FakeZing().start(), var clock: Long = 1_780_000_000_000L) {
    val context: Context = ApplicationProvider.getApplicationContext()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val dir = File(context.cacheDir, "test-" + UUID.randomUUID()).apply { mkdirs() }
    val db: ZingDatabase = Room.inMemoryDatabaseBuilder(context, ZingDatabase::class.java).allowMainThreadQueries().build()
    private val settings = Settings(
        PreferenceDataStoreFactory.create(scope = scope) { File(dir, "settings.preferences_pb") },
        PreferenceDataStoreFactory.create(scope = scope) { File(dir, "session.preferences_pb") },
        PlainBox(),
    )
    /** "Offline" is a request that never leaves the phone, exactly what a missing connection looks like to OkHttp. */
    private val client = okhttp3.OkHttpClient.Builder().addInterceptor { chain -> if (fake.offline) throw java.io.IOException("no network") else chain.proceed(chain.request()) }.build()
    val c = AppContainer(context, db = db, box = PlainBox(), http = com.josh.zing.data.remote.Http(client), baseUrl = fake.url, publishableKey = "sb_publishable_test", now = { clock }, settingsOverride = settings)

    fun close(closeDatabase: Boolean = true) { if (closeDatabase) runCatching { db.close() }; scope.cancel(); fake.stop(); dir.deleteRecursively() }
}
