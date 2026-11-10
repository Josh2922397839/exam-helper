package app.zing.core

import app.zing.core.files.OfficeText
import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

class OfficeTextTest {
    private fun zip(vararg files: Pair<String, String>): ByteArrayInputStream {
        val out = ByteArrayOutputStream()
        ZipOutputStream(out).use { z -> files.forEach { (name, body) -> z.putNextEntry(ZipEntry(name)); z.write(body.toByteArray()); z.closeEntry() } }
        return ByteArrayInputStream(out.toByteArray())
    }

    @Test fun readsWordParagraphs() {
        val xml = """<w:document><w:body><w:p><w:r><w:t>Osmosis</w:t></w:r><w:r><w:tab/><w:t xml:space="preserve"> moves water &amp; solutes</w:t></w:r></w:p><w:p><w:r><w:t>Line&#233;</w:t><w:br/><w:t>two</w:t></w:r></w:p></w:body></w:document>"""
        assertEquals("Osmosis\t moves water & solutes\nLineé\ntwo", OfficeText.docx(zip("[Content_Types].xml" to "<x/>", "word/document.xml" to xml)))
    }

    @Test fun readsSlidesInOrder() {
        fun slide(t: String) = "<p:sld><a:p><a:r><a:t>$t</a:t></a:r></a:p></p:sld>"
        val text = OfficeText.pptx(zip("ppt/slides/slide10.xml" to slide("Ten"), "ppt/slides/slide2.xml" to slide("Two"), "ppt/slides/slide1.xml" to slide("One"), "ppt/notesSlides/notesSlide1.xml" to slide("skip")))
        assertEquals("One\n\nTwo\n\nTen", text)
    }

    @Test fun junkGivesEmptyTextNotACrash() {
        assertEquals("", OfficeText.docx(ByteArrayInputStream("not a zip".toByteArray())))
        assertEquals("", OfficeText.pptx(zip("other.xml" to "<x/>")))
        assertEquals("", OfficeText.docx(zip("word/other.xml" to "<x/>")))
    }
}
