package com.josh.zing.ui.screens

import android.content.Context
import android.content.Intent
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.input.TextFieldLineLimits
import androidx.compose.foundation.text.input.TextFieldState
import androidx.compose.foundation.text.input.clearText
import androidx.compose.foundation.text.input.setTextAndPlaceCursorAtEnd
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.Redo
import androidx.compose.material.icons.automirrored.rounded.Undo
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.MoreVert
import androidx.compose.material.icons.rounded.PushPin
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.PrimaryTabRow
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import app.zing.core.model.Card
import app.zing.core.model.Deck
import app.zing.core.model.Limits
import app.zing.core.model.Note
import app.zing.core.sync.BookMeta
import app.zing.core.sync.Conflict
import app.zing.core.sync.DeckSync
import app.zing.core.sync.NoteMeta
import app.zing.core.web.DeckLogic
import app.zing.core.web.SaveCodec
import app.zing.core.web.ShareLink
import com.josh.zing.AppContainer
import com.josh.zing.BuildConfig
import com.josh.zing.data.repo.NotebookSummary
import com.josh.zing.data.repo.Notebooks
import com.josh.zing.ui.components.ConfirmDialog
import com.josh.zing.ui.components.EmptyState
import com.josh.zing.ui.components.FormSheet
import com.josh.zing.ui.components.LocalApp
import com.josh.zing.ui.components.MessageCard
import com.josh.zing.ui.components.Page
import com.josh.zing.ui.components.ZScaffold
import com.josh.zing.ui.components.ago
import com.josh.zing.ui.components.plural
import com.josh.zing.ui.components.zingViewModel
import com.josh.zing.ui.friendly
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonArray

data class NoteRow(val note: Note, val meta: NoteMeta, val onlyHere: Boolean)

data class NotebookState(
    val loading: Boolean = true,
    val deck: Deck? = null,
    val path: List<Deck> = emptyList(),
    val meta: BookMeta = BookMeta(),
    val notes: List<NoteRow> = emptyList(),
    val archivedNotes: List<NoteRow> = emptyList(),
    val subBooks: List<NotebookSummary> = emptyList(),
    val studyCards: Int = 0,
    val levels: List<Int> = emptyList(),
    val conflict: Conflict? = null,
    val sharedId: String? = null,
)

class NotebookViewModel(private val c: AppContainer, val deckId: String) : ViewModel() {
    val state: StateFlow<NotebookState> = combine(c.library.decks, c.library.overlay, c.study.progress, c.library.conflicts, c.library.sharedIds) { decks, overlay, progress, conflicts, shared ->
        val all = decks.map { it.deck }
        val deck = all.firstOrNull { it.id == deckId } ?: return@combine NotebookState(loading = false)
        val over = SaveCodec.notesOverBudget(all)
        val rows = deck.notes.map { NoteRow(it, overlay.note(deckId, it.id), it.cut || (deckId to it.id) in over) }
            .sortedWith(compareByDescending<NoteRow> { it.meta.pinned }.thenBy { it.meta.pos ?: Double.MAX_VALUE }.thenByDescending { it.note.at })
        val cards = DeckLogic.allCards(deck, all)
        NotebookState(
            loading = false, deck = deck, path = DeckLogic.pathOf(deckId, all.associateBy { it.id }), meta = overlay.book(deckId),
            notes = rows.filter { it.meta.archivedAt == null }, archivedNotes = rows.filter { it.meta.archivedAt != null },
            subBooks = Notebooks.summarise(decks, overlay, progress, conflicts.map { it.deckId }.toSet(), c.now(), parent = deckId),
            studyCards = cards.size, levels = DeckLogic.levels(cards).map { it.size },
            conflict = conflicts.firstOrNull { it.deckId == deckId }, sharedId = shared[deckId],
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), NotebookState())

    fun pin(noteId: String, pinned: Boolean) = viewModelScope.launch { c.library.setNoteMeta(deckId, noteId) { it.copy(pinned = pinned) } }
    fun archiveNote(noteId: String, archived: Boolean) = viewModelScope.launch { c.library.setNoteMeta(deckId, noteId) { it.copy(archivedAt = if (archived) c.now() else null) } }
    fun deleteNote(noteId: String, deleted: (undo: suspend () -> Unit) -> Unit) = viewModelScope.launch {
        c.library.deleteNote(deckId, noteId)?.let { n -> deleted { c.library.restoreNote(deckId, n) } }
    }

