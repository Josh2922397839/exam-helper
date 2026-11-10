package com.josh.zing.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.LocalActivity
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import app.zing.core.account.AgeRules
import app.zing.core.account.Wallet
import app.zing.core.billing.Entitlement
import app.zing.core.billing.PlusState
import app.zing.core.billing.PurchaseOutcome
import app.zing.core.theme.Appearance
import app.zing.core.theme.BackgroundStyle
import app.zing.core.theme.CardShape
import app.zing.core.theme.DarkMode
import app.zing.core.theme.Density
import app.zing.core.theme.IconStyle
import app.zing.core.theme.Motion
import app.zing.core.theme.NavLayout
import app.zing.core.theme.Preset
import app.zing.core.theme.Themes
import app.zing.core.web.Progress
import com.josh.zing.AppContainer
import com.josh.zing.BuildConfig
import com.josh.zing.auth.GoogleResult
import com.josh.zing.auth.GoogleSignIn
import com.josh.zing.billing.Billing
import com.josh.zing.billing.PlusOffer
import com.josh.zing.data.local.Prefs
import com.josh.zing.data.remote.MeDto
import com.josh.zing.data.remote.SchoolDto
import com.josh.zing.data.remote.Session
import com.josh.zing.sync.SyncState
import com.josh.zing.ui.components.AVATARS
import com.josh.zing.ui.components.Art
import com.josh.zing.ui.components.Avatar
import com.josh.zing.ui.components.ColorSwatches
import com.josh.zing.ui.components.ConfirmDialog
import com.josh.zing.ui.components.LocalApp
import com.josh.zing.ui.components.MessageCard
import com.josh.zing.ui.components.Page
import com.josh.zing.ui.components.SchoolCrest
import com.josh.zing.ui.components.SectionTitle
import com.josh.zing.ui.components.ZScaffold
import com.josh.zing.ui.components.ago
import com.josh.zing.ui.components.zingViewModel
import com.josh.zing.ui.friendly
import com.josh.zing.ui.theme.ZingTheme
import com.josh.zing.ui.theme.rgb
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class SettingsViewModel(private val c: AppContainer) : ViewModel() {
    private fun <T> kotlinx.coroutines.flow.Flow<T>.state(initial: T): StateFlow<T> = stateIn(viewModelScope, SharingStarted.Eagerly, initial)
    val me = c.account.me.state(null)
    val session: StateFlow<Session?> = c.account.session
    val prefs = c.settings.prefs.state(Prefs())
    val appearance = c.settings.appearance.state(Appearance())
    val wallet = c.study.wallet.state(Wallet())
    val progress = c.study.progress.state(Progress())
    val entitlement = c.sync.entitlement.state(Entitlement.NONE)
    val syncState = c.sync.state
    val lastSync = c.sync.lastSync.state(null)
    val busy = MutableStateFlow(false)

    fun setPrefs(change: (Prefs) -> Prefs) = viewModelScope.launch { c.settings.update(change) }

    /** Appearance is saved on the device at once and travels to the student's other devices with the next sync. */
    fun setAppearance(a: Appearance) = viewModelScope.launch { c.settings.setAppearance(a); c.library.setAppearance(a.sane()) }

    fun setFindable(on: Boolean, failed: (String) -> Unit) = viewModelScope.launch { try { c.account.setPrefs(findable = on) } catch (e: Exception) { failed(e.friendly()) } }
    fun setReminders(on: Boolean, context: android.content.Context) = viewModelScope.launch {
        c.settings.update { it.copy(studyReminders = on) }
        com.josh.zing.sync.ReminderWorker.set(context, on)
        runCatching { c.account.setPrefs(reminders = on) }
    }
    fun buyFreeze(done: (Boolean) -> Unit) = viewModelScope.launch { done(c.study.buyFreeze()) }
    fun buyDouble(done: (Boolean) -> Unit) = viewModelScope.launch { done(c.study.buyDoubleXp()) }
    fun syncNow(done: (String) -> Unit) = viewModelScope.launch {
        val r = c.sync.sync()
        done(if (r.ok && !r.skipped) "Backed up" else if (r.offline) "You're offline. Your changes are safe on this phone and will back up later." else if (r.skipped) "Sign in to back up." else "Couldn't back up right now. It will try again.")
    }

    private fun run(done: (String?) -> Unit, block: suspend () -> Unit) {
        if (busy.value) return
        busy.value = true
        viewModelScope.launch { try { block(); done(null) } catch (e: Exception) { done(e.friendly()) } finally { busy.value = false } }
    }

    suspend fun unsynced(): Boolean = c.account.hasUnsyncedChanges()
    fun signOut(everywhere: Boolean, context: android.content.Context, done: (String?) -> Unit) = run(done) { c.account.signOut(everywhere); GoogleSignIn.clear(context) }
    fun deleteAccount(context: android.content.Context, done: (String?) -> Unit) = run(done) { c.account.deleteAccount(); GoogleSignIn.clear(context) }
    fun transferCode(done: (String?, String?) -> Unit) = viewModelScope.launch { try { done(c.account.transferCode(), null) } catch (e: Exception) { done(null, e.friendly()) } }
    fun linkGoogle(activity: android.app.Activity, done: (String?) -> Unit) = run(done) {
        val (raw, hashed) = c.account.newNonce()
        when (val r = GoogleSignIn.idToken(activity, hashed)) {
            is GoogleResult.Token -> c.account.signInGoogle(r.idToken, raw)
            GoogleResult.Cancelled -> Unit
            is GoogleResult.Failed -> throw IllegalStateException(r.message)
        }
    }
    fun linkEmail(email: String, done: (String?) -> Unit) = run(done) { c.account.startEmail(email) }
    fun verifyEmail(code: String, done: (String?) -> Unit) = run(done) { c.account.verifyEmailCode(code) }
    fun saveProfile(username: String, school: Long?, grade: Int?, avatar: String?, done: (String?) -> Unit) = run(done) { c.account.saveProfile(username, school, grade, avatar) }

    val schools = MutableStateFlow<List<SchoolDto>>(emptyList())
    private var searchJob: Job? = null
    fun searchSchools(q: String) {
        searchJob?.cancel()
        if (q.trim().length < 2) { schools.value = emptyList(); return }
        searchJob = viewModelScope.launch { delay(300); schools.value = runCatching { c.api.searchSchools(q.trim(), null) }.getOrDefault(emptyList()) }
    }

    // ---- Zing Plus
    val offers = MutableStateFlow<Result<List<PlusOffer>>?>(null)
    val purchase = c.billing.outcomes
    fun loadOffers() = viewModelScope.launch { offers.value = c.billing.offers() }
    fun buy(activity: android.app.Activity, offer: PlusOffer, failed: (PurchaseOutcome) -> Unit) = viewModelScope.launch { c.billing.buy(activity, offer)?.let(failed) }
    fun restore(done: (PurchaseOutcome) -> Unit) = viewModelScope.launch { done(c.billing.restore()) }
    val manageUrl: String get() = c.billing.manageUrl()
}

