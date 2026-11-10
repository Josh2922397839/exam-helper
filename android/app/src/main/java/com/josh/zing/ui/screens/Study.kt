package com.josh.zing.ui.screens

import androidx.compose.animation.AnimatedContent
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import app.zing.core.model.QuizQuestion
import app.zing.core.model.StudyCard
import app.zing.core.web.DeckLogic
import com.josh.zing.AppContainer
import com.josh.zing.ui.components.Art
import com.josh.zing.ui.components.EmptyState
import com.josh.zing.ui.components.Page
import com.josh.zing.ui.components.ZScaffold
import com.josh.zing.ui.components.plural
import com.josh.zing.ui.components.zingViewModel
import com.josh.zing.ui.theme.LocalZing
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlin.random.Random

private suspend fun cardsFor(c: AppContainer, deckId: String, level: Int): Pair<String, List<StudyCard>> {
    val all = c.library.snapshot().map { it.deck }
    val deck = all.firstOrNull { it.id == deckId } ?: return "" to emptyList()
    val cards = DeckLogic.allCards(deck, all)
    return if (level > 0) "${deck.name} · Level $level" to DeckLogic.levels(cards).getOrElse(level - 1) { emptyList() } else deck.name to cards
}

/** XP earned on a deck that came from (or was shared as) a link also counts on that deck's leaderboard. */
private fun reportDeckXp(c: AppContainer, deckId: String, xp: Int) {
    if (xp <= 0) return
    c.appScope.launch {
        val shared = c.db.library().deck(deckId)?.let { it.sharedId ?: it.fromShared } ?: return@launch
        runCatching { c.api.deckXp(shared, minOf(xp, 200)) }
    }
}

// ============================================================================================ flashcards

data class FlashState(val loading: Boolean = true, val title: String = "", val queue: List<StudyCard> = emptyList(), val index: Int = 0, val flipped: Boolean = false, val known: Int = 0, val xp: Int = 0, val dueOnly: Boolean = false) {
    val card: StudyCard? get() = queue.getOrNull(index)
    val done: Boolean get() = !loading && index >= queue.size
}

class FlashcardsViewModel(private val c: AppContainer, private val deckId: String, level: Int) : ViewModel() {
    private val _s = MutableStateFlow(FlashState())
    val state: StateFlow<FlashState> = _s

    init {
        viewModelScope.launch {
            val (title, cards) = cardsFor(c, deckId, level)
            val p = c.study.current()
            val due = p.due(deckId, cards.map { it.q }, c.now()).toSet()
            // cards due for review first, then ones never studied, then the rest
            val ordered = cards.sortedBy { card -> when { card.q in due -> 0; p.box(deckId, card.q) == 0 -> 1; else -> 2 } }
            _s.value = FlashState(false, title, ordered.take(30), dueOnly = due.isNotEmpty())
        }
    }

    fun flip() = _s.update { it.copy(flipped = !it.flipped) }

    /** 0 = again, 1 = unsure, 2 = got it: the website's rule for which box the card moves to. */
    fun rate(rating: Int) {
        val card = _s.value.card ?: return
        viewModelScope.launch {
            val box = c.study.current().box(deckId, card.q)
            val next = when (rating) { 2 -> minOf(5, box + 1); 1 -> maxOf(1, minOf(box, 2)); else -> 1 }
            val r = c.study.rate(deckId, card.q, next)
            _s.update { it.copy(index = it.index + 1, flipped = false, known = it.known + if (rating == 2) 1 else 0, xp = it.xp + r.added) }
            if (_s.value.done) reportDeckXp(c, deckId, _s.value.xp)
        }
    }
}

