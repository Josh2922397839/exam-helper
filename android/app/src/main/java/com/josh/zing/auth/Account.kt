package com.josh.zing.auth

import android.util.Base64
import app.zing.core.account.DeepLink
import com.josh.zing.data.local.Keys
import com.josh.zing.data.local.KvEntity
import com.josh.zing.data.local.Settings
import com.josh.zing.data.local.ZingDatabase
import com.josh.zing.data.remote.ApiException
import com.josh.zing.data.remote.AuthProviders
import com.josh.zing.data.remote.MeDto
import com.josh.zing.data.remote.OfflineException
import com.josh.zing.data.remote.Session
import com.josh.zing.data.remote.SessionManager
import com.josh.zing.data.remote.SignedOutReason
import com.josh.zing.data.remote.SupabaseAuth
import com.josh.zing.data.remote.ZingApi
import com.josh.zing.data.repo.Library
import com.josh.zing.data.repo.Study
import com.josh.zing.sync.SyncEngine
import com.josh.zing.sync.SyncScheduler
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import java.security.MessageDigest
import java.security.SecureRandom

/** An email sign-in that has been started and is waiting for the code or the link. */
@Serializable
data class PendingEmail(val email: String, val verifier: String, val link: Boolean, val at: Long)

/** The setup answers (the same ones the website's onboarding asks for). */
data class SetupAnswers(
    val first: String, val last: String, val age: Int, val purpose: String, val grade: Int?, val schoolId: Long?,
    val findable: Boolean, val reminders: Boolean, val avatar: String?, val invitedBy: String?,
)

/**
 * Signing in and out, and the account's profile. This uses the same Supabase users as the website, so a student who
 * signs in with the same Google account or email gets the same profile, decks and progress.
 */
