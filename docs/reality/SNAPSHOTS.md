# Reality Engine — Snapshots

`buildRealitySnapshot(store)` produces the current operating state specialists should read instead of scanning many databases.

## Fields

- Energy / recovery (when sleep or recovery events exist)
- Current projects / focus
- Today’s workout signal
- Upcoming deadlines
- Recent wins
- Risks
- Habits
- Momentum (score, label, confidence, note)
- Outstanding tasks / blocked items
- Recent decisions
- Narrative hints (for AI prompts)
- Event counts (today / week)

## Rules

- Momentum and sparse fields may be **estimates** — confidence is exposed; UI marks assumptions.
- Snapshot cache: last ~20 records stored on the datastore for history / debugging.
- Specialist filter: pass `specialistId` to scope domain/tags.

## AI

`buildRealityPromptBlock(specialistId?)` turns narrative hints into a compact conversation prefix so specialists stop asking “what have you done today?”
