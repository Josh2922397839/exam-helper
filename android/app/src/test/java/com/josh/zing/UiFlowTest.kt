package com.josh.zing

import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextInput
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.zing.core.model.Card
import app.zing.core.theme.Preset
import app.zing.core.web.ShareLink
import com.josh.zing.ui.AppViewModel
import com.josh.zing.ui.ZingRoot
import com.josh.zing.ui.components.LocalContainer
import com.josh.zing.ui.theme.ZingTheme
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** The real screens and navigation, driven the way a student would, against the pretend server. */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w411dp-h891dp-xhdpi")
class UiFlowTest {
    @get:Rule val rule = createComposeRule()
    private lateinit var env: TestEnv
    private lateinit var app: AppViewModel
    private val c get() = env.c
    private val fake get() = env.fake

    @Before fun setUp() { env = TestEnv() }
    @After fun tearDown() = env.close(closeDatabase = false)

    private fun launch(link: String? = null) {
        app = AppViewModel(c)
        link?.let(app::onLink)
        rule.setContent {
            val appearance by app.appearance.collectAsStateWithLifecycle()
            CompositionLocalProvider(LocalContainer provides c) { ZingTheme(appearance) { ZingRoot(app) } }
        }
    }

    private fun waitFor(tag: String, timeout: Long = 15_000) = rule.waitUntil(timeout) { rule.onAllNodesWithTag(tag).fetchSemanticsNodes().isNotEmpty() }
    private fun waitForText(text: String, timeout: Long = 15_000) = rule.waitUntil(timeout) { rule.onAllNodesWithText(text, substring = true).fetchSemanticsNodes().isNotEmpty() }
    /** Waits for something that isn't on screen (saved data). Pending main-thread work is let through on each look. */
    private fun until(timeout: Long = 15_000, condition: () -> Boolean) = rule.waitUntil(timeout) { rule.waitForIdle(); condition() }
    private fun click(tag: String) { waitFor(tag); rule.onNodeWithTag(tag).performClick() }
    private fun type(tag: String, text: String) { waitFor(tag); rule.onNodeWithTag(tag).performTextInput(text) }
    private fun localOnly() = runBlocking { c.settings.update { it.copy(setupLater = true) } }
    private fun signedIn() = runBlocking { fake.profile = fake.meJson(); c.account.signInGoogle("id-token", "nonce") }

    private fun setup(age: String) {
        launch()
        click("email"); type("emailField", "student@example.com"); click("sendEmail")
        type("codeField", "123456"); click("verifyCode")
        type("age", age); click("next")          // age
        click("next"); click("next"); click("next") // purpose, grade, school (skipped)
        click("next")                             // friends and reminders
        type("first", "Ana"); click("next")
        type("last", "Brown"); click("next")
        waitFor("tabHome")
    }

    @Test fun emailSignInThenSetupLandsInTheApp() {
        setup("15")
        val sent = fake.called("ef_onboard").single().body["p"]!!.jsonObject
        assertEquals(JsonPrimitive(15), sent["age"]); assertEquals(JsonPrimitive("Ana"), sent["first"]); assertEquals(JsonPrimitive(true), sent["findable"])
        waitForText("Hi, Ana")
    }

    @Test fun underThirteensAreNeverFindable() {
        setup("11")
        assertEquals(JsonPrimitive(false), fake.called("ef_onboard").single().body["p"]!!.jsonObject["findable"])
    }

    @Test fun googleIsHiddenUntilItIsConfiguredAndGuestsAreWarned() {
        launch()
        waitFor("email")
        assertTrue("no Google button without a client ID", rule.onAllNodesWithTag("google").fetchSemanticsNodes().isEmpty())
        rule.onNodeWithText("More options").performClick()
        waitFor("guest")
        rule.onNodeWithText("A guest account lives only on this phone", substring = true).assertIsDisplayed()
    }

    @Test fun offlineOnFirstRunCanStillStudy() {
        fake.offline = true
        launch()
        click("later")
        waitFor("tabHome")
        assertNull(c.account.session.value)
    }

