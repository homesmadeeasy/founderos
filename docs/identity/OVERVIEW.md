# Identity Engine — Overview

The Identity Engine is the **shared first layer of intelligence** in FounderOS. Every specialist (Gym, Founder, School, Finance, Health, Travel, …) reads the same model of the person — without mutating it directly.

This is **not** a user profile settings page. It is a durable, evidence-backed model of:

- what the user **declared**
- what FounderOS **observed**
- **confidence**, **evidence**, **history**, and **contradictions**

---

## Mission

FounderOS becomes more useful because it understands the user over time. Specialists stop asking the same questions. Recommendations respect goals, preferences, lifestyle, and observed behaviour — while never inventing facts without evidence.

---

## Core principles

1. **Declared ≠ observed.** Both can exist for the same key.
2. **Never overwrite declared with inferred.**
3. **No observation without sufficient evidence.**
4. **Confidence is dynamic** and explainable.
5. **History is append-only** (no silent deletes of revisions).
6. **Specialists are read-only consumers.** All writes go through `IdentityEngine`.
7. **Domain-agnostic inference.** Observation signals are generic; Identity does not hardcode Gym types.

---

## Day-one experience

Modular onboarding (≤ ~5 minutes) asks only steps relevant to enabled specialists. See [ONBOARDING.md](./ONBOARDING.md).

---

## Document map

| Doc | Purpose |
|-----|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Layers, flow, integration |
| [DATA_MODEL.md](./DATA_MODEL.md) | Facts, evidence, schema |
| [ONBOARDING.md](./ONBOARDING.md) | Modular specialist steps |
| [OBSERVATION_ENGINE.md](./OBSERVATION_ENGINE.md) | Signal → candidate rules |
| [CONFIDENCE_MODEL.md](./CONFIDENCE_MODEL.md) | Confidence maths |
| [API.md](./API.md) | Public interfaces |
| [TESTING.md](./TESTING.md) | Test plan |

---

## Related handbook

- [docs/VISION.md](../VISION.md)
- [docs/DOMAIN_FRAMEWORK.md](../DOMAIN_FRAMEWORK.md)
- [docs/ARCHITECTURE.md](../ARCHITECTURE.md)
