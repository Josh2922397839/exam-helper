package app.zing.core.search

import java.text.Normalizer
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.min

/** One note as the search index sees it. */
data class SearchDoc(
    val deckId: String,
    val noteId: String,
    val title: String,
    val text: String,
    val kind: String,
    val at: Long,
    /** The top-level deck this note lives in (its notebook) and the names to show as its source. */
    val notebookId: String,
    val notebookName: String,
    val deckName: String,
    val pinned: Boolean = false,
    val archived: Boolean = false,
    val topic: String = "",
    val subject: String = "",
) {
    val key: String get() = "$deckId/$noteId"
}

data class Query(val raw: String, val terms: List<String>, val phrase: String) {
    val isEmpty: Boolean get() = terms.isEmpty()
}

/** A piece of a note with the matching words marked ([highlights] are ranges inside [text]). */
data class Passage(val text: String, val highlights: List<IntRange>, val start: Int)

data class Hit(val doc: SearchDoc, val score: Double, val passages: List<Passage>, val titleHighlights: List<IntRange>, val matched: Set<String>)

data class NotebookGroup(val notebookId: String, val notebookName: String, val hits: List<Hit>) {
    val best: Double get() = hits.maxOfOrNull { it.score } ?: 0.0
}

enum class SortBy { BEST_MATCH, NEWEST, TITLE }

data class Filters(
    val notebookId: String? = null,
    val kinds: Set<String> = emptySet(),
    val pinnedOnly: Boolean = false,
    val since: Long? = null,
    val includeArchived: Boolean = false,
    val sort: SortBy = SortBy.BEST_MATCH,
)

/**
 * Topic search over a student's own notes. SQLite's full-text index finds candidates quickly; this class decides
 * what is actually relevant, picks the passages to show and marks the matching words. Pure Kotlin so the ranking is
 * unit-tested.
 */
object Search {
    private val STOP = setOf(
        "a", "an", "and", "are", "as", "at", "be", "by", "can", "do", "does", "for", "from", "how", "i", "in", "is", "it", "me", "my",
        "of", "on", "or", "tell", "that", "the", "this", "to", "was", "what", "when", "where", "which", "who", "why", "with", "about", "notes", "note",
    )
    const val MAX_TERMS = 8
    const val MAX_QUERY = 200

    /** Lower-case and without accents, one character in for one character out, so positions still line up. */
    fun fold(c: Char): Char {
        val lower = c.lowercaseChar()
        if (lower.code < 128) return lower
        val base = Normalizer.normalize(lower.toString(), Normalizer.Form.NFD)
        return if (base.isNotEmpty() && base[0].isLetterOrDigit()) base[0] else lower
    }

    fun fold(s: String): String = buildString(s.length) { s.forEach { append(fold(it)) } }

    private fun wordSpans(folded: String): List<IntRange> {
        val out = ArrayList<IntRange>()
        var start = -1
        for (i in folded.indices) {
            if (folded[i].isLetterOrDigit()) { if (start < 0) start = i } else if (start >= 0) { out += start until i; start = -1 }
        }
        if (start >= 0) out += start until folded.length
        return out
    }

    fun tokens(s: String): List<String> = fold(s).let { f -> wordSpans(f).map { f.substring(it.first, it.last + 1) } }

    /** Turns what a student typed into search terms. Small filler words are dropped unless that leaves nothing. */
    fun parse(raw: String?): Query {
        val text = raw.orEmpty().trim().take(MAX_QUERY)
        val all = tokens(text).filter { it.length >= 2 || it.all(Char::isDigit) }.distinct()
        val useful = all.filter { it !in STOP }
        val terms = (useful.ifEmpty { all }).take(MAX_TERMS)
        return Query(text, terms, tokens(text).joinToString(" "))
    }

    /**
     * The MATCH expression for SQLite FTS: each term as a prefix, joined with OR. Terms are letters and digits only
     * (see [tokens]), so nothing a student types can change the meaning of the expression.
     */
    fun ftsExpression(q: Query): String = q.terms.joinToString(" OR ") { "$it*" }

    private fun matches(token: String, term: String): Boolean = token.startsWith(term) || (term.length >= 5 && stem(token) == stem(term))

