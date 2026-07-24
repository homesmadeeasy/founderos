# Gym Day-One Onboarding

~5 minute bootstrap. Persists to **GymProfile** (planner source of truth) and mirrors declared fields into the **Identity Engine** (shared foundation).

## Fields (high value)

| Field | Identity key | Required for minimum ready? |
|-------|--------------|------------------------------|
| Primary training goal | `training_goal` | Yes |
| Experience level | `training_experience` | Strongly preferred |
| Equipment / gym access | `training_equipment` | Strongly preferred |
| Days per week | `training_days_per_week` | Strongly preferred |
| Session duration | `preferred_session_duration` | Preferred |
| Training structure / split | `training_structure` | Optional |
| Injuries / restrictions | `injury_limitations` | Optional (critical when present) |
| Preferences / dislikes | `exercise_preferences` / `exercise_dislikes` | Optional |
| Age / height / weight | `age_range` (+ GymProfile measures) | Optional, voluntary |

Skip / Not sure is allowed — onboarding completion does **not** require every field.

## Rules

- Declared ≠ observed; inferences never overwrite declared
- No medical diagnoses
- Existing users: non-destructive; profile remains valid if Identity sync fails
- Editing later: Gym profile editor + Identity dashboard

## Readiness

- **Not Ready** — no goal / incomplete core
- **Minimum Ready** — enough to propose a safe baseline plan
- **Personalized** — goal + equipment + schedule
- **Evidence Rich** — personalized + multiple completed workouts

Gym AI works at **Minimum Ready**.

## Implementation

- UI: `components/gym/GymOnboarding.tsx`
- Mapping: `lib/specialists/gym/gymIdentityBootstrap.ts` → `declareFact`
