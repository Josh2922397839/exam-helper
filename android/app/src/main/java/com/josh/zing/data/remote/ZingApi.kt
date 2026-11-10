package com.josh.zing.data.remote

import kotlinx.serialization.KSerializer
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonObjectBuilder
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import okhttp3.Request

@Serializable
data class SchoolDto(
    val id: Long = 0, val name: String = "", val region: String? = null, val country: String? = null, val kind: String? = null,
    val group: String? = null, val logo: String? = null, @SerialName("logo_kind") val logoKind: String? = null,
    val members: Int? = null, val xp: Long? = null, val rank: Int? = null, @SerialName("xp_week") val xpWeek: Long? = null, val friends: Int? = null,
)

/** Your own profile: what others can see, plus the private setup answers only you get back. */
@Serializable
data class MeDto(
    val id: String = "", val username: String = "", val avatar: String? = null, val grade: Int? = null, val league: Int = 1, val name: String? = null,
    val followers: Int = 0, val following: Int = 0, @SerialName("school_rank") val schoolRank: Int? = null, @SerialName("friends_rank") val friendsRank: Int? = null,
    @SerialName("xp_total") val xpTotal: Long = 0, @SerialName("xp_week") val xpWeek: Long = 0, val school: SchoolDto? = null,
    @SerialName("has_code") val hasCode: Boolean = false, @SerialName("week_ends") val weekEnds: String? = null,
    @SerialName("first_name") val firstName: String? = null, @SerialName("last_name") val lastName: String? = null, val age: Int? = null,
    val purpose: String? = null, val findable: Boolean = false, val reminders: Boolean = false, val onboarded: Boolean = false,
    val referrals: Int = 0, @SerialName("deck_saves") val deckSaves: Int = 0,
)

@Serializable
data class ProfileDto(
    val username: String = "", val avatar: String? = null, val grade: Int? = null, val league: Int = 1, val name: String? = null,
    val followers: Int = 0, val following: Int = 0, @SerialName("xp_total") val xpTotal: Long = 0, @SerialName("xp_week") val xpWeek: Long = 0,
    val school: SchoolDto? = null, val online: Boolean = false, val me: Boolean = false,
    @SerialName("i_follow") val iFollow: Boolean = false, @SerialName("follows_me") val followsMe: Boolean = false,
)

@Serializable
data class PersonDto(
    val username: String = "", val avatar: String? = null, val grade: Int? = null, val league: Int = 1, val name: String? = null, val school: String? = null,
    @SerialName("xp_week") val xpWeek: Long = 0, @SerialName("xp_total") val xpTotal: Long = 0, val online: Boolean = false,
    @SerialName("i_follow") val iFollow: Boolean = false, @SerialName("follows_me") val followsMe: Boolean = false,
)

@Serializable
data class BoardRow(
    val rank: Int = 0, val username: String = "", val avatar: String? = null, val school: String? = null, val xp: Long = 0,
    val me: Boolean = false, val friend: Boolean = false, val grade: Int? = null, val league: Int? = null, val name: String? = null,
)

@Serializable
data class LeagueBoardDto(
    val league: Int = 1, val rows: List<BoardRow> = emptyList(), val total: Int = 0, @SerialName("my_rank") val myRank: Int? = null,
    val promote: Int = 0, val demote: Int = 0, @SerialName("week_ends") val weekEnds: String? = null,
)

@Serializable data class SchoolBoardDto(val school: SchoolDto = SchoolDto(), val period: String = "week", val rows: List<BoardRow> = emptyList())
@Serializable data class SchoolsBoardDto(val rows: List<SchoolDto> = emptyList())
@Serializable data class FriendsBoardDto(val rows: List<BoardRow> = emptyList())
@Serializable data class BrowseSchoolsDto(val rows: List<SchoolDto> = emptyList(), val total: Int = 0)

@Serializable
data class SharedDeckDto(
    val id: String = "", val name: String = "", val color: String? = null, val cards: JsonArray = JsonArray(emptyList()), val saves: Int = 0,
    val author: String? = null, val school: String? = null, val mine: Boolean = false, val listed: Boolean = false,
)

@Serializable
data class SchoolSetDto(
    val id: String = "", val name: String = "", val color: String? = null, @SerialName("card_count") val cardCount: Int = 0, val saves: Int = 0,
    val author: String? = null, val mine: Boolean = false,
)

