package app.zing.core.web

import app.zing.core.model.Card
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.io.ByteArrayOutputStream
import java.util.Base64
import java.util.zip.Deflater
import java.util.zip.Inflater

data class SharedDeck(val name: String, val color: String, val cards: List<Card>)

/**
 * A deck packed into a link (`#/import/<code>`), the format the website uses when nobody is signed in:
 * "z." + base64url(raw deflate of JSON) or "p." + base64url(JSON). Links come from other people, so decoding is
 * strict: size limits, and every card goes through the usual cleaning.
 */
object ShareLink {
    private val CODE = Regex("^([pz])\\.([A-Za-z0-9_-]+)$")
    private const val MAX_CODE = 400_000
    private const val MAX_JSON = 2_000_000

    fun encode(name: String, color: String, cards: List<Card>): String {
        val json = buildJsonObject {
            put("n", name); put("c", color); put("k", JsonArray(cards.map { SaveCodec.cardToJson(it) }))
        }.toString().toByteArray(Charsets.UTF_8)
        val deflater = Deflater(Deflater.DEFAULT_COMPRESSION, true)
        deflater.setInput(json); deflater.finish()
        val out = ByteArrayOutputStream()
        val buf = ByteArray(8192)
        while (!deflater.finished()) out.write(buf, 0, deflater.deflate(buf))
        deflater.end()
        return "z." + Base64.getUrlEncoder().withoutPadding().encodeToString(out.toByteArray())
    }

    /** Returns null for anything that isn't a valid shared deck. Never throws. */
    fun decode(code: String?): SharedDeck? {
        if (code == null || code.length > MAX_CODE) return null
        val m = CODE.matchEntire(code) ?: return null
        return runCatching {
            var bytes = Base64.getUrlDecoder().decode(m.groupValues[2])
            if (m.groupValues[1] == "z") bytes = inflate(bytes) ?: return null
            val o = Json.parseToJsonElement(String(bytes, Charsets.UTF_8)) as? JsonObject ?: return null
            val cards = (o["k"] as? JsonArray ?: return null).mapNotNull { SaveCodec.cardFromJson(it) }.take(400)
            if (cards.isEmpty()) return null
            SharedDeck(Clean.line(SaveCodec.str(o["n"]), 60).ifEmpty { "Shared deck" }, Clean.color(SaveCodec.str(o["c"])), cards)
        }.getOrNull()
    }

    private fun inflate(bytes: ByteArray): ByteArray? {
        val inflater = Inflater(true)
        inflater.setInput(bytes)
        val out = ByteArrayOutputStream()
        val buf = ByteArray(8192)
        try {
            while (!inflater.finished()) {
                val n = inflater.inflate(buf)
                if (n == 0 && (inflater.needsInput() || inflater.needsDictionary())) break
                out.write(buf, 0, n)
                if (out.size() > MAX_JSON) return null // a "zip bomb" link
            }
        } finally {
            inflater.end()
        }
        return out.toByteArray()
    }
}
