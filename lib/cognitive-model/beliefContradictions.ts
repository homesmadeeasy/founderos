import type { Belief, BeliefContradiction } from './beliefTypes'
import { newCognitiveId, normalizeStatement, nowISO } from './cognitiveUtils'

const CONFLICT_PAIRS: [string, string][] = [
  ['no users tested', 'users tested'],
  ['no validation', 'validated'],
  ['pre-mvp', 'growth stage'],
  ['not shipping', 'shipping weekly'],
]

export function detectContradictions(beliefs: Belief[]): BeliefContradiction[] {
  const results: BeliefContradiction[] = []
  for (let i = 0; i < beliefs.length; i++) {
    for (let j = i + 1; j < beliefs.length; j++) {
      const a = beliefs[i]!
      const b = beliefs[j]!
      if (beliefsConflict(a, b)) {
        results.push({
          id: newCognitiveId('contra'),
          beliefAId: a.id,
          beliefBId: b.id,
          description: `"${a.statement}" vs "${b.statement}"`,
          detectedAt: nowISO(),
          resolved: false,
        })
      }
    }
  }
  return results
}

function beliefsConflict(a: Belief, b: Belief): boolean {
  const na = normalizeStatement(a.statement)
  const nb = normalizeStatement(b.statement)
  if (na === nb) return false

  for (const [x, y] of CONFLICT_PAIRS) {
    if ((na.includes(x) && nb.includes(y)) || (na.includes(y) && nb.includes(x))) return true
  }

  if (a.topic === b.topic && a.status === 'confirmed' && b.status === 'confirmed') {
    const aWords = new Set(na.split(' ').filter((w) => w.length > 4))
    const overlap = nb.split(' ').filter((w) => w.length > 4 && aWords.has(w)).length
    if (overlap >= 3 && na !== nb) {
      const negA = na.includes('not ') || na.includes('no ')
      const negB = nb.includes('not ') || nb.includes('no ')
      if (negA !== negB) return true
    }
  }
  return false
}

export function mergeContradictions(
  existing: BeliefContradiction[],
  detected: BeliefContradiction[],
): BeliefContradiction[] {
  const map = new Map(existing.map((c) => [`${c.beliefAId}:${c.beliefBId}`, c]))
  for (const d of detected) {
    const key = `${d.beliefAId}:${d.beliefBId}`
    const rev = `${d.beliefBId}:${d.beliefAId}`
    if (!map.has(key) && !map.has(rev)) map.set(key, d)
  }
  return Array.from(map.values())
}

export function contradictionPhrase(c: BeliefContradiction): string {
  return `This contradicts what I believed earlier: ${c.description}. I'm holding both until we reconcile them.`
}

export function resolveContradiction(c: BeliefContradiction): BeliefContradiction {
  return { ...c, resolved: true }
}
