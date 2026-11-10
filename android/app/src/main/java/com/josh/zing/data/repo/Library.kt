package com.josh.zing.data.repo

import androidx.room.withTransaction
import app.zing.core.model.Card
import app.zing.core.model.Deck
import app.zing.core.model.Limits
import app.zing.core.model.Note
import app.zing.core.sync.BookMeta
import app.zing.core.sync.Conflict
import app.zing.core.sync.DeckSync
import app.zing.core.sync.LocalDeck
import app.zing.core.sync.MergeResult
import app.zing.core.sync.NoteMeta
import app.zing.core.sync.Overlay
import app.zing.core.theme.Appearance
import app.zing.core.web.Clean
import app.zing.core.web.DeckLogic
import app.zing.core.web.SaveCodec
import com.josh.zing.data.local.ConflictEntity
import com.josh.zing.data.local.DeckEntity
import com.josh.zing.data.local.DraftEntity
import com.josh.zing.data.local.Keys
import com.josh.zing.data.local.KvEntity
import com.josh.zing.data.local.NoteEntity
import com.josh.zing.data.local.ZingDatabase
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray

/** Decks removed in one go (a deck and its sub-books), kept so "Undo" can put them back exactly. */
data class DeletedDecks(val decks: List<LocalDeck>, val metas: Map<String, BookMeta>)

/**
 * The student's notebooks, notes and cards on this device. Everything is written here first (so it works offline)
 * and marked for sync; [onChange] asks the sync engine to run when it can.
 */
class Library(private val db: ZingDatabase, private val now: () -> Long = System::currentTimeMillis, private val onChange: () -> Unit = {}) {
    private val dao = db.library()
    private val kv = db.kv()

    // ---------------------------------------------------------------- reading
    private fun toDeck(e: DeckEntity, notes: List<NoteEntity>): LocalDeck = LocalDeck(
        Deck(
            id = e.id, name = e.name, color = e.color, cards = decodeCards(e.cardsJson), updated = e.updated, created = e.created, parent = e.parent,
            notes = notes.sortedByDescending { it.at }.map { Note(it.noteId, it.title, it.body, it.kind, it.at, it.src, it.cut) }, from = e.fromShared,
        ),
        dirty = e.dirty, baseUpdated = e.baseUpdated, baseCards = e.baseCards,
    )

    private fun toEntity(l: LocalDeck, sharedId: String?) = DeckEntity(
        l.deck.id, l.deck.name, l.deck.color, encodeCards(l.deck.cards), l.deck.updated, l.deck.created, l.deck.parent, l.deck.from, l.dirty, l.baseUpdated, l.baseCards, sharedId,
    )

    private fun noteEntities(d: Deck) = d.notes.map { NoteEntity(deckId = d.id, noteId = it.id, title = it.title, body = it.text, kind = it.kind, at = it.at, src = it.src, cut = it.cut) }

    val decks: Flow<List<LocalDeck>> = combine(dao.observeDecks(), dao.observeNotes()) { decks, notes ->
        val byDeck = notes.groupBy { it.deckId }
        decks.map { toDeck(it, byDeck[it.id].orEmpty()) }
    }.distinctUntilChanged()

    val sharedIds: Flow<Map<String, String>> = dao.observeDecks().map { list -> list.mapNotNull { e -> e.sharedId?.let { e.id to it } }.toMap() }

    val overlay: Flow<Overlay> = kv.observe(Keys.OVERLAY).map { Overlay.decode(it) }.distinctUntilChanged()

    val conflicts: Flow<List<Conflict>> = dao.observeConflicts().map { list -> list.mapNotNull(::toConflict) }

    suspend fun snapshot(): List<LocalDeck> {
        val byDeck = dao.notes().groupBy { it.deckId }
        return dao.decks().map { toDeck(it, byDeck[it.id].orEmpty()) }
    }

    suspend fun deck(id: String): Deck? = dao.deck(id)?.let { toDeck(it, dao.notesOf(id)).deck }
    suspend fun currentOverlay(): Overlay = Overlay.decode(kv.get(Keys.OVERLAY))

    // ---------------------------------------------------------------- writing decks
    private suspend fun write(deck: Deck) {
        val old = dao.deck(deck.id)
        val clean = Clean.deck(deck.copy(updated = maxOf(now(), (old?.updated ?: 0) + 1)), now()) ?: return
        dao.saveDeck(toEntity(LocalDeck(clean, dirty = true, baseUpdated = old?.baseUpdated ?: 0, baseCards = old?.baseCards), old?.sharedId), noteEntities(clean))
        onChange()
    }

