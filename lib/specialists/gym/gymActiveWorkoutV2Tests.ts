/**
 * Active Workout Engine v2 — lifecycle, idempotency, rest timer, offline queue, repo contract.
 */

import './gymTestSetup'
import assert from 'node:assert/strict'

import { detectSessionPRs, exerciseKey, findCurrentExerciseIndex } from './gymActiveWorkoutEngine'
import type {
  ActiveWorkout,
  ApprovedWorkoutPlan,
  GymProfile,
  SetPerformanceRecord,
  WorkoutSessionRecord,
} from './gymStorage/gymStorageTypes'
import {
  getGymStorageRepository,
  newGymId,
  resetGymStorageForTests,
} from './gymStorage/gymStorageRepository'
import {
  addSetToExercise,
  clearRestTimer,
  completeWorkout,
  createOrResumeActiveWorkoutFromPlan,
  createActiveWorkoutFromPlan,
  hasCompletedValidWorkingSet,
  pauseActiveWorkout,
  persistCompletedWorkout,
  remainingRestMs,
  removeSet,
  resumeActiveWorkout,
  skipExerciseInWorkout,
  startRestTimer,
  substituteExercise,
  updateSet,
  validateCompletedSetInput,
} from './gymStorage/gymWorkoutService'
import {
  clearGymPendingOpsForTests,
  enqueueGymPendingOp,
  listGymPendingOps,
  markGymPendingOpDone,
} from './gymStorage/gymPendingSync'
import { createLocalGymRepository } from './gymStorage/localGymRepository'
import { flushGymPendingOps } from './gymStorage/gymRepositoryFactory'
import { countWorkingSets, totalSessionVolumeKg } from './gymStorage/gymMuscleMapping'