class Account(
    private val db: ZingDatabase,
    private val settings: Settings,
    private val sessions: SessionManager,
    private val auth: SupabaseAuth,
    private val api: ZingApi,
    private val library: Library,
    private val study: Study,
    private val sync: SyncEngine,
    private val scheduler: SyncScheduler,
    /** Where the email link returns to (the app's own scheme). */
    private val redirectUri: String,
    private val now: () -> Long = System::currentTimeMillis,
) {
    private val kv = db.kv()
    private val json = Json { ignoreUnknownKeys = true }
    val session: StateFlow<Session?> = sessions.session
    val me: Flow<MeDto?> = sync.me
    val signedOut = sessions.signedOut

    suspend fun start(): Session? = sessions.load()

    suspend fun providers(): AuthProviders = auth.providers()

    // ---------------------------------------------------------------- nonces and PKCE
    private val random = SecureRandom()
    private fun randomUrlSafe(bytes: Int): String = ByteArray(bytes).also(random::nextBytes).let { Base64.encodeToString(it, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP) }
    private fun sha256(s: String): ByteArray = MessageDigest.getInstance("SHA-256").digest(s.toByteArray(Charsets.US_ASCII))

    /** A fresh nonce for Google sign-in: the raw value goes to Supabase, its SHA-256 (hex) goes to Google. */
    fun newNonce(): Pair<String, String> {
        val raw = randomUrlSafe(32)
        return raw to sha256(raw).joinToString("") { "%02x".format(it) }
    }

    // ---------------------------------------------------------------- signing in
    /**
     * Whose study data is on this device. Signing in as someone else must never mix two students' notes, so the
     * previous student's data is removed first (it is in their own cloud save). Data made before any sign-in has no
     * owner and is kept: it joins the account that signs in.
     */
    private suspend fun adopt(session: Session) {
        val owner = kv.get(OWNER)
        if (owner != null && owner != session.userId) {
            library.wipe(); study.wipe(); sync.forget()
            settings.update { it.copy(setupDone = false, setupLater = false) }
        }
        kv.put(KvEntity(OWNER, session.userId))
        sessions.set(session)
    }

    /** After any sign-in: fetch the profile and bring down the cloud save. Returns the profile, or null if setup is needed. */
    suspend fun afterSignIn(): MeDto? {
        val me = api.me()
        sync.storeMe(me)
        if (me != null) {
            settings.update { it.copy(setupDone = me.onboarded || it.setupDone) }
            sync.sync()
            scheduler.schedulePeriodic()
        }
        return me
    }

    suspend fun signInGuest(): MeDto? { adopt(auth.signInAnonymously()); return afterSignIn() }

    /**
     * Finishes Google sign-in with the ID token from Credential Manager. If there is already a profile on this device
     * (a guest or email account), Google is attached to it; otherwise this signs in, which brings back a profile made
     * on another device or starts a new one. The website follows the same rule.
     */
    suspend fun signInGoogle(idToken: String, rawNonce: String): MeDto? {
        val current = sessions.load()
        val linking = current != null && sync.cachedMe() != null && !current.hasGoogle
        val token = if (linking) sessions.accessToken() else null
        adopt(auth.signInWithGoogle(idToken, rawNonce, linkTo = token))
        return afterSignIn()
    }

    /** Sends the sign-in email. With a profile already here, the email is added to it instead of signing in afresh. */
    suspend fun startEmail(email: String): PendingEmail {
        val address = email.trim().lowercase()
        if (!EMAIL.matches(address) || address.length > 254) throw ApiException("email_address_invalid", 400, "Type your full email address.")
        val verifier = randomUrlSafe(48)
        val challenge = Base64.encodeToString(sha256(verifier), Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP)
        val current = sessions.load()
        val linking = current != null && sync.cachedMe() != null && !current.hasEmail
        val token = if (linking) sessions.accessToken() else null
        if (token != null) auth.linkEmail(token, address, challenge, redirectUri) else auth.sendEmailOtp(address, challenge, redirectUri)
        val pending = PendingEmail(address, verifier, linking, now())
        settings.setPendingAuth(json.encodeToString(PendingEmail.serializer(), pending))
        return pending
    }

    suspend fun pendingEmail(): PendingEmail? = settings.pendingAuth()?.let { runCatching { json.decodeFromString(PendingEmail.serializer(), it) }.getOrNull() }
        ?.takeIf { now() - it.at < 60 * 60 * 1000L }

    suspend fun cancelEmail() = settings.setPendingAuth(null)

    suspend fun verifyEmailCode(code: String): MeDto? {
        val pending = pendingEmail() ?: throw ApiException("otp_expired", 400, SupabaseAuth.message("otp_expired"))
        adopt(auth.verifyEmailCode(pending.email, code.filter(Char::isDigit)))
        settings.setPendingAuth(null)
        return afterSignIn()
    }

    /** The email link came back to the app with a one-time code. Only this install holds the matching verifier. */
    suspend fun finishEmailLink(link: DeepLink.AuthCode): MeDto? {
        val pending = pendingEmail() ?: throw ApiException("flow_state", 400, SupabaseAuth.message("flow_state"))
        adopt(auth.exchangeCode(link.code, pending.verifier))
        settings.setPendingAuth(null)
        return afterSignIn()
    }

    /** Moves an account here with a one-time transfer code (a fresh guest session receives it, as on the website). */
    suspend fun claim(code: String): MeDto {
        if (sessions.load() == null) adopt(auth.signInAnonymously())
        val me = api.claim(code)
        sync.storeMe(me)
        settings.update { it.copy(setupDone = me.onboarded || it.setupDone) }
        sync.sync()
        scheduler.schedulePeriodic()
        return me
    }

    // ---------------------------------------------------------------- the profile
    suspend fun onboard(a: SetupAnswers): MeDto {
        if (sessions.load() == null) adopt(auth.signInAnonymously())
        val me = api.onboard(kotlinx.serialization.json.buildJsonObject {
            put("first", kotlinx.serialization.json.JsonPrimitive(a.first)); put("last", kotlinx.serialization.json.JsonPrimitive(a.last))
            put("age", kotlinx.serialization.json.JsonPrimitive(a.age)); put("purpose", kotlinx.serialization.json.JsonPrimitive(a.purpose))
            put("grade", kotlinx.serialization.json.JsonPrimitive(a.grade)); put("school", kotlinx.serialization.json.JsonPrimitive(a.schoolId))
            put("findable", kotlinx.serialization.json.JsonPrimitive(a.findable)); put("reminders", kotlinx.serialization.json.JsonPrimitive(a.reminders))
            a.avatar?.let { put("avatar", kotlinx.serialization.json.JsonPrimitive(it)) }
            a.invitedBy?.let { put("ref", kotlinx.serialization.json.JsonPrimitive(it)) }
        })
        sync.storeMe(me)
        settings.update { it.copy(setupDone = true, setupLater = false) }
        settings.setSetupDraft(null)
        scheduler.request(0); scheduler.schedulePeriodic()
        return me
    }

    suspend fun saveProfile(username: String, school: Long?, grade: Int?, avatar: String?): MeDto = api.saveProfile(username, school, grade, avatar).also { sync.storeMe(it) }
    suspend fun setPrefs(findable: Boolean? = null, reminders: Boolean? = null): MeDto = api.setPrefs(findable, reminders).also { sync.storeMe(it) }
    suspend fun refreshSession(): Session? = sessions.load()?.let { s -> runCatching { auth.user(s) }.getOrNull()?.also { sessions.set(it) } ?: s }
    suspend fun transferCode(): String = api.transferCode()

    // ---------------------------------------------------------------- leaving
    suspend fun hasUnsyncedChanges(): Boolean = library.hasUnsyncedChanges()

    /**
     * Signs out. Changes are backed up first when there's a connection. Study data stays on the device for the same
     * student to come back to; it is removed if a different student signs in (see [adopt]).
     */
    suspend fun signOut(everywhere: Boolean = false) {
        runCatching { sync.sync() }
        sessions.accessToken()?.let { auth.signOut(it, everywhere) }
        scheduler.cancelAll()
        sync.forget()
        settings.setPendingAuth(null)
        sessions.clear(SignedOutReason.USER)
    }

    /**
     * Deletes the account: the app's data on the server, then (with the `delete-account` function deployed) the
     * sign-in record itself, then everything on this device. Throws if the server couldn't be reached, in which case
     * nothing has been removed.
     */
    suspend fun deleteAccount() {
        if (sessions.accessToken() == null) throw OfflineException()
        try {
            api.deleteAccount() // removes the app data and the Supabase Auth user
        } catch (e: ApiException) {
            if (!e.notDeployed) throw e
            api.deleteMe()      // the function isn't deployed yet: remove the app data, as the website does
        }
        sessions.accessToken()?.let { auth.signOut(it, everywhere = true) }
        scheduler.cancelAll()
        library.wipe(); study.wipe(); sync.forget()
        kv.clear()
        settings.clearAll()
        sessions.clear(SignedOutReason.DELETED)
    }

    companion object {
        private const val OWNER = "owner"
        private val EMAIL = Regex("^[^\\s@]{1,64}@[^\\s@]+\\.[^\\s@]{2,}$")
        @Suppress("unused") private fun keep(o: JsonObject) = o
    }
}