@Composable
fun FlashcardsScreen(deckId: String, level: Int, onBack: () -> Unit, onQuiz: () -> Unit) {
    val vm = zingViewModel(key = "flash:$deckId:$level") { FlashcardsViewModel(it, deckId, level) }
    val s by vm.state.collectAsStateWithLifecycle()
    val animate = LocalZing.current.animate
    Page(maxWidth = 640.dp) {
        ZScaffold(title = s.title.ifEmpty { "Flashcards" }, onBack = onBack) { pad ->
            Column(Modifier.fillMaxSize().padding(pad).padding(16.dp).navigationBarsPadding(), verticalArrangement = Arrangement.spacedBy(14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                val card = s.card
                when {
                    s.loading -> Unit
                    s.queue.isEmpty() -> EmptyState("cards", "No cards to study", "Add cards to this notebook first.", actionLabel = "Back", onAction = onBack)
                    card == null -> {
                        Art("party", 96.dp)
                        Text("Round done!", style = MaterialTheme.typography.headlineMedium, modifier = Modifier.semantics { heading() })
                        Text("${s.known} of ${plural(s.queue.size, "card")} known · +${s.xp} XP", modifier = Modifier.testTag("flashDone"))
                        Button(onClick = onQuiz, enabled = s.queue.size >= 4) { Text("Test yourself") }
                        OutlinedButton(onClick = onBack) { Text("Back to the notebook") }
                    }
                    else -> {
                        LinearProgressIndicator(progress = { s.index.toFloat() / s.queue.size }, modifier = Modifier.fillMaxWidth().semantics { contentDescription = "Card ${s.index + 1} of ${s.queue.size}" })
                        Card(
                            Modifier.fillMaxWidth().weight(1f).heightIn(min = 180.dp).clickable(onClickLabel = if (s.flipped) "Show the question" else "Show the answer") { vm.flip() }.testTag("flashcard"),
                            colors = CardDefaults.cardColors(containerColor = if (s.flipped) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface),
                        ) {
                            Box(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp), contentAlignment = Alignment.Center) {
                                val face: @Composable (Boolean) -> Unit = { flipped ->
                                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite }) {
                                        Text(if (flipped) "Answer" else if (card.topic.isNotEmpty()) card.topic else "Question", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        Text(if (flipped) card.a else card.q, style = MaterialTheme.typography.headlineSmall, textAlign = TextAlign.Center)
                                        if (flipped && card.why.isNotBlank()) Text(card.why, style = MaterialTheme.typography.bodyMedium, textAlign = TextAlign.Center)
                                    }
                                }
                                if (animate) AnimatedContent(s.flipped, label = "flip") { face(it) } else face(s.flipped)
                            }
                        }
                        if (!s.flipped) Button(onClick = vm::flip, modifier = Modifier.fillMaxWidth().testTag("showAnswer")) { Text("Show answer") }
                        else Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(onClick = { vm.rate(0) }, modifier = Modifier.weight(1f).testTag("again")) { Text("Again") }
                            OutlinedButton(onClick = { vm.rate(1) }, modifier = Modifier.weight(1f)) { Text("Unsure") }
                            Button(onClick = { vm.rate(2) }, modifier = Modifier.weight(1f).testTag("gotIt")) { Text("Got it") }
                        }
                    }
                }
            }
        }
    }
}

// ============================================================================================ quiz

data class Asked(val q: QuizQuestion, val order: List<Int>)

data class QuizState(
    val loading: Boolean = true, val title: String = "", val questions: List<Asked> = emptyList(), val index: Int = 0,
    val chosen: Int? = null, val hidden: Set<Int> = emptySet(), val right: Int = 0, val xp: Int = 0,
) {
    val current: Asked? get() = questions.getOrNull(index)
    val done: Boolean get() = !loading && questions.isNotEmpty() && index >= questions.size
    val percent: Int get() = if (questions.isEmpty()) 0 else right * 100 / questions.size
}

class QuizViewModel(private val c: AppContainer, private val deckId: String, private val level: Int) : ViewModel() {
    private val _s = MutableStateFlow(QuizState())
    val state: StateFlow<QuizState> = _s
    private val quizId = if (level > 0) "$deckId~$level" else deckId

    init {
        viewModelScope.launch {
            val (title, cards) = cardsFor(c, deckId, level)
            // the options are shuffled the same way each time for a question, so "the second one" stays the second one
            val asked = DeckLogic.quizFor(cards).map { q -> Asked(q, q.options.indices.shuffled(Random(q.q.hashCode()))) }
            _s.value = QuizState(false, title, asked.shuffled(Random(c.now())).take(20))
        }
    }

    /** Removes one wrong option. The answer then earns less XP, as on the website. */
    fun hint() = _s.update { s ->
        val a = s.current ?: return@update s
        if (s.chosen != null || s.hidden.isNotEmpty()) return@update s
        s.copy(hidden = setOf(a.order.first { it != a.q.answer }))
    }

    fun choose(option: Int) {
        val s = _s.value
        val a = s.current ?: return
        if (s.chosen != null) return
        val ok = option == a.q.answer
        _s.update { it.copy(chosen = option, right = it.right + if (ok) 1 else 0) }
        viewModelScope.launch {
            val r = c.study.answer("$quizId:${a.q.q.hashCode().toUInt().toString(36)}", ok, hinted = s.hidden.isNotEmpty())
            _s.update { it.copy(xp = it.xp + r.added) }
        }
    }