    /** A very light stemmer so "cells" finds "cell" and "dividing" finds "divide". */
    fun stem(w: String): String = when {
        w.length > 5 && w.endsWith("ing") -> w.dropLast(3)
        w.length > 4 && w.endsWith("ies") -> w.dropLast(3) + "y"
        w.length > 4 && w.endsWith("es") -> w.dropLast(2)
        w.length > 3 && w.endsWith("s") && !w.endsWith("ss") -> w.dropLast(1)
        w.length > 4 && w.endsWith("ed") -> w.dropLast(2)
        else -> w
    }.let { if (it.length > 4 && it.endsWith("e")) it.dropLast(1) else it }

    private fun highlightsIn(original: String, terms: List<String>): List<IntRange> {
        val f = fold(original)
        return wordSpans(f).filter { span -> val tok = f.substring(span.first, span.last + 1); terms.any { matches(tok, it) } }
    }

    /** Scores one note for a query, or null when none of the words appear in it. */
    fun score(doc: SearchDoc, q: Query, now: Long): Hit? {
        if (q.isEmpty) return null
        val titleTokens = tokens(doc.title)
        val tagTokens = tokens(doc.topic + " " + doc.subject)
        val foldedText = fold(doc.text)
        val spans = wordSpans(foldedText)
        val textTokens = spans.map { foldedText.substring(it.first, it.last + 1) }

        val matched = LinkedHashSet<String>()
        var score = 0.0
        val positions = HashMap<String, MutableList<Int>>()
        for (term in q.terms) {
            val inTitle = titleTokens.count { matches(it, term) }
            val inTags = tagTokens.count { matches(it, term) }
            var tf = 0
            textTokens.forEachIndexed { i, tok -> if (matches(tok, term)) { tf++; positions.getOrPut(term) { ArrayList() }.add(i) } }
            if (inTitle + inTags + tf == 0) continue
            matched += term
            // rarer, longer words say more about the topic than short common ones
            val weight = 1.0 + min(term.length, 10) / 10.0
            score += weight * (3.0 * min(inTitle, 2) + 2.0 * min(inTags, 1) + 2.2 * tf / (tf + 1.2))
        }
        if (matched.isEmpty()) return null

        val coverage = matched.size.toDouble() / q.terms.size
        score *= 0.35 + 0.65 * coverage * coverage                      // all the words beat some of the words
        if (q.terms.size > 1 && q.phrase.length > 3) {
            if (fold(doc.title).contains(q.phrase)) score += 6.0        // the exact words, in order
            if (tokens(doc.text).joinToString(" ").contains(q.phrase)) score += 4.0
        }
        if (matched.size > 1 && positions.size > 1) {                   // words close together
            val window = smallestWindow(positions.values.toList())
            if (window in 1..12) score += 2.5 * (1.0 - (window - 1) / 12.0)
        }
        if (tokens(doc.title) == q.terms) score += 5.0                  // the note is about exactly this
        if (doc.pinned) score *= 1.15
        val ageDays = max(0.0, (now - doc.at) / 86_400_000.0)
        score *= 1.0 + 0.12 / (1.0 + ln(1.0 + ageDays / 30.0))          // newer notes win ties
        score /= 1.0 + ln(1.0 + textTokens.size / 400.0) * 0.15         // a long note isn't better just for being long

        return Hit(doc, score, passages(doc.text, q.terms), highlightsIn(doc.title, q.terms), matched)
    }

    private fun smallestWindow(lists: List<List<Int>>): Int {
        val all = lists.flatMapIndexed { i, l -> l.map { it to i } }.sortedBy { it.first }
        val need = lists.size
        val count = IntArray(need)
        var have = 0
        var best = Int.MAX_VALUE
        var left = 0
        for (right in all.indices) {
            if (count[all[right].second]++ == 0) have++
            while (have == need) {
                best = min(best, all[right].first - all[left].first + 1)
                if (--count[all[left].second] == 0) have--
                left++
            }
        }
        return best
    }

