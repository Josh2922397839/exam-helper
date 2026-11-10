package app.zing.core

import app.zing.core.account.AgeRules
import app.zing.core.account.AiBlock
import app.zing.core.account.AiErrors
import app.zing.core.account.DeepLink
import app.zing.core.account.Wallet
import app.zing.core.billing.Entitlement
import app.zing.core.billing.Feature
import app.zing.core.billing.FeatureGate
import app.zing.core.billing.PlayAccount
import app.zing.core.billing.PlayStates
import app.zing.core.billing.PlusState
import app.zing.core.model.Card
import app.zing.core.model.Deck
import app.zing.core.model.Note
import app.zing.core.sync.BookMeta
import app.zing.core.sync.DeckSync
import app.zing.core.sync.LocalDeck
import app.zing.core.sync.OpId
import app.zing.core.sync.Overlay
import app.zing.core.theme.Appearance
import app.zing.core.theme.Contrast
import app.zing.core.theme.DarkMode
import app.zing.core.theme.Preset
import app.zing.core.theme.Themes
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SyncThemeBillingTest {
    private val t0 = 1_780_000_000_000L
    private fun deck(id: String = "my-deck01", updated: Long = t0, cards: List<Card> = listOf(Card("Q", "A")), notes: List<Note> = emptyList(), name: String = "Deck", parent: String? = null) =
        Deck(id, name, "#0b8a5e", cards, updated, t0 - 1000, parent, notes)
    private fun note(id: String, text: String, at: Long) = Note(id, "Title", text, at = at)
    private fun synced(d: Deck) = LocalDeck(d, dirty = false, baseUpdated = d.updated, baseCards = DeckSync.cardsHash(d.cards))

    // ---------------------------------------------------------------- deck sync

    @Test fun firstSyncTakesEverythingFromTheCloud() {
        val r = DeckSync.merge(emptyList(), emptyMap(), listOf(deck()), t0)
        assertEquals(1, r.decks.size); assertFalse(r.decks[0].dirty); assertFalse(r.needsPush); assertTrue(r.conflicts.isEmpty())
    }

    @Test fun newerCopyWinsWhenOnlyOneSideChanged() {
        val base = deck()
        // changed in the cloud only
        var r = DeckSync.merge(listOf(synced(base)), emptyMap(), listOf(base.copy(name = "Renamed", updated = t0 + 5)), t0 + 9)
        assertEquals("Renamed", r.decks.single().deck.name); assertFalse(r.needsPush)
        // changed here only
        val mine = LocalDeck(base.copy(name = "Mine", updated = t0 + 5), dirty = true, baseUpdated = t0, baseCards = DeckSync.cardsHash(base.cards))
        r = DeckSync.merge(listOf(mine), emptyMap(), listOf(base), t0 + 9)
        assertEquals("Mine", r.decks.single().deck.name); assertTrue(r.needsPush); assertTrue(r.conflicts.isEmpty())
    }

    @Test fun aDeletedDeckStaysDeletedUnlessItChangedAfterwards() {
        val d = deck()
        var r = DeckSync.merge(emptyList(), mapOf(d.id to t0 + 10), listOf(d), t0 + 20)
        assertTrue(r.decks.isEmpty()); assertTrue(r.needsPush); assertEquals(setOf(d.id), r.tombstones.keys)
        // someone edited it on another device after we deleted it: it comes back and the tombstone goes
        r = DeckSync.merge(emptyList(), mapOf(d.id to t0 + 10), listOf(d.copy(updated = t0 + 50)), t0 + 60)
        assertEquals(1, r.decks.size); assertTrue(r.tombstones.isEmpty())
        // old tombstones are forgotten
        assertTrue(DeckSync.merge(emptyList(), mapOf("my-old001" to t0), emptyList(), t0 + 200L * 86_400_000L).tombstones.isEmpty())
    }

    @Test fun aDeckMissingFromTheCloudIsKeptAndUploaded() {
        val r = DeckSync.merge(listOf(synced(deck())), emptyMap(), emptyList(), t0 + 1)
        assertEquals(1, r.decks.size); assertTrue(r.needsPush)
    }

    @Test fun bothSidesChangedDifferentNotesMergeWithoutAConflict() {
        val n1 = note("naaa1", "one", t0 - 100); val n2 = note("naaa2", "two", t0 - 100)
        val base = deck(notes = listOf(n1, n2))
        val mine = LocalDeck(base.copy(notes = listOf(n1.copy(text = "one edited here", at = t0 + 10), n2), updated = t0 + 10), true, t0, DeckSync.cardsHash(base.cards))
        val theirs = base.copy(notes = listOf(n1, n2.copy(text = "two edited there", at = t0 + 20), note("naaa3", "new there", t0 + 21)), updated = t0 + 21)
        val r = DeckSync.merge(listOf(mine), emptyMap(), listOf(theirs), t0 + 30)
        assertTrue(r.conflicts.isEmpty())
        val notes = r.decks.single().deck.notes.associate { it.id to it.text }
        assertEquals(mapOf("naaa1" to "one edited here", "naaa2" to "two edited there", "naaa3" to "new there"), notes)
        assertTrue(r.needsPush)
        assertTrue(r.decks.single().deck.updated > theirs.updated)
    }

    @Test fun theSameNoteEditedOnBothSidesIsAConflictAndNothingIsLost() {
        val n1 = note("naaa1", "one", t0 - 100)
        val base = deck(notes = listOf(n1))
        val mineDeck = base.copy(notes = listOf(n1.copy(text = "my version", at = t0 + 10)), updated = t0 + 10)
        val theirs = base.copy(notes = listOf(n1.copy(text = "their version", at = t0 + 20)), updated = t0 + 20)
        val r = DeckSync.merge(listOf(LocalDeck(mineDeck, true, t0, DeckSync.cardsHash(base.cards))), emptyMap(), listOf(theirs), t0 + 30)
        assertEquals("their version", r.decks.single().deck.notes.single().text)
        val c = r.conflicts.single()
        assertEquals("note", c.reason); assertEquals("my version", c.mine.notes.single().text)
        // the student's choices
        val current = r.decks.single().deck
        assertEquals("my version", DeckSync.resolve(c, current, DeckSync.Resolution.KEEP_MINE, t0 + 40, "my-copy01").single().notes.single().text)
        assertEquals(listOf(current), DeckSync.resolve(c, current, DeckSync.Resolution.KEEP_THEIRS, t0 + 40, "my-copy01"))
        val both = DeckSync.resolve(c, current, DeckSync.Resolution.KEEP_BOTH, t0 + 40, "my-copy01")
        assertEquals(listOf("my-deck01", "my-copy01"), both.map { it.id }); assertEquals("Deck (my copy)", both[1].name)
    }

    @Test fun cardsComeFromTheSideThatChangedThemAndClashOnlyWhenBothDid() {
        val base = deck()
        val baseHash = DeckSync.cardsHash(base.cards)
        val newNote = note("nnew1", "added here", t0 + 5)
        // here: a new note; there: new cards → both kept
        var r = DeckSync.merge(listOf(LocalDeck(base.copy(notes = listOf(newNote), updated = t0 + 5), true, t0, baseHash)), emptyMap(),
            listOf(base.copy(cards = base.cards + Card("Q2", "A2"), updated = t0 + 8)), t0 + 9)
        assertTrue(r.conflicts.isEmpty()); assertEquals(2, r.decks.single().deck.cards.size); assertEquals(1, r.decks.single().deck.notes.size)
        // cards changed on both sides → conflict, cloud cards win, mine kept aside
        r = DeckSync.merge(listOf(LocalDeck(base.copy(cards = listOf(Card("Mine", "M")), updated = t0 + 5), true, t0, baseHash)), emptyMap(),
            listOf(base.copy(cards = listOf(Card("Theirs", "T")), updated = t0 + 8)), t0 + 9)
        assertEquals("cards", r.conflicts.single().reason)
        assertEquals("Theirs", r.decks.single().deck.cards.single().q); assertEquals("Mine", r.conflicts.single().mine.cards.single().q)
    }

    @Test fun trimmedCloudNotesKeepTheFullTextOnThisDevice() {
        val full = note("nlong1", "the full text", t0 - 50)
        val base = deck(notes = listOf(full))
        val cloud = base.copy(notes = listOf(full.copy(text = "", cut = true)), updated = t0 + 5, name = "Renamed elsewhere")
        val r = DeckSync.merge(listOf(synced(base)), emptyMap(), listOf(cloud), t0 + 9)
        val n = r.decks.single().deck.notes.single()
        assertEquals("the full text", n.text); assertFalse(n.cut); assertEquals("Renamed elsewhere", r.decks.single().deck.name)
    }

    @Test fun mergingIsDeterministicAndSafeToRepeat() {
        val a = deck("my-aaaa1", name = "A"); val b = deck("my-bbbb1", name = "B", parent = "my-gone01")
        val local = listOf(synced(a), LocalDeck(b.copy(name = "B2", updated = t0 + 3), true, t0, DeckSync.cardsHash(b.cards)))
        val remote = listOf(b, a.copy(name = "A2", updated = t0 + 4))
        val r1 = DeckSync.merge(local, emptyMap(), remote, t0 + 10)
        val r2 = DeckSync.merge(local.reversed(), emptyMap(), remote.reversed(), t0 + 10)
        assertEquals(r1, r2)
        assertNull(r1.decks.first { it.deck.id == "my-bbbb1" }.deck.parent) // a missing parent moves the deck to the top level
        // syncing again with what we just uploaded changes nothing
        val uploaded = r1.decks.map { it.deck }
        val again = DeckSync.merge(r1.decks.map { synced(it.deck) }, r1.tombstones, uploaded, t0 + 20)
        assertFalse(again.needsPush); assertEquals(uploaded, again.decks.map { it.deck })
    }

    // ---------------------------------------------------------------- metadata overlay

    @Test fun overlayMergeIsNewestWinsCommutativeAndIdempotent() {
        val a = Overlay().withBook("my-aaaa1", 10) { it.copy(icon = "leaf") }.withNote("my-aaaa1", "nabc1", 30) { it.copy(pinned = true) }.withAppearance(Appearance(Preset.FOCUS), 5)
        val b = Overlay().withBook("my-aaaa1", 20) { it.copy(icon = "atom", archivedAt = 20) }.withNote("my-aaaa1", "nabc1", 15) { it.copy(topic = "old") }.withAppearance(Appearance(Preset.MIDNIGHT), 9)
            .copy(gone = mapOf("my-dead01" to 7L))
        val m = Overlay.merge(a, b)
        assertEquals(BookMeta("atom", null, 20, 20), m.book("my-aaaa1"))
        assertTrue(m.note("my-aaaa1", "nabc1").pinned)
        assertEquals(Preset.MIDNIGHT, m.appearance!!.preset)
        assertEquals(7L, m.gone["my-dead01"])
        assertEquals(m, Overlay.merge(b, a)); assertEquals(m, Overlay.merge(m, a)); assertEquals(m, Overlay.merge(m, m))
        assertEquals(m, Overlay.decode(Overlay.encode(m)))
        assertEquals(Overlay(), Overlay.decode("not json")); assertEquals(Overlay(), Overlay.decode("""{"v":1,"books":{"x":{"future":true}}}""").copy(books = emptyMap()))
    }

    @Test fun overlayStaysUnderTheServerLimit() {
        var o = Overlay()
        repeat(4000) { i -> o = o.withNote("my-aaaa1", "n%05d".format(i), i.toLong()) { it.copy(topic = "topic number $i", subject = "subject") } }
        val live = o.notes.keys
        val pruned = Overlay.prune(o.withBook("my-aaaa1", 1) { it }.withBook("my-gone01", 1) { it }, setOf("my-aaaa1"), live, 10_000)
        assertTrue(Overlay.encode(pruned).toByteArray().size <= Overlay.MAX_BYTES)
        assertEquals(setOf("my-aaaa1"), pruned.books.keys)
        assertTrue(pruned.notes.containsKey("my-aaaa1/n03999")) // newest details survive
        assertFalse(pruned.notes.containsKey("my-aaaa1/n00000"))
    }

    @Test fun operationIdsAreStableUuids() {
        val id = OpId.of("user-1", "xp", 7)
        assertEquals(id, OpId.of("user-1", "xp", 7))
        assertNotEquals(id, OpId.of("user-1", "xp", 8)); assertNotEquals(id, OpId.of("user-2", "xp", 7))
        assertTrue(Regex("^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$").matches(id))
    }

    // ---------------------------------------------------------------- appearance

    @Test fun everyPresetPassesContrastInLightAndDark() {
        for (preset in Preset.entries) for (dark in listOf(false, true)) {
            val issues = Themes.validate(Themes.base(preset, dark), preset)
            assertTrue("$preset dark=$dark: $issues", issues.isEmpty())
        }
    }

    @Test fun noAccentChoiceCanMakeTheAppUnreadable() {
        val faint = listOf("#ffffff", "#fffdf8", "#f4f1e8", "#ffff00", "#000000", "#0a1410", "#808080", "#ffc23c")
        for (preset in Preset.entries) for (dark in DarkMode.entries) for (accent in faint + Appearance.ACCENTS) {
            val r = Themes.resolve(Appearance(preset, dark, accent), systemDark = false)
            assertTrue("$preset $dark $accent: ${r.issues}", r.issues.isEmpty())
            assertTrue(Contrast.ratio(r.palette.onAccent, r.palette.accent) >= Contrast.TEXT)
        }
        val white = Themes.resolve(Appearance(Preset.ZING_CLASSIC, DarkMode.LIGHT, "#ffffff"), false)
        assertTrue(white.accentAdjusted)
        assertFalse(Themes.resolve(Appearance(Preset.ZING_CLASSIC, DarkMode.LIGHT, "#0a7550"), false).accentAdjusted)
        assertTrue(Themes.resolve(Appearance(Preset.ZING_CLASSIC, DarkMode.LIGHT, "#0b8a5e"), false).accentAdjusted) // the website green is a touch too light for text
    }

    @Test fun appearanceIsSanitisedAndResettable() {
        val a = Appearance(accent = "javascript:alert(1)", fontScale = 99f).sane()
        assertNull(a.accent); assertEquals(Appearance.MAX_FONT, a.fontScale)
        assertEquals(1f, Appearance(fontScale = Float.NaN).sane().fontScale)
        assertTrue(Themes.isDark(Appearance(Preset.MIDNIGHT, DarkMode.LIGHT), systemDark = false)) // Midnight is always dark
        assertTrue(Themes.isDark(Appearance(dark = DarkMode.SYSTEM), systemDark = true))
        val custom = Appearance(Preset.FOCUS, DarkMode.DARK, accent = "#ff5e4d", fontScale = 1.2f, showProgress = true)
        assertEquals(Appearance.defaultsFor(Preset.FOCUS).copy(dark = DarkMode.DARK), custom.reset())
        assertEquals(21.0, Contrast.ratio(0x000000, 0xFFFFFF), 0.01)
    }

    // ---------------------------------------------------------------- Zing Plus

    @Test fun entitlementStatesGrantOrWithholdPlus() {
        val now = t0; val later = now + 86_400_000L
        assertTrue(Entitlement(PlusState.ACTIVE, expiresAt = later).hasPlus(now))
        assertTrue(Entitlement(PlusState.GRACE, expiresAt = later).hasPlus(now))
        assertTrue(Entitlement(PlusState.CANCELED_ACTIVE, expiresAt = later).hasPlus(now))
        assertFalse(Entitlement(PlusState.CANCELED_ACTIVE, expiresAt = now - 1).hasPlus(now))
        for (s in listOf(PlusState.NONE, PlusState.PENDING, PlusState.ON_HOLD, PlusState.PAUSED, PlusState.EXPIRED, PlusState.REVOKED))
            assertFalse("$s", Entitlement(s, expiresAt = later).hasPlus(now))
        assertFalse(Entitlement(PlusState.ACTIVE, expiresAt = now - 2 * 3_600_000L).hasPlus(now)) // server said active but time ran out
        // offline: trusted for three days at most
        val e = Entitlement(PlusState.ACTIVE, expiresAt = now + 30 * 86_400_000L, checkedAt = now)
        assertTrue(e.usableOffline(now + 2 * 86_400_000L)); assertFalse(e.usableOffline(now + 4 * 86_400_000L))
    }

    @Test fun playStatesMapToEntitlements() {
        val now = t0
        assertEquals(PlusState.ACTIVE, PlayStates.map("SUBSCRIPTION_STATE_ACTIVE", now + 1, now))
        assertEquals(PlusState.GRACE, PlayStates.map("SUBSCRIPTION_STATE_IN_GRACE_PERIOD", now + 1, now))
        assertEquals(PlusState.ON_HOLD, PlayStates.map("SUBSCRIPTION_STATE_ON_HOLD", now + 1, now))
        assertEquals(PlusState.PAUSED, PlayStates.map("SUBSCRIPTION_STATE_PAUSED", now + 1, now))
        assertEquals(PlusState.PENDING, PlayStates.map("SUBSCRIPTION_STATE_PENDING", null, now))
        assertEquals(PlusState.CANCELED_ACTIVE, PlayStates.map("SUBSCRIPTION_STATE_CANCELED", now + 1, now))
        assertEquals(PlusState.EXPIRED, PlayStates.map("SUBSCRIPTION_STATE_CANCELED", now - 1, now))
        assertEquals(PlusState.EXPIRED, PlayStates.map("SUBSCRIPTION_STATE_EXPIRED", now - 1, now))
        assertEquals(PlusState.NONE, PlayStates.map("SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED", null, now))
        assertEquals(PlusState.NONE, PlayStates.map("SOMETHING_NEW", null, now)); assertEquals(PlusState.NONE, PlayStates.map(null, null, now))
        assertEquals(PlusState.REVOKED, PlayStates.map("SUBSCRIPTION_STATE_ACTIVE", now + 1, now, revoked = true))
        assertEquals(PlusState.GRACE, PlayStates.parse("grace")); assertEquals(PlusState.NONE, PlayStates.parse("???"))
    }

    @Test fun nothingIsGatedUntilTheCatalogueIsApproved() {
        assertTrue(FeatureGate.gated.isEmpty())
        Feature.entries.forEach { assertTrue(FeatureGate.allowed(it, Entitlement.NONE, t0, online = true)) }
        val id = PlayAccount.obfuscatedId("5b1f0c1e-0000-4000-8000-000000000001")
        assertEquals(64, id.length); assertFalse(id.contains("5b1f0c1e")); assertEquals(id, PlayAccount.obfuscatedId("5b1f0c1e-0000-4000-8000-000000000001"))
    }

    // ---------------------------------------------------------------- account rules, links, coins

    @Test fun ageRules() {
        assertTrue(AgeRules.isChild(12)); assertFalse(AgeRules.isChild(13)); assertFalse(AgeRules.canBeFindable(12)); assertTrue(AgeRules.canBeFindable(13))
        assertFalse(AgeRules.aiAllowedByAge(13)); assertTrue(AgeRules.aiAllowedByAge(14)); assertFalse(AgeRules.aiAllowedByAge(null))
        assertFalse(AgeRules.valid(4)); assertTrue(AgeRules.valid(5)); assertFalse(AgeRules.valid(101))
        assertEquals(AiBlock.DAILY_LIMIT, AiErrors.block("quota_exceeded", 429)); assertEquals(AiBlock.EVERYONE_LIMIT, AiErrors.block("ai_daily_limit"))
        assertEquals(AiBlock.UNAVAILABLE, AiErrors.block("temporarily_unavailable")); assertEquals(AiBlock.NONE, AiErrors.block(null, 200))
        AiBlock.entries.filter { it != AiBlock.NONE }.forEach { assertTrue(AiErrors.message(it).isNotBlank()) }
    }

    @Test fun deepLinksAreParsedStrictly() {
        val host = "exam-helper.edgeone.app"; val scheme = "com.josh.zing"
        fun parse(u: String?) = DeepLink.parse(u, host, scheme)
        assertEquals(DeepLink.ImportDeck("z.abc_DEF-123"), parse("https://$host/#/import/z.abc_DEF-123"))
        assertEquals(DeepLink.SharedDeck("0b0b0b0b-1111-2222-3333-444444444444"), parse("https://$host/#/shared/0b0b0b0b-1111-2222-3333-444444444444"))
        assertEquals(DeepLink.Profile("Ana_B482"), parse("https://$host/#/u/Ana_B482"))
        assertEquals(DeepLink.School(42), parse("https://$host/index.html#/school/42"))
        assertEquals(DeepLink.Invite("AnaB482"), parse("https://$host/?ref=AnaB482"))
        assertEquals(DeepLink.AuthCode("abcdef-0123456789"), parse("https://$host/?code=abcdef-0123456789"))
        assertEquals(DeepLink.AuthCode("abcdef-0123456789"), parse("$scheme://auth/callback?code=abcdef-0123456789"))
        assertEquals(DeepLink.AuthError("access_denied"), parse("https://$host/?error=access_denied&error_description=x"))
        assertEquals(DeepLink.Home, parse("https://$host/#/league"))
        assertEquals(DeepLink.Home, parse("https://$host/#/u/<script>"))
        assertEquals(DeepLink.Home, parse("https://$host/#/shared/not-a-uuid"))
        // other sites, other schemes and other paths are not ours
        assertNull(parse("https://evil.example/#/import/z.abcd")); assertNull(parse("http://$host/#/u/abc"))
        assertNull(parse("https://$host.evil.example/")); assertNull(parse("https://$host/privacy.html"))
        assertNull(parse("javascript:alert(1)")); assertNull(parse(null)); assertNull(parse("$scheme://other/callback?x=1"))
    }

    @Test fun coinsFollowTheWebsiteRules() {
        var w = Wallet().onXp(25, goalReached = false, dayKey = "2026-11-10")
        assertEquals(2, w.balance); assertEquals(5, w.carry)
        w = w.onXp(5, goalReached = true, dayKey = "2026-11-10")
        assertEquals(23, w.balance)
        assertEquals(23, w.onXp(1, goalReached = true, dayKey = "2026-11-10").balance) // the goal pays once a day
        val (w2, gained) = w.onProfile(referrals = 2, serverDeckSaves = 3)
        assertEquals(175, gained); assertEquals(0, w2.onProfile(2, 3).second)
        assertNull(Wallet().spend(1)); assertNull(Wallet(earned = 50).startDoubleXp(0))
        val boosted = Wallet(earned = 100).startDoubleXp(1000)!!
        assertEquals(10, boosted.balance); assertEquals(2, boosted.boost(2000)); assertEquals(1, boosted.boost(1000 + 16 * 60_000L)); assertNull(boosted.startDoubleXp(2000))
    }
}
