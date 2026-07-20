/**
 * Planned-exercise normalisation & duplicate-selection tests.
 * Also covered by npm run test:gym-personalisation
 */
import './gymTestSetup'
import type { PlannedExercise } from './gymTypes'
import type { WorkoutExercisePrescription } from './evidence/gymEvidenceTypes'
import {
  normalizePlannedExercises,
  finalizeTodaysWorkout,
  validatePlannedWorkout,
  buildPlannedExerciseInstanceId,
  plannedExerciseListKey,
} from './gymPlannedExerciseUtils'
import { migrateApprovedPlan as migratePlanSchema, migrateDatastore } from './gymStorage/gymStorageSchema'
import { buildUniqueExerciseIdList, generateTodaysWorkout } from './gymWorkoutPlanner'
import { recommendExercises } from './gymExerciseSelection'
import { createActiveWorkoutFromPlan } from './gymStorage/gymWorkoutService'
import { createDefaultGymProfile } from './gymProfileUtils'
import type { ApprovedWorkoutPlan } from './gymStorage/gymStorageTypes'

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`)
}

function stubPrescription(overrides?: Partial<WorkoutExercisePrescription>): WorkoutExercisePrescription {
  return {
    exerciseId: 'x',
    sets: 3,
    repRange: '8-10',
    targetReps: 10,
    restSeconds: 90,
    estimatedLoadMethod: 'unspecified',
    progressionRule: 'double',
    deloadRule: 'cut 40%',
    goal: 'muscle_growth',
    prescriptionConfidence: 60,
    prescriptionMode: 'fallback',
    researchClaimIds: [],
    userEvidenceIds: [],
    assumptions: [],
    contraindicationFlags: [],
    rationale: 'test',
    explanation: {
      personalReason: 'personal',
      researchBasis: 'research',
      assumptions: [],
      confidence: 60,
      progressionRule: 'double',
      deloadRule: 'cut',
      citations: [],
      missingDataForPersonalisation: [],
      safetyNotes: [],
    },
    ...overrides,
  }
}

function makeEx(
  id: string,
  name: string,
  opts?: { prescription?: Partial<WorkoutExercisePrescription> },
): PlannedExercise {
  return {
    plannedExerciseId: '',
    exerciseId: id,
    exerciseName: name,
    order: 1,
    sets: 3,
    reps: '10',
    restSeconds: 90,
    targetRpe: 8,
    primaryMuscle: id.includes('incline') ? 'chest' : id.includes('lateral') ? 'side_delts' : 'chest',
    prescription: stubPrescription({
      exerciseId: id,
      ...opts?.prescription,
    }),
  }
}

function testDedupeLateralRaise() {
  const workoutId = 'workout-push-2026-07-15'
  const input = [
    makeEx('barbell-bench-press', 'Barbell Bench Press'),
    makeEx('incline-dumbbell-press', 'Incline Dumbbell Press'),
    makeEx('overhead-press', 'Overhead Press'),
    makeEx('lateral-raise', 'Lateral Raise', {
      prescription: { researchClaimIds: ['claim-a'], rationale: 'first' },
    }),
    makeEx('tricep-pushdown', 'Tricep Pushdown'),
    makeEx('lateral-raise', 'Lateral Raise', {
      prescription: {
        researchClaimIds: ['claim-b'],
        prescriptionMode: 'evidence_informed',
        rationale: 'second',
        prescriptionConfidence: 80,
      },
    }),
  ]
  const out = normalizePlannedExercises(input, { workoutInstanceId: workoutId })
  const laterals = out.filter(e => e.exerciseId === 'lateral-raise')
  assert(laterals.length === 1, `expected 1 lateral raise, got ${laterals.length}`)
  assert(out.map(e => e.exerciseId).join(',') === 'barbell-bench-press,incline-dumbbell-press,overhead-press,lateral-raise,tricep-pushdown',
    `order broken: ${out.map(e => e.exerciseId).join(',')}`)
  assert(laterals[0].prescription.researchClaimIds.includes('claim-a'), 'kept claim-a')
  assert(laterals[0].prescription.researchClaimIds.includes('claim-b'), 'merged claim-b')
  assert(laterals[0].prescription.prescriptionMode === 'evidence_informed', 'merged richer mode')
  console.log('PASS: duplicate lateral raises become one; order + metadata preserved')
}

function testBenchAndInclineNotDeduped() {
  const out = normalizePlannedExercises([
    makeEx('barbell-bench-press', 'Barbell Bench Press'),
    makeEx('incline-dumbbell-press', 'Incline Dumbbell Press'),
  ], { workoutInstanceId: 'w1' })
  assert(out.length === 2, 'bench and incline must both remain')
  console.log('PASS: distinct bench variants not incorrectly deduplicated')
}

function testStableInstanceIds() {
  const workoutId = 'workout-push-2026-07-15'
  const a = normalizePlannedExercises([makeEx('lateral-raise', 'Lateral Raise')], { workoutInstanceId: workoutId })
  const b = normalizePlannedExercises([makeEx('lateral-raise', 'Lateral Raise')], { workoutInstanceId: workoutId })
  assert(a[0].plannedExerciseId === b[0].plannedExerciseId, 'IDs must be stable across runs')
  assert(a[0].plannedExerciseId === buildPlannedExerciseInstanceId(workoutId, 'lateral-raise', 1),
    'ID format must be deterministic')
  console.log('PASS: planned exercise instance IDs are stable')
}

function testLegacyMigration() {
  const plan: ApprovedWorkoutPlan = {
    id: 'legacy-plan',
    approvedAt: '2026-07-15T00:00:00.000Z',
    title: 'Push day',
    whySummary: 'test',
    exercises: [
      {
        exerciseId: 'lateral-raise',
        exerciseName: 'Lateral Raise',
        sets: 3,
        repRange: '10-15',
        targetReps: 12,
        prescriptionConfidence: 50,
      },
      {
        exerciseId: 'lateral-raise',
        exerciseName: 'Lateral Raise',
        sets: 3,
        repRange: '10-15',
        targetReps: 12,
        prescriptionConfidence: 50,
      },
      {
        exerciseId: 'barbell-bench-press',
        exerciseName: 'Bench',
        sets: 3,
        repRange: '8-10',
        targetReps: 10,
        prescriptionConfidence: 70,
      },
    ],
  }
  const migrated = migratePlanSchema(plan)!
  assert(migrated.exercises.length === 2, `deduped plan exercises: ${migrated.exercises.length}`)
  assert(migrated.exercises.every(e => Boolean(e.plannedExerciseId)), 'all have plannedExerciseId')
  const again = migratePlanSchema(migrated)!
  assert(again.exercises[0].plannedExerciseId === migrated.exercises[0].plannedExerciseId, 'migration IDs stable')
  console.log('PASS: legacy workout migration creates stable IDs and repairs duplicates')
}

function testListKeysNotOnlyExerciseId() {
  const out = finalizeTodaysWorkout({
    title: 'Push day',
    exercises: [
      makeEx('lateral-raise', 'A'),
      makeEx('tricep-pushdown', 'B'),
    ],
    estimatedMinutes: 45,
    musclesTrained: ['side_delts'],
    rationale: 't',
    evidenceIds: [],
    researchSummary: {
      methodology: 't',
      approvedSourceIds: [],
      averageConfidence: 50,
      evidenceInformedCount: 0,
      fallbackCount: 2,
      reviewedAt: new Date().toISOString(),
    },
  })
  const keys = out.exercises.map((ex, i) => plannedExerciseListKey(ex, i))
  assert(keys.every(k => k.includes('::')), 'keys use plannedExerciseId format')
  assert(new Set(keys).size === keys.length, 'keys unique')
  assert(!keys.every(k => k === 'lateral-raise' || k === 'tricep-pushdown'), 'keys are not bare exerciseId')
  console.log('PASS: React list keys are not based only on canonical exerciseId')
}

function testGenerationNoDuplicateLateral() {
  const profile = createDefaultGymProfile()
  profile.complete = true
  profile.primaryGoal = 'muscle_growth'
  const workout = generateTodaysWorkout({
    goal: {
      primaryGoal: 'muscle_growth',
      label: 'Muscle Growth',
      trainingDaysPerWeek: 4,
      experience: 'intermediate',
    },
    recovery: 'ready',
    sessions: [],
    volume: [],
    weaknesses: [],
    equipment: { available: ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight'], limitations: [] },
    injuries: { areas: [], restrictions: [] },
    evidenceIds: [],
  })
  // Force push-like construction via buildUniqueExerciseIdList
  const ids = buildUniqueExerciseIdList({
    splitKey: 'push',
    goal: {
      primaryGoal: 'muscle_growth',
      label: 'Muscle Growth',
      trainingDaysPerWeek: 4,
      experience: 'intermediate',
    },
    equipment: { available: ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight'], limitations: [] },
    injuries: { areas: [], restrictions: [] },
    volume: [],
    weaknesses: [],
    maxExercises: 6,
  })
  const lateralCount = ids.filter(id => id === 'lateral-raise').length
  assert(lateralCount === 1, `push list must have lateral-raise once, got ${lateralCount}: ${ids.join(',')}`)

  const recs = recommendExercises({
    goal: {
      primaryGoal: 'muscle_growth',
      label: 'Muscle Growth',
      trainingDaysPerWeek: 4,
      experience: 'intermediate',
    },
    equipment: { available: ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight'], limitations: [] },
    injuries: { areas: [], restrictions: [] },
    volume: [],
    weaknesses: [],
    excludeIds: ['lateral-raise'],
  })
  assert(!recs.some(r => r.exerciseId === 'lateral-raise'), 'recommendExercises must not re-add excluded lateral-raise')

  const finalizedIds = workout.exercises.map(e => e.exerciseId)
  const dupes = finalizedIds.filter((id, i) => finalizedIds.indexOf(id) !== i)
  assert(dupes.length === 0, `generated workout has duplicate IDs: ${dupes.join(',')}`)
  console.log('PASS: workout generation does not select same exercise twice')
}

function testApproveStartAfterNormalisation() {
  const plan: ApprovedWorkoutPlan = {
    id: 'workout-push-2026-07-15',
    workoutInstanceId: 'workout-push-2026-07-15',
    approvedAt: new Date().toISOString(),
    title: 'Push day',
    whySummary: 'test',
    exercises: [
      {
        plannedExerciseId: 'workout-push-2026-07-15::barbell-bench-press::1',
        exerciseId: 'barbell-bench-press',
        exerciseName: 'Barbell Bench Press',
        sets: 3,
        repRange: '8-10',
        targetReps: 10,
        targetRpe: 8,
        suggestedLoadKg: 60,
        prescriptionConfidence: 70,
      },
      {
        exerciseId: 'lateral-raise',
        exerciseName: 'Lateral Raise',
        sets: 3,
        repRange: '10-15',
        targetReps: 12,
        prescriptionConfidence: 60,
      },
      {
        exerciseId: 'lateral-raise',
        exerciseName: 'Lateral Raise',
        sets: 3,
        repRange: '10-15',
        targetReps: 12,
        prescriptionConfidence: 60,
      },
    ],
  }
  const active = createActiveWorkoutFromPlan(plan, 'Push day')
  const laterals = active.exercises.filter(e => e.exerciseId === 'lateral-raise')
  assert(laterals.length === 1, 'active workout dedupes lateral raise')
  assert(active.exercises.every(e => Boolean(e.plannedExerciseId)), 'active exercises have plannedExerciseId')
  console.log('PASS: approve and start still work after normalisation')
}

function testValidateWarnsOnDuplicates() {
  const result = validatePlannedWorkout({
    workoutInstanceId: 'w1',
    title: 'Push',
    exercises: [
      makeEx('lateral-raise', 'L'),
      makeEx('lateral-raise', 'L'),
    ],
  })
  assert(!result.valid, 'validation fails on duplicates')
  assert(result.duplicateExerciseIds.includes('lateral-raise'), 'names duplicate id')
  assert(result.warning?.includes('w1'), 'warning includes workout id')
  console.log('PASS: validation returns useful duplicate warning')
}

function testLoadMigrationRepairsStore() {
  const store = migrateDatastore({
    version: 1,
    profile: createDefaultGymProfile(),
    approvedPlan: {
      id: 'p1',
      approvedAt: '2026-07-15T00:00:00.000Z',
      title: 'Push',
      whySummary: 'x',
      exercises: [
        { exerciseId: 'lateral-raise', exerciseName: 'Lateral Raise', sets: 3, repRange: '10-15', targetReps: 12, prescriptionConfidence: 50 },
        { exerciseId: 'lateral-raise', exerciseName: 'Lateral Raise', sets: 3, repRange: '10-15', targetReps: 12, prescriptionConfidence: 50 },
      ],
    },
    activeWorkout: {
      id: 'aw1',
      startedAt: '2026-07-15T00:00:00.000Z',
      updatedAt: '2026-07-15T00:00:00.000Z',
      status: 'active',
      title: 'Push',
      sessionNotes: '',
      exercises: [
        { exerciseId: 'lateral-raise', exerciseName: 'Lateral Raise', order: 1, sets: [] },
        { exerciseId: 'lateral-raise', exerciseName: 'Lateral Raise', order: 2, sets: [] },
      ],
    },
    sessions: [],
  })
  assert(store.profile != null, 'profile preserved')
  assert(store.approvedPlan!.exercises.length === 1, 'approved plan repaired')
  assert(store.activeWorkout!.exercises.length === 1, 'active workout repaired')
  console.log('PASS: existing saved duplicate workouts repaired on load without wiping profile')
}

function run() {
  console.log('Planned exercise normalisation tests\n')
  testDedupeLateralRaise()
  testBenchAndInclineNotDeduped()
  testStableInstanceIds()
  testLegacyMigration()
  testListKeysNotOnlyExerciseId()
  testGenerationNoDuplicateLateral()
  testApproveStartAfterNormalisation()
  testValidateWarnsOnDuplicates()
  testLoadMigrationRepairsStore()
  console.log('\nAll planned-exercise tests passed.')
}

run()
