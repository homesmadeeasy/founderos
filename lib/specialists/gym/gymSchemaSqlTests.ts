/**
 * Lightweight SQL-shape / policy-shape checks for supabase/gym.sql.
 * Does not connect to Supabase or call production services.
 */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const sqlPath = path.join(process.cwd(), 'supabase', 'gym.sql')
const sql = fs.readFileSync(sqlPath, 'utf8')

const REQUIRED_TABLES = [
  'gym_profiles',
  'gym_workout_templates',
  'gym_workout_template_exercises',
  'gym_workout_sessions',
  'gym_exercise_performances',
  'gym_set_performances',
  'gym_progression_records',
  'gym_user_state',
] as const

const ROOT_TABLES_WITH_USER_ID = [
  'gym_profiles',
  'gym_workout_templates',
  'gym_workout_sessions',
  'gym_progression_records',
  'gym_user_state',
] as const

const PARENT_SCOPED_CHILDREN: Record<string, string> = {
  gym_workout_template_exercises: 'gym_workout_templates',
  gym_exercise_performances: 'gym_workout_sessions',
  gym_set_performances: 'gym_exercise_performances',
}

console.log('Gym schema SQL shape tests\n')

assert.ok(fs.existsSync(sqlPath), 'supabase/gym.sql must exist')

for (const table of REQUIRED_TABLES) {
  assert.match(sql, new RegExp(`create table if not exists ${table}\\b`, 'i'))
  assert.match(sql, new RegExp(`alter table ${table} enable row level security`, 'i'))
  console.log(`PASS: table + RLS enabled — ${table}`)
}

for (const table of ROOT_TABLES_WITH_USER_ID) {
  assert.match(
    sql,
    new RegExp(
      `create table if not exists ${table}[\\s\\S]*?user_id\\s+uuid[\\s\\S]*?references auth\\.users\\(id\\) on delete cascade`,
      'i',
    ),
  )
  assert.match(sql, new RegExp(`${table}_select_own[\\s\\S]*?auth\\.uid\\(\\) = user_id`, 'i'))
  assert.match(sql, new RegExp(`${table}_insert_own[\\s\\S]*?auth\\.uid\\(\\) = user_id`, 'i'))
  assert.match(sql, new RegExp(`${table}_update_own[\\s\\S]*?auth\\.uid\\(\\) = user_id`, 'i'))
  assert.match(sql, new RegExp(`${table}_delete_own[\\s\\S]*?auth\\.uid\\(\\) = user_id`, 'i'))
  console.log(`PASS: root ownership policies — ${table}`)
}

for (const [child, parent] of Object.entries(PARENT_SCOPED_CHILDREN)) {
  assert.match(sql, new RegExp(`exists \\([\\s\\S]*?from ${parent}\\b`, 'i'))
  assert.match(sql, new RegExp(`create policy "[^"]+" on ${child}[\\s\\S]*?exists \\(`, 'i'))
  // Child tables must not rely on a denormalised user_id column for auth.
  const createBlock = sql.match(
    new RegExp(`create table if not exists ${child} \\(([\\s\\S]*?)\\);`, 'i'),
  )
  assert.ok(createBlock, `create table block for ${child}`)
  assert.doesNotMatch(createBlock![1], /\buser_id\b/)
  console.log(`PASS: parent-scoped RLS without child user_id — ${child} → ${parent}`)
}

assert.match(sql, /create or replace function public\.set_updated_at\(\)/i)
assert.match(sql, /idx_gym_workout_sessions_planned_date/i)
assert.match(sql, /idx_gym_workout_sessions_status/i)
assert.match(sql, /idx_gym_workout_sessions_template/i)
assert.match(sql, /gym_set_performances_number_unique/i)
assert.match(sql, /idx_gym_workout_sessions_one_in_progress/i)
assert.match(sql, /approved_plan\s+jsonb/i)
assert.match(sql, /research_claim_ids\s+jsonb/i)
assert.doesNotMatch(sql, /service_role/i)
assert.doesNotMatch(sql, /disable row level security/i)

console.log('PASS: indexes, uniqueness, triggers, and no service-role / RLS disable')
console.log('\nAll gym schema SQL shape tests passed.')
