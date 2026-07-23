/**
 * Active Workout Engine tests — live advice, metrics, and summary honesty.
 */

import './gymTestSetup'
import assert from 'node:assert/strict'

import {
  adviseNextSet,
  buildWorkoutSummaryDetail,
  detectSessionPRs,
  findCurrentExerciseIndex,
  findCurrentSet,
} from './gymActiveWorkoutEngine'
import type {
  ActiveWorkout,
  ExercisePerformanceRecord,
  GymProfile,
  WorkoutSessionRecord,
} from './gymStorage/gymStorageTypes'
import { resetGymStorageForTests } from './gymStorage/gymStorageRepository'
import {
  createOrResumeActiveWorkoutFromPlan,
  finishExerciseInWorkout,
  hasCompletedValidWorkingSet,
  validateCompletedSetInput,
} from './gymStorage/gymWorkoutService'
import type { ApprovedWorkoutPlan } from './gymStorage/gymStorageTypes'

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

function makeExercise(partial?: Partial<ExercisePerformanceRecord>): ExercisePerformanceRecord {
  return {
    plannedExerciseId: 'w1::barbell-bench-press::1',
    exerciseId: 'barbell-bench-press',
    exerciseName: 'Barbell Bench Press',
    order: 1,
    sets: [
      { id: 's1', setNumber: 1, setType: 'working', weight: 60, reps: 10, rpe: 7, completed: true },
      { id: 's2', setNumber: 2, setType: 'working', weight: 60, reps: 10, rpe: 7, completed: false },
    ],
    ...partial,
  }
}

function makeActive(exercises: ExercisePerformanceRecord[]): ActiveWorkout {
  return {
    id: 'w1',
    startedAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-01T10:10:00.000Z',
    status: 'active',
    title: 'Push',
    exercises,
    sessionNotes: '',
  }
}

resetGymStorageForTests()
console.log('Active workout engine tests\n')

{
  const plan: ApprovedWorkoutPlan = {
    id: 'plan-1', approvedAt: '2026-07-01T09:00:00.000Z', title: 'Push', whySummary: 'Test',
    exercises: [{
      exerciseId: 'barbell-bench-press', exerciseName: 'Bench', sets: 2,
      repRange: '8-10', targetReps: 8, prescriptionConfidence: 0.8,
    }],
  }
  const existing = makeActive([makeExercise()])
  assert.equal(createOrResumeActiveWorkoutFromPlan(plan, existing), existing)
  console.log('PASS: repeated start resumes the existing active workout')
}

{
  const workout = makeActive([makeExercise()])
  const finished = finishExerciseInWorkout(workout, 'w1::barbell-bench-press::1')
  assert.equal(finished.exercises[0].finished, true)
  assert.equal(finished.exercises[0].sets[1].completed, false)
  assert.equal(findCurrentExerciseIndex(finished), -1)
  console.log('PASS: finish exercise never invents completion for unlogged sets')
}

{
  assert.equal(validateCompletedSetInput({ weight: 60, reps: 8, rpe: 8 }), null)
  assert.match(validateCompletedSetInput({ weight: 60, reps: 0 }) ?? '', /Reps/)
  assert.match(validateCompletedSetInput({ weight: 60, reps: 8, rpe: 11 }) ?? '', /RPE/)
  assert.equal(hasCompletedValidWorkingSet(makeActive([makeExercise({
    sets: [{ id: 'empty', setNumber: 1, setType: 'working', weight: 0, reps: 8, completed: false }],
  })])), false)
  assert.equal(hasCompletedValidWorkingSet(makeActive([makeExercise()])), true)
  console.log('PASS: completed-set input rejects corrupt values')
}