    suspend fun createDeck(name: String, color: String, parent: String? = null, icon: String? = null): Deck {
        val t = now()
        val all = snapshot().associate { it.deck.id to it.deck }
        val id = Clean.newDeckId(t)
        val deck = Deck(id, name, color, updated = t, created = t, parent = parent?.takeIf { Clean.parentOk(id, it, all) })
        db.withTransaction {
            write(deck)
            if (icon != null) editOverlay { it.withBook(id, t) { m -> m.copy(icon = icon) } }
        }
        return deck(id) ?: deck
    }

    /** Applies [change] to a deck. Returns the saved deck, or null if it no longer exists. */
    suspend fun update(id: String, change: (Deck) -> Deck): Deck? = db.withTransaction {
        val current = deck(id) ?: return@withTransaction null
        val next = change(current)
        if (next == current) return@withTransaction current
        write(next.copy(id = id))
        deck(id)
    }

    suspend fun rename(id: String, name: String, color: String) = update(id) { it.copy(name = name, color = color) }

    suspend fun move(id: String, parent: String?): Boolean {
        val all = snapshot().associate { it.deck.id to it.deck }
        if (parent != null && !Clean.parentOk(id, parent, all)) return false
        update(id) { it.copy(parent = parent) }
        return true
    }

    /** Deletes a deck and its sub-books, remembering them (as tombstones) so a sync doesn't bring them back. */
    suspend fun delete(id: String): DeletedDecks? = db.withTransaction {
        val all = snapshot()
        val target = all.firstOrNull { it.deck.id == id } ?: return@withTransaction null
        val gone = listOf(target) + DeckLogic.descendants(id, all.map { it.deck }).mapNotNull { d -> all.firstOrNull { it.deck.id == d.id } }
        val o = currentOverlay()
        val t = now()
        dao.removeDecks(gone.map { it.deck.id })
        putOverlay(o.copy(gone = o.gone + gone.associate { it.deck.id to t }, books = o.books - gone.map { it.deck.id }.toSet()))
        onChange()
        DeletedDecks(gone, gone.mapNotNull { g -> o.books[g.deck.id]?.let { g.deck.id to it } }.toMap())
    }

    suspend fun undoDelete(deleted: DeletedDecks) = db.withTransaction {
        deleted.decks.forEach { l -> dao.saveDeck(toEntity(l.copy(dirty = true), null), noteEntities(l.deck)) }
        val o = currentOverlay()
        putOverlay(o.copy(gone = o.gone - deleted.decks.map { it.deck.id }.toSet(), books = o.books + deleted.metas))
        onChange()
    }

    // ---------------------------------------------------------------- cards and notes
    suspend fun setCards(id: String, cards: List<Card>) = update(id) { it.copy(cards = cards.mapNotNull { c -> Clean.card(c) }.take(Limits.CARDS_PER_DECK)) }

    /** Adds cards, skipping questions the deck already has. Returns how many were added. */
    suspend fun addCards(id: String, cards: List<Card>): Int {
        var added = 0
        update(id) { d ->
            val have = d.cards.map { it.q.lowercase() }.toHashSet()
            val fresh = cards.mapNotNull { Clean.card(it) }.filter { have.add(it.q.lowercase()) }.take(Limits.CARDS_PER_DECK - d.cards.size)
            added = fresh.size
            d.copy(cards = d.cards + fresh)
        }
        return added
    }

    suspend fun removeCards(id: String, questions: Set<String>) = update(id) { d -> d.copy(cards = d.cards.filter { it.q !in questions }) }

    /** Saves a note (new or edited). Returns its ID, or null when the deck is full or gone. */
    suspend fun saveNote(deckId: String, noteId: String?, title: String, text: String, kind: String = "note", src: String? = null): String? {
        val t = now()
        val id = noteId ?: Clean.newNoteId(t)
        var ok = false
        update(deckId) { d ->
            val existing = d.notes.firstOrNull { it.id == id }
            if (existing == null && d.notes.size >= Limits.NOTES_PER_DECK) return@update d
            ok = true
            val note = Note(id, title, text, existing?.kind ?: kind, t, existing?.src ?: src, cut = false)
            d.copy(notes = d.notes.filter { it.id != id } + note)
        }
        if (ok) dao.deleteDraft(draftKey(deckId, noteId))
        return id.takeIf { ok }
    }

    suspend fun deleteNote(deckId: String, noteId: String): Note? {
        var removed: Note? = null
        update(deckId) { d -> removed = d.notes.firstOrNull { it.id == noteId }; d.copy(notes = d.notes.filter { it.id != noteId }) }
        return removed
    }

