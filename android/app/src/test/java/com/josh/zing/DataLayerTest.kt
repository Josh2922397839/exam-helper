package com.josh.zing

import app.zing.core.account.AiBlock
import app.zing.core.ai.AssistantAnswer
import app.zing.core.model.Card
import app.zing.core.search.Filters
import app.zing.core.sync.DeckSync
import app.zing.core.theme.Appearance
import app.zing.core.theme.Preset
import app.zing.core.web.SaveCodec
import com.josh.zing.data.remote.SignedOutReason
import com.josh.zing.data.repo.AiUnavailable
import com.josh.zing.data.repo.ImportSource
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.put
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/** The app's real repositories, database, HTTP client and sync engine, run against a pretend Supabase project. */
@RunWith(RobolectricTestRunner::class)
class DataLayerTest {
    private lateinit var env: TestEnv
    private val c get() = env.c
    private val fake get() = env.fake

    @Before fun setUp() { env = TestEnv() }
    @After fun tearDown() = env.close()

    private fun signIn(profile: Boolean = true) = runBlocking {
        if (profile) fake.profile = fake.meJson()
        c.account.signInGoogle("google-id-token", "raw-nonce")
    }

    private val webSave = """{"v":1,"at":1,"state":{"xp":300,"days":["2026-11-09"],"cards":{"my-web0001":{"What is ATP?":3}},"futureField":7},
        "sets":[{"id":"my-web0001","name":"Biology","color":"#14b8a6","updated":1779999000000,"created":1779000000000,
                 "cards":[["What is ATP?","Energy currency"]],
                 "notes":[{"id":"nweb1","t":"Photosynthesis","x":"Plants make glucose using light energy in the chloroplasts.","k":"note","at":1779998000000}]}]}"""

    // ---------------------------------------------------------------- notebooks and search

    @Test fun notebooksNotesAndTopicSearchWorkOffline() = runBlocking {
        val bio = c.library.createDeck("Biology", "#14b8a6", icon = "🧬")
        val sub = c.library.createDeck("Cells", "#14b8a6", parent = bio.id)
        val history = c.library.createDeck("History", "#ff5e4d")
        c.library.saveNote(bio.id, null, "Photosynthesis", "Plants make glucose using light energy.\nIt happens in the chloroplasts.")
        val mitosis = c.library.saveNote(sub.id, null, "Mitosis", "Dividing cells copy their DNA. Café culture is unrelated.")!!
        c.library.saveNote(history.id, null, "Morant Bay", "Paul Bogle led the march in 1865.")

        val hits = c.search.search("chloroplast")
        assertEquals(listOf("Photosynthesis"), hits.hits.map { it.doc.title })
        assertEquals("Biology", hits.groups.single().notebookName)
        assertTrue(hits.hits.single().passages.single().highlights.isNotEmpty())
        // a note in a sub-book is grouped under its notebook; stems and accents match
        val cells = c.search.search("divide cafe")
        assertEquals("Mitosis", cells.hits.single().doc.title); assertEquals("Biology", cells.hits.single().doc.notebookName); assertEquals("Cells", cells.hits.single().doc.deckName)
        assertEquals(listOf("Mitosis"), c.search.search("dna", Filters(notebookId = bio.id)).hits.map { it.doc.title })
        assertTrue(c.search.search("volcano").hits.isEmpty())
        assertTrue(c.search.search("\"; DROP TABLE notes; --").hits.isEmpty()) // typed junk can't break the index query

        // archive hides from search unless asked; pin is reflected; delete removes from the index and undo restores it
        c.library.setNoteMeta(sub.id, mitosis) { it.copy(archivedAt = 5, pinned = true) }
        assertTrue(c.search.search("mitosis").hits.isEmpty())
        assertTrue(c.search.search("mitosis", Filters(includeArchived = true)).hits.single().doc.pinned)
        val deleted = c.library.delete(bio.id)!!
        assertEquals(2, deleted.decks.size)
        assertTrue(c.search.search("chloroplast").hits.isEmpty())
        assertEquals(setOf(bio.id, sub.id), c.library.currentOverlay().gone.keys)
        c.library.undoDelete(deleted)
        assertEquals(1, c.search.search("chloroplast").hits.size)
        assertEquals("🧬", c.library.currentOverlay().book(bio.id).icon)
        assertTrue(c.library.currentOverlay().gone.isEmpty())
    }

