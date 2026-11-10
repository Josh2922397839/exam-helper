package com.josh.zing

import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onRoot
import androidx.test.core.app.ActivityScenario
import app.zing.core.model.Card
import app.zing.core.theme.Appearance
import app.zing.core.theme.DarkMode
import app.zing.core.theme.Preset
import com.github.takahirom.roborazzi.captureRoboImage
import com.josh.zing.ui.AppViewModel
import com.josh.zing.ui.components.LocalApp
import com.josh.zing.ui.components.LocalContainer
import com.josh.zing.ui.screens.AppearanceScreen
import com.josh.zing.ui.screens.HomeScreen
import com.josh.zing.ui.screens.NotebooksScreen
import com.josh.zing.ui.screens.SearchScreen
import com.josh.zing.ui.theme.ZingTheme
import kotlinx.coroutines.runBlocking
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.ParameterizedRobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.GraphicsMode

/**
 * Pictures of the real screens in every theme, light and dark, on a phone and a tablet, with large text, and offline.
 * `./gradlew :app:recordRoborazziDebug` writes them to src/test/screenshots; `verifyRoborazziDebug` fails if a screen
 * no longer matches its picture.
 */
@RunWith(ParameterizedRobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class ScreenshotTest(private val name: String, private val appearance: Appearance, private val qualifiers: String, private val systemFont: Float, private val screen: String) {
    @get:Rule val rule = createEmptyComposeRule()

    @Test fun capture() {
        RuntimeEnvironment.setQualifiers(qualifiers)
        RuntimeEnvironment.setFontScale(systemFont)
        val env = TestEnv()
        val c = env.c
        runBlocking {
            c.settings.update { it.copy(setupLater = true) }
            val bio = c.library.createDeck("Biology", "#14b8a6")
            c.library.saveNote(bio.id, null, "Photosynthesis", "Plants make glucose using light energy. It happens in the chloroplasts.")
            c.library.saveNote(bio.id, null, "Respiration", "Respiration releases energy from glucose in the mitochondria.")
            c.library.addCards(bio.id, listOf(Card("What do plants make?", "Glucose"), Card("Where?", "Chloroplasts"), Card("Energy currency?", "ATP"), Card("Powerhouse?", "Mitochondria")))
            c.study.rate(bio.id, "What do plants make?", 3)
            val history = c.library.createDeck("Caribbean History", "#ff5e4d")
            c.library.saveNote(history.id, null, "Morant Bay Rebellion", "In 1865 Paul Bogle led a march to the Morant Bay courthouse. Energy and courage carried the day.")
            c.library.createDeck("Principles of Business", "#6c6cff")
            if (screen == "home-offline") { env.fake.profile = env.fake.meJson(); c.account.signInGoogle("t", "n"); env.fake.offline = true; c.sync.sync() }
        }
        val app = AppViewModel(c)
        val dark = appearance.dark == DarkMode.DARK
        ActivityScenario.launch(ComponentActivity::class.java).use { scenario ->
            scenario.onActivity { activity ->
                activity.setContent {
                    CompositionLocalProvider(LocalContainer provides c, LocalApp provides app) {
                        ZingTheme(appearance, systemDark = dark) {
                            when (screen) {
                                "search" -> SearchScreen(null, "energy", null, { _, _ -> }, {})
                                "appearance" -> AppearanceScreen {}
                                "home", "home-offline" -> HomeScreen({}, {}, {}, {}, {})
                                else -> NotebooksScreen({}, {}, {})
                            }
                        }
                    }
                }
            }
            val ready = when (screen) { "search" -> "hit:Respiration"; "appearance" -> "themePreview"; "home-offline" -> "offlineNote"; "home" -> "homeSearch"; else -> "notebook:Biology" }
            rule.waitUntil(20_000) { rule.onAllNodesWithTag(ready).fetchSemanticsNodes().isNotEmpty() }
            if (screen == "notebooks" && appearance.showProgress) rule.waitUntil(10_000) { rule.onAllNodesWithText("1/4 learned", substring = true).fetchSemanticsNodes().isNotEmpty() }
            Thread.sleep(400); rule.waitForIdle()   // pictures bundled with the app finish loading
            rule.onRoot().captureRoboImage("src/test/screenshots/$name.png")
        }
        env.close(closeDatabase = false)
    }

    companion object {
        private const val PHONE = "w360dp-h740dp-mdpi"
        private const val TABLET = "w1280dp-h800dp-land-mdpi"

        @JvmStatic
        @ParameterizedRobolectricTestRunner.Parameters(name = "{0}")
        fun cases(): List<Array<Any>> {
            val out = ArrayList<Array<Any>>()
            for (p in Preset.entries) for (mode in listOf(DarkMode.LIGHT, DarkMode.DARK)) {
                if (p == Preset.MIDNIGHT && mode == DarkMode.LIGHT) continue
                out += arrayOf("notebooks_${p.name.lowercase()}_${mode.name.lowercase()}", Appearance.defaultsFor(p).copy(dark = mode), PHONE, 1f, "notebooks")
            }
            out += arrayOf("notebooks_tablet_zing_classic", Appearance(dark = DarkMode.LIGHT), TABLET, 1f, "notebooks")
            out += arrayOf("search_tablet_study_desk", Appearance.defaultsFor(Preset.STUDY_DESK).copy(dark = DarkMode.LIGHT), TABLET, 1f, "search")
            out += arrayOf("notebooks_large_text_high_contrast", Appearance.defaultsFor(Preset.HIGH_CONTRAST).copy(dark = DarkMode.LIGHT, fontScale = 1.3f), PHONE, 1.5f, "notebooks")
            out += arrayOf("search_zing_classic_light", Appearance(dark = DarkMode.LIGHT), PHONE, 1f, "search")
            out += arrayOf("search_midnight", Appearance.defaultsFor(Preset.MIDNIGHT), PHONE, 1f, "search")
            out += arrayOf("home_offline_zing_classic", Appearance(dark = DarkMode.LIGHT), PHONE, 1f, "home-offline")
            out += arrayOf("appearance_focus_dark", Appearance.defaultsFor(Preset.FOCUS).copy(dark = DarkMode.DARK), PHONE, 1f, "appearance")
            return out
        }
    }
}
