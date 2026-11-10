package app.zing.core.web

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sqrt

data class QuizStat(val best: Int = 0, val last: Int = 0, val attempts: Int = 0)

data class Level(val level: Int, val from: Int, val to: Int, val percent: Int)

/** What changed when XP was added, so the app can celebrate a daily goal or a new streak freeze. */
data class XpResult(val state: Progress, val added: Int, val before: Int, val today: Int, val goalReached: Boolean, val freezeEarned: Boolean)

/**
 * A student's study progress: the website's `ef2:state` object, with the same rules (assets/js/core/ui.js).
 * It is immutable; every change returns a new copy. Anything in the saved object this class doesn't know about is
 * kept in [extra] and written back untouched, so a newer website never loses data by passing through Android.
 */
data class Progress(
    val visited: Map<String, List<String>> = emptyMap(),
    val quiz: Map<String, QuizStat> = emptyMap(),
    /** Leitner box (0 to 5) per deck, per card question. */
    val cards: Map<String, Map<String, Int>> = emptyMap(),
    /** When each card was last reviewed (epoch milliseconds). */
    val seen: Map<String, Map<String, Long>> = emptyMap(),
    val mistakes: List<String> = emptyList(),
    val days: List<String> = emptyList(),
    val last: JsonElement? = null,
    val answered: Int = 0,
    val correct: Int = 0,
    val xp: Int = 0,
    val xpDays: Map<String, Int> = emptyMap(),
    val match: Map<String, Long> = emptyMap(),
    val freezes: Int = 0,
    val frozen: List<String> = emptyList(),
    val goalHits: Int = 0,
    val extra: Map<String, JsonElement> = emptyMap(),
) {
    fun streak(today: LocalDate): Int {
        val set = (days + frozen).toSet()
        var d = today
        if (dayKey(d) !in set) d = d.minusDays(1) // still alive if you studied yesterday
        var n = 0
        while (dayKey(d) in set) { n++; d = d.minusDays(1) }
        return n
    }

    fun xpToday(today: LocalDate): Int = xpDays[dayKey(today)] ?: 0

    /** Marks today as studied. Streak freezes quietly cover the days missed, if there are enough of them. */
    fun touchDay(today: LocalDate): Progress {
        val t = dayKey(today)
        if (t in days) return this
        var freezesLeft = freezes
        var frozenDays = frozen
        val lastDay = (days + frozen).maxOrNull()
        if (lastDay != null && freezesLeft > 0) {
            val missed = (ChronoUnit.DAYS.between(parseDay(lastDay), today) - 1).toInt()
            if (missed in 1..freezesLeft) {
                frozenDays = (frozenDays + (1..missed).map { dayKey(parseDay(lastDay).plusDays(it.toLong())) }).takeLast(30)
                freezesLeft -= missed
            }
        }
        return copy(days = (days + t).takeLast(120), freezes = freezesLeft, frozen = frozenDays)
    }

    /** [boost] is 2 while a Double XP power-up is on. Every third day the goal is reached earns a freeze (hold two). */
    fun addXp(n: Int, today: LocalDate, goal: Int, boost: Int = 1): XpResult {
        if (n <= 0) return XpResult(this, 0, xpToday(today), xpToday(today), goalReached = false, freezeEarned = false)
        val amount = n * max(1, boost)
        val t = dayKey(today)
        val before = xpDays[t] ?: 0
        var newDays = xpDays + (t to before + amount)
        if (newDays.size > 90) newDays = newDays.toSortedMap().entries.toList().takeLast(90).associate { it.key to it.value }
        val reached = before < goal && before + amount >= goal
        val hits = goalHits + if (reached) 1 else 0
        val earned = reached && hits % 3 == 0 && freezes < 2
        return XpResult(
            copy(xp = xp + amount, xpDays = newDays, goalHits = hits, freezes = freezes + if (earned) 1 else 0),
            amount, before, before + amount, reached, earned,
        )
    }

    fun addFreeze(): Progress? = if (freezes >= 2) null else copy(freezes = freezes + 1)

    fun box(deck: String, card: String): Int = cards[deck]?.get(card) ?: 0

    fun setBox(deck: String, card: String, box: Int, now: Long): Progress = copy(
        cards = cards + (deck to (cards[deck].orEmpty() + (card to box.coerceIn(0, 5)))),
        seen = seen + (deck to (seen[deck].orEmpty() + (card to now))),
    )

    /** Cards due today: in a box, and last seen at least that box's number of days ago (an hour of slack). */
    fun due(deck: String, questions: List<String>, now: Long): List<String> {
        val boxes = cards[deck].orEmpty()
        val last = seen[deck].orEmpty()
        return questions.filter { q ->
            val b = boxes[q] ?: 0
            b > 0 && now - (last[q] ?: 0L) >= DUE_DAYS[b.coerceIn(0, 5)] * DAY_MS - HOUR_MS
        }
    }

    fun mastered(deck: String, questions: List<String>): Int {
        val boxes = cards[deck].orEmpty()
        return questions.count { (boxes[it] ?: 0) >= 3 }
    }

    /** One quiz answer. A wrong answer is remembered for "Fix my mistakes"; getting it right later clears it. */
    fun answer(key: String, ok: Boolean): Progress = copy(
        answered = answered + 1,
        correct = correct + if (ok) 1 else 0,
        mistakes = if (ok) mistakes - key else if (key in mistakes) mistakes else mistakes + key,
    )

    fun recordQuiz(id: String, percent: Int): Progress {
        val q = quiz[id] ?: QuizStat()
        return copy(quiz = quiz + (id to QuizStat(max(q.best, percent), percent, q.attempts + 1)))
    }

    fun markVisited(subject: String, topic: String): Progress {
        val list = visited[subject].orEmpty()
        return if (topic in list) this else copy(visited = visited + (subject to list + topic))
    }

    /**
     * Combines a cloud backup with this device, keeping the best of both so progress is never lost.
     * These are the website's own rules (store.merge), so both apps reach the same answer.
     */
    fun mergeWith(r: Progress): Progress {
        val mergedQuiz = quiz.toMutableMap()
        r.quiz.forEach { (id, q) ->
            val a = mergedQuiz[id] ?: QuizStat()
            mergedQuiz[id] = QuizStat(max(a.best, q.best), if (a.attempts >= q.attempts) a.last else q.last, max(a.attempts, q.attempts))
        }
        val lastAt = { e: JsonElement? -> SaveCodec.long((e as? JsonObject)?.get("at")) }
        return copy(
            xp = max(xp, r.xp),
            xpDays = (xpDays.keys + r.xpDays.keys).associateWith { max(xpDays[it] ?: 0, r.xpDays[it] ?: 0) },
            days = (days + r.days).distinct().sorted().takeLast(120),
            visited = (visited.keys + r.visited.keys).associateWith { (visited[it].orEmpty() + r.visited[it].orEmpty()).distinct() },
            quiz = mergedQuiz,
            cards = (cards.keys + r.cards.keys).associateWith { s ->
                val a = cards[s].orEmpty(); val b = r.cards[s].orEmpty()
                (a.keys + b.keys).associateWith { max(a[it] ?: 0, min(5, b[it] ?: 0)) }
            },
            seen = (seen.keys + r.seen.keys).associateWith { s ->
                val a = seen[s].orEmpty(); val b = r.seen[s].orEmpty()
                (a.keys + b.keys).associateWith { max(a[it] ?: 0L, b[it] ?: 0L) }
            },
            match = (match.keys + r.match.keys).associateWith { s ->
                val a = match[s] ?: 0L; val b = r.match[s] ?: 0L
                if (b > 0 && (a == 0L || b < a)) b else a
            }.filterValues { it > 0 },
            mistakes = (mistakes + r.mistakes).distinct(),
            answered = max(answered, r.answered),
            correct = max(correct, r.correct),
            last = if (r.last is JsonObject && (last !is JsonObject || lastAt(r.last) > lastAt(last))) r.last else last,
            extra = r.extra + extra,
        )
    }

    fun toJson(): JsonObject = buildJsonObject {
        extra.forEach { (k, v) -> put(k, v) }
        put("visited", JsonObject(visited.mapValues { (_, v) -> JsonArray(v.map(::JsonPrimitive)) }))
        put("quiz", JsonObject(quiz.mapValues { (_, q) -> buildJsonObject { put("best", q.best); put("last", q.last); put("attempts", q.attempts) } }))
        put("cards", JsonObject(cards.mapValues { (_, m) -> JsonObject(m.mapValues { JsonPrimitive(it.value) }) }))
        put("seen", JsonObject(seen.mapValues { (_, m) -> JsonObject(m.mapValues { JsonPrimitive(it.value) }) }))
        put("mistakes", JsonArray(mistakes.map(::JsonPrimitive)))
        put("days", JsonArray(days.map(::JsonPrimitive)))
        put("last", last ?: kotlinx.serialization.json.JsonNull)
        put("answered", answered); put("correct", correct); put("xp", xp)
        put("xpDays", JsonObject(xpDays.mapValues { JsonPrimitive(it.value) }))
        put("match", JsonObject(match.mapValues { JsonPrimitive(it.value) }))
        put("freezes", freezes)
        put("frozen", JsonArray(frozen.map(::JsonPrimitive)))
        put("goalHits", goalHits)
    }

    companion object {
        private val KNOWN = setOf("visited", "quiz", "cards", "seen", "mistakes", "days", "last", "answered", "correct", "xp", "xpDays", "match", "freezes", "frozen", "goalHits")
        private val DAY = Regex("^\\d{4}-\\d{2}-\\d{2}$")
        /** After a card reaches box n it is due again after this many days. */
        val DUE_DAYS = longArrayOf(0, 0, 1, 3, 7, 16)
        const val DAY_MS = 86_400_000L
        const val HOUR_MS = 3_600_000L

        fun dayKey(d: LocalDate): String = "%04d-%02d-%02d".format(d.year, d.monthValue, d.dayOfMonth)
        fun parseDay(k: String): LocalDate = LocalDate.parse(k)

        fun level(xp: Int): Level {
            val x = max(0, xp)
            val lvl = floor(sqrt(x / 40.0)).toInt() + 1
            val from = 40 * (lvl - 1) * (lvl - 1)
            val to = 40 * lvl * lvl
            return Level(lvl, from, to, (((x - from).toDouble() / (to - from)) * 100).roundToInt())
        }

        /** Reads a saved state leniently: wrong types are treated as empty, never as an error. */
        fun fromJson(e: JsonElement?): Progress {
            val o = e as? JsonObject ?: return Progress()
            fun obj(k: String) = (o[k] as? JsonObject).orEmpty()
            fun strings(v: JsonElement?) = (v as? JsonArray)?.mapNotNull { SaveCodec.str(it) }.orEmpty()
            val int = { v: JsonElement? -> SaveCodec.num(v).let { if (it.isFinite()) it.toInt() else 0 } }
            return Progress(
                visited = obj("visited").mapValues { strings(it.value) },
                quiz = obj("quiz").mapValues { (_, v) -> (v as? JsonObject).let { q -> QuizStat(int(q?.get("best")), int(q?.get("last")), int(q?.get("attempts"))) } },
                cards = obj("cards").mapValues { (_, v) -> (v as? JsonObject).orEmpty().mapValues { int(it.value).coerceIn(0, 5) } },
                seen = obj("seen").mapValues { (_, v) -> (v as? JsonObject).orEmpty().mapValues { SaveCodec.long(it.value) } },
                mistakes = strings(o["mistakes"]),
                days = strings(o["days"]).filter { DAY.matches(it) },
                last = o["last"] as? JsonObject,
                answered = max(0, int(o["answered"])),
                correct = max(0, int(o["correct"])),
                xp = max(0, int(o["xp"])),
                xpDays = obj("xpDays").filterKeys { DAY.matches(it) }.mapValues { max(0, int(it.value)) },
                match = obj("match").mapValues { SaveCodec.long(it.value) }.filterValues { it > 0 },
                freezes = int(o["freezes"]).coerceIn(0, 2),
                frozen = strings(o["frozen"]).filter { DAY.matches(it) },
                goalHits = max(0, int(o["goalHits"])),
                extra = o.filterKeys { it !in KNOWN },
            )
        }
    }
}
