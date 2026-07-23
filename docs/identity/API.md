# Identity Engine — API

## Mutation (IdentityEngine / IdentityContext only)

| Method | Purpose |
|--------|---------|
| `declareFact` | User/onboarding declared fact |
| `ingestSignals` | Run observation engine |
| `reviewFact` | confirm / reject / dismiss / edit |
| `setEnabledSpecialists` | Specialist enablement |
| `markOnboardingComplete` | Finish day-one flow |

## Read (specialists)

```ts
import { readIdentityForSpecialist, buildIdentityPromptBlock } from '@/lib/identity'

const view = await readIdentityForSpecialist('gym')
const prompt = await buildIdentityPromptBlock('founder')
```

React:

```ts
const { getViewForSpecialist } = useIdentity()
const view = getViewForSpecialist('school')
```

**Never** call `IdentityRepository.save` from specialist packages.

## Repository

`createLocalIdentityRepository` · `createSupabaseIdentityRepository` · `createLocalFirstIdentityRepository` · `createMemoryIdentityRepository` (tests)
