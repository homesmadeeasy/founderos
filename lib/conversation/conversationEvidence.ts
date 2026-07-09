import type { ConversationEvidence } from './conversationTypes'
import type { ConversationContext } from './conversationTypes'
import type { FounderInput } from '@/lib/specialists/founder/founderTypes'
import { buildFounderEvidence } from '@/lib/specialists/founder/founderEvidence'
import { gatherFounderData } from '@/lib/specialists/founder/founderSignals'

export function buildConversationEvidence(
  ctx: ConversationContext,
  input?: FounderInput,
): ConversationEvidence[] {
  const evidence: ConversationEvidence[] = []

  const snap = ctx.founderSnapshot

  evidence.push({
    id: 'ev-validation',
    sourceType: 'founder',
    title: `Validation score ${snap.validationScore}`,
    summary: snap.validationScore < 40 ? 'Weak external proof' : 'Some validation signal',
    weight: 0.9,
    supports: snap.validationScore >= 45,
  })

  evidence.push({
    id: 'ev-architecture',
    sourceType: 'founder',
    title: `Architecture score ${snap.architectureScore}`,
    summary: snap.architectureScore > 65 ? 'Strong infrastructure progress' : 'Moderate build depth',
    weight: 0.85,
    supports: snap.architectureScore < 80 || snap.validationScore >= 40,
  })

  evidence.push({
    id: 'ev-bottleneck',
    sourceType: 'founder',
    title: `Bottleneck: ${snap.mainBottleneck}`,
    summary: snap.mainInsight,
    weight: 0.95,
    supports: true,
  })

  if (input) {
    const founderEvidence = buildFounderEvidence(gatherFounderData(input), input)
    for (const e of founderEvidence.slice(0, 4)) {
      evidence.push({
        id: `ev-${e.id}`,
        sourceType: e.sourceType as ConversationEvidence['sourceType'],
        title: e.title,
        summary: e.summary,
        weight: e.weight,
        supports: e.supports,
      })
    }
  }

  for (const risk of snap.risks.slice(0, 2)) {
    evidence.push({
      id: `ev-risk-${risk.id}`,
      sourceType: 'founder',
      title: risk.title,
      summary: risk.description,
      weight: risk.severity === 'high' ? 0.8 : 0.6,
      supports: false,
    })
  }

  return evidence.sort((a, b) => b.weight - a.weight).slice(0, 8)
}

export function evidenceForRecommendation(ctx: ConversationContext): ConversationEvidence[] {
  return buildConversationEvidence(ctx).filter(e => e.weight >= 0.6)
}
