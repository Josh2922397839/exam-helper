package app.zing.core.theme

import kotlinx.serialization.Serializable
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.roundToInt

enum class Preset(val label: String, val blurb: String) {
    ZING_CLASSIC("Zing Classic", "Cream paper, deep green and sun gold"),
    STUDY_DESK("Study Desk", "Warm wood and notebook blue"),
    FOCUS("Focus Mode", "Quiet greys, fewer distractions"),
    MIDNIGHT("Midnight", "Easy on the eyes after dark"),
    HIGH_CONTRAST("High Contrast", "The strongest text and outlines"),
}

enum class DarkMode { SYSTEM, LIGHT, DARK }
enum class BackgroundStyle(val label: String) { PLAIN("Plain"), PAPER("Paper"), DOTS("Dot grid") }
enum class CardShape(val label: String, val radiusDp: Int) { SOFT("Soft", 16), ROUND("Round", 26), SQUARE("Square", 6) }
enum class Density(val label: String, val scale: Float) { COMFORTABLE("Comfortable", 1f), COMPACT("Compact", 0.8f) }
enum class NavLayout(val label: String) { AUTO("Automatic"), BAR("Bottom bar"), RAIL("Side rail") }
enum class IconStyle(val label: String) { FILLED("Filled"), OUTLINED("Outlined"), ROUNDED("Rounded") }
enum class Motion(val label: String) { FULL("Full"), REDUCED("Reduced"), OFF("Off") }

/** Everything a student can change about how Zing looks. Saved on the device and (with the migration) to their account. */
@Serializable
data class Appearance(
    val preset: Preset = Preset.ZING_CLASSIC,
    val dark: DarkMode = DarkMode.SYSTEM,
    /** "#rrggbb", or null for the preset's own accent. */
    val accent: String? = null,
    val background: BackgroundStyle = BackgroundStyle.PLAIN,
    val cardShape: CardShape = CardShape.SOFT,
    val density: Density = Density.COMFORTABLE,
    /** Multiplies the system font size (which is always respected). */
    val fontScale: Float = 1f,
    val nav: NavLayout = NavLayout.AUTO,
    val icons: IconStyle = IconStyle.ROUNDED,
    val motion: Motion = Motion.FULL,
    val showProgress: Boolean = true,
) {
    fun sane(): Appearance = copy(
        accent = accent?.takeIf { HEX.matches(it) }?.lowercase(),
        fontScale = fontScale.takeIf { it.isFinite() }?.coerceIn(MIN_FONT, MAX_FONT) ?: 1f,
    )

    /** Back to the preset as designed, keeping only the light/dark choice. */
    fun reset(): Appearance = defaultsFor(preset).copy(dark = dark)

    companion object {
        const val MIN_FONT = 0.85f
        const val MAX_FONT = 1.3f
        private val HEX = Regex("^#[0-9a-fA-F]{6}$")
        val ACCENTS = listOf("#0a7550", "#ff5e4d", "#ff8a1f", "#c98f0c", "#3a8dff", "#6c6cff", "#b46cff", "#f25ca8", "#14b8a6")

        fun defaultsFor(p: Preset): Appearance = when (p) {
            Preset.ZING_CLASSIC -> Appearance(p)
            Preset.STUDY_DESK -> Appearance(p, background = BackgroundStyle.PAPER, cardShape = CardShape.SOFT)
            Preset.FOCUS -> Appearance(p, motion = Motion.REDUCED, showProgress = false, cardShape = CardShape.SQUARE, icons = IconStyle.OUTLINED, density = Density.COMPACT)
            Preset.MIDNIGHT -> Appearance(p, dark = DarkMode.DARK)
            Preset.HIGH_CONTRAST -> Appearance(p, cardShape = CardShape.SQUARE, icons = IconStyle.FILLED, motion = Motion.REDUCED)
        }
    }
}

/** Colours as 0xRRGGBB. */
data class Palette(
    val background: Int, val surface: Int, val surfaceAlt: Int, val outline: Int,
    val text: Int, val textMuted: Int,
    val accent: Int, val onAccent: Int,
    val second: Int, val onSecond: Int,
    val nav: Int, val onNav: Int,
    val error: Int, val onError: Int,
    val success: Int,
    val dark: Boolean,
)

