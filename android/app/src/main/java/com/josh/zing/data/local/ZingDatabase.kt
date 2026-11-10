package com.josh.zing.data.local

import androidx.room.ColumnInfo
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Fts4
import androidx.room.FtsOptions
import androidx.room.Index
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.RoomDatabase
import androidx.room.Transaction
import androidx.room.Update
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

/** A deck (a notebook, or a sub-book when [parent] is set). Cards are kept as the website's JSON array. */
@Entity(tableName = "decks")
data class DeckEntity(
    @PrimaryKey val id: String,
    val name: String,
    val color: String,
    val cardsJson: String,
    val updated: Long,
    val created: Long,
    val parent: String?,
    val fromShared: String?,
    /** Changed on this device since the last sync. */
    val dirty: Boolean,
    val baseUpdated: Long,
    val baseCards: String?,
    /** The link ID this deck was shared under, if the student shared it. */
    val sharedId: String? = null,
)

@Entity(tableName = "notes", indices = [Index(value = ["deckId", "noteId"], unique = true), Index("deckId")])
data class NoteEntity(
    @PrimaryKey(autoGenerate = true) @ColumnInfo(name = "rowid") val rowId: Long = 0,
    val deckId: String,
    val noteId: String,
    val title: String,
    val body: String,
    val kind: String,
    val at: Long,
    val src: String?,
    val cut: Boolean,
)

/** The full-text index over note titles and text. Room keeps it in step with `notes` using triggers. */
@Fts4(contentEntity = NoteEntity::class, tokenizer = FtsOptions.TOKENIZER_UNICODE61)
@Entity(tableName = "notes_fts")
data class NoteFts(val title: String, val body: String)

/** This device's copy of a deck that clashed with the cloud copy, waiting for the student to choose. */
@Entity(tableName = "conflicts")
data class ConflictEntity(@PrimaryKey val deckId: String, val mineJson: String, val theirsJson: String, val reason: String, val at: Long)

/** Small named values: progress, coins, sync bookkeeping, the cached profile and entitlement. */
@Entity(tableName = "kv")
data class KvEntity(@PrimaryKey val key: String, val value: String)

/** A note being typed, saved every few moments so nothing is lost if the app is closed. */
@Entity(tableName = "drafts")
data class DraftEntity(@PrimaryKey val key: String, val deckId: String, val noteId: String?, val title: String, val body: String, val at: Long)

@Entity(tableName = "imports")
data class ImportEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val source: String,
    val title: String,
    val deckId: String,
    val cardCount: Int,
    val usedAi: Boolean,
    val at: Long,
)

@Entity(tableName = "search_history")
data class SearchHistoryEntity(@PrimaryKey val query: String, val at: Long)

@Dao
interface LibraryDao {
    @Query("SELECT * FROM decks") fun observeDecks(): Flow<List<DeckEntity>>
    @Query("SELECT * FROM decks") suspend fun decks(): List<DeckEntity>
    @Query("SELECT * FROM decks WHERE id = :id") suspend fun deck(id: String): DeckEntity?
    @Upsert suspend fun upsertDeck(deck: DeckEntity)
    @Query("DELETE FROM decks WHERE id IN (:ids)") suspend fun deleteDecks(ids: List<String>)
    @Query("DELETE FROM decks") suspend fun clearDecks()

    @Query("SELECT * FROM notes") fun observeNotes(): Flow<List<NoteEntity>>
    @Query("SELECT * FROM notes") suspend fun notes(): List<NoteEntity>
    @Query("SELECT * FROM notes WHERE deckId = :deckId") suspend fun notesOf(deckId: String): List<NoteEntity>
    @Query("SELECT * FROM notes WHERE deckId = :deckId AND noteId = :noteId") suspend fun note(deckId: String, noteId: String): NoteEntity?
    @Insert(onConflict = OnConflictStrategy.ABORT) suspend fun insertNote(note: NoteEntity): Long
    @Update suspend fun updateNote(note: NoteEntity)
    @Query("DELETE FROM notes WHERE rowid IN (:rowIds)") suspend fun deleteNoteRows(rowIds: List<Long>)
    @Query("DELETE FROM notes WHERE deckId IN (:deckIds)") suspend fun deleteNotesOf(deckIds: List<String>)
    @Query("DELETE FROM notes") suspend fun clearNotes()

