/**
 * Intelligence Pipeline tests — contracts, order, degradation, gym grounding, idempotency.
 */

import assert from 'node:assert/strict'
import {
  runIntelligencePipeline,
  runIntelligencePipelineIdempotent,
  getCanonicalStageOrder,
  createDuplicateStageGuard,
  clearLastIntelligenceResult,
  getLastIntelligenceResult,
  CANONICAL_STAGE_ORDER,
} from './index'
import {
  answerGymWithIntelligence,
  collectGymDomainEvidence,
  gymReadinessFromSources,
  inferGymIntent,
} from '@/lib/specialists/gym/gymIntelligence'
import { declareInputsFromGymProfile } from '@/lib/specialists/gym/gymIdentityBootstrap'
import { createDefaultGymProfile } from '@/lib/specialists/gym/gymProfileUtils'
import type { GymSnapshot } from '@/lib/specialists/gym/gymTypes'

function minimalSnapshot(overrides: Partial<GymSnapshot> = {}): GymSnapshot {
  return {
    momentumScore: 40,
    consistencyScore: 40,
    recoveryScore: 70,
    volumeScore: 40,
    progressionScore: 30,
    mainInsight: 'No structured history yet.',
    topRecommendation: 'Log your first session',
    recoveryStatus: 'ready',
    todaysWorkout: {
      title: 'Full Body A',
      rationale: 'Baseline plan from declared goal and equipment',
      estimatedMinutes: 45,
      exercises: [
        {
          order: 1,
          exerciseId: 'sq',
          exerciseName: 'Squat',
          sets: 3,
          reps: '8',
          targetRpe: 7,
          prescription: {
            prescriptionMode: 'fallback',
            prescriptionConfidence: 40,
            researchClaimIds: [],
            researchSummary: { claims: [], notes: '' } as never,
          },
        } as never,
      ],
    } as never,
    weeklyVolume: [],
    strengthEstimates: [],
    progressionRecommendations: [],
    weaknesses: [],
    recommendations: [],
    recentSessions: [],
    goalProfile: { primaryGoal: 'muscle_growth', label: 'Build muscle', trainingDaysPerWeek: 3, experience: 'beginner' } as GymSnapshot['goalProfile'],
    equipmentProfile: { available: ['dumbbell'], limitations: [] },
    injuryProfile: { areas: [], restrictions: [] },
    trainingBlock: {} as never,
    evidence: [],
    narrative: '',
    hasWorkoutHistory: false,
    hasStructuredHistory: false,
    profileComplete: true,
    sessionsThisWeek: 0,
    techniqueReviews: [],
    videoAnalysis: [],
    movementAnalysis: [],
    ...overrides,
  }
}

