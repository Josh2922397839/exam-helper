package com.josh.zing

import android.app.Application
import android.content.Context
import androidx.room.Room
import com.josh.zing.auth.Account
import com.josh.zing.data.local.KeystoreBox
import com.josh.zing.data.local.SecretBox
import com.josh.zing.data.local.Settings
import com.josh.zing.data.local.ZingDatabase
import com.josh.zing.data.remote.Http
import com.josh.zing.data.remote.SessionManager
import com.josh.zing.data.remote.SupabaseAuth
import com.josh.zing.data.remote.ZingApi
import com.josh.zing.data.repo.Ai
import com.josh.zing.data.repo.Importer
import com.josh.zing.data.repo.Library
import com.josh.zing.data.repo.SearchRepo
import com.josh.zing.data.repo.Study
import com.josh.zing.sync.SyncEngine
import com.josh.zing.sync.SyncScheduler

/**
 * Everything the app is built from, made once. Plain constructor wiring (no framework), so tests can build the same
 * object graph with an in-memory database and a fake server.
 */
class AppContainer(
    context: Context,
    val db: ZingDatabase = Room.databaseBuilder(context, ZingDatabase::class.java, "zing.db").build(),
    box: SecretBox = KeystoreBox(),
    val http: Http = Http(),
    baseUrl: String = BuildConfig.SUPABASE_URL,
    publishableKey: String = BuildConfig.SUPABASE_KEY,
    val now: () -> Long = System::currentTimeMillis,
    settingsOverride: Settings? = null,
) {
    /** For work that must finish even if the screen that started it has gone (saving a note on the way out). */
    val appScope = kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.SupervisorJob() + kotlinx.coroutines.Dispatchers.Default)
    val settings = settingsOverride ?: Settings(context, box)
    val auth = SupabaseAuth(http, baseUrl, publishableKey)
    val sessions = SessionManager(settings, auth)
    val api = ZingApi(http, baseUrl, publishableKey, sessions)
    val scheduler = SyncScheduler(context)
    val study = Study(db, settings, now, onChange = { scheduler.request() })
    val library = Library(db, now, onChange = { scheduler.request() })
    val sync = SyncEngine(db, library, study, api, sessions, settings, now)
    val account = Account(db, settings, sessions, auth, api, library, study, sync, scheduler, redirectUri = "${BuildConfig.APPLICATION_ID}://auth/callback", now = now)
    val search = SearchRepo(db, library, now)
    val ai = Ai(api, sessions)
    val importer = Importer(context, ai)
    val billing = com.josh.zing.billing.Billing(context, api, sync, sessions, appScope, BuildConfig.PLUS_PRODUCT_ID)
}

class ZingApp : Application() {
    lateinit var container: AppContainer

    override fun onCreate() {
        super.onCreate()
        if (!::container.isInitialized) container = AppContainer(this)
    }
}
