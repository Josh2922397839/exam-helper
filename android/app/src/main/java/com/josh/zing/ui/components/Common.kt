package com.josh.zing.ui.components

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.CreationExtras
import androidx.lifecycle.viewmodel.compose.viewModel
import app.zing.core.model.Limits
import coil3.compose.AsyncImage
import com.josh.zing.AppContainer
import com.josh.zing.data.remote.SchoolDto
import com.josh.zing.ui.theme.LocalZing
import com.josh.zing.ui.theme.zingBackground

val LocalContainer = staticCompositionLocalOf<AppContainer> { error("No AppContainer") }

/** A ViewModel built from the app container (and, when needed, the saved state that survives process death). */
@Composable
inline fun <reified VM : ViewModel> zingViewModel(key: String? = null, crossinline create: (AppContainer) -> VM): VM {
    val container = LocalContainer.current
    return viewModel(key = key, factory = object : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>, extras: CreationExtras): T = create(container) as T
    })
}

fun parseColor(hex: String?): Color = runCatching { Color(0xFF000000 or hex!!.removePrefix("#").toLong(16)) }.getOrDefault(Color(0xFF0B8A5E))

/** Black or white, whichever reads better on [background]. */
fun onColor(background: Color): Color = if (background.luminance() > 0.45f) Color(0xFF10241C) else Color.White

/** Page content: the chosen background, and a comfortable reading width on tablets and in landscape. */
@Composable
fun Page(modifier: Modifier = Modifier, maxWidth: Dp = 840.dp, content: @Composable BoxScope.() -> Unit) {
    Box(modifier.fillMaxSize().zingBackground(), contentAlignment = Alignment.TopCenter) {
        Box(Modifier.widthIn(max = maxWidth).fillMaxSize(), content = content)
    }
}

@Composable
fun SectionTitle(text: String, modifier: Modifier = Modifier, action: (@Composable () -> Unit)? = null) {
    Row(modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(text, style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f).semantics { heading() })
        action?.invoke()
    }
}

/** A Fluent Emoji 3D picture shipped with the app (the same ones the website uses). Decorative unless described. */
@Composable
fun Art(name: String, size: Dp, modifier: Modifier = Modifier, description: String? = null) {
    AsyncImage(
        model = "file:///android_asset/3d/$name.webp", contentDescription = description, contentScale = ContentScale.Fit,
        modifier = modifier.size(size).then(if (description == null) Modifier.clearAndSetSemantics { } else Modifier),
    )
}

