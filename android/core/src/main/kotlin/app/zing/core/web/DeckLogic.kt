package app.zing.core.web

import app.zing.core.model.Deck
import app.zing.core.model.QuizQuestion
import app.zing.core.model.StudyCard

/** How a deck becomes something to study: the same rules as the website's deck store. */
object DeckLogic {
    fun children(id: String, decks: Collection<Deck>): List<Deck> = decks.filter { it.parent == id }.sortedBy { it.created }

    fun descendants(id: String, decks: Collection<Deck>): List<Deck> {
        val out = ArrayList<Deck>()
        fun walk(d: String, depth: Int) {
            if (depth > 12) return
            children(d, decks).forEach { k -> if (out.none { it.id == k.id }) { out += k; walk(k.id, depth + 1) } }
        }
        walk(id, 0)
        return out
    }

    /** The top-level deck a deck lives in: its notebook. */
    fun rootOf(id: String, decks: Map<String, Deck>): Deck? {
        var d = decks[id] ?: return null
        var depth = 0
        while (d.parent != null && depth++ < 12) d = decks[d.parent] ?: break
        return d
    }

    /** The path of names from the notebook down to this deck. */
    fun pathOf(id: String, decks: Map<String, Deck>): List<Deck> {
        val out = ArrayDeque<Deck>()
        var d = decks[id]
        var depth = 0
        while (d != null && depth++ < 12) { out.addFirst(d); d = d.parent?.let { decks[it] } }
        return out
    }

    /** The deck's cards plus its sub-books' cards. A question that appears twice is asked once. */
    fun allCards(deck: Deck, decks: Collection<Deck>): List<StudyCard> {
        val seen = HashSet<String>()
        val out = ArrayList<StudyCard>()
        (listOf(deck) + descendants(deck.id, decks)).forEach { d ->
            d.cards.forEach { c ->
                if (seen.add(c.q.lowercase())) out += StudyCard(c.q, c.a, if (d.id == deck.id) "" else d.name, c.wrong.takeIf { it.size >= 3 }, c.why)
            }
        }
        return out
    }

    private fun mix(i: Int, j: Int): Long = (((i + 1) * 2654435761L.toInt()) xor ((j + 7) * 40503)).toLong() and 0xFFFFFFFFL

    /**
     * Multiple choice for the first 40 cards. A card's own wrong answers are used when it has them; otherwise three
     * other answers are picked, the same three every time (so a saved mistake still points at the same question).
     */
    fun quizFor(cards: List<StudyCard>): List<QuizQuestion> {
        val backs = cards.map { it.a }.distinct()
        return cards.take(40).mapIndexedNotNull { i, c ->
            val wrong = c.wrong?.take(3)
                ?: backs.filter { it != c.a }.mapIndexed { j, b -> mix(i, j) to b }.sortedBy { it.first }.take(3).map { it.second }
            if (wrong.size >= 3) QuizQuestion(c.q, listOf(c.a) + wrong, 0, c.why) else null
        }
    }

    /** The Path: levels of about six cards. A short last level joins the one before it. */
    fun <T> levels(cards: List<T>): List<List<T>> {
        val out = cards.chunked(6).toMutableList()
        if (out.size > 1 && out.last().size < 4) {
            val last = out.removeAt(out.lastIndex)
            out[out.lastIndex] = out.last() + last
        }
        return out
    }
}
