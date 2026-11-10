package com.josh.zing.ui.screens

import android.app.Activity
import android.content.Intent
import android.net.Uri
import androidx.activity.compose.LocalActivity
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import app.zing.core.account.AgeRules
import com.josh.zing.AppContainer
import com.josh.zing.BuildConfig
import com.josh.zing.auth.GoogleResult
import com.josh.zing.auth.GoogleSignIn
import com.josh.zing.auth.SetupAnswers
import com.josh.zing.data.remote.AuthProviders
import com.josh.zing.data.remote.SchoolDto
import com.josh.zing.ui.components.Art
import com.josh.zing.ui.components.Gap
import com.josh.zing.ui.components.MessageCard
import com.josh.zing.ui.components.Page
import com.josh.zing.ui.components.SchoolCrest
import com.josh.zing.ui.components.zingViewModel
import com.josh.zing.ui.friendly
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

fun openWeb(context: android.content.Context, path: String) {
    runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://${BuildConfig.WEB_HOST}/$path")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
}

// ============================================================================================ Welcome

enum class WelcomeStep { CHOOSE, EMAIL, CODE, TRANSFER }

data class WelcomeState(
    val step: WelcomeStep = WelcomeStep.CHOOSE,
    val providers: AuthProviders? = null,
    val offline: Boolean = false,
    val busy: Boolean = false,
    val error: String? = null,
    val email: String = "",
    val code: String = "",
    val more: Boolean = false,
)

class WelcomeViewModel(private val c: AppContainer) : ViewModel() {
    private val _state = MutableStateFlow(WelcomeState())
    val state: StateFlow<WelcomeState> = _state

    init { loadProviders() }

    fun loadProviders() = viewModelScope.launch {
        // an email sign-in that was started before the app was closed carries on at the code step
        c.account.pendingEmail()?.let { p -> _state.update { it.copy(step = WelcomeStep.CODE, email = p.email) } }
        try {
            val p = c.account.providers()
            _state.update { it.copy(providers = p, offline = false) }
        } catch (e: Exception) { _state.update { it.copy(providers = AuthProviders(), offline = true) } }
    }

    fun edit(change: (WelcomeState) -> WelcomeState) = _state.update { change(it).copy(error = null) }

    private fun run(block: suspend () -> Unit) {
        if (_state.value.busy) return
        _state.update { it.copy(busy = true, error = null) }
        viewModelScope.launch {
            try { block() } catch (e: Exception) { _state.update { it.copy(error = e.friendly()) } }
            _state.update { it.copy(busy = false) }
        }
    }

    fun google(activity: Activity) = run {
        val (raw, hashed) = c.account.newNonce()
        when (val r = GoogleSignIn.idToken(activity, hashed)) {
            is GoogleResult.Token -> c.account.signInGoogle(r.idToken, raw)
            GoogleResult.Cancelled -> Unit
            is GoogleResult.Failed -> _state.update { it.copy(error = r.message) }
        }
    }

    fun sendEmail() = run { c.account.startEmail(_state.value.email); _state.update { it.copy(step = WelcomeStep.CODE, code = "") } }
    fun verifyCode() = run { c.account.verifyEmailCode(_state.value.code) }
    fun guest() = run { c.account.signInGuest() }
    fun claim() = run { c.account.claim(_state.value.code) }
    fun cancelEmail() { viewModelScope.launch { c.account.cancelEmail() }; edit { it.copy(step = WelcomeStep.CHOOSE, code = "") } }
    /** Offline on the very first visit: study now, make the account later (the website allows the same). */
    fun later() = viewModelScope.launch { c.settings.update { it.copy(setupLater = true) } }
}

