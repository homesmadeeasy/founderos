# Identity Engine — Onboarding

## Goals

- Useful in ≤ 5 minutes  
- Ask only questions for **enabled specialists**  
- Persist answers as **declared** identity facts  
- Cap steps (~10 max) even if many specialists enabled  

## Flow

1. Choose specialists (Founder, Gym, School, Finance, Health, Travel, …)  
2. Run `stepsForSpecialists(enabled)`  
3. Each answer → `declareFact` with source `onboarding`  
4. `markOnboardingComplete(true)` → Identity Dashboard  

## Modular steps

Defined in `lib/identity/identityOnboarding.ts`.

| Specialist | Example keys |
|------------|--------------|
| always | `display_name`, `primary_life_focus` |
| gym | `training_goal`, `training_experience`, `training_equipment`, `training_days_per_week`, `injury_limitations` |
| founder | `current_project`, `business_stage`, `founder_primary_goal` |
| school | `subjects`, `year_level`, `upcoming_exams` |
| finance | `finance_focus` |
| travel | `travel_intent` |

Irrelevant specialist questions are never shown.
