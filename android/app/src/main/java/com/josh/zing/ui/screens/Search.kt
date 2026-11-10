package com.josh.zing.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Clear
import androidx.compose.material.icons.rounded.PushPin
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import app.zing.core.account.AiBlock
import app.zing.core.account.AiErrors
import app.zing.core.ai.AssistantAnswer
import app.zing.core.ai.Grounding
import app.zing.core.search.Filters
import app.zing.core.search.Hit
import app.zing.core.search.SortBy
import com.josh.zing.AppContainer
import com.josh.zing.data.repo.AiAvailability
import com.josh.zing.data.repo.AiUnavailable
import com.josh.zing.data.repo.SearchOutcome
import com.josh.zing.ui.components.EmptyState
import com.josh.zing.ui.components.HighlightedText
import com.josh.zing.ui.components.LocalApp
import com.josh.zing.ui.components.MessageCard
import com.josh.zing.ui.components.Page
import com.josh.zing.ui.components.Skeleton
import com.josh.zing.ui.components.ZScaffold
import com.josh.zing.ui.components.ago
import com.josh.zing.ui.components.plural
import com.josh.zing.ui.components.zingViewModel
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

sealed interface AnswerUi {
    data object None : AnswerUi
    data object Loading : AnswerUi
    data class Shown(val answer: AssistantAnswer, val note: String? = null) : AnswerUi
}

data class SearchUi(
    val query: String = "",
    val filters: Filters = Filters(),
    val outcome: SearchOutcome = SearchOutcome.EMPTY,
    val searching: Boolean = false,
    val searched: Boolean = false,
    val selected: Set<String> = emptySet(),
    val answer: AnswerUi = AnswerUi.None,
    val ai: AiAvailability? = null,
    val notebooks: List<Pair<String, String>> = emptyList(),
    val scopeName: String? = null,
)

class SearchViewModel(private val c: AppContainer, private val scopeId: String?, initialQuery: String) : ViewModel() {
    private val _ui = MutableStateFlow(SearchUi(query = initialQuery, filters = Filters(notebookId = scopeId)))
    val ui: StateFlow<SearchUi> = _ui
    val history: StateFlow<List<String>> = c.search.history.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    private var job: Job? = null

    init {
        viewModelScope.launch {
            val decks = c.library.snapshot().map { it.deck }
            _ui.update { it.copy(notebooks = decks.filter { d -> d.parent == null }.sortedBy { d -> d.name.lowercase() }.map { d -> d.id to d.name }, scopeName = decks.firstOrNull { d -> d.id == scopeId }?.name) }
            if (initialQuery.isNotBlank()) run(now = true)
        }
        // when a sync brings in notes from another device, the results on screen update by themselves
        @OptIn(FlowPreview::class)
        viewModelScope.launch { c.library.decks.map { it.size to it.sumOf { d -> d.deck.updated } }.drop(1).debounce(400).collect { if (_ui.value.query.isNotBlank()) run(now = true, keepAnswer = true) } }
        viewModelScope.launch { _ui.update { it.copy(ai = c.ai.status()) } }
    }

    fun setQuery(q: String) { _ui.update { it.copy(query = q.take(200)) }; run(now = false) }
    fun setFilters(change: (Filters) -> Filters) { _ui.update { it.copy(filters = change(it.filters)) }; run(now = true) }

    private fun run(now: Boolean, keepAnswer: Boolean = false) {
        job?.cancel()
        val q = _ui.value.query
        if (q.isBlank()) { _ui.update { it.copy(outcome = SearchOutcome.EMPTY, searching = false, searched = false, selected = emptySet(), answer = AnswerUi.None) }; return }
        job = viewModelScope.launch {
            if (!now) delay(250)
            _ui.update { it.copy(searching = true) }
            val outcome = c.search.search(q, _ui.value.filters)
            val keys = outcome.hits.map { it.doc.key }.toSet()
            _ui.update {
                it.copy(
                    outcome = outcome, searching = false, searched = true, selected = it.selected intersect keys,
                    // straight away, with no AI: the best passages from the notes themselves
                    answer = if (keepAnswer && it.answer is AnswerUi.Shown) it.answer else if (Grounding.needsSupport(q)) AnswerUi.Shown(AssistantAnswer.NeedsSupport) else AnswerUi.Shown(Grounding.extractive(outcome.hits)),
                )
            }
        }
    }

