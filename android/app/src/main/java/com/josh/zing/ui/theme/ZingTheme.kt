package com.josh.zing.ui.theme

import android.content.Context
import android.os.PowerManager
import android.provider.Settings
import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.remember
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import app.zing.core.theme.Appearance
import app.zing.core.theme.BackgroundStyle
import app.zing.core.theme.IconStyle
import app.zing.core.theme.Motion
import app.zing.core.theme.Palette
import app.zing.core.theme.ResolvedTheme
import app.zing.core.theme.Themes
import com.josh.zing.R

fun rgb(value: Int): Color = Color(0xFF000000 or (value.toLong() and 0xFFFFFF))

/** What the rest of the UI reads besides Material's own theme: spacing, motion and the student's choices. */
@Immutable
data class ZingStyle(
    val appearance: Appearance = Appearance(),
    val palette: Palette = Themes.base(app.zing.core.theme.Preset.ZING_CLASSIC, false),
    /** One spacing step; 8dp, or smaller in the compact density. */
    val unit: Dp = 8.dp,
    /** False when the student, the system ("remove animations") or battery saver asks for less movement. */
    val animate: Boolean = true,
    val accentAdjusted: Boolean = false,
) {
    val icons: IconStyle get() = appearance.icons
    val showProgress: Boolean get() = appearance.showProgress
    fun space(steps: Float): Dp = unit * steps
}

val LocalZing = staticCompositionLocalOf { ZingStyle() }

@OptIn(ExperimentalTextApi::class)
private fun variable(res: Int, weight: Int) = Font(res, FontWeight(weight), variationSettings = FontVariation.Settings(FontVariation.weight(weight)))

/** Zing's two typefaces (both under the Open Font Licence; see assets/licenses). */
private val Display = FontFamily(variable(R.font.bricolage_grotesque, 600), variable(R.font.bricolage_grotesque, 700), variable(R.font.bricolage_grotesque, 800))
private val Body = FontFamily(variable(R.font.figtree, 400), variable(R.font.figtree, 500), variable(R.font.figtree, 600), variable(R.font.figtree, 700))

private fun typography(): Typography {
    val base = Typography()
    fun TextStyle.display(weight: Int = 700) = copy(fontFamily = Display, fontWeight = FontWeight(weight))
    fun TextStyle.body(weight: Int? = null) = copy(fontFamily = Body, fontWeight = weight?.let(::FontWeight) ?: fontWeight)
    return Typography(
        displayLarge = base.displayLarge.display(800), displayMedium = base.displayMedium.display(800), displaySmall = base.displaySmall.display(800),
        headlineLarge = base.headlineLarge.display(), headlineMedium = base.headlineMedium.display(), headlineSmall = base.headlineSmall.display(),
        titleLarge = base.titleLarge.display(), titleMedium = base.titleMedium.body(700), titleSmall = base.titleSmall.body(700),
        bodyLarge = base.bodyLarge.body(), bodyMedium = base.bodyMedium.body(), bodySmall = base.bodySmall.body(),
        labelLarge = base.labelLarge.body(700), labelMedium = base.labelMedium.body(600), labelSmall = base.labelSmall.body(600),
    )
}

private fun scheme(p: Palette): ColorScheme {
    val bg = rgb(p.background); val surface = rgb(p.surface); val alt = rgb(p.surfaceAlt); val text = rgb(p.text)
    val accent = rgb(p.accent); val second = rgb(p.second)
    val base = if (p.dark) darkColorScheme() else lightColorScheme()
    return base.copy(
        primary = accent, onPrimary = rgb(p.onAccent), primaryContainer = lerp(surface, accent, 0.16f), onPrimaryContainer = text,
        secondary = second, onSecondary = rgb(p.onSecond), secondaryContainer = lerp(surface, second, 0.2f), onSecondaryContainer = text,
        tertiary = rgb(p.success), onTertiary = if (p.dark) Color.Black else Color.White, tertiaryContainer = lerp(surface, rgb(p.success), 0.16f), onTertiaryContainer = text,
        background = bg, onBackground = text, surface = surface, onSurface = text, surfaceVariant = alt, onSurfaceVariant = rgb(p.textMuted),
        surfaceTint = accent, inverseSurface = text, inverseOnSurface = bg, inversePrimary = lerp(accent, bg, 0.5f),
        outline = rgb(p.outline), outlineVariant = lerp(rgb(p.outline), surface, 0.45f),
        error = rgb(p.error), onError = rgb(p.onError), errorContainer = lerp(surface, rgb(p.error), 0.14f), onErrorContainer = text,
        surfaceBright = surface, surfaceDim = alt, surfaceContainerLowest = surface, surfaceContainerLow = surface,
        surfaceContainer = lerp(surface, alt, 0.5f), surfaceContainerHigh = alt, surfaceContainerHighest = alt, scrim = Color.Black,
    )
}

/** True when Android is set to remove animations, or battery saver is on. */
private fun systemWantsLessMotion(context: Context): Boolean {
    val scale = runCatching { Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) }.getOrDefault(1f)
    val saver = runCatching { (context.getSystemService(Context.POWER_SERVICE) as? PowerManager)?.isPowerSaveMode == true }.getOrDefault(false)
    return scale == 0f || saver
}

/**
 * Applies the student's appearance. The colours come from [Themes.resolve], which has already made sure every
 * combination is readable. The system's font size is always respected; the student's own scale multiplies it.
 */
@Composable
fun ZingTheme(appearance: Appearance = Appearance(), systemDark: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    val resolved: ResolvedTheme = remember(appearance, systemDark) { Themes.resolve(appearance, systemDark) }
    val context = LocalContext.current
    val calm = remember(context) { systemWantsLessMotion(context) }
    val style = ZingStyle(
        appearance = resolved.appearance, palette = resolved.palette, unit = 8.dp * resolved.appearance.density.scale,
        animate = resolved.appearance.motion == Motion.FULL && !calm, accentAdjusted = resolved.accentAdjusted,
    )
    val radius = resolved.appearance.cardShape.radiusDp
    val shapes = Shapes(
        extraSmall = RoundedCornerShape((radius / 3).dp), small = RoundedCornerShape((radius / 2).dp), medium = RoundedCornerShape((radius * 3 / 4).dp),
        large = RoundedCornerShape(radius.dp), extraLarge = RoundedCornerShape((radius * 5 / 4).dp),
    )
    val density = LocalDensity.current
    CompositionLocalProvider(
        LocalZing provides style,
        LocalDensity provides Density(density.density, density.fontScale * resolved.appearance.fontScale),
    ) {
        MaterialTheme(colorScheme = remember(resolved.palette) { scheme(resolved.palette) }, typography = remember { typography() }, shapes = shapes, content = content)
    }
}

/** The page background in the style the student chose: plain, a soft paper wash, or a dot grid. */
@Composable
fun Modifier.zingBackground(): Modifier {
    val style = LocalZing.current
    val bg = MaterialTheme.colorScheme.background
    val alt = MaterialTheme.colorScheme.surfaceVariant
    return when (style.appearance.background) {
        BackgroundStyle.PLAIN -> background(bg)
        BackgroundStyle.PAPER -> background(Brush.verticalGradient(listOf(bg, lerp(bg, alt, 0.55f))))
        BackgroundStyle.DOTS -> background(bg).drawBehind {
            val step = 22.dp.toPx()
            val dot = lerp(bg, alt, 0.9f)
            var y = step / 2
            while (y < size.height) { var x = step / 2; while (x < size.width) { drawCircle(dot, 1.4.dp.toPx(), Offset(x, y)); x += step }; y += step }
        }
    }
}
