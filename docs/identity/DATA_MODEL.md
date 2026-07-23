# Identity Engine — Data Model

## Entities

- **IdentityFact** — declared or observed claim (`key`, `value`, `confidence`, `source`, `evidenceIds`, `status`, …)
- **IdentityEvidence** — supporting observation summary + weight + source
- **IdentityHistoryEntry** — append-only revision log
- **ObservationSignal** — generic input to inference (no specialist types)
- **IdentityDatastore** — versioned aggregate (facts, evidence, history, enabled specialists, onboarding flag)

## Categories

`personal`, `goals`, `preferences`, `capabilities`, `experience`, `lifestyle`, `health`, `work`, `education`, `finance`, `relationships`, `travel`, `technology`, `custom`

## Status

`active` | `rejected` | `dismissed` | `superseded`

## Supabase

`identity_profiles` — one row per user, JSONB `datastore`  
`identity_evidence_index` — optional relational projection for analytics  

RLS: `auth.uid() = user_id`. Schema: `supabase/identity.sql` (rerunnable).

## Invariants

1. Declared facts are never replaced by observations of the same key.  
2. Rejected/dismissed facts stay in history; status changes are recorded.  
3. Stable UUIDs for facts/evidence/history entries.