    @Test fun makeANotebookWriteANoteAndFindItByTopic() {
        localOnly(); launch()
        click("tabNotebooks"); click("newNotebook")
        type("notebookName", "Biology"); click("notebookSave")
        click("newNote")
        type("noteTitle", "Photosynthesis"); type("noteBody", "Plants make glucose using light energy. It happens in the chloroplasts.")
        click("saveNote")
        waitFor("note:Photosynthesis")
        rule.onNodeWithText("Cards (0)").performClick()
        click("newCard"); type("cardQ", "Where does photosynthesis happen?"); type("cardA", "In the chloroplasts"); click("cardSave")
        waitForText("Cards (1)")
        rule.onNodeWithContentDescription("Back").performClick()
        waitFor("notebook:Biology")
        rule.onNodeWithText("1 note · 1 deck · 1 card").assertIsDisplayed()
        click("tabSearch"); type("searchField", "chloroplast")
        waitFor("hit:Photosynthesis"); waitFor("group:Biology")
        rule.onNodeWithTag("answer").assertIsDisplayed()
        rule.onNodeWithText("From your notes").assertIsDisplayed()          // no AI: the notes answer for themselves
        // a topic that isn't in the notes says so instead of inventing something
        rule.onNodeWithContentDescription("Clear search").performClick()
        type("searchField", "volcano")
        waitFor("noResults")
        rule.onNodeWithText("won't make something up", substring = true).assertIsDisplayed()
    }

    @Test fun archiveRestoreAndDeleteWithUndo() {
        localOnly()
        runBlocking { c.library.createDeck("History", "#ff5e4d") }
        launch()
        click("tabNotebooks"); waitFor("notebook:History")
        rule.onNodeWithContentDescription("Options for History").performClick()
        rule.onNodeWithText("Archive").performClick()
        rule.waitUntil(10_000) { rule.onAllNodesWithTag("notebook:History").fetchSemanticsNodes().isEmpty() }
        click("archivedTab"); waitFor("notebook:History")
        rule.onNodeWithContentDescription("Options for History").performClick()
        rule.onNodeWithText("Restore").performClick()
        until { runBlocking { c.library.currentOverlay().book(c.library.snapshot().single().deck.id).archivedAt == null } }
        rule.onNodeWithText("My notebooks (1)").performClick(); waitFor("notebook:History")
        rule.onNodeWithContentDescription("Options for History").performClick()
        rule.onNodeWithText("Delete").performClick()
        rule.onAllNodesWithText("Delete").fetchSemanticsNodes()   // the confirmation dialog
        rule.onNode(hasText("Delete") and androidx.compose.ui.test.hasClickAction() and androidx.compose.ui.test.isEnabled()).performClick()
        until { runBlocking { c.library.snapshot().isEmpty() } }
        waitForText("Notebook deleted")
        rule.onNodeWithText("Undo").performClick()
        until { runBlocking { c.library.snapshot().size == 1 } }
    }

    @Test fun magicImportShowsCardsToCheckBeforeSaving() {
        localOnly(); launch()
        waitFor("tabHome")
        rule.onNodeWithText("Magic import").performClick()
        waitFor("aiFallbackNote")                                             // not signed in: quick cards, and it says so
        type("pasteField", "Osmosis - movement of water\nMitosis - cell division\nATP - energy currency\nNucleus - controls the cell")
        click("makeFromPaste")
        waitFor("reviewTitle")
        rule.onNodeWithText("Check these 4 cards").assertIsDisplayed()
        assertTrue("nothing is saved before the student agrees", runBlocking { c.library.snapshot().isEmpty() })
        click("saveImport")
        waitFor("importDone")
        rule.onNodeWithTag("importDone").assert(hasText("4 cards created"))
        rule.onNodeWithTag("startQuiz").assertIsEnabled()
        assertTrue(rule.onAllNodesWithTag("crafting").fetchSemanticsNodes().isEmpty()) // "Crafting questions" only while it works
        assertEquals(4, runBlocking { c.library.snapshot().single().deck.cards.size })
    }

    @Test fun aQuizExplainsAnswersAndKeepsScore() {
        localOnly()
        val id = runBlocking {
            c.library.createDeck("Capitals", "#3a8dff").id.also { c.library.addCards(it, listOf(Card("Jamaica?", "Kingston"), Card("France?", "Paris"), Card("Japan?", "Tokyo"), Card("Kenya?", "Nairobi"))) }
        }
        launch()
        click("tabNotebooks"); click("notebook:Capitals"); click("studyQuiz")
        repeat(4) {
            waitFor("question")
            rule.onAllNodesWithTag("optionRight").onFirst().performClick()
            click("nextQuestion")
        }
        waitFor("quizScore")
        rule.onNodeWithText("100%").assertIsDisplayed()
        until { runBlocking { c.study.current().quiz[id]?.best == 100 } }
        assertEquals(40, runBlocking { c.study.current().xp })
    }

