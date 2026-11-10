package app.zing.core.sync

import app.zing.core.model.Card
import app.zing.core.model.Deck
import app.zing.core.model.Note
import java.security.MessageDigest

/**
 * A deck on this device plus what the sync needs to know about it.
 * [dirty]: changed here since the last sync. [baseUpdated]: the cloud copy's `updated` at the last sync (0 = never
 * synced). [baseCards]: a fingerprint of the cards at the last sync, to tell which side changed them.
 */
data class LocalDeck(val deck: Deck, val dirty: Boolean = false, val baseUpdated: Long = 0, val baseCards: String? = null)

/** The device's copy of a deck that lost a conflict. Kept until the student decides what to do with it. */
data class Conflict(val deckId: String, val mine: Deck, val theirs: Deck, val reason: String)

data class MergeResult(
    val decks: List<LocalDeck>,
    val conflicts: List<Conflict>,
    /** Deleted decks still worth remembering (id → when). */
    val tombstones: Map<String, Long>,
    /** True when the merged result differs from the cloud copy, so it should be uploaded. */
    val needsPush: Boolean,
)

/**
 * Merging the cloud save's decks with this device's decks.
 *
 * The website's rule is "newer `updated` wins, per deck". This keeps that rule and adds what it lacks:
 *  - a deck deleted here stays deleted (a tombstone beats an older cloud copy);
 *  - when a deck changed on both sides, notes merge one by one and cards are taken from the side that changed them;
 *  - when the *same* note, or the cards, changed on both sides, the cloud copy wins and this device's version is
 *    kept as a [Conflict] for the student to resolve. Nothing is thrown away silently.
 * The same inputs always produce the same output (ties are broken by content, never by chance).
 */
object DeckSync {
    private fun sha(s: String): String = MessageDigest.getInstance("SHA-256").digest(s.toByteArray()).joinToString("") { "%02x".format(it) }

    fun cardsHash(cards: List<Card>): String = sha(cards.joinToString("\u0001") { listOf(it.q, it.a, it.wrong.joinToString("\u0003"), it.why).joinToString("\u0002") })

    private fun noteSig(n: Note): String = listOf(n.id, n.title, n.text, n.kind, n.src.orEmpty()).joinToString("\u0002")

    /** A fingerprint of everything in a deck that a student can see (not its timestamps). */
    fun contentHash(d: Deck): String = sha(
        listOf(d.name, d.color, d.parent.orEmpty(), d.from.orEmpty(), cardsHash(d.cards), d.notes.sortedBy { it.id }.joinToString("\u0001", transform = ::noteSig)).joinToString("\u0004"),
    )

    /** A cloud note whose text was trimmed keeps this device's full text (the website's rule). */
    private fun fillCut(remote: Note, local: Note?): Note = if (remote.cut && local != null && local.text.isNotEmpty()) remote.copy(text = local.text, cut = false) else remote

    private fun withLocalText(remote: Deck, local: Deck?): Deck {
        if (local == null) return remote
        val mine = local.notes.associateBy { it.id }
        return remote.copy(notes = remote.notes.map { fillCut(it, mine[it.id]) })
    }

    private fun synced(d: Deck, remoteUpdated: Long) = LocalDeck(d, dirty = false, baseUpdated = remoteUpdated, baseCards = cardsHash(d.cards))

