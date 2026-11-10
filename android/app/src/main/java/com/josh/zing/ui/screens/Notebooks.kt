package com.josh.zing.ui.screens

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.ArrowDownward
import androidx.compose.material.icons.rounded.ArrowUpward
import androidx.compose.material.icons.rounded.MoreVert
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.SwapVert
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import app.zing.core.model.Limits
import com.josh.zing.AppContainer
import com.josh.zing.data.repo.NotebookSummary
import com.josh.zing.data.repo.Notebooks
import com.josh.zing.ui.components.ColorSwatches
import com.josh.zing.ui.components.ConfirmDialog
import com.josh.zing.ui.components.EmptyState
import com.josh.zing.ui.components.LocalApp
import com.josh.zing.ui.components.MessageCard
import com.josh.zing.ui.components.Page
import com.josh.zing.ui.components.ZScaffold
import com.josh.zing.ui.components.ago
import com.josh.zing.ui.components.onColor
import com.josh.zing.ui.components.parseColor
import com.josh.zing.ui.components.plural
import com.josh.zing.ui.components.zingViewModel
import com.josh.zing.ui.theme.LocalZing
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

val BOOK_ICONS = listOf("📓", "📚", "🧪", "🧬", "📐", "🌍", "📜", "💡", "💻", "🎨", "⚽", "🎵", "🗣️", "💼", "⭐")

data class InventoryState(val loading: Boolean = true, val active: List<NotebookSummary> = emptyList(), val archived: List<NotebookSummary> = emptyList(), val conflicts: Int = 0)

class NotebooksViewModel(private val c: AppContainer) : ViewModel() {
    val state: StateFlow<InventoryState> = combine(c.library.decks, c.library.overlay, c.study.progress, c.library.conflicts) { decks, overlay, progress, conflicts ->
        val all = Notebooks.summarise(decks, overlay, progress, conflicts.map { it.deckId }.toSet(), c.now())
        InventoryState(false, all.filter { !it.archived }, all.filter { it.archived }, conflicts.size)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), InventoryState())

    fun create(name: String, color: String, icon: String?, parent: String? = null, then: (String) -> Unit = {}) = viewModelScope.launch {
        then(c.library.createDeck(name, color, parent, icon).id)
    }

    fun edit(id: String, name: String, color: String, icon: String?) = viewModelScope.launch {
        c.library.rename(id, name, color)
        c.library.setBookMeta(id) { it.copy(icon = icon) }
    }

    fun archive(id: String, archived: Boolean) = viewModelScope.launch { c.library.setArchived(id, archived) }

    /** Deletes a notebook and hands back a way to undo it. */
    fun delete(id: String, deleted: (undo: suspend () -> Unit) -> Unit) = viewModelScope.launch {
        c.library.delete(id)?.let { gone -> deleted { c.library.undoDelete(gone) } }
    }

    fun move(id: String, by: Int) = viewModelScope.launch {
        val ids = state.value.active.map { it.deck.id }.toMutableList()
        val i = ids.indexOf(id); val j = i + by
        if (i < 0 || j !in ids.indices) return@launch
        ids.add(j, ids.removeAt(i))
        c.library.reorder(ids)
    }
}

