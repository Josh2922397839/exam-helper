package com.josh.zing.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.Text
import androidx.compose.material3.adaptive.currentWindowAdaptiveInfo
import androidx.compose.material3.adaptive.navigationsuite.NavigationSuiteScaffold
import androidx.compose.material3.adaptive.navigationsuite.NavigationSuiteScaffoldDefaults
import androidx.compose.material3.adaptive.navigationsuite.NavigationSuiteType
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavDestination.Companion.hasRoute
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.toRoute
import app.zing.core.account.DeepLink
import app.zing.core.theme.NavLayout
import com.josh.zing.ui.components.LocalApp
import com.josh.zing.ui.components.Page
import com.josh.zing.ui.screens.AccountScreen
import com.josh.zing.ui.screens.AppearanceScreen
import com.josh.zing.ui.screens.EditProfileScreen
import com.josh.zing.ui.screens.FlashcardsScreen
import com.josh.zing.ui.screens.HomeScreen
import com.josh.zing.ui.screens.ImportScreen
import com.josh.zing.ui.screens.LeagueScreen
import com.josh.zing.ui.screens.NoteEditorScreen
import com.josh.zing.ui.screens.NotebookScreen
import com.josh.zing.ui.screens.NotebooksScreen
import com.josh.zing.ui.screens.PlusScreen
import com.josh.zing.ui.screens.ProfileScreen
import com.josh.zing.ui.screens.QuizScreen
import com.josh.zing.ui.screens.SchoolScreen
import com.josh.zing.ui.screens.SearchScreen
import com.josh.zing.ui.screens.SettingsScreen
import com.josh.zing.ui.screens.SetupScreen
import com.josh.zing.ui.screens.SharedDeckScreen
import com.josh.zing.ui.screens.WelcomeScreen
import com.josh.zing.ui.theme.LocalZing
import com.josh.zing.ui.theme.NavIcon
import com.josh.zing.ui.theme.navIcon
import kotlinx.serialization.Serializable

// ---- destinations (the arguments survive the app being closed in the background)
@Serializable object HomeRoute
@Serializable object NotebooksRoute
@Serializable data class SearchRoute(val notebookId: String? = null, val q: String = "", val pushed: Boolean = false)
@Serializable object LeagueRoute
@Serializable object MeRoute
@Serializable data class NotebookRoute(val id: String)
@Serializable data class NoteRoute(val deckId: String, val noteId: String? = null)
@Serializable data class FlashcardsRoute(val deckId: String, val level: Int = 0)
@Serializable data class QuizRoute(val deckId: String, val level: Int = 0)
@Serializable data class ImportRoute(val deckId: String? = null, val text: String = "")
@Serializable data class ProfileRoute(val username: String)
@Serializable data class SchoolRoute(val id: Long)
@Serializable data class SharedRoute(val id: String? = null, val code: String? = null)
@Serializable object AppearanceRoute
@Serializable object AccountRoute
@Serializable object PlusRoute
@Serializable object EditProfileRoute

private data class Tab(val route: Any, val label: String, val icon: NavIcon, val tag: String)

private val TABS = listOf(
    Tab(HomeRoute, "Home", NavIcon.HOME, "tabHome"), Tab(NotebooksRoute, "Notebooks", NavIcon.NOTEBOOKS, "tabNotebooks"),
    Tab(SearchRoute(), "Search", NavIcon.SEARCH, "tabSearch"), Tab(LeagueRoute, "League", NavIcon.LEAGUE, "tabLeague"), Tab(MeRoute, "Me", NavIcon.ME, "tabMe"),
)

