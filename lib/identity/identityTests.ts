/**
 * Identity Engine tests — creation, observation, confidence, history, overrides, repos.
 */

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>()
  ;(globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v) },
    removeItem: (k: string) => { store.delete(k) },
    clear: () => { store.clear() },
    key: () => null,
    length: 0,
  } as Storage
}

import assert from 'node:assert/strict'
import {
  IdentityEngine,
  calculateObservationConfidence,
  createMemoryIdentityRepository,
  createLocalIdentityRepository,
  declareInputFromStep,
  enqueueIdentityCloudSave,
  clearIdentityPendingForTests,
  resetIdentityStorageForTests,
  stepsForSpecialists,
  validateDeclareFactInput,
  type ObservationSignal,
} from './index'
import { IDENTITY_PENDING_KEY } from './identityTypes'

function makeTimedSignals(count: number, hour: number, domain = 'training'): ObservationSignal[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `s-${i}`,
    domain,
    signalType: 'session_completed',
    occurredAt: new Date(Date.UTC(2026, 5, 1 + i, hour, 0, 0)).toISOString(),
    payload: { hour },
  }))
}

async function main() {
  console.log('Identity Engine tests\n')

  // Creation + declared never overwritten
  {
    const repo = createMemoryIdentityRepository()
    const engine = new IdentityEngine(repo)
    const { fact } = await engine.declareFact({
      category: 'goals',
      key: 'training_goal',
      label: 'Training goal',
      value: 'Build Muscle',
      displayValue: 'Build Muscle',
      source: { kind: 'user_input', label: 'User' },
    })
    assert.equal(fact.kind, 'declared')
    assert.equal(fact.confidence, 1)

    const evening = makeTimedSignals(12, 18)
    const { store, upserted } = await engine.ingestSignals(evening)
    assert.ok(upserted.some(f => f.key === 'preferred_time_of_day'))
    const declared = store.facts.find(f => f.key === 'training_goal' && f.kind === 'declared')
    assert.equal(declared?.value, 'Build Muscle')
    const observedTime = store.facts.find(f => f.key === 'preferred_time_of_day')
    assert.equal(observedTime?.kind, 'observed')
    console.log('PASS: identity creation; declared not overwritten by observations')
  }

  // Observation generation thresholds
  {
    const repo = createMemoryIdentityRepository()
    const engine = new IdentityEngine(repo)
    const few = makeTimedSignals(2, 18)
    const { upserted, skipped } = await engine.ingestSignals(few)
    assert.equal(upserted.filter(f => f.key === 'preferred_time_of_day').length, 0)
    assert.ok(skipped.length > 0)
    console.log('PASS: observation generation requires sufficient evidence')
  }

  // Confidence updates
  {
    const low = calculateObservationConfidence({
      observationCount: 1,
      averageWeight: 0.5,
      consistency: 0.2,
      daysSinceLastEvidence: 120,
      contradictionCount: 2,
    })
    const high = calculateObservationConfidence({
      observationCount: 20,
      averageWeight: 0.9,
      consistency: 0.95,
      daysSinceLastEvidence: 1,
      contradictionCount: 0,
      manuallyConfirmed: true,
    })
    assert.ok(high > low)
    assert.equal(high, 1)
    console.log('PASS: confidence updates with evidence / overrides')
  }

  // History tracking
  {
    const repo = createMemoryIdentityRepository()
    const engine = new IdentityEngine(repo)
    const { fact } = await engine.declareFact({
      category: 'personal',
      key: 'display_name',
      label: 'Name',
      value: 'Alex',
    })
    await engine.declareFact({
      category: 'personal',
      key: 'display_name',
      label: 'Name',
      value: 'Jordan',
    })
    const hist = await engine.getRecentHistory(10)
    assert.ok(hist.some(h => h.factId === fact.id && h.changeType === 'updated'))
    console.log('PASS: history tracking')
  }

  // Manual overrides + reject reduces confidence
  {
    const repo = createMemoryIdentityRepository()
    const engine = new IdentityEngine(repo)
    await engine.ingestSignals(makeTimedSignals(12, 19))
    const store1 = await engine.load()
    const obs = store1.facts.find(f => f.key === 'preferred_time_of_day')!
    const before = obs.confidence
    const { fact: rejected } = await engine.reviewFact({ factId: obs.id, action: 'reject' })
    assert.equal(rejected.status, 'rejected')
    assert.ok(rejected.confidence <= before)
    console.log('PASS: manual overrides / reject')
  }

  // Contradictions: declared morning + observed evening
  {
    const repo = createMemoryIdentityRepository()
    const engine = new IdentityEngine(repo)
    await engine.declareFact({
      category: 'preferences',
      key: 'preferred_time_of_day',
      label: 'Preferred time of day',
      value: 'morning',
      displayValue: 'Morning',
    })
    const { store } = await engine.ingestSignals(makeTimedSignals(12, 18))
    const observed = store.facts.find(f => f.kind === 'observed' && f.key === 'preferred_time_of_day')
    const declared = store.facts.find(f => f.kind === 'declared' && f.key === 'preferred_time_of_day')
    assert.ok(declared)
    assert.ok(observed?.contradictsFactId === declared?.id)
    assert.equal(declared?.value, 'morning')
    console.log('PASS: contradictions keep both declared and observed')
  }

  // Evidence validation
  {
    assert.ok(validateDeclareFactInput({
      category: 'goals',
      key: '',
      label: 'x',
      value: 'y',
    }))
    assert.equal(validateDeclareFactInput({
      category: 'goals',
      key: 'g',
      label: 'Goal',
      value: 'Ship',
    }), null)
    console.log('PASS: evidence / declare validation')
  }

  // Repository compatibility local + memory
  {
    resetIdentityStorageForTests()
    const local = createLocalIdentityRepository()
    const engine = new IdentityEngine(local)
    await engine.declareFact({
      category: 'work',
      key: 'current_project',
      label: 'Current project',
      value: 'FounderOS',
    })
    const loaded = await local.load()
    assert.ok(loaded.facts.some(f => f.key === 'current_project'))

    const mem = createMemoryIdentityRepository()
    const engine2 = new IdentityEngine(mem)
    await engine2.declareFact({
      category: 'work',
      key: 'current_project',
      label: 'Current project',
      value: 'FounderOS',
    })
    assert.equal(mem.peek().facts[0].value, 'FounderOS')
    console.log('PASS: repository compatibility (local + memory)')
  }

  // Offline pending queue
  {
    clearIdentityPendingForTests()
    const repo = createMemoryIdentityRepository()
    const engine = new IdentityEngine(repo)
    const { store } = await engine.declareFact({
      category: 'goals',
      key: 'primary_life_focus',
      label: 'Focus',
      value: 'building',
    })
    enqueueIdentityCloudSave(store)
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(IDENTITY_PENDING_KEY)
      assert.ok(raw)
      enqueueIdentityCloudSave({ ...store, updatedAt: new Date().toISOString() })
      const raw2 = JSON.parse(localStorage.getItem(IDENTITY_PENDING_KEY)!)
      assert.equal(raw2.filter((o: { id: string }) => o.id === 'identity:full').length, 1)
    }
    console.log('PASS: offline pending queue idempotent')
  }

  // Onboarding modular steps
  {
    const gymSteps = stepsForSpecialists(['gym'])
    assert.ok(gymSteps.some(s => s.key === 'training_goal'))
    assert.ok(!gymSteps.some(s => s.key === 'subjects'))
    const schoolSteps = stepsForSpecialists(['school'])
    assert.ok(schoolSteps.some(s => s.key === 'subjects'))
    const input = declareInputFromStep(gymSteps.find(s => s.key === 'training_experience')!, 'intermediate')
    assert.equal(input.value, 'intermediate')
    console.log('PASS: modular onboarding steps by specialist')
  }

  // Sleep performance observation
  {
    const repo = createMemoryIdentityRepository()
    const engine = new IdentityEngine(repo)
    const signals: ObservationSignal[] = Array.from({ length: 6 }, (_, i) => ({
      domain: 'health',
      signalType: 'performance_with_sleep',
      occurredAt: new Date(Date.UTC(2026, 5, 1 + i, 8)).toISOString(),
      payload: { sleepHours: 5, performance: 'weak' },
    }))
    const { upserted } = await engine.ingestSignals(signals)
    assert.ok(upserted.some(f => f.key === 'performance_decreases_after_poor_sleep'))
    console.log('PASS: sleep–performance observation')
  }

  // Specialist read view
  {
    const repo = createMemoryIdentityRepository()
    const engine = new IdentityEngine(repo)
    await engine.declareFact({
      category: 'goals',
      key: 'training_goal',
      label: 'Training goal',
      value: 'strength',
      relevanceTags: ['gym'],
    })
    const store = await engine.load()
    const view = engine.getSpecialistView(store, 'gym')
    assert.ok(view.narrativeHints.length > 0)
    console.log('PASS: specialist read view')
  }

  console.log('\nAll Identity Engine tests passed.')
}

void main()