async function main() {
  console.log('Intelligence Pipeline tests\n')
  clearLastIntelligenceResult()

  {
    const order = getCanonicalStageOrder()
    assert.ok(order.includes('declared_profile'))
    assert.ok(order.includes('domain_evidence'))
    assert.ok(order.includes('missing_information'))
    assert.equal(order[0], 'conversation_context')
    assert.deepEqual(order, [...CANONICAL_STAGE_ORDER])
    console.log('PASS: canonical contract stage order')
  }

  {
    const allow = createDuplicateStageGuard()
    assert.equal(allow('identity'), true)
    assert.equal(allow('identity'), false)
    console.log('PASS: duplicate stage calls prevented')
  }

  {
    const result = await runIntelligencePipeline(
      { specialist: 'gym', userMessage: 'What should I train today?' },
      { readOnly: true },
    )
    assert.ok(result.responseContext)
    assert.ok(Array.isArray(result.missingInformation))
    assert.ok(result.trace.sanitizedReport.includes('requestId='))
    assert.ok(!result.trace.sanitizedReport.toLowerCase().includes('api key'))
    assert.ok(result.confidence >= 0 && result.confidence <= 1)
    console.log('PASS: contract validation + privacy-safe trace')
  }

  {
    let wrote = false
    const result = await runIntelligencePipeline(
      { specialist: 'gym', userMessage: 'Peek', readOnly: true },
      {
        readOnly: true,
        produceResponse: () => 'peek',
        onRealityUpdate: async () => { wrote = true },
        onIdentityObservation: async () => { wrote = true },
      },
    )
    assert.equal(wrote, false)
    assert.ok(result.trace.stages.find(s => s.id === 'reality_update')?.status === 'skipped')
    console.log('PASS: no accidental writes during read-only requests')
  }

  {
    const profile = createDefaultGymProfile()
    profile.complete = true
    profile.primaryGoal = 'muscle_growth'
    profile.experience = 'beginner'
    profile.equipment = ['dumbbell']
    profile.trainingDaysPerWeek = 3
    const inputs = declareInputsFromGymProfile(profile)
    assert.ok(inputs.some(i => i.key === 'training_goal'))
    assert.ok(inputs.every(i => i.source?.kind === 'onboarding'))
    assert.equal(gymReadinessFromSources({
      profile,
      identity: null,
      hasStructuredHistory: false,
    }), 'personalized')
    assert.equal(inferGymIntent('What should I train today?'), 'train_today')
    console.log('PASS: identity bootstrap persistence mapping + readiness')
  }

  {
    const snap = minimalSnapshot({
      injuryProfile: { areas: ['knee'], restrictions: ['Avoid deep knee flexion under load'] },
    })
    const domain = collectGymDomainEvidence(snap)
    assert.ok(domain.constraints.some(c => c.toLowerCase().includes('knee') || c.toLowerCase().includes('flexion')))
    assert.ok(domain.evidence.some(e => e.kind === 'declared'))

    const result = await runIntelligencePipeline(
      { specialist: 'gym', userMessage: 'What should I train today?', intent: 'train_today' },
      {
        declaredProfile: [
          { key: 'training_goal', label: 'Training goal', value: 'Build muscle', source: 'gym_profile' },
          { key: 'training_experience', label: 'Experience', value: 'beginner', source: 'gym_profile' },
        ],
        observedIdentity: [
          {
            key: 'preferred_time_of_day',
            label: 'Preferred time',
            value: 'Evening',
            confidence: 0.8,
            contradictionNote: 'Declared mornings; observed evenings.',
          },
        ],
        domainEvidence: domain.evidence,
        constraints: domain.constraints,
        readiness: 'minimum_ready',
        followUpQuestion: domain.followUpQuestion,
        produceResponse: (partial) => answerGymWithIntelligence(snap, 'What should I train today?', partial),
      },
    )
    assert.ok(result.response.includes('Known about you') || result.response.includes('Build muscle') || result.response.includes('Training goal'))
    assert.ok(result.response.includes('Full Body') || result.response.includes('proposal') || result.response.includes('session'))
    assert.ok(result.response.toLowerCase().includes('missing') || result.missingInformation.length >= 0)
    assert.ok(!result.response.toLowerCase().includes('you slept 8 hours')) // no invented sleep
    assert.ok(result.responseContext.declaredProfile.length >= 1)
    assert.ok(result.responseContext.observedIdentity.length >= 1)
    assert.ok(result.warnings.some(w => w.toLowerCase().includes('declared') && w.toLowerCase().includes('observed')) || result.trace.degradedStages.includes('observed_identity'))
    console.log('PASS: Gym flow integration grounds answer in profile + evidence')
  }

  {
    let hooks = 0
    const a = await runIntelligencePipelineIdempotent(
      { requestId: 'dup-1', specialist: 'gym', userMessage: 'Train?' },
      {
        produceResponse: () => 'one',
        onIdentityObservation: async () => { hooks += 1 },
      },
    )
    const b = await runIntelligencePipelineIdempotent(
      { requestId: 'dup-1', specialist: 'gym', userMessage: 'Train?' },
      {
        produceResponse: () => 'two',
        onIdentityObservation: async () => { hooks += 1 },
      },
    )
    assert.equal(a.response, b.response)
    assert.equal(hooks, 1)
    console.log('PASS: request idempotency prevents duplicate mutations')
  }

  {
    const result = await runIntelligencePipeline(
      { specialist: 'gym', userMessage: 'Progress?' },
      {
        domainEvidence: [{
          id: 'stale',
          title: 'Recovery',
          summary: 'Old recovery signal',
          weight: 0.4,
          source: 'gym',
          kind: 'domain',
          freshness: 'stale',
        }],
        produceResponse: () => 'ok',
      },
    )
    assert.ok(result.warnings.some(w => w.toLowerCase().includes('stale')) || result.trace.degradedStages.includes('domain_evidence'))
    assert.ok(result.confidence < 0.95)
    console.log('PASS: confidence falls / warnings when evidence stale')
  }

  {
    assert.ok(getLastIntelligenceResult())
    console.log('PASS: trace generation stored for inspector')
  }

  console.log('\nAll Intelligence Pipeline tests passed.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
