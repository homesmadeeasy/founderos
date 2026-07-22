# Supabase migrations

Run these in the Supabase SQL Editor **in order** for a fresh project.

## Core (required)

| File | Creates |
|------|---------|
| `schema.sql` | `profiles`, `projects`, `tasks`, `notes`, `decisions`, `risks`, `roadmap_items`, `messages` + RLS |

## Feature migrations (run as you enable features)

| File | Creates / extends |
|------|-------------------|
| `ideas.sql` | `ideas`, `idea_analyses` |
| `links.sql` | `links` (knowledge graph) |
| `project_files.sql` | `project_files` + storage notes |
| `project_reviews.sql` | `project_reviews` |
| `weekly_reviews.sql` | `weekly_reviews` |
| `project_dna.sql` | `project_dna` |
| `pattern_analyses.sql` | `pattern_analyses` + extends `links` entity types |
| `onboarding.sql` | `profiles.onboarding_completed`, `profiles.demo_workspace_loaded` |
| `vector_memory.sql` | `memory_embeddings` + pgvector + `match_memory_embeddings()` |
| `world_types.sql` | `projects.world_type`, `world_purpose`, `life_area` |
| `goals.sql` | `goals`, `goal_links`, `goal_reviews` |
| `gym.sql` | Gym profile, templates, sessions, sets, progression, user state + RLS |

## RLS

Every migration enables Row Level Security and adds policies so users can only access their own rows (`auth.uid() = user_id`).

Gym child tables (`gym_workout_template_exercises`, `gym_exercise_performances`, `gym_set_performances`) authorise via an `EXISTS` join to the owning parent template/session instead of a denormalised `user_id` column.

Do not disable RLS in production.

## Re-running migrations

Migrations use `if not exists` / `drop policy if exists` guards where possible and are safe to re-run in most cases.

## Storage

File uploads require a Supabase Storage bucket (see comments in `project_files.sql` if present). Configure bucket policies to match your auth setup.
