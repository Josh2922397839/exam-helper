package com.josh.zing.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.zing.core.account.DeepLink
import app.zing.core.theme.Appearance
import com.josh.zing.AppContainer
import com.josh.zing.BuildConfig
import com.josh.zing.data.local.Prefs
import com.josh.zing.data.remote.ApiException
import com.josh.zing.data.remote.MeDto
import com.josh.zing.data.remote.OfflineException
import com.josh.zing.data.remote.SignedOutReason
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

enum class Gate { LOADING, WELCOME, SETUP, MAIN }

/** A message a screen wants to show briefly at the bottom, with an optional action such as Undo. */
data class Notice(val text: String, val action: String? = null, val onAction: (suspend () -> Unit)? = null)

/** What a student should see for a failed request. Never includes server details. */
fun Throwable.friendly(): String = when (this) {
    is OfflineException -> "You're offline. Check your connection and try again."
    is ApiException -> message ?: "Something went wrong. Try again."
    else -> "Something went wrong. Try again."
}

/**
 * App-wide state: who is signed in, which part of the app to show, the appearance, and links opened from outside.
 */
class AppViewModel(private val c: AppContainer) : ViewModel() {
    private val ready = MutableStateFlow(false)
    val appearance: StateFlow<Appearance> = c.settings.appearance.stateIn(viewModelScope, SharingStarted.Eagerly, Appearance())
    val prefs: StateFlow<Prefs> = c.settings.prefs.stateIn(viewModelScope, SharingStarted.Eagerly, Prefs())
    val me: StateFlow<MeDto?> = c.account.me.stateIn(viewModelScope, SharingStarted.Eagerly, null)
    val notices = MutableSharedFlow<Notice>(extraBufferCapacity = 8)
    private val _link = MutableStateFlow<DeepLink?>(null)
    /** A link waiting to be opened once the student is signed in and set up. */
    val link: StateFlow<DeepLink?> = _link

    val gate: StateFlow<Gate> = combine(ready, c.account.session, me, prefs) { isReady, session, profile, p ->
        when {
            !isReady -> Gate.LOADING
            p.setupLater -> Gate.MAIN                                   // studying on this device only, for now
            session == null -> Gate.WELCOME
            profile == null || !profile.onboarded -> if (p.setupDone && profile == null) Gate.MAIN else Gate.SETUP
            else -> Gate.MAIN
        }
    }.stateIn(viewModelScope, SharingStarted.Eagerly, Gate.LOADING)

    init {
        viewModelScope.launch {
            c.account.start()
            c.settings.pendingLink()?.let { saved -> _link.value = parse(saved) }
            ready.value = true
            c.scheduler.request(0)
            c.scheduler.schedulePeriodic()
        }
        viewModelScope.launch {
            c.account.signedOut.collect { reason ->
                when (reason) {
                    SignedOutReason.EXPIRED -> notices.emit(Notice("You've been signed out. Sign in again to carry on; your study progress is still on this device."))
                    SignedOutReason.DELETED -> notices.emit(Notice("That account no longer exists, so this device was signed out."))
                    SignedOutReason.USER -> Unit
                }
            }
        }
    }

    private fun parse(uri: String?): DeepLink? = DeepLink.parse(uri, BuildConfig.WEB_HOST, BuildConfig.APPLICATION_ID)

    /** A link opened the app. Sign-in links are finished straight away; the rest wait until the app is ready. */
    fun onLink(uri: String?) {
        val parsed = parse(uri) ?: return
        viewModelScope.launch {
            when (parsed) {
                is DeepLink.AuthCode -> try {
                    val profile = c.account.finishEmailLink(parsed)
                    notices.emit(Notice(if (profile != null) "Signed in. Your profile and progress are ready." else "Signed in! Let's finish setting up your account."))
                } catch (e: Exception) { notices.emit(Notice(e.friendly())) }
                is DeepLink.AuthError -> notices.emit(Notice(com.josh.zing.data.remote.SupabaseAuth.message(parsed.code)))
                DeepLink.Home -> Unit
                else -> { c.settings.setPendingLink(uri); _link.value = parsed }
            }
        }
    }

    fun linkHandled() {
        _link.value = null
        viewModelScope.launch { c.settings.setPendingLink(null) }
    }

    fun notify(text: String, action: String? = null, onAction: (suspend () -> Unit)? = null) { notices.tryEmit(Notice(text, action, onAction)) }

    fun syncNow() = viewModelScope.launch { c.sync.sync() }

    /** "Study now, set up later" is over: show the sign-in screen. The notebooks made meanwhile join the account. */
    fun leaveLocalOnly() = viewModelScope.launch { c.settings.update { it.copy(setupLater = false) } }
}