    fun saveCard(original: String?, q: String, a: String) = viewModelScope.launch {
        c.library.update(deckId) { d ->
            val card = Card(q, a, d.cards.firstOrNull { it.q == original }?.wrong.orEmpty(), d.cards.firstOrNull { it.q == original }?.why.orEmpty())
            if (original == null) d.copy(cards = d.cards + card) else d.copy(cards = d.cards.map { if (it.q == original) card else it })
        }
    }

    fun deleteCard(card: Card, deleted: (undo: suspend () -> Unit) -> Unit) = viewModelScope.launch {
        val before = c.library.deck(deckId)?.cards ?: return@launch
        c.library.removeCards(deckId, setOf(card.q))
        deleted { c.library.setCards(deckId, before) }
    }

    fun addSubBook(name: String, color: String, icon: String?) = viewModelScope.launch { c.library.createDeck(name, color, parent = deckId, icon = icon) }
    fun resolve(choice: DeckSync.Resolution) = viewModelScope.launch { c.library.resolveConflict(deckId, choice) }

    /**
     * Shares the deck's cards (never its notes). Signed in: a server link, as on the website; otherwise the whole
     * deck travels inside the link. Returns the link to hand to Android's share sheet.
     */
    fun share(done: (String?, String?) -> Unit) = viewModelScope.launch {
        val deck = c.library.deck(deckId) ?: return@launch done(null, "That notebook is gone.")
        val cards = DeckLogic.allCards(deck, c.library.snapshot().map { it.deck }).map { Card(it.q, it.a, it.wrong.orEmpty(), it.why) }
        if (cards.isEmpty()) return@launch done(null, "Add some cards first: sharing sends the cards, not your notes.")
        val base = "https://${BuildConfig.WEB_HOST}/"
        val me = c.sync.cachedMe()
        if (me != null) {
            try {
                val id = c.api.deckShare(state.value.sharedId ?: deck.from, deck.name, deck.color, JsonArray(cards.take(400).map { SaveCodec.cardToJson(it) }), listed = false)
                if (id.isNotEmpty()) { c.library.setSharedId(deckId, id); return@launch done("$base#/shared/$id", null) }
            } catch (e: Exception) {
                if (e !is com.josh.zing.data.remote.OfflineException) return@launch done(null, e.friendly())
            }
        }
        done(base + "#/import/" + ShareLink.encode(deck.name, deck.color, cards.take(400)), null)
    }
}

fun shareText(context: Context, title: String, link: String) {
    val send = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_SUBJECT, "$title · Zing").putExtra(Intent.EXTRA_TEXT, "Study “$title” with me on Zing\n$link")
    runCatching { context.startActivity(Intent.createChooser(send, "Share deck").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
}

@Composable
private fun CardDialog(card: Card?, onDismiss: () -> Unit, onSave: (String, String) -> Unit) {
    var q by rememberSaveable { mutableStateOf(card?.q.orEmpty()) }
    var a by rememberSaveable { mutableStateOf(card?.a.orEmpty()) }
    FormSheet(if (card == null) "New card" else "Edit card", onDismiss) {
        OutlinedTextField(q, { q = it.take(Limits.CARD_SIDE) }, label = { Text("Question") }, modifier = Modifier.fillMaxWidth().testTag("cardQ"))
        OutlinedTextField(a, { a = it.take(Limits.CARD_SIDE) }, label = { Text("Answer") }, modifier = Modifier.fillMaxWidth().testTag("cardA"))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
            TextButton(onClick = onDismiss) { Text("Cancel") }
            Button(onClick = { onSave(q.trim(), a.trim()) }, enabled = q.isNotBlank() && a.isNotBlank(), modifier = Modifier.testTag("cardSave")) { Text("Save") }
        }
    }
}