    /** The search key was pressed: remember the search and, if the last backup check is old, ask for a fresh one. */
    fun submit() = viewModelScope.launch {
        c.search.remember(_ui.value.query)
        val last = c.sync.lastSync.first() ?: 0
        if (c.now() - last > 2 * 60_000) c.scheduler.request(0)
        run(now = true)
    }

    fun toggle(key: String) = _ui.update { it.copy(selected = if (key in it.selected) it.selected - key else it.selected + key) }
    fun clearSelection() = _ui.update { it.copy(selected = emptySet()) }
    fun clearHistory() = viewModelScope.launch { c.search.clearHistory() }

    private fun chosen(): List<Hit> = _ui.value.let { s -> if (s.selected.isEmpty()) s.outcome.hits.take(5) else s.outcome.hits.filter { it.doc.key in s.selected } }

    /** Asks Zing AI, using only the selected notes (or the top five). If AI can't be used, the notes answer instead. */
    fun askAi() {
        val hits = chosen()
        if (hits.isEmpty()) return
        _ui.update { it.copy(answer = AnswerUi.Loading) }
        viewModelScope.launch {
            val fallback = Grounding.extractive(hits)
            val result = try {
                AnswerUi.Shown(c.ai.answer(_ui.value.query, hits.map { h -> h to (h.passages.joinToString("\n") { it.text }.takeIf { it.length > 400 } ?: h.doc.text) }))
            } catch (e: AiUnavailable) {
                _ui.update { it.copy(ai = AiAvailability(e.block)) }
                AnswerUi.Shown(fallback, AiErrors.message(e.block) + " Here is what your notes say.")
            }
            _ui.update { it.copy(answer = result) }
        }
    }

    fun pin(hit: Hit) = viewModelScope.launch { c.library.setNoteMeta(hit.doc.deckId, hit.doc.noteId) { it.copy(pinned = !hit.doc.pinned) }; run(now = true, keepAnswer = true) }

    /** The selected notes as one text, for "Make cards". */
    fun selectedText(): String = chosen().joinToString("\n\n") { it.doc.title + "\n" + it.doc.text }.take(24_000)