@Composable
fun WelcomeScreen() {
    val vm = zingViewModel { WelcomeViewModel(it) }
    val s by vm.state.collectAsStateWithLifecycle()
    val activity = LocalActivity.current
    val context = LocalContext.current
    Page(maxWidth = 520.dp) {
        Column(
            Modifier.fillMaxSize().safeDrawingPadding().imePadding().verticalScroll(rememberScrollState()).padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Gap(12.dp)
            Art("sparkles", 96.dp)
            Text("Zing", style = MaterialTheme.typography.displaySmall, modifier = Modifier.semantics { heading() })
            Text("Notes, cards and quizzes that follow you from the web to your phone.", style = MaterialTheme.typography.bodyLarge, textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Gap(4.dp)
            s.error?.let { MessageCard(it, error = true) }
            if (s.offline && s.step == WelcomeStep.CHOOSE) MessageCard("You're offline, so signing in has to wait.", actionLabel = "Try again", onAction = { vm.loadProviders() })
            when (s.step) {
                WelcomeStep.CHOOSE -> {
                    val p = s.providers
                    if (p == null) CircularProgressIndicator()
                    if (p?.google == true && GoogleSignIn.configured) {
                        Button(onClick = { activity?.let(vm::google) }, enabled = !s.busy, modifier = Modifier.fillMaxWidth().testTag("google")) { Text("Continue with Google") }
                    }
                    if (p?.email == true) {
                        OutlinedButton(onClick = { vm.edit { it.copy(step = WelcomeStep.EMAIL) } }, enabled = !s.busy, modifier = Modifier.fillMaxWidth().testTag("email")) { Text("Continue with email") }
                    }
                    TextButton(onClick = { vm.edit { it.copy(more = !it.more) } }) { Text(if (s.more) "Fewer options" else "More options") }
                    if (s.more) {
                        if (p?.guest == true) OutlinedButton(onClick = vm::guest, enabled = !s.busy, modifier = Modifier.fillMaxWidth().testTag("guest")) { Text("Continue as a guest") }
                        OutlinedButton(onClick = { vm.edit { it.copy(step = WelcomeStep.TRANSFER, code = "") } }, enabled = !s.busy, modifier = Modifier.fillMaxWidth()) { Text("I have a transfer code") }
                        Text("A guest account lives only on this phone until you add Google or an email to it.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
                    }
                    if (s.offline) TextButton(onClick = { vm.later() }, modifier = Modifier.testTag("later")) { Text("Start studying now, set up later") }
                }
                WelcomeStep.EMAIL -> {
                    Text("We'll email you a sign-in code. No password needed.", textAlign = TextAlign.Center)
                    OutlinedTextField(
                        s.email, { v -> vm.edit { it.copy(email = v.take(254)) } }, label = { Text("Email address") }, singleLine = true, enabled = !s.busy,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Send), keyboardActions = KeyboardActions(onSend = { vm.sendEmail() }),
                        modifier = Modifier.fillMaxWidth().testTag("emailField"),
                    )
                    Button(onClick = vm::sendEmail, enabled = !s.busy && s.email.isNotBlank(), modifier = Modifier.fillMaxWidth().testTag("sendEmail")) { Text(if (s.busy) "Sending…" else "Email me a code") }
                    TextButton(onClick = { vm.edit { it.copy(step = WelcomeStep.CHOOSE) } }) { Text("Back") }
                }
                WelcomeStep.CODE -> {
                    Text("Check ${s.email} for an email from Zing. Type the code from it, or tap the link in the email on this phone.", textAlign = TextAlign.Center)
                    OutlinedTextField(
                        s.code, { v -> vm.edit { it.copy(code = v.filter(Char::isDigit).take(8)) } }, label = { Text("Code from the email") }, singleLine = true, enabled = !s.busy,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword, imeAction = ImeAction.Done), keyboardActions = KeyboardActions(onDone = { vm.verifyCode() }),
                        modifier = Modifier.fillMaxWidth().testTag("codeField"),
                    )
                    Button(onClick = vm::verifyCode, enabled = !s.busy && s.code.length >= 6, modifier = Modifier.fillMaxWidth().testTag("verifyCode")) { Text(if (s.busy) "Checking…" else "Sign in") }
                    TextButton(onClick = vm::cancelEmail) { Text("Use a different way to sign in") }
                }
                WelcomeStep.TRANSFER -> {
                    Text("On your other device open Zing → Account → Move to another device, then type the code here.", textAlign = TextAlign.Center)
                    OutlinedTextField(
                        s.code, { v -> vm.edit { it.copy(code = v.uppercase().filter { ch -> ch.isLetterOrDigit() || ch == '-' }.take(14)) } }, label = { Text("XXXX-XXXX-XXXX") }, singleLine = true, enabled = !s.busy,
                        keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Characters, imeAction = ImeAction.Done), keyboardActions = KeyboardActions(onDone = { vm.claim() }),
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Button(onClick = vm::claim, enabled = !s.busy && s.code.count(Char::isLetterOrDigit) == 12, modifier = Modifier.fillMaxWidth()) { Text(if (s.busy) "Moving your account…" else "Move my account here") }
                    TextButton(onClick = { vm.edit { it.copy(step = WelcomeStep.CHOOSE) } }) { Text("Back") }
                }
            }
            Gap(8.dp)
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = { openWeb(context, "privacy.html") }) { Text("Privacy") }
                TextButton(onClick = { openWeb(context, "terms.html") }) { Text("Terms") }
            }
        }
    }
}

// ============================================================================================ Setup

