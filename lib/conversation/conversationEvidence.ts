import type {
  ConversationBelief,
  ConversationContext,
  ConversationEvidence,
  ConversationSession,
} from './conversationTypes'
import type { FounderInput } from '@/lib/specialists/founder/founderTypes'
import { buildFounderEvidence } from '@/lib/specialists/founder/founderEvidence'
import { gatherFounderData } from '@/lib/specialists/founder/founderSignals'
import { dedupeConversationEvidence } from './conversationEvidenceDedupe'
import { VALIDATION_BELIEF_KEYS, getBelief } from './conversationBeliefs'
import { formatConversationTime, nowISO } from './conversationUtils'

function scoreLabel(name: string, score: number, at?: string): string {
  const time = at ? ` at ${formatConversationTime(at)}` : ' now'
  return `${name} score ${score}${time}`
}

function baseSystemEvidence(ctx: ConversationContext, snapshotAt: string): ConversationEvidence[] {
  const snap = ctx.founderSnapshot
  return [
    {
      id: 'ev-validation-current',
      sourceType: 'founder',
      sourceId: 'validation-score',
      title: scoreLabel('Validation', ctx.validationScore, snapshotAt),
      summary: ctx.validationScore < 40 ? 'Weak external proof' : 'Some validation signal',
      weight: 0.9,
      supports: ctx.validationScore >= 45,
      evidenceKind: 'system_inference',
      snapshotAt,
    },
    {
      id: 'ev-architecture-current',
      sourceType: 'founder',
      sourceId: 'architecture-score',
      title: scoreLabel('Architecture', ctx.architectureScore, snapshotAt),
      summary: snap.architectureScore > 65 ? 'Strong infrastructure progress' : 'Moderate build depth',
      weight: 0.85,
      supports: true,
      evidenceKind: 'system_inference',
      snapshotAt,
    },
    {
      id: 'ev-bottleneck-current',
      sourceType: 'founder',
      sourceId: 'bottleneck',
      title: `Bottleneck: ${snap.mainBottleneck}`,
      summary: snap.mainInsight,
      weight: 0.95,
      supports: true,
      evidenceKind: 'system_inference',
      snapshotAt,
    },
  ]
}

export function buildConversationEvidence(
  ctx: ConversationContext,
  input?: FounderInput,
): ConversationEvidence[] {
  const snapshotAt = nowISO()
  const evidence = baseSystemEvidence(ctx, snapshotAt)

  if (ctx.validationScore < 45) {
    evidence.push({
      id: 'ev-system-no-users',
      sourceType: 'signal',
      sourceId: 'validation-absence',
      title: 'No stored validation signals',
      summary: 'System inference: no confirmed real-user testing in engines',
      weight: 0.88,
      supports: false,
      evidenceKind: 'system_inference',
      snapshotAt,
    })
  }

  if (input) {
    const founderEvidence = buildFounderEvidence(gatherFounderData(input), input)
    for (const e of founderEvidence.slice(0, 3)) {
      evidence.push({
        id: `ev-${e.id}`,
        sourceType: e.sourceType as ConversationEvidence['sourceType'],
        sourceId: e.id,
        title: e.title,
        summary: e.summary,
        weight: e.weight,
        supports: e.supports,
        evidenceKind: 'system_inference',
        snapshotAt,
      })
    }
  }

  for (const risk of (ctx.founderSnapshot.risks ?? []).slice(0, 2)) {
    evidence.push({
      id: `ev-risk-${risk.id}`,
      sourceType: 'founder',
      sourceId: risk.id,
      title: risk.title,
      summary: risk.description,
      weight: risk.severity === 'high' ? 0.8 : 0.6,
      supports: false,
      evidenceKind: 'system_inference',
      snapshotAt,
    })
  }

  return dedupeConversationEvidence(evidence, 8)
}

export function buildReconciledEvidence(
  ctx: ConversationContext,
  beliefs: ConversationBelief[],
  session: ConversationSession,
): ConversationEvidence[] {
  const snapshotAt = nowISO()
  const evidence = baseSystemEvidence(ctx, snapshotAt)
  const usersTested = getBelief(beliefs, VALIDATION_BELIEF_KEYS.usersTested)

  if (usersTested?.status === 'user_claimed') {
    evidence.push({
      id: 'ev-user-reports-testing',
      sourceType: 'founder',
      sourceId: 'user-report-testing',
      title: 'User reports real-user testing',
      summary: 'Details not yet confirmed — awaiting count and surface',
      weight: 0.92,
      supports: true,
      evidenceKind: 'user_report',
      snapshotAt,
    })
    evidence.push({
      id: 'ev-system-no-users',
      sourceType: 'signal',
      sourceId: 'validation-absence',
      title: 'No stored validation signals (historical)',
      summary: 'Prior system inference before user report',
      weight: 0.4,
      supports: false,
      evidenceKind: 'historical',
      snapshotAt: session.startedAt,
    })
  } else if (usersTested?.status === 'confirmed' && usersTested.value === false) {
    evidence.push({
      id: 'ev-confirmed-no-users',
      sourceType: 'founder',
      sourceId: 'confirmed-no-testing',
      title: 'No real-user testing confirmed',
      summary: 'User confirmed no external validation yet',
      weight: 0.93,
      supports: false,
      evidenceKind: 'confirmed',
      snapshotAt,
    })
  } else if (usersTested?.status === 'confirmed' && usersTested.value === true) {
    const count = getBelief(beliefs, VALIDATION_BELIEF_KEYS.userCount)
    const surface = getBelief(beliefs, VALIDATION_BELIEF_KEYS.testedSurface)
    evidence.push({
      id: 'ev-confirmed-testing',
      sourceType: 'founder',
      sourceId: 'confirmed-testing',
      title: 'Real-user testing confirmed',
      summary: [
        count?.displayValue !== 'unknown' ? `${count?.displayValue} testers` : null,
        surface?.displayValue !== 'unknown' ? `tested ${surface?.displayValue}` : null,
      ].filter(Boolean).join(' — ') || 'Details recorded in conversation',
      weight: 0.94,
      supports: true,
      evidenceKind: 'confirmed',
      snapshotAt,
    })
  } else if (ctx.validationScore < 45) {
    evidence.push({
      id: 'ev-system-no-users',
      sourceType: 'signal',
      sourceId: 'validation-absence',
      title: 'No stored validation signals',
      summary: 'System inference: no confirmed real-user testing in engines',
      weight: 0.88,
      supports: false,
      evidenceKind: 'system_inference',
      snapshotAt,
    })
  }

  return dedupeConversationEvidence(evidence, 12, { includeHistorical: true })
}

export function buildTurnEvidence(
  ctx: ConversationContext,
  beliefs: ConversationBelief[],
  session: ConversationSession,
  max = 4,
  extraIds?: string[],
): ConversationEvidence[] {
  const all = buildReconciledEvidence(ctx, beliefs, session)
  if (extraIds?.length) {
    return dedupeConversationEvidence(
      all.filter(e => extraIds.includes(e.id) || e.evidenceKind === 'user_report' || e.evidenceKind === 'confirmed'),
      max,
    )
  }
  return dedupeConversationEvidence(
    all.filter(e => !e.superseded && e.evidenceKind !== 'historical'),
    max,
  )
}

export function evidenceForRecommendation(ctx: ConversationContext): ConversationEvidence[] {
  return buildConversationEvidence(ctx).filter(e => e.weight >= 0.6 && !e.superseded)
}
