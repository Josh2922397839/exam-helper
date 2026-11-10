package com.josh.zing.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.PrimaryScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import app.zing.core.account.DeepLink
import app.zing.core.model.Card
import app.zing.core.web.SaveCodec
import app.zing.core.web.ShareLink
import com.josh.zing.AppContainer
import com.josh.zing.data.remote.BoardRow
import com.josh.zing.data.remote.MeDto
import com.josh.zing.data.remote.ProfileDto
import com.josh.zing.data.remote.SchoolDto
import com.josh.zing.data.remote.SchoolSetDto
import com.josh.zing.ui.components.Avatar
import com.josh.zing.ui.components.ConfirmDialog
import com.josh.zing.ui.components.EmptyState
import com.josh.zing.ui.components.LocalApp
import com.josh.zing.ui.components.MessageCard
import com.josh.zing.ui.components.Page
import com.josh.zing.ui.components.SchoolCrest
import com.josh.zing.ui.components.Skeleton
import com.josh.zing.ui.components.ZScaffold
import com.josh.zing.ui.components.plural
import com.josh.zing.ui.components.zingViewModel
import com.josh.zing.ui.friendly
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

val LEAGUES = listOf("Spark", "Ember", "Flame", "Blaze", "Torch", "Forge", "Inferno", "Phoenix", "Supernova")
fun leagueName(n: Int): String = LEAGUES[(n.coerceIn(1, 9)) - 1]
fun xpText(n: Long): String = if (n >= 10_000) "${n / 1000}k" else if (n >= 1000) "${n / 100 / 10.0}k" else n.toString()

sealed interface Load<out T> {
    data object Loading : Load<Nothing>
    data class Ready<T>(val value: T) : Load<T>
    data class Failed(val message: String) : Load<Nothing>
}

data class LeagueUi(val tab: Int = 0, val period: String = "week", val rows: Load<List<BoardRow>> = Load.Loading, val schools: List<SchoolDto> = emptyList(), val note: String = "", val refreshing: Boolean = false)

class LeagueViewModel(private val c: AppContainer) : ViewModel() {
    val me: StateFlow<MeDto?> = c.account.me.stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val _ui = MutableStateFlow(LeagueUi())
    val ui: StateFlow<LeagueUi> = _ui
    private var blocked: Set<String> = emptySet()

    init { load() }

    fun tab(i: Int) { _ui.update { it.copy(tab = i, rows = Load.Loading) }; load() }
    fun period(p: String) { _ui.update { it.copy(period = p, rows = Load.Loading) }; load() }
    fun refresh() { _ui.update { it.copy(refreshing = true) }; load() }

    private fun load() = viewModelScope.launch {
        val s = _ui.value
        try {
            blocked = runCatching { c.api.blocked().toSet() }.getOrDefault(blocked)
            when (s.tab) {
                0 -> c.api.leagueBoard().let { b ->
                    val note = if (b == null) "" else (if (b.promote > 0) "Top ${b.promote} with 30+ XP move up" else "Top league: hold your spot") + (if (b.demote > 0) ", bottom ${b.demote} move down" else "") + " when the week ends."
                    _ui.update { it.copy(rows = Load.Ready(b?.rows.orEmpty().hide()), note = note) }
                }
                1 -> {
                    val school = c.sync.cachedMe()?.school
                    if (school == null) _ui.update { it.copy(rows = Load.Ready(emptyList()), note = "Pick your school in your profile to see its board.") }
                    else c.api.schoolBoard(school.id, s.period).let { b -> _ui.update { it.copy(rows = Load.Ready(b?.rows.orEmpty().hide()), note = "${school.name} · ${plural(b?.school?.members ?: 0, "student")}") } }
                }
                2 -> c.api.schoolsBoard("JM").let { b -> _ui.update { it.copy(schools = b.rows, rows = Load.Ready(emptyList()), note = "Schools in Jamaica by XP this week.") } }
                else -> c.api.friendsBoard().let { b -> _ui.update { it.copy(rows = Load.Ready(b.rows.hide()), note = "You and the people you follow, this week.") } }
            }
        } catch (e: Exception) { _ui.update { it.copy(rows = Load.Failed(e.friendly())) } }
        _ui.update { it.copy(refreshing = false) }
    }