private fun friendlyMessage(e: Throwable): String = (e as? IllegalStateException)?.message ?: e.friendly()

@Composable
fun SettingsScreen(onAppearance: () -> Unit, onAccount: () -> Unit, onPlus: () -> Unit, onEditProfile: () -> Unit, onSignIn: () -> Unit) {
    val vm = zingViewModel { SettingsViewModel(it) }
    val app = LocalApp.current
    val context = LocalContext.current
    val me by vm.me.collectAsStateWithLifecycle()
    val prefs by vm.prefs.collectAsStateWithLifecycle()
    val wallet by vm.wallet.collectAsStateWithLifecycle()
    val progress by vm.progress.collectAsStateWithLifecycle()
    val sync by vm.syncState.collectAsStateWithLifecycle()
    val last by vm.lastSync.collectAsStateWithLifecycle()
    val ent by vm.entitlement.collectAsStateWithLifecycle()
    val now = System.currentTimeMillis()
    Page(maxWidth = 640.dp) {
        ZScaffold(title = "Me") { pad ->
            Column(Modifier.fillMaxSize().padding(pad).verticalScroll(rememberScrollState()).padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                val profile = me
                if (profile != null) Card(Modifier.fillMaxWidth().clickable(onClickLabel = "Edit profile", onClick = onEditProfile)) {
                    Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Avatar(profile.avatar, profile.username, 56.dp)
                        Column(Modifier.weight(1f)) {
                            Text(profile.firstName ?: profile.username, style = MaterialTheme.typography.titleLarge)
                            Text("@${profile.username} · ${leagueName(profile.league)} League", color = MaterialTheme.colorScheme.onSurfaceVariant)
                            profile.school?.let { Text(it.name, style = MaterialTheme.typography.bodySmall) }
                        }
                        TextButton(onClick = onEditProfile) { Text("Edit") }
                    }
                } else MessageCard("You're studying on this phone only. Sign in to back up your notebooks and join your school's league.", actionLabel = "Sign in", onAction = onSignIn)

                SectionTitle("Study", Modifier.padding(top = 12.dp))
                ListItem(headlineContent = { Text("Daily goal") }, supportingContent = {
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) { listOf(30, 50, 100, 150).forEach { g -> FilterChip(prefs.goal == g, { vm.setPrefs { it.copy(goal = g) } }, label = { Text("$g XP") }) } }
                })
                val askNotifications = androidx.activity.compose.rememberLauncherForActivityResult(androidx.activity.result.contract.ActivityResultContracts.RequestPermission()) { granted ->
                    vm.setReminders(granted, context)
                    if (!granted) app.notify("Reminders need notifications to be allowed for Zing in your phone's settings.")
                }
                ListItem(headlineContent = { Text("Study reminders") }, supportingContent = { Text("One notification around 5 pm on days you haven't studied yet.") }, trailingContent = {
                    Switch(prefs.studyReminders, { on ->
                        if (on && android.os.Build.VERSION.SDK_INT >= 33) askNotifications.launch(android.Manifest.permission.POST_NOTIFICATIONS) else vm.setReminders(on, context)
                    })
                })
                ListItem(headlineContent = { Text("Vibration feedback") }, trailingContent = { Switch(prefs.haptics, { v -> vm.setPrefs { it.copy(haptics = v) } }) })

                SectionTitle("Coins and power-ups", Modifier.padding(top = 12.dp))
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Art("coin", 32.dp); Text("${wallet.balance} coins", style = MaterialTheme.typography.titleLarge, modifier = Modifier.testTag("coins"))
                        }
                        Text("1 coin per 10 XP, 20 for each daily goal. Coins stay on this phone and have no money value.", style = MaterialTheme.typography.bodySmall)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(onClick = { vm.buyFreeze { ok -> app.notify(if (ok) "Streak freeze ready!" else if (progress.freezes >= 2) "You already hold 2 streak freezes." else "You need ${Wallet.FREEZE_COST} coins.") } }) { Text("Streak freeze · ${Wallet.FREEZE_COST}") }
                            OutlinedButton(onClick = { vm.buyDouble { ok -> app.notify(if (ok) "Double XP for 15 minutes!" else if (wallet.boost(now) == 2) "Double XP is already on." else "You need ${Wallet.DOUBLE_XP_COST} coins.") } }) { Text("Double XP · ${Wallet.DOUBLE_XP_COST}") }
                        }
                        Text("Streak freezes held: ${progress.freezes}", style = MaterialTheme.typography.bodySmall)
                    }
                }

                SectionTitle("App", Modifier.padding(top = 12.dp))
                ListItem(headlineContent = { Text("Appearance") }, supportingContent = { Text("Themes, colours, text size and layout") }, modifier = Modifier.clickable(onClick = onAppearance).testTag("openAppearance"))
                ListItem(headlineContent = { Text("Zing Plus") }, supportingContent = { Text(if (ent.hasPlus(now)) "You're on Plus. Thank you!" else "Optional. Zing stays free to use.") }, modifier = Modifier.clickable(onClick = onPlus).testTag("openPlus"))
                ListItem(headlineContent = { Text("Account") }, supportingContent = { Text("Sign-in, move to another device, sign out, delete") }, modifier = Modifier.clickable(onClick = onAccount).testTag("openAccount"))
                if (profile != null) {
                    val child = AgeRules.isChild(profile.age)
                    ListItem(headlineContent = { Text("Let classmates find me") }, supportingContent = { Text(if (child) "Not available under 13." else "Students at your school can find you by name.") },
                        trailingContent = { Switch(profile.findable && !child, { vm.setFindable(it) { m -> app.notify(m) } }, enabled = !child) })
                }
                ListItem(headlineContent = { Text("Backup") }, supportingContent = {
                    Text(when (sync) { SyncState.RUNNING -> "Backing up…"; SyncState.OFFLINE -> "Offline. Changes are safe on this phone."; SyncState.ERROR -> "Couldn't back up. It will try again."; SyncState.IDLE -> last?.let { "Last backed up ${ago(it, now)}" } ?: "Not backed up yet" })
                }, trailingContent = { TextButton(onClick = { vm.syncNow { app.notify(it) } }) { Text("Back up now") } })

                SectionTitle("More on the website", Modifier.padding(top = 12.dp))
                Text("Live games, challenges, study groups, the Interactive tab and the subject study guides are on the Zing website for now.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Row { TextButton(onClick = { openWeb(context, "") }) { Text("Open the Zing website") } }
                HorizontalDivider()
                Row {
                    TextButton(onClick = { openWeb(context, "privacy.html") }) { Text("Privacy") }
                    TextButton(onClick = { openWeb(context, "terms.html") }) { Text("Terms") }
                    TextButton(onClick = { openWeb(context, "delete-account.html") }) { Text("Deleting your data") }
                }
                Text("Zing ${BuildConfig.VERSION_NAME}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(bottom = 24.dp))
            }
        }
    }
}

