# Conversational Founder AI v1

FounderOS's first rule-based conversational experience. Founder AI reads from existing engines, orchestrates strategic dialogue, and writes back only when confidence thresholds pass.

## Principles

- **No engine rewrites** — Object, Memory, Knowledge, Signal, Decision, Outcome, Domain Intelligence, Founder specialist, Kernel, Morning Execution, and Evening Review remain single sources of truth.
- **Read-mostly** — Founder AI aggregates live state via `FounderInput` → `buildFounderSnapshot()` and never owns primary data.
- **No OpenAI** — All reasoning is deterministic via `ruleReasoner` in `conversationEngine.ts`.
- **Swappable reasoner** — `ConversationReasoner` interface allows future `LLMReasoner` without UI changes.

## Architecture

```
lib/conversation/
├── conversationTypes.ts      # Core types
├── conversationEngine.ts     # RuleReasoner + session API
├── conversationContext.ts    # Live context from FounderInput
├── conversationSession.ts    # localStorage persistence
├── conversationMemory.ts     # Memory/knowledge write drafts
├── conversationQuestions.ts  # Auto-generated questions
├── conversationSuggestions.ts# Ask now / tonight / tomorrow / ignore
├── conversationSummaries.ts  # Session summaries
├── conversationEvidence.ts   # Evidence from founder snapshot
├── conversationTimeline.ts   # Linked timeline entries
└── conversationUtils.ts      # IDs, chips, greetings

contexts/ConversationContext.tsx   # React provider + kernel + memory writes
components/conversation/           # Chat UI
components/home/FounderConversationPrompt.tsx  # Home proactive card
```

## Data flow

1. **Observe** — `buildConversationContext()` reads `FounderInput` and founder snapshot.
2. **Reason** — `ruleReasoner` generates opening turns, replies, and recommendations with evidence.
3. **Start conversation** — `startConversation()` creates a `ConversationSession` in `founderos-conversation-v1` (localStorage).
4. **Learn** — On answer, `submitAnswer()` updates session; if confidence ≥ 65, `ConversationContext` calls `recordMemory()`.
5. **Improve** — Timeline entries link questions, answers, memories, and kernel events.

## ConversationSession

| Field | Description |
|-------|-------------|
| `id` | Unique session ID |
| `topic` | One of 15 topics (founder, strategy, validation, …) |
| `turns[]` | Founder AI + user messages with evidence |
| `evidence[]` | Snapshot-backed evidence chips |
| `activeQuestions[]` | Generated questions with importance, answer type, related IDs |
| `confidence` | 0–100, increases on each answer |
| `memoryWrites[]` | Draft writes when thresholds pass |
| `knowledgeSuggestions[]` | Suggested knowledge strings |
| `nextQuestion` | Current question to answer |

## Question generator

`generateConversationQuestions()` produces questions from live state:

| Topic | Example |
|-------|---------|
| Morning | Low recovery → reduce workload? |
| Validation | Many features, no user tests? |
| Founder | Biggest obstacle to FounderOS? |
| Execution | Planned but didn't ship? |
| School | Exams approaching, prepared? |
| Health | Skipped workouts, recovery issue? |
| Reflection | What surprised you today? |

Each question includes: `title`, `reason`, `importance`, `answerType`, related objects/memories/signals/domains, and `suggestion` action.

## Suggestion engine

`evaluateQuestionSuggestion()` returns:

- `ask_now` — High importance, relevant today
- `ask_tonight` — Better for evening review
- `ask_tomorrow` — Defer to next day
- `ignore` — Low value right now
- `already_answered` — Asked recently
- `requires_external_data` — Needs data not in engines

## Answer types

`short_text`, `paragraph`, `multiple_choice`, `yes_no`, `rating`, `number`, `single_selection`, `multiple_selection`

Reply chips in UI: Yes, No, Maybe, Later, Tell me more, I don't know, Custom reply.

## Memory writes

When `session.confidence >= 65` and user provided substantive answers:

- **Memory** — `recordMemory({ type: 'conversation', source: 'assistant', … })`
- **Knowledge suggestion** — Kernel event `ConversationKnowledgeSuggested` (confidence ≥ 70)
- Timeline entries for question/answer/memory/kernel

## Kernel events

Published from `ConversationContext`:

| Event | When |
|-------|------|
| `ConversationStarted` | New session |
| `ConversationAnswered` | User reply |
| `ConversationFinished` | Session completes |
| `ConversationAbandoned` | User abandons (API available) |
| `ConversationSummaryCreated` | Summary generated |
| `ConversationMemoryCreated` | Memory recorded |
| `ConversationKnowledgeSuggested` | Knowledge draft |
| `ConversationDecisionUpdated` | Reserved for future decision linkage |

## UI surfaces

### `/founder`

Chat-first cofounder experience:

- Hero — "Today's strategic thinking"
- Scrollable conversation with animated bubbles + typing indicator
- Reply chips + question chips
- Sidebar — topic, confidence, evidence, domains, objects, recent memories

### `/home`

`FounderConversationPrompt` replaces static briefing:

- Proactive message from `getProactiveHomeMessage()`
- Buttons: **Talk**, **Ignore**, **Why?** (expands evidence)

### Command Center

`AIAssistantPanel` is conversation-first:

- Recent conversation turns
- Suggested question chips
- Continue yesterday
- Ask Founder / School / Health shortcuts

## Reasoner swap (future)

```typescript
import { setConversationReasoner } from '@/lib/conversation/conversationEngine'

// Later:
setConversationReasoner(llmReasoner)
```

UI, storage, and kernel wiring stay unchanged.

## Storage

- Key: `founderos-conversation-v1`
- Separate from Command Center chat (`founderos-command-center-v1`)

## Acceptance criteria

- [x] Existing engines untouched
- [x] Founder AI starts conversations
- [x] Questions generated automatically
- [x] User can answer
- [x] Answers stored
- [x] Memories created (confidence threshold)
- [x] Knowledge suggested (kernel event)
- [x] Evidence always shown
- [x] Conversation history saved
- [x] Home integrates Founder AI
- [x] Assistant conversation-first
- [x] Kernel events emitted
- [x] `npm run build` passes
