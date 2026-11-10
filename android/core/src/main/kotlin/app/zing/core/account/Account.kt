package app.zing.core.account

/** The age rules Zing already applies on the web and on the server; the app shows the same thing the server enforces. */
object AgeRules {
    const val MIN_AGE = 5
    const val MAX_AGE = 100

    fun valid(age: Int?): Boolean = age != null && age in MIN_AGE..MAX_AGE

    /** Under 13: never findable, real name never shown, no follow suggestions, no study groups. */
    fun isChild(age: Int?): Boolean = age != null && age < 13

    fun canBeFindable(age: Int?): Boolean = age != null && age >= 13

    /**
     * Zing AI needs a student to be 14 or older *by birth year*: a birth year alone can't prove a 13th birthday has
     * already happened this year, so the server asks for 14 (schema.sql, ef_ai_import_quota). Age is stored as a
     * birth year, so "age" here is the current year minus the birth year.
     */
    fun aiAllowedByAge(age: Int?): Boolean = age != null && age >= 14
}

/** Why Zing AI can't be used right now. The server makes the real decision; these are what the app can explain. */
enum class AiBlock { NONE, OFFLINE, GUEST, NOT_ELIGIBLE, DAILY_LIMIT, EVERYONE_LIMIT, UNAVAILABLE }

object AiErrors {
    /** Maps the zing-ai function's error codes (and HTTP status) to something to tell the student. */
    fun block(code: String?, status: Int? = null): AiBlock = when (code) {
        null, "" -> if (status == null || status in 200..299) AiBlock.NONE else AiBlock.UNAVAILABLE
        "offline" -> AiBlock.OFFLINE
        "guest" -> AiBlock.GUEST
        "not_eligible" -> AiBlock.NOT_ELIGIBLE
        "quota_exceeded" -> AiBlock.DAILY_LIMIT
        "ai_daily_limit" -> AiBlock.EVERYONE_LIMIT
        "unauthorized" -> AiBlock.GUEST
        else -> AiBlock.UNAVAILABLE
    }

    fun message(b: AiBlock): String = when (b) {
        AiBlock.NONE -> ""
        AiBlock.OFFLINE -> "You're offline. Zing AI needs the internet; everything else still works."
        AiBlock.GUEST -> "Zing AI needs a Google or email sign-in. Guest accounts can use quick cards."
        AiBlock.NOT_ELIGIBLE -> "Zing AI is for students aged 14 and up with a confirmed sign-in."
        AiBlock.DAILY_LIMIT -> "You've used today's Zing AI turns. They come back tomorrow."
        AiBlock.EVERYONE_LIMIT -> "Zing AI is at its limit for everyone today. Try again tomorrow."
        AiBlock.UNAVAILABLE -> "Zing AI isn't answering right now. Try again in a little while."
    }
}

/** Where a link into the app should go. */
sealed interface DeepLink {
    data object Home : DeepLink
    /** A deck packed into the link itself (`#/import/<code>`). */
    data class ImportDeck(val code: String) : DeepLink
    /** A deck shared through the server (`#/shared/<uuid>`). */
    data class SharedDeck(val id: String) : DeepLink
    data class Profile(val username: String) : DeepLink
    data class School(val id: Long) : DeepLink
    /** A friend's invite (`?ref=username`). */
    data class Invite(val username: String) : DeepLink
    /** The email sign-in link coming back with a one-time code. */
    data class AuthCode(val code: String) : DeepLink
    data class AuthError(val code: String) : DeepLink