    fun report(reason: String, done: (Boolean) -> Unit) = viewModelScope.launch {
        // only the reason and a fingerprint of the question are sent: never the notes or the answer text
        val target = _ui.value.query.hashCode().toUInt().toString(16)
        done(runCatching { c.api.report("ai_answer", target, reason) }.isSuccess)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SearchScreen(notebookId: String?, initialQuery: String, onBack: (() -> Unit)?, onOpenNote: (deckId: String, noteId: String) -> Unit, onMakeCards: (String) -> Unit) {
    val vm = zingViewModel(key = "search:${notebookId ?: "all"}") { SearchViewModel(it, notebookId, initialQuery) }
    val app = LocalApp.current
    val s by vm.ui.collectAsStateWithLifecycle()
    val history by vm.history.collectAsStateWithLifecycle()
    var reporting by rememberSaveable { mutableStateOf(false) }
    val now = System.currentTimeMillis()

    Page {
        ZScaffold(
            title = if (s.scopeName != null) "Search in ${s.scopeName}" else "Search your notes", onBack = onBack,
            bottomBar = {
                if (s.selected.isNotEmpty()) Surface(tonalElevation = 3.dp) {
                    Row(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("${s.selected.size} selected", Modifier.weight(1f), style = MaterialTheme.typography.labelLarge)
                        TextButton(onClick = vm::clearSelection) { Text("Clear") }
                        OutlinedButton(onClick = { onMakeCards(vm.selectedText()) }, modifier = Modifier.testTag("makeCards")) { Text("Make cards") }
                        Button(onClick = vm::askAi, modifier = Modifier.testTag("askSelected")) { Text("Summarise") }
                    }
                }
            },
        ) { pad ->
            LazyColumn(contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxSize().padding(pad).imePadding()) {
                item {
                    OutlinedTextField(
                        s.query, vm::setQuery, placeholder = { Text("Type a topic, like “photosynthesis”") }, singleLine = true,
                        leadingIcon = { Icon(Icons.Rounded.Search, null) },
                        trailingIcon = { if (s.query.isNotEmpty()) IconButton(onClick = { vm.setQuery("") }) { Icon(Icons.Rounded.Clear, "Clear search") } },
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search), keyboardActions = KeyboardActions(onSearch = { vm.submit() }),
                        modifier = Modifier.fillMaxWidth().testTag("searchField"),
                    )
                }
                item { FilterRow(s, vm, showNotebook = notebookId == null) }
                when {
                    s.query.isBlank() -> {
                        if (history.isNotEmpty()) item {
                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("Recent", style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
                                    TextButton(onClick = { vm.clearHistory() }) { Text("Clear") }
                                }
                                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) { history.forEach { h -> AssistChip(onClick = { vm.setQuery(h); vm.submit() }, label = { Text(h, maxLines = 1, overflow = TextOverflow.Ellipsis) }) } }
                            }
                        }
                        item { EmptyState("mag", "Find anything you've written", "Search looks through every note in every notebook, online or offline, and shows the exact passages.") }
                    }
                    s.searching && !s.searched -> item { Skeleton(4) }
                    s.searched && s.outcome.hits.isEmpty() -> item {
                        EmptyState("search", "Nothing in your notes about “${s.query.take(40)}”", "Zing only answers from your own notes, so it won't make something up. Try another word, check the filters, or add a note about it.", Modifier.testTag("noResults"))
                    }
                    else -> {
                        item { AnswerCard(s, onAsk = vm::askAi, onOpen = onOpenNote, onReport = { reporting = true }) }
                        item { Text(plural(s.outcome.hits.size, "note") + " in " + plural(s.outcome.groups.size, "notebook"), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite }) }
                        s.outcome.groups.forEach { group ->
                            item(key = "g:" + group.notebookId) { Text(group.notebookName, style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 6.dp).semantics { heading() }.testTag("group:${group.notebookName}")) }
                            items(group.hits, key = { it.doc.key }) { hit -> HitCard(hit, hit.doc.key in s.selected, now, { vm.toggle(hit.doc.key) }, { onOpenNote(hit.doc.deckId, hit.doc.noteId) }, { vm.pin(hit) }) }
                        }
                    }
                }
            }
        }
    }
    if (reporting) ReportDialog({ reporting = false }) { reason -> reporting = false; vm.report(reason) { ok -> app.notify(if (ok) "Thanks. Your report was sent." else "Couldn't send the report right now. You can also use the contact on the Privacy page.") } }
}

