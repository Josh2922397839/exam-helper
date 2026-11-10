package com.josh.zing.data.repo

import androidx.room.withTransaction
import app.zing.core.account.Wallet
import app.zing.core.web.Progress
import app.zing.core.web.XpResult
import com.josh.zing.data.local.Keys
import com.josh.zing.data.local.KvEntity
import com.josh.zing.data.local.Settings
import com.josh.zing.data.local.ZingDatabase
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.time.LocalDate

@Serializable
private data class WalletJson(val earned: Int = 0, val spent: Int = 0, val carry: Int = 0, val refs: Int = 0, val deckSaves: Int = 0, val goals: List<String> = emptyList(), val doubleUntil: Long = 0)

/**
 * Study progress (the website's state object), XP waiting to be sent to the leaderboards, and coins.
 * All of it is saved on the device first; XP reaches the server when there's a connection.
 */
class Study(
    private val db: ZingDatabase,
    private val settings: Settings,
    private val now: () -> Long = System::currentTimeMillis,
    private val today: () -> LocalDate = LocalDate::now,
    private val onChange: () -> Unit = {},
) {
    private val kv = db.kv()
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    val progress: Flow<Progress> = kv.observe(Keys.PROGRESS).map(::decode).distinctUntilChanged()
    val wallet: Flow<Wallet> = kv.observe(Keys.WALLET).map(::decodeWallet).distinctUntilChanged()

    private fun decode(s: String?): Progress = s?.let { runCatching { Progress.fromJson(json.parseToJsonElement(it)) }.getOrNull() } ?: Progress()
    private fun decodeWallet(s: String?): Wallet = s?.let { runCatching { json.decodeFromString(WalletJson.serializer(), it) }.getOrNull() }
        ?.let { Wallet(it.earned, it.spent, it.carry, it.refs, it.deckSaves, it.goals, it.doubleUntil) } ?: Wallet()

    suspend fun current(): Progress = decode(kv.get(Keys.PROGRESS))
    suspend fun currentWallet(): Wallet = decodeWallet(kv.get(Keys.WALLET))
    suspend fun pendingXp(): Int = kv.get(Keys.XP_PENDING)?.toIntOrNull() ?: 0

    private suspend fun put(p: Progress) {
        kv.put(KvEntity(Keys.PROGRESS, p.toJson().toString()))
        kv.put(KvEntity(Keys.PROGRESS_DIRTY, "1"))
    }

    private suspend fun putWallet(w: Wallet) =
        kv.put(KvEntity(Keys.WALLET, json.encodeToString(WalletJson.serializer(), WalletJson(w.earned, w.spent, w.carry, w.refs, w.deckSaves, w.goals, w.doubleUntil))))

    /** Changes progress without earning XP (for example recording a quiz score). */
    suspend fun edit(change: (Progress) -> Progress) = db.withTransaction {
        val before = current()
        val after = change(before)
        if (after != before) { put(after); onChange() }
    }

    /**
     * Earns XP: updates today's total, the streak, coins and the amount waiting to be sent to the leaderboards.
     * [also] can change progress in the same step (a card moving box, a quiz answer).
     */
    suspend fun earn(xp: Int, also: (Progress) -> Progress = { it }): XpResult = db.withTransaction {
        val goal = settings.prefs.first().goal
        val wallet = currentWallet()
        val day = today()
        val result = also(current()).touchDay(day).addXp(xp, day, goal, wallet.boost(now()))
        put(result.state)
        if (result.added > 0) {
            putWallet(wallet.onXp(result.added, result.goalReached, Progress.dayKey(day)))
            kv.put(KvEntity(Keys.XP_PENDING, (pendingXp() + result.added).toString()))
        }
        onChange()
        result
    }

    suspend fun answer(key: String, ok: Boolean, hinted: Boolean = false) = earn(if (ok) (if (hinted) 5 else 10) else 2) { it.answer(key, ok) }

    /** A flashcard was rated. Moving up a box earns more than seeing it again (the website's amounts). */
    suspend fun rate(deck: String, question: String, box: Int): XpResult {
        val before = current().box(deck, question)
        return earn(if (box > before) 4 else 1) { it.setBox(deck, question, box, now()) }
    }

    suspend fun recordQuiz(id: String, percent: Int) = edit { it.recordQuiz(id, percent) }

    suspend fun buyFreeze(): Boolean = db.withTransaction {
        val p = current().addFreeze() ?: return@withTransaction false
        val w = currentWallet().spend(Wallet.FREEZE_COST) ?: return@withTransaction false
        put(p); putWallet(w); onChange(); true
    }

    suspend fun buyDoubleXp(): Boolean = db.withTransaction {
        val w = currentWallet().startDoubleXp(now()) ?: return@withTransaction false
        putWallet(w); true
    }

    /** Coins for invites and deck saves the server has counted. Returns how many coins were just added. */
    suspend fun creditFromProfile(referrals: Int, deckSaves: Int): Int = db.withTransaction {
        val (w, gained) = currentWallet().onProfile(referrals, deckSaves)
        if (gained > 0 || w != currentWallet()) putWallet(w)
        gained
    }

    // ---------------------------------------------------------------- sync
    suspend fun replace(p: Progress, dirty: Boolean) = db.withTransaction {
        kv.put(KvEntity(Keys.PROGRESS, p.toJson().toString()))
        if (dirty) kv.put(KvEntity(Keys.PROGRESS_DIRTY, "1")) else kv.delete(Keys.PROGRESS_DIRTY)
    }

    suspend fun isDirty(): Boolean = kv.get(Keys.PROGRESS_DIRTY) != null

    /** Merges the cloud's progress into this device (the website's "keep the best of both"). Returns the result. */
    suspend fun mergeFromCloud(remote: Progress): Progress = db.withTransaction {
        val merged = current().mergeWith(remote)
        kv.put(KvEntity(Keys.PROGRESS, merged.toJson().toString()))
        if (merged != remote) kv.put(KvEntity(Keys.PROGRESS_DIRTY, "1"))
        merged
    }

    /** After an upload: clear the "needs upload" mark, unless progress changed again while it was being sent. */
    suspend fun markSynced(uploaded: Progress) = db.withTransaction { if (current() == uploaded) kv.delete(Keys.PROGRESS_DIRTY) }

    /**
     * Takes up to 400 XP off the queue to send, remembering the batch so the *same* batch (same sequence number,
     * same operation ID) is retried if the app is closed before the server answers.
     */
    suspend fun takeXpBatch(): Pair<Long, Int>? = db.withTransaction {
        kv.get(Keys.XP_INFLIGHT)?.split(':')?.let { p -> p.getOrNull(0)?.toLongOrNull()?.let { seq -> p.getOrNull(1)?.toIntOrNull()?.let { n -> return@withTransaction seq to n } } }
        val n = minOf(400, pendingXp())
        if (n <= 0) return@withTransaction null
        val seq = (kv.get(Keys.XP_SEQUENCE)?.toLongOrNull() ?: 0) + 1
        kv.put(KvEntity(Keys.XP_SEQUENCE, seq.toString()))
        kv.put(KvEntity(Keys.XP_INFLIGHT, "$seq:$n"))
        kv.put(KvEntity(Keys.XP_PENDING, (pendingXp() - n).toString()))
        seq to n
    }

    suspend fun xpBatchDone() { kv.delete(Keys.XP_INFLIGHT) }

    suspend fun wipe() = db.withTransaction {
        listOf(Keys.PROGRESS, Keys.PROGRESS_DIRTY, Keys.WALLET, Keys.XP_PENDING, Keys.XP_INFLIGHT, Keys.XP_SEQUENCE).forEach { kv.delete(it) }
    }
}
