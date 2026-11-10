package com.josh.zing.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
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
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import app.zing.core.account.AiErrors
import app.zing.core.model.Card
import app.zing.core.model.Limits
import com.josh.zing.AppContainer
import com.josh.zing.data.local.ImportEntity
import com.josh.zing.data.repo.AiAvailability
import com.josh.zing.data.repo.ImportDraft
import com.josh.zing.data.repo.ImportFailed
import com.josh.zing.data.repo.ImportSource
import com.josh.zing.ui.components.Art
import com.josh.zing.ui.components.LocalApp
import com.josh.zing.ui.components.MessageCard
import com.josh.zing.ui.components.Page
import com.josh.zing.ui.components.ZScaffold
import com.josh.zing.ui.components.plural
import com.josh.zing.ui.components.zingViewModel
import com.josh.zing.ui.friendly
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class ImportStep { SOURCE, WORKING, REVIEW, DONE }

data class ReviewCard(val card: Card, val keep: Boolean = true)

data class ImportState(
    val step: ImportStep = ImportStep.SOURCE,
    val mode: String = "paste",            // paste, link
    val text: String = "",
    val url: String = "",
    val count: Int = 12,
    val ai: AiAvailability? = null,
    val useAi: Boolean = true,
    val working: String = "",
    val error: String? = null,
    val draft: ImportDraft? = null,
    val cards: List<ReviewCard> = emptyList(),
    val editing: Int? = null,
    val savedCount: Int = 0,
    val savedDeck: String? = null,
    val targetName: String? = null,
)

class ImportViewModel(private val c: AppContainer, private val targetDeck: String?, initialText: String) : ViewModel() {
    private val _s = MutableStateFlow(ImportState(text = initialText))
    val state: StateFlow<ImportState> = _s
    private var job: Job? = null
    private var last: (suspend () -> ImportSource)? = null
    private var undo: (suspend () -> Unit)? = null

    init {
        viewModelScope.launch {
            _s.update { it.copy(targetName = targetDeck?.let { id -> c.library.deck(id)?.name }) }
            _s.update { it.copy(ai = c.ai.status()) }
        }
    }

    fun edit(change: (ImportState) -> ImportState) = _s.update { change(it).copy(error = null) }

    private fun start(label: String, source: suspend () -> ImportSource) {
        last = source
        job?.cancel()
        _s.update { it.copy(step = ImportStep.WORKING, working = label, error = null) }
        job = viewModelScope.launch {
            try {
                val draft = c.importer.make(source(), _s.value.count, useAi = _s.value.useAi && _s.value.ai?.available == true)
                _s.update { it.copy(step = ImportStep.REVIEW, draft = draft, cards = draft.cards.map { card -> ReviewCard(card) }) }
            } catch (e: CancellationException) {
                throw e
            } catch (e: ImportFailed) {
                _s.update { it.copy(step = ImportStep.SOURCE, error = e.message) }
            } catch (e: Exception) {
                _s.update { it.copy(step = ImportStep.SOURCE, error = e.friendly()) }
            }
        }
    }

    fun file(uri: Uri) = start("Reading your file") { c.importer.read(uri) }
    fun paste() = _s.value.text.let { t -> start("Reading your notes") { ImportSource.Text("Pasted notes", t, "paste") } }
    fun link() = _s.value.url.trim().let { u -> start("Reading the page") { ImportSource.Link(u) } }
    fun retry() { last?.let { start(_s.value.working.ifEmpty { "Trying again" }, it) } }

    /** Stops the import. Nothing has been saved at this point, so there is nothing to clean up. */
    fun cancel() { job?.cancel(); _s.update { it.copy(step = ImportStep.SOURCE, error = null) } }

    fun toggle(i: Int) = _s.update { s -> s.copy(cards = s.cards.mapIndexed { j, r -> if (i == j) r.copy(keep = !r.keep) else r }) }
    fun saveEdit(i: Int, q: String, a: String) = _s.update { s ->
        s.copy(editing = null, cards = s.cards.mapIndexed { j, r -> if (i == j && q.isNotBlank() && a.isNotBlank()) r.copy(card = r.card.copy(q = q.trim().take(Limits.CARD_SIDE), a = a.trim().take(Limits.CARD_SIDE))) else r })
    }

