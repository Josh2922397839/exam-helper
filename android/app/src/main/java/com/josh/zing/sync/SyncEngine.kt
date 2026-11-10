package com.josh.zing.sync

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import app.zing.core.billing.Entitlement
import app.zing.core.billing.PlayStates
import app.zing.core.sync.OpId
import app.zing.core.sync.Overlay
import app.zing.core.web.Progress
import app.zing.core.web.SaveCodec
import com.josh.zing.ZingApp
import com.josh.zing.data.local.Keys
import com.josh.zing.data.local.KvEntity
import com.josh.zing.data.local.Settings
import com.josh.zing.data.local.ZingDatabase
import com.josh.zing.data.remote.ApiException
import com.josh.zing.data.remote.EntitlementDto
import com.josh.zing.data.remote.MeDto
import com.josh.zing.data.remote.OfflineException
import com.josh.zing.data.remote.SessionManager
import com.josh.zing.data.remote.ZingApi
import com.josh.zing.data.repo.Library
import com.josh.zing.data.repo.Study
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import java.util.concurrent.TimeUnit

enum class SyncState { IDLE, RUNNING, OFFLINE, ERROR }

/** [retry]: it failed for a reason that should pass (no connection, or the server is busy), so try again later. */
data class SyncReport(val ok: Boolean, val offline: Boolean = false, val skipped: Boolean = false, val conflicts: Int = 0, val coins: Int = 0, val retry: Boolean = offline)

/**
 * Keeps this device and the student's account in step. One sync at a time; every step can be repeated safely:
 *  1. queued XP goes up in batches that carry an operation ID;
 *  2. the cloud save is fetched, merged with this device (never overwriting newer changes on either side) and,
 *     if the result differs from the cloud, written back as a whole;
 *  3. notebook details and appearance are merged and written with a revision check;
 *  4. the profile and the Zing Plus entitlement are refreshed.
 * A step whose server function isn't deployed yet is skipped, so the app works before the migration is applied.
 */
