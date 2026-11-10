package app.zing.core.billing

import java.security.MessageDigest

/** Where a Zing Plus subscription stands. The server decides this; the app only reads it. */
enum class PlusState {
    NONE,
    /** Paid for but not yet confirmed by Google (for example a slow payment method). No benefits yet. */
    PENDING,
    ACTIVE,
    /** A renewal payment failed; Google is retrying. Benefits continue. */
    GRACE,
    /** The retry period ran out. Benefits stop until the payment is fixed. */
    ON_HOLD,
    PAUSED,
    /** Cancelled, but the time already paid for hasn't run out. Benefits continue until then. */
    CANCELED_ACTIVE,
    EXPIRED,
    /** Refunded, charged back or revoked. Benefits stop at once. */
    REVOKED,
}

data class Entitlement(
    val state: PlusState = PlusState.NONE,
    val productId: String? = null,
    /** When the paid period ends (epoch milliseconds), if known. */
    val expiresAt: Long? = null,
    val autoRenew: Boolean = false,
    /** When the server last confirmed this. */
    val checkedAt: Long = 0,
) {
    /** Does the student have Zing Plus right now? */
    fun hasPlus(now: Long): Boolean = when (state) {
        PlusState.ACTIVE, PlusState.GRACE -> expiresAt == null || now < expiresAt + CLOCK_SLACK_MS
        PlusState.CANCELED_ACTIVE -> expiresAt != null && now < expiresAt
        else -> false
    }

    /**
     * Offline, the last answer from the server is trusted for a few days at most (and never past the end of the
     * paid period), so a refunded or revoked subscription can't be kept alive by staying offline.
     */
    fun usableOffline(now: Long): Boolean = hasPlus(now) && now - checkedAt < OFFLINE_TRUST_MS

    companion object {
        const val CLOCK_SLACK_MS = 60 * 60 * 1000L
        const val OFFLINE_TRUST_MS = 3 * 24 * 60 * 60 * 1000L
        val NONE = Entitlement()
    }
}

/**
 * Google Play's subscription states (purchases.subscriptionsv2) mapped to [PlusState]. The `play-verify` and
 * `play-rtdn` Edge Functions use the same table (supabase/functions/_shared/play.ts); keep them in step.
 */
object PlayStates {
    fun map(subscriptionState: String?, expiresAt: Long?, now: Long, revoked: Boolean = false): PlusState = when {
        revoked -> PlusState.REVOKED
        else -> when (subscriptionState) {
            "SUBSCRIPTION_STATE_ACTIVE" -> PlusState.ACTIVE
            "SUBSCRIPTION_STATE_IN_GRACE_PERIOD" -> PlusState.GRACE
            "SUBSCRIPTION_STATE_ON_HOLD" -> PlusState.ON_HOLD
            "SUBSCRIPTION_STATE_PAUSED" -> PlusState.PAUSED
            "SUBSCRIPTION_STATE_PENDING" -> PlusState.PENDING
            "SUBSCRIPTION_STATE_CANCELED" -> if (expiresAt != null && expiresAt > now) PlusState.CANCELED_ACTIVE else PlusState.EXPIRED
            "SUBSCRIPTION_STATE_EXPIRED" -> PlusState.EXPIRED
            "SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED" -> PlusState.NONE
            else -> PlusState.NONE
        }
    }

    fun parse(name: String?): PlusState = PlusState.entries.firstOrNull { it.name.equals(name, ignoreCase = true) } ?: PlusState.NONE
}

/** Things Zing Plus could unlock. */
enum class Feature { EXTRA_AI_IMPORTS, EXTRA_THEMES, UNLIMITED_NOTEBOOKS }

/**
 * Which features need Zing Plus. **Empty on purpose**: nothing is gated until the catalogue (prices, regions, trial
 * rules and the list of benefits) is approved, so adding billing takes nothing away from free users.
 * See docs/android/SUBSCRIPTIONS.md before adding anything here.
 */
object FeatureGate {
    val gated: Set<Feature> = emptySet()

    fun allowed(feature: Feature, entitlement: Entitlement, now: Long, online: Boolean): Boolean =
        feature !in gated || if (online) entitlement.hasPlus(now) else entitlement.usableOffline(now)
}

/** What the purchase screen shows after Google Play answers. */
enum class PurchaseOutcome { SUCCESS, PENDING, CANCELED, ALREADY_OWNED, UNAVAILABLE, BILLING_UNAVAILABLE, NETWORK, DEFERRED, FAILED }

object PlayAccount {
    /**
     * The "obfuscated account ID" given to Google Play with a purchase. It ties the purchase to the Zing account
     * without telling Google who that is: a one-way hash of the account's ID, never an email, name or username.
     */
    fun obfuscatedId(userId: String): String =
        MessageDigest.getInstance("SHA-256").digest("zing-play-account:$userId".toByteArray()).joinToString("") { "%02x".format(it) }
}
