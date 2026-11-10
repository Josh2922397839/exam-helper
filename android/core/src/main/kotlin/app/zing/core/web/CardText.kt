package app.zing.core.web

import app.zing.core.model.Card
import app.zing.core.model.Limits

/**
 * Cards without AI: the website's "quick cards" (assets/js/core/magic.js and learn.js), ported rule for rule.
 * Used when a student pastes structured notes, imports a Quizlet / Anki / spreadsheet export, or when Zing AI
 * isn't available (offline, guest, under 14, or the day's limit is used up).
 */
object CardText {
    private val BULLET = Regex("^\\s*(?:[-*•]|\\d+[.)])\\s+")
    private val Q_LINE = Regex("^q(?:uestion)?\\s*[:.)-]\\s*(.+)$", RegexOption.IGNORE_CASE)
    private val A_LINE = Regex("^a(?:nswer)?\\s*[:.)-]\\s*(.+)$", RegexOption.IGNORE_CASE)
    private val PAIR = Regex("^(.+?)(?:\\t+|\\s+[-–—=]\\s+|\\s*[:]\\s+)(.+)$")

    /** "term - meaning", "term: meaning", "term = meaning", tab-separated, or Q: / A: on two lines. */
    fun parse(text: String?): List<Card> {
        val lines = text.orEmpty().replace("\r", "").split('\n').map { BULLET.replaceFirst(it, "").trim() }.filter { it.isNotEmpty() }
        val out = ArrayList<Card>()
        var i = 0
        while (i < lines.size) {
            val line = lines[i]
            val q = Q_LINE.find(line)
            val a = lines.getOrNull(i + 1)?.let { A_LINE.find(it) }
            if (q != null && a != null) {
                Clean.card(q.groupValues[1], a.groupValues[1])?.let(out::add)
                i += 2
                continue
            }
            PAIR.find(line)?.let { m -> Clean.card(m.groupValues[1].trim(), m.groupValues[2].trim())?.let(out::add) }
            i++
        }
        return out
    }

    private val ANKI_HEADER = Regex("^#[a-z ]+:", RegexOption.IGNORE_CASE)
    private val TAGS = Regex("<[^>]+>")
    private val BR = Regex("<br\\s*/?>", RegexOption.IGNORE_CASE)
    private val SPACES = Regex("\\s+")