class SyncEngine(
    private val db: ZingDatabase,
    private val library: Library,
    private val study: Study,
    private val api: ZingApi,
    private val sessions: SessionManager,
    private val settings: Settings,
    private val now: () -> Long = System::currentTimeMillis,
) {
    private val kv = db.kv()
    private val mutex = Mutex()
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    private val _state = MutableStateFlow(SyncState.IDLE)
    val state: StateFlow<SyncState> = _state
    val lastSync: Flow<Long?> = kv.observe(Keys.LAST_SYNC).map { it?.toLongOrNull() }
    val me: Flow<MeDto?> = kv.observe(Keys.ME).map { s -> s?.let { runCatching { json.decodeFromString(MeDto.serializer(), it) }.getOrNull() } }
    val entitlement: Flow<Entitlement> = kv.observe(Keys.ENTITLEMENT).map(::decodeEntitlement)

    private fun decodeEntitlement(s: String?): Entitlement {
        val parts = s?.split('|') ?: return Entitlement.NONE
        return Entitlement(PlayStates.parse(parts.getOrNull(0)), parts.getOrNull(1)?.takeIf { it.isNotEmpty() }, parts.getOrNull(2)?.toLongOrNull(), parts.getOrNull(3) == "1", parts.getOrNull(4)?.toLongOrNull() ?: 0)
    }

    suspend fun cachedMe(): MeDto? = kv.get(Keys.ME)?.let { runCatching { json.decodeFromString(MeDto.serializer(), it) }.getOrNull() }
    suspend fun storeMe(me: MeDto?) { if (me == null) kv.delete(Keys.ME) else kv.put(KvEntity(Keys.ME, json.encodeToString(MeDto.serializer(), me))) }
    suspend fun storeEntitlement(dto: EntitlementDto) {
        kv.put(KvEntity(Keys.ENTITLEMENT, listOf(dto.state, dto.productId.orEmpty(), dto.expiresAt?.toString().orEmpty(), if (dto.autoRenew) "1" else "0", now().toString()).joinToString("|")))
    }

    /** Runs a full sync. Never throws: problems are reported in the result and in [state]. */
    suspend fun sync(): SyncReport = mutex.withLock {
        val session = sessions.load() ?: return@withLock SyncReport(ok = true, skipped = true)
        _state.value = SyncState.RUNNING
        try {
            var me = cachedMe()
            // the profile first: it tells us whether there is an account to sync with at all
            val fresh = runCatching { api.me() }.onFailure { if (it is CancellationException || it is OfflineException) throw it }.getOrNull()
            if (fresh != null || me == null) { me = fresh; storeMe(fresh) }
            if (me == null) { _state.value = SyncState.IDLE; return@withLock SyncReport(ok = true, skipped = true) }
            val coins = study.creditFromProfile(me.referrals, me.deckSaves)

            flushXp(session.userId)
            val conflicts = syncSave()
            syncOverlay()
            refreshEntitlement()

            kv.put(KvEntity(Keys.LAST_SYNC, now().toString()))
            kv.delete(Keys.LAST_SYNC_ERROR)
            _state.value = SyncState.IDLE
            SyncReport(ok = true, conflicts = conflicts, coins = coins)
        } catch (e: CancellationException) {
            _state.value = SyncState.IDLE
            throw e
        } catch (e: OfflineException) {
            _state.value = SyncState.OFFLINE
            SyncReport(ok = false, offline = true)
        } catch (e: ApiException) {
            // the code only (never a body) is kept, to show "couldn't back up" with something to report
            kv.put(KvEntity(Keys.LAST_SYNC_ERROR, e.code.take(40)))
            _state.value = if (sessions.session.value == null) SyncState.IDLE else SyncState.ERROR
            SyncReport(ok = false, retry = e.status >= 500 || e.status == 429)
        }
    }

    private suspend fun flushXp(userId: String) {
        while (true) {
            val (sequence, amount) = study.takeXpBatch() ?: return
            try {
                api.addXp(amount, OpId.of(userId, "xp", sequence))
            } catch (e: ApiException) {
                if (!e.notDeployed) throw e
                api.addXp(amount) // before the migration: the website's own (not repeat-safe) call
            }
            study.xpBatchDone()
        }
    }

    /** Returns how many decks are waiting for the student to resolve a conflict. */
    private suspend fun syncSave(): Int {
        val remote = api.saveGet() as? JsonObject
        val merged = library.mergeFromCloud(SaveCodec.decksFromJson(remote?.get("sets"), now()))
        val remoteProgress = Progress.fromJson(remote?.get("state"))
        val progress = study.mergeFromCloud(remoteProgress)
        if (merged.needsPush || progress != remoteProgress || study.isDirty()) {
            val decks = library.snapshot().map { it.deck }
            val state = study.current()
            api.savePut(SaveCodec.save(state.toJson(), decks, now()))
            library.markSynced(decks)
            study.markSynced(state)
        }
        return merged.conflicts.size
    }

    private suspend fun syncOverlay() {
        var remote = try { api.prefsGet() } catch (e: ApiException) { if (e.notDeployed) return else throw e }
        repeat(3) {
            val local = library.currentOverlay()
            val decks = library.snapshot()
            val liveNotes = decks.flatMap { d -> d.deck.notes.map { "${d.deck.id}/${it.id}" } }.toSet()
            val cloud = Overlay.decode(remote.data?.toString())
            val merged = Overlay.prune(Overlay.merge(local, cloud), decks.map { it.deck.id }.toSet() , liveNotes, now())
            merged.appearance?.let { a -> if (a != settings.appearance.first()) settings.setAppearance(a) }
            if (merged == cloud) { library.storeOverlay(merged, remote.rev, dirty = false); return }
            val put = api.prefsPut(json.parseToJsonElement(Overlay.encode(merged)), remote.rev)
            if (!put.conflict) { library.storeOverlay(merged, put.rev, dirty = library.currentOverlay() != local); return }
            remote = put // someone else wrote first: merge with what they wrote and try again
        }
    }

    private suspend fun refreshEntitlement() {
        try { storeEntitlement(api.entitlement()) } catch (e: ApiException) { if (!e.notDeployed) throw e }
    }

    suspend fun forget() {
        listOf(Keys.ME, Keys.ENTITLEMENT, Keys.LAST_SYNC, Keys.LAST_SYNC_ERROR, Keys.BLOCKED).forEach { kv.delete(it) }
        _state.value = SyncState.IDLE
    }
}

/** Runs the sync in the background when there is a connection. */
class SyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val container = (applicationContext as? ZingApp)?.container ?: return Result.success()
        val report = container.sync.sync()
        return if (report.retry && runAttemptCount < 5) Result.retry() else Result.success()
    }
}

class SyncScheduler(private val context: Context) {
    private val online = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()

    /** Asks for a sync soon. Several requests close together become one. */
    fun request(delaySeconds: Long = 4) {
        runCatching {
            WorkManager.getInstance(context).enqueueUniqueWork(
                "zing-sync", ExistingWorkPolicy.REPLACE,
                OneTimeWorkRequestBuilder<SyncWorker>().setConstraints(online).setInitialDelay(delaySeconds, TimeUnit.SECONDS)
                    .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS).build(),
            )
        }
    }

    /** A quiet top-up a few times a day; skipped while the battery is low. */
    fun schedulePeriodic() {
        runCatching {
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                "zing-sync-periodic", ExistingPeriodicWorkPolicy.KEEP,
                PeriodicWorkRequestBuilder<SyncWorker>(6, TimeUnit.HOURS)
                    .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).setRequiresBatteryNotLow(true).build()).build(),
            )
        }
    }

    fun cancelAll() { runCatching { WorkManager.getInstance(context).cancelUniqueWork("zing-sync"); WorkManager.getInstance(context).cancelUniqueWork("zing-sync-periodic") } }
}