@Composable
private fun FilterRow(s: SearchUi, vm: SearchViewModel, showNotebook: Boolean) {
    var bookMenu by rememberSaveable { mutableStateOf(false) }
    var sortMenu by rememberSaveable { mutableStateOf(false) }
    var dateMenu by rememberSaveable { mutableStateOf(false) }
    val f = s.filters
    val day = 86_400_000L
    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        if (showNotebook) Box {
            FilterChip(f.notebookId != null, { bookMenu = true }, label = { Text(s.notebooks.firstOrNull { it.first == f.notebookId }?.second ?: "All notebooks", maxLines = 1) }, modifier = Modifier.testTag("filterNotebook"))
            DropdownMenu(bookMenu, { bookMenu = false }) {
                DropdownMenuItem({ Text("All notebooks") }, { bookMenu = false; vm.setFilters { it.copy(notebookId = null) } })
                s.notebooks.forEach { (id, name) -> DropdownMenuItem({ Text(name) }, { bookMenu = false; vm.setFilters { it.copy(notebookId = id) } }) }
            }
        }
        FilterChip(f.pinnedOnly, { vm.setFilters { it.copy(pinnedOnly = !it.pinnedOnly) } }, label = { Text("Pinned") }, modifier = Modifier.testTag("filterPinned"))
        Box {
            val since = f.since
            FilterChip(since != null, { dateMenu = true }, label = { Text(if (since == null) "Any time" else if (System.currentTimeMillis() - since < 8 * day) "Past week" else "Past month") })
            DropdownMenu(dateMenu, { dateMenu = false }) {
                DropdownMenuItem({ Text("Any time") }, { dateMenu = false; vm.setFilters { it.copy(since = null) } })
                DropdownMenuItem({ Text("Past week") }, { dateMenu = false; vm.setFilters { it.copy(since = System.currentTimeMillis() - 7 * day) } })
                DropdownMenuItem({ Text("Past month") }, { dateMenu = false; vm.setFilters { it.copy(since = System.currentTimeMillis() - 30 * day) } })
            }
        }
        FilterChip(f.kinds.isNotEmpty(), { vm.setFilters { it.copy(kinds = if (it.kinds.isEmpty()) setOf("pdf", "doc", "slides", "web", "yt", "audio", "photo", "paste", "text") else emptySet()) } }, label = { Text("Imported only") })
        FilterChip(f.includeArchived, { vm.setFilters { it.copy(includeArchived = !it.includeArchived) } }, label = { Text("Archived too") })
        Box {
            FilterChip(f.sort != SortBy.BEST_MATCH, { sortMenu = true }, label = { Text(when (f.sort) { SortBy.BEST_MATCH -> "Best match"; SortBy.NEWEST -> "Newest"; SortBy.TITLE -> "Title A–Z" }) }, modifier = Modifier.testTag("sort"))
            DropdownMenu(sortMenu, { sortMenu = false }) {
                DropdownMenuItem({ Text("Best match") }, { sortMenu = false; vm.setFilters { it.copy(sort = SortBy.BEST_MATCH) } })
                DropdownMenuItem({ Text("Newest") }, { sortMenu = false; vm.setFilters { it.copy(sort = SortBy.NEWEST) } })
                DropdownMenuItem({ Text("Title A–Z") }, { sortMenu = false; vm.setFilters { it.copy(sort = SortBy.TITLE) } })
            }
        }
    }
}

