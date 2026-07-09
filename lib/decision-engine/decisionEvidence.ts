import type { CandidateAction, DecisionEvidence, DecisionInput } from './decisionTypes'
import { textIncludesAny } from './decisionUtils'

export function buildEvidenceForCandidate(
  candidate: CandidateAction,
  input: DecisionInput,
): DecisionEvidence[] {
  const evidence: DecisionEvidence[] = []
  const signals = input.signals ?? []
  const knowledge = input.knowledge ?? []
  const memories = input.memories ?? []
  const objects = input.objects ?? []
  const recommendations = input.executiveState?.recommendations ?? []

  for (const rec of recommendations) {
    const related = rec.relatedObjectIds.some(id => candidate.relatedObjectIds.includes(id))
      || textIncludesAny(rec.title, [candidate.title])
    if (related) {
      evidence.push({
        sourceType: 'executive',
        sourceId: rec.id,
        title: rec.title,
        summary: rec.rationale,
        weight: rec.priority === 'high' ? 0.85 : 0.6,
        supports: true,
        conflicts: false,
      })
    }
  }

  for (const signal of signals) {
    const text = `${signal.title} ${signal.content}`.toLowerCase()
    const candidateText = `${candidate.title} ${candidate.action}`.toLowerCase()
    const related = candidate.relatedSignalIds.includes(signal.id)
      || (signal.source === 'calendar' && candidate.tags.includes('calendar'))
      || (signal.type === 'coding_session' && candidate.tags.includes('founderos'))
      || (textIncludesAny(text, ['study', 'exam', 'economics']) && candidate.tags.includes('study'))
      || (textIncludesAny(text, ['workout', 'gym']) && candidate.tags.includes('workout'))
    if (related) {
      evidence.push({
        sourceType: 'signal',
        sourceId: signal.id,
        title: signal.title,
        summary: signal.content.slice(0, 160),
        weight: signal.confidence === 'high' ? 0.8 : 0.55,
        supports: true,
        conflicts: false,
      })
    } else if (
      signal.source === 'calendar'
      && candidate.tags.includes('founderos')
      && textIncludesAny(text, ['study', 'class', 'exam'])
    ) {
      evidence.push({
        sourceType: 'signal',
        sourceId: signal.id,
        title: signal.title,
        summary: 'Calendar block competes with deep work time.',
        weight: 0.7,
        supports: false,
        conflicts: true,
      })
    }
  }

  for (const item of input.morningPlan?.topPriorities ?? []) {
    if (item.title.toLowerCase().includes(candidate.title.toLowerCase())
      || candidate.title.toLowerCase().includes(item.title.toLowerCase())) {
      evidence.push({
        sourceType: 'morning',
        sourceId: item.id,
        title: item.title,
        summary: item.reason,
        weight: item.priority === 'high' ? 0.9 : 0.65,
        supports: true,
        conflicts: false,
      })
    }
  }

  for (const k of knowledge) {
    const principle = k.principle.toLowerCase()
    const applies = candidate.tags.includes('study') && principle.includes('study')
      || candidate.tags.includes('founderos') && (k.domain === 'founder' || k.domain === 'systems')
      || candidate.area === 'health' && principle.includes('health')
      || candidate.area === 'inbox' && principle.includes('capture')
    if (applies || candidate.relatedKnowledgeIds.includes(k.id)) {
      evidence.push({
        sourceType: 'knowledge',
        sourceId: k.id,
        title: k.title,
        summary: k.principle,
        weight: k.confidence === 'high' ? 0.75 : 0.5,
        supports: true,
        conflicts: false,
      })
    }
  }

  for (const m of memories) {
    if (!candidate.relatedMemoryIds.includes(m.id)) continue
    evidence.push({
      sourceType: 'memory',
      sourceId: m.id,
      title: m.title,
      summary: m.content.slice(0, 140),
      weight: m.importance === 'critical' ? 0.85 : 0.55,
      supports: true,
      conflicts: false,
    })
  }

  if (input.eveningReview) {
    const carry = (input.eveningReview?.incompletePriorities ?? []).some(p =>
      candidate.title.toLowerCase().includes(p.toLowerCase()),
    )
    if (carry) {
      evidence.push({
        sourceType: 'evening',
        sourceId: input.eveningReview.id,
        title: 'Incomplete from last review',
        summary: `Carry-forward priority: ${candidate.title}`,
        weight: 0.7,
        supports: true,
        conflicts: false,
      })
    }
  }

  for (const objId of candidate.relatedObjectIds) {
    const obj = objects.find(o => o.id === objId)
    if (!obj) continue
    evidence.push({
      sourceType: 'object',
      sourceId: obj.id,
      title: obj.title,
      summary: obj.summary ?? `${obj.type} on your board`,
      weight: 0.6,
      supports: true,
      conflicts: false,
    })
  }

  return evidence
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 8)
}

export function calculateConfidence(evidence: DecisionEvidence[], conflictCount: number): number {
  if (evidence.length === 0) return 25
  const supporting = evidence.filter(e => e.supports && !e.conflicts)
  const supportWeight = supporting.reduce((sum, e) => sum + e.weight, 0)
  const base = Math.min(95, 30 + supportWeight * 35 + supporting.length * 5)
  const penalty = conflictCount * 12 + evidence.filter(e => e.conflicts).length * 8
  return Math.max(15, Math.min(95, Math.round(base - penalty)))
}