    /**
     * The best pieces of a note to show: the lines or sentences where the most search words appear, at most
     * [maxPassages], each trimmed to about [maxLength] characters around the matches.
     */
    fun passages(text: String, terms: List<String>, maxPassages: Int = 2, maxLength: Int = 220): List<Passage> {
        if (text.isBlank()) return emptyList()
        val folded = fold(text)
        // split on blank-ish boundaries: line breaks, or sentence ends followed by a space
        val bounds = ArrayList<IntRange>()
        var start = 0
        for (i in text.indices) {
            val end = text[i] == '\n' || ((text[i] == '.' || text[i] == '!' || text[i] == '?') && text.getOrNull(i + 1)?.isWhitespace() == true)
            if (end) { if (i + 1 > start) bounds += start..i; start = i + 1 }
        }
        if (start < text.length) bounds += start until text.length

        data class Scored(val range: IntRange, val distinct: Int, val total: Int)
        val scored = bounds.mapNotNull { r ->
            val part = folded.substring(r.first, r.last + 1)
            val toks = wordSpans(part).map { part.substring(it.first, it.last + 1) }
            val distinct = terms.count { t -> toks.any { matches(it, t) } }
            if (distinct == 0) null else Scored(r, distinct, toks.count { tok -> terms.any { matches(tok, it) } })
        }
        val chosen = scored.sortedWith(compareByDescending<Scored> { it.distinct }.thenByDescending { it.total }.thenBy { it.range.first })
            .take(maxPassages).sortedBy { it.range.first }

        return chosen.map { s ->
            var from = s.range.first
            var to = s.range.last + 1
            while (from < to && text[from].isWhitespace()) from++
            while (to > from && text[to - 1].isWhitespace()) to--
            var prefix = ""
            var suffix = ""
            if (to - from > maxLength) {
                // keep the window around the first match
                val first = highlightsIn(text.substring(from, to), terms).firstOrNull()?.first ?: 0
                val windowStart = max(from, from + first - maxLength / 3)
                val windowEnd = min(to, windowStart + maxLength)
                var a = windowStart
                var b = windowEnd
                if (a > from) { while (a < b && !text[a].isWhitespace()) a++; while (a < b && text[a].isWhitespace()) a++; prefix = "… " }
                if (b < to) { while (b > a && !text[b - 1].isWhitespace()) b--; while (b > a && text[b - 1].isWhitespace()) b--; suffix = " …" }
                if (b > a) { from = a; to = b }
            }
            val body = text.substring(from, to).replace('\n', ' ').replace('\t', ' ')
            val shown = prefix + body + suffix
            Passage(shown, highlightsIn(body, terms).map { (it.first + prefix.length)..(it.last + prefix.length) }, from)
        }
    }

    /** Ranks, filters and sorts candidates. Candidates normally come from the full-text index. */
    fun run(candidates: List<SearchDoc>, q: Query, filters: Filters, now: Long, limit: Int = 60): List<Hit> {
        val hits = candidates.asSequence()
            .filter { filters.includeArchived || !it.archived }
            .filter { filters.notebookId == null || it.notebookId == filters.notebookId || it.deckId == filters.notebookId }
            .filter { filters.kinds.isEmpty() || it.kind in filters.kinds }
            .filter { !filters.pinnedOnly || it.pinned }
            .filter { filters.since == null || it.at >= filters.since }
            .mapNotNull { score(it, q, now) }
            .toList()
        val byKey = compareBy<Hit> { it.doc.key }
        val sorted = when (filters.sort) {
            SortBy.BEST_MATCH -> hits.sortedWith(compareByDescending<Hit> { it.score }.thenByDescending { it.doc.at }.then(byKey))
            SortBy.NEWEST -> hits.sortedWith(compareByDescending<Hit> { it.doc.at }.thenByDescending { it.score }.then(byKey))
            SortBy.TITLE -> hits.sortedWith(compareBy<Hit> { fold(it.doc.title) }.thenByDescending { it.score }.then(byKey))
        }
        return sorted.take(limit)
    }

    /** Results grouped by notebook, the notebook with the best match first. Order inside a group is kept. */
    fun group(hits: List<Hit>): List<NotebookGroup> {
        val order = LinkedHashMap<String, MutableList<Hit>>()
        hits.forEach { order.getOrPut(it.doc.notebookId) { ArrayList() }.add(it) }
        val firstSeen = order.keys.withIndex().associate { it.value to it.index }
        return order.map { (id, list) -> NotebookGroup(id, list.first().doc.notebookName, list) }
            .sortedWith(compareByDescending<NotebookGroup> { it.best }.thenBy { firstSeen[it.notebookId] })
    }
}