    @Test fun draftsSurviveAndLimitsMatchTheWebsite() = runBlocking {
        val d = c.library.createDeck("Notes", "#14b8a6")
        c.library.saveDraft(d.id, null, "Half written", "typed but never saved")
        assertEquals("typed but never saved", c.library.draft(d.id, null)!!.body)
        val id = c.library.saveNote(d.id, null, "Half written", "typed and saved")
        assertNotNull(id); assertNull(c.library.draft(d.id, null))
        repeat(39) { c.library.saveNote(d.id, null, "n$it", "text $it") }
        assertNull("a deck holds 40 notes, like on the website", c.library.saveNote(d.id, null, "one too many", "x"))
        assertEquals(1, c.library.addCards(d.id, listOf(Card("Q", "A"), Card("q", "dup"), Card("", "bad"))))
    }

    // ---------------------------------------------------------------- sync

    @Test fun firstSyncBringsTheWebSaveAndEditsGoBackInTheWebFormat() = runBlocking {
        fake.save = Json.parseToJsonElement(webSave).jsonObject
        signIn()
        val deck = c.library.snapshot().single()
        assertEquals("Biology", deck.deck.name); assertFalse(deck.dirty)
        assertEquals(300, c.study.current().xp)
        assertEquals(1, c.search.search("glucose").hits.size)
        assertTrue("nothing changed, so nothing is uploaded", fake.called("ef_save_put").isEmpty())

        c.library.saveNote(deck.deck.id, null, "Respiration", "Glucose is broken down to release energy.")
        c.study.earn(10)
        assertTrue(c.sync.sync().ok)
        val put = fake.called("ef_save_put").last().body["p_data"]!!.jsonObject
        assertEquals(1, (put["v"] as JsonPrimitive).content.toInt())
        val set = put["sets"]!!.jsonArray.single().jsonObject
        assertEquals(setOf("nweb1", set["notes"]!!.jsonArray.map { it.jsonObject["id"] }.map { (it as JsonPrimitive).content }.first { it != "nweb1" }), set["notes"]!!.jsonArray.map { (it.jsonObject["id"] as JsonPrimitive).content }.toSet())
        assertEquals(JsonPrimitive(7), put["state"]!!.jsonObject["futureField"])  // a field Android doesn't know is kept
        assertEquals(310, (put["state"]!!.jsonObject["xp"] as JsonPrimitive).content.toInt())
        assertEquals(SaveCodec.decksFromJson(put["sets"], 0), c.library.snapshot().map { it.deck })
        assertFalse(c.library.hasUnsyncedChanges())
        // syncing again changes nothing and uploads nothing
        val puts = fake.called("ef_save_put").size
        c.sync.sync()
        assertEquals(puts, fake.called("ef_save_put").size)
    }

    @Test fun changesOnTwoDevicesBecomeAConflictTheStudentResolves() = runBlocking {
        fake.save = Json.parseToJsonElement(webSave).jsonObject
        signIn()
        val id = "my-web0001"
        c.library.saveNote(id, "nweb1", "Photosynthesis", "My phone's version")
        // meanwhile the website edited the same note and saved
        val other = Json.parseToJsonElement(webSave.replace("Plants make glucose using light energy in the chloroplasts.", "The website's version").replace("1779998000000}", "${env.clock + 50}}").replace("\"updated\":1779999000000", "\"updated\":${env.clock + 50}")).jsonObject
        fake.save = other
        env.clock += 100
        val report = c.sync.sync()
        assertEquals(1, report.conflicts)
        assertEquals("The website's version", c.library.deck(id)!!.notes.single().text)
        val conflict = c.library.conflicts.first().single()
        assertEquals("My phone's version", conflict.mine.notes.single().text)
        c.library.resolveConflict(id, DeckSync.Resolution.KEEP_MINE)
        assertEquals("My phone's version", c.library.deck(id)!!.notes.single().text)
        assertTrue(c.library.conflicts.first().isEmpty())
    }

