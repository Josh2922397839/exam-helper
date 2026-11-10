package com.josh.zing.data.local

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import app.zing.core.theme.Appearance
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.Json
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

private val Context.settingsStore: DataStore<Preferences> by preferencesDataStore("zing_settings")
private val Context.sessionStore: DataStore<Preferences> by preferencesDataStore("zing_session")

/** Seals and opens small secrets. The real one uses a key that never leaves the Android Keystore. */
interface SecretBox {
    fun seal(plain: String): String
    /** Returns null when the text can't be opened (for example after a restore onto a new phone). */
    fun open(sealed: String): String?
}

class KeystoreBox(private val alias: String = "zing.session.v1") : SecretBox {
    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(alias, null) as? SecretKey)?.let { return it }
        val spec = KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).build()
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply { init(spec) }.generateKey()
    }

    override fun seal(plain: String): String {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, key()) }
        val out = cipher.iv + cipher.doFinal(plain.toByteArray(Charsets.UTF_8))
        return Base64.encodeToString(out, Base64.NO_WRAP)
    }

    override fun open(sealed: String): String? = runCatching {
        val bytes = Base64.decode(sealed, Base64.NO_WRAP)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, bytes, 0, 12)) }
        String(cipher.doFinal(bytes, 12, bytes.size - 12), Charsets.UTF_8)
    }.getOrNull()
}

/** What the student has switched on or off. Mirrors the website's Settings page where the two overlap. */
data class Prefs(
    val goal: Int = 50,
    val haptics: Boolean = true,
    val sounds: Boolean = true,
    val studyReminders: Boolean = false,
    val setupDone: Boolean = false,
    val setupLater: Boolean = false,
    val aiNoticeSeen: Boolean = false,
)

/** Settings kept on the device. The sign-in session lives in its own file, sealed, and is never backed up. */
class Settings(private val context: Context, private val box: SecretBox) {
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    private object K {
        val appearance = stringPreferencesKey("appearance")
        val goal = intPreferencesKey("goal")
        val haptics = booleanPreferencesKey("haptics")
        val sounds = booleanPreferencesKey("sounds")
        val reminders = booleanPreferencesKey("reminders")
        val setupDone = booleanPreferencesKey("setup_done")
        val setupLater = booleanPreferencesKey("setup_later")
        val setupDraft = stringPreferencesKey("setup_draft")
        val aiNotice = booleanPreferencesKey("ai_notice")
        val session = stringPreferencesKey("session")
        val pendingAuth = stringPreferencesKey("pending_auth")
        val pendingLink = stringPreferencesKey("pending_link")
    }

    val appearance: Flow<Appearance> = context.settingsStore.data.map { p ->
        p[K.appearance]?.let { runCatching { json.decodeFromString(Appearance.serializer(), it) }.getOrNull() }?.sane() ?: Appearance()
    }

    suspend fun setAppearance(a: Appearance) {
        context.settingsStore.edit { it[K.appearance] = json.encodeToString(Appearance.serializer(), a.sane()) }
    }

    val prefs: Flow<Prefs> = context.settingsStore.data.map { p ->
        Prefs(
            goal = (p[K.goal] ?: 50).coerceIn(10, 500), haptics = p[K.haptics] ?: true, sounds = p[K.sounds] ?: true,
            studyReminders = p[K.reminders] ?: false, setupDone = p[K.setupDone] ?: false, setupLater = p[K.setupLater] ?: false,
            aiNoticeSeen = p[K.aiNotice] ?: false,
        )
    }

    suspend fun update(change: (Prefs) -> Prefs) {
        context.settingsStore.edit { p ->
            val next = change(prefs.first())
            p[K.goal] = next.goal; p[K.haptics] = next.haptics; p[K.sounds] = next.sounds; p[K.reminders] = next.studyReminders
            p[K.setupDone] = next.setupDone; p[K.setupLater] = next.setupLater; p[K.aiNotice] = next.aiNoticeSeen
        }
    }

    suspend fun setupDraft(): String? = context.settingsStore.data.first()[K.setupDraft]
    suspend fun setSetupDraft(value: String?) { context.settingsStore.edit { if (value == null) it.remove(K.setupDraft) else it[K.setupDraft] = value } }

    /** A link opened before the app was ready (fresh install, not signed in yet). Handled once setup is done. */
    suspend fun pendingLink(): String? = context.settingsStore.data.first()[K.pendingLink]
    suspend fun setPendingLink(value: String?) { context.settingsStore.edit { if (value == null) it.remove(K.pendingLink) else it[K.pendingLink] = value } }

    // ---- sealed values (the sign-in session and the half-finished email sign-in)
    private suspend fun sealed(key: Preferences.Key<String>): String? = context.sessionStore.data.first()[key]?.let(box::open)
    private suspend fun seal(key: Preferences.Key<String>, value: String?) {
        context.sessionStore.edit { if (value == null) it.remove(key) else it[key] = box.seal(value) }
    }

    suspend fun session(): String? = sealed(K.session)
    suspend fun setSession(value: String?) = seal(K.session, value)
    suspend fun pendingAuth(): String? = sealed(K.pendingAuth)
    suspend fun setPendingAuth(value: String?) = seal(K.pendingAuth, value)

    /** Used when the account is deleted: forget everything this app stored about the student. */
    suspend fun clearAll() {
        context.settingsStore.edit { it.clear() }
        context.sessionStore.edit { it.clear() }
    }
}