/** The sheet for making or editing a notebook: name, cover colour and an optional icon. */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun NotebookSheet(title: String, initialName: String = "", initialColor: String = Limits.COLORS[4], initialIcon: String? = null, confirm: String, onDismiss: () -> Unit, onSave: (name: String, color: String, icon: String?) -> Unit) {
    var name by rememberSaveable { mutableStateOf(initialName) }
    var color by rememberSaveable { mutableStateOf(initialColor) }
    var icon by rememberSaveable { mutableStateOf(initialIcon) }
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).imePadding().navigationBarsPadding().padding(horizontal = 20.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(title, style = MaterialTheme.typography.titleLarge)
            OutlinedTextField(name, { name = it.take(Limits.DECK_NAME) }, label = { Text("Name") }, singleLine = true, modifier = Modifier.fillMaxWidth().testTag("notebookName"),
                supportingText = { Text("${name.length}/${Limits.DECK_NAME}") })
            Text("Cover colour", style = MaterialTheme.typography.titleSmall)
            ColorSwatches(color, { color = it })
            Text("Icon (optional)", style = MaterialTheme.typography.titleSmall)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                BOOK_ICONS.forEach { e ->
                    FilterChip(selected = icon == e, onClick = { icon = if (icon == e) null else e }, label = { Text(e, fontSize = 20.sp) }, modifier = Modifier.semantics { contentDescription = "Icon $e" })
                }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                TextButton(onClick = onDismiss) { Text("Cancel") }
                Button(onClick = { onSave(name.trim(), color, icon) }, enabled = name.isNotBlank(), modifier = Modifier.testTag("notebookSave")) { Text(confirm) }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun NotebookCard(n: NotebookSummary, now: Long, onOpen: () -> Unit, modifier: Modifier = Modifier, reorder: Boolean = false, onMove: (Int) -> Unit = {}, menu: @Composable (dismiss: () -> Unit) -> Unit = {}) {
    val cover = parseColor(n.deck.color)
    val showProgress = LocalZing.current.showProgress
    var open by rememberSaveable(n.deck.id) { mutableStateOf(false) }
    val summary = listOf(plural(n.noteCount, "note"), plural(n.deckCount, "deck"), plural(n.cardCount, "card")).joinToString(", ")
    Card(
        modifier = modifier.fillMaxWidth().clip(MaterialTheme.shapes.large)
            .combinedClickable(onClick = onOpen, onLongClick = { open = true }, onClickLabel = "Open notebook", onLongClickLabel = "More options")
            .semantics(mergeDescendants = true) { contentDescription = "${n.deck.name}. $summary." + if (n.hasConflict) " Needs your attention." else "" }
            .testTag("notebook:${n.deck.name}"),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Box(Modifier.fillMaxWidth().height(64.dp).background(cover)) {
            Text(n.meta.icon ?: n.deck.name.take(1).uppercase(), fontSize = 28.sp, color = onColor(cover), modifier = Modifier.align(Alignment.CenterStart).padding(start = 14.dp).clearAndSetSemantics { })
            Box(Modifier.align(Alignment.TopEnd)) {
                IconButton(onClick = { open = true }) { Icon(Icons.Rounded.MoreVert, "Options for ${n.deck.name}", tint = onColor(cover)) }
                DropdownMenu(open, { open = false }) { menu { open = false } }
            }
        }
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(n.deck.name, style = MaterialTheme.typography.titleMedium, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Text("${plural(n.noteCount, "note")} · ${plural(n.deckCount, "deck")} · ${plural(n.cardCount, "card")}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text("Updated ${ago(n.lastUpdated, now)}" + if (n.unsynced) " · not backed up yet" else "", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            if (showProgress && n.cardCount > 0) {
                LinearProgressIndicator(progress = { n.progress }, modifier = Modifier.fillMaxWidth().padding(top = 4.dp).semantics { contentDescription = "${n.mastered} of ${n.cardCount} cards learned" })
                Text("${n.mastered}/${n.cardCount} learned" + if (n.due > 0) " · ${n.due} due" else "", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            if (n.hasConflict) Text("Changed on another device", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.error)
            if (reorder) Row {
                IconButton(onClick = { onMove(-1) }) { Icon(Icons.Rounded.ArrowUpward, "Move ${n.deck.name} earlier") }
                IconButton(onClick = { onMove(1) }) { Icon(Icons.Rounded.ArrowDownward, "Move ${n.deck.name} later") }
            }
        }
    }
}

@Composable
fun NotebooksScreen(onOpen: (String) -> Unit, onSearch: () -> Unit, onImport: () -> Unit) {
    val vm = zingViewModel { NotebooksViewModel(it) }
    val app = LocalApp.current
    val s by vm.state.collectAsStateWithLifecycle()
    var creating by rememberSaveable { mutableStateOf(false) }
    var editing by rememberSaveable { mutableStateOf<String?>(null) }
    var deleting by rememberSaveable { mutableStateOf<String?>(null) }
    var showArchived by rememberSaveable { mutableStateOf(false) }
    var reorder by rememberSaveable { mutableStateOf(false) }
    val now = System.currentTimeMillis()
    val list = if (showArchived) s.archived else s.active

    Page {
        ZScaffold(
            title = "Notebooks",
            actions = {
                IconButton(onClick = onSearch) { Icon(Icons.Rounded.Search, "Search all notebooks") }
                if (!showArchived && s.active.size > 1) IconButton(onClick = { reorder = !reorder }) { Icon(Icons.Rounded.SwapVert, if (reorder) "Finish reordering" else "Reorder notebooks") }
            },
            floating = { ExtendedFloatingActionButton(onClick = { creating = true }, icon = { Icon(Icons.Rounded.Add, null) }, text = { Text("New notebook") }, modifier = Modifier.testTag("newNotebook")) },
        ) { pad ->
            LazyVerticalGrid(
                GridCells.Adaptive(170.dp), contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 96.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp), verticalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxSize().padding(pad),
            ) {
                item(span = { GridItemSpan(maxLineSpan) }) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (s.conflicts > 0) MessageCard("${plural(s.conflicts, "notebook")} changed on another device. Open ${if (s.conflicts == 1) "it" else "them"} to choose which version to keep.", error = true)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            FilterChip(!showArchived, { showArchived = false }, label = { Text("My notebooks (${s.active.size})") })
                            FilterChip(showArchived, { showArchived = true; reorder = false }, label = { Text("Archived (${s.archived.size})") }, modifier = Modifier.testTag("archivedTab"))
                        }
                    }
                }
                if (!s.loading && list.isEmpty()) item(span = { GridItemSpan(maxLineSpan) }) {
                    if (showArchived) EmptyState("books", "Nothing archived", "Archive a notebook to tuck it away without deleting it. It stays searchable if you ask for archived notes.")
                    else EmptyState("book", "Make your first notebook", "A notebook holds your notes and the cards you make from them. Everything you add works offline.", actionLabel = "Magic import", onAction = onImport)
                }
                items(list, key = { it.deck.id }) { n ->
                    NotebookCard(n, now, onOpen = { onOpen(n.deck.id) }, reorder = reorder, onMove = { vm.move(n.deck.id, it) }, modifier = Modifier.animateItem()) { dismiss ->
                        DropdownMenuItem({ Text("Rename or restyle") }, { dismiss(); editing = n.deck.id })
                        if (n.archived) DropdownMenuItem({ Text("Restore") }, { dismiss(); vm.archive(n.deck.id, false); app.notify("“${n.deck.name}” restored") })
                        else DropdownMenuItem({ Text("Archive") }, { dismiss(); vm.archive(n.deck.id, true); app.notify("“${n.deck.name}” archived", "Undo") { vm.archive(n.deck.id, false) } })
                        DropdownMenuItem({ Text("Delete") }, { dismiss(); deleting = n.deck.id })
                    }
                }
            }
        }
    }
    if (creating) NotebookSheet("New notebook", confirm = "Create", onDismiss = { creating = false }) { name, color, icon -> creating = false; vm.create(name, color, icon) { onOpen(it) } }
    editing?.let { id ->
        (s.active + s.archived).firstOrNull { it.deck.id == id }?.let { n ->
            NotebookSheet("Edit notebook", n.deck.name, n.deck.color, n.meta.icon, "Save", { editing = null }) { name, color, icon -> editing = null; vm.edit(id, name, color, icon) }
        }
    }
    deleting?.let { id ->
        val n = (s.active + s.archived).firstOrNull { it.deck.id == id }
        ConfirmDialog(
            "Delete “${n?.deck?.name.orEmpty()}”?", "This deletes its ${plural(n?.noteCount ?: 0, "note")}, ${plural(n?.cardCount ?: 0, "card")} and ${plural(n?.subBooks ?: 0, "sub-book")}. You can undo straight afterwards.",
            "Delete", destructive = true, onDismiss = { deleting = null },
            onConfirm = { deleting = null; vm.delete(id) { undo -> app.notify("Notebook deleted", "Undo", undo) } },
        )
    }
}

@Suppress("unused") private val keepShape = CircleShape
@Suppress("unused") private val keepSize = Modifier.size(0.dp).clickable { }