    fun merge(local: List<LocalDeck>, tombstones: Map<String, Long>, remote: List<Deck>, now: Long): MergeResult {
        val mine = local.associateBy { it.deck.id }
        val theirs = remote.associateBy { it.id }
        val out = ArrayList<LocalDeck>()
        val conflicts = ArrayList<Conflict>()
        val stones = HashMap(tombstones)
        var push = false

        for (id in (mine.keys + theirs.keys).sorted()) {
            val l = mine[id]
            val r = theirs[id]
            when {
                l == null && r != null -> {
                    val deletedAt = stones[id]
                    if (deletedAt != null && deletedAt >= r.updated) {
                        push = true                                  // deleted here after the cloud copy was written
                    } else {
                        stones.remove(id)                            // it was changed elsewhere after we deleted it: it's back
                        out += synced(r, r.updated)
                    }
                }
                l != null && r == null -> {
                    // The website never treats "missing in the cloud" as deleted (another device may simply not have
                    // had it yet), so neither do we: keep it and upload it.
                    out += l.copy(dirty = true)
                    push = true
                }
                l != null && r != null -> {
                    val remote2 = withLocalText(r, l.deck)
                    val same = contentHash(l.deck) == contentHash(remote2)
                    when {
                        same -> {
                            if (l.deck.updated > r.updated || remote2 != r) push = true
                            out += synced(l.deck.copy(updated = maxOf(l.deck.updated, r.updated)), maxOf(l.deck.updated, r.updated))
                        }
                        !l.dirty -> {
                            // not changed here: the newer copy wins (the website's rule); equal times fall back to content
                            val takeRemote = r.updated > l.deck.updated || (r.updated == l.deck.updated && contentHash(remote2) > contentHash(l.deck))
                            if (takeRemote) out += synced(remote2, r.updated) else { out += l.copy(dirty = true); push = true }
                        }
                        r.updated <= l.baseUpdated -> {
                            out += l                                 // only this device changed it
                            push = true
                        }
                        else -> {
                            val (merged, reason) = mergeBoth(l, remote2, now)
                            if (reason != null) conflicts += Conflict(id, l.deck, remote2, reason)
                            val changed = contentHash(merged) != contentHash(remote2)
                            if (changed) push = true
                            out += if (changed) LocalDeck(merged, dirty = true, baseUpdated = r.updated, baseCards = cardsHash(r.cards)) else synced(merged, r.updated)
                        }
                    }
                }
            }
        }
        // a deck whose parent is gone (or would loop) moves to the top level, as on the website
        val byId = out.associate { it.deck.id to it.deck }
        val fixed = out.map { ld ->
            val p = ld.deck.parent
            if (p != null && !app.zing.core.web.Clean.parentOk(ld.deck.id, p, byId)) ld.copy(deck = ld.deck.copy(parent = null)) else ld
        }
        // forget tombstones nobody needs any more (older than 180 days)
        val kept = stones.filterValues { now - it < 180L * 86_400_000L }
        return MergeResult(fixed, conflicts, kept, push)
    }

    /** Both sides changed since the last sync. Returns the merged deck and, if something truly clashed, why. */
    private fun mergeBoth(l: LocalDeck, r: Deck, now: Long): Pair<Deck, String?> {
        val base = l.baseUpdated
        var reason: String? = null

        // cards: taken from whichever side changed them; if both did, the cloud copy wins and it is a conflict
        val localCardsChanged = l.baseCards == null || cardsHash(l.deck.cards) != l.baseCards
        val remoteCardsChanged = l.baseCards == null || cardsHash(r.cards) != l.baseCards
        val cards = when {
            cardsHash(l.deck.cards) == cardsHash(r.cards) -> r.cards
            localCardsChanged && !remoteCardsChanged -> l.deck.cards
            !localCardsChanged -> r.cards
            else -> { reason = "cards"; r.cards }
        }

        // notes: one by one, by their own edit time
        val mine = l.deck.notes.associateBy { it.id }
        val theirs = r.notes.associateBy { it.id }
        val notes = ArrayList<Note>()
        for (id in (theirs.keys + mine.keys)) {
            val a = mine[id]
            val b = theirs[id]
            when {
                a != null && b != null -> when {
                    noteSig(a) == noteSig(b) -> notes += b
                    a.at > base && b.at > base -> { reason = reason ?: "note"; notes += b }   // both edited: cloud wins, mine is kept in the conflict
                    a.at > base -> notes += a
                    b.at > base -> notes += b
                    else -> notes += if (a.at >= b.at) a else b
                }
                a != null -> if (a.at > base) notes += a                 // new here; otherwise it was deleted in the cloud
                b != null -> if (b.at > base) notes += b                 // new in the cloud; otherwise it was deleted here
            }
        }
        val newer = if (r.updated >= l.deck.updated) r else l.deck
        val merged = r.copy(
            name = newer.name, color = newer.color, parent = newer.parent, from = r.from ?: l.deck.from,
            cards = cards, notes = notes.sortedByDescending { it.at }.take(app.zing.core.model.Limits.NOTES_PER_DECK),
            created = minOf(l.deck.created, r.created),
        )
        val changed = contentHash(merged) != contentHash(r)
        return merged.copy(updated = if (changed) maxOf(now, r.updated + 1, l.deck.updated) else r.updated) to reason
    }

    /** What the student chose for a conflict. */
    enum class Resolution { KEEP_MINE, KEEP_THEIRS, KEEP_BOTH }

    /**
     * Applies the student's choice. Returns the decks to save (the current deck, plus a copy for KEEP_BOTH).
     * [newId] is only used for KEEP_BOTH.
     */
    fun resolve(conflict: Conflict, current: Deck, choice: Resolution, now: Long, newId: String): List<Deck> = when (choice) {
        Resolution.KEEP_THEIRS -> listOf(current)
        Resolution.KEEP_MINE -> listOf(conflict.mine.copy(updated = maxOf(now, current.updated + 1)))
        Resolution.KEEP_BOTH -> listOf(
            current,
            conflict.mine.copy(id = newId, name = (conflict.mine.name.take(50) + " (my copy)"), updated = now, created = now, from = null),
        )
    }
}
