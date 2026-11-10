package com.josh.zing.data.repo

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.Build
import android.provider.OpenableColumns
import android.util.Base64
import app.zing.core.account.AiBlock
import app.zing.core.files.OfficeText
import app.zing.core.model.Card
import app.zing.core.web.CardText
import app.zing.core.web.Clean
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import kotlin.coroutines.coroutineContext

/** Something a student picked to turn into cards. */
sealed interface ImportSource {
    val title: String
    /** Text read on the device. [kind] is the note kind the website uses (paste, pdf, doc, slides, text, sheet). */
    data class Text(override val title: String, val text: String, val kind: String, val table: Boolean = false) : ImportSource
    /** Photos (or scanned PDF pages) as small JPEG data URLs: only Zing AI can read these. */
    data class Images(override val title: String, val dataUrls: List<String>, val kind: String = "photo") : ImportSource
    data class Audio(override val title: String, val dataUrl: String) : ImportSource
    data class Link(val url: String) : ImportSource { override val title: String get() = "Web page" }
}

/** Cards ready for the student to check before anything is saved. */
data class ImportDraft(
    val title: String,
    val cards: List<Card>,
    /** The text that was imported, kept as a note in the deck (not for tables: their rows are the cards). */
    val noteText: String?,
    val noteKind: String,
    val usedAi: Boolean,
    val src: String? = null,
    /** Why quick cards were made instead of AI cards, when that happened. */
    val fallback: AiBlock? = null,
)

class ImportFailed(message: String) : Exception(message)

/**
 * Magic import on Android. Files are read on the device (nothing is uploaded just to read it). Tables and
 * "term - meaning" notes become cards straight away. Other notes go to Zing AI when the student is allowed to use
 * it, and otherwise become quick cards made on the device, the website's own fallback.
 */