@Composable
fun NotebookScreen(
    deckId: String, onBack: () -> Unit, onOpenNote: (String?) -> Unit, onOpenBook: (String) -> Unit, onSearch: () -> Unit,
    onFlashcards: (level: Int) -> Unit, onQuiz: (level: Int) -> Unit, onImport: () -> Unit,
) {
    val vm = zingViewModel(key = "notebook:$deckId") { NotebookViewModel(it, deckId) }
    val app = LocalApp.current
    val context = LocalContext.current
    val s by vm.state.collectAsStateWithLifecycle()
    var tab by rememberSaveable { mutableIntStateOf(0) }
    var cardDialog by rememberSaveable { mutableStateOf<String?>(null) }   // "" = new card, otherwise the question being edited
    var newSubBook by rememberSaveable { mutableStateOf(false) }
    var deletingNote by rememberSaveable { mutableStateOf<String?>(null) }
    var showArchived by rememberSaveable { mutableStateOf(false) }
    val now = System.currentTimeMillis()
    val deck = s.deck

    Page {
        ZScaffold(
            title = deck?.name ?: "Notebook", onBack = onBack,
            actions = {
                IconButton(onClick = onSearch) { Icon(Icons.Rounded.Search, "Search this notebook") }
                IconButton(onClick = { vm.share { link, problem -> if (link != null) shareText(context, deck?.name.orEmpty(), link) else app.notify(problem ?: "Couldn't share right now.") } }) { Icon(Icons.Rounded.Share, "Share this deck's cards") }
            },
            bottomBar = {
                if (deck != null && s.studyCards > 0) Surface(tonalElevation = 2.dp) {
                    Row(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 16.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = { onFlashcards(0) }, modifier = Modifier.weight(1f).testTag("studyCards")) { Text("Flashcards") }
                        OutlinedButton(onClick = { onQuiz(0) }, enabled = s.studyCards >= 4, modifier = Modifier.weight(1f).testTag("studyQuiz")) { Text("Quiz") }
                    }
                }
            },
        ) { pad ->
            if (!s.loading && deck == null) { EmptyState("search", "This notebook is gone", "It may have been deleted on another device.", Modifier.padding(pad), "Back", onBack); return@ZScaffold }
            if (deck == null) return@ZScaffold
            Column(Modifier.fillMaxSize().padding(pad)) {
                if (s.path.size > 1) Text(s.path.dropLast(1).joinToString(" › ") { it.name }, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 16.dp))
                s.conflict?.let { cf ->
                    Card(Modifier.fillMaxWidth().padding(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
                        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text("Changed on another device", style = MaterialTheme.typography.titleMedium)
                            Text("The ${if (cf.reason == "cards") "cards" else "same note"} changed here and on another device. You're seeing the other device's version; yours is saved safely. Which do you want?")
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                TextButton(onClick = { vm.resolve(DeckSync.Resolution.KEEP_MINE) }, modifier = Modifier.testTag("keepMine")) { Text("Keep mine") }
                                TextButton(onClick = { vm.resolve(DeckSync.Resolution.KEEP_THEIRS) }) { Text("Keep theirs") }
                                TextButton(onClick = { vm.resolve(DeckSync.Resolution.KEEP_BOTH) }) { Text("Keep both") }
                            }
                        }
                    }
                }
                PrimaryTabRow(selectedTabIndex = tab) {
                    listOf("Notes (${s.notes.size})", "Cards (${deck.cards.size})", "Sub-books (${s.subBooks.size})").forEachIndexed { i, label ->
                        Tab(tab == i, { tab = i }, text = { Text(label, maxLines = 1, overflow = TextOverflow.Ellipsis) })
                    }
                }
                when (tab) {
                    0 -> LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxSize()) {
                        item {
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button(onClick = { onOpenNote(null) }, enabled = deck.notes.size < Limits.NOTES_PER_DECK, modifier = Modifier.testTag("newNote")) { Icon(Icons.Rounded.Add, null); Text("New note") }
                                OutlinedButton(onClick = onImport) { Text("Magic import") }
                            }
                        }
                        if (deck.notes.size >= Limits.NOTES_PER_DECK) item { MessageCard("This notebook has ${Limits.NOTES_PER_DECK} notes, the most one can hold. Add a sub-book for more.") }
                        if (s.notes.isEmpty()) item { EmptyState("memo", "No notes yet", "Write a note, or use Magic import to bring in a PDF, slides or pasted text.") }
                        items(s.notes, key = { it.note.id }) { row -> NoteCard(row, now, { onOpenNote(row.note.id) }, vm, { deletingNote = row.note.id }) }
                        if (s.archivedNotes.isNotEmpty()) {
                            item { TextButton(onClick = { showArchived = !showArchived }) { Text(if (showArchived) "Hide archived notes" else "Show ${plural(s.archivedNotes.size, "archived note")}") } }
                            if (showArchived) items(s.archivedNotes, key = { "a" + it.note.id }) { row -> NoteCard(row, now, { onOpenNote(row.note.id) }, vm, { deletingNote = row.note.id }) }
                        }
                    }
                    1 -> LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxSize()) {
                        item { Button(onClick = { cardDialog = "" }, enabled = deck.cards.size < Limits.CARDS_PER_DECK, modifier = Modifier.testTag("newCard")) { Icon(Icons.Rounded.Add, null); Text("New card") } }
                        if (s.levels.size > 1) item {
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text("Path", style = MaterialTheme.typography.titleMedium)
                                s.levels.forEachIndexed { i, n ->
                                    ListItem(headlineContent = { Text("Level ${i + 1}") }, supportingContent = { Text(plural(n, "card")) },
                                        trailingContent = { Row { TextButton(onClick = { onFlashcards(i + 1) }) { Text("Learn") }; TextButton(onClick = { onQuiz(i + 1) }, enabled = n >= 4) { Text("Test") } } })
                                }
                            }
                        }
                        if (deck.cards.isEmpty()) item { EmptyState("cards", "No cards yet", "Add cards by hand, or let Magic import make them from your notes.", actionLabel = "Magic import", onAction = onImport) }
                        itemsIndexed(deck.cards, key = { _, c -> c.q }) { _, card ->
                            var menu by rememberSaveable(card.q) { mutableStateOf(false) }
                            Card(Modifier.fillMaxWidth().clickable(onClickLabel = "Edit card") { cardDialog = card.q }) {
                                Row(Modifier.padding(start = 14.dp, top = 8.dp, bottom = 8.dp)) {
                                    Column(Modifier.weight(1f).padding(vertical = 4.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Text(card.q, style = MaterialTheme.typography.titleSmall)
                                        Text(card.a, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.primary)
                                    }
                                    Box {
                                        IconButton(onClick = { menu = true }) { Icon(Icons.Rounded.MoreVert, "Options for this card") }
                                        DropdownMenu(menu, { menu = false }) {
                                            DropdownMenuItem({ Text("Edit") }, { menu = false; cardDialog = card.q })
                                            DropdownMenuItem({ Text("Delete") }, { menu = false; vm.deleteCard(card) { undo -> app.notify("Card deleted", "Undo", undo) } })
                                        }
                                    }
                                }
                            }
                        }
                    }
                    else -> LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxSize()) {
                        item { Button(onClick = { newSubBook = true }, enabled = s.path.size < Limits.MAX_DEPTH) { Icon(Icons.Rounded.Add, null); Text("New sub-book") } }
                        if (s.subBooks.isEmpty()) item { EmptyState("books", "No sub-books", "Split a big notebook into topics. Studying this notebook includes its sub-books' cards.") }
                        items(s.subBooks, key = { it.deck.id }) { n -> NotebookCard(n, now, onOpen = { onOpenBook(n.deck.id) }) }
                    }
                }
            }
        }
    }
    cardDialog?.let { key ->
        CardDialog(deck?.cards?.firstOrNull { it.q == key }, { cardDialog = null }) { q, a -> vm.saveCard(key.ifEmpty { null }, q, a); cardDialog = null }
    }
    if (newSubBook) NotebookSheet("New sub-book", initialColor = deck?.color ?: Limits.COLORS[4], confirm = "Create", onDismiss = { newSubBook = false }) { name, color, icon -> newSubBook = false; vm.addSubBook(name, color, icon) }
    deletingNote?.let { id ->
        ConfirmDialog("Delete this note?", "You can undo straight afterwards.", "Delete", destructive = true, onDismiss = { deletingNote = null },
            onConfirm = { deletingNote = null; vm.deleteNote(id) { undo -> app.notify("Note deleted", "Undo", undo) } })
    }
}