    @Test fun deletedNotebooksStayDeletedAndOfflineChangesWait() = runBlocking {
        fake.save = Json.parseToJsonElement(webSave).jsonObject
        signIn()
        fake.offline = true
        c.library.delete("my-web0001")
        val extra = c.library.createDeck("Made offline", "#ff5e4d")
        val r = c.sync.sync()
        assertTrue(r.offline); assertTrue(c.library.hasUnsyncedChanges())
        fake.offline = false
        assertTrue(c.sync.sync().ok)
        val sets = fake.save!!["sets"]!!.jsonArray.map { (it.jsonObject["id"] as JsonPrimitive).content }
        assertEquals(listOf(extra.id), sets)
        assertEquals(listOf(extra.id), c.library.snapshot().map { it.deck.id })
    }

    @Test fun xpIsSentOnceEvenWhenTheAnswerIsLost() = runBlocking {
        signIn()
        c.study.earn(25)
        fake.failOnce["/rest/v1/rpc/ef_save_get"] = 500   // the XP call lands, a later step fails three times → the sync reports an error
        fake.offline = false
        c.sync.sync()
        assertEquals(25, fake.xpTotal)
        // an interrupted batch is re-sent with the same operation ID: the server counts it once
        c.db.kv().put(com.josh.zing.data.local.KvEntity(com.josh.zing.data.local.Keys.XP_INFLIGHT, "1:25"))
        c.sync.sync()
        assertEquals(25, fake.xpTotal)
        assertEquals(1, fake.xpOps.size)
        assertEquals(0, c.study.pendingXp())
    }

    @Test fun theAppWorksBeforeTheMigrationIsApplied() = runBlocking {
        fake.missing += setOf("ef_add_xp2", "ef_prefs_get", "ef_prefs_put", "ef_entitlement", "delete-account", "ef_blocked")
        signIn()
        c.library.createDeck("Biology", "#14b8a6")
        c.library.setAppearance(Appearance(Preset.MIDNIGHT))
        c.study.earn(40)
        assertTrue(c.sync.sync().ok)
        assertEquals("the website's own XP call is used instead", 40, fake.xpTotal)
        assertEquals(1, fake.save!!["sets"]!!.jsonArray.size)
        c.account.deleteAccount()   // falls back to ef_delete_me
        assertEquals(1, fake.called("ef_delete_me").size)
        assertNull(fake.save)
    }

    @Test fun notebookDetailsAndThemeSyncWithARevisionCheck() = runBlocking {
        signIn()
        val d = c.library.createDeck("Biology", "#14b8a6", icon = "🧬")
        c.settings.setAppearance(Appearance(Preset.FOCUS)); c.library.setAppearance(Appearance(Preset.FOCUS))
        c.sync.sync()
        assertEquals(1L, fake.prefsRev)
        // another device writes in between: this device's write is refused, merged and retried
        val other = app.zing.core.sync.Overlay().withBook(d.id, env.clock + 500) { it.copy(icon = "⭐") }.withAppearance(Appearance(Preset.MIDNIGHT), env.clock + 500)
        c.library.setArchived(d.id, true)                      // local change at clock
        fake.prefs = Json.parseToJsonElement(app.zing.core.sync.Overlay.encode(other)); fake.prefsRev = 7
        c.sync.sync()
        val merged = app.zing.core.sync.Overlay.decode(fake.prefs.toString())
        assertEquals("⭐", merged.book(d.id).icon)               // the newer edit won
        assertEquals(Preset.MIDNIGHT, merged.appearance!!.preset)
        assertEquals(Preset.MIDNIGHT, c.settings.appearance.first().preset) // and this device follows it
        assertFalse(c.library.hasUnsyncedChanges())
    }