@Serializable data class DeckBoardRow(val rank: Int = 0, val xp: Long = 0, val username: String = "", val avatar: String? = null, val name: String? = null, val me: Boolean = false)
@Serializable data class DeckBoardDto(val name: String = "", val saves: Int = 0, val mine: Boolean = false, val rows: List<DeckBoardRow> = emptyList())

@Serializable data class XpDto(val added: Int = 0, @SerialName("xp_week") val xpWeek: Long = 0, @SerialName("xp_total") val xpTotal: Long = 0, val league: Int = 1, val duplicate: Boolean = false)
@Serializable data class PrefsDto(val data: JsonElement? = null, val rev: Long = 0, val conflict: Boolean = false)
@Serializable data class EntitlementDto(val state: String = "none", @SerialName("product_id") val productId: String? = null, @SerialName("expires_at") val expiresAt: Long? = null, @SerialName("auto_renew") val autoRenew: Boolean = false)

@Serializable data class AiStatusDto(val eligible: Boolean = false, val left: Int = 0)
@Serializable data class AiCardDto(val q: String = "", val a: String = "", val wrong: List<String> = emptyList(), val why: String = "")
@Serializable data class AiCardsDto(val cards: List<AiCardDto> = emptyList(), val title: String = "", val left: Int = 0, val transcript: String? = null, val page: String? = null, val pageTitle: String? = null)
@Serializable data class AiCitationDto(val ref: String = "", val quote: String = "")
@Serializable data class AiAnswerDto(val found: Boolean = false, val answer: String = "", val citations: List<AiCitationDto> = emptyList(), val left: Int = 0)

/**
 * Zing's backend: the `ef_*` database functions and the Edge Functions. These are the website's own calls; nothing
 * here reads or writes a table directly.
 */
class ZingApi(private val http: Http, baseUrl: String, private val publishableKey: String, private val sessions: SessionManager) {
    private val base = baseUrl.trimEnd('/')

    private suspend fun request(url: String, body: JsonElement, token: String?): Request =
        Request.Builder().url(url).header("apikey", publishableKey).apply { token?.let { header("Authorization", "Bearer $it") } }.post(Http.body(body)).build()

    private fun fail(r: HttpResult): Nothing {
        val o = http.parse(r.body) as? JsonObject
        val code = Http.str(o, "code") ?: Http.str(o, "error") ?: r.status.toString()
        // Messages raised by the ef_* functions are written for students; anything else gets a general message.
        val message = Http.str(o, "message")?.takeIf { code in STUDENT_CODES && it.length <= 200 }
            ?: if (r.status == 429) "Too many tries. Wait a little while, then try again." else "Something went wrong. Try again."
        throw ApiException(code, r.status, message, o)
    }

    /**
     * Calls a database function. [idempotent] calls are retried on network trouble; others are sent once.
     * An expired token is refreshed and the call repeated once.
     */
    suspend fun rpc(fn: String, idempotent: Boolean = true, args: JsonObjectBuilder.() -> Unit = {}): JsonElement {
        val body = buildJsonObject(args)
        val url = "$base/rest/v1/rpc/$fn"
        var forced = false
        while (true) {
            val token = sessions.accessToken(forceRefresh = forced)
            val r = if (idempotent) http.sendWithRetry { request(url, body, token) } else http.send(request(url, body, token))
            if (r.status == 401 && token != null && !forced) { forced = true; continue }
            if (r.status !in 200..299) fail(r)
            val out = http.parse(r.body)
            // some functions report a problem as { error: "…" } so the attempt still counts (see ef_claim)
            ((out as? JsonObject)?.get("error") as? JsonPrimitive)?.takeIf { it.isString }?.let { throw ApiException("refused", 200, it.content.take(200)) }
            return out
        }
    }

    /** A reply that isn't the expected shape is reported as a server problem, never allowed to crash the caller. */
    private fun <T> decode(s: KSerializer<T>, e: JsonElement): T = try {
        http.json.decodeFromJsonElement(s, e)
    } catch (x: kotlinx.serialization.SerializationException) {
        throw ApiException("bad_response", 502, "Something went wrong. Try again.")
    } catch (x: IllegalArgumentException) {
        throw ApiException("bad_response", 502, "Something went wrong. Try again.")
    }
    private fun <T> decodeOrNull(s: KSerializer<T>, e: JsonElement): T? = if (e is JsonNull) null else decode(s, e)

