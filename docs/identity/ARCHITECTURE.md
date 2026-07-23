# Identity Engine — Architecture

```
Specialists / UI
   │ read-only                    │ mutations (user / system)
   ▼                              ▼
identityPublicApi          IdentityContext
   │                              │
   └──────────► IdentityEngine ◄──┘
                      │
                      ▼
              IdentityRepository
                 ├─ Local (primary)
                 └─ Supabase (optional) + pending queue
```

## Layers

| Layer | Path |
|-------|------|
| Domain | `lib/identity/*` |
| Context | `contexts/IdentityContext.tsx` |
| UI | `components/identity/*`, `/identity` |
| SQL | `supabase/identity.sql` |
| Kernel events | `IdentityFactDeclared`, `IdentityObservationCreated`, `IdentityFactConfirmed`, `IdentityFactRejected`, `IdentityUpdated` |

## Data flow

1. User declares facts (onboarding / dashboard edit).  
2. Systems emit `ObservationSignal[]` (domain-agnostic).  
3. `IdentityEngine.ingestSignals` runs inference thresholds → observed facts.  
4. Declared facts of the same key are retained; observed facts record contradiction notes.  
5. Specialists call `readIdentityForSpecialist` / `getViewForSpecialist` — never repositories for writes.

## Specialist integration

Gym conversation prepends identity narrative hints. Future specialists should consume `buildIdentityPromptBlock(specialistId)` the same way.

## Offline / cloud

Local datastore `founderos-identity-v1` is primary. Cloud upserts go to `identity_profiles.datastore` JSONB. Failed/offline saves enqueue `founderos-identity-pending-v1`.
