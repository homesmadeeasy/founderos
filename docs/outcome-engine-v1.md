# Outcome Engine v1

## Why it exists

FounderOS makes daily decisions — but without feedback, those decisions never improve. Outcome Engine v1 closes the loop:

**Observe → Decide → Execute → Outcome → Evaluate → Learn → Improve future decisions**

Every morning prediction is tracked. Every evening review can record what actually happened. FounderOS learns from your patterns over time.

## Prediction → outcome → evaluation loop

### 1. Prediction (morning)

When the Decision Engine produces **Today's Decision**, `createPredictionFromDecision()` stores an `OutcomePrediction`:

- Decision title, predicted action, predicted benefit
- Confidence at decision time
- Evidence IDs from the decision
- Date (today)

Predictions are deduped by **date + normalized decision title**. One prediction per day; rerenders do not create duplicates.

### 2. Outcome (evening)

Evening Review includes a **Decision Outcome** section:

- Did you follow the decision? (yes / no / partial)
- Outcome quality (poor / neutral / good / excellent)
- What actually happened?
- What did we learn?
- Energy and mood after (optional)

When the review is completed, `recordOutcome()` creates an `OutcomeRecord`.

### 3. Evaluation (automatic)

`evaluateOutcome()` compares prediction vs outcome and produces an `OutcomeEvaluation`:

- Accuracy score (0–100)
- What worked / what did not work
- Suggested adjustment
- Future weight and confidence adjustments

### 4. Memory & knowledge

On completion:

- A memory is created: **"Decision outcome: [decision title]"**
- If a lesson was logged, a knowledge suggestion may be offered

## How it personalises FounderOS

Decision Engine scoring reads past outcomes via `getSimilarPastOutcomes()`:

- **Repeated success** (e.g. "study first") → bonus score for similar candidates
- **Poor outcomes** (e.g. deep work before schoolwork) → penalty
- **Ignored decisions with no negative effect** → lower urgency on similar suggestions

This is **rule-based** in v1 — keyword matching on decision titles and areas, not ML.

## How confidence improves over time

- Morning shows: *"This recommendation has worked X/Y times before"* when history exists
- Dashboard Today's Decision card shows tracking status and historical success rate
- Assistant can answer accuracy, yesterday's result, best decisions, and why FounderOS is confident

As more evenings are completed, `getOutcomeStats()` accumulates follow rate, success rate, and average accuracy — feeding back into decision scoring and assistant responses.

## Storage

Local storage key: `founderos-outcome-engine-v1`

Types: `OutcomePrediction`, `OutcomeRecord`, `OutcomeEvaluation`

## Limitations (v1)

- **Local only** — no sync across devices
- **Keyword matching** — similar outcomes matched by title/area keywords, not semantic similarity
- **No statistical model** — simple win/loss and accuracy averages
- **One prediction per day** — if the decision changes intraday, the same day's slot is updated
- **No automatic outcome detection** — you must complete evening review manually
- **Rule-based feedback** — adjustments are heuristics, not learned weights

## Future: statistical scoring

- Bayesian or rolling confidence intervals per decision pattern
- Time-decay so recent outcomes weigh more
- Area-level and energy/mood correlation analysis
- Ignored-vs-followed outcome comparison with significance thresholds

## Future: LLM analysis

- Natural-language reflection summarisation
- Cross-outcome pattern detection ("workouts before coding consistently help")
- Personalised adjustment narratives in morning briefings
- Semantic similarity for matching past decisions (beyond keywords)

## Core API

| Function | Purpose |
|----------|---------|
| `createPredictionFromDecision(decision)` | Create/update today's prediction |
| `recordOutcome(predictionId, input)` | Store outcome + evaluation |
| `evaluateOutcome(prediction, outcome)` | Score accuracy and adjustments |
| `getOutcomeHistory()` | Full prediction → outcome → evaluation chain |
| `getOutcomeStats()` | Aggregate accuracy, success, follow rates |
| `getSimilarPastOutcomes(title, area)` | Match past decisions for feedback |
| `getYesterdayOutcome()` | Assistant / morning context |
| `buildOutcomeCompletionPayload()` | Evening review completion bundle |

## Integration points

- **MorningExecutionContext** — creates prediction on `decisionOutput.id` change
- **EveningReviewContext** — records outcome on review completion
- **decisionScoring.ts** — `applyOutcomeFeedbackToCandidate()`
- **TodayDecisionCard** — tracking + success rate
- **Morning page** — outcome success label
- **Assistant** — outcome Q&A handlers
