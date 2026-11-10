package com.josh.zing.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import app.zing.core.web.Progress
import com.josh.zing.AppContainer
import com.josh.zing.data.repo.NotebookSummary
import com.josh.zing.data.repo.Notebooks
import com.josh.zing.sync.SyncState
import com.josh.zing.ui.components.Art
import com.josh.zing.ui.components.EmptyState
import com.josh.zing.ui.components.MessageCard
import com.josh.zing.ui.components.Page
import com.josh.zing.ui.components.ProgressRing
import com.josh.zing.ui.components.SectionTitle
import com.josh.zing.ui.components.ZScaffold
import com.josh.zing.ui.components.plural
import com.josh.zing.ui.components.zingViewModel
import com.josh.zing.ui.theme.LocalZing
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import java.time.LocalDate

data class HomeState(
    val loading: Boolean = true, val name: String? = null, val streak: Int = 0, val xpToday: Int = 0, val goal: Int = 50, val level: Int = 1, val coins: Int = 0,
    val recent: List<NotebookSummary> = emptyList(), val due: Int = 0, val conflicts: Int = 0, val sync: SyncState = SyncState.IDLE, val signedIn: Boolean = false,
)

class HomeViewModel(private val c: AppContainer) : ViewModel() {
    private val library = combine(c.library.decks, c.library.overlay, c.library.conflicts) { d, o, cf -> Triple(d, o, cf) }
    private val person = combine(c.account.me, c.study.wallet, c.settings.prefs, c.sync.state) { me, w, p, s -> listOf(me, w, p, s) }
    val state: StateFlow<HomeState> = combine(library, c.study.progress, person) { (decks, overlay, conflicts), progress, (me, wallet, prefs, sync) ->
        val today = LocalDate.now()
        val books = Notebooks.summarise(decks, overlay, progress, conflicts.map { it.deckId }.toSet(), c.now()).filter { !it.archived }
        HomeState(
            loading = false, name = (me as? com.josh.zing.data.remote.MeDto)?.firstName, streak = progress.streak(today), xpToday = progress.xpToday(today),
            goal = (prefs as com.josh.zing.data.local.Prefs).goal, level = Progress.level(progress.xp).level, coins = (wallet as app.zing.core.account.Wallet).balance,
            recent = books.sortedByDescending { it.lastUpdated }.take(4), due = books.sumOf { it.due }, conflicts = conflicts.size, sync = sync as SyncState, signedIn = me != null,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), HomeState())
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun HomeScreen(onNotebook: (String) -> Unit, onNotebooks: () -> Unit, onSearch: () -> Unit, onImport: () -> Unit, onFlashcards: (String) -> Unit) {
    val vm = zingViewModel { HomeViewModel(it) }
    val s by vm.state.collectAsStateWithLifecycle()
    val showProgress = LocalZing.current.showProgress
    val now = System.currentTimeMillis()
    Page {
        ZScaffold(title = s.name?.let { "Hi, $it" } ?: "Zing") { pad ->
            LazyVerticalGrid(GridCells.Adaptive(170.dp), contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 24.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxSize().padding(pad)) {
                item(span = { GridItemSpan(maxLineSpan) }) {
                    Card(Modifier.fillMaxWidth()) {
                        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            ProgressRing(if (s.goal == 0) 0f else s.xpToday.toFloat() / s.goal, 72.dp, label = "${s.xpToday}", modifier = Modifier.semantics { contentDescription = "${s.xpToday} of ${s.goal} XP today" })
                            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text(if (s.xpToday >= s.goal) "Daily goal reached!" else "${s.goal - s.xpToday} XP to today's goal", style = MaterialTheme.typography.titleMedium)
                                if (showProgress) Text("${plural(s.streak, "day")} streak · Level ${s.level} · ${plural(s.coins, "coin")}", color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.testTag("homeStats"))
                            }
                            Art(if (s.streak > 0) "fire" else "sprout", 40.dp)
                        }
                    }
                }
                if (s.conflicts > 0) item(span = { GridItemSpan(maxLineSpan) }) { MessageCard("${plural(s.conflicts, "notebook")} changed on another device and need${if (s.conflicts == 1) "s" else ""} you to choose a version.", error = true, actionLabel = "Show", onAction = onNotebooks) }
                if (s.sync == SyncState.OFFLINE) item(span = { GridItemSpan(maxLineSpan) }) { MessageCard("You're offline. Everything still works; changes back up when you're connected again.", modifier = Modifier.testTag("offlineNote")) }
                item(span = { GridItemSpan(maxLineSpan) }) {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = onSearch, modifier = Modifier.testTag("homeSearch")) { Text("Search my notes") }
                        OutlinedButton(onClick = onImport) { Text("Magic import") }
                        if (s.due > 0) OutlinedButton(onClick = { s.recent.firstOrNull { it.due > 0 }?.let { onFlashcards(it.deck.id) } ?: onNotebooks() }) { Text("Review ${plural(s.due, "card")} due") }
                    }
                }
                item(span = { GridItemSpan(maxLineSpan) }) { SectionTitle("Jump back in") { TextButton(onClick = onNotebooks) { Text("All notebooks") } } }
                if (!s.loading && s.recent.isEmpty()) item(span = { GridItemSpan(maxLineSpan) }) {
                    EmptyState("book", "Your notebooks live here", "Make a notebook for each subject, write or import notes, and Zing turns them into cards.", actionLabel = "Make a notebook", onAction = onNotebooks)
                }
                items(s.recent, key = { it.deck.id }) { n -> NotebookCard(n, now, onOpen = { onNotebook(n.deck.id) }) }
            }
        }
    }
}

@Suppress("unused") private val headingKeep = Modifier.semantics { heading() }