    @Test fun themesChangeAtOnceAndAreRemembered() {
        localOnly(); launch()
        click("tabMe")
        rule.onNodeWithTag("openAppearance").performScrollTo().performClick()
        waitFor("themePreview")
        rule.onNodeWithTag("preset:MIDNIGHT").performScrollTo().performClick()
        until { app.appearance.value.preset == Preset.MIDNIGHT }                       // the whole app re-themes at once
        until { runBlocking { c.library.currentOverlay().appearance?.preset == Preset.MIDNIGHT } } // and it is queued to follow the student to other devices
        rule.onNodeWithTag("preset:HIGH_CONTRAST").performScrollTo().performClick()
        until { app.appearance.value.preset == Preset.HIGH_CONTRAST }
        rule.onNodeWithTag("resetAppearance").performScrollTo().performClick()
        rule.waitForIdle()
        assertEquals(Preset.HIGH_CONTRAST, app.appearance.value.preset)
    }

    @Test fun zingPlusNeverBlocksTheAppWhenBillingIsMissing() {
        signedIn(); launch()
        click("tabMe")
        rule.onNodeWithTag("openPlus").performScrollTo().performClick()
        waitFor("billingUnavailable")
        rule.onNodeWithText("Zing is free").assertIsDisplayed()
        rule.onNodeWithTag("restore").performScrollTo().assertIsDisplayed()
        rule.onNodeWithContentDescription("Back").performClick()
        click("tabNotebooks"); waitFor("newNotebook")
    }

    @Test fun signingOutReturnsToTheWelcomeScreenAndKeepsNotebooks() {
        signedIn(); runBlocking { c.library.createDeck("Kept", "#14b8a6") }
        launch()
        click("tabMe")
        rule.onNodeWithTag("openAccount").performScrollTo().performClick()
        rule.onNodeWithTag("signOut").performScrollTo().performClick()
        waitForText("Sign out?")
        rule.onNode(hasText("Sign out") and androidx.compose.ui.test.hasClickAction() and !androidx.compose.ui.test.hasTestTag("signOut")).performClick()
        waitFor("email")
        assertNull(c.account.session.value)
        assertEquals(1, runBlocking { c.library.snapshot().size })
    }

    @Test fun deletingTheAccountNeedsTypingDeleteAndClearsThePhone() {
        signedIn(); runBlocking { c.library.createDeck("Mine", "#14b8a6") }
        launch()
        click("tabMe")
        rule.onNodeWithTag("openAccount").performScrollTo().performClick()
        rule.onNodeWithTag("deleteAccount").performScrollTo().performClick()
        waitFor("deleteConfirm")
        rule.onNodeWithTag("deleteConfirm").performScrollTo().assertIsNotEnabled()
        rule.onNodeWithTag("deleteConfirmField").performScrollTo().performTextInput("DELETE")
        rule.onNodeWithTag("deleteConfirm").performScrollTo().assertIsEnabled().performClick()
        waitFor("email", 20_000)
        assertTrue(fake.userDeleted)
        assertTrue(runBlocking { c.library.snapshot().isEmpty() })
        assertNull(runBlocking { c.settings.session() })
    }

    @Test fun aLinkOpenedBeforeSignInIsHonouredAfterwards() {
        val code = ShareLink.encode("Shared capitals", "#3a8dff", listOf(Card("Jamaica?", "Kingston"), Card("France?", "Paris")))
        launch("https://exam-helper.edgeone.app/#/import/$code")
        waitFor("email")                         // not signed in yet: the link waits
        assertFalse(rule.onAllNodesWithTag("saveShared").fetchSemanticsNodes().isNotEmpty())
        localOnly()
        click("saveShared")
        waitFor("notebook:Shared capitals".let { "newNote" })
        assertEquals("Shared capitals", runBlocking { c.library.snapshot().single().deck.name })
        assertNull(runBlocking { c.settings.pendingLink() })
    }
}
