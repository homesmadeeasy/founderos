# Reality Engine — Timeline

## Unified timeline

All domains contribute to one chronological stream, grouped by day (Today / Yesterday / weekday / date).

## Noise control

`RealityAggregator` groups events by day + domain + family + entity. When a group is large enough (or noisy), it emits an aggregation such as:

- “Completed Push Day” instead of 15 workout micro-events
- “FounderOS Documentation — 6 updates”

Prefer aggregations in the UI timeline (`preferAggregations: true`). High-importance events can remain visible alongside summaries.

## Filtering

Timeline options support `domain`, `specialistId`, `from` / `to`, and `limit`.
