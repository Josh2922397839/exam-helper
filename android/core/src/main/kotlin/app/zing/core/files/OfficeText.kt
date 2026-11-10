package app.zing.core.files

import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.util.zip.ZipInputStream

/**
 * Reads the words out of Word (.docx) and PowerPoint (.pptx) files on the device, the way the website does it in the
 * browser: both are zip files of XML. Nothing is uploaded. Sizes are capped so a crafted file can't exhaust memory.
 */
object OfficeText {
    private const val MAX_ENTRY = 8_000_000
    private const val MAX_ENTRIES = 3_000
    private const val MAX_TEXT = 400_000

    private val TAG = Regex("<[^>]+>")
    private val ENTITY = Regex("&(#x[0-9a-fA-F]+|#\\d+|[a-zA-Z]+);")

    private fun unescape(s: String): String = ENTITY.replace(s) { m ->
        val e = m.groupValues[1]
        when {
            e.startsWith("#x") || e.startsWith("#X") -> e.drop(2).toIntOrNull(16)?.takeIf { it in 32..0x10FFFF }?.let { String(Character.toChars(it)) } ?: " "
            e.startsWith("#") -> e.drop(1).toIntOrNull()?.takeIf { it in 32..0x10FFFF }?.let { String(Character.toChars(it)) } ?: " "
            else -> when (e) { "amp" -> "&"; "lt" -> "<"; "gt" -> ">"; "quot" -> "\""; "apos" -> "'"; else -> " " }
        }
    }

    private fun entries(input: InputStream, want: (String) -> Boolean): Map<String, String> {
        val out = LinkedHashMap<String, String>()
        ZipInputStream(input).use { zip ->
            var count = 0
            while (true) {
                val entry = zip.nextEntry ?: break
                if (++count > MAX_ENTRIES) break
                if (entry.isDirectory || !want(entry.name)) continue
                val buf = ByteArrayOutputStream()
                val chunk = ByteArray(16_384)
                while (true) {
                    val n = zip.read(chunk)
                    if (n < 0) break
                    buf.write(chunk, 0, n)
                    if (buf.size() > MAX_ENTRY) return out // far bigger than any real document part
                }
                out[entry.name] = buf.toString(Charsets.UTF_8.name())
            }
        }
        return out
    }

    private fun paragraphs(xml: String, paragraphEnd: String, tab: String, lineBreak: String): String {
        val text = xml.replace(paragraphEnd, "\n").replace(Regex("<$tab\\b[^>]*/>"), "\t").replace(Regex("<$lineBreak\\b[^>]*/>"), "\n")
        return unescape(TAG.replace(text, "")).lines().joinToString("\n") { it.trimEnd() }.replace(Regex("\n{3,}"), "\n\n").trim()
    }

    /** The text of a Word document, one paragraph per line. Empty when it isn't a readable .docx. */
    fun docx(input: InputStream): String = runCatching {
        val xml = entries(input) { it == "word/document.xml" }["word/document.xml"] ?: return ""
        paragraphs(xml, "</w:p>", "w:tab", "w:br").take(MAX_TEXT)
    }.getOrDefault("")

    /** The text of a slide deck, slide by slide in order. Empty when it isn't a readable .pptx. */
    fun pptx(input: InputStream): String = runCatching {
        val slide = Regex("^ppt/slides/slide(\\d+)\\.xml$")
        val slides = entries(input) { slide.matches(it) }.entries.sortedBy { slide.find(it.key)!!.groupValues[1].toInt() }
        slides.map { paragraphs(it.value, "</a:p>", "a:tab", "a:br") }.filter { it.isNotBlank() }.joinToString("\n\n").take(MAX_TEXT)
    }.getOrDefault("")
}