    // ---------------------------------------------------------------- sign-in and sessions

    @Test fun googleSignInSendsTheNonceAndLinksInsteadOfReplacingAProfile() = runBlocking {
        signIn()
        val first = fake.called("/auth/v1/token?grant_type=id_token").single()
        assertEquals("raw-nonce", (first.body["nonce"] as JsonPrimitive).content)
        assertEquals("google", (first.body["provider"] as JsonPrimitive).content)
        assertNull(first.body["link_identity"]); assertNull(first.auth)
        assertTrue(c.account.session.value!!.hasGoogle)
        // a guest with a profile connects Google: the token is exchanged *as that account*
        env.close(); env = TestEnv()
        fake.profile = fake.meJson()
        c.account.signInGuest()
        c.account.signInGoogle("google-id-token", "raw-2")
        val link = fake.called("/auth/v1/token?grant_type=id_token").single()
        assertEquals(JsonPrimitive(true), link.body["link_identity"])
        assertTrue(link.auth!!.startsWith("Bearer access-"))
    }

    @Test fun emailSignInUsesPkceAndTheCode() = runBlocking {
        val pending = c.account.startEmail("  Student@Example.com ")
        assertEquals("student@example.com", pending.email)
        val otp = fake.called("/auth/v1/otp").single()
        assertTrue(otp.path.contains("redirect_to=") && otp.path.contains("auth%2Fcallback"))
        assertEquals("s256", (otp.body["code_challenge_method"] as JsonPrimitive).content)
        assertFalse(otp.body.toString().contains(pending.verifier)) // the verifier never leaves the device
        assertNotNull(c.account.pendingEmail())                     // survives the app being closed
        try { c.account.verifyEmailCode("000000"); error("a wrong code must fail") } catch (e: com.josh.zing.data.remote.ApiException) { assertTrue(e.message!!.contains("expired")) }
        fake.profile = fake.meJson()
        assertNotNull(c.account.verifyEmailCode("123456"))
        assertTrue(c.account.session.value!!.hasEmail); assertNull(c.account.pendingEmail())
        // the link route: the one-time code is exchanged with the stored verifier
        val p2 = c.account.startEmail("student@example.com")
        c.account.finishEmailLink(app.zing.core.account.DeepLink.AuthCode("code-from-link"))
        assertEquals(p2.verifier, (fake.called("/auth/v1/token?grant_type=pkce").single().body["code_verifier"] as JsonPrimitive).content)
    }

    @Test fun expiredTokensRefreshOnceAndRevokedSessionsSignOut() = runBlocking {
        signIn()
        val s = c.sessions.session.value!!
        c.sessions.set(s.copy(expiresAt = env.clock / 1000 - 10, accessToken = "stale"))
        // five requests at once need a token: one refresh is sent
        val tokens = (1..5).map { async { c.sessions.accessToken() } }.awaitAll()
        assertEquals(1, tokens.toSet().size)
        assertEquals(1, fake.called("grant_type=refresh_token").size)
        // offline: the session is kept
        c.sessions.set(c.sessions.session.value!!.copy(expiresAt = 0))
        fake.offline = true
        assertNull(c.sessions.accessToken()); assertNotNull(c.sessions.session.value)
        fake.offline = false
        // revoked on the server: signed out, with the reason, and local study data untouched
        c.library.createDeck("Kept", "#14b8a6")
        fake.refreshRevoked = true
        val reason = async { withTimeout(5000) { c.sessions.signedOut.first() } }
        assertNull(c.sessions.accessToken())
        assertEquals(SignedOutReason.EXPIRED, reason.await())
        assertNull(c.sessions.session.value); assertNull(c.settings.session())
        assertEquals(1, c.library.snapshot().size)
    }