class Importer(private val context: Context, private val ai: Ai) {
    suspend fun read(uri: Uri): ImportSource = withContext(Dispatchers.IO) {
        val resolver = context.contentResolver
        val mime = resolver.getType(uri).orEmpty().lowercase()
        var name = "Import"
        var size = -1L
        runCatching {
            resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE), null, null, null)?.use { c ->
                if (c.moveToFirst()) { name = c.getString(0) ?: name; size = if (c.isNull(1)) -1 else c.getLong(1) }
            }
        }
        val ext = name.substringAfterLast('.', "").lowercase()
        val title = Clean.line(name.substringBeforeLast('.'), 60).ifEmpty { "Import" }
        if (size > MAX_FILE) throw ImportFailed("That file is too big. Choose one under 20 MB, or split it into parts.")
        fun open() = resolver.openInputStream(uri) ?: throw ImportFailed("Couldn't open that file. Choose it again.")
        when {
            mime.startsWith("image/") -> ImportSource.Images(title, listOf(open().use { jpegDataUrl(BitmapFactory.decodeStream(it) ?: throw ImportFailed("That picture couldn't be opened.")) }))
            mime.startsWith("audio/") || ext in AUDIO_EXT -> {
                val bytes = open().use { it.readBytes(MAX_AUDIO + 1) }
                if (bytes.size > MAX_AUDIO) throw ImportFailed("That recording is too long. Zing AI can listen to about 5 minutes.")
                ImportSource.Audio(title, "data:${audioMime(mime, ext)};base64," + Base64.encodeToString(bytes, Base64.NO_WRAP))
            }
            ext == "docx" || "wordprocessingml" in mime -> text(title, open().use(OfficeText::docx), "doc")
            ext == "pptx" || "presentationml" in mime -> text(title, open().use(OfficeText::pptx), "slides")
            ext == "pdf" || mime == "application/pdf" -> pdf(uri, title)
            ext in setOf("csv", "tsv") || mime in setOf("text/csv", "text/tab-separated-values") -> ImportSource.Text(title, open().use { it.readBytes(MAX_TEXT_BYTES) }.toString(Charsets.UTF_8), "sheet", table = true)
            mime.startsWith("text/") || ext in setOf("txt", "md") -> {
                val t = open().use { it.readBytes(MAX_TEXT_BYTES) }.toString(Charsets.UTF_8)
                ImportSource.Text(title, t, if (CardText.looksStructured(t)) "sheet" else "text", table = CardText.looksStructured(t))
            }
            else -> throw ImportFailed("Zing can import PDFs, Word and PowerPoint files, text, spreadsheets (CSV), photos and recordings.")
        }
    }

    private fun text(title: String, text: String, kind: String): ImportSource {
        if (text.isBlank()) throw ImportFailed("No words were found in that file.")
        return ImportSource.Text(title, text, kind, table = CardText.looksStructured(text))
    }

    /** Text PDFs are read on the device (Android 15+). Scanned PDFs, and older phones, send the first 4 pages as pictures. */
    private suspend fun pdf(uri: Uri, title: String): ImportSource {
        val fd = context.contentResolver.openFileDescriptor(uri, "r") ?: throw ImportFailed("Couldn't open that PDF. Choose it again.")
        fd.use {
            val renderer = runCatching { PdfRenderer(it) }.getOrElse { throw ImportFailed("That PDF couldn't be opened. It may be locked with a password.") }
            renderer.use { pdf ->
                val words = StringBuilder()
                if (Build.VERSION.SDK_INT >= 35) {
                    for (i in 0 until minOf(pdf.pageCount, MAX_PDF_PAGES)) {
                        coroutineContext.ensureActive()
                        pdf.openPage(i).use { page -> page.textContents.forEach { words.append(it.text).append('\n') } }
                        if (words.length > 200_000) break
                    }
                }
                if (words.count { !it.isWhitespace() } >= 80) return ImportSource.Text(title, words.toString(), "pdf", table = false)
                val pictures = (0 until minOf(pdf.pageCount, 4)).map { i ->
                    coroutineContext.ensureActive()
                    pdf.openPage(i).use { page ->
                        val scale = minOf(2f, MAX_IMAGE_SIDE / maxOf(page.width, page.height).toFloat())
                        val bitmap = Bitmap.createBitmap((page.width * scale).toInt().coerceAtLeast(1), (page.height * scale).toInt().coerceAtLeast(1), Bitmap.Config.ARGB_8888)
                        bitmap.eraseColor(android.graphics.Color.WHITE)
                        page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                        jpegDataUrl(bitmap)
                    }
                }
                if (pictures.isEmpty()) throw ImportFailed("That PDF has no pages.")
                return ImportSource.Images(title, pictures, kind = "pdf")
            }
        }
    }

    private fun jpegDataUrl(source: Bitmap): String {
        val side = maxOf(source.width, source.height)
        val bitmap = if (side > MAX_IMAGE_SIDE) Bitmap.createScaledBitmap(source, source.width * MAX_IMAGE_SIDE / side, source.height * MAX_IMAGE_SIDE / side, true) else source
        var quality = 82
        while (true) {
            val out = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.JPEG, quality, out)
            val url = "data:image/jpeg;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
            if (url.length <= MAX_IMAGE_CHARS || quality <= 40) return url
            quality -= 14
        }
    }

    /**
     * Turns a source into cards for review. [useAi] false (or AI not available) makes quick cards on the device.
     * Never saves anything: the student checks the cards first.
     */
    suspend fun make(source: ImportSource, count: Int = 12, useAi: Boolean = true): ImportDraft = withContext(Dispatchers.Default) {
        when (source) {
            is ImportSource.Text -> {
                val text = Clean.text(source.text, 200_000).trim()
                if (source.table || CardText.looksStructured(text)) {
                    val cards = CardText.structured(text)
                    if (cards.isEmpty()) throw ImportFailed("No cards were found. Put a question and its answer on each line.")
                    return@withContext ImportDraft(source.title, cards, null, "sheet", usedAi = false)
                }
                if (text.length < 20) throw ImportFailed("Add a little more to make cards from: a few sentences of notes.")
                var fallback: AiBlock? = null
                if (useAi) {
                    try {
                        val made = ai.cards(text = text, count = count)
                        if (made.cards.isNotEmpty()) return@withContext ImportDraft(made.title.ifEmpty { source.title }, made.cards, text.take(30_000), source.kind, usedAi = true)
                    } catch (e: AiUnavailable) { fallback = e.block }
                }
                val quick = CardText.quick(text)
                if (quick.isEmpty()) throw ImportFailed("Zing couldn't find facts to make cards from. Try notes with definitions, or lines like “term - meaning”.")
                ImportDraft(source.title, quick, text.take(30_000), source.kind, usedAi = false, fallback = fallback)
            }
            is ImportSource.Images -> ai(source.title, source.kind) { ai.cards(images = source.dataUrls, count = count) }
            is ImportSource.Audio -> ai(source.title, "audio") { ai.cards(audio = source.dataUrl, count = count) }
            is ImportSource.Link -> {
                if (!LINK.matches(source.url)) throw ImportFailed("Paste a full web address that starts with https://")
                ai(source.title, "web", source.url) { ai.cards(url = source.url, count = count) }
            }
        }
    }

    private suspend fun ai(title: String, kind: String, src: String? = null, call: suspend () -> AiCards): ImportDraft {
        val made = try { call() } catch (e: AiUnavailable) {
            throw ImportFailed(e.message + " Photos, recordings and links need Zing AI; you can still paste the text to make quick cards.")
        }
        if (made.cards.isEmpty()) throw ImportFailed("Zing AI couldn't find study content there. Try another page or a clearer photo.")
        return ImportDraft(made.title.ifEmpty { title }, made.cards, made.sourceText?.take(30_000), kind, usedAi = true, src = src)
    }

    companion object {
        const val MAX_FILE = 20L * 1024 * 1024
        const val MAX_TEXT_BYTES = 2 * 1024 * 1024
        const val MAX_AUDIO = 4_400_000        // the function accepts about 6,000,000 base64 characters
        const val MAX_IMAGE_SIDE = 1400
        const val MAX_IMAGE_CHARS = 1_500_000
        const val MAX_PDF_PAGES = 60
        private val AUDIO_EXT = setOf("mp3", "m4a", "aac", "wav", "ogg", "webm")
        private val LINK = Regex("^https://[^\\s\"'<>]{4,580}$")

        private fun audioMime(mime: String, ext: String): String = when {
            mime in setOf("audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/m4a", "audio/x-m4a", "audio/aac") -> mime
            ext == "mp3" -> "audio/mpeg"; ext == "wav" -> "audio/wav"; ext == "ogg" -> "audio/ogg"; ext == "webm" -> "audio/webm"; ext == "aac" -> "audio/aac"
            else -> "audio/mp4"
        }

        private fun java.io.InputStream.readBytes(limit: Int): ByteArray {
            val out = ByteArrayOutputStream()
            val buf = ByteArray(16_384)
            while (out.size() < limit) { val n = read(buf, 0, minOf(buf.size, limit - out.size())); if (n < 0) break; out.write(buf, 0, n) }
            return out.toByteArray()
        }
    }
}
