import type { CognitiveStore } from '@/lib/cognitive-model/beliefTypes'
import type { FounderSnapshot } from '@/lib/specialists/founder/founderTypes'
import { getCurrentBelief } from '@/lib/cognitive-model/realityQueries'

export interface RegressionSnapshot {
  hash: string
  beliefs: Array<{ predicate: string; normalizedValue: string; confidence: number }>
  contradictionCount: number
  validationScore: number
  positioningRisk: number
  bottleneck: string
  recommendation: string
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value, Object.keys(value as object).sort())
}

export function buildRegressionSnapshot(
  store: CognitiveStore,
  founderSnapshot: FounderSnapshot | null,
): RegressionSnapshot {
  const reality = store.worldModel.realitySnapshot
  const beliefs = (reality?.activeBeliefs ?? [])
    .filter(b => b.predicate)
    .map(b => ({
      predicate: b.predicate,
      normalizedValue: b.normalizedValue,
      confidence: b.confidence,
    }))
    .sort((a, b) => a.predicate.localeCompare(b.predicate))

  const payload = {
    beliefs,
    contradictionCount: store.worldModel.contradictions.filter(c => !c.resolved).length,
    validationScore: reality?.validationScore ?? 0,
    positioningRisk: reality?.positioningRisk ?? 0,
    bottleneck: founderSnapshot?.mainBottleneck ?? 'None',
    recommendation: founderSnapshot?.topRecommendation ?? '',
  }

  let hash = 0
  const str = stableStringify(payload)
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }

  return {
    hash: `snap-${Math.abs(hash).toString(16)}`,
    ...payload,
  }
}

export function compareRegressionSnapshots(
  baseline: RegressionSnapshot,
  current: RegressionSnapshot,
): string[] {
  const diffs: string[] = []
  if (baseline.validationScore !== current.validationScore) {
    diffs.push(`validationScore ${baseline.validationScore} → ${current.validationScore}`)
  }
  if (baseline.bottleneck !== current.bottleneck) {
    diffs.push(`bottleneck ${baseline.bottleneck} → ${current.bottleneck}`)
  }
  const basePredicates = new Map(baseline.beliefs.map(b => [b.predicate, b]))
  for (const b of current.beliefs) {
    const prev = basePredicates.get(b.predicate)
    if (!prev) {
      diffs.push(`new belief ${b.predicate}=${b.normalizedValue}`)
    } else if (prev.normalizedValue !== b.normalizedValue || prev.confidence !== b.confidence) {
      diffs.push(`belief ${b.predicate}: ${prev.normalizedValue}@${prev.confidence} → ${b.normalizedValue}@${b.confidence}`)
    }
  }
  for (const [predicate] of basePredicates) {
    if (!current.beliefs.some(b => b.predicate === predicate)) {
      diffs.push(`removed belief ${predicate}`)
    }
  }
  return diffs
}

export const BASELINE_SNAPSHOTS: Record<string, RegressionSnapshot> = {}

export function registerBaselineSnapshot(scenarioId: string, snapshot: RegressionSnapshot): void {
  BASELINE_SNAPSHOTS[scenarioId] = snapshot
}

export function getBeliefValue(store: CognitiveStore, predicate: string): string | null {
  const snap = store.worldModel.realitySnapshot
  if (!snap) return null
  return getCurrentBelief(snap, 'founderos', predicate)?.normalizedValue ?? null
}