    /** Candidate notes for a search. [match] is built only from letters and digits (see core Search.ftsExpression). */
    @Query("SELECT notes.* FROM notes JOIN notes_fts ON notes.rowid = notes_fts.rowid WHERE notes_fts MATCH :match LIMIT :limit")
    suspend fun search(match: String, limit: Int = 400): List<NoteEntity>

    @Query("SELECT * FROM conflicts ORDER BY at DESC") fun observeConflicts(): Flow<List<ConflictEntity>>
    @Query("SELECT * FROM conflicts WHERE deckId = :deckId") suspend fun conflict(deckId: String): ConflictEntity?
    @Upsert suspend fun upsertConflict(c: ConflictEntity)
    @Query("DELETE FROM conflicts WHERE deckId = :deckId") suspend fun deleteConflict(deckId: String)
    @Query("DELETE FROM conflicts") suspend fun clearConflicts()

    @Query("SELECT * FROM drafts WHERE `key` = :key") suspend fun draft(key: String): DraftEntity?
    @Upsert suspend fun upsertDraft(d: DraftEntity)
    @Query("DELETE FROM drafts WHERE `key` = :key") suspend fun deleteDraft(key: String)
    @Query("DELETE FROM drafts") suspend fun clearDrafts()

    @Insert suspend fun insertImport(i: ImportEntity): Long
    @Query("SELECT * FROM imports ORDER BY at DESC LIMIT 30") fun observeImports(): Flow<List<ImportEntity>>
    @Query("DELETE FROM imports") suspend fun clearImports()

    @Upsert suspend fun upsertHistory(h: SearchHistoryEntity)
    @Query("SELECT * FROM search_history ORDER BY at DESC LIMIT 8") fun observeHistory(): Flow<List<SearchHistoryEntity>>
    @Query("DELETE FROM search_history") suspend fun clearHistory()

    /** Replaces a deck's notes with [notes], reusing rows so the full-text index only changes where the text did. */
    @Transaction
    suspend fun replaceNotes(deckId: String, notes: List<NoteEntity>) {
        val existing = notesOf(deckId).associateBy { it.noteId }
        val keep = HashSet<String>()
        for (n in notes) {
            if (!keep.add(n.noteId)) continue
            val old = existing[n.noteId]
            if (old == null) insertNote(n.copy(rowId = 0)) else if (old != n.copy(rowId = old.rowId)) updateNote(n.copy(rowId = old.rowId))
        }
        val gone = existing.values.filter { it.noteId !in keep }.map { it.rowId }
        if (gone.isNotEmpty()) deleteNoteRows(gone)
    }

    @Transaction
    suspend fun saveDeck(deck: DeckEntity, notes: List<NoteEntity>) {
        upsertDeck(deck)
        replaceNotes(deck.id, notes)
    }

    @Transaction
    suspend fun removeDecks(ids: List<String>) {
        if (ids.isEmpty()) return
        deleteNotesOf(ids)
        deleteDecks(ids)
        ids.forEach { deleteConflict(it) }
    }
}

@Dao
interface KvDao {
    @Query("SELECT value FROM kv WHERE `key` = :key") suspend fun get(key: String): String?
    @Query("SELECT value FROM kv WHERE `key` = :key") fun observe(key: String): Flow<String?>
    @Upsert suspend fun put(entry: KvEntity)
    @Query("DELETE FROM kv WHERE `key` = :key") suspend fun delete(key: String)
    @Query("DELETE FROM kv") suspend fun clear()
}

@Database(
    entities = [DeckEntity::class, NoteEntity::class, NoteFts::class, ConflictEntity::class, KvEntity::class, DraftEntity::class, ImportEntity::class, SearchHistoryEntity::class],
    version = 1,
    exportSchema = true,
)
abstract class ZingDatabase : RoomDatabase() {
    abstract fun library(): LibraryDao
    abstract fun kv(): KvDao
}

/** Names of the values kept in the `kv` table. */
object Keys {
    const val PROGRESS = "progress"
    const val WALLET = "wallet"
    const val OVERLAY = "overlay"
    const val OVERLAY_REV = "overlay.rev"
    const val OVERLAY_DIRTY = "overlay.dirty"
    const val PROGRESS_DIRTY = "progress.dirty"
    const val XP_PENDING = "xp.pending"
    const val XP_SEQUENCE = "xp.seq"
    const val XP_INFLIGHT = "xp.inflight"
    const val LAST_SYNC = "sync.last"
    const val LAST_SYNC_ERROR = "sync.error"
    const val ME = "me"
    const val ENTITLEMENT = "entitlement"
    const val BLOCKED = "blocked"
}
