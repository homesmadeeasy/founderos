# Founder AI v2

Founder AI v2 adds a **server-side LLM reasoning layer** above the existing deterministic engines (cognitive model, conversation adaptive flow, Founder specialist, decision engine, memory/knowledge/object engines). Nothing is replaced — the LLM proposes; the user approves; engines remain the source of truth.

## Architecture

```
Browser (ConversationContext)
  → buildCompactFounderContext()
  → POST /api/ai/founder
      → requireAuth()
      → rate limit (dev in-memory)
      → runFounderAIService() [OpenAI Responses API + Zod]
      → validateFounderAIResponse()
      → JSON envelope { mode, response, requestId }
  → append assistant message
  → store proposals (founderAI.proposals.ts)
  → user approves → founderAI.approvals.ts → existing engine APIs
```

When `OPENAI_API_KEY` is absent or the request fails, `founderAI.fallback.ts` uses the existing cognitive/deterministic conversation reasoner.

## Privacy boundaries

- `OPENAI_API_KEY` is read **only** on the server via `process.env.OPENAI_API_KEY`.
- Never use `NEXT_PUBLIC_*` for secrets.
- The client sends a **compact context** — not full localStorage dumps.
- API responses never include prompts, stack traces, or API keys.
- Proposals are stored separately in `founderos-founder-ai-proposals-v1` with bounded size.

## Request contract (`CompactFounderContext`)

Sent via `POST /api/ai/founder`:

- `userMessage`, `conversationSummary`
- compact `worldModel`, `founderSnapshot`
- `activeBeliefs`, `unknowns`, `contradictions`
- `activeQuestion`, `recentTurns`, `evidence`
- `availableActionTypes`

Limits are defined in `founderAI.config.ts` (e.g. 8 turns, 14 evidence, 12 beliefs).

## Response contract (`FounderAIResponse`)

- `message`, `reasoningSummary`, `confidence` (0–100)
- `evidenceIds`, `beliefsToUpdate`, `contradictionsToCreate`
- `nextQuestion`, `suggestedActions`, `memoryDrafts`, `knowledgeDrafts`

Validated with Zod (`founderAI.schema.ts`) then deterministically sanitized (`founderAI.validation.ts`).

## Supported action types

| Type | Approval behavior |
|------|-------------------|
| `create_task` | `AppContext.addTask` |
| `create_sprint` | Existing validation sprint flow |
| `defer_item` | Kernel `FounderProposalApproved` event |
| `create_capture` | Kernel event (no auto-write) |
| `create_memory_draft` | `MemoryEngine.recordMemory` after approval |
| `create_knowledge_draft` | `KnowledgeEngine.createKnowledge` after approval |
| `update_mission` | `MorningExecution.updatePrimaryMission` |
| `schedule_placeholder` | Internal proposed block via kernel event |

All actions require `requiresApproval: true`. No calendar writes, deletes, or external messaging.

## Approval flow

1. LLM returns proposals with assistant message.
2. UI shows collapsible **Why this?**, belief cards, and action cards.
3. User **Approve**, **Edit** (title/description/due date/mission), or **Dismiss**.
4. `founderAI.approvals.ts` applies via existing engine APIs.
5. Kernel events: `FounderProposalCreated`, `FounderProposalApproved`, `FounderProposalDismissed`, etc.

Belief updates use `cognitive-model` `updateBelief` / `createBelief` — never direct localStorage writes from the LLM.

## Fallback behaviour

Fallback triggers when:

- `OPENAI_API_KEY` missing
- User disables LLM in Settings
- Network/timeout/schema failure
- Rate limit exceeded

UI adds a subtle note: *Using built-in reasoning while external AI is unavailable.*

## Environment variables

```bash
# .env.local (example — use a fake placeholder in docs only)
OPENAI_API_KEY=sk-your-key-here
OPENAI_FOUNDER_MODEL=gpt-4o-mini
```

`OPENAI_FOUNDER_MODEL` defaults to `gpt-4o-mini` if unset.

## Tests

```bash
npm run test:founder-ai
npm run test:conversation
npm run test:cognitive
npm run typecheck
npm run build
```

Founder AI tests use deterministic mocks — **no OpenAI calls**.

## Limitations

- Dev rate limiter is in-memory per user (not production-grade).
- Proposal storage is localStorage (migrate to Supabase later).
- `schedule_placeholder` does not write to Google Calendar.
- LLM path is enabled for `founder` topic sessions when user preference allows.
- Route-level integration tests depend on Next.js test harness (unit tests cover core logic).

## Later migration notes

- Move `founderos-founder-ai-proposals-v1` to Supabase per user.
- Replace in-memory rate limiter with edge/Redis limiter.
- Optional: stream Responses API for faster perceived latency.
