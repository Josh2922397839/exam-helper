package app.zing.core.ai

import app.zing.core.search.Hit
import app.zing.core.search.Search

/** A piece of a student's note sent to the AI. [ref] is a throwaway label (s1, s2…), never a real ID or a name. */
data class Source(val ref: String, val noteKey: String, val title: String, val notebook: String, val text: String)

data class Citation(val ref: String, val quote: String)

/** What the AI service returned, before it is trusted. */
data class RawAnswer(val answer: String, val citations: List<Citation>, val found: Boolean)

data class CitedSource(val source: Source, val quote: String)

sealed interface AssistantAnswer {
    /** An answer where every citation really quotes the student's notes. [fromAi] is false for the offline fallback. */
    data class Grounded(val text: String, val sources: List<CitedSource>, val fromAi: Boolean) : AssistantAnswer
    /** Nothing in the selected notes is about this. The app says so rather than making something up. */
    data object NotInNotes : AssistantAnswer
    /** The question reads like someone who may be in distress: show support, not a study answer. */
    data object NeedsSupport : AssistantAnswer
}

/**
 * Keeps AI answers honest. The assistant may only say what the student's own selected notes say:
 *  1. only study text is sent (emails and phone numbers are removed; no names, school or account data are added);
 *  2. the notes are wrapped as data, and anything in them that looks like an instruction is still just data;
 *  3. every citation must quote its note word for word, or it is thrown away;
 *  4. an answer with no surviving citation, or that mostly uses words the notes don't contain, is not shown.
 */
object Grounding {
    const val MAX_SOURCES = 8
    const val MAX_SOURCE_CHARS = 2_400
    const val MAX_TOTAL_CHARS = 12_000
    const val MAX_QUESTION = 200
    private const val MIN_QUOTE = 12

    private val EMAIL = Regex("[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}")
    private val PHONE = Regex("(?<![\\w.])\\+?\\d[\\d\\s().-]{7,}\\d(?![\\w.])")
    private val WRAPPER_TAGS = Regex("</?\\s*(material|source|sources|system|assistant|user|instructions?)\\b[^>]*>", RegexOption.IGNORE_CASE)
    private val CONTROL = Regex("[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f\\u200b-\\u200f\\u202a-\\u202e\\u2066-\\u2069]")

    /** Removes contact details from study text before it leaves the device. */
    fun redact(text: String): String = PHONE.replace(EMAIL.replace(text, "[email]")) { m ->
        // years, page numbers and measurements are study content; long digit runs with separators are phone numbers
        if (m.value.count(Char::isDigit) >= 9 || m.value.startsWith("+")) "[number]" else m.value
    }

    /** Text that can't break out of the wrapper the server puts around the notes, and has no hidden characters. */
    fun neutralise(text: String): String = WRAPPER_TAGS.replace(CONTROL.replace(text, " "), " ")

    /**
     * The passages to send: the student's selection, cleaned, labelled s1…sN and trimmed to fixed limits.
     * Only the note's title, its notebook's name and the passage go; nothing about the student.
     */
    fun sources(selected: List<Pair<Hit, String>>): List<Source> {
        var total = 0
        val out = ArrayList<Source>()
        for ((hit, passage) in selected) {
            if (out.size >= MAX_SOURCES) break
            val text = neutralise(redact(passage)).trim().take(MAX_SOURCE_CHARS)
            if (text.length < 20 || total + text.length > MAX_TOTAL_CHARS) continue
            total += text.length
            out += Source("s${out.size + 1}", hit.doc.key, neutralise(redact(hit.doc.title)).take(80), neutralise(hit.doc.notebookName).take(60), text)
        }
        return out
    }

    fun question(raw: String): String = neutralise(redact(raw)).trim().take(MAX_QUESTION)

    private val SELF_HARM = Regex(
        "\\b(kill myself|killing myself|end my life|want to die|wanna die|suicid\\w*|hurt myself|harm myself|self[- ]harm\\w*|cut myself)\\b",
        RegexOption.IGNORE_CASE,
    )

    /** First-person distress, not a study topic ("suicide in Romeo and Juliet" in someone's notes is still searchable). */
    fun needsSupport(question: String): Boolean = SELF_HARM.containsMatchIn(question) &&
        Regex("\\b(i|i'm|im|me|my|myself)\\b", RegexOption.IGNORE_CASE).containsMatchIn(question)

    private fun squash(s: String): String = Search.fold(s).replace(Regex("[\\u2018\\u2019\\u201c\\u201d\"'`]"), "").replace(Regex("\\s+"), " ").trim()

    /** Does [quote] appear in [text], ignoring case, accents, quote marks and spacing? */
    fun quotes(text: String, quote: String): Boolean {
        val q = squash(quote).trim('.', ',', ';', ':', '…', ' ')
        return q.length >= MIN_QUOTE && squash(text).contains(q)
    }

    /** How much of the answer's wording comes from the cited notes (0 to 1). */
    fun support(answer: String, cited: List<Source>): Double {
        val words = Search.tokens(answer).filter { it.length >= 4 }.map(Search::stem)
        if (words.isEmpty()) return 0.0
        val known = cited.flatMap { Search.tokens(it.text + " " + it.title) }.map(Search::stem).toSet()
        return words.count { it in known }.toDouble() / words.size
    }

    /** Checks what the AI service sent back against the passages that were sent to it. */
    fun verify(raw: RawAnswer, sent: List<Source>, minSupport: Double = 0.6): AssistantAnswer {
        if (!raw.found || raw.answer.isBlank()) return AssistantAnswer.NotInNotes
        val byRef = sent.associateBy { it.ref }
        val good = raw.citations.mapNotNull { c -> byRef[c.ref]?.takeIf { quotes(it.text, c.quote) }?.let { CitedSource(it, c.quote.trim()) } }
            .distinctBy { it.source.ref + "|" + squash(it.quote) }
        if (good.isEmpty()) return AssistantAnswer.NotInNotes
        val cited = good.map { it.source }.distinctBy { it.ref }
        if (support(raw.answer, cited) < minSupport) return AssistantAnswer.NotInNotes
        return AssistantAnswer.Grounded(neutralise(raw.answer).trim().take(1_200), good, fromAi = true)
    }

    /**
     * No AI available: answer with the notes themselves. The "answer" is the best passages, quoted as they are, so it
     * can never say something the notes don't.
     */
    fun extractive(hits: List<Hit>, max: Int = 3): AssistantAnswer {
        val picked = hits.filter { it.passages.isNotEmpty() }.take(max)
        if (picked.isEmpty()) return AssistantAnswer.NotInNotes
        val sources = picked.mapIndexed { i, h ->
            val passage = h.passages.first().text
            CitedSource(Source("s${i + 1}", h.doc.key, h.doc.title, h.doc.notebookName, passage), passage)
        }
        return AssistantAnswer.Grounded(sources.joinToString("\n\n") { it.quote }, sources, fromAi = false)
    }
}