    /** Calls an Edge Function with the student's own sign-in. Errors carry the function's code (quota_exceeded…). */
    suspend fun function(name: String, body: JsonObject, retry: Boolean = false): JsonObject {
        val token = sessions.accessToken() ?: throw ApiException("unauthorized", 401, "Sign in to use this.")
        val url = "$base/functions/v1/$name"
        val r = if (retry) http.sendWithRetry { request(url, body, token) } else http.send(request(url, body, token))
        val o = http.parse(r.body) as? JsonObject
        if (r.status !in 200..299) {
            val code = Http.str(o, "error") ?: Http.str(o, "code") ?: r.status.toString()
            throw ApiException(code, r.status, "That didn't work. Try again.", o)
        }
        return o ?: JsonObject(emptyMap())
    }

    // ---------------------------------------------------------------- you
    suspend fun me(): MeDto? = decodeOrNull(MeDto.serializer(), rpc("ef_me"))
    suspend fun onboard(p: JsonObject): MeDto = decode(MeDto.serializer(), rpc("ef_onboard") { put("p", p) })
    suspend fun setPrefs(findable: Boolean?, reminders: Boolean?): MeDto = decode(MeDto.serializer(), rpc("ef_set_prefs") {
        put("p", buildJsonObject { findable?.let { put("findable", it) }; reminders?.let { put("reminders", it) } })
    })
    suspend fun saveProfile(username: String, school: Long?, grade: Int?, avatar: String?): MeDto = decode(MeDto.serializer(), rpc("ef_save_profile") {
        put("p_username", username); put("p_school", school); put("p_grade", grade); put("p_avatar", avatar)
    })
    suspend fun usernameFree(name: String): Boolean = (rpc("ef_username_free") { put("p_username", name) } as? JsonPrimitive)?.content == "true"
    suspend fun transferCode(): String = Http.str(rpc("ef_transfer_code", idempotent = false) as? JsonObject, "code").orEmpty()
    suspend fun claim(code: String): MeDto = decode(MeDto.serializer(), rpc("ef_claim", idempotent = false) { put("p_code", code) })
    suspend fun deleteMe() { rpc("ef_delete_me") }

    // ---------------------------------------------------------------- XP and the cloud save
    suspend fun addXp(n: Int): XpDto = decode(XpDto.serializer(), rpc("ef_add_xp", idempotent = false) { put("p_n", n) })
    /** XP with an operation ID: sending the same batch twice counts once (needs the Android migration). */
    suspend fun addXp(n: Int, op: String): XpDto = decode(XpDto.serializer(), rpc("ef_add_xp2") { put("p_n", n); put("p_op", op) })
    suspend fun saveGet(): JsonElement = rpc("ef_save_get")
    suspend fun savePut(data: JsonObject) { rpc("ef_save_put") { put("p_data", data) } }
    suspend fun prefsGet(): PrefsDto = decode(PrefsDto.serializer(), rpc("ef_prefs_get"))
    suspend fun prefsPut(data: JsonElement, baseRev: Long): PrefsDto = decode(PrefsDto.serializer(), rpc("ef_prefs_put") { put("p_data", data); put("p_base_rev", baseRev) })
    suspend fun entitlement(): EntitlementDto = decode(EntitlementDto.serializer(), rpc("ef_entitlement"))

    // ---------------------------------------------------------------- schools
    suspend fun searchSchools(q: String, country: String?): List<SchoolDto> = decode(ListSerializer(SchoolDto.serializer()), rpc("ef_search_schools") { put("p_q", q); put("p_country", country) })
    suspend fun browseSchools(country: String, region: String?, group: String?, offset: Int): BrowseSchoolsDto =
        decode(BrowseSchoolsDto.serializer(), rpc("ef_browse_schools") { put("p_country", country); put("p_region", region); put("p_group", group); put("p_offset", offset) })
    suspend fun addSchool(name: String, country: String, region: String?): SchoolDto =
        decode(SchoolDto.serializer(), rpc("ef_add_school", idempotent = false) { put("p_name", name); put("p_country", country); put("p_region", region) })

