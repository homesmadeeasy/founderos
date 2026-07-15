import assert from 'node:assert/strict'
import { GYM_EXERCISE_LIBRARY } from '../gymExerciseLibrary'
import { generateTodaysWorkout } from '../gymWorkoutPlanner'
import type { GoalProfile } from '../gymTypes'
import { buildExercisePrescription } from './gymPrescriptionReasoning'
import { buildPrescriptionContext } from './gymPrescriptionContext'
import { listApprovedClaims, listResearchSources, resetEvidenceRegistryForTests } from './gymEvidenceRegistry'
import { isSourceOutdated } from './gymEvidenceCitations'

function benchExercise() {
  return GYM_EXERCISE_LIBRARY.find(e => e.id === 'barbell-bench-press')!
}

function baseGoal(overrides: Partial<GoalProfile> = {}): GoalProfile {
  return {
    primaryGoal: 'general_fitness',
    label: 'general fitness',
    trainingDaysPerWeek: 3,
    experience: 'beginner',
    ...overrides,
  }
}

function baseParams(overrides: Record<string, unknown> = {}) {
  return {
    goal: baseGoal(),
    recovery: 'ready' as const,
    sessions: [],
    volume: [{ muscle: 'chest' as const, sets: 0, status: 'unknown' as const, trend: 'unknown' as const }],
    weaknesses: [],
    equipment: { available: ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight'] as const, limitations: [] },
    injuries: { areas: [], restrictions: [] },
    evidenceIds: [],
    healthText: '',
    shortSession: false,
    ...overrides,
  }
}

function testBeginnerNoHistory() {
  const ex = benchExercise()
  const ctx = buildPrescriptionContext({
    exercise: ex,
    goal: baseGoal(),
    recovery: 'ready',
    sessions: [],
    volume: [],
    injuries: { areas: [], restrictions: [] },
    equipment: { available: ['barbell'], limitations: [] },
    userEvidenceIds: [],
  })
  const rx = buildExercisePrescription(ex, ctx, false)
  assert.ok(rx.sets >= 2 && rx.sets <= 4)
  assert.ok(rx.targetReps >= 8, 'Beginners should not default to 6 reps without strength reason')
  assert.ok(rx.prescriptionConfidence < 80)
  assert.ok(rx.explanation.missingDataForPersonalisation.includes('structured workout history'))
}

function testHypertrophyGoal() {
  const ex = benchExercise()
  const ctx = buildPrescriptionContext({
    exercise: ex,
    goal: baseGoal({ primaryGoal: 'muscle_growth', experience: 'intermediate' }),
    recovery: 'ready',
    sessions: [{ id: '1', date: new Date().toISOString(), title: 'Push', exercises: [{ exerciseId: 'barbell-bench-press', exerciseName: 'Bench', sets: [{ setNumber: 1, reps: 10, weight: 60, completed: true }] }], completed: true, sourceType: 'memory', sourceId: '1' }],
    volume: [{ muscle: 'chest', sets: 8, status: 'optimal', trend: 'stable' }],
    injuries: { areas: [], restrictions: [] },
    equipment: { available: ['barbell'], limitations: [] },
    userEvidenceIds: ['ev-1'],
  })
  const rx = buildExercisePrescription(ex, ctx, false)
  assert.match(rx.repRange, /8|9|10|11|12/)
  assert.ok(rx.targetReps >= 8)
  assert.ok(rx.researchClaimIds.length > 0, 'Hypertrophy should cite approved claims')
}

function testStrengthGoal() {
  const ex = benchExercise()
  const ctx = buildPrescriptionContext({
    exercise: ex,
    goal: baseGoal({ primaryGoal: 'strength', experience: 'intermediate' }),
    recovery: 'ready',
    sessions: [],
    volume: [],
    injuries: { areas: [], restrictions: [] },
    equipment: { available: ['barbell'], limitations: [] },
    userEvidenceIds: [],
  })
  const rx = buildExercisePrescription(ex, ctx, false)
  assert.ok(rx.targetReps <= 6)
}

function testPoorRecovery() {
  const workout = generateTodaysWorkout(baseParams({ recovery: 'deload' }))
  assert.ok(workout.exercises.length <= 4)
  const ex = workout.exercises[0]
  assert.ok(ex.targetRpe <= 7)
}

function testHighChestVolume() {
  const ex = benchExercise()
  const ctx = buildPrescriptionContext({
    exercise: ex,
    goal: baseGoal({ primaryGoal: 'muscle_growth', experience: 'intermediate' }),
    recovery: 'ready',
    sessions: [],
    volume: [{ muscle: 'chest', sets: 18, status: 'high', trend: 'up' }],
    injuries: { areas: [], restrictions: [] },
    equipment: { available: ['barbell'], limitations: [] },
    userEvidenceIds: [],
  })
  const rx = buildExercisePrescription(ex, ctx, false)
  assert.ok(rx.assumptions.some(a => /volume/i.test(a)))
  assert.ok(rx.sets <= 3)
}

function testPainFlag() {
  const ex = benchExercise()
  const ctx = buildPrescriptionContext({
    exercise: ex,
    goal: baseGoal(),
    recovery: 'ready',
    sessions: [],
    volume: [],
    injuries: { areas: ['shoulder'], restrictions: [] },
    equipment: { available: ['barbell'], limitations: [] },
    userEvidenceIds: [],
    healthText: 'shoulder pain during pressing',
  })
  const rx = buildExercisePrescription(ex, ctx, false)
  assert.ok(rx.contraindicationFlags.length > 0)
  assert.ok(rx.explanation.safetyNotes.some(n => /health professional|conservative/i.test(n)))
}

function testLimitedEquipment() {
  const workout = generateTodaysWorkout(baseParams({
    equipment: { available: ['dumbbell', 'bodyweight'], limitations: ['no barbell'] },
  }))
  assert.ok(!workout.exercises.some(e => e.exerciseId === 'barbell-bench-press'))
}

function testShortSession() {
  const ex = benchExercise()
  const ctx = buildPrescriptionContext({
    exercise: ex,
    goal: baseGoal(),
    recovery: 'ready',
    sessions: [],
    volume: [],
    injuries: { areas: [], restrictions: [] },
    equipment: { available: ['barbell'], limitations: [] },
    userEvidenceIds: [],
    shortSession: true,
  })
  const rx = buildExercisePrescription(ex, ctx, false)
  assert.ok(rx.assumptions.some(a => /shorter/i.test(a)))
}

function testBenchPressExplanation() {
  const ex = benchExercise()
  const ctx = buildPrescriptionContext({
    exercise: ex,
    goal: baseGoal({ primaryGoal: 'muscle_growth' }),
    recovery: 'ready',
    sessions: [],
    volume: [],
    injuries: { areas: [], restrictions: [] },
    equipment: { available: ['barbell'], limitations: [] },
    userEvidenceIds: [],
  })
  const rx = buildExercisePrescription(ex, ctx, false)
  assert.ok(rx.rationale.length > 20)
  assert.ok(rx.explanation.researchBasis.length > 10)
  if (rx.targetReps === 6 && ctx.goal === 'muscle_growth') {
    assert.fail('Hypertrophy bench should not silently use 6 reps without strength rationale')
  }
}

function testDeterministicPrescription() {
  const ex = benchExercise()
  const ctx = buildPrescriptionContext({
    exercise: ex,
    goal: baseGoal({ primaryGoal: 'muscle_growth', experience: 'intermediate' }),
    recovery: 'ready',
    sessions: [],
    volume: [{ muscle: 'chest', sets: 6, status: 'optimal', trend: 'stable' }],
    injuries: { areas: [], restrictions: [] },
    equipment: { available: ['barbell'], limitations: [] },
    userEvidenceIds: [],
  })
  const a = buildExercisePrescription(ex, ctx, false)
  const b = buildExercisePrescription(ex, ctx, false)
  assert.deepEqual(a.sets, b.sets)
  assert.deepEqual(a.targetReps, b.targetReps)
  assert.deepEqual(a.targetRPE, b.targetRPE)
}

function testNoInventedResearchClaims() {
  const workout = generateTodaysWorkout(baseParams())
  for (const ex of workout.exercises) {
    for (const claimId of ex.prescription.researchClaimIds) {
      const claim = listApprovedClaims().find(c => c.id === claimId)
      assert.ok(claim, `Claim ${claimId} must exist in registry`)
      assert.equal(claim!.status, 'approved')
    }
  }
}

function testApprovedSourcesOnlyAffectRx() {
  const provisional = listResearchSources('provisional')
  assert.ok(provisional.length > 0)
  const approvedClaims = listApprovedClaims()
  assert.ok(approvedClaims.every(c => c.status === 'approved'))
}

function testOutdatedSourceDetection() {
  const old = listResearchSources('approved')[0]
  const outdated = { ...old, reviewedAt: '2019-01-01T00:00:00.000Z' }
  assert.equal(isSourceOutdated(outdated), true)
}

async function run() {
  resetEvidenceRegistryForTests()
  testBeginnerNoHistory()
  testHypertrophyGoal()
  testStrengthGoal()
  testPoorRecovery()
  testHighChestVolume()
  testPainFlag()
  testLimitedEquipment()
  testShortSession()
  testBenchPressExplanation()
  testDeterministicPrescription()
  testNoInventedResearchClaims()
  testApprovedSourcesOnlyAffectRx()
  testOutdatedSourceDetection()
  console.log('gymEvidenceTests: all passed')
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