data class ContrastIssue(val what: String, val ratio: Double, val needed: Double)

/** The theme after the student's choices are applied and checked. */
data class ResolvedTheme(val palette: Palette, val appearance: Appearance, val accentAdjusted: Boolean, val issues: List<ContrastIssue>)

/** WCAG 2 contrast maths. */
object Contrast {
    const val TEXT = 4.5
    const val LARGE = 3.0
    const val STRONG = 7.0

    fun parse(hex: String): Int = hex.removePrefix("#").toInt(16)
    fun hex(rgb: Int): String = "#%06x".format(rgb and 0xFFFFFF)

    private fun channel(v: Int): Double { val c = v / 255.0; return if (c <= 0.03928) c / 12.92 else ((c + 0.055) / 1.055).pow(2.4) }

    fun luminance(rgb: Int): Double = 0.2126 * channel((rgb shr 16) and 255) + 0.7152 * channel((rgb shr 8) and 255) + 0.0722 * channel(rgb and 255)

    fun ratio(a: Int, b: Int): Double { val x = luminance(a); val y = luminance(b); return (max(x, y) + 0.05) / (min(x, y) + 0.05) }

    /** Black or white, whichever is easier to read on [background]. */
    fun on(background: Int): Int = if (ratio(0x000000, background) >= ratio(0xFFFFFF, background)) 0x10241C.takeIf { ratio(it, background) >= TEXT } ?: 0x000000 else 0xFFFFFF

    private fun mix(a: Int, b: Int, t: Double): Int {
        fun ch(shift: Int) = (((a shr shift) and 255) * (1 - t) + ((b shr shift) and 255) * t).roundToInt().coerceIn(0, 255)
        return (ch(16) shl 16) or (ch(8) shl 8) or ch(0)
    }

    /**
     * Nudges [color] towards black or white (whichever helps) just far enough to reach [needed] contrast against
     * every colour in [against]. Returns the colour unchanged when it already passes.
     */
    fun readable(color: Int, against: List<Int>, needed: Double): Int {
        if (against.all { ratio(color, it) >= needed }) return color
        val target = if (against.sumOf { luminance(it) } / against.size > 0.4) 0x000000 else 0xFFFFFF
        for (step in 1..20) {
            val c = mix(color, target, step / 20.0)
            if (against.all { ratio(c, it) >= needed }) return c
        }
        return target
    }
}

object Themes {
    private fun p(bg: Int, surface: Int, alt: Int, outline: Int, text: Int, muted: Int, accent: Int, second: Int, nav: Int, onNav: Int, dark: Boolean) = Palette(
        bg, surface, alt, outline, text, muted, accent, Contrast.on(accent), second, Contrast.on(second), nav, onNav,
        error = if (dark) 0xFF8A80 else 0xB3261E, onError = if (dark) 0x3B0A06 else 0xFFFFFF, success = if (dark) 0x6EE7A8 else 0x0A7550, dark = dark,
    )