    // ---------------------------------------------------------------- leaderboards and friends
    suspend fun leagueBoard(): LeagueBoardDto? = decodeOrNull(LeagueBoardDto.serializer(), rpc("ef_league_board"))
    suspend fun schoolBoard(id: Long, period: String): SchoolBoardDto? = decodeOrNull(SchoolBoardDto.serializer(), rpc("ef_school_board") { put("p_school", id); put("p_period", period) })
    suspend fun schoolsBoard(country: String?): SchoolsBoardDto = decode(SchoolsBoardDto.serializer(), rpc("ef_schools_board") { put("p_country", country) })
    suspend fun friendsBoard(): FriendsBoardDto = decode(FriendsBoardDto.serializer(), rpc("ef_friends_board"))
    suspend fun profile(username: String): ProfileDto? = decodeOrNull(ProfileDto.serializer(), rpc("ef_profile") { put("p_username", username) })
    suspend fun follow(username: String) { rpc("ef_follow") { put("p_username", username) } }
    suspend fun unfollow(username: String) { rpc("ef_unfollow") { put("p_username", username) } }
    suspend fun suggest(q: String?): List<PersonDto> = decode(ListSerializer(PersonDto.serializer()), rpc("ef_suggest") { put("p_q", q); put("p_school_only", false) })

    // ---------------------------------------------------------------- shared decks
    suspend fun deckShare(id: String?, name: String, color: String, cards: JsonArray, listed: Boolean): String =
        Http.str(rpc("ef_deck_share") { put("p_id", id); put("p_name", name); put("p_color", color); put("p_cards", cards); put("p_listed", listed) } as? JsonObject, "id").orEmpty()
    suspend fun sharedDeck(id: String): SharedDeckDto? = decodeOrNull(SharedDeckDto.serializer(), rpc("ef_set_get") { put("p_id", id) })
    suspend fun sharedSaved(id: String) { rpc("ef_set_saved") { put("p_id", id) } }
    suspend fun sharedDelete(id: String) { rpc("ef_set_delete") { put("p_id", id) } }
    suspend fun schoolSets(school: Long): List<SchoolSetDto> = decode(ListSerializer(SchoolSetDto.serializer()), rpc("ef_school_sets") { put("p_school", school) })
    suspend fun deckBoard(id: String): DeckBoardDto? = decodeOrNull(DeckBoardDto.serializer(), rpc("ef_deck_board") { put("p_id", id) })
    suspend fun deckXp(id: String, xp: Int) { rpc("ef_deck_xp", idempotent = false) { put("p_id", id); put("p_xp", xp) } }

    // ---------------------------------------------------------------- reporting and blocking (Android migration)
    suspend fun report(kind: String, target: String, reason: String) { rpc("ef_report") { put("p_kind", kind); put("p_target", target); put("p_reason", reason) } }
    suspend fun block(username: String) { rpc("ef_block") { put("p_username", username) } }
    suspend fun unblock(username: String) { rpc("ef_unblock") { put("p_username", username) } }
    suspend fun blocked(): List<String> = (rpc("ef_blocked") as? JsonArray).orEmpty().mapNotNull { (it as? JsonPrimitive)?.content }

    // ---------------------------------------------------------------- Zing AI, purchases, deleting the account
    suspend fun aiStatus(): AiStatusDto = decode(AiStatusDto.serializer(), function("zing-ai", buildJsonObject { put("action", "status") }, retry = true))
    suspend fun aiCards(body: JsonObject): AiCardsDto = decode(AiCardsDto.serializer(), function("zing-ai", body))
    suspend fun aiAnswer(body: JsonObject): AiAnswerDto = decode(AiAnswerDto.serializer(), function("zing-ai", body))
    suspend fun verifyPurchase(productId: String, purchaseToken: String): EntitlementDto =
        decode(EntitlementDto.serializer(), function("play-verify", buildJsonObject { put("product_id", productId); put("purchase_token", purchaseToken) }, retry = true))
    suspend fun deleteAccount() { function("delete-account", buildJsonObject { put("confirm", true) }) }

    companion object {
        /** SQLSTATE codes the ef_* functions raise on purpose, with a message meant for the student. */
        private val STUDENT_CODES = setOf("22023", "23505", "28000", "54000", "P0002", "42501")
    }
}