    @Test fun aDifferentStudentNeverSeesThePreviousStudentsNotebooks() = runBlocking {
        signIn()
        c.library.createDeck("Ana's private notes", "#14b8a6")
        c.sync.sync()
        c.account.signOut()
        assertNull(c.account.session.value)
        assertEquals("kept for the same student to come back to", 1, c.library.snapshot().size)
        // the same student signs back in: still there
        c.account.signInGoogle("t", "n")
        assertEquals(1, c.library.snapshot().size)
        c.account.signOut()
        // someone else signs in on the same phone
        fake.userId = "22222222-2222-4222-8222-222222222222"; fake.save = null; fake.profile = fake.meJson(username = "Ben123")
        c.account.signInGoogle("t2", "n2")
        assertTrue(c.library.snapshot().isEmpty())
        assertTrue(c.search.search("private").hits.isEmpty())
    }

    @Test fun deletingTheAccountRemovesEverythingHereAndThere() = runBlocking {
        fake.save = Json.parseToJsonElement(webSave).jsonObject
        signIn()
        c.study.earn(10); c.settings.setAppearance(Appearance(Preset.MIDNIGHT))
        c.account.deleteAccount()
        assertEquals(1, fake.called("/functions/v1/delete-account").size)
        assertNull(fake.profile); assertNull(fake.save); assertTrue(fake.userDeleted)
        assertNull(c.account.session.value); assertNull(c.settings.session())
        assertTrue(c.library.snapshot().isEmpty()); assertEquals(0, c.study.current().xp)
        assertNull(c.db.kv().get(com.josh.zing.data.local.Keys.ME))
        assertEquals(Preset.ZING_CLASSIC, c.settings.appearance.first().preset)
        // offline, nothing is deleted anywhere
        env.close(); env = TestEnv(); signIn(); c.library.createDeck("Still here", "#14b8a6")
        fake.offline = true; c.sessions.set(c.sessions.session.value!!.copy(expiresAt = 0))
        try { c.account.deleteAccount(); error("must not pretend to delete") } catch (e: java.io.IOException) { /* expected */ }
        assertEquals(1, c.library.snapshot().size)
    }

    // ---------------------------------------------------------------- Zing AI and Magic import

    @Test fun aiAnswersMustQuoteTheNotesAndOnlyStudyTextIsSent() = runBlocking {
        signIn()
        val d = c.library.createDeck("Biology", "#14b8a6")
        c.library.saveNote(d.id, null, "Photosynthesis", "Plants make glucose using light energy in the chloroplasts. Ask ana.b@example.com or 876-555-0142 for the worksheet.")
        val hits = c.search.search("photosynthesis").hits
        val selected = hits.map { it to it.doc.text }
        fake.aiAnswer = buildJsonObject { put("found", true); put("answer", "Plants make glucose using light energy in the chloroplasts."); put("citations", buildJsonArray { add(buildJsonObject { put("ref", "s1"); put("quote", "Plants make glucose using light energy") }) }) }
        val good = c.ai.answer("how do plants make glucose? I'm AnaB482", selected) as AssistantAnswer.Grounded
        assertTrue(good.fromAi); assertEquals("${d.id}/${hits[0].doc.noteId}", good.sources.single().source.noteKey)
        val sent = fake.called("/functions/v1/zing-ai").last().body.toString()
        assertFalse(sent.contains("example.com")); assertFalse(sent.contains("555-0142")); assertFalse(sent.contains("student@")); assertFalse(sent.contains(fake.userId)); assertFalse(sent.contains(d.id))
        // a made-up answer is thrown away
        fake.aiAnswer = buildJsonObject { put("found", true); put("answer", "Plants breathe through their roots at night."); put("citations", buildJsonArray { add(buildJsonObject { put("ref", "s1"); put("quote", "plants breathe through their roots") }) }) }
        assertEquals(AssistantAnswer.NotInNotes, c.ai.answer("roots", selected))
        // limits and outages are reported, never hidden
        fake.aiError = 429 to "quota_exceeded"
        try { c.ai.answer("glucose", selected); error("should be blocked") } catch (e: AiUnavailable) { assertEquals(AiBlock.DAILY_LIMIT, e.block) }
        fake.aiError = null; fake.offline = true
        assertEquals(AiBlock.OFFLINE, c.ai.status().block)
        fake.offline = false
        assertEquals(AssistantAnswer.NeedsSupport, c.ai.answer("i want to hurt myself", selected))
    }

