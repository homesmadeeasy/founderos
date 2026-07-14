import type { BeliefEvidence, BeliefSource, NormalizedCognitiveInput } from './beliefTypes'
import { normalizeCognitiveInput } from './cognitiveInputNormalize'
import { newCognitiveId, nowISO, truncateText } from './cognitiveUtils'
import { compactEvidenceRef, evidenceStableKey } from './cognitiveCompaction'

export function createEvidence(
  sourceType: BeliefSource,
  title: string,
  summary: string,
  supports: boolean,
  weight = 0.5,
  sourceId?: string,
): BeliefEvidence {
  const compactTitle = truncateText(title.trim() || 'Evidence', 80)
  const compactSummary = truncateText(summary.trim() || compactTitle, 120)
  const key = evidenceStableKey({
    id: '',
    sourceType,
    sourceId,
    title: compactTitle,
    summary: compactSummary,
    weight,
    supports,
    recordedAt: nowISO(),
  })
  return compactEvidenceRef({
    id: `ev-${key.replace(/[^a-zA-Z0-9:_-]/g, '-').slice(0, 72)}`,
    sourceType,
    sourceId: sourceId?.trim() || undefined,
    title: compactTitle,
    summary: compactSummary,
    weight,
    supports,
    recordedAt: nowISO(),
  })
}

export function gatherEvidenceFromInput(
  input?: NormalizedCognitiveInput | null,
): BeliefEvidence[] {
  const normalized = input ?? normalizeCognitiveInput(null)
  const items: BeliefEvidence[] = []

  for (const memory of normalized.memories) {
    items.push(createEvidence(
      'memory',
      memory.title,
      truncateText(memory.content, 200),
      true,
      0.6,
      memory.id,
    ))
  }

  for (const signal of normalized.signals) {
    items.push(createEvidence(
      'signal',
      signal.title,
      truncateText(signal.summary, 200),
      true,
      0.55,
      signal.id,
    ))
  }

  for (const outcome of normalized.outcomes) {
    items.push(createEvidence(
      'outcome',
      outcome.title,
      truncateText(outcome.summary, 200),
      outcome.supports,
      0.65,
      outcome.id,
    ))
  }

  for (const knowledge of normalized.knowledge) {
    items.push(createEvidence(
      'knowledge',
      knowledge.title,
      truncateText(knowledge.content, 200),
      true,
      0.5,
      knowledge.id,
    ))
  }

  if (normalized.decisionSummary) {
    items.push(createEvidence(
      'decision',
      'Recent decision',
      truncateText(normalized.decisionSummary, 200),
      true,
      0.45,
    ))
  }

  const insight = normalized.founderSnapshot?.mainInsight
  if (insight) {
    items.push(createEvidence(
      'system_inference',
      'Founder insight',
      truncateText(insight, 200),
      true,
      0.5,
    ))
  }

  return items
}

export function dedupeEvidence(items: BeliefEvidence[]): BeliefEvidence[] {
  const seen = new Set<string>()
  return items.filter((e) => {
    const key = `${e.sourceType}:${e.sourceId ?? e.title}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function evidenceSupportsBelief(evidence: BeliefEvidence[], statement: string): BeliefEvidence[] {
  const lower = statement.toLowerCase()
  return evidence.filter((e) => {
    const text = `${e.title} ${e.summary}`.toLowerCase()
    const overlap = lower.split(' ').filter((w) => w.length > 4 && text.includes(w)).length
    return overlap >= 2 || text.includes(lower.slice(0, 30))
  })
}