    /** Saves the cards the student kept (and the imported text as a note). Returns through [done] how to undo it. */
    fun save(done: (count: Int, undo: suspend () -> Unit) -> Unit) = viewModelScope.launch {
        val s = _s.value
        val draft = s.draft ?: return@launch
        val keep = s.cards.filter { it.keep }.map { it.card }
        if (keep.isEmpty()) { _s.update { it.copy(error = "Keep at least one card, or go back.") }; return@launch }
        val created = targetDeck == null
        val deckId = targetDeck ?: c.library.createDeck(draft.title.ifBlank { "Imported" }, Limits.COLORS[(draft.title.length) % Limits.COLORS.size]).id
        val before = c.library.deck(deckId)?.cards.orEmpty()
        val added = c.library.addCards(deckId, keep)
        val noteId = draft.noteText?.takeIf { it.isNotBlank() }?.let { c.library.saveNote(deckId, null, draft.title.ifBlank { "Imported notes" }, it, draft.noteKind, draft.src) }
        c.db.library().insertImport(ImportEntity(source = draft.noteKind, title = draft.title, deckId = deckId, cardCount = added, usedAi = draft.usedAi, at = c.now()))
        c.study.earn(10)
        val undoIt: suspend () -> Unit = {
            if (created) c.library.delete(deckId) else { c.library.setCards(deckId, before); noteId?.let { c.library.deleteNote(deckId, it) } }
        }
        undo = undoIt
        _s.update { it.copy(step = ImportStep.DONE, savedCount = added, savedDeck = deckId, error = null) }
        done(added, undoIt)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ImportScreen(deckId: String?, initialText: String, onBack: () -> Unit, onStartQuiz: (String) -> Unit, onOpenDeck: (String) -> Unit) {
    val vm = zingViewModel(key = "import:${deckId ?: "new"}") { ImportViewModel(it, deckId, initialText) }
    val app = LocalApp.current
    val s by vm.state.collectAsStateWithLifecycle()
    val pickFile = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri -> uri?.let(vm::file) }
    val pickPhoto = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri -> uri?.let(vm::file) }