@Serializable
data class SetupDraft(
    val step: Int = 0, val age: String = "", val purpose: String = "school", val grade: Int? = null,
    val schoolId: Long? = null, val schoolName: String? = null, val findable: Boolean = true, val reminders: Boolean = true,
    val first: String = "", val last: String = "",
)

data class SetupState(val d: SetupDraft = SetupDraft(), val busy: Boolean = false, val error: String? = null, val query: String = "", val schools: List<SchoolDto> = emptyList(), val searching: Boolean = false)

class SetupViewModel(private val c: AppContainer, private val invitedBy: String?) : ViewModel() {
    private val json = Json { ignoreUnknownKeys = true }
    private val _state = MutableStateFlow(SetupState())
    val state: StateFlow<SetupState> = _state
    private var searchJob: Job? = null

    init {
        // setup picks up where it stopped, even if the app was closed half way
        viewModelScope.launch { c.settings.setupDraft()?.let { saved -> runCatching { json.decodeFromString(SetupDraft.serializer(), saved) }.getOrNull()?.let { d -> _state.update { it.copy(d = d) } } } }
    }

    val age: Int? get() = _state.value.d.age.toIntOrNull()

    fun edit(change: (SetupDraft) -> SetupDraft) {
        _state.update { it.copy(d = change(it.d), error = null) }
        viewModelScope.launch { c.settings.setSetupDraft(json.encodeToString(SetupDraft.serializer(), _state.value.d)) }
    }

    fun search(q: String) {
        _state.update { it.copy(query = q) }
        searchJob?.cancel()
        if (q.trim().length < 2) { _state.update { it.copy(schools = emptyList(), searching = false) }; return }
        searchJob = viewModelScope.launch {
            delay(300)
            _state.update { it.copy(searching = true) }
            val found = runCatching { c.api.searchSchools(q.trim(), null) }.getOrDefault(emptyList())
            _state.update { it.copy(schools = found, searching = false) }
        }
    }

    fun next() {
        val d = _state.value.d
        val problem = when (d.step) {
            0 -> if (!AgeRules.valid(age)) "Type your age in numbers (5–100)." else null
            5 -> if (d.first.isBlank()) "Type your first name." else null
            6 -> if (d.last.isBlank()) "Type your last name." else null
            else -> null
        }
        if (problem != null) { _state.update { it.copy(error = problem) }; return }
        if (d.step < LAST) edit { it.copy(step = it.step + 1, findable = it.findable && AgeRules.canBeFindable(age)) } else finish()
    }

    fun back() { if (_state.value.d.step > 0) edit { it.copy(step = it.step - 1) } }

    private fun finish() {
        val d = _state.value.d
        val a = age ?: return
        _state.update { it.copy(busy = true, error = null) }
        viewModelScope.launch {
            try {
                c.account.onboard(SetupAnswers(d.first.trim(), d.last.trim(), a, d.purpose, d.grade, d.schoolId, d.findable && AgeRules.canBeFindable(a), d.reminders, avatar = null, invitedBy = invitedBy))
            } catch (e: Exception) { _state.update { it.copy(error = e.friendly()) } }
            _state.update { it.copy(busy = false) }
        }
    }

    fun later() = viewModelScope.launch { c.settings.update { it.copy(setupLater = true) } }
    fun signOut() = viewModelScope.launch { c.account.signOut() }