/** The whole app: which part to show (sign-in, setup or the main app), messages at the bottom, and links from outside. */
@Composable
fun ZingRoot(app: AppViewModel) {
    val gate by app.gate.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }
    LaunchedEffect(Unit) {
        app.notices.collect { n ->
            snackbar.currentSnackbarData?.dismiss()
            val result = snackbar.showSnackbar(n.text, n.action, withDismissAction = n.action == null, duration = if (n.action != null) SnackbarDuration.Long else SnackbarDuration.Short)
            if (result == SnackbarResult.ActionPerformed) n.onAction?.invoke()
        }
    }
    CompositionLocalProvider(LocalApp provides app) {
        Box(Modifier.fillMaxSize()) {
            when (gate) {
                Gate.LOADING -> Page { }
                Gate.WELCOME -> WelcomeScreen()
                Gate.SETUP -> SetupScreen(invitedBy = (app.link.collectAsStateWithLifecycle().value as? DeepLink.Invite)?.username)
                Gate.MAIN -> MainNav(app)
            }
            SnackbarHost(snackbar, Modifier.align(Alignment.BottomCenter).navigationBarsPadding().imePadding().padding(bottom = 72.dp).testTag("snackbar"))
        }
    }
}

private fun NavHostController.tab(route: Any) = navigate(route) {
    popUpTo(graph.findStartDestination().id) { saveState = true }
    launchSingleTop = true
    restoreState = true
}