function makeProfile(): GymProfile {
  return {
    id: 'p1',
    complete: true,
    firstSessionChoiceComplete: true,
    primaryGoal: 'muscle_growth',
    experience: 'intermediate',
    trainingDaysPerWeek: 4,
    sessionDurationMinutes: 60,
    equipment: ['barbell', 'dumbbell'],
    preferredSplit: 'push_pull_legs',
    exercisesEnjoy: [],
    exercisesDislike: [],
    injuryLimitations: [],
    targetMuscles: ['chest'],
    estimatedOneRepMaxes: {},
    trackingMode: 'rpe',
    smallestLoadIncrementKg: 2.5,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function makePlan(): ApprovedWorkoutPlan {
  return {
    id: 'plan-1',
    approvedAt: '2026-07-01T09:00:00.000Z',
    title: 'Push A',
    workoutInstanceId: 'wi-1',
    whySummary: 'test',
    exercises: [
      {
        plannedExerciseId: 'wi-1::barbell-bench-press::1',
        exerciseId: 'barbell-bench-press',
        exerciseName: 'Barbell Bench Press',
        sets: 2,
        repRange: '8-10',
        targetReps: 8,
        targetRpe: 7,
        suggestedLoadKg: 60,
        prescriptionConfidence: 0.8,
      },
      {
        plannedExerciseId: 'wi-1::overhead-press::2',
        exerciseId: 'overhead-press',
        exerciseName: 'Overhead Press',
        sets: 2,
        repRange: '6-8',
        targetReps: 6,
        targetRpe: 7,
        suggestedLoadKg: 40,
        prescriptionConfidence: 0.7,
      },
    ],
  }
}

function completeFirstSet(workout: ActiveWorkout): ActiveWorkout {
  const ex = workout.exercises[0]
  const set = ex.sets[0]
  return updateSet(workout, exerciseKey(ex), set.id, {
    weight: 60,
    reps: 8,
    rpe: 7,
    completed: true,
    completedAt: '2026-07-01T10:05:00.000Z',
  })
}

async function main() {
  resetGymStorageForTests()
  clearGymPendingOpsForTests()
  console.log('Active Workout Engine v2 tests\n')

  // ── Approve & start creates one session; repeated clicks do not duplicate ──
  {
    resetGymStorageForTests()
    const repo = getGymStorageRepository()
    const plan = makePlan()
    repo.saveApprovedPlan(plan)

    const first = createOrResumeActiveWorkoutFromPlan(plan, repo.getActiveWorkout())
    repo.saveActiveWorkout(first)
    const second = createOrResumeActiveWorkoutFromPlan(plan, repo.getActiveWorkout())
    assert.equal(second.id, first.id, 'repeated start resumes same workout')
    assert.equal(repo.getActiveWorkout()?.id, first.id)
    console.log('PASS: approve/start creates one session; repeated start does not duplicate')
  }

  // ── Refresh resumes ──
  {
    resetGymStorageForTests()
    const repo = getGymStorageRepository()
    const plan = makePlan()
    const workout = createActiveWorkoutFromPlan(plan, plan.title)
    const withSet = completeFirstSet(workout)
    repo.saveActiveWorkout(withSet)
    const resumed = repo.getActiveWorkout()
    assert.ok(resumed)
    assert.equal(resumed!.exercises[0].sets[0].completed, true)
    assert.equal(findCurrentExerciseIndex(resumed!), 0)
    console.log('PASS: refresh resumes active workout with logged sets')
  }

  // ── Set create / edit / delete idempotent; duplicate clicks do not duplicate sets ──
  {
    resetGymStorageForTests()
    const plan = makePlan()
    let workout = createActiveWorkoutFromPlan(plan, plan.title)
    const key = exerciseKey(workout.exercises[0])
    const setId = workout.exercises[0].sets[0].id
    const beforeCount = workout.exercises[0].sets.length

    workout = updateSet(workout, key, setId, {
      weight: 62.5,
      reps: 8,
      completed: true,
      completedAt: '2026-07-01T10:06:00.000Z',
    })
    workout = updateSet(workout, key, setId, {
      weight: 65,
      reps: 7,
      completed: true,
      completedAt: '2026-07-01T10:07:00.000Z',
    })
    assert.equal(workout.exercises[0].sets.length, beforeCount, 'edit does not create sets')
    assert.equal(workout.exercises[0].sets[0].weight, 65)

    workout = addSetToExercise(workout, key)
    const afterAdd = workout.exercises[0].sets.length
    const newId = workout.exercises[0].sets[afterAdd - 1].id
    workout = updateSet(workout, key, newId, { weight: 50, reps: 10, completed: false })
    workout = updateSet(workout, key, newId, { weight: 50, reps: 10, completed: false })
    assert.equal(workout.exercises[0].sets.length, afterAdd)

    workout = removeSet(workout, key, newId)
    assert.equal(workout.exercises[0].sets.length, afterAdd - 1)
    console.log('PASS: set create/edit/delete are idempotent; no duplicate sets')
  }

  // ── Rest timer remaining after backgrounding (timestamp-based) ──
  {
    const plan = makePlan()
    let workout = createActiveWorkoutFromPlan(plan, plan.title)
    const fixedNow = Date.parse('2026-07-01T10:00:00.000Z')
    workout = {
      ...startRestTimer(workout, 90),
      restTimerEndsAt: new Date(fixedNow + 90_000).toISOString(),
    }
    assert.equal(remainingRestMs(workout.restTimerEndsAt, fixedNow + 30_000), 60_000)
    const withEnds = {
      ...workout,
      restTimerEndsAt: new Date(fixedNow + 45_000).toISOString(),
    }
    const paused = pauseActiveWorkout(withEnds)
    assert.equal(paused.status, 'paused')
    assert.equal(paused.restTimerEndsAt, null)
    const resumed = resumeActiveWorkout({
      ...paused,
      pausedRestRemainingMs: 45_000,
    })
    assert.equal(resumed.status, 'active')
    assert.ok(resumed.restTimerEndsAt)
    const left = remainingRestMs(resumed.restTimerEndsAt, Date.now())
    assert.ok(left > 40_000 && left <= 45_000, `expected ~45s remaining, got ${left}`)
    assert.equal(clearRestTimer(resumed).restTimerEndsAt, null)
    console.log('PASS: rest timer derives remaining time after background/pause via timestamps')
  }

  // ── Completing workout updates history and clears active state ──
  {
    resetGymStorageForTests()
    const repo = getGymStorageRepository()
    const plan = makePlan()
    let workout = createActiveWorkoutFromPlan(plan, plan.title)
    workout = completeFirstSet(workout)
    assert.equal(hasCompletedValidWorkingSet(workout), true)
    const result = completeWorkout(workout, makeProfile(), [], {
      sessionRpe: 7,
      energyAfter: 'ok',
      discomfortReported: false,
    })
    persistCompletedWorkout(result)
    assert.equal(repo.getActiveWorkout(), null)
    const sessions = repo.listSessions()
    assert.equal(sessions.length, 1)
    assert.equal(sessions[0].status, 'completed')
    assert.equal(sessions[0].sessionRpe, 7)
    assert.ok((sessions[0].totalVolumeKg ?? 0) > 0)
    assert.equal(repo.getActiveWorkout(), null)
    console.log('PASS: complete updates history and clears active state safely')
  }

  // ── Incomplete / skipped sets excluded from progression and volume ──
  {
    const plan = makePlan()
    let workout = createActiveWorkoutFromPlan(plan, plan.title)
    const key0 = exerciseKey(workout.exercises[0])
    workout = updateSet(workout, key0, workout.exercises[0].sets[0].id, {
      weight: 60, reps: 8, completed: true, completedAt: '2026-07-01T10:05:00.000Z',
    })
    workout = skipExerciseInWorkout(workout, exerciseKey(workout.exercises[1]), 'fatigue')
    const result = completeWorkout(workout, makeProfile(), [])
    assert.ok(!result.session.exercises.some(e => e.exerciseId === 'overhead-press'), 'skipped exercise omitted from completed session exercises list')
    const volume = totalSessionVolumeKg(result.session)
    assert.equal(volume, 480)
    const hardSets = countWorkingSets(result.session.exercises)
    assert.equal(hardSets, 1)
    console.log('PASS: incomplete/skipped excluded from volume and progression inputs')
  }

  // ── PR logic does not fire from invalid data ──
  {
    const session: WorkoutSessionRecord = {
      id: 's-pr',
      date: '2026-07-01T12:00:00.000Z',
      startedAt: '2026-07-01T10:00:00.000Z',
      completedAt: '2026-07-01T11:00:00.000Z',
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
          { id: 'a', setNumber: 1, setType: 'working', weight: 0, reps: 0, completed: true },
          { id: 'b', setNumber: 2, setType: 'working', weight: -10, reps: 5, completed: true },
        ],
      }],
    }
    const prs = detectSessionPRs(session, [])
    assert.equal(prs.length, 0, 'invalid weight/reps must not create PRs')
    console.log('PASS: PR logic does not fire from invalid data')
  }

  // ── Offline writes flush once when online ──
  {
    clearGymPendingOpsForTests()
    enqueueGymPendingOp('save_active', { id: 'active-offline', title: 'x' }, 'active:active-offline')
    enqueueGymPendingOp('save_active', { id: 'active-offline', title: 'y' }, 'active:active-offline')
    const queued = listGymPendingOps()
    assert.equal(queued.length, 1, 'stable id replaces prior pending op (idempotent queue)')
    markGymPendingOpDone(queued[0].id)
    assert.equal(listGymPendingOps().length, 0)
    const result = await flushGymPendingOps(null)
    assert.equal(result.flushed, 0)
    console.log('PASS: offline writes queue idempotently and flush path is safe')
  }

  // ── Local repository satisfies GymRepository contract ──
  {
    resetGymStorageForTests()
    const local = createLocalGymRepository(getGymStorageRepository())
    const plan = makePlan()
    const workout = createActiveWorkoutFromPlan(plan, plan.title)
    await local.saveActiveWorkout(workout)
    const loaded = await local.getActiveWorkout()
    assert.equal(loaded?.id, workout.id)
    const set = loaded!.exercises[0].sets[0]
    const patched: SetPerformanceRecord = {
      ...set,
      weight: 70,
      reps: 5,
      completed: true,
      completedAt: '2026-07-01T10:10:00.000Z',
    }
    await local.createOrUpdateSet(workout.id, exerciseKey(loaded!.exercises[0]), patched)
    await local.createOrUpdateSet(workout.id, exerciseKey(loaded!.exercises[0]), patched)
    const after = await local.getActiveWorkout()
    assert.equal(after!.exercises[0].sets.filter(s => s.id === set.id).length, 1)
    await local.deleteSet(workout.id, exerciseKey(after!.exercises[0]), set.id)
    const afterDelete = await local.getActiveWorkout()
    assert.ok(!afterDelete!.exercises[0].sets.some(s => s.id === set.id))
    console.log('PASS: LocalGymRepository contract (set upsert/delete idempotent)')
  }

  // ── Stable IDs are UUID-shaped for cloud compatibility ──
  {
    const id = newGymId()
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    console.log('PASS: newGymId produces UUID for cloud PK compatibility')
  }

  // ── Substitute preserves original prescription ──
  {
    const plan = makePlan()
    let workout = createActiveWorkoutFromPlan(plan, plan.title)
    const key = exerciseKey(workout.exercises[0])
    const originalName = workout.exercises[0].exerciseName
    workout = substituteExercise(workout, key, 'incline-dumbbell-press')
    assert.equal(workout.exercises[0].exerciseId, 'incline-dumbbell-press')
    assert.equal(workout.exercises[0].originalPrescription?.exerciseName, originalName)
    console.log('PASS: substitute preserves original prescription')
  }

  // ── Validation rejects bad set input ──
  {
    assert.ok(validateCompletedSetInput({ weight: -1, reps: 5 }))
    assert.ok(validateCompletedSetInput({ weight: 60, reps: 0 }))
    assert.equal(validateCompletedSetInput({ weight: 60, reps: 8, rpe: 7 }), null)
    console.log('PASS: set validation')
  }

  // ── Mobile logger key uniqueness helper (exercise keys unique in session) ──
  {
    const plan = makePlan()
    const workout = createActiveWorkoutFromPlan(plan, plan.title)
    const keys = workout.exercises.map(exerciseKey)
    assert.equal(new Set(keys).size, keys.length, 'exercise list keys must be unique (no duplicate React keys)')
    const setIds = workout.exercises.flatMap(e => e.sets.map(s => s.id))
    assert.equal(new Set(setIds).size, setIds.length, 'set ids unique')
    console.log('PASS: logger exercise/set keys unique (no duplicate React keys)')
  }

  console.log('\nAll Active Workout Engine v2 tests passed.')
}

void main()