@Composable
private fun AnswerCard(s: SearchUi, onAsk: () -> Unit, onOpen: (String, String) -> Unit, onReport: () -> Unit) {
    Card(Modifier.fillMaxWidth().testTag("answer"), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            when (val a = s.answer) {
                AnswerUi.None -> Unit
                AnswerUi.Loading -> Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    CircularProgressIndicator(Modifier.padding(2.dp))
                    Text("Reading your selected notes…", modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite })
                }
                is AnswerUi.Shown -> when (val ans = a.answer) {
                    AssistantAnswer.NeedsSupport -> {
                        Text("You matter more than any exam", style = MaterialTheme.typography.titleMedium, modifier = Modifier.semantics { heading() })
                        Text("If you're thinking about hurting yourself, please talk to an adult you trust right now: a parent, a teacher or your school's guidance counsellor. If you are in danger, call your local emergency number.")
                    }
                    AssistantAnswer.NotInNotes -> {
                        Text("Not in your notes", style = MaterialTheme.typography.titleMedium, modifier = Modifier.semantics { heading() })
                        Text("Your selected notes don't say anything about this, so Zing won't guess. The matching notes are listed below.", modifier = Modifier.testTag("notInNotes"))
                    }
                    is AssistantAnswer.Grounded -> {
                        Text(if (ans.fromAi) "Zing AI, from your notes" else "From your notes", style = MaterialTheme.typography.titleMedium, modifier = Modifier.semantics { heading() })
                        a.note?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
                        Text(ans.text, modifier = Modifier.testTag("answerText"))
                        Text("Sources", style = MaterialTheme.typography.labelLarge)
                        ans.sources.distinctBy { it.source.noteKey }.forEach { cited ->
                            val (deckId, noteId) = cited.source.noteKey.split('/').let { it[0] to it.getOrElse(1) { "" } }
                            TextButton(onClick = { onOpen(deckId, noteId) }, contentPadding = PaddingValues(horizontal = 4.dp)) {
                                Text("${cited.source.title} · ${cited.source.notebook}", maxLines = 1, overflow = TextOverflow.Ellipsis)
                            }
                        }
                        if (ans.fromAi) Text("AI can make mistakes. Check the sources before you rely on it.", style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
            val ai = s.ai
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                if (s.answer != AnswerUi.Loading && (s.answer as? AnswerUi.Shown)?.answer !is AssistantAnswer.NeedsSupport) {
                    if (ai?.available == true) OutlinedButton(onClick = onAsk, modifier = Modifier.testTag("askAi")) { Text("Summarise with Zing AI (${ai.left} left today)") }
                    else if (ai != null && ai.block != AiBlock.NONE) Text(AiErrors.message(ai.block), style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f).testTag("aiBlocked"))
                }
                if (((s.answer as? AnswerUi.Shown)?.answer as? AssistantAnswer.Grounded)?.fromAi == true) TextButton(onClick = onReport, modifier = Modifier.testTag("report")) { Text("Report") }
            }
        }
    }
}

@Composable
private fun HitCard(hit: Hit, selected: Boolean, now: Long, onToggle: () -> Unit, onOpen: () -> Unit, onPin: () -> Unit) {
    Card(Modifier.fillMaxWidth().clickable(onClickLabel = "Open note", onClick = onOpen).testTag("hit:${hit.doc.title}")) {
        Row(Modifier.padding(end = 4.dp, top = 6.dp, bottom = 8.dp)) {
            Checkbox(selected, { onToggle() }, modifier = Modifier.semantics { contentDescription = "Select ${hit.doc.title}" })
            Column(Modifier.weight(1f).padding(top = 10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                HighlightedText(hit.doc.title, hit.titleHighlights, style = MaterialTheme.typography.titleMedium, maxLines = 2)
                hit.passages.forEach { p -> HighlightedText(p.text, p.highlights, style = MaterialTheme.typography.bodyMedium, maxLines = 4) }
                val where = if (hit.doc.deckName != hit.doc.notebookName) "${hit.doc.notebookName} › ${hit.doc.deckName}" else hit.doc.notebookName
                Text(listOf(where, ago(hit.doc.at, now), if (hit.doc.archived) "archived" else "").filter { it.isNotBlank() }.joinToString(" · "), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            IconButton(onClick = onPin) { Icon(Icons.Rounded.PushPin, if (hit.doc.pinned) "Unpin ${hit.doc.title}" else "Pin ${hit.doc.title}", tint = if (hit.doc.pinned) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline) }
        }
    }
}

@Composable
fun ReportDialog(onDismiss: () -> Unit, reasons: List<Pair<String, String>> = listOf("wrong" to "It's wrong or made up", "inappropriate" to "It's inappropriate", "unsafe" to "It could be harmful", "other" to "Something else"), onReport: (String) -> Unit) {
    AlertDialog(onDismissRequest = onDismiss, title = { Text("What's the problem?") },
        text = { Column { reasons.forEach { (code, label) -> TextButton(onClick = { onReport(code) }, modifier = Modifier.fillMaxWidth()) { Text(label, Modifier.fillMaxWidth()) } } } },
        confirmButton = {}, dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } })
}