    /** Students this account has blocked never appear in its lists. */
    private fun List<BoardRow>.hide() = filter { it.username !in blocked }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LeagueScreen(onProfile: (String) -> Unit, onSchool: (Long) -> Unit, onSignIn: () -> Unit) {
    val vm = zingViewModel { LeagueViewModel(it) }
    val me by vm.me.collectAsStateWithLifecycle()
    val s by vm.ui.collectAsStateWithLifecycle()
    Page {
        ZScaffold(title = me?.let { "${leagueName(it.league)} League" } ?: "Leagues") { pad ->
            if (me == null) { EmptyState("trophy", "Compete with your school", "Sign in and finish setup to join the weekly leagues. Everything you study earns XP.", Modifier.padding(pad), "Set up my account", onSignIn); return@ZScaffold }
            Column(Modifier.fillMaxSize().padding(pad)) {
                PrimaryScrollableTabRow(selectedTabIndex = s.tab, edgePadding = 12.dp) {
                    listOf("League", "My school", "Schools", "Friends").forEachIndexed { i, t -> Tab(s.tab == i, { vm.tab(i) }, text = { Text(t) }) }
                }
                PullToRefreshBox(isRefreshing = s.refreshing, onRefresh = vm::refresh, modifier = Modifier.fillMaxSize()) {
                    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxSize()) {
                        if (s.tab == 1) item {
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                listOf("week" to "Week", "month" to "Month", "all" to "All time").forEach { (k, l) -> if (s.period == k) Button(onClick = {}) { Text(l) } else OutlinedButton(onClick = { vm.period(k) }) { Text(l) } }
                            }
                        }
                        if (s.note.isNotBlank()) item { Text(s.note, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                        when (val rows = s.rows) {
                            Load.Loading -> item { Skeleton(6) }
                            is Load.Failed -> item { MessageCard(rows.message, error = true, actionLabel = "Try again", onAction = { vm.refresh() }) }
                            is Load.Ready -> if (s.tab == 2) {
                                if (s.schools.isEmpty()) item { EmptyState("school", "No schools here yet", "Be the first to put yours on the board!") }
                                items(s.schools, key = { it.id }) { school ->
                                    ListItem(
                                        leadingContent = { Row(verticalAlignment = Alignment.CenterVertically) { Text("${school.rank ?: ""}", Modifier.width(28.dp), fontWeight = FontWeight.Bold); SchoolCrest(school, 40.dp) } },
                                        headlineContent = { Text(school.name, maxLines = 1, overflow = TextOverflow.Ellipsis) }, supportingContent = { Text(listOfNotNull(school.members?.let { plural(it, "student") }, school.region).joinToString(" · ")) },
                                        trailingContent = { Text("${xpText(school.xp ?: 0)} XP", style = MaterialTheme.typography.labelLarge) }, modifier = Modifier.clickable { onSchool(school.id) },
                                    )
                                }
                            } else {
                                if (rows.value.isEmpty() && s.tab != 1) item { EmptyState("people", "Nobody here yet", if (s.tab == 3) "Follow classmates from their profile to see them here." else "Study to claim the top spot!") }
                                items(rows.value, key = { it.username }) { row -> BoardRowItem(row) { onProfile(row.username) } }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun BoardRowItem(row: BoardRow, onClick: () -> Unit) {
    ListItem(
        leadingContent = { Row(verticalAlignment = Alignment.CenterVertically) { Text("${row.rank}", Modifier.width(28.dp), fontWeight = FontWeight.Bold); Avatar(row.avatar, row.username, 40.dp) } },
        headlineContent = { Text(row.name ?: row.username, maxLines = 1, overflow = TextOverflow.Ellipsis, fontWeight = if (row.me) FontWeight.Bold else null) },
        supportingContent = { Text(listOfNotNull(if (row.me) "You" else null, row.school, row.grade?.let { "Grade $it" }, if (row.friend) "Following" else null).joinToString(" · ")) },
        trailingContent = { Text("${xpText(row.xp)} XP", style = MaterialTheme.typography.labelLarge) },
        modifier = Modifier.clickable(onClickLabel = "Open profile", onClick = onClick).semantics { contentDescription = "Rank ${row.rank}, ${row.name ?: row.username}, ${row.xp} XP" },
    )
}

// ============================================================================================ a student's profile

class ProfileViewModel(private val c: AppContainer, private val username: String) : ViewModel() {
    val state = MutableStateFlow<Load<ProfileDto>>(Load.Loading)
    val blocked = MutableStateFlow(false)
    init { load() }
    fun load() = viewModelScope.launch {
        state.value = try { c.api.profile(username)?.let { Load.Ready(it) } ?: Load.Failed("Nobody with that name yet.") } catch (e: Exception) { Load.Failed(e.friendly()) }
        blocked.value = runCatching { username in c.api.blocked() }.getOrDefault(false)
    }
    fun follow(on: Boolean, failed: (String) -> Unit) = viewModelScope.launch {
        try { if (on) c.api.follow(username) else c.api.unfollow(username); load() } catch (e: Exception) { failed(e.friendly()) }
    }
    fun block(on: Boolean, done: (String) -> Unit) = viewModelScope.launch {
        try { if (on) c.api.block(username) else c.api.unblock(username); blocked.value = on; done(if (on) "Blocked. They can't challenge you or add you to groups, and you won't see them in your lists." else "Unblocked.") }
        catch (e: Exception) { done(if ((e as? com.josh.zing.data.remote.ApiException)?.notDeployed == true) "Blocking isn't switched on yet." else e.friendly()) }
    }
    fun report(reason: String, done: (Boolean) -> Unit) = viewModelScope.launch { done(runCatching { c.api.report("profile", username, reason) }.isSuccess) }
}

@Composable
fun ProfileScreen(username: String, onBack: () -> Unit, onSchool: (Long) -> Unit) {
    val vm = zingViewModel(key = "profile:$username") { ProfileViewModel(it, username) }
    val app = LocalApp.current
    val s by vm.state.collectAsStateWithLifecycle()
    val blocked by vm.blocked.collectAsStateWithLifecycle()
    var reporting by rememberSaveable { mutableStateOf(false) }
    var confirmBlock by rememberSaveable { mutableStateOf(false) }
    Page(maxWidth = 600.dp) {
        ZScaffold(title = "Profile", onBack = onBack) { pad ->
            Column(Modifier.fillMaxSize().padding(pad).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                when (val st = s) {
                    Load.Loading -> Skeleton(3)
                    is Load.Failed -> MessageCard(st.message, error = true, actionLabel = "Try again", onAction = { vm.load() })
                    is Load.Ready -> {
                        val p = st.value
                        Avatar(p.avatar, p.username, 96.dp)
                        Text(p.name ?: p.username, style = MaterialTheme.typography.headlineSmall, modifier = Modifier.semantics { heading() })
                        Text("@${p.username} · ${leagueName(p.league)} League" + (p.grade?.let { " · Grade $it" } ?: ""), color = MaterialTheme.colorScheme.onSurfaceVariant)
                        p.school?.let { sc -> TextButton(onClick = { onSchool(sc.id) }) { SchoolCrest(sc, 28.dp); Text("  " + sc.name) } }
                        Row(horizontalArrangement = Arrangement.spacedBy(20.dp)) {
                            Stat(xpText(p.xpWeek), "XP this week"); Stat(xpText(p.xpTotal), "XP in all"); Stat("${p.followers}", "followers")
                        }
                        if (!p.me) {
                            if (blocked) MessageCard("You've blocked this student.", actionLabel = "Unblock", onAction = { vm.block(false) { app.notify(it) } })
                            else Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                if (p.iFollow) OutlinedButton(onClick = { vm.follow(false) { app.notify(it) } }) { Text("Following") } else Button(onClick = { vm.follow(true) { app.notify(it) } }, modifier = Modifier.testTag("follow")) { Text(if (p.followsMe) "Follow back" else "Follow") }
                            }
                            Row {
                                TextButton(onClick = { reporting = true }) { Text("Report") }
                                if (!blocked) TextButton(onClick = { confirmBlock = true }) { Text("Block") }
                            }
                        }
                    }
                }
            }
        }
    }
    if (reporting) ReportDialog({ reporting = false }, listOf("name" to "Rude or fake name", "bullying" to "Bullying or harassment", "impersonation" to "Pretending to be someone else", "other" to "Something else")) { r ->
        reporting = false; vm.report(r) { ok -> app.notify(if (ok) "Thanks. Your report was sent." else "Couldn't send the report right now. You can also use the contact on the Privacy page.") }
    }
    if (confirmBlock) ConfirmDialog("Block @$username?", "They won't be able to challenge you or add you to groups, you'll stop following each other, and you won't see them in your lists.", "Block", destructive = true,
        onDismiss = { confirmBlock = false }, onConfirm = { confirmBlock = false; vm.block(true) { app.notify(it) } })
}

@Composable
private fun Stat(value: String, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) { Text(value, style = MaterialTheme.typography.titleLarge); Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
}

// ============================================================================================ a school: board and shared decks

data class SchoolUi(val school: SchoolDto? = null, val rows: Load<List<BoardRow>> = Load.Loading, val sets: List<SchoolSetDto> = emptyList(), val tab: Int = 0)

class SchoolViewModel(private val c: AppContainer, private val id: Long) : ViewModel() {
    val ui = MutableStateFlow(SchoolUi())
    init { load() }
    fun tab(i: Int) = ui.update { it.copy(tab = i) }
    fun load() = viewModelScope.launch {
        try {
            val b = c.api.schoolBoard(id, "week")
            ui.update { it.copy(school = b?.school, rows = Load.Ready(b?.rows.orEmpty()), sets = runCatching { c.api.schoolSets(id) }.getOrDefault(emptyList())) }
        } catch (e: Exception) { ui.update { it.copy(rows = Load.Failed(e.friendly())) } }
    }
}

@Composable
fun SchoolScreen(id: Long, onBack: () -> Unit, onProfile: (String) -> Unit, onShared: (String) -> Unit) {
    val vm = zingViewModel(key = "school:$id") { SchoolViewModel(it, id) }
    val s by vm.ui.collectAsStateWithLifecycle()
    Page {
        ZScaffold(title = s.school?.name ?: "School", onBack = onBack) { pad ->
            Column(Modifier.fillMaxSize().padding(pad)) {
                PrimaryScrollableTabRow(selectedTabIndex = s.tab, edgePadding = 12.dp) { listOf("Leaderboard", "Decks (${s.sets.size})").forEachIndexed { i, t -> Tab(s.tab == i, { vm.tab(i) }, text = { Text(t) }) } }
                LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxSize()) {
                    when (val rows = s.rows) {
                        Load.Loading -> item { Skeleton(5) }
                        is Load.Failed -> item { MessageCard(rows.message, error = true, actionLabel = "Try again", onAction = { vm.load() }) }
                        is Load.Ready -> if (s.tab == 0) {
                            if (rows.value.isEmpty()) item { EmptyState("school", "Nobody from this school yet", "Be the first!") }
                            items(rows.value, key = { it.username }) { r -> BoardRowItem(r) { onProfile(r.username) } }
                        } else {
                            if (s.sets.isEmpty()) item { EmptyState("cards", "No shared decks yet", "Decks that students share with this school appear here.") }
                            items(s.sets, key = { it.id }) { set ->
                                ListItem(headlineContent = { Text(set.name) }, supportingContent = { Text("${plural(set.cardCount, "card")} · by ${set.author ?: "a student"} · saved ${set.saves}×") }, modifier = Modifier.clickable { onShared(set.id) })
                            }
                        }
                    }
                }
            }
        }
    }
}

// ============================================================================================ a deck someone shared

data class SharedUi(val loading: Boolean = true, val name: String = "", val color: String = "", val cards: List<Card> = emptyList(), val author: String? = null, val error: String? = null, val savedAs: String? = null)

class SharedDeckViewModel(private val c: AppContainer, private val link: DeepLink) : ViewModel() {
    val ui = MutableStateFlow(SharedUi())
    private val sharedId = (link as? DeepLink.SharedDeck)?.id

    init {
        viewModelScope.launch {
            ui.value = when (link) {
                is DeepLink.ImportDeck -> ShareLink.decode(link.code)?.let { SharedUi(false, it.name, it.color, it.cards) } ?: SharedUi(false, error = "That link didn't work. Ask for it again.")
                is DeepLink.SharedDeck -> try {
                    c.api.sharedDeck(link.id)?.let { d -> SharedUi(false, d.name, d.color.orEmpty(), d.cards.mapNotNull { SaveCodec.cardFromJson(it) }, d.author) } ?: SharedUi(false, error = "That deck was removed.")
                } catch (e: Exception) { SharedUi(false, error = e.friendly()) }
                else -> SharedUi(false, error = "That link didn't work.")
            }
        }
    }

    /** Adds the deck to the student's notebooks. Opening the same link twice doesn't make a second copy. */
    fun save() = viewModelScope.launch {
        val s = ui.value
        val existing = c.library.snapshot().map { it.deck }.firstOrNull { d -> (sharedId != null && d.from == sharedId) || (sharedId == null && d.name == s.name && d.cards.size == s.cards.size) }
        val id = existing?.id ?: c.library.createDeck(s.name, s.color).id.also { newId ->
            c.library.update(newId) { it.copy(cards = s.cards, from = sharedId) }
            sharedId?.let { runCatching { c.api.sharedSaved(it) } }
        }
        ui.update { it.copy(savedAs = id) }
    }

    fun report(reason: String, done: (Boolean) -> Unit) = viewModelScope.launch { done(sharedId != null && runCatching { c.api.report("deck", sharedId, reason) }.isSuccess) }
}

@Composable
fun SharedDeckScreen(link: DeepLink, onBack: () -> Unit, onOpen: (String) -> Unit) {
    val vm = zingViewModel(key = "shared:$link") { SharedDeckViewModel(it, link) }
    val app = LocalApp.current
    val s by vm.ui.collectAsStateWithLifecycle()
    var reporting by rememberSaveable { mutableStateOf(false) }
    LaunchedEffect(s.savedAs) { s.savedAs?.let(onOpen) }
    Page {
        ZScaffold(title = "Shared deck", onBack = onBack) { pad ->
            LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxSize().padding(pad)) {
                if (s.loading) item { Skeleton(4) }
                s.error?.let { e -> item { MessageCard(e, error = true) } }
                if (!s.loading && s.error == null) {
                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(s.name, style = MaterialTheme.typography.headlineSmall, modifier = Modifier.semantics { heading() })
                            Text(plural(s.cards.size, "card") + (s.author?.let { " · shared by $it" } ?: ""), color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("This came from another student. Check it before you rely on it.", style = MaterialTheme.typography.bodySmall)
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button(onClick = { vm.save() }, modifier = Modifier.testTag("saveShared")) { Text("Add to my notebooks") }
                                if (link is DeepLink.SharedDeck) TextButton(onClick = { reporting = true }) { Text("Report") }
                            }
                        }
                    }
                    items(s.cards.take(40)) { card -> Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(12.dp)) { Text(card.q, style = MaterialTheme.typography.titleSmall); Text(card.a, color = MaterialTheme.colorScheme.primary) } } }
                }
            }
        }
    }
    if (reporting) ReportDialog({ reporting = false }, listOf("inappropriate" to "Inappropriate content", "personal" to "Shares someone's private details", "wrong" to "Wrong or misleading", "other" to "Something else")) { r ->
        reporting = false; vm.report(r) { ok -> app.notify(if (ok) "Thanks. Your report was sent." else "Couldn't send the report right now. You can also use the contact on the Privacy page.") }
    }
}