    private fun stripCell(s: String): String = SPACES.replace(
        TAGS.replace(BR.replace(s, " "), "").replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", "\""),
        " ",
    ).trim()

    /** Tab-, comma- or semicolon-separated rows with "quoted, cells" (Quizlet, Anki and spreadsheet exports). */
    fun table(text: String?): List<List<String>> {
        val t = text.orEmpty().replace("\r\n", "\n").replace('\r', '\n').removePrefix("﻿")
        val lines = t.split('\n').filter { it.isNotBlank() && !ANKI_HEADER.containsMatchIn(it) }
        if (lines.isEmpty()) return emptyList()
        val sep = when {
            lines.any { '\t' in it } -> '\t'
            lines.count { ',' in it } >= lines.size * 0.6 -> ','
            lines.count { ';' in it } >= lines.size * 0.6 -> ';'
            else -> return emptyList()
        }
        val rows = ArrayList<List<String>>()
        var row = ArrayList<String>()
        val cell = StringBuilder()
        var quoted = false
        val src = lines.joinToString("\n") + "\n"
        var i = 0
        while (i < src.length) {
            val ch = src[i]
            if (quoted) {
                if (ch == '"' && src.getOrNull(i + 1) == '"') { cell.append('"'); i++ } else if (ch == '"') quoted = false else cell.append(ch)
            } else if (ch == '"' && cell.isEmpty()) {
                quoted = true
            } else if (ch == sep) {
                row.add(cell.toString()); cell.setLength(0)
            } else if (ch == '\n') {
                row.add(cell.toString()); cell.setLength(0); rows.add(row); row = ArrayList()
            } else {
                cell.append(ch)
            }
            i++
        }
        return rows.map { r -> r.map(::stripCell) }.filter { r -> r.count { it.isNotEmpty() } >= 2 }
    }

    private val HEAD_Q = Regex("^(question|term|front|q|word)s?$", RegexOption.IGNORE_CASE)
    private val HEAD_A = Regex("^(answer|definition|back|a|meaning)s?$", RegexOption.IGNORE_CASE)

    /** Rows are: question, answer, then (optionally) three wrong answers and a "why". Falls back to [parse]. */
    fun structured(text: String?): List<Card> {
        var rows = table(text)
        if (rows.isNotEmpty() && HEAD_Q.matches(rows[0][0]) && HEAD_A.matches(rows[0].getOrElse(1) { "" })) rows = rows.drop(1)
        val cards = rows.mapNotNull { r ->
            Clean.card(r[0], r.getOrNull(1), if (r.size >= 5) r.subList(2, 5).filter { it.isNotEmpty() } else emptyList(), r.getOrNull(5))
        }
        return (cards.ifEmpty { parse(text) }).take(Limits.CARDS_PER_DECK)
    }

    /** Is this already "term - meaning" lines or a table? Then it needs no AI. */
    fun looksStructured(text: String?): Boolean {
        val lines = text.orEmpty().split('\n').count { it.isNotBlank() }
        val n = structured(text).size
        return n >= 3 && n >= lines * 0.6
    }

    private val SENTENCE_END = Regex("(?<!\\b(?:St|Mr|Mrs|Ms|Dr|Mt|No|Jr|Sr|vs|etc|e\\.g|i\\.e)\\.)(?<=[.!?])\\s+(?=[\"“(A-Z0-9])")
    private val LEADING = Regex("^[\\s•*\\-–\\d.)]+")
    private val DEFINITION = Regex("^((?:An?|The)\\s+)?([A-Za-z][\\w'’\\- ]{1,40}?)\\s+(is|are|was|were|means|refers to)\\s+(?!\\w+ed\\s)(.{3,200}?)[.!?]?$")
    private val ACTION = Regex("^((?:An?|The)\\s+)?([A-Za-z][\\w'’\\- ]{1,30}?)\\s+(controls|contains|produces|makes|releases|stores|carries|causes|absorbs|transports|protects|supports|converts|breaks down|holds|forms|allows|prevents)\\s+(.{2,160}?)[.!?]?$")
    private val KEYS = listOf(
        Regex("\\b(1[0-9]{3}|20[0-9]{2})\\b"),
        Regex("\\b(\\d+(?:[.,]\\d+)?\\s?(?:%|°C|km|kg|cm|mm|m|g|years?|days?|hours?)|\\d{2,4}(?:[.,]\\d+)?)(?=[\\s,.;)]|$)"),
        Regex("(?:^|[^.!?]\\s)((?:[A-Z][a-z’'\\-]+)(?:\\s+(?:of\\s+|the\\s+|de\\s+|and\\s+|St\\.\\s+)?[A-Z][a-z’'\\-.]+)+)"),
        Regex("\\s([A-Z]{2,6}\\d?)(?=[\\s,.;)]|$)"),
    )
    private val TRAILING = Regex("[.;,:]+$")

    /**
     * Notes written in sentences: definitions become "What is …?", simple facts become "What controls …?", and a
     * year, number, name or abbreviation becomes a fill-the-gap card. Nothing is invented: every answer is a piece
     * of the student's own text.
     */
    fun quick(text: String?): List<Card> {
        val t = text.orEmpty().replace("\r", "")
        val parsed = parse(t)
        if (parsed.size >= 3) return parsed.take(40)
        val out = ArrayList<Card>()
        val seen = HashSet<String>()
        fun add(question: String, answer: String) {
            val q = question.trim()
            val a = TRAILING.replace(answer.trim(), "")
            if (q.length < 8 || a.isEmpty() || a.length > 160 || !seen.add(q.lowercase())) return
            Clean.card(q, a)?.let(out::add)
        }
        val sentences = t.split(Regex("\\n+")).flatMap { it.split(SENTENCE_END) }
            .map { LEADING.replaceFirst(it, "").trim() }.filter { it.length in 25..260 }
        for (s in sentences) {
            if (out.size >= 25) break
            val m = DEFINITION.find(s)
            if (m != null && m.groupValues[2].split(' ').size <= 5) {
                val (article, term, verb, rest) = m.destructured
                add(if (verb == "means" || verb == "refers to") "What does “$term” mean?" else "What $verb ${article.lowercase()}$term?", rest)
                continue
            }
            val v = ACTION.find(s)
            if (v != null && v.groupValues[2].split(' ').size <= 4) {
                val (article, subject, verb, rest) = v.destructured
                add("What $verb $rest?", (article + subject).replaceFirstChar { it.uppercase() })
                continue
            }
            val key = KEYS.firstNotNullOfOrNull { it.find(s) }?.groupValues?.get(1)?.trim() ?: continue
            if (key.length >= 2 && key.length < s.length - 12) add("Fill the gap: " + s.replaceFirst(key, "_____"), key)
        }
        return (parsed + out).take(30)
    }
}
