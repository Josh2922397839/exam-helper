package app.zing.core.model

/** One flashcard. With three [wrong] answers it can be asked as multiple choice; [why] explains the answer. */
data class Card(val q: String, val a: String, val wrong: List<String> = emptyList(), val why: String = "") {
    val hasChoices: Boolean get() = wrong.size >= 3
}

/** A note kept inside a deck. Field names in the web save are t (title), x (text), k (kind), at (last edit). */
data class Note(
    val id: String,
    val title: String,
    val text: String,
    val kind: String = "note",
    val at: Long,
    val src: String? = null,
    /** The cloud copy had to leave this note's text out to fit; the full text only lives on the device that wrote it. */
    val cut: Boolean = false,
)

/**
 * A deck exactly as the Zing website stores it. On Android a top-level deck is shown as a notebook and a deck with
 * a [parent] as a sub-book, so both apps always read and write the same thing.
 */
data class Deck(
    val id: String,
    val name: String,
    val color: String,
    val cards: List<Card> = emptyList(),
    val updated: Long,
    val created: Long,
    val parent: String? = null,
    val notes: List<Note> = emptyList(),
    /** The shared deck (a UUID) this one was saved from, if any. */
    val from: String? = null,
)

/** A card as the study modes read it: the deck's own cards plus its sub-books', with the sub-book name as topic. */
data class StudyCard(val q: String, val a: String, val topic: String, val wrong: List<String>?, val why: String)

data class QuizQuestion(val q: String, val options: List<String>, val answer: Int, val why: String)

/** The same limits the website enforces, so nothing one app writes is rejected or trimmed by the other. */
object Limits {
    const val DECK_NAME = 60
    const val CARD_SIDE = 300
    const val WRONG_ANSWER = 200
    const val CARDS_PER_DECK = 400
    const val NOTE_TITLE = 80
    const val NOTE_TEXT = 30_000
    const val NOTES_PER_DECK = 40
    const val BACKUP_NOTE_BUDGET = 150_000
    const val MAX_DEPTH = 6
    const val DEFAULT_COLOR = "#0b8a5e"
    val COLORS = listOf("#ff5e4d", "#ff8a1f", "#ffc23c", "#8acb2f", "#14b8a6", "#3a8dff", "#6c6cff", "#b46cff", "#f25ca8")
    val COLOR_NAMES = listOf("Coral", "Orange", "Sun", "Lime", "Teal", "Sky", "Indigo", "Purple", "Pink")
    val NOTE_KINDS = setOf("note", "paste", "pdf", "doc", "slides", "text", "web", "yt", "audio", "photo", "sheet")
}
