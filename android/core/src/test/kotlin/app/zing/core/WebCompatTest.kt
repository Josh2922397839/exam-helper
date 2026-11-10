package app.zing.core

import app.zing.core.model.Card
import app.zing.core.model.Deck
import app.zing.core.model.Limits
import app.zing.core.model.Note
import app.zing.core.web.CardText
import app.zing.core.web.Clean
import app.zing.core.web.DeckLogic
import app.zing.core.web.Progress
import app.zing.core.web.SaveCodec
import app.zing.core.web.ShareLink
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

/** The Android app must read and write exactly what the website does. These tests pin that down. */
class WebCompatTest {
    private val now = 1_780_000_000_000L

    // A save copied from the shape the website writes (learn.js backup() + ui.js state()).
    private val webSave = """
        {"v":1,"at":1780000000000,
         "state":{"visited":{"biology":["male-system"]},"quiz":{"biology":{"best":80,"last":60,"attempts":2}},
                  "cards":{"my-abc123":{"What is ATP?":3}},"seen":{"my-abc123":{"What is ATP?":1779990000000}},
                  "mistakes":["biology:4"],"days":["2026-11-08","2026-11-09"],"last":{"s":"biology","t":"male-system","at":5},
                  "answered":10,"correct":7,"xp":420,"xpDays":{"2026-11-09":60},"match":{"biology":41000},
                  "freezes":1,"frozen":[],"goalHits":2,"futureField":{"keep":"me"}},
         "sets":[
           {"id":"my-abc123","name":"Cell biology","color":"#14B8A6","updated":1779999000000,"created":1779000000000,
            "cards":[["What is ATP?","The cell's energy currency"],
                     ["Where is DNA kept?","Nucleus",["Ribosome","Vacuole","Cell wall"],"The nucleus holds the chromosomes."],
                     ["Bad card",""],["Why only","Answer",[],"Because"]],
            "notes":[{"id":"nabc1","t":"Respiration","x":"Glucose + oxygen -> energy","k":"paste","at":1779998000000},
                     {"id":"nabc2","t":"Old long note","x":"","k":"pdf","at":1779000000000,"cut":1},
                     {"id":"BAD","t":"x","x":"y"}]},
           {"id":"my-child01","name":"Mitosis","color":"nope","updated":1779998000000,"cards":[["PMAT","Prophase, metaphase, anaphase, telophase"]],"parent":"my-abc123","from":"0b0b0b0b-1111-2222-3333-444444444444"},
           {"id":"not-a-deck","name":"x","cards":[]},
           {"id":"my-abc123","name":"duplicate id","cards":[]}
         ]}
    """.trimIndent()

    @Test fun readsDecksTheWayTheWebsiteDoes() {
        val save = Json.parseToJsonElement(webSave).jsonObject
        val decks = SaveCodec.decksFromJson(save["sets"], now)
        assertEquals(listOf("my-abc123", "my-child01"), decks.map { it.id })
        val bio = decks[0]
        assertEquals("#14b8a6", bio.color)
        assertEquals(3, bio.cards.size)
        assertEquals(listOf("Ribosome", "Vacuole", "Cell wall"), bio.cards[1].wrong)
        assertEquals("Because", bio.cards[2].why)
        assertEquals(listOf("nabc1", "nabc2"), bio.notes.map { it.id })
        assertTrue(bio.notes[1].cut)
        val child = decks[1]
        assertEquals(Limits.DEFAULT_COLOR, child.color)
        assertEquals("my-abc123", child.parent)
        assertEquals(child.updated, child.created)
        assertEquals("0b0b0b0b-1111-2222-3333-444444444444", child.from)
    }

    @Test fun writesDecksBackInTheSameShape() {
        val decks = SaveCodec.decksFromJson(Json.parseToJsonElement(webSave).jsonObject["sets"], now)
        val json = SaveCodec.decksToJson(decks)
        val again = SaveCodec.decksFromJson(json, now)
        assertEquals(decks, again)
        val first = json[0].jsonObject
        assertEquals(2, first["cards"]!!.jsonArray[0].jsonArray.size)            // [q, a]
        assertEquals(4, first["cards"]!!.jsonArray[1].jsonArray.size)            // [q, a, [3], why]
        assertEquals(0, first["cards"]!!.jsonArray[2].jsonArray[2].jsonArray.size) // [q, a, [], why]
        assertFalse(first.containsKey("parent"))
        assertFalse(json[1].jsonObject.containsKey("notes"))
    }

