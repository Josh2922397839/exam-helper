package com.josh.zing.ui.theme

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.automirrored.outlined.MenuBook
import androidx.compose.material.icons.automirrored.rounded.MenuBook
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.rounded.EmojiEvents
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.Search
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.vector.ImageVector
import app.zing.core.theme.IconStyle

/** The navigation icons in the three styles a student can pick. */
enum class NavIcon { HOME, NOTEBOOKS, SEARCH, LEAGUE, ME }

@Composable
fun navIcon(icon: NavIcon): ImageVector = when (LocalZing.current.icons) {
    IconStyle.FILLED -> when (icon) {
        NavIcon.HOME -> Icons.Filled.Home; NavIcon.NOTEBOOKS -> Icons.AutoMirrored.Filled.MenuBook; NavIcon.SEARCH -> Icons.Filled.Search
        NavIcon.LEAGUE -> Icons.Filled.EmojiEvents; NavIcon.ME -> Icons.Filled.Person
    }
    IconStyle.OUTLINED -> when (icon) {
        NavIcon.HOME -> Icons.Outlined.Home; NavIcon.NOTEBOOKS -> Icons.AutoMirrored.Outlined.MenuBook; NavIcon.SEARCH -> Icons.Outlined.Search
        NavIcon.LEAGUE -> Icons.Outlined.EmojiEvents; NavIcon.ME -> Icons.Outlined.Person
    }
    IconStyle.ROUNDED -> when (icon) {
        NavIcon.HOME -> Icons.Rounded.Home; NavIcon.NOTEBOOKS -> Icons.AutoMirrored.Rounded.MenuBook; NavIcon.SEARCH -> Icons.Rounded.Search
        NavIcon.LEAGUE -> Icons.Rounded.EmojiEvents; NavIcon.ME -> Icons.Rounded.Person
    }
}