@Composable
fun EmptyState(art: String, title: String, body: String, modifier: Modifier = Modifier, actionLabel: String? = null, onAction: (() -> Unit)? = null) {
    Column(modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Art(art, 84.dp)
        Text(title, style = MaterialTheme.typography.titleLarge, textAlign = TextAlign.Center, modifier = Modifier.semantics { heading() })
        Text(body, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
        if (actionLabel != null && onAction != null) Button(onClick = onAction) { Text(actionLabel) }
    }
}

@Composable
fun MessageCard(text: String, modifier: Modifier = Modifier, error: Boolean = false, actionLabel: String? = null, onAction: (() -> Unit)? = null) {
    val scheme = MaterialTheme.colorScheme
    Surface(color = if (error) scheme.errorContainer else scheme.secondaryContainer, shape = MaterialTheme.shapes.medium, modifier = modifier.fillMaxWidth()) {
        Row(Modifier.padding(horizontal = 14.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(text, style = MaterialTheme.typography.bodyMedium, color = if (error) scheme.onErrorContainer else scheme.onSecondaryContainer, modifier = Modifier.weight(1f))
            if (actionLabel != null && onAction != null) TextButton(onClick = onAction) { Text(actionLabel) }
        }
    }
}

/** Grey placeholder rows shown while something loads. They stay still when motion is reduced. */
@Composable
fun Skeleton(rows: Int = 5, modifier: Modifier = Modifier) {
    val animate = LocalZing.current.animate
    val alpha = if (animate) {
        val t = rememberInfiniteTransition(label = "skeleton")
        val a by t.animateFloat(0.35f, 0.8f, infiniteRepeatable(tween(800), RepeatMode.Reverse), label = "alpha")
        a
    } else 0.5f
    Column(modifier.fillMaxWidth().semantics { contentDescription = "Loading" }, verticalArrangement = Arrangement.spacedBy(10.dp)) {
        repeat(rows) { Box(Modifier.fillMaxWidth().height(56.dp).alpha(alpha).clip(MaterialTheme.shapes.medium).background(MaterialTheme.colorScheme.surfaceVariant)) }
    }
}

/** Text with the matching words marked. Ranges outside the text are ignored. */
@Composable
fun HighlightedText(text: String, highlights: List<IntRange>, modifier: Modifier = Modifier, style: TextStyle = MaterialTheme.typography.bodyMedium, maxLines: Int = Int.MAX_VALUE) {
    val scheme = MaterialTheme.colorScheme
    val mark = SpanStyle(background = scheme.secondaryContainer, color = scheme.onSecondaryContainer, fontWeight = FontWeight.Bold)
    Text(buildAnnotatedString {
        append(text)
        highlights.forEach { r -> if (r.first >= 0 && r.last < text.length && r.first <= r.last) addStyle(mark, r.first, r.last + 1) }
    }, modifier = modifier, style = style, maxLines = maxLines, overflow = TextOverflow.Ellipsis)
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ColorSwatches(selected: String?, onSelect: (String) -> Unit, modifier: Modifier = Modifier, colors: List<String> = Limits.COLORS, names: List<String> = Limits.COLOR_NAMES) {
    FlowRow(modifier, horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        colors.forEachIndexed { i, hex ->
            val isSelected = hex.equals(selected, ignoreCase = true)
            val c = parseColor(hex)
            Box(
                Modifier.size(48.dp).selectable(isSelected, role = Role.RadioButton) { onSelect(hex) }
                    .semantics { contentDescription = names.getOrElse(i) { "Colour ${i + 1}" } },
                contentAlignment = Alignment.Center,
            ) {
                Box(Modifier.size(36.dp).clip(CircleShape).background(c).border(if (isSelected) 3.dp else 1.dp, if (isSelected) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.outline, CircleShape), contentAlignment = Alignment.Center) {
                    if (isSelected) Icon(Icons.Rounded.Check, null, tint = onColor(c), modifier = Modifier.size(20.dp))
                }
            }
        }
    }
}

@Composable
fun ConfirmDialog(title: String, body: String, confirm: String, onConfirm: () -> Unit, onDismiss: () -> Unit, destructive: Boolean = false, dismiss: String = "Cancel") {
    AlertDialog(
        onDismissRequest = onDismiss, title = { Text(title) }, text = { Text(body) },
        confirmButton = {
            Button(onClick = onConfirm, colors = if (destructive) ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error, contentColor = MaterialTheme.colorScheme.onError) else ButtonDefaults.buttonColors()) { Text(confirm) }
        },
        dismissButton = { OutlinedButton(onClick = onDismiss) { Text(dismiss) } },
    )
}

@Composable
fun ProgressRing(fraction: Float, size: Dp, modifier: Modifier = Modifier, label: String? = null, stroke: Dp = 6.dp, color: Color = MaterialTheme.colorScheme.primary) {
    val track = MaterialTheme.colorScheme.surfaceVariant
    val f = fraction.coerceIn(0f, 1f)
    Box(modifier.size(size).semantics { stateDescription = "${(f * 100).toInt()} percent" }, contentAlignment = Alignment.Center) {
        Canvas(Modifier.fillMaxSize()) {
            val s = stroke.toPx()
            val area = Size(this.size.width - s, this.size.height - s)
            drawArc(track, 0f, 360f, false, Offset(s / 2, s / 2), area, style = Stroke(s))
            drawArc(color, -90f, 360f * f, false, Offset(s / 2, s / 2), area, style = Stroke(s, cap = StrokeCap.Round))
        }
        if (label != null) Text(label, style = MaterialTheme.typography.labelMedium, modifier = Modifier.clearAndSetSemantics { })
    }
}

val AVATARS = listOf("fox", "panda", "frog", "tiger", "lion", "koala", "monkey", "dog", "cat", "rabbit", "bear", "penguin", "owl", "octopus", "unicorn", "dragon")
private val AVATAR_BG = mapOf(
    "fox" to 0xFFFFE1CC, "panda" to 0xFFE8ECF3, "frog" to 0xFFD9F5D6, "tiger" to 0xFFFFE6C2, "lion" to 0xFFFFECCC, "koala" to 0xFFE6EBEF, "monkey" to 0xFFF3E3D6, "dog" to 0xFFF6E7D4,
    "cat" to 0xFFFFEFC7, "rabbit" to 0xFFF1ECF7, "bear" to 0xFFEFE0D4, "penguin" to 0xFFDFE8F4, "owl" to 0xFFF3EAD9, "octopus" to 0xFFFFE0DC, "unicorn" to 0xFFF3E6FF, "dragon" to 0xFFD8F3EC,
)

/** The website's FNV-1a hash, so a name gets the same avatar and crest colours in both apps. */
fun nameHash(s: String?): Long {
    var h = 2166136261L
    s.orEmpty().codePoints().forEach { cp -> h = h xor cp.toLong(); h = (h * 16777619L) and 0xFFFFFFFFL }
    return h
}

fun avatarKey(key: String?, name: String?): String = if (key in AVATARS) key!! else AVATARS[(nameHash(name) % AVATARS.size).toInt()]

@Composable
fun Avatar(key: String?, name: String?, size: Dp, modifier: Modifier = Modifier) {
    val k = avatarKey(key, name)
    Box(modifier.size(size).clip(CircleShape).background(Color(AVATAR_BG[k] ?: 0xFFE8ECF3)), contentAlignment = Alignment.Center) {
        AsyncImage("file:///android_asset/3d/a-$k.webp", null, modifier = Modifier.size(size * 0.78f).clearAndSetSemantics { })
    }
}

private val CREST_PAIRS = listOf(0xFF1D3A8A to 0xFFF2C94C, 0xFF7A1F2B to 0xFFF2C94C, 0xFF14532D to 0xFFE9F5EC, 0xFF0F4C81 to 0xFFFFFFFF, 0xFF5B21B6 to 0xFFFCD34D, 0xFFB91C1C to 0xFF111827,
    0xFF0E7490 to 0xFFFDE68A, 0xFF1F2937 to 0xFFF59E0B, 0xFF9A3412 to 0xFFFEF3C7, 0xFF065F46 to 0xFFFBBF24, 0xFF831843 to 0xFFFBCFE8, 0xFF1E40AF to 0xFFEF4444)
private val CREST_SKIP = setOf("the", "of", "and", "for", "de", "la", "le", "&", "at", "in")

fun crestInitials(name: String): String {
    val words = name.replace(Regex("[^\\p{L}\\p{N}\\s'-]"), " ").split(Regex("\\s+")).filter { it.isNotEmpty() }
    val letters = words.filter { it.lowercase() !in CREST_SKIP }.mapNotNull { w -> (if (w.matches(Regex("(?i)^st\\.?$"))) "S" else w).firstOrNull() }.joinToString("").uppercase()
    return letters.ifEmpty { words.firstOrNull()?.take(2)?.uppercase() ?: "?" }.take(3)
}

private val LOGO_ASSET = Regex("^assets/img/schools/([a-z0-9-]+\\.(webp|png|jpg))$")
private val LOGO_WIKI = Regex("^https://(upload|thumb)\\.wikimedia\\.org/[A-Za-z0-9/._%()~,!*+-]+$")

/**
 * A school's real crest when Zing has one (shipped with the app, or on Wikimedia; sources are in
 * assets/img/schools/SOURCES.md), otherwise a shield drawn from the school's name, the same fallback the website uses.
 */
@Composable
fun SchoolCrest(school: SchoolDto?, size: Dp, modifier: Modifier = Modifier) {
    val name = school?.name.orEmpty()
    val logo = school?.logo
    val model = when {
        logo == null -> null
        LOGO_ASSET.matches(logo) -> "file:///android_asset/schools/" + LOGO_ASSET.find(logo)!!.groupValues[1]
        LOGO_WIKI.matches(logo) -> logo
        else -> null
    }
    Box(modifier.size(size).semantics { contentDescription = "$name crest" }, contentAlignment = Alignment.Center) {
        GeneratedCrest(name, size)
        if (model != null) {
            AsyncImage(model, null, contentScale = if (school?.logoKind == "photo") ContentScale.Crop else ContentScale.Fit,
                modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(size / 6)).background(MaterialTheme.colorScheme.surface))
        }
    }
}

@Composable
private fun GeneratedCrest(name: String, size: Dp) {
    val h = nameHash(name)
    val (a, b) = CREST_PAIRS[(h % CREST_PAIRS.size).toInt()]
    Box(Modifier.size(size), contentAlignment = Alignment.Center) {
        Canvas(Modifier.fillMaxSize()) {
            val w = this.size.width; val hh = this.size.height
            val shield = Path().apply {
                moveTo(w * 0.5f, hh * 0.03f); lineTo(w * 0.93f, hh * 0.15f); lineTo(w * 0.93f, hh * 0.48f)
                cubicTo(w * 0.93f, hh * 0.74f, w * 0.74f, hh * 0.9f, w * 0.5f, hh * 0.97f)
                cubicTo(w * 0.26f, hh * 0.9f, w * 0.07f, hh * 0.74f, w * 0.07f, hh * 0.48f); lineTo(w * 0.07f, hh * 0.15f); close()
            }
            drawPath(shield, Color(a))
            drawPath(Path().apply { moveTo(w * 0.07f, hh * 0.15f); lineTo(w * 0.5f, hh * 0.03f); lineTo(w * 0.93f, hh * 0.15f); lineTo(w * 0.93f, hh * 0.32f); lineTo(w * 0.07f, hh * 0.32f); close() }, Color(b))
            drawPath(shield, Color.Black.copy(alpha = 0.25f), style = Stroke(w * 0.03f))
        }
        Text(crestInitials(name), color = Color.White, fontWeight = FontWeight.Black, fontSize = (size.value * 0.3f).sp, modifier = Modifier.padding(top = size * 0.22f).clearAndSetSemantics { })
    }
}

/** "3 min ago", "2 days ago", "12 Mar". */
fun ago(time: Long, now: Long): String {
    val d = now - time
    return when {
        time <= 0 -> ""
        d < 60_000 -> "just now"
        d < 3_600_000 -> "${d / 60_000} min ago"
        d < 86_400_000 -> "${d / 3_600_000} h ago"
        d < 7 * 86_400_000L -> "${d / 86_400_000} day${if (d / 86_400_000 == 1L) "" else "s"} ago"
        else -> java.text.SimpleDateFormat("d MMM yyyy", java.util.Locale.getDefault()).format(java.util.Date(time))
    }
}

fun plural(n: Int, word: String): String = "$n $word${if (n == 1) "" else "s"}"

@Composable
fun Gap(height: Dp = 12.dp) = Spacer(Modifier.height(height))

@Composable
fun GapW(width: Dp = 8.dp) = Spacer(Modifier.width(width))

