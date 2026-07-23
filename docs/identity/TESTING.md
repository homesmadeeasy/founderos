# Identity Engine — Testing

```bash
npm run test:identity
npm run typecheck
npm run build
```

## Coverage

| Area | Asserted in `lib/identity/identityTests.ts` |
|------|---------------------------------------------|
| Creation | declare fact |
| Observation generation | thresholds / evening preference |
| Confidence | low vs confirmed |
| History | updates appended |
| Manual overrides | reject lowers confidence |
| Contradictions | declared + observed both kept |
| Validation | declare input errors |
| Repository compatibility | local + memory |
| Offline queue | idempotent pending id |
| Onboarding | modular steps per specialist |
| Specialist view | narrative hints |

## Manual

1. Open `/identity` → enable Gym+Founder → complete onboarding.  
2. Confirm declared facts on dashboard.  
3. (Dev) ingest signals via tests / future adapters → see observed patterns + Why?  
4. Reject an observation → status rejected, history entry.  
5. Ask Gym “What should I train today?” → identity hints prepended.