    suspend fun restoreNote(deckId: String, note: Note) = update(deckId) { d -> if (d.notes.any { it.id == note.id }) d else d.copy(notes = d.notes + note.copy(at = now())) }

    // ---------------------------------------------------------------- drafts (autosave while typing)
    fun draftKey(deckId: String, noteId: String?) = "$deckId/${noteId ?: "new"}"
    suspend fun draft(deckId: String, noteId: String?): DraftEntity? = dao.draft(draftKey(deckId, noteId))
    suspend fun saveDraft(deckId: String, noteId: String?, title: String, body: String) =
        dao.upsertDraft(DraftEntity(draftKey(deckId, noteId), deckId, noteId, title.take(Limits.NOTE_TITLE), body.take(Limits.NOTE_TEXT), now()))
    suspend fun discardDraft(deckId: String, noteId: String?) = dao.deleteDraft(draftKey(deckId, noteId))

    // ---------------------------------------------------------------- notebook details the web save can't hold
    private suspend fun putOverlay(o: Overlay) {
        kv.put(KvEntity(Keys.OVERLAY, Overlay.encode(o)))
        kv.put(KvEntity(Keys.OVERLAY_DIRTY, "1"))
    }

    suspend fun editOverlay(change: (Overlay) -> Overlay) = db.withTransaction {
        val before = currentOverlay()
        val after = change(before)
        if (after != before) { putOverlay(after); onChange() }
    }

    suspend fun setBookMeta(id: String, change: (BookMeta) -> BookMeta) = editOverlay { it.withBook(id, now(), change) }
    suspend fun setNoteMeta(deckId: String, noteId: String, change: (NoteMeta) -> NoteMeta) = editOverlay { it.withNote(deckId, noteId, now(), change) }
    suspend fun setArchived(id: String, archived: Boolean) = setBookMeta(id) { it.copy(archivedAt = if (archived) now() else null) }
    suspend fun setAppearance(a: Appearance) = editOverlay { it.withAppearance(a, now()) }

    /** Saves a new order for notebooks (or sub-books): their position is their index in [ids]. */
    suspend fun reorder(ids: List<String>) = editOverlay { o -> ids.foldIndexed(o) { i, acc, id -> acc.withBook(id, now()) { it.copy(pos = i.toDouble()) } } }

    suspend fun setSharedId(id: String, sharedId: String?) { dao.deck(id)?.let { dao.upsertDeck(it.copy(sharedId = sharedId)) } }

    // ---------------------------------------------------------------- conflicts
    private val json = Json { ignoreUnknownKeys = true }
    private fun deckJson(d: Deck) = SaveCodec.decksToJson(listOf(d)).toString()
    private fun deckFromJson(s: String): Deck? = runCatching { SaveCodec.decksFromJson(json.parseToJsonElement(s), now()).firstOrNull() }.getOrNull()
    private fun toConflict(e: ConflictEntity): Conflict? {
        val mine = deckFromJson(e.mineJson) ?: return null
        val theirs = deckFromJson(e.theirsJson) ?: return null
        return Conflict(e.deckId, mine, theirs, e.reason)
    }

    suspend fun resolveConflict(deckId: String, choice: DeckSync.Resolution) = db.withTransaction {
        val conflict = dao.conflict(deckId)?.let(::toConflict)
        val current = deck(deckId)
        if (conflict != null && current != null) {
            DeckSync.resolve(conflict, current, choice, now(), Clean.newDeckId(now())).forEach { d -> if (d != current) write(d) }
        }
        dao.deleteConflict(deckId)
    }

    // ---------------------------------------------------------------- sync
    /**
     * Merges the cloud's decks into this device in one transaction (so a note typed during a sync can't be lost
     * between reading and writing). Returns what the merge decided.
     */
    suspend fun mergeFromCloud(remote: List<Deck>): MergeResult = db.withTransaction {
        val result = DeckSync.merge(snapshot(), currentOverlay().gone, remote, now())
        applyMerge(result)
        result
    }

    /** Replaces the device's decks with the result of a merge, in one transaction. */
    suspend fun applyMerge(result: MergeResult) = db.withTransaction {
        val before = dao.decks().associateBy { it.id }
        val keep = result.decks.map { it.deck.id }.toSet()
        dao.removeDecks(before.keys.filter { it !in keep })
        result.decks.forEach { l -> dao.saveDeck(toEntity(l, before[l.deck.id]?.sharedId), noteEntities(l.deck)) }
        result.conflicts.forEach { c -> dao.upsertConflict(ConflictEntity(c.deckId, deckJson(c.mine), deckJson(c.theirs), c.reason, now())) }
        val o = currentOverlay()
        if (o.gone != result.tombstones) kv.put(KvEntity(Keys.OVERLAY, Overlay.encode(o.copy(gone = result.tombstones))))
    }