    @Test fun trimsNotesToTheCloudBudgetNewestFirst() {
        val big = "x".repeat(Limits.NOTE_TEXT)
        val notes = (1..6).map { Note("nnote$it", "Note $it", big, at = now - it) }
        val deck = Deck("my-big000", "Big", "#0b8a5e", updated = now, created = now, notes = notes)
        val out = SaveCodec.decksToJson(listOf(deck))[0].jsonObject["notes"]!!.jsonArray.map { it.jsonObject }
        assertEquals(5, out.count { !it.containsKey("cut") })
        val cut = out.single { it.containsKey("cut") }
        assertEquals("nnote6", SaveCodec.str(cut["id"]))
        assertEquals("", SaveCodec.str(cut["x"]))
        assertEquals(setOf("my-big000" to "nnote6"), SaveCodec.notesOverBudget(listOf(deck)))
    }

    @Test fun progressRoundTripsAndKeepsUnknownFields() {
        val state = Json.parseToJsonElement(webSave).jsonObject["state"]!!.jsonObject
        val p = Progress.fromJson(state)
        assertEquals(420, p.xp)
        assertEquals(3, p.box("my-abc123", "What is ATP?"))
        assertEquals(41000L, p.match["biology"])
        val back = p.toJson()
        assertEquals(state["futureField"], back["futureField"])
        assertEquals(p, Progress.fromJson(back))
    }

    @Test fun progressToleratesGarbage() {
        val p = Progress.fromJson(Json.parseToJsonElement("""{"xp":"12","cards":[],"days":[1,"2026-01-01","x"],"quiz":{"a":5},"freezes":99}"""))
        assertEquals(12, p.xp)
        assertEquals(listOf("2026-01-01"), p.days)
        assertEquals(0, p.quiz["a"]!!.best)
        assertEquals(2, p.freezes)
        assertEquals(Progress(), Progress.fromJson(null))
    }

    @Test fun mergeKeepsTheBestOfBothLikeTheWebsite() {
        val mine = Progress(xp = 100, days = listOf("2026-11-09"), cards = mapOf("d" to mapOf("q1" to 2)), quiz = mapOf("b" to app.zing.core.web.QuizStat(70, 70, 3)),
            match = mapOf("b" to 50_000L), mistakes = listOf("b:1"), answered = 5, correct = 4)
        val cloud = Progress(xp = 80, days = listOf("2026-11-08"), cards = mapOf("d" to mapOf("q1" to 4, "q2" to 1)), quiz = mapOf("b" to app.zing.core.web.QuizStat(90, 50, 2)),
            match = mapOf("b" to 40_000L), mistakes = listOf("b:2"), answered = 9, correct = 3)
        val m = mine.mergeWith(cloud)
        assertEquals(100, m.xp)
        assertEquals(listOf("2026-11-08", "2026-11-09"), m.days)
        assertEquals(mapOf("q1" to 4, "q2" to 1), m.cards["d"])
        assertEquals(app.zing.core.web.QuizStat(90, 70, 3), m.quiz["b"])
        assertEquals(40_000L, m.match["b"])
        assertEquals(listOf("b:1", "b:2"), m.mistakes)
        assertEquals(9, m.answered); assertEquals(4, m.correct)
        // merging is safe to repeat and gives the same answer whichever device does it
        assertEquals(m, m.mergeWith(cloud))
        assertEquals(m.copy(mistakes = emptyList()), cloud.mergeWith(mine).copy(mistakes = emptyList()))
    }

