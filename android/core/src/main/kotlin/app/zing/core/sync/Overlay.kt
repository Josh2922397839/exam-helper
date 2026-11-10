package app.zing.core.sync

import app.zing.core.theme.Appearance
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/** Things a notebook has on Android that the website's deck format has no place for. [at] is when it last changed. */
@Serializable
data class BookMeta(val icon: String? = null, val pos: Double? = null, val archivedAt: Long? = null, val at: Long = 0)

@Serializable
data class NoteMeta(val pinned: Boolean = false, val subject: String = "", val topic: String = "", val archivedAt: Long? = null, val pos: Double? = null, val at: Long = 0)

/**
 * The small per-student document kept in the `app_prefs` table: the appearance settings, and notebook and note
 * details the web save can't hold. Keys are the existing deck and note IDs, so this only *describes* the decks; it
 * never duplicates them. [gone] remembers deleted decks so another Android device doesn't bring them back.
 */
@Serializable
data class Overlay(
    val v: Int = 1,
    val books: Map<String, BookMeta> = emptyMap(),
    val notes: Map<String, NoteMeta> = emptyMap(),
    val appearance: Appearance? = null,
    val appearanceAt: Long = 0,
    val gone: Map<String, Long> = emptyMap(),
) {
    fun book(id: String): BookMeta = books[id] ?: BookMeta()
    fun note(deckId: String, noteId: String): NoteMeta = notes["$deckId/$noteId"] ?: NoteMeta()

    fun withBook(id: String, now: Long, change: (BookMeta) -> BookMeta): Overlay = copy(books = books + (id to change(book(id)).copy(at = now)))
    fun withNote(deckId: String, noteId: String, now: Long, change: (NoteMeta) -> NoteMeta): Overlay =
        copy(notes = notes + ("$deckId/$noteId" to change(note(deckId, noteId)).copy(at = now)))
    fun withAppearance(a: Appearance, now: Long): Overlay = copy(appearance = a, appearanceAt = now)

    companion object {
        const val MAX_BYTES = 60_000
        val json = Json { ignoreUnknownKeys = true; encodeDefaults = false; explicitNulls = false }

        fun decode(text: String?): Overlay = runCatching { json.decodeFromString(serializer(), text.orEmpty()) }.getOrElse { Overlay() }
        fun encode(o: Overlay): String = json.encodeToString(serializer(), o)

        /**
         * Combines two copies. For every notebook, note and the appearance, the most recently edited one wins; a tie
         * is broken by comparing the values, so both devices pick the same one. Merging is safe to repeat.
         */
        fun merge(a: Overlay, b: Overlay): Overlay {
            fun <T> pick(x: T?, y: T?, at: (T) -> Long, text: (T) -> String): T? = when {
                x == null -> y
                y == null -> x
                at(x) != at(y) -> if (at(x) > at(y)) x else y
                else -> if (text(x) >= text(y)) x else y
            }
            val books = (a.books.keys + b.books.keys).associateWith { pick(a.books[it], b.books[it], BookMeta::at) { m -> json.encodeToString(BookMeta.serializer(), m) }!! }
            val notes = (a.notes.keys + b.notes.keys).associateWith { pick(a.notes[it], b.notes[it], NoteMeta::at) { m -> json.encodeToString(NoteMeta.serializer(), m) }!! }
            val takeA = a.appearanceAt > b.appearanceAt || (a.appearanceAt == b.appearanceAt && (a.appearance?.toString().orEmpty() >= b.appearance?.toString().orEmpty()))
            return Overlay(
                books = books, notes = notes,
                appearance = if (takeA) a.appearance ?: b.appearance else b.appearance ?: a.appearance,
                appearanceAt = maxOf(a.appearanceAt, b.appearanceAt),
                gone = (a.gone.keys + b.gone.keys).associateWith { maxOf(a.gone[it] ?: 0, b.gone[it] ?: 0) },
            )
        }

        /**
         * Drops details for decks and notes that no longer exist and, if it is still too big for the server's limit,
         * the oldest note details first. Appearance and notebook details are never dropped for size.
         */
        fun prune(o: Overlay, liveDecks: Set<String>, liveNotes: Set<String>, now: Long): Overlay {
            var out = o.copy(
                books = o.books.filterKeys { it in liveDecks },
                notes = o.notes.filterKeys { it in liveNotes },
                gone = o.gone.filterValues { now - it < 180L * 86_400_000L },
            )
            while (encode(out).toByteArray().size > MAX_BYTES && out.notes.isNotEmpty()) {
                val oldest = out.notes.entries.sortedBy { it.value.at }.take(maxOf(1, out.notes.size / 10)).map { it.key }.toSet()
                out = out.copy(notes = out.notes - oldest)
            }
            return out
        }
    }
}

/** A stable ID for one sync operation, so sending it twice can't apply it twice. */
object OpId {
    fun of(userId: String, kind: String, sequence: Long): String {
        val h = java.security.MessageDigest.getInstance("SHA-256").digest("$userId|$kind|$sequence".toByteArray())
        // shaped as a UUID (the database column type), version 5 style
        val hex = h.take(16).joinToString("") { "%02x".format(it) }.toCharArray()
        hex[12] = '5'
        hex[16] = "89ab"[(Character.digit(hex[16], 16)) and 3]
        val s = String(hex)
        return "${s.substring(0, 8)}-${s.substring(8, 12)}-${s.substring(12, 16)}-${s.substring(16, 20)}-${s.substring(20, 32)}"
    }
}