@Composable
private fun MainNav(app: AppViewModel) {
    val nav = rememberNavController()
    val entry by nav.currentBackStackEntryAsState()
    val style = LocalZing.current
    val link by app.link.collectAsStateWithLifecycle()
    val prefs by app.prefs.collectAsStateWithLifecycle()

    // a link that was waiting for sign-in and setup to finish
    LaunchedEffect(link) {
        when (val l = link) {
            is DeepLink.ImportDeck -> nav.navigate(SharedRoute(code = l.code))
            is DeepLink.SharedDeck -> nav.navigate(SharedRoute(id = l.id))
            is DeepLink.Profile -> nav.navigate(ProfileRoute(l.username))
            is DeepLink.School -> nav.navigate(SchoolRoute(l.id))
            else -> Unit
        }
        if (link != null) app.linkHandled()
    }

    val layout = when (style.appearance.nav) {
        NavLayout.BAR -> NavigationSuiteType.NavigationBar
        NavLayout.RAIL -> NavigationSuiteType.NavigationRail
        NavLayout.AUTO -> NavigationSuiteScaffoldDefaults.calculateFromAdaptiveInfo(currentWindowAdaptiveInfo())
    }
    val top = TABS.firstOrNull { t -> entry?.destination?.hasRoute(t.route::class) == true }
    val showNav = top != null && (entry?.destination?.hasRoute(SearchRoute::class) != true || entry?.toRoute<SearchRoute>()?.pushed != true)

    NavigationSuiteScaffold(
        layoutType = if (showNav) layout else NavigationSuiteType.None,
        navigationSuiteItems = {
            TABS.forEach { t ->
                item(selected = top == t, onClick = { nav.tab(t.route) }, icon = { Icon(navIcon(t.icon), null) }, label = { Text(t.label) }, modifier = Modifier.testTag(t.tag))
            }
        },
    ) {
        val leaveSetupLater = { app.notify("Open Me → Sign in when you're online to make your account.") }
        NavHost(nav, startDestination = HomeRoute, modifier = Modifier.fillMaxSize()) {
            composable<HomeRoute> {
                HomeScreen(onNotebook = { nav.navigate(NotebookRoute(it)) }, onNotebooks = { nav.tab(NotebooksRoute) }, onSearch = { nav.tab(SearchRoute()) }, onImport = { nav.navigate(ImportRoute()) }, onFlashcards = { nav.navigate(FlashcardsRoute(it)) })
            }
            composable<NotebooksRoute> { NotebooksScreen(onOpen = { nav.navigate(NotebookRoute(it)) }, onSearch = { nav.tab(SearchRoute()) }, onImport = { nav.navigate(ImportRoute()) }) }
            composable<SearchRoute> { e ->
                val r = e.toRoute<SearchRoute>()
                SearchScreen(r.notebookId, r.q, onBack = if (r.pushed) ({ nav.popBackStack(); Unit }) else null, onOpenNote = { d, n -> nav.navigate(NoteRoute(d, n)) }, onMakeCards = { text -> nav.navigate(ImportRoute(r.notebookId, text)) })
            }
            composable<LeagueRoute> { LeagueScreen(onProfile = { nav.navigate(ProfileRoute(it)) }, onSchool = { nav.navigate(SchoolRoute(it)) }, onSignIn = { nav.tab(MeRoute) }) }
            composable<MeRoute> {
                SettingsScreen(onAppearance = { nav.navigate(AppearanceRoute) }, onAccount = { nav.navigate(AccountRoute) }, onPlus = { nav.navigate(PlusRoute) }, onEditProfile = { nav.navigate(EditProfileRoute) },
                    onSignIn = { if (prefs.setupLater) app.leaveLocalOnly() else leaveSetupLater() })
            }
            composable<NotebookRoute> { e ->
                val id = e.toRoute<NotebookRoute>().id
                NotebookScreen(id, onBack = { nav.popBackStack() }, onOpenNote = { nav.navigate(NoteRoute(id, it)) }, onOpenBook = { nav.navigate(NotebookRoute(it)) }, onSearch = { nav.navigate(SearchRoute(notebookId = id, pushed = true)) },
                    onFlashcards = { nav.navigate(FlashcardsRoute(id, it)) }, onQuiz = { nav.navigate(QuizRoute(id, it)) }, onImport = { nav.navigate(ImportRoute(id)) })
            }
            composable<NoteRoute> { e ->
                val r = e.toRoute<NoteRoute>()
                NoteEditorScreen(r.deckId, r.noteId, onBack = { nav.popBackStack() }, onMakeCards = { text -> nav.navigate(ImportRoute(r.deckId, text.take(20_000))) })
            }
            composable<FlashcardsRoute> { e -> val r = e.toRoute<FlashcardsRoute>(); FlashcardsScreen(r.deckId, r.level, onBack = { nav.popBackStack() }, onQuiz = { nav.navigate(QuizRoute(r.deckId, r.level)) { popUpTo<FlashcardsRoute> { inclusive = true } } }) }
            composable<QuizRoute> { e -> val r = e.toRoute<QuizRoute>(); QuizScreen(r.deckId, r.level, onBack = { nav.popBackStack() }) }
            composable<ImportRoute> { e ->
                val r = e.toRoute<ImportRoute>()
                ImportScreen(r.deckId, r.text, onBack = { nav.popBackStack() },
                    onStartQuiz = { nav.navigate(QuizRoute(it)) { popUpTo<ImportRoute> { inclusive = true } } }, onOpenDeck = { nav.navigate(NotebookRoute(it)) { popUpTo<ImportRoute> { inclusive = true } } })
            }
            composable<ProfileRoute> { e -> ProfileScreen(e.toRoute<ProfileRoute>().username, onBack = { nav.popBackStack() }, onSchool = { nav.navigate(SchoolRoute(it)) }) }
            composable<SchoolRoute> { e -> SchoolScreen(e.toRoute<SchoolRoute>().id, onBack = { nav.popBackStack() }, onProfile = { nav.navigate(ProfileRoute(it)) }, onShared = { nav.navigate(SharedRoute(id = it)) }) }
            composable<SharedRoute> { e ->
                val r = e.toRoute<SharedRoute>()
                val target: DeepLink = r.id?.let { DeepLink.SharedDeck(it) } ?: DeepLink.ImportDeck(r.code.orEmpty())
                SharedDeckScreen(target, onBack = { nav.popBackStack() }, onOpen = { nav.navigate(NotebookRoute(it)) { popUpTo<SharedRoute> { inclusive = true } } })
            }
            composable<AppearanceRoute> { AppearanceScreen(onBack = { nav.popBackStack() }) }
            composable<AccountRoute> { AccountScreen(onBack = { nav.popBackStack() }) }
            composable<PlusRoute> { PlusScreen(onBack = { nav.popBackStack() }) }
            composable<EditProfileRoute> { EditProfileScreen(onBack = { nav.popBackStack() }) }
        }
    }
}