    companion object { const val LAST = 6 }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SetupScreen(invitedBy: String?) {
    val vm = zingViewModel { SetupViewModel(it, invitedBy) }
    val s by vm.state.collectAsStateWithLifecycle()
    val d = s.d
    val context = LocalContext.current
    val child = AgeRules.isChild(vm.age)
    Page(maxWidth = 560.dp) {
        Column(Modifier.fillMaxSize().safeDrawingPadding().imePadding().verticalScroll(rememberScrollState()).padding(24.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            LinearProgressIndicator(progress = { (d.step + 1f) / (SetupViewModel.LAST + 1) }, modifier = Modifier.fillMaxWidth())
            val (title, sub) = when (d.step) {
                0 -> "How old are you?" to "This keeps Zing safe and right for you."
                1 -> "What brings you to Zing?" to "So we can show the right things first."
                2 -> "Which school year are you in?" to "You can change this later."
                3 -> "Find your school" to "Join your school's leaderboard. You can skip this."
                4 -> "Friends and reminders" to if (child) "Because you're under 13, other students can't find you or see your name." else "Choose what you're comfortable with."
                5 -> "What's your first name?" to "Classmates see your first name and last initial."
                else -> "And your last name?" to if (child) "It stays private: nobody else sees it." else "Classmates only ever see the first letter."
            }
            Text(title, style = MaterialTheme.typography.headlineMedium, modifier = Modifier.semantics { heading() })
            Text(sub, color = MaterialTheme.colorScheme.onSurfaceVariant)
            s.error?.let { MessageCard(it, error = true) }
            when (d.step) {
                0 -> {
                    OutlinedTextField(d.age, { v -> vm.edit { it.copy(age = v.filter(Char::isDigit).take(3)) } }, label = { Text("Age") }, singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Next), keyboardActions = KeyboardActions(onNext = { vm.next() }), modifier = Modifier.widthIn(max = 200.dp).testTag("age"))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("By continuing you agree to the", style = MaterialTheme.typography.bodySmall)
                        TextButton(onClick = { openWeb(context, "terms.html") }) { Text("Terms") }
                        TextButton(onClick = { openWeb(context, "privacy.html") }) { Text("Privacy Policy") }
                    }
                }
                1 -> FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("school" to "School", "university" to "University", "work" to "Work", "other" to "Something else").forEach { (k, label) ->
                        FilterChip(selected = d.purpose == k, onClick = { vm.edit { it.copy(purpose = k) } }, label = { Text(label) })
                    }
                }
                2 -> FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    (6..13).forEach { g -> FilterChip(selected = d.grade == g, onClick = { vm.edit { it.copy(grade = if (it.grade == g) null else g) } }, label = { Text("Grade $g") }) }
                }
                3 -> {
                    if (d.schoolId != null) MessageCard("Your school: ${d.schoolName}", actionLabel = "Change", onAction = { vm.edit { it.copy(schoolId = null, schoolName = null) } })
                    else {
                        OutlinedTextField(s.query, vm::search, label = { Text("Search for your school") }, singleLine = true, modifier = Modifier.fillMaxWidth().testTag("schoolSearch"))
                        if (s.searching) LinearProgressIndicator(Modifier.fillMaxWidth())
                        s.schools.take(8).forEach { school ->
                            ListItem(
                                headlineContent = { Text(school.name) }, supportingContent = { Text(listOfNotNull(school.region, school.members?.let { "$it on Zing" }).joinToString(" · ")) },
                                leadingContent = { SchoolCrest(school, 40.dp) },
                                modifier = Modifier.clickable { vm.edit { it.copy(schoolId = school.id, schoolName = school.name) } },
                            )
                        }
                        if (s.query.length >= 2 && !s.searching && s.schools.isEmpty()) Text("No school found with that name. You can add it later from your profile.", style = MaterialTheme.typography.bodySmall)
                    }
                }
                4 -> {
                    ListItem(headlineContent = { Text("Let classmates find me") }, supportingContent = { Text(if (child) "Not available under 13." else "Students at your school can find you by name.") },
                        trailingContent = { Switch(d.findable && !child, { v -> vm.edit { it.copy(findable = v) } }, enabled = !child) })
                    ListItem(headlineContent = { Text("Study reminders") }, supportingContent = { Text("A nudge to keep your streak going.") }, trailingContent = { Switch(d.reminders, { v -> vm.edit { it.copy(reminders = v) } }) })
                }
                5 -> OutlinedTextField(d.first, { v -> vm.edit { it.copy(first = v.take(30)) } }, label = { Text("First name") }, singleLine = true,
                    keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words, imeAction = ImeAction.Next), keyboardActions = KeyboardActions(onNext = { vm.next() }), modifier = Modifier.fillMaxWidth().testTag("first"))
                else -> OutlinedTextField(d.last, { v -> vm.edit { it.copy(last = v.take(30)) } }, label = { Text("Last name") }, singleLine = true,
                    keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words, imeAction = ImeAction.Done), keyboardActions = KeyboardActions(onDone = { vm.next() }), modifier = Modifier.fillMaxWidth().testTag("last"))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (d.step > 0) OutlinedButton(onClick = vm::back, enabled = !s.busy) { Text("Back") }
                Button(onClick = vm::next, enabled = !s.busy, modifier = Modifier.testTag("next")) { Text(if (s.busy) "Finishing…" else if (d.step == SetupViewModel.LAST) "Finish" else if (d.step == 3 && d.schoolId == null) "Skip" else "Next") }
            }
            Row {
                TextButton(onClick = { vm.later() }) { Text("Finish later") }
                TextButton(onClick = { vm.signOut() }) { Text("Sign out") }
            }
        }
    }
    LaunchedEffect(Unit) { /* keeps the ViewModel alive across configuration changes */ }
}

@Suppress("unused") private val scopeKeep = ::rememberCoroutineScope
@Suppress("unused") private val sizeKeep = Modifier.size(0.dp)