    fun next() {
        _s.update { it.copy(index = it.index + 1, chosen = null, hidden = emptySet()) }
        val s = _s.value
        if (s.done) viewModelScope.launch { c.study.recordQuiz(quizId, s.percent); reportDeckXp(c, deckId, s.xp) }
    }
}

@Composable
fun QuizScreen(deckId: String, level: Int, onBack: () -> Unit) {
    val vm = zingViewModel(key = "quiz:$deckId:$level") { QuizViewModel(it, deckId, level) }
    val s by vm.state.collectAsStateWithLifecycle()
    Page(maxWidth = 640.dp) {
        ZScaffold(title = s.title.ifEmpty { "Quiz" }, onBack = onBack) { pad ->
            Column(Modifier.fillMaxSize().padding(pad).verticalScroll(rememberScrollState()).padding(16.dp).navigationBarsPadding(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                val a = s.current
                when {
                    s.loading -> Unit
                    s.questions.isEmpty() -> EmptyState("clipboard", "Not enough cards for a quiz", "A quiz needs at least 4 cards with different answers.", actionLabel = "Back", onAction = onBack)
                    a == null -> Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Art(if (s.percent >= 80) "trophy" else "target", 96.dp)
                        Text("${s.percent}%", style = MaterialTheme.typography.displaySmall, modifier = Modifier.testTag("quizScore").semantics { heading() })
                        Text("${s.right} of ${plural(s.questions.size, "question")} right · +${s.xp} XP")
                        Text(if (s.percent >= 80) "Brilliant. You know this." else "The ones you missed are saved, so you can come back to them.", textAlign = TextAlign.Center)
                        Button(onClick = onBack) { Text("Done") }
                    }
                    else -> {
                        LinearProgressIndicator(progress = { s.index.toFloat() / s.questions.size }, modifier = Modifier.fillMaxWidth().semantics { contentDescription = "Question ${s.index + 1} of ${s.questions.size}" })
                        Text(a.q.q, style = MaterialTheme.typography.headlineSmall, modifier = Modifier.semantics { heading() }.testTag("question"))
                        a.order.filter { it !in s.hidden }.forEach { option ->
                            val picked = s.chosen == option
                            val correct = option == a.q.answer
                            val answered = s.chosen != null
                            val colors = when {
                                answered && correct -> ButtonDefaults.outlinedButtonColors(containerColor = MaterialTheme.colorScheme.tertiaryContainer, contentColor = MaterialTheme.colorScheme.onTertiaryContainer, disabledContainerColor = MaterialTheme.colorScheme.tertiaryContainer, disabledContentColor = MaterialTheme.colorScheme.onTertiaryContainer)
                                answered && picked -> ButtonDefaults.outlinedButtonColors(containerColor = MaterialTheme.colorScheme.errorContainer, contentColor = MaterialTheme.colorScheme.onErrorContainer, disabledContainerColor = MaterialTheme.colorScheme.errorContainer, disabledContentColor = MaterialTheme.colorScheme.onErrorContainer)
                                else -> ButtonDefaults.outlinedButtonColors()
                            }
                            OutlinedButton(
                                onClick = { vm.choose(option) }, enabled = !answered, colors = colors,
                                modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp).testTag(if (correct) "optionRight" else "optionWrong")
                                    .semantics { if (answered && correct) contentDescription = "Correct answer: ${a.q.options[option]}" else if (answered && picked) contentDescription = "Your answer, not right: ${a.q.options[option]}" },
                            ) { Text(a.q.options[option], Modifier.fillMaxWidth(), textAlign = TextAlign.Start) }
                        }
                        if (s.chosen == null) {
                            if (s.hidden.isEmpty()) TextButton(onClick = vm::hint) { Text("Hint: remove a wrong answer") }
                        } else {
                            Text(if (s.chosen == a.q.answer) "Right!" else "Not quite.", style = MaterialTheme.typography.titleMedium, modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite })
                            if (a.q.why.isNotBlank()) Text(a.q.why)
                            Button(onClick = vm::next, modifier = Modifier.fillMaxWidth().testTag("nextQuestion")) { Text(if (s.index + 1 >= s.questions.size) "See my score" else "Next") }
                        }
                    }
                }
            }
        }
    }
}
