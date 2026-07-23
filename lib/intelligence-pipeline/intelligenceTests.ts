/**
 * Intelligence Pipeline tests — order, degradation, duplicates, traces, confidence, hooks.
 */

import assert from 'node:assert/strict'
import {
  runIntelligencePipeline,
  getCanonicalStageOrder,
  createDuplicateStageGuard,
  clearLastIntelligenceResult,
  getLastIntelligenceResult,
  CANONICAL_STAGE_ORDER,
} from './index'

async function main() {
  console.log('Intelligence Pipeline tests\n')

  clearLastIntelligenceResult()

  // Canonical order is stable
  {
    const order = getCanonicalStageOrder()
    assert.deepEqual(order, [...CANONICAL_STAGE_ORDER])
    assert.equal(order[0], 'conversation_context')
    assert.equal(order[1], 'identity')
    assert.equal(order[2], 'reality')
    assert.equal(order.at(-1), 'identity_observation')
    console.log('PASS: pipeline order is consistent')
  }

  // Duplicate stage calls blocked
  {
    const allow = createDuplicateStageGuard()
    assert.equal(allow('identity'), true)
    assert.equal(allow('identity'), false)
    assert.equal(allow('reality'), true)
    console.log('PASS: duplicate engine calls are prevented')
  }

  // Graceful degradation when sources missing
  {
    const result = await runIntelligencePipeline(
      { specialistId: 'gym', question: 'What should I train?' },
      { readOnly: true },
    )
    assert.ok(result.trace.stages.some(s => s.id === 'identity' && s.status === 'skipped'))
    assert.ok(result.trace.stages.some(s => s.id === 'reality' && s.status === 'skipped'))
    assert.ok(result.missingInformation.length > 0)
    assert.ok(result.confidence >= 0 && result.confidence <= 1)
    console.log('PASS: missing engines degrade gracefully')
  }

  // Full-ish run with sources + specialist response
  {
    let identityHook = 0
    let realityHook = 0
    const result = await runIntelligencePipeline(
      { specialistId: 'founder', question: 'What matters today?', conversationContext: 'founder chat' },
      {
        identityHints: ['Prefers deep work mornings'],
        realityHints: ['Momentum: Building'],
        memories: [{ id: 'm1', title: 'Shipped docs', summary: 'Completed Identity Engine docs' }],
        beliefs: [{ id: 'b1', statement: 'Focus on one vertical', confidence: 0.9, topic: 'execution' }],
        goals: ['Ship Intelligence Pipeline'],
        decisionSummary: 'Prioritize architecture docs',
        reasoningSummary: 'Pipeline unifies specialist context.',
        executiveRecommendations: ['Finish integration docs'],
        produceResponse: (partial) => `Answer using ${partial.identityHints[0]}`,
        onIdentityObservation: async () => { identityHook += 1 },
        onRealityUpdate: async () => { realityHook += 1 },
      },
    )
    assert.ok(result.response.includes('Prefers deep work'))
    assert.ok(result.trace.stages.every(s => s.status !== 'failed'))
    assert.ok(result.trace.stages.find(s => s.id === 'identity')?.status === 'ok')
    assert.ok(result.trace.stages.find(s => s.id === 'reality')?.status === 'ok')
    assert.ok(result.trace.overallConfidence > 0.4)
    assert.equal(identityHook, 1)
    assert.equal(realityHook, 1)
    assert.ok(getLastIntelligenceResult()?.trace.id === result.trace.id)
    console.log('PASS: reasoning traces generated; confidence propagated; post-hooks run')
  }

  // Same pipeline API for two specialists
  {
    const gym = await runIntelligencePipeline(
      { specialistId: 'gym', question: 'Train today?' },
      {
        readOnly: true,
        identityHints: ['Build muscle'],
        produceResponse: (p) => `gym:${p.identityHints[0] ?? ''}`,
      },
    )
    const founder = await runIntelligencePipeline(
      { specialistId: 'founder', question: 'Focus?' },
      {
        readOnly: true,
        identityHints: ['Ship product'],
        produceResponse: (p) => `founder:${p.identityHints[0] ?? ''}`,
      },
    )
    assert.deepEqual(
      gym.trace.stages.map(s => s.id),
      founder.trace.stages.map(s => s.id),
    )
    assert.ok(gym.response.startsWith('gym:'))
    assert.ok(founder.response.startsWith('founder:'))
    console.log('PASS: every specialist uses the same pipeline')
  }

  // Identity after conversation / reality after action semantics (hooks)
  {
    const flags = { identity: false, reality: false, memory: false }
    await runIntelligencePipeline(
      { specialistId: 'gym', question: 'Logged workout' },
      {
        produceResponse: () => 'ok',
        onIdentityObservation: async () => { flags.identity = true },
        onRealityUpdate: async () => { flags.reality = true },
        onMemoryUpdate: async () => { flags.memory = true },
      },
    )
    assert.equal(flags.identity, true)
    assert.equal(flags.reality, true)
    assert.equal(flags.memory, true)
    console.log('PASS: identity/reality/memory update hooks fire after response')
  }

  // Read-only skips write stages
  {
    let wrote = false
    const result = await runIntelligencePipeline(
      { specialistId: 'founder', question: 'Peek' },
      {
        readOnly: true,
        produceResponse: () => 'peek',
        onRealityUpdate: async () => { wrote = true },
      },
    )
    assert.equal(wrote, false)
    assert.ok(result.trace.stages.find(s => s.id === 'reality_update')?.status === 'skipped')
    console.log('PASS: read-only inspector runs skip write-backs')
  }

  console.log('\nAll Intelligence Pipeline tests passed.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