    @Test fun xpStreaksFreezesAndLevels() {
        val day = LocalDate.of(2026, 11, 10)
        var p = Progress().touchDay(day.minusDays(1))
        assertEquals(1, p.streak(day))                       // studied yesterday: still alive today
        assertEquals(0, p.streak(day.plusDays(1)))
        val r = p.addXp(30, day, goal = 50)
        assertFalse(r.goalReached)
        val r2 = r.state.addXp(15, day, goal = 50, boost = 2)  // Double XP
        assertEquals(30, r2.added); assertTrue(r2.goalReached); assertEquals(60, r2.today)
        // the third goal earns a streak freeze
        p = Progress(goalHits = 2)
        assertTrue(p.addXp(50, day, 50).freezeEarned)
        assertFalse(Progress(goalHits = 2, freezes = 2).addXp(50, day, 50).freezeEarned)
        // a freeze covers one missed day
        p = Progress(days = listOf("2026-11-08"), freezes = 1).touchDay(day)
        assertEquals(listOf("2026-11-09"), p.frozen); assertEquals(0, p.freezes); assertEquals(3, p.streak(day))
        assertEquals(1, Progress.level(0).level)
        assertEquals(2, Progress.level(40).level)
        assertEquals(50, Progress.level(100).percent)
    }

    @Test fun leitnerDueDates() {
        val p = Progress().setBox("d", "q", 2, now)
        assertTrue(p.due("d", listOf("q"), now).isEmpty())
        assertEquals(listOf("q"), p.due("d", listOf("q"), now + Progress.DAY_MS))
        assertTrue(p.setBox("d", "q", 4, now).due("d", listOf("q"), now + 6 * Progress.DAY_MS).isEmpty())
        assertEquals(1, p.setBox("d", "q", 3, now).mastered("d", listOf("q", "other")))
    }

    @Test fun cleaningMatchesTheWebsite() {
        assertNull(Clean.card("  ", "a"))
        val c = Clean.card(" Q\u0007? ", "Paris", listOf("paris", "Rome", "Rome", "Oslo", "Bern"), " why ")!!
        assertEquals(Card("Q ?", "Paris", listOf("Rome", "Oslo", "Bern"), "why"), c)
        assertTrue(Clean.card("q", "a", listOf("x", "y"))!!.wrong.isEmpty())
        assertEquals("a\nb\tc d", Clean.text("a\r\nb\tc\u0001d", 100))
        assertTrue(Clean.DECK_ID.matches(Clean.newDeckId(now)))
        assertTrue(Clean.NOTE_ID.matches(Clean.newNoteId(now)))
        val a = Deck("my-aaaa", "A", "#000000", updated = 1, created = 1)
        val b = a.copy(id = "my-bbbb", parent = "my-aaaa")
        val all = listOf(a, b).associateBy { it.id }
        assertTrue(Clean.parentOk("my-cccc", "my-bbbb", all))
        assertFalse(Clean.parentOk("my-aaaa", "my-bbbb", all)) // would loop
        assertFalse(Clean.parentOk("my-aaaa", "my-aaaa", all))
        assertFalse(Clean.parentOk("my-aaaa", "my-zzzz", all))
    }

    @Test fun pastedNotesBecomeCards() {
        val cards = CardText.parse("1. Osmosis - movement of water\n• Mitosis: cell division\nATP = energy\nQ: Capital of Jamaica?\nA: Kingston\njust a sentence")
        assertEquals(listOf("Osmosis", "Mitosis", "ATP", "Capital of Jamaica?"), cards.map { it.q })
        assertEquals("Kingston", cards.last().a)
    }

    @Test fun quizletAnkiAndSheetExports() {
        val anki = "#separator:tab\n#html:true\nfront one\t<b>back</b> one\n\"quoted, \"\"cell\"\"\"\tsecond&amp;more"
        assertEquals(listOf(Card("front one", "back one"), Card("quoted, \"cell\"", "second&more")), CardText.structured(anki))
        val sheet = "Question,Answer,W1,W2,W3,Why\nCapital of France,Paris,Rome,Oslo,Bern,It is on the Seine\nH2O,Water"
        val cards = CardText.structured(sheet)
        assertEquals(Card("Capital of France", "Paris", listOf("Rome", "Oslo", "Bern"), "It is on the Seine"), cards[0])
        assertEquals(Card("H2O", "Water"), cards[1])
        assertTrue(CardText.looksStructured("a - b\nc - d\ne - f"))
        assertFalse(CardText.looksStructured("This is a paragraph of notes about cells.\nAnd another one about energy."))
    }

