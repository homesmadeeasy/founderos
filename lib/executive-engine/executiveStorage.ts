import type { ExecutiveBriefing, ExecutiveDecision, ExecutiveRecommendation, ExecutiveState } from './executiveTypes'
import { createSeedExecutiveState } from './executiveSeedData'
import { newExecutiveId, nowISO } from './executiveUtils'

const STORAGE_KEY = 'founderos-executive-engine-v1'
const MAX_BRIEFINGS = 14
const MAX_RECOMMENDATIONS = 30
const MAX_DECISIONS = 50

function loadStore(): ExecutiveState {
  if (typeof window === 'undefined') {
    return createSeedExecutiveState()
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const seeded = createSeedExecutiveState()
      persistStore(seeded)
      return seeded
    }
    const parsed = JSON.parse(raw) as Partial<ExecutiveState>
    return {
      briefings: parsed.briefings ?? [],
      recommendations: parsed.recommendations ?? [],
      decisions: parsed.decisions ?? [],
    }
  } catch {
    const seeded = createSeedExecutiveState()
    persistStore(seeded)
    return seeded
  }
}

function persistStore(state: ExecutiveState): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function getExecutiveState(): ExecutiveState {
  return loadStore()
}

export function saveExecutiveState(state: ExecutiveState): void {
  persistStore(state)
}

export function reloadExecutiveStore(): ExecutiveState {
  return loadStore()
}

export function saveBriefing(briefing: ExecutiveBriefing): ExecutiveBriefing {
  const state = loadStore()
  const next = {
    ...state,
    briefings: [briefing, ...state.briefings.filter(b => b.id !== briefing.id)].slice(0, MAX_BRIEFINGS),
    recommendations: [
      ...briefing.recommendations,
      ...state.recommendations,
    ].slice(0, MAX_RECOMMENDATIONS),
  }
  persistStore(next)
  return briefing
}

export function getRecentBriefings(limit = 7): ExecutiveBriefing[] {
  return loadStore().briefings.slice(0, limit)
}

export function saveRecommendation(rec: ExecutiveRecommendation): ExecutiveRecommendation {
  const state = loadStore()
  persistStore({
    ...state,
    recommendations: [rec, ...state.recommendations.filter(r => r.id !== rec.id)].slice(0, MAX_RECOMMENDATIONS),
  })
  return rec
}

export function getRecentRecommendations(limit = 10): ExecutiveRecommendation[] {
  return loadStore().recommendations.slice(0, limit)
}

export function saveDecision(
  input: Omit<ExecutiveDecision, 'id' | 'createdAt'>,
): ExecutiveDecision {
  const decision: ExecutiveDecision = {
    ...input,
    id: newExecutiveId('dec'),
    createdAt: nowISO(),
  }
  const state = loadStore()
  persistStore({
    ...state,
    decisions: [decision, ...state.decisions].slice(0, MAX_DECISIONS),
  })
  return decision
}

export function getRecentDecisions(limit = 10): ExecutiveDecision[] {
  return loadStore().decisions.slice(0, limit)
}