    Page {
        ZScaffold(title = "Magic import", onBack = { if (s.step == ImportStep.WORKING) vm.cancel() else onBack() }) { pad ->
            when (s.step) {
                ImportStep.SOURCE -> LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxSize().padding(pad).imePadding()) {
                    item { Text(if (s.targetName != null) "Cards and notes go into “${s.targetName}”." else "Zing makes a new notebook from what you import.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    s.error?.let { e -> item { MessageCard(e, error = true, actionLabel = "Try again", onAction = { vm.retry() }) } }
                    item {
                        val ai = s.ai
                        when {
                            ai == null -> Unit
                            ai.available -> MessageCard("Zing AI is ready: ${plural(ai.left, "turn")} left today. Only your study material is sent, never your name, email or school.")
                            else -> MessageCard(AiErrors.message(ai.block) + " Zing will make quick cards on your phone instead.", modifier = Modifier.testTag("aiFallbackNote"))
                        }
                    }
                    item {
                        Text("Choose a source", style = MaterialTheme.typography.titleMedium, modifier = Modifier.semantics { heading() })
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                            OutlinedButton(onClick = { pickFile.launch(arrayOf("application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "text/*", "audio/*")) }, modifier = Modifier.testTag("pickFile")) { Text("PDF, Word, slides, text or recording") }
                            OutlinedButton(onClick = { pickPhoto.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }) { Text("Photo of notes") }
                            FilterChip(s.mode == "paste", { vm.edit { it.copy(mode = "paste") } }, label = { Text("Paste notes, Quizlet, Anki or Sheets") })
                            FilterChip(s.mode == "link", { vm.edit { it.copy(mode = "link") } }, label = { Text("Website link") })
                        }
                    }
                    if (s.mode == "paste") {
                        item {
                            OutlinedTextField(s.text, { v -> vm.edit { it.copy(text = v.take(200_000)) } }, label = { Text("Paste your notes or an export") }, minLines = 6, maxLines = 14,
                                supportingText = { Text("One “term - meaning” per line, a Quizlet or Anki export, spreadsheet rows, or ordinary notes.") }, modifier = Modifier.fillMaxWidth().testTag("pasteField"))
                        }
                        item { Button(onClick = vm::paste, enabled = s.text.trim().length >= 20, modifier = Modifier.testTag("makeFromPaste")) { Text("Make cards") } }
                    } else {
                        item { OutlinedTextField(s.url, { v -> vm.edit { it.copy(url = v.take(600)) } }, label = { Text("https://…") }, singleLine = true, modifier = Modifier.fillMaxWidth()) }
                        item { Button(onClick = vm::link, enabled = s.url.trim().startsWith("https://") && s.ai?.available == true) { Text("Make cards from this page") } }
                        if (s.ai?.available != true) item { Text("Links need Zing AI. You can paste the page's text instead.", style = MaterialTheme.typography.bodySmall) }
                    }
                    item {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("About how many cards?")
                            listOf(8, 12, 20).forEach { n -> FilterChip(s.count == n, { vm.edit { it.copy(count = n) } }, label = { Text("$n") }) }
                        }
                    }
                }
                ImportStep.WORKING -> Column(Modifier.fillMaxSize().padding(pad).padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically)) {
                    CircularProgressIndicator()
                    Text("Crafting questions", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.testTag("crafting").semantics { heading(); liveRegion = LiveRegionMode.Polite })
                    Text(s.working + "…", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    OutlinedButton(onClick = vm::cancel, modifier = Modifier.testTag("cancelImport")) { Text("Cancel") }
                }
                ImportStep.REVIEW -> {
                    val draft = s.draft
                    Column(Modifier.fillMaxSize().padding(pad)) {
                        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.weight(1f)) {
                            item {
                                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Text("Check these ${plural(s.cards.size, "card")}", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.semantics { heading() }.testTag("reviewTitle"))
                                    Text(if (draft?.usedAi == true) "Zing AI wrote these from your material. AI can make mistakes, so fix or untick anything that's wrong." else "Made on your phone from your own words. Fix or untick anything you don't want.")
                                    draft?.fallback?.let { MessageCard(AiErrors.message(it) + " These are quick cards instead.") }
                                    s.error?.let { MessageCard(it, error = true) }
                                }
                            }
                            itemsIndexed(s.cards) { i, r ->
                                Card(Modifier.fillMaxWidth()) {
                                    if (s.editing == i) EditRow(r.card, onCancel = { vm.edit { it.copy(editing = null) } }) { q, a -> vm.saveEdit(i, q, a) }
                                    else Row(Modifier.padding(end = 6.dp, top = 6.dp, bottom = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Checkbox(r.keep, { vm.toggle(i) }, modifier = Modifier.semantics { contentDescription = "Keep card ${i + 1}" })
                                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                            Text(r.card.q, style = MaterialTheme.typography.titleSmall)
                                            Text(r.card.a, color = MaterialTheme.colorScheme.primary)
                                            if (r.card.why.isNotBlank()) Text(r.card.why, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                        TextButton(onClick = { vm.edit { it.copy(editing = i) } }) { Text("Edit") }
                                    }
                                }
                            }
                        }
                        Surface(tonalElevation = 3.dp) {
                            Row(Modifier.fillMaxWidth().navigationBarsPadding().padding(12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedButton(onClick = vm::cancel, modifier = Modifier.weight(1f)) { Text("Discard") }
                                Button(onClick = { vm.save { n, undo -> app.notify("${plural(n, "card")} created", "Undo", undo) } }, modifier = Modifier.weight(1f).testTag("saveImport")) { Text("Save ${s.cards.count { it.keep }}") }
                            }
                        }
                    }
                }
                ImportStep.DONE -> Column(Modifier.fillMaxSize().padding(pad).padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(14.dp, Alignment.CenterVertically)) {
                    Art("sparkles", 96.dp)
                    Text("${plural(s.savedCount, "card")} created", style = MaterialTheme.typography.headlineMedium, modifier = Modifier.testTag("importDone").semantics { heading() })
                    val deck = s.savedDeck
                    if (deck != null) {
                        Button(onClick = { onStartQuiz(deck) }, enabled = s.savedCount >= 4, modifier = Modifier.heightIn(min = 52.dp).testTag("startQuiz")) { Text("Start quiz") }
                        OutlinedButton(onClick = { onOpenDeck(deck) }) { Text("Open the notebook") }
                    }
                }
            }
        }
    }
}

@Composable
private fun EditRow(card: Card, onCancel: () -> Unit, onSave: (String, String) -> Unit) {
    var q by rememberSaveable { mutableStateOf(card.q) }
    var a by rememberSaveable { mutableStateOf(card.a) }
    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedTextField(q, { q = it }, label = { Text("Question") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(a, { a = it }, label = { Text("Answer") }, modifier = Modifier.fillMaxWidth())
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { TextButton(onClick = onCancel) { Text("Cancel") }; Button(onClick = { onSave(q, a) }) { Text("Done") } }
    }
}