    /**
     * The designed colours of each preset. Zing Classic is the website's own palette (assets/css/zing.css), with one
     * change: the light accent is Zing's darker green (#0a7550, the site's "--xp-ink") instead of #0b8a5e, because
     * the brighter green is only 3.9:1 against the cream background and accent-coloured text needs 4.5:1.
     */
    fun base(preset: Preset, dark: Boolean): Palette = when (preset) {
        Preset.ZING_CLASSIC -> if (!dark) p(0xF4F1E8, 0xFFFDF8, 0xEFE9DC, 0xD4CAB5, 0x10241C, 0x3D5046, 0x0A7550, 0xFFC23C, 0x0F2A20, 0xFDFBF5, false)
        else p(0x0A1410, 0x11201A, 0x1F352B, 0x35493F, 0xECF6EF, 0xB3C7BA, 0x35C48C, 0xFFC23C, 0x0C1E17, 0xECF6EF, true)
        Preset.STUDY_DESK -> if (!dark) p(0xF3EADB, 0xFFFAF0, 0xEADCC6, 0xC9B79A, 0x2B2118, 0x5A4A3A, 0x2F5FA8, 0xC8782A, 0x3A2A1C, 0xFFF6E8, false)
        else p(0x17120D, 0x221A13, 0x30251B, 0x4A3A2B, 0xF5EBDD, 0xCDBBA4, 0x86B0F0, 0xE7A260, 0x120E0A, 0xF5EBDD, true)
        Preset.FOCUS -> if (!dark) p(0xF6F6F4, 0xFFFFFF, 0xECECE8, 0xCFCFC8, 0x1B1C1A, 0x555851, 0x3F5B52, 0x6B6F66, 0xFFFFFF, 0x1B1C1A, false)
        else p(0x111211, 0x1A1B1A, 0x252725, 0x3C3F3B, 0xE9EAE6, 0xB1B4AD, 0x9CC4B6, 0xA9ADA4, 0x1A1B1A, 0xE9EAE6, true)
        Preset.MIDNIGHT -> p(0x070B14, 0x0F1522, 0x182033, 0x2A3550, 0xE8EEFB, 0xAAB6D1, 0x8FB4FF, 0xC7A6FF, 0x0B101B, 0xE8EEFB, true)
        Preset.HIGH_CONTRAST -> if (!dark) p(0xFFFFFF, 0xFFFFFF, 0xF0F0F0, 0x000000, 0x000000, 0x1F1F1F, 0x004D32, 0x7A3E00, 0x000000, 0xFFFFFF, false)
        else p(0x000000, 0x000000, 0x161616, 0xFFFFFF, 0xFFFFFF, 0xE6E6E6, 0x7DFFC4, 0xFFD166, 0x000000, 0xFFFFFF, true)
    }

    fun isDark(a: Appearance, systemDark: Boolean): Boolean = when {
        a.preset == Preset.MIDNIGHT -> true
        a.dark == DarkMode.SYSTEM -> systemDark
        else -> a.dark == DarkMode.DARK
    }

    /**
     * Applies the student's accent to the preset and makes sure it can be read: an accent that is too faint against
     * the background is shifted until it passes (and [ResolvedTheme.accentAdjusted] says so), so no combination of
     * settings can make text or buttons disappear.
     */
    fun resolve(appearance: Appearance, systemDark: Boolean): ResolvedTheme {
        val a = appearance.sane()
        val dark = isDark(a, systemDark)
        val base = base(a.preset, dark)
        var palette = base
        var adjusted = false
        a.accent?.let { hex ->
            val wanted = Contrast.parse(hex)
            // buttons, links and selected items sit on the background and on cards: both must pass
            val needed = if (a.preset == Preset.HIGH_CONTRAST) Contrast.STRONG else Contrast.TEXT
            val safe = Contrast.readable(wanted, listOf(base.background, base.surface, base.surfaceAlt), needed)
            adjusted = safe != wanted
            palette = base.copy(accent = safe, onAccent = Contrast.on(safe))
        }
        return ResolvedTheme(palette, a, adjusted, validate(palette, a.preset))
    }

    /** Every pair of colours that carries text, with the contrast it must reach. An empty list means all pass. */
    fun validate(p: Palette, preset: Preset): List<ContrastIssue> {
        val body = if (preset == Preset.HIGH_CONTRAST) Contrast.STRONG else Contrast.TEXT
        val checks = listOf(
            Triple("Text on the background", p.text to p.background, body),
            Triple("Text on cards", p.text to p.surface, body),
            Triple("Text on tinted cards", p.text to p.surfaceAlt, body),
            Triple("Small text on the background", p.textMuted to p.background, Contrast.TEXT),
            Triple("Small text on cards", p.textMuted to p.surface, Contrast.TEXT),
            Triple("Accent on the background", p.accent to p.background, Contrast.TEXT),
            Triple("Accent on cards", p.accent to p.surface, Contrast.TEXT),
            Triple("Button labels", p.onAccent to p.accent, Contrast.TEXT),
            Triple("Second colour labels", p.onSecond to p.second, Contrast.TEXT),
            Triple("Navigation labels", p.onNav to p.nav, Contrast.TEXT),
            Triple("Error text", p.error to p.surface, Contrast.TEXT),
            Triple("Outlines", p.outline to p.surface, if (preset == Preset.HIGH_CONTRAST) Contrast.LARGE else 1.2),
        )
        return checks.mapNotNull { (what, pair, needed) -> Contrast.ratio(pair.first, pair.second).takeIf { it < needed }?.let { ContrastIssue(what, it, needed) } }
    }
}
