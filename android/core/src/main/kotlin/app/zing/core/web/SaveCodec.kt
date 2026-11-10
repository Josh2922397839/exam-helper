package app.zing.core.web

import app.zing.core.model.Card
import app.zing.core.model.Deck
import app.zing.core.model.Limits
import app.zing.core.model.Note
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.put

/**
 * Reads and writes the cloud save exactly as the website does: { v: 1, at, state, sets }.
 * `sets` is the deck list; `state` is the progress object (see [Progress]).
 */
object SaveCodec {
    fun str(e: JsonElement?): String? = (e as? JsonPrimitive)?.takeIf { it.isString }?.content

    /** JavaScript's `+x || 0` for the values the website stores as numbers. */
    fun num(e: JsonElement?): Double {
        val p = e as? JsonPrimitive ?: return 0.0
        if (p is JsonNull) return 0.0
        return p.doubleOrNull ?: p.booleanOrNull?.let { if (it) 1.0 else 0.0 } ?: 0.0
    }

    fun long(e: JsonElement?): Long = num(e).let { if (it.isFinite()) it.toLong() else 0L }

    fun cardFromJson(e: JsonElement?): Card? {
        val arr = e as? JsonArray ?: return null
        val q = str(arr.getOrNull(0)) ?: return null
        val a = str(arr.getOrNull(1)) ?: return null
        val wrong = (arr.getOrNull(2) as? JsonArray)?.mapNotNull { str(it) }
        return Clean.card(q, a, wrong, str(arr.getOrNull(3)))
    }

    /** [q, a] or [q, a, [3 wrong answers], why] (a "why" without choices is kept as [q, a, [], why]). */
    fun cardToJson(c: Card): JsonArray = buildJsonArray {
        add(JsonPrimitive(c.q)); add(JsonPrimitive(c.a))
        if (c.hasChoices || c.why.isNotEmpty()) {
            add(JsonArray((if (c.hasChoices) c.wrong.take(3) else emptyList()).map { JsonPrimitive(it) }))
            add(JsonPrimitive(c.why))
        }
    }

    private fun noteFromJson(e: JsonElement?, now: Long): Note? {
        val o = e as? JsonObject ?: return null
        val id = str(o["id"]) ?: return null
        val cut = o["cut"]?.let { it !is JsonNull && (num(it) != 0.0 || (it as? JsonPrimitive)?.booleanOrNull == true) } ?: false
        return Clean.note(Note(id, str(o["t"]).orEmpty(), str(o["x"]).orEmpty(), str(o["k"]) ?: "note", long(o["at"]), str(o["src"]), cut), now)
    }

    private fun noteToJson(n: Note, withText: Boolean): JsonObject = buildJsonObject {
        put("id", n.id); put("t", n.title); put("x", if (withText) n.text else ""); put("k", n.kind); put("at", n.at)
        n.src?.let { put("src", it) }
        if (!withText || n.cut) put("cut", 1)
    }

    /** The decks in a save, validated the way the website's mergeIn() validates them. Bad entries are skipped. */
    fun decksFromJson(e: JsonElement?, now: Long): List<Deck> {
        val arr = e as? JsonArray ?: return emptyList()
        val seen = HashSet<String>()
        return arr.mapNotNull { item ->
            val o = item as? JsonObject ?: return@mapNotNull null
            val id = str(o["id"]) ?: return@mapNotNull null
            val cards = o["cards"] as? JsonArray ?: return@mapNotNull null
            if (!Clean.DECK_ID.matches(id) || !seen.add(id)) return@mapNotNull null
            val updated = long(o["updated"])
            Clean.deck(
                Deck(
                    id = id, name = str(o["name"]).orEmpty(), color = str(o["color"]).orEmpty(),
                    cards = cards.mapNotNull { cardFromJson(it) },
                    updated = updated, created = long(o["created"]).takeIf { it > 0 } ?: updated,
                    parent = str(o["parent"]),
                    notes = (o["notes"] as? JsonArray)?.mapNotNull { noteFromJson(it, now) }.orEmpty(),
                    from = str(o["from"]),
                ),
                now,
            )
        }
    }

    /**
     * The decks as they go into the cloud save: newest deck first, and at most [Limits.BACKUP_NOTE_BUDGET]
     * characters of note text in total (newest notes first). Notes that don't fit keep their title and are marked
     * `cut`, the same trimming the website's backup() does.
     */
    fun decksToJson(decks: List<Deck>): JsonArray {
        var budget = Limits.BACKUP_NOTE_BUDGET
        return JsonArray(decks.sortedByDescending { it.updated }.map { d ->
            buildJsonObject {
                put("id", d.id); put("name", d.name); put("color", d.color)
                put("cards", JsonArray(d.cards.map { cardToJson(it) }))
                put("updated", d.updated); put("created", d.created)
                d.parent?.let { put("parent", it) }
                if (d.notes.isNotEmpty()) {
                    put("notes", JsonArray(d.notes.sortedByDescending { it.at }.map { n ->
                        // a note that is already cut has no text to send: it stays cut
                        val fits = !n.cut && n.text.length <= budget
                        if (fits) budget -= n.text.length
                        noteToJson(n, fits)
                    }))
                }
                d.from?.let { put("from", it) }
            }
        })
    }

    /** Notes whose text would not fit in the cloud save right now (so the app can say "only on this device"). */
    fun notesOverBudget(decks: List<Deck>): Set<Pair<String, String>> {
        var budget = Limits.BACKUP_NOTE_BUDGET
        val out = HashSet<Pair<String, String>>()
        decks.sortedByDescending { it.updated }.forEach { d ->
            d.notes.sortedByDescending { it.at }.forEach { n ->
                if (!n.cut && n.text.length <= budget) budget -= n.text.length else out += d.id to n.id
            }
        }
        return out
    }

    fun save(state: JsonObject, decks: List<Deck>, now: Long): JsonObject = buildJsonObject {
        put("v", 1); put("at", now); put("state", state); put("sets", decksToJson(decks))
    }
}
