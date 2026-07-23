/**
 * Gym personalisation & workout tracking tests.
 * Run: npm run test:gym-personalisation
 */
import './gymTestSetup'
import { validateProfile, migrateDatastore, dedupeSessions, compactDatastore, emptyDatastore } from './gymStorage/gymStorageSchema'
import { createGymStorageRepository, resetGymStorageForTests, newGymId } from './gymStorage/gymStorageRepository'
import { computeDoubleProgression } from './gymStorage/gymDoubleProgression'
import { computeMuscleVolumeFromSessions, hasCompleteTrainingWeek } from './gymStorage/gymMuscleMapping'
import {
  completeWorkout,
  createActiveWorkoutFromPlan,
  updateSet,
  persistCompletedWorkout,
} from './gymStorage/gymWorkoutService'
import type { GymProfile, WorkoutSessionRecord, ApprovedWorkoutPlan } from './gymStorage/gymStorageTypes'
import { createDefaultGymProfile } from './gymProfileUtils'
import { mergeWorkoutSessions, hasStructuredHistory } from './gymSessionMerge'
import { buildGymSnapshot } from './gymSnapshot'
import type { GymInput } from './gymTypes'

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`)
}

function makeProfile(): GymProfile {
  const p = createDefaultGymProfile()
  p.complete = true
  p.firstSessionChoiceComplete = true
  p.firstSessionIntent = 'today'
  p.primaryGoal = 'muscle_growth'
  p.experience = 'intermediate'
  p.trainingDaysPerWeek = 4
  p.sessionDurationMinutes = 60
  p.smallestLoadIncrementKg = 2.5
  return p
}

function testProfileValidation() {
  const p = makeProfile()
  assert(validateProfile(p).length === 0, 'valid profile passes')
  const bad = { ...p, trainingDaysPerWeek: 0 }
  assert(validateProfile(bad).length > 0, 'invalid days rejected')
  console.log('PASS: profile validation')
}

function completedSession(partial: Partial<WorkoutSessionRecord> & Pick<WorkoutSessionRecord, 'id' | 'title'>): WorkoutSessionRecord {
  const now = '2026-06-20T10:00:00.000Z'
  return {
    date: now,
    startedAt: '2026-06-20T09:00:00.000Z',
    completedAt: now,
    updatedAt: now,
    exercises: [],
    completed: true,
    status: 'completed',
    painFlags: [],
    source: 'gym_logger',
    ...partial,
  }
}

function testMigrationAndCompaction() {
  const migrated = migrateDatastore({ version: 0, sessions: [] })
  assert(migrated.version === 3, 'migrates to v3')
  const dup = completedSession({ id: 's1', title: 'Push' })
  const deduped = dedupeSessions([dup, { ...dup, id: 's2' }])
  assert(deduped.length === 1, 'dedupes sessions')
  const compact = compactDatastore({ ...emptyDatastore(), sessions: Array.from({ length: 250 }, (_, i) => ({ ...dup, id: `x${i}` })) })
  assert(compact.sessions.length <= 200, 'caps sessions')
  const legacy = migrateDatastore({
    version: 1,
    sessions: [{
      id: 'legacy',
      date: nowISOSafe(),
      startedAt: nowISOSafe(),
      completedAt: nowISOSafe(),
      title: 'Push',
      exercises: [],
      completed: true,
      status: 'completed',
      painFlags: [],
      source: 'gym_logger',
    }],
  })
  assert(legacy.sessions[0]?.status === 'completed', 'legacy completed → status completed')
  console.log('PASS: migration and compaction')
}

function nowISOSafe() {
  return '2026-06-20T10:00:00.000Z'
}

function testActiveWorkoutResume() {
  resetGymStorageForTests()
  const repo = createGymStorageRepository()
  const plan: ApprovedWorkoutPlan = {
    id: newGymId(),
    approvedAt: new Date().toISOString(),
    title: 'Push day',
    whySummary: 'test',
    exercises: [{
      exerciseId: 'barbell-bench-press',
      exerciseName: 'Barbell Bench Press',
      sets: 3,
      repRange: '8-10',
      targetReps: 10,
      targetRpe: 8,
      suggestedLoadKg: 60,
      prescriptionConfidence: 70,
    }],
  }
  let workout = createActiveWorkoutFromPlan(plan, 'Push day')
  repo.saveActiveWorkout(workout)
  const loaded = repo.getActiveWorkout()
  assert(loaded?.id === workout.id, 'active workout persists')
  const setId = loaded!.exercises[0].sets[0].id
  workout = updateSet(loaded!, 'barbell-bench-press', setId, { weight: 60, reps: 10, rpe: 8, completed: true })
  repo.saveActiveWorkout(workout)
  const reloaded = repo.getActiveWorkout()
  assert(reloaded?.exercises[0].sets[0].weight === 60, 'set updates persist')
  console.log('PASS: active workout resume')
}

function testBenchProgressionMaintain() {
  const profile = makeProfile()
  const session: WorkoutSessionRecord = {
    id: 'sess1',
    date: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    title: 'Push',
    completed: true,
    status: 'completed',
    painFlags: [],
    source: 'gym_logger',
    exercises: [{
      exerciseId: 'barbell-bench-press',
      exerciseName: 'Barbell Bench Press',
      order: 1,
      sets: [
        { id: '1', setNumber: 1, setType: 'working', reps: 10, weight: 60, rpe: 8, completed: true },
        { id: '2', setNumber: 2, setType: 'working', reps: 10, weight: 60, rpe: 8, completed: true },
        { id: '3', setNumber: 3, setType: 'working', reps: 9, weight: 60, rpe: 8, completed: true },
      ],
    }],
  }
  const result = computeDoubleProgression({
    exerciseId: 'barbell-bench-press',
    exerciseName: 'Barbell Bench Press',
    sessions: [session],
    targetRepRange: '8-10',
    profile,
  })
  assert(result.action === 'maintain', `expected maintain, got ${result.action}`)
  assert(result.recommendation.includes('60'), 'recommendation mentions 60 kg')
  assert(result.evidence.includes('60 kg'), 'evidence quotes last session')
  console.log('PASS: bench maintain progression')
}

function testPainBlocksProgression() {
  const session: WorkoutSessionRecord = {
    id: 's',
    date: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    title: 'Push',
    completed: true,
    status: 'completed',
    painFlags: ['shoulder'],
    source: 'gym_logger',
    exercises: [{
      exerciseId: 'barbell-bench-press',
      exerciseName: 'Bench',
      order: 1,
      sets: [{ id: '1', setNumber: 1, setType: 'working', reps: 10, weight: 60, painFlag: true, completed: true }],
    }],
  }
  const result = computeDoubleProgression({
    exerciseId: 'barbell-bench-press',
    exerciseName: 'Bench',
    sessions: [session],
    targetRepRange: '8-10',
    profile: makeProfile(),
    painBlocked: true,
  })
  assert(result.action === 'maintain', 'pain blocks increase')
  assert(/pain/i.test(result.recommendation), 'mentions pain')
  console.log('PASS: pain blocks progression')
}

function testWeeklyVolume() {
  const session: WorkoutSessionRecord = {
    id: 's',
    date: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    title: 'Push',
    completed: true,
    status: 'completed',
    painFlags: [],
    source: 'gym_logger',
    exercises: [{
      exerciseId: 'barbell-bench-press',
      exerciseName: 'Bench',
      order: 1,
      sets: [
        { id: '1', setNumber: 1, setType: 'working', reps: 10, weight: 60, completed: true },
        { id: '2', setNumber: 2, setType: 'working', reps: 10, weight: 60, completed: true },
        { id: '3', setNumber: 3, setType: 'working', reps: 9, weight: 60, completed: true },
      ],
    }],
  }
  const vol = computeMuscleVolumeFromSessions([session], false)
  const chest = vol.find(v => v.muscle === 'chest')
  assert(chest != null && chest.directSets === 3, `chest direct sets = 3, got ${chest?.directSets}`)
  assert(chest.status === 'within_baseline' || chest.status === 'insufficient_data', 'status ok without full week')
  console.log('PASS: weekly volume calculation')
}

function testNoHistorySnapshot() {
  const input: GymInput = {
    objects: [],
    memories: [],
    knowledge: [],
    signals: [],
    outcomes: [],
    tasks: [],
    projects: [],
    structuredSessions: [],
    storedProfile: makeProfile(),
  }
  const snap = buildGymSnapshot(input)
  assert(!snap.hasStructuredHistory, 'no structured history')
  assert(snap.mainInsight.includes('No structured') || snap.mainInsight.includes('history'), 'explicit no history')
  console.log('PASS: no-history snapshot behaviour')
}

function testE2EScenario() {
  resetGymStorageForTests()
  const repo = createGymStorageRepository()
  const profile = makeProfile()
  repo.saveProfile(profile)

  const plan: ApprovedWorkoutPlan = {
    id: newGymId(),
    approvedAt: new Date().toISOString(),
    title: 'Push day',
    whySummary: 'Hypertrophy push',
    exercises: [{
      exerciseId: 'barbell-bench-press',
      exerciseName: 'Barbell Bench Press',
      sets: 3,
      repRange: '8-10',
      targetReps: 10,
      targetRpe: 8,
      suggestedLoadKg: 60,
      prescriptionConfidence: 70,
    }],
  }

  let workout = createActiveWorkoutFromPlan(plan, 'Push day')
  for (const set of workout.exercises[0].sets) {
    workout = updateSet(workout, 'barbell-bench-press', set.id, {
      weight: 60,
      reps: set.setNumber === 3 ? 9 : 10,
      rpe: 8,
      completed: true,
      setType: 'working',
    })
  }
  const result = completeWorkout(workout, profile, [])
  persistCompletedWorkout(result)

  const sessions = repo.listSessions()
  assert(sessions.length === 1, 'session saved')
  assert(hasStructuredHistory(sessions), 'structured history exists')

  const progression = computeDoubleProgression({
    exerciseId: 'barbell-bench-press',
    exerciseName: 'Barbell Bench Press',
    sessions,
    targetRepRange: '8-10',
    profile,
  })
  assert(progression.action === 'maintain', 'maintain 60 kg recommendation')

  const vol = computeMuscleVolumeFromSessions(sessions, false)
  const chest = vol.find(v => v.muscle === 'chest')
  assert((chest?.directSets ?? 0) >= 3, 'chest volume updated')

  const input: GymInput = {
    objects: [],
    memories: [],
    knowledge: [],
    signals: [],
    outcomes: [],
    tasks: [],
    projects: [],
    structuredSessions: sessions,
    storedProfile: profile,
  }
  const snap = buildGymSnapshot(input)
  assert(snap.hasStructuredHistory, 'snapshot sees history')
  assert(snap.recentSessions.length >= 1, 'history shows workout')
  console.log('PASS: e2e hypertrophy bench scenario')
}

function testSingleStorageKey() {
  resetGymStorageForTests()
  const repo = createGymStorageRepository()
  repo.saveProfile(makeProfile())
  const keys = typeof localStorage !== 'undefined'
    ? Object.keys(localStorage).filter(k => k.includes('gym') || k.includes('workout'))
    : []
  const gymKeys = keys.filter(k => k.startsWith('founderos-gym'))
  assert(gymKeys.length <= 1, `single gym storage key, found: ${gymKeys.join(',')}`)
  console.log('PASS: single storage key')
}

function testNonCompletedDoNotAffectStats() {
  const planned = completedSession({
    id: 'planned',
    title: 'Push',
    completed: false,
    status: 'planned',
    completedAt: '',
    exercises: [{
      exerciseId: 'barbell-bench-press',
      exerciseName: 'Bench',
      order: 1,
      sets: [
        { id: '1', setNumber: 1, setType: 'working', reps: 10, weight: 60, completed: true },
      ],
    }],
  })
  const skipped = {
    ...planned,
    id: 'skipped',
    status: 'skipped' as const,
    skipReason: 'busy' as const,
    exercises: [],
  }
  const real = completedSession({
    id: 'real',
    title: 'Push',
    date: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    exercises: [{
      exerciseId: 'barbell-bench-press',
      exerciseName: 'Bench',
      order: 1,
      sets: [
        { id: '1', setNumber: 1, setType: 'working', reps: 10, weight: 60, completed: true },
        { id: '2', setNumber: 2, setType: 'working', reps: 10, weight: 60, completed: true },
      ],
    }],
  })

  assert(!hasStructuredHistory([planned, skipped]), 'planned/skipped are not structured history')
  const volOnlyFake = computeMuscleVolumeFromSessions([planned, skipped], false)
  const chestFake = volOnlyFake.find(v => v.muscle === 'chest')
  assert((chestFake?.directSets ?? 0) === 0, 'planned/skipped add zero chest volume')

  const vol = computeMuscleVolumeFromSessions([planned, skipped, real], false)
  const chest = vol.find(v => v.muscle === 'chest')
  assert((chest?.directSets ?? 0) === 2, 'only completed session sets count')

  const prog = computeDoubleProgression({
    exerciseId: 'barbell-bench-press',
    exerciseName: 'Bench',
    sessions: [planned, skipped],
    targetRepRange: '8-10',
    profile: makeProfile(),
  })
  assert(prog.action === 'insufficient_data', 'progression ignores non-completed')
  console.log('PASS: planned/skipped/cancelled ignored by stats engines')
}

function run() {
  console.log('Gym personalisation tests\n')
  testProfileValidation()
  testMigrationAndCompaction()
  testActiveWorkoutResume()
  testBenchProgressionMaintain()
  testPainBlocksProgression()
  testWeeklyVolume()
  testNoHistorySnapshot()
  testE2EScenario()
  testSingleStorageKey()
  testNonCompletedDoNotAffectStats()
  console.log('\nAll gym personalisation tests passed.')
}

run()