    companion object {
        private val UUID = Regex("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
        private val USERNAME = Regex("^[A-Za-z0-9_]{3,20}$")
        private val SHARE_CODE = Regex("^[pz]\\.[A-Za-z0-9_-]{4,400000}$")
        private val AUTH_CODE = Regex("^[A-Za-z0-9._~-]{8,400}$")
        private val ERROR_CODE = Regex("^[a-z0-9_]{2,60}$")

        /**
         * Parses a link. Only links to Zing's own website ([webHost], https) or the app's own scheme
         * ([appScheme]) are understood; anything else is null. Every part is checked against a strict pattern, so a
         * crafted link can't smuggle anything in.
         */
        fun parse(uri: String?, webHost: String, appScheme: String): DeepLink? {
            if (uri.isNullOrBlank() || uri.length > 500_000) return null
            val m = Regex("^([a-zA-Z][a-zA-Z0-9+.-]*)://([^/?#]*)([^?#]*)(?:\\?([^#]*))?(?:#(.*))?$").matchEntire(uri.trim()) ?: return null
            val (scheme, host, path, query, fragment) = m.destructured
            val isWeb = scheme.equals("https", true) && host.equals(webHost, true) && (path.isEmpty() || path == "/" || path == "/index.html")
            val isApp = scheme.equals(appScheme, true) && host == "auth"
            if (!isWeb && !isApp) return null
            val params = query.split('&').filter { it.isNotEmpty() }.associate { kv ->
                val i = kv.indexOf('=')
                if (i < 0) kv to "" else kv.substring(0, i) to decode(kv.substring(i + 1))
            }
            params["error_code"]?.let { return AuthError(it.takeIf(ERROR_CODE::matches) ?: "error") }
            params["error"]?.let { return AuthError(it.takeIf(ERROR_CODE::matches) ?: "error") }
            params["code"]?.let { c -> return if (AUTH_CODE.matches(c)) AuthCode(c) else AuthError("bad_code") }
            if (isApp) return null
            val route = fragment.removePrefix("/").split('/').filter { it.isNotEmpty() }
            return when (route.getOrNull(0)) {
                "import" -> route.getOrNull(1)?.takeIf(SHARE_CODE::matches)?.let(::ImportDeck) ?: Home
                "shared" -> route.getOrNull(1)?.takeIf(UUID::matches)?.let(::SharedDeck) ?: Home
                "u" -> route.getOrNull(1)?.let(::decode)?.takeIf(USERNAME::matches)?.let(::Profile) ?: Home
                "school" -> route.getOrNull(1)?.toLongOrNull()?.takeIf { it > 0 }?.let(::School) ?: Home
                else -> params["ref"]?.takeIf(USERNAME::matches)?.let(::Invite) ?: Home
            }
        }

        private fun decode(s: String): String = runCatching { java.net.URLDecoder.decode(s, "UTF-8") }.getOrDefault(s)
    }
}

/**
 * Coins, exactly as the website counts them (assets/js/core/social.js). They live on the device, are never sent
 * anywhere and have no money value: 1 per 10 XP, 20 the first time each day the goal is reached, 50 for each
 * friend who joins with your invite and 25 each time someone saves a deck you shared.
 */
data class Wallet(
    val earned: Int = 0,
    val spent: Int = 0,
    val carry: Int = 0,
    val refs: Int = 0,
    val deckSaves: Int = 0,
    val goals: List<String> = emptyList(),
    val doubleUntil: Long = 0,
) {
    val balance: Int get() = maxOf(0, earned - spent)

    fun boost(now: Long): Int = if (now < doubleUntil) 2 else 1

    fun onXp(added: Int, goalReached: Boolean, dayKey: String): Wallet {
        if (added <= 0) return this
        val total = carry + added
        var w = copy(carry = total % 10, earned = earned + total / 10)
        if (goalReached && dayKey !in goals) w = w.copy(goals = (goals + dayKey).takeLast(40), earned = w.earned + GOAL_COINS)
        return w
    }

    /** Credits invites and deck saves the server has counted since the last look. Returns the new wallet and coins gained. */
    fun onProfile(referrals: Int, serverDeckSaves: Int): Pair<Wallet, Int> {
        val newRefs = maxOf(0, referrals - refs)
        val newSaves = maxOf(0, serverDeckSaves - deckSaves)
        val gained = newRefs * INVITE_COINS + newSaves * DECK_SAVE_COINS
        return copy(refs = maxOf(refs, referrals), deckSaves = maxOf(deckSaves, serverDeckSaves), earned = earned + gained) to gained
    }

    fun spend(cost: Int): Wallet? = if (balance < cost) null else copy(spent = spent + cost)

    fun startDoubleXp(now: Long): Wallet? = if (now < doubleUntil) null else spend(DOUBLE_XP_COST)?.copy(doubleUntil = now + 15 * 60_000L)

    companion object {
        const val GOAL_COINS = 20
        const val INVITE_COINS = 50
        const val DECK_SAVE_COINS = 25
        const val FREEZE_COST = 60
        const val DOUBLE_XP_COST = 90
    }
}
