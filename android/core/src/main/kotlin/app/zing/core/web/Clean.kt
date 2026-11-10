package app.zing.core.web

import app.zing.core.model.Card
import app.zing.core.model.Deck
import app.zing.core.model.Limits
import app.zing.core.model.Note
import kotlin.random.Random

/** The website's own cleaning rules (assets/js/core/learn.js), ported one for one. */
object Clean {
    private val CONTROL = Regex("[\\u0000-\\u001f]")
    private val TEXT_CONTROL = Regex("[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f]")
    private val HEX = Regex("^#[0-9a-fA-F]{6}$")
    val DECK_ID = Regex("^my-[a-z0-9]{4,24}$")
    val NOTE_ID = Regex("^n[a-z0-9]{3,20}$")
    val SHARED_ID = Regex("^[0-9a-f-]{36}$")
    private val HTTPS_SRC = Regex("^https://[^\\s\"'<>]{4,500}$")

    /** One line of text: control characters become spaces, trimmed, cut to [max]. */
    fun line(value: String?, max: Int): String = CONTROL.replace(value.orEmpty(), " ").trim().take(max)

    /** Longer text keeps its line breaks and tabs. */
    fun text(value: String?, max: Int): String =
        TEXT_CONTROL.replace(value.orEmpty().replace("\r\n", "\n").replace('\r', '\n'), " ").take(max)

    fun color(value: String?): String = if (value != null && HEX.matches(value)) value.lowercase() else Limits.DEFAULT_COLOR

    fun card(q: String?, a: String?, wrong: List<String>? = null, why: String? = null): Card? {
        val question = line(q, Limits.CARD_SIDE)
        val answer = line(a, Limits.CARD_SIDE)
        if (question.isEmpty() || answer.isEmpty()) return null
        val choices = wrong.orEmpty().map { line(it, Limits.WRONG_ANSWER) }
            .filter { it.isNotEmpty() && !it.equals(answer, ignoreCase = true) }.distinct()
        return Card(question, answer, if (choices.size >= 3) choices.take(3) else emptyList(), line(why, Limits.CARD_SIDE))
    }

    fun card(c: Card): Card? = card(c.q, c.a, c.wrong, c.why)

    fun note(n: Note, now: Long): Note? {
        if (!NOTE_ID.matches(n.id)) return null
        return Note(
            id = n.id,
            title = line(n.title, Limits.NOTE_TITLE).ifEmpty { "Notes" },
            text = text(n.text, Limits.NOTE_TEXT),
            kind = if (n.kind in Limits.NOTE_KINDS) n.kind else "note",
            at = if (n.at > 0) n.at else now,
            src = n.src?.takeIf { HTTPS_SRC.matches(it) },
            cut = n.cut,
        )
    }

    fun deck(d: Deck, now: Long): Deck? {
        if (!DECK_ID.matches(d.id)) return null
        val updated = if (d.updated > 0) d.updated else now
        return Deck(
            id = d.id,
            name = line(d.name, Limits.DECK_NAME).ifEmpty { "Untitled" },
            color = color(d.color),
            cards = d.cards.mapNotNull { card(it) }.take(Limits.CARDS_PER_DECK),
            updated = updated,
            created = if (d.created > 0) d.created else updated,
            parent = d.parent?.takeIf { DECK_ID.matches(it) && it != d.id },
            notes = d.notes.mapNotNull { note(it, now) }.take(Limits.NOTES_PER_DECK),
            from = d.from?.takeIf { SHARED_ID.matches(it) },
        )
    }

    private const val BASE36 = "0123456789abcdefghijklmnopqrstuvwxyz"
    private fun rand36(n: Int, random: Random) = buildString { repeat(n) { append(BASE36[random.nextInt(36)]) } }

    /** Same shape the website makes: "my-" + the time in base 36 + 4 random characters. */
    fun newDeckId(now: Long, random: Random = Random.Default): String = "my-" + now.toString(36) + rand36(4, random)

    fun newNoteId(now: Long, random: Random = Random.Default): String = "n" + now.toString(36) + rand36(3, random)

    /** A deck can sit inside another deck, but never inside itself or its own sub-books, and not too deep. */
    fun parentOk(id: String, parent: String?, decks: Map<String, Deck>): Boolean {
        if (parent == null || parent == id || parent !in decks) return false
        var p = decks[parent]
        var depth = 0
        while (p?.parent != null && depth++ < 12) {
            if (p.parent == id) return false
            p = decks[p.parent]
        }
        return depth < Limits.MAX_DEPTH
    }
}
