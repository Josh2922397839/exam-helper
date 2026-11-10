package com.josh.zing.data.remote

import com.josh.zing.data.local.Settings
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/** A signed-in Supabase user on this device. Tokens are only ever held in memory and in the sealed session file. */
@Serializable
data class Session(
    val accessToken: String,
    val refreshToken: String,
    /** Epoch seconds. */
    val expiresAt: Long,
    val userId: String,
    val anonymous: Boolean,
    val email: String? = null,
    val emailConfirmed: Boolean = false,
    val providers: List<String> = emptyList(),
) {
    val hasGoogle: Boolean get() = "google" in providers
    val hasEmail: Boolean get() = "email" in providers

    /** Never print tokens, even by accident in a log or crash report. */
    override fun toString(): String = "Session(user=${userId.take(8)}…, anonymous=$anonymous)"
}

enum class SignedOutReason { USER, EXPIRED, DELETED }

/**
 * Holds the session, keeps the access token fresh and notices when the server no longer accepts it.
 * Refreshing is "single flight": if several requests need a new token at once, only one refresh is sent.
 */
class SessionManager(private val settings: Settings, private val auth: SupabaseAuth, private val nowSeconds: () -> Long = { System.currentTimeMillis() / 1000 }) {
    private val json = Json { ignoreUnknownKeys = true }
    private val mutex = Mutex()
    private val _session = MutableStateFlow<Session?>(null)
    val session: StateFlow<Session?> = _session
    private val _signedOut = MutableSharedFlow<SignedOutReason>(extraBufferCapacity = 4)
    /** Emits when the device is signed out for any reason, so the UI can say why. */
    val signedOut: SharedFlow<SignedOutReason> = _signedOut
    @Volatile private var loaded = false

    /** Reads the saved session once. A session that can't be opened (restored backup, new phone) is simply dropped. */
    suspend fun load(): Session? = mutex.withLock {
        if (!loaded) {
            _session.value = settings.session()?.let { runCatching { json.decodeFromString(Session.serializer(), it) }.getOrNull() }
            loaded = true
        }
        _session.value
    }

    suspend fun set(session: Session) = mutex.withLock { store(session) }

    private suspend fun store(session: Session?) {
        _session.value = session
        loaded = true
        settings.setSession(session?.let { json.encodeToString(Session.serializer(), it) })
    }

    suspend fun clear(reason: SignedOutReason) {
        mutex.withLock { store(null) }
        _signedOut.tryEmit(reason)
    }

    /**
     * A token that is good for at least another minute, or null when signed out or when it couldn't be refreshed
     * right now (offline). A refresh the server rejects for good signs the device out.
     */
    suspend fun accessToken(forceRefresh: Boolean = false): String? {
        load()
        val current = _session.value ?: return null
        if (!forceRefresh && current.expiresAt - nowSeconds() > 60) return current.accessToken
        return mutex.withLock {
            val latest = _session.value ?: return@withLock null
            // another caller may have refreshed while we waited for the lock
            if (latest.accessToken != current.accessToken && latest.expiresAt - nowSeconds() > 60) return@withLock latest.accessToken
            try {
                val fresh = auth.refresh(latest.refreshToken)
                store(fresh)
                fresh.accessToken
            } catch (e: ApiException) {
                if (e.status in 400..403 || e.code in FATAL) {
                    store(null)
                    _signedOut.tryEmit(if (e.code == "user_not_found") SignedOutReason.DELETED else SignedOutReason.EXPIRED)
                }
                null
            } catch (e: OfflineException) {
                // offline: keep the session; a token that hasn't quite expired is still worth trying
                latest.accessToken.takeIf { latest.expiresAt > nowSeconds() }
            }
        }
    }

    companion object {
        private val FATAL = setOf("invalid_grant", "refresh_token_not_found", "refresh_token_already_used", "session_not_found", "session_expired", "user_not_found", "user_banned", "bad_jwt")
    }
}