@Composable
private fun NoteCard(row: NoteRow, now: Long, onOpen: () -> Unit, vm: NotebookViewModel, onDelete: () -> Unit) {
    var menu by rememberSaveable(row.note.id) { mutableStateOf(false) }
    val archived = row.meta.archivedAt != null
    Card(Modifier.fillMaxWidth().clickable(onClickLabel = "Open note", onClick = onOpen).testTag("note:${row.note.title}")) {
        Row(Modifier.padding(start = 14.dp, top = 8.dp, bottom = 8.dp)) {
            Column(Modifier.weight(1f).padding(vertical = 4.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Row {
                    if (row.meta.pinned) Icon(Icons.Rounded.PushPin, "Pinned", Modifier.padding(end = 4.dp), tint = MaterialTheme.colorScheme.primary)
                    Text(row.note.title, style = MaterialTheme.typography.titleMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
                if (row.note.text.isNotBlank()) Text(row.note.text.take(200).replace('\n', ' '), style = MaterialTheme.typography.bodyMedium, maxLines = 2, overflow = TextOverflow.Ellipsis, color = MaterialTheme.colorScheme.onSurfaceVariant)
                val tags = listOf(row.meta.subject, row.meta.topic).filter { it.isNotBlank() }.joinToString(" · ")
                Text(listOf(tags, ago(row.note.at, now), if (row.onlyHere) "only on this device" else "").filter { it.isNotBlank() }.joinToString(" · "), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Box {
                IconButton(onClick = { menu = true }) { Icon(Icons.Rounded.MoreVert, "Options for ${row.note.title}") }
                DropdownMenu(menu, { menu = false }) {
                    DropdownMenuItem({ Text(if (row.meta.pinned) "Unpin" else "Pin") }, { menu = false; vm.pin(row.note.id, !row.meta.pinned) })
                    DropdownMenuItem({ Text(if (archived) "Restore" else "Archive") }, { menu = false; vm.archiveNote(row.note.id, !archived) })
                    DropdownMenuItem({ Text("Delete") }, { menu = false; onDelete() })
                }
            }
        }
    }
}

// ============================================================================================ the note editor

enum class SaveStatus { LOADING, IDLE, UNSAVED, SAVING, SAVED, FULL }

class NoteEditorViewModel(private val c: AppContainer, private val deckId: String, noteIdArg: String?) : ViewModel() {
    var noteId: String? = noteIdArg
        private set
    val body = TextFieldState()
    val title = MutableStateFlow("")
    val status = MutableStateFlow(SaveStatus.LOADING)
    val meta = MutableStateFlow(NoteMeta())
    val restored = MutableStateFlow(false)
    val onlyHere = MutableStateFlow(false)
    private var savedTitle = ""
    private var savedBody = ""

    init {
        viewModelScope.launch {
            val note = noteId?.let { id -> c.library.deck(deckId)?.notes?.firstOrNull { it.id == id } }
            val draft = c.library.draft(deckId, noteId)
            savedTitle = note?.title.orEmpty(); savedBody = note?.text.orEmpty()
            // typing that never reached the note (the app was closed, or the phone died) comes back
            val useDraft = draft != null && draft.at > (note?.at ?: 0) && (draft.title != savedTitle || draft.body != savedBody)
            title.value = if (useDraft) draft!!.title else savedTitle
            body.setTextAndPlaceCursorAtEnd(if (useDraft) draft!!.body else savedBody)
            restored.value = useDraft
            noteId?.let { id -> meta.value = c.library.currentOverlay().note(deckId, id) }
            onlyHere.value = note?.cut == true
            status.value = if (useDraft) SaveStatus.UNSAVED else SaveStatus.IDLE
            watch()
        }
    }

    @OptIn(FlowPreview::class)
    private fun watch() {
        val edits = combine(title, snapshotFlow { body.text.toString() }) { t, b -> t to b }.drop(1)
        viewModelScope.launch { edits.collect { (t, b) -> if (t != savedTitle || b != savedBody) status.value = SaveStatus.UNSAVED } }
        // a draft a moment after typing stops (cheap, on the device); the note itself a little later
        viewModelScope.launch { edits.debounce(600).collect { (t, b) -> if (t != savedTitle || b != savedBody) c.library.saveDraft(deckId, noteId, t, b) } }
        viewModelScope.launch { edits.debounce(2500).collect { commit() } }
    }

    private fun titleFor(t: String, b: String): String = t.trim().ifEmpty { b.lineSequence().firstOrNull { it.isNotBlank() }?.trim()?.take(60) ?: "Notes" }

    /** Writes the note into its notebook. Safe to call at any time; does nothing when there is nothing new. */
    suspend fun commit(): Boolean {
        val t = title.value; val b = body.text.toString()
        if (status.value == SaveStatus.LOADING) return false
        if (t == savedTitle && b == savedBody) return true
        if (noteId == null && t.isBlank() && b.isBlank()) return true
        status.value = SaveStatus.SAVING
        val id = c.library.saveNote(deckId, noteId, titleFor(t, b), b)
        if (id == null) { status.value = SaveStatus.FULL; return false }
        noteId = id; savedTitle = t; savedBody = b
        status.value = SaveStatus.SAVED
        return true
    }

    fun saveAndClose(done: () -> Unit) = viewModelScope.launch { if (commit()) done() }

    fun setMeta(change: (NoteMeta) -> NoteMeta) {
        meta.value = change(meta.value)
        viewModelScope.launch { if (commit()) noteId?.let { id -> c.library.setNoteMeta(deckId, id) { m -> change(m) } } }
    }

    fun delete(deleted: (undo: (suspend () -> Unit)?) -> Unit) = viewModelScope.launch {
        val id = noteId
        c.library.discardDraft(deckId, id)
        savedTitle = title.value; savedBody = body.text.toString()   // nothing left to save on the way out
        if (id == null) { body.clearText(); title.value = ""; return@launch deleted(null) }
        val note = c.library.deleteNote(deckId, id)
        deleted(note?.let { n -> { c.library.restoreNote(deckId, n) } })
    }

    /** Leaving the screen (or the app going to the background) saves what was typed. */
    fun flush() { c.appScope.launch { commit() } }

    override fun onCleared() { flush() }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun NoteEditorScreen(deckId: String, noteId: String?, onBack: () -> Unit, onMakeCards: (String) -> Unit) {
    val vm = zingViewModel(key = "note:$deckId:${noteId ?: "new"}") { NoteEditorViewModel(it, deckId, noteId) }
    val app = LocalApp.current
    val title by vm.title.collectAsStateWithLifecycle()
    val status by vm.status.collectAsStateWithLifecycle()
    val meta by vm.meta.collectAsStateWithLifecycle()
    val restored by vm.restored.collectAsStateWithLifecycle()
    val onlyHere by vm.onlyHere.collectAsStateWithLifecycle()
    var confirmDelete by rememberSaveable { mutableStateOf(false) }
    var details by rememberSaveable { mutableStateOf(false) }
    var menu by rememberSaveable { mutableStateOf(false) }
    LifecycleEventEffect(androidx.lifecycle.Lifecycle.Event.ON_STOP) { vm.flush() }

    Page {
        ZScaffold(
            title = when (status) {
                SaveStatus.LOADING -> "Note"; SaveStatus.UNSAVED -> "Not saved yet"; SaveStatus.SAVING -> "Saving…"
                SaveStatus.SAVED -> "Saved"; SaveStatus.FULL -> "Notebook is full"; SaveStatus.IDLE -> if (noteId == null) "New note" else "Note"
            },
            onBack = { vm.saveAndClose(onBack) },
            actions = {
                IconButton(onClick = { vm.body.undoState.undo() }, enabled = vm.body.undoState.canUndo) { Icon(Icons.AutoMirrored.Rounded.Undo, "Undo") }
                IconButton(onClick = { vm.body.undoState.redo() }, enabled = vm.body.undoState.canRedo) { Icon(Icons.AutoMirrored.Rounded.Redo, "Redo") }
                TextButton(onClick = { vm.saveAndClose(onBack) }, modifier = Modifier.testTag("saveNote")) { Text("Save") }
                Box {
                    IconButton(onClick = { menu = true }) { Icon(Icons.Rounded.MoreVert, "More") }
                    DropdownMenu(menu, { menu = false }) {
                        DropdownMenuItem({ Text(if (meta.pinned) "Unpin" else "Pin") }, { menu = false; vm.setMeta { it.copy(pinned = !it.pinned) } })
                        DropdownMenuItem({ Text("Subject and topic") }, { menu = false; details = true })
                        DropdownMenuItem({ Text("Make cards from this note") }, { menu = false; vm.saveAndClose { onMakeCards(vm.body.text.toString()) } })
                        DropdownMenuItem({ Text(if (meta.archivedAt != null) "Restore" else "Archive") }, { menu = false; vm.setMeta { it.copy(archivedAt = if (it.archivedAt != null) null else System.currentTimeMillis()) } })
                        DropdownMenuItem({ Text("Delete") }, { menu = false; confirmDelete = true })
                    }
                }
            },
        ) { pad ->
            Column(Modifier.fillMaxSize().padding(pad).imePadding().padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (restored) MessageCard("Unsaved changes from last time were brought back.")
                if (status == SaveStatus.FULL) MessageCard("This notebook already has ${Limits.NOTES_PER_DECK} notes. Your text is kept as a draft: delete a note or use a sub-book, then save again.", error = true)
                if (onlyHere) MessageCard("This note's text wasn't included in the last cloud backup (older notes are left out when there are a lot). It is safe on this device.")
                OutlinedTextField(title, { vm.title.value = it.take(Limits.NOTE_TITLE) }, label = { Text("Title") }, singleLine = true, modifier = Modifier.fillMaxWidth().testTag("noteTitle"))
                val style = MaterialTheme.typography.bodyLarge.copy(color = MaterialTheme.colorScheme.onSurface)
                BasicTextField(
                    state = vm.body, textStyle = style, cursorBrush = SolidColor(MaterialTheme.colorScheme.primary), lineLimits = TextFieldLineLimits.MultiLine(),
                    inputTransformation = { if (length > Limits.NOTE_TEXT) revertAllChanges() },
                    modifier = Modifier.fillMaxWidth().weight(1f).testTag("noteBody").semantics { contentDescription = "Note text" },
                    decorator = { inner -> Box(Modifier.fillMaxSize().padding(vertical = 8.dp)) { if (vm.body.text.isEmpty()) Text("Write your notes here…", style = style, color = MaterialTheme.colorScheme.onSurfaceVariant); inner() } },
                )
                Text("${vm.body.text.length} / ${Limits.NOTE_TEXT}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(bottom = 6.dp))
            }
        }
    }
    if (details) {
        var subject by rememberSaveable { mutableStateOf(meta.subject) }
        var topic by rememberSaveable { mutableStateOf(meta.topic) }
        FormSheet("Subject and topic", { details = false }) {
            Text("These help topic search find this note.", style = MaterialTheme.typography.bodySmall)
            OutlinedTextField(subject, { subject = it.take(40) }, label = { Text("Subject") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(topic, { topic = it.take(60) }, label = { Text("Topic") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                TextButton(onClick = { details = false }) { Text("Cancel") }
                Button(onClick = { details = false; vm.setMeta { it.copy(subject = subject.trim(), topic = topic.trim()) } }) { Text("Save") }
            }
        }
    }
    if (confirmDelete) ConfirmDialog("Delete this note?", "You can undo straight afterwards.", "Delete", destructive = true, onDismiss = { confirmDelete = false },
        onConfirm = { confirmDelete = false; vm.delete { undo -> if (undo != null) app.notify("Note deleted", "Undo", undo) else app.notify("Draft discarded"); onBack() } })
}

@Suppress("unused") private suspend fun <T> StateFlow<T>.now(): T = first()