    /** After a successful upload: what is on the device is now what the cloud has. */
    suspend fun markSynced(uploaded: List<Deck>) = db.withTransaction {
        uploaded.forEach { d ->
            val e = dao.deck(d.id) ?: return@forEach
            if (e.updated == d.updated) dao.upsertDeck(e.copy(dirty = false, baseUpdated = d.updated, baseCards = DeckSync.cardsHash(d.cards)))
        }
    }

    suspend fun storeOverlay(o: Overlay, rev: Long, dirty: Boolean) = db.withTransaction {
        kv.put(KvEntity(Keys.OVERLAY, Overlay.encode(o)))
        kv.put(KvEntity(Keys.OVERLAY_REV, rev.toString()))
        if (dirty) kv.put(KvEntity(Keys.OVERLAY_DIRTY, "1")) else kv.delete(Keys.OVERLAY_DIRTY)
    }

    suspend fun hasUnsyncedChanges(): Boolean = dao.decks().any { it.dirty } || kv.get(Keys.OVERLAY_DIRTY) != null || kv.get(Keys.PROGRESS_DIRTY) != null || (kv.get(Keys.XP_PENDING)?.toIntOrNull() ?: 0) > 0

    /** Removes every deck, note and draft from this device (signing in as someone else, or deleting the account). */
    suspend fun wipe() = db.withTransaction {
        dao.clearNotes(); dao.clearDecks(); dao.clearConflicts(); dao.clearDrafts(); dao.clearImports(); dao.clearHistory()
        kv.delete(Keys.OVERLAY); kv.delete(Keys.OVERLAY_REV); kv.delete(Keys.OVERLAY_DIRTY)
    }

    companion object {
        private val parser = Json { ignoreUnknownKeys = true }
        fun decodeCards(s: String): List<Card> = runCatching { (parser.parseToJsonElement(s) as JsonArray).mapNotNull { SaveCodec.cardFromJson(it) } }.getOrDefault(emptyList())
        fun encodeCards(cards: List<Card>): String = JsonArray(cards.map { SaveCodec.cardToJson(it) }).toString()
    }
}

/** A notebook as the inventory shows it. */
data class NotebookSummary(
    val deck: Deck,
    val meta: BookMeta,
    val noteCount: Int,
    val cardCount: Int,
    /** Sub-books that have cards of their own (plus this one, if it does). */
    val deckCount: Int,
    val subBooks: Int,
    val lastUpdated: Long,
    val mastered: Int,
    val due: Int,
    val hasConflict: Boolean,
    val unsynced: Boolean,
) {
    val archived: Boolean get() = meta.archivedAt != null
    val progress: Float get() = if (cardCount == 0) 0f else mastered.toFloat() / cardCount
}

object Notebooks {
    /** Builds the inventory: top-level decks with their counts, in the student's own order (then newest first). */
    fun summarise(decks: List<LocalDeck>, overlay: Overlay, progress: app.zing.core.web.Progress, conflicts: Set<String>, now: Long, parent: String? = null): List<NotebookSummary> {
        val all = decks.map { it.deck }
        return decks.filter { it.deck.parent == parent }.map { l ->
            val family = listOf(l.deck) + DeckLogic.descendants(l.deck.id, all)
            val cards = DeckLogic.allCards(l.deck, all)
            val questions = cards.map { it.q }
            NotebookSummary(
                deck = l.deck, meta = overlay.book(l.deck.id),
                noteCount = family.sumOf { it.notes.size }, cardCount = cards.size,
                deckCount = family.count { it.cards.isNotEmpty() }, subBooks = family.size - 1,
                lastUpdated = family.maxOf { d -> maxOf(d.updated, d.notes.maxOfOrNull { it.at } ?: 0) },
                mastered = progress.mastered(l.deck.id, questions), due = progress.due(l.deck.id, questions, now).size,
                hasConflict = family.any { it.id in conflicts }, unsynced = family.any { f -> decks.any { it.deck.id == f.id && it.dirty } },
            )
        }.sortedWith(compareBy<NotebookSummary> { it.meta.pos ?: Double.MAX_VALUE }.thenByDescending { it.lastUpdated })
    }
}
