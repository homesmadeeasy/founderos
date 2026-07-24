/**
 * Gym intelligence evaluation fixtures (deterministic structured-context tests).
 */
import assert from 'node:assert/strict'
import {
  runIntelligencePipeline,
  runIntelligencePipelineIdempotent,
  clearLastIntelligenceResult,
} from '@/lib/intelligence-pipeline'
import {
  answerGymWithIntelligence,
  collectGymDomainEvidence,
  gymReadinessFromSources,
} from '@/lib/specialists/gym/gymIntelligence'
import { createDefaultGymProfile } from '@/lib/specialists/gym/gymProfileUtils'
import type { GymSnapshot } from '@/lib/specialists/gym/gymTypes'

function baseSnap(over: Partial<GymSnapshot> = {}): GymSnapshot {
  const snap = {
    momentumScore: 50,
    consistencyScore: 50,
    recoveryScore: 65,
    volumeScore: 40,
    progressionScore: 20,
    mainInsight: 'Baseline insight',
    topRecommendation: 'Train',
    recoveryStatus: 'ready' as const,
    todaysWorkout: {
      title: 'Push A',
      rationale: 'Goal-aligned baseline',
      estimatedMinutes: 50,
      focus: 'push',
      exercises: [],
    },
    weeklyVolume: [],
    strengthEstimates: [],
    progressionRecommendations: [],
    weaknesses: [],
    recommendations: [],
    recentSessions: [],
    goalProfile: { primaryGoal: 'muscle_growth', label: 'Build muscle', trainingDaysPerWeek: 3, experience: 'beginner' },
    equipmentProfile: { available: ['barbell', 'dumbbell'], limitations: [] },
    injuryProfile: { areas: [], restrictions: [] },
    trainingBlock: { name: 'Block 1', week: 1, focus: 'hypertrophy' } as GymSnapshot['trainingBlock'],
    evidence: [],
    narrative: '',
    hasWorkoutHistory: false,
    hasStructuredHistory: false,
    profileComplete: true,
    sessionsThisWeek: 0,
    techniqueReviews: [],
    videoAnalysis: [],
    movementAnalysis: [],
    ...over,
  }
  return snap as unknown as GymSnapshot
}