// ============================================================================================ appearance

@Composable
private fun <T> Choice(title: String, options: List<T>, selected: T, label: (T) -> String, onPick: (T) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(title, style = MaterialTheme.typography.titleSmall)
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            options.forEach { o -> FilterChip(o == selected, { onPick(o) }, label = { Text(label(o)) }) }
        }
    }
}

/** A small, live picture of the app in the chosen look, so a change can be judged before leaving the screen. */
@Composable
fun ThemePreview(appearance: Appearance, systemDark: Boolean, modifier: Modifier = Modifier) {
    ZingTheme(appearance, systemDark) {
        val scheme = MaterialTheme.colorScheme
        Column(modifier.clip(MaterialTheme.shapes.large).background(scheme.background).border(1.dp, scheme.outline, MaterialTheme.shapes.large).padding(12.dp).semantics { contentDescription = "Preview of ${appearance.preset.label}" }, verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Photosynthesis", style = MaterialTheme.typography.titleLarge, color = scheme.onBackground)
            Card(colors = CardDefaults.cardColors(containerColor = scheme.surface)) {
                Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Plants make glucose using light energy.", color = scheme.onSurface, style = MaterialTheme.typography.bodyMedium)
                    Text("Biology · 2 days ago", color = scheme.onSurfaceVariant, style = MaterialTheme.typography.labelSmall)
                    if (appearance.showProgress) LinearProgressIndicator(progress = { 0.6f }, modifier = Modifier.fillMaxWidth())
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = {}) { Text("Study") }
                OutlinedButton(onClick = {}) { Text("Quiz") }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AppearanceScreen(onBack: () -> Unit) {
    val vm = zingViewModel { SettingsViewModel(it) }
    val a by vm.appearance.collectAsStateWithLifecycle()
    val systemDark = androidx.compose.foundation.isSystemInDarkTheme()
    val resolved = Themes.resolve(a, systemDark)
    Page(maxWidth = 720.dp) {
        ZScaffold(title = "Appearance", onBack = onBack) { pad ->
            Column(Modifier.fillMaxSize().padding(pad).verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                ThemePreview(a, systemDark, Modifier.fillMaxWidth().testTag("themePreview"))
                if (resolved.accentAdjusted) MessageCard("That colour was a little hard to read on this background, so Zing uses the closest shade that is easy to read.", modifier = Modifier.testTag("accentAdjusted"))
                Text("Themes", style = MaterialTheme.typography.titleMedium, modifier = Modifier.semantics { heading() })
                FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Preset.entries.forEach { p ->
                        val palette = Themes.base(p, Themes.isDark(Appearance(p, a.dark), systemDark))
                        Column(
                            Modifier.width(150.dp).clip(MaterialTheme.shapes.medium).border(if (a.preset == p) 3.dp else 1.dp, if (a.preset == p) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline, MaterialTheme.shapes.medium)
                                .selectable(a.preset == p, role = Role.RadioButton) { vm.setAppearance(Appearance.defaultsFor(p).copy(dark = if (p == Preset.MIDNIGHT) DarkMode.DARK else a.dark, fontScale = a.fontScale, nav = a.nav)) }
                                .padding(10.dp).testTag("preset:${p.name}"),
                            verticalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            Row(Modifier.fillMaxWidth().height(36.dp).clip(RoundedCornerShape(8.dp)).background(rgb(palette.background)), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterHorizontally)) {
                                listOf(palette.accent, palette.second, palette.text, palette.surfaceAlt).forEach { Box(Modifier.size(18.dp).clip(RoundedCornerShape(5.dp)).background(rgb(it))) }
                            }
                            Text(p.label, style = MaterialTheme.typography.titleSmall)
                            Text(p.blurb, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
                if (a.preset != Preset.MIDNIGHT) Choice("Light or dark", DarkMode.entries, a.dark, { when (it) { DarkMode.SYSTEM -> "Follow my phone"; DarkMode.LIGHT -> "Light"; DarkMode.DARK -> "Dark" } }) { vm.setAppearance(a.copy(dark = it)) }
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Accent colour", style = MaterialTheme.typography.titleSmall)
                    ColorSwatches(a.accent, { vm.setAppearance(a.copy(accent = it)) }, colors = Appearance.ACCENTS, names = listOf("Zing green", "Coral", "Orange", "Gold", "Sky", "Indigo", "Purple", "Pink", "Teal"))
                    if (a.accent != null) TextButton(onClick = { vm.setAppearance(a.copy(accent = null)) }) { Text("Use the theme's own colour") }
                }
                Choice("Background", BackgroundStyle.entries, a.background, { it.label }) { vm.setAppearance(a.copy(background = it)) }
                Choice("Card shape", CardShape.entries, a.cardShape, { it.label }) { vm.setAppearance(a.copy(cardShape = it)) }
                Choice("Spacing", Density.entries, a.density, { it.label }) { vm.setAppearance(a.copy(density = it)) }
                Choice("Icons", IconStyle.entries, a.icons, { it.label }) { vm.setAppearance(a.copy(icons = it)) }
                Choice("Navigation", NavLayout.entries, a.nav, { it.label }) { vm.setAppearance(a.copy(nav = it)) }
                Choice("Animation", Motion.entries, a.motion, { it.label }) { vm.setAppearance(a.copy(motion = it)) }
                Column {
                    Text("Text size: ${(a.fontScale * 100).toInt()}% of your phone's setting", style = MaterialTheme.typography.titleSmall)
                    var size by remember(a.fontScale) { mutableFloatStateOf(a.fontScale) }
                    Slider(
                        size, { size = it }, valueRange = Appearance.MIN_FONT..Appearance.MAX_FONT, steps = 8, modifier = Modifier.semantics { contentDescription = "Text size" },
                        onValueChangeFinished = { val snapped = Math.round(size * 20) / 20f; if (kotlin.math.abs(snapped - a.fontScale) > 0.001f) vm.setAppearance(a.copy(fontScale = snapped)) },
                    )
                }
                ListItem(headlineContent = { Text("Show progress details") }, supportingContent = { Text("Progress bars and counts on notebooks.") }, trailingContent = { Switch(a.showProgress, { vm.setAppearance(a.copy(showProgress = it)) }) })
                OutlinedButton(onClick = { vm.setAppearance(a.reset()) }, modifier = Modifier.testTag("resetAppearance")) { Text("Reset ${a.preset.label} to how it came") }
                Text("Zing always follows your phone's own font size, dark mode, battery saver and “remove animations” settings.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

// ============================================================================================ account

@Composable
fun AccountScreen(onBack: () -> Unit) {
    val vm = zingViewModel { SettingsViewModel(it) }
    val app = LocalApp.current
    val context = LocalContext.current
    val activity = LocalActivity.current
    val session by vm.session.collectAsStateWithLifecycle()
    val me by vm.me.collectAsStateWithLifecycle()
    val busy by vm.busy.collectAsStateWithLifecycle()
    var code by rememberSaveable { mutableStateOf<String?>(null) }
    var email by rememberSaveable { mutableStateOf("") }
    var emailCode by rememberSaveable { mutableStateOf("") }
    var emailSent by rememberSaveable { mutableStateOf(false) }
    var confirmSignOut by rememberSaveable { mutableStateOf(false) }
    var unsynced by rememberSaveable { mutableStateOf(false) }
    var confirmDelete by rememberSaveable { mutableStateOf(false) }
    var typed by rememberSaveable { mutableStateOf("") }
    LaunchedEffect(confirmSignOut) { if (confirmSignOut) unsynced = vm.unsynced() }
    Page(maxWidth = 640.dp) {
        ZScaffold(title = "Account", onBack = onBack) { pad ->
            Column(Modifier.fillMaxSize().padding(pad).imePadding().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                val s = session
                if (s == null) { MessageCard("You're not signed in on this phone."); return@Column }
                SectionTitle("Sign-in")
                Text(when { s.anonymous -> "Guest account. It lives only on this phone until you add Google or an email."; else -> listOfNotNull(if (s.hasGoogle) "Google" else null, if (s.hasEmail) "Email" else null).joinToString(" and ").ifEmpty { "Signed in" } + " is connected." })
                if (!s.hasGoogle && GoogleSignIn.configured) OutlinedButton(onClick = { activity?.let { act -> vm.linkGoogle(act) { err -> app.notify(err ?: "Google connected.") } } }, enabled = !busy) { Text("Connect Google") }
                if (!s.hasEmail) {
                    OutlinedTextField(email, { email = it.take(254) }, label = { Text("Add an email address") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    if (!emailSent) OutlinedButton(onClick = { vm.linkEmail(email) { err -> if (err == null) emailSent = true; app.notify(err ?: "Check your email for a code.") } }, enabled = !busy && email.isNotBlank()) { Text("Email me a code") }
                    else {
                        OutlinedTextField(emailCode, { emailCode = it.filter(Char::isDigit).take(8) }, label = { Text("Code from the email") }, singleLine = true)
                        Button(onClick = { vm.verifyEmail(emailCode) { err -> app.notify(err ?: "Email connected.") } }, enabled = !busy && emailCode.length >= 6) { Text("Connect email") }
                    }
                }
                if (me != null) {
                    SectionTitle("Move to another device", Modifier.padding(top = 10.dp))
                    Text("A one-time code moves this whole account. Keep it private: anyone with the code can take the account.", style = MaterialTheme.typography.bodySmall)
                    code?.let { Text(it, style = MaterialTheme.typography.headlineSmall, modifier = Modifier.testTag("transferCode")) }
                    OutlinedButton(onClick = { vm.transferCode { c, err -> code = c; err?.let(app::notify) } }) { Text(if (code == null) "Show a transfer code" else "Make a new code") }
                }
                SectionTitle("Leave", Modifier.padding(top = 10.dp))
                OutlinedButton(onClick = { confirmSignOut = true }, enabled = !busy, modifier = Modifier.testTag("signOut")) { Text("Sign out") }
                TextButton(onClick = { vm.signOut(true, context) { err -> app.notify(err ?: "Signed out on every device.") } }, enabled = !busy) { Text("Sign out on every device") }
                if (!confirmDelete) Button(onClick = { confirmDelete = true; typed = "" }, enabled = !busy, colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error, contentColor = MaterialTheme.colorScheme.onError), modifier = Modifier.testTag("deleteAccount")) { Text("Delete my account") }
                else Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Delete your account for good?", style = MaterialTheme.typography.titleMedium, modifier = Modifier.semantics { heading() })
                        Text("This deletes your profile, cloud backup, shared decks, friends list and sign-in, and clears this phone. It can't be undone.")
                        OutlinedTextField(typed, { typed = it.take(10) }, label = { Text("Type DELETE to confirm") }, singleLine = true, modifier = Modifier.fillMaxWidth().testTag("deleteConfirmField"))
                        Button(onClick = { confirmDelete = false; vm.deleteAccount(context) { err -> app.notify(err ?: "Your account was deleted.") } }, enabled = !busy && typed.trim() == "DELETE",
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error, contentColor = MaterialTheme.colorScheme.onError), modifier = Modifier.testTag("deleteConfirm")) { Text("Delete everything") }
                        OutlinedButton(onClick = { confirmDelete = false }) { Text("Keep my account") }
                    }
                }
                Text("Deleting removes your profile, cloud backup, shared decks, friends and your sign-in, and clears this phone. It can't be undone. Decks other students already saved stay with them.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
    if (confirmSignOut) ConfirmDialog(
        "Sign out?",
        (if (session?.anonymous == true) "This is a guest account. If you sign out without adding Google or an email (or saving a transfer code), you can't get back into it. " else "") +
            (if (unsynced) "Some changes haven't been backed up yet. Zing will try to back them up first. " else "") + "Your notebooks stay on this phone for when you sign back in.",
        "Sign out", onDismiss = { confirmSignOut = false }, onConfirm = { confirmSignOut = false; vm.signOut(false, context) { err -> err?.let(app::notify) } },
    )
}

// ============================================================================================ edit profile

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun EditProfileScreen(onBack: () -> Unit) {
    val vm = zingViewModel { SettingsViewModel(it) }
    val app = LocalApp.current
    val me by vm.me.collectAsStateWithLifecycle()
    val busy by vm.busy.collectAsStateWithLifecycle()
    val schools by vm.schools.collectAsStateWithLifecycle()
    val profile = me
    var username by rememberSaveable(profile?.username) { mutableStateOf(profile?.username.orEmpty()) }
    var grade by rememberSaveable(profile?.grade) { mutableStateOf(profile?.grade) }
    var avatar by rememberSaveable(profile?.avatar) { mutableStateOf(profile?.avatar) }
    var schoolId by rememberSaveable(profile?.school?.id) { mutableStateOf(profile?.school?.id) }
    var schoolName by rememberSaveable(profile?.school?.name) { mutableStateOf(profile?.school?.name) }
    var query by rememberSaveable { mutableStateOf("") }
    Page(maxWidth = 640.dp) {
        ZScaffold(title = "Edit profile", onBack = onBack) { pad ->
            Column(Modifier.fillMaxSize().padding(pad).imePadding().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                if (profile == null) { MessageCard("Finish setting up your account first."); return@Column }
                OutlinedTextField(username, { username = it.filter { ch -> ch.isLetterOrDigit() || ch == '_' }.take(20) }, label = { Text("Username") }, singleLine = true, supportingText = { Text("3–20 letters, numbers or _. Everyone can see this, so don't use your full name.") }, modifier = Modifier.fillMaxWidth().testTag("username"))
                Text("Picture", style = MaterialTheme.typography.titleSmall)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    AVATARS.forEach { k ->
                        Box(Modifier.size(56.dp).clip(RoundedCornerShape(28.dp)).border(if (avatar == k) 3.dp else 0.dp, if (avatar == k) MaterialTheme.colorScheme.primary else androidx.compose.ui.graphics.Color.Transparent, RoundedCornerShape(28.dp))
                            .selectable(avatar == k, role = Role.RadioButton) { avatar = k }.semantics { contentDescription = "$k avatar" }, contentAlignment = Alignment.Center) { Avatar(k, null, 48.dp) }
                    }
                }
                Text("School year", style = MaterialTheme.typography.titleSmall)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) { (6..13).forEach { g -> FilterChip(grade == g, { grade = if (grade == g) null else g }, label = { Text("Grade $g") }) } }
                Text("School", style = MaterialTheme.typography.titleSmall)
                if (schoolId != null) MessageCard(schoolName ?: "Your school", actionLabel = "Change", onAction = { schoolId = null; schoolName = null })
                else {
                    OutlinedTextField(query, { query = it; vm.searchSchools(it) }, label = { Text("Search for your school") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    schools.take(8).forEach { sc -> ListItem(headlineContent = { Text(sc.name) }, supportingContent = { Text(sc.region.orEmpty()) }, leadingContent = { SchoolCrest(sc, 40.dp) }, modifier = Modifier.clickable { schoolId = sc.id; schoolName = sc.name }) }
                }
                Button(onClick = { vm.saveProfile(username, schoolId, grade, avatar) { err -> if (err == null) onBack(); app.notify(err ?: "Profile saved") } }, enabled = !busy && username.length >= 3, modifier = Modifier.testTag("saveProfile")) { Text(if (busy) "Saving…" else "Save") }
            }
        }
    }
}

// ============================================================================================ Zing Plus

private fun periodText(iso: String): String = when { iso.contains("Y") -> "a year"; iso.contains("M") -> iso.filter(Char::isDigit).let { if (it == "1" || it.isEmpty()) "a month" else "$it months" }; iso.contains("W") -> "a week"; else -> iso }

@Composable
fun PlusScreen(onBack: () -> Unit) {
    val vm = zingViewModel { SettingsViewModel(it) }
    val app = LocalApp.current
    val context = LocalContext.current
    val activity = LocalActivity.current
    val ent by vm.entitlement.collectAsStateWithLifecycle()
    val offers by vm.offers.collectAsStateWithLifecycle()
    val session by vm.session.collectAsStateWithLifecycle()
    val now = System.currentTimeMillis()
    LaunchedEffect(Unit) { vm.loadOffers() }
    LaunchedEffect(Unit) { vm.purchase.collect { app.notify(Billing.message(it)) } }
    Page(maxWidth = 640.dp) {
        ZScaffold(title = "Zing Plus", onBack = onBack) { pad ->
            Column(Modifier.fillMaxSize().padding(pad).verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Zing is free", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.semantics { heading() })
                Text("Notebooks, search, cards, quizzes, leagues and Magic import all work without paying. Zing Plus is an optional way to support Zing. Nothing you use today is being taken away.")
                when (ent.state) {
                    PlusState.ACTIVE, PlusState.GRACE, PlusState.CANCELED_ACTIVE -> MessageCard(
                        when (ent.state) { PlusState.GRACE -> "You're on Plus, but your last payment didn't go through. Update your payment method in Google Play to keep it."; PlusState.CANCELED_ACTIVE -> "You've cancelled. Plus stays on until the end of the time you paid for."; else -> "You're on Zing Plus. Thank you!" },
                        modifier = Modifier.testTag("plusActive"),
                    )
                    PlusState.PENDING -> MessageCard("Your payment is being confirmed by Google Play. Plus switches on by itself when it goes through.")
                    PlusState.ON_HOLD -> MessageCard("Plus is on hold because a payment failed. Fix your payment method in Google Play to bring it back.", error = true)
                    PlusState.PAUSED -> MessageCard("Your subscription is paused.")
                    PlusState.REVOKED -> MessageCard("This subscription was refunded or cancelled by Google Play.")
                    else -> Unit
                }
                if (session?.anonymous != false) MessageCard("Sign in with Google or email before subscribing, so your subscription stays with your account.")
                when (val o = offers) {
                    null -> LinearProgressIndicator(Modifier.fillMaxWidth())
                    else -> o.fold(
                        onSuccess = { list ->
                            if (list.isEmpty()) MessageCard("Zing Plus isn't available here yet.")
                            list.forEach { offer ->
                                Card(Modifier.fillMaxWidth()) {
                                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                        // the price is Google Play's own text for this student's country, including tax where it applies
                                        Text("${offer.price} ${periodText(offer.period).let { "for $it" }}", style = MaterialTheme.typography.titleLarge)
                                        Text(listOfNotNull(offer.freeTrial?.let { "Free for ${periodText(it).removePrefix("a ")} first, then ${offer.price}." }, "Renews automatically every ${periodText(offer.period).removePrefix("a ")} until you cancel.", "Cancel any time in Google Play; you keep Plus until the end of the period you paid for.").joinToString(" "), style = MaterialTheme.typography.bodySmall)
                                        Button(onClick = { activity?.let { a -> vm.buy(a, offer) { out -> app.notify(Billing.message(out)) } } }, enabled = session?.anonymous == false && !ent.hasPlus(now), modifier = Modifier.testTag("buy:${offer.basePlanId}")) { Text("Subscribe") }
                                    }
                                }
                            }
                        },
                        onFailure = { e -> MessageCard(friendlyMessage(e), modifier = Modifier.testTag("billingUnavailable"), actionLabel = "Try again", onAction = { vm.loadOffers() }) },
                    )
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { vm.restore { app.notify(if (it == PurchaseOutcome.UNAVAILABLE) "No Zing Plus purchase was found on this Google account." else Billing.message(it)) } }, modifier = Modifier.testTag("restore")) { Text("Restore purchases") }
                    TextButton(onClick = { runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(vm.manageUrl)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } }) { Text("Manage in Google Play") }
                }
                Text("Payments are handled by Google Play. Zing never sees your card details.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Suppress("unused") private fun keepMe(m: MeDto?) = m
@Suppress("unused") private fun keepUpdate(f: MutableStateFlow<Int>) = f.update { it }
