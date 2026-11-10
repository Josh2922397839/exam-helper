package com.josh.zing.data.repo

import app.zing.core.account.AiBlock
import app.zing.core.account.AiErrors
import app.zing.core.ai.AssistantAnswer
import app.zing.core.ai.Citation
import app.zing.core.ai.Grounding
import app.zing.core.ai.RawAnswer
import app.zing.core.model.Card
import app.zing.core.search.Filters
import app.zing.core.search.Hit
import app.zing.core.search.NotebookGroup
import app.zing.core.search.Query
import app.zing.core.search.Search
import app.zing.core.search.SearchDoc
import app.zing.core.web.Clean
import app.zing.core.web.DeckLogic
import com.josh.zing.data.local.NoteEntity
import com.josh.zing.data.local.SearchHistoryEntity
import com.josh.zing.data.local.ZingDatabase
import com.josh.zing.data.remote.ApiException
import com.josh.zing.data.remote.OfflineException
import com.josh.zing.data.remote.SessionManager
import com.josh.zing.data.remote.ZingApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

data class SearchOutcome(val query: Query, val hits: List<Hit>, val groups: List<NotebookGroup>) {
    companion object { val EMPTY = SearchOutcome(Query("", emptyList(), ""), emptyList(), emptyList()) }
}

/** Topic search across every notebook on this device. Works offline; the index is SQLite full-text search. */
class SearchRepo(private val db: ZingDatabase, private val library: Library, private val now: () -> Long = System::currentTimeMillis) {
    private val dao = db.library()

    val history: Flow<List<String>> = dao.observeHistory().map { list -> list.map { it.query } }

    suspend fun remember(raw: String) {
        val q = raw.trim().take(Search.MAX_QUERY)
        if (q.length >= 2) dao.upsertHistory(SearchHistoryEntity(q, now()))
    }

    suspend fun clearHistory() = dao.clearHistory()

    suspend fun search(raw: String, filters: Filters = Filters()): SearchOutcome {
        val q = Search.parse(raw)
        if (q.isEmpty) return SearchOutcome.EMPTY
        val decks = library.snapshot().map { it.deck }.associateBy { it.id }
        val overlay = library.currentOverlay()
        // the index narrows thousands of notes to a few hundred candidates; if it can't be used, every note is ranked
        val rows: List<NoteEntity> = runCatching { dao.search(Search.ftsExpression(q)) }.getOrElse { dao.notes() }
        val docs = rows.mapNotNull { n ->
            val deck = decks[n.deckId] ?: return@mapNotNull null
            val root = DeckLogic.rootOf(deck.id, decks) ?: deck
            val meta = overlay.note(deck.id, n.noteId)
            SearchDoc(
                deckId = deck.id, noteId = n.noteId, title = n.title, text = n.body, kind = n.kind, at = n.at,
                notebookId = root.id, notebookName = root.name, deckName = deck.name, pinned = meta.pinned,
                archived = meta.archivedAt != null || overlay.book(root.id).archivedAt != null, topic = meta.topic, subject = meta.subject,
            )
        }
        val hits = Search.run(docs, q, filters, now())
        return SearchOutcome(q, hits, Search.group(hits))
    }
}

data class AiAvailability(val block: AiBlock, val left: Int = 0) {
    val available: Boolean get() = block == AiBlock.NONE && left > 0
}

class AiUnavailable(val block: AiBlock) : Exception(AiErrors.message(block))

data class AiCards(val cards: List<Card>, val title: String, val left: Int, val sourceText: String?)

/**
 * Zing AI: the existing `zing-ai` Edge Function. The server decides who may use it and how often; this class only
 * sends study material and turns the server's answers and refusals into something the app can show.
 */
class Ai(private val api: ZingApi, private val sessions: SessionManager) {
    private fun unavailable(e: Throwable): AiUnavailable = when (e) {
        is OfflineException -> AiUnavailable(AiBlock.OFFLINE)
        is ApiException -> AiUnavailable(if (e.notDeployed) AiBlock.UNAVAILABLE else AiErrors.block(e.code, e.status).takeIf { it != AiBlock.NONE } ?: AiBlock.UNAVAILABLE)
        else -> AiUnavailable(AiBlock.UNAVAILABLE)
    }

    suspend fun status(): AiAvailability {
        val session = sessions.load() ?: return AiAvailability(AiBlock.GUEST)
        if (session.anonymous) return AiAvailability(AiBlock.GUEST)
        return try {
            val s = api.aiStatus()
            AiAvailability(if (!s.eligible) AiBlock.NOT_ELIGIBLE else if (s.left <= 0) AiBlock.DAILY_LIMIT else AiBlock.NONE, s.left)
        } catch (e: OfflineException) {
            AiAvailability(AiBlock.OFFLINE)
        } catch (e: ApiException) {
            AiAvailability(unavailable(e).block)
        }
    }

    /** Asks for cards. Exactly one of the sources is used, as the server requires. Throws [AiUnavailable]. */
    suspend fun cards(text: String? = null, images: List<String> = emptyList(), audio: String? = null, url: String? = null, count: Int = 12): AiCards {
        val body = buildJsonObject {
            put("action", "cards"); put("count", count.coerceIn(5, 25))
            when {
                url != null -> put("url", url)
                audio != null -> put("audio", audio)
                else -> {
                    if (!text.isNullOrBlank()) put("text", Grounding.redact(text).take(24_000))
                    if (images.isNotEmpty()) put("images", JsonArray(images.take(4).map(::JsonPrimitive)))
                }
            }
        }
        val out = try { api.aiCards(body) } catch (e: OfflineException) { throw unavailable(e) } catch (e: ApiException) { throw unavailable(e) }
        val cards = out.cards.mapNotNull { Clean.card(it.q, it.a, it.wrong, it.why) }
        return AiCards(cards, Clean.line(out.title, 60), out.left, out.transcript ?: out.page)
    }

    /**
     * A grounded answer to [question] from the passages the student selected. Only the passages go to the server
     * (cleaned by [Grounding]); what comes back is checked again here before it is shown. Throws [AiUnavailable].
     */
    suspend fun answer(question: String, selected: List<Pair<Hit, String>>): AssistantAnswer {
        if (Grounding.needsSupport(question)) return AssistantAnswer.NeedsSupport
        val sources = Grounding.sources(selected)
        if (sources.isEmpty()) return AssistantAnswer.NotInNotes
        val body = buildJsonObject {
            put("action", "answer"); put("question", Grounding.question(question))
            put("sources", buildJsonArray { sources.forEach { s -> add(buildJsonObject { put("ref", s.ref); put("title", s.title); put("text", s.text) }) } })
        }
        val out = try { api.aiAnswer(body) } catch (e: OfflineException) { throw unavailable(e) } catch (e: ApiException) {
            // a server that doesn't know the "answer" action yet answers invalid_request
            throw if (e.code == "invalid_request") AiUnavailable(AiBlock.UNAVAILABLE) else unavailable(e)
        }
        return Grounding.verify(RawAnswer(out.answer, out.citations.map { Citation(it.ref, it.quote) }, out.found), sources)
    }
}