    @Test fun guestsNeverReachTheAiAndImportFallsBackToQuickCards() = runBlocking {
        c.account.signInGuest()
        assertEquals(AiBlock.GUEST, c.ai.status().block)
        assertTrue(fake.called("/functions/v1/zing-ai").isEmpty())
        val notes = "Photosynthesis is the process plants use to make glucose from light. The nucleus controls the activities of the cell. The Treaty of Paris was signed in 1763 after the war."
        val draft = c.importer.make(ImportSource.Text("Bio", notes, "paste"), useAi = false)
        assertFalse(draft.usedAi); assertTrue(draft.cards.size >= 3)
        draft.cards.forEach { card -> assertTrue(notes.contains(card.a, ignoreCase = true)) }
        // a Quizlet / Anki / Sheets paste needs no AI at all
        val table = c.importer.make(ImportSource.Text("Set", "Osmosis\tMovement of water\nMitosis\tCell division\nATP\tEnergy currency", "paste"))
        assertEquals(3, table.cards.size); assertNull(table.noteText)
    }

    @Test fun aiImportIsUsedWhenAllowedAndFallsBackWhenTheLimitIsReached() = runBlocking {
        signIn()
        val notes = "Photosynthesis is the process plants use to make glucose from light. The nucleus controls the activities of the cell."
        fake.aiCards = buildJsonObject { put("title", "Plant biology"); put("left", 4); put("cards", buildJsonArray { add(buildJsonObject { put("q", "What do plants make in photosynthesis?"); put("a", "Glucose"); put("wrong", JsonArray(listOf("Salt", "Protein", "Fat").map(::JsonPrimitive))); put("why", "Light energy is used to make glucose.") }) }) }
        val ai = c.importer.make(ImportSource.Text("Bio", notes, "paste"))
        assertTrue(ai.usedAi); assertEquals("Plant biology", ai.title); assertEquals(listOf("Salt", "Protein", "Fat"), ai.cards.single().wrong)
        fake.aiError = 429 to "quota_exceeded"
        val quick = c.importer.make(ImportSource.Text("Bio", notes, "paste"))
        assertFalse(quick.usedAi); assertEquals(AiBlock.DAILY_LIMIT, quick.fallback); assertTrue(quick.cards.isNotEmpty())
        // photos can't fall back: the student is told why
        try { c.importer.make(ImportSource.Images("Photo", listOf("data:image/jpeg;base64,AAAA"))); error("needs AI") } catch (e: com.josh.zing.data.repo.ImportFailed) { assertTrue(e.message!!.contains("turns")) }
    }

    @Test fun studyingEarnsXpCoinsAndStreaksLikeTheWebsite() = runBlocking {
        val d = c.library.createDeck("Deck", "#14b8a6")
        c.library.addCards(d.id, listOf(Card("Q1", "A1")))
        val r = c.study.rate(d.id, "Q1", 3)
        assertEquals(4, r.added)
        c.study.answer("${d.id}:x", ok = true); c.study.answer("${d.id}:y", ok = false)
        val p = c.study.current()
        assertEquals(16, p.xp); assertEquals(3, p.box(d.id, "Q1")); assertEquals(listOf("${d.id}:y"), p.mistakes); assertEquals(1, p.days.size)
        assertEquals(1, c.study.currentWallet().balance); assertEquals(16, c.study.pendingXp())
        assertFalse("no coins yet", c.study.buyFreeze())
    }
}