{
  const workout = makeActive([
    makeExercise(),
    makeExercise({
      plannedExerciseId: 'w1::row::1',
      exerciseId: 'barbell-row',
      exerciseName: 'Barbell Row',
      order: 2,
      sets: [{ id: 'r1', setNumber: 1, setType: 'working', weight: 50, reps: 8, completed: false }],
    }),
  ])
  assert.equal(findCurrentExerciseIndex(workout), 0)
  assert.equal(findCurrentSet(workout.exercises[0])?.id, 's2')
  console.log('PASS: current exercise/set navigation')
}

{
  const ex = makeExercise()
  const advice = adviseNextSet({
    exercise: ex,
    justCompleted: ex.sets[0],
    targetRepRange: '8-10',
    profile: makeProfile(),
    historySessions: [],
  })
  assert.equal(advice.action, 'increase')
  assert.ok(advice.suggestedWeight === 62.5)
  assert.ok((advice.estimatedE1RM ?? 0) > 0)
  console.log('PASS: next-set increase advice from logged set')
}

{
  const ex = makeExercise({
    sets: [
      { id: 's1', setNumber: 1, setType: 'working', weight: 80, reps: 5, rpe: 9.5, completed: true, painFlag: false },
      { id: 's2', setNumber: 2, setType: 'working', weight: 80, reps: 8, completed: false },
    ],
  })
  const advice = adviseNextSet({
    exercise: ex,
    justCompleted: ex.sets[0],
    targetRepRange: '8-10',
    profile: makeProfile(),
    historySessions: [],
  })
  assert.equal(advice.action, 'reduce')
  console.log('PASS: high RPE / missed range suggests reduce')
}

{
  const prior: WorkoutSessionRecord = {
    id: 'old',
    date: '2026-06-01T12:00:00.000Z',
    startedAt: '2026-06-01T12:00:00.000Z',
    completedAt: '2026-06-01T12:45:00.000Z',
    title: 'Prior',
    exercises: [makeExercise({
      sets: [
        { id: 'p1', setNumber: 1, setType: 'working', weight: 50, reps: 8, completed: true },
      ],
    })],
    completed: true,
    status: 'completed',
    painFlags: [],
    source: 'gym_logger',
    totalVolumeKg: 400,
    adherenceScore: 100,
  }
  const session: WorkoutSessionRecord = {
    ...prior,
    id: 'new',
    exercises: [makeExercise({
      sets: [
        { id: 'n1', setNumber: 1, setType: 'working', weight: 70, reps: 8, completed: true },
      ],
    })],
  }
  const prs = detectSessionPRs(session, [prior])
  assert.equal(prs.length, 1)
  assert.match(prs[0].detail, /70/)

  const firstOnly = detectSessionPRs(session, [])
  assert.equal(firstOnly.length, 0)
  console.log('PASS: PR detection requires prior history; does not invent PRs')
}

{
  const session: WorkoutSessionRecord = {
    id: 'done',
    date: '2026-07-01T12:00:00.000Z',
    startedAt: '2026-07-01T12:00:00.000Z',
    completedAt: '2026-07-01T12:50:00.000Z',
    title: 'Push',
    exercises: [makeExercise({
      sets: [
        { id: 'a', setNumber: 1, setType: 'working', weight: 60, reps: 10, completed: true },
        { id: 'b', setNumber: 2, setType: 'working', weight: 60, reps: 9, completed: true },
      ],
    })],
    completed: true,
    status: 'completed',
    painFlags: [],
    source: 'gym_logger',
    totalVolumeKg: 1140,
    adherenceScore: 100,
    durationMinutes: 50,
  }
  const detail = buildWorkoutSummaryDetail({
    session,
    progressionRecords: [],
    historySessions: [],
    profile: makeProfile(),
  })
  assert.ok(detail.musclesTrained.length > 0)
  assert.ok(detail.recoveryPrediction.length > 0)
  assert.ok(detail.assumptions.some(a => /PR/i.test(a) || /prior/i.test(a)))
  console.log('PASS: summary includes muscles + honest assumptions')
}

console.log('\nAll active workout engine tests passed.')