    @Test fun quickCardsOnlyUseTheStudentsOwnWords() {
        val notes = "Photosynthesis is the process plants use to make glucose from light. " +
            "The nucleus controls the activities of the cell. " +
            "The Treaty of Paris was signed in 1763 after the Seven Years War. " +
            "Dr. Williams led Trinidad to independence alongside other regional leaders."
        val cards = CardText.quick(notes)
        assertEquals("What is photosynthesis?".lowercase(), cards[0].q.lowercase())
        assertEquals("the process plants use to make glucose from light", cards[0].a)
        assertEquals(Card("What controls the activities of the cell?", "The nucleus"), cards[1])
        assertEquals("1763", cards[2].a)
        assertTrue(cards[2].q.startsWith("Fill the gap: ") && "_____" in cards[2].q)
        cards.forEach { c -> assertTrue("answer not from the notes: ${c.a}", notes.contains(c.a, ignoreCase = true)) }
        assertTrue(CardText.quick("").isEmpty())
    }

    @Test fun studyCardsQuizAndPathLevels() {
        val parent = Deck("my-root1", "Root", "#000000", cards = listOf(Card("Q1", "A1"), Card("Q2", "A2", listOf("x", "y", "z"), "w")), updated = 2, created = 1)
        val child = Deck("my-kid01", "Kid", "#000000", cards = listOf(Card("q1", "dup"), Card("Q3", "A3"), Card("Q4", "A4")), updated = 2, created = 2, parent = "my-root1")
        val all = listOf(parent, child)
        val cards = DeckLogic.allCards(parent, all)
        assertEquals(listOf("Q1", "Q2", "Q3", "Q4"), cards.map { it.q })
        assertEquals("Kid", cards[2].topic)
        val quiz = DeckLogic.quizFor(cards)
        assertEquals(4, quiz.size)
        assertEquals(listOf("A2", "x", "y", "z"), quiz[1].options)
        assertEquals(quiz, DeckLogic.quizFor(cards)) // the same wrong answers every time
        assertTrue(quiz[0].options.drop(1).all { it in setOf("A2", "A3", "A4") })
        assertTrue(DeckLogic.quizFor(cards.take(3).map { it.copy(wrong = null) }).isEmpty()) // not enough other answers
        assertEquals(listOf(6, 9), DeckLogic.levels((1..15).toList()).map { it.size })
        assertEquals(listOf(6, 6, 4), DeckLogic.levels((1..16).toList()).map { it.size })
        assertEquals("my-root1", DeckLogic.rootOf("my-kid01", all.associateBy { it.id })!!.id)
    }

    @Test fun shareLinksRoundTripAndRejectJunk() {
        val cards = listOf(Card("Q", "A"), Card("Q2", "A2", listOf("x", "y", "z"), "because"))
        val code = ShareLink.encode("My deck", "#ff5e4d", cards)
        assertTrue(code.startsWith("z."))
        val back = ShareLink.decode(code)!!
        assertEquals("My deck", back.name); assertEquals(cards, back.cards)
        // a plain ("p.") link written by a browser without compression
        val plain = "p." + java.util.Base64.getUrlEncoder().withoutPadding().encodeToString("""{"n":"<b>x</b>","c":"red","k":[["a","b"],[1,2],["",""]]}""".toByteArray())
        val p = ShareLink.decode(plain)!!
        assertEquals("<b>x</b>", p.name) // kept as plain text; the UI never renders it as HTML
        assertEquals(Limits.DEFAULT_COLOR, p.color); assertEquals(1, p.cards.size)
        assertNull(ShareLink.decode("z.!!!")); assertNull(ShareLink.decode("p.e30")); assertNull(ShareLink.decode(null)); assertNull(ShareLink.decode("q.abcd"))
        assertNotNull(SaveCodec.save(JsonObject(emptyMap()), emptyList(), now)["sets"] as? JsonArray)
    }
}