async function main() {
  console.log('Gym intelligence evaluation fixtures\n')
  clearLastIntelligenceResult()

  // 1. New user minimum onboarding, no history
  {
    const profile = createDefaultGymProfile()
    profile.complete = true
    profile.primaryGoal = 'muscle_growth'
    profile.experience = 'beginner'
    const snap = baseSnap()
    const domain = collectGymDomainEvidence(snap)
    const result = await runIntelligencePipeline(
      { specialist: 'gym', userMessage: 'What should I train today?', intent: 'train_today' },
      {
        declaredProfile: [
          { key: 'training_goal', label: 'Training goal', value: 'Build muscle', source: 'gym_profile' },
          { key: 'training_experience', label: 'Experience', value: 'beginner', source: 'gym_profile' },
        ],
        domainEvidence: domain.evidence,
        readiness: gymReadinessFromSources({ profile, identity: null, hasStructuredHistory: false }),
        followUpQuestion: domain.followUpQuestion,
        produceResponse: (p) => answerGymWithIntelligence(snap, 'What should I train today?', p),
      },
    )
    assert.ok(result.responseContext.declaredProfile.some(d => d.key === 'training_goal'))
    assert.ok(result.missingInformation.includes('completed workout history') || domain.missing.includes('completed workout history'))
    assert.ok(result.response.includes('plan') || result.response.includes('proposal') || result.response.includes('Push'))
    assert.ok(!/bench 140kg|pr of|slept \d+ hours/i.test(result.response))
    console.log('PASS: 1 new user minimum onboarding')
  }

  // 2. Incomplete onboarding
  {
    const result = await runIntelligencePipeline(
      { specialist: 'gym', userMessage: 'What should I train today?' },
      {
        readiness: 'not_ready',
        produceResponse: (p) => answerGymWithIntelligence(baseSnap({ profileComplete: false }), 'What should I train today?', p),
      },
    )
    assert.ok(result.missingInformation.length > 0 || result.responseContext.readiness === 'not_ready')
    console.log('PASS: 2 incomplete onboarding')
  }

  // 3. Existing user with history
  {
    const snap = baseSnap({
      hasStructuredHistory: true,
      hasWorkoutHistory: true,
      recentSessions: [{ id: '1' } as never, { id: '2' } as never, { id: '3' } as never],
    })
    const domain = collectGymDomainEvidence(snap)
    assert.ok(domain.evidence.some(e => e.id === 'gym_history'))
    assert.equal(
      gymReadinessFromSources({ profile: { ...createDefaultGymProfile(), complete: true }, identity: null, hasStructuredHistory: true, completedWorkoutCount: 6 }),
      'evidence_rich',
    )
    console.log('PASS: 3 existing user history')
  }

  // 4. Declared vs observed contradiction
  {
    const result = await runIntelligencePipeline(
      { specialist: 'gym', userMessage: 'Train?' },
      {
        declaredProfile: [{ key: 'preferred_time_of_day', label: 'Preferred time', value: 'Morning', source: 'identity_declared' }],
        observedIdentity: [{
          key: 'preferred_time_of_day',
          label: 'Preferred time',
          value: 'Evening',
          confidence: 0.82,
          contradictionNote: 'Declared mornings; observed evenings.',
        }],
        produceResponse: () => 'ok',
      },
    )
    assert.equal(result.responseContext.declaredProfile[0].value, 'Morning')
    assert.equal(result.responseContext.observedIdentity[0].value, 'Evening')
    assert.ok(result.warnings.length + result.trace.degradedStages.length >= 1)
    console.log('PASS: 4 declared vs observed')
  }

  // 5. Stale recovery
  {
    const result = await runIntelligencePipeline(
      { specialist: 'gym', userMessage: 'Recovering?' },
      {
        domainEvidence: [{
          id: 'rec', title: 'Recovery', summary: 'stale', weight: 0.4, source: 'gym', kind: 'domain', freshness: 'stale',
        }],
        produceResponse: () => 'ok',
      },
    )
    assert.ok(result.warnings.some(w => /stale/i.test(w)) || result.trace.degradedStages.includes('domain_evidence'))
    console.log('PASS: 5 stale recovery')
  }

  // 6. Injury restriction
  {
    const snap = baseSnap({
      injuryProfile: { areas: ['shoulder'], restrictions: ['No overhead pressing'] },
    })
    const domain = collectGymDomainEvidence(snap)
    assert.ok(domain.constraints.some(c => /overhead|shoulder/i.test(c)))
    const result = await runIntelligencePipeline(
      { specialist: 'gym', userMessage: 'What should I train today?' },
      {
        declaredProfile: [{ key: 'injury_limitations', label: 'Injuries', value: 'No overhead pressing', source: 'gym_profile' }],
        domainEvidence: domain.evidence,
        constraints: domain.constraints,
        produceResponse: (p) => answerGymWithIntelligence(snap, 'What should I train today?', {
          ...p,
          responseContext: { ...p.responseContext, constraints: domain.constraints },
        }),
      },
    )
    assert.ok(/overhead|restriction|injury|shoulder/i.test(result.response))
    console.log('PASS: 6 injury restriction')
  }

  // 7–8. Offline / missing sources
  {
    const result = await runIntelligencePipeline(
      { specialist: 'gym', userMessage: 'Train?', readOnly: true },
      { readOnly: true, produceResponse: () => 'baseline' },
    )
    assert.equal(result.response, 'baseline')
    assert.ok(result.trace.skippedStages.length >= 1)
    console.log('PASS: 7–8 missing sources degrade')
  }

  // 9. Duplicate request
  {
    let n = 0
    await runIntelligencePipelineIdempotent(
      { requestId: 'eval-dup', specialist: 'gym', userMessage: 'x' },
      { produceResponse: () => 'a', onIdentityObservation: async () => { n += 1 } },
    )
    await runIntelligencePipelineIdempotent(
      { requestId: 'eval-dup', specialist: 'gym', userMessage: 'x' },
      { produceResponse: () => 'b', onIdentityObservation: async () => { n += 1 } },
    )
    assert.equal(n, 1)
    console.log('PASS: 9 duplicate request')
  }

  // 10. No progression evidence
  {
    const snap = baseSnap({ progressionRecommendations: [], hasStructuredHistory: false })
    const result = await runIntelligencePipeline(
      { specialist: 'gym', userMessage: 'Am I progressing?' },
      {
        domainEvidence: collectGymDomainEvidence(snap).evidence,
        produceResponse: (p) => answerGymWithIntelligence(snap, 'Am I progressing?', p),
      },
    )
    assert.ok(/logged|history|baseline|progress/i.test(result.response))
    assert.ok(!/new pr|you hit a pr|increased 10kg/i.test(result.response))
    console.log('PASS: 10 no invented progression')
  }

  console.log('\nAll Gym intelligence evaluation fixtures passed.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
