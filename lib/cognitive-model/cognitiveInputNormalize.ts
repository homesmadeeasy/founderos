import type {
  NormalizedCognitiveInput,
  NormalizedConversationBelief,
  NormalizedFounderSnapshot,
  NormalizedKnowledgeEvidence,
  NormalizedMemoryEvidence,
  NormalizedOutcomeEvidence,
  NormalizedSignalEvidence,
  RawCognitiveInput,
} from './beliefTypes'
import {
  asArray,
  asBoolean,
  asNumber,
  asString,
  safeId,
  safeTimestamp,
  truncateText,
  uniqueById,
} from './cognitiveUtils'

export function adaptMemoryRecord(raw: unknown): NormalizedMemoryEvidence | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const title = asString(item.title, 'Memory')
  const content = asString(item.content ?? item.summary ?? item.body, 'No memory content recorded')
  return {
    id: safeId(item.id, 'memory'),
    title,
    content,
    type: asString(item.type, 'insight'),
    source: 'memory',
    createdAt: safeTimestamp(item.createdAt ?? item.occurredAt),
  }
}

export function adaptSignalRecord(raw: unknown): NormalizedSignalEvidence | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const title = asString(item.title, 'Signal')
  const summary = asString(item.summary ?? item.content ?? item.body, 'Signal recorded')
  return {
    id: safeId(item.id, 'signal'),
    title,
    summary,
    type: asString(item.type, 'signal'),
    source: 'signal',
    createdAt: safeTimestamp(item.createdAt ?? item.timestamp),
  }
}

export function adaptKnowledgeRecord(raw: unknown): NormalizedKnowledgeEvidence | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const title = asString(item.title, 'Knowledge')
  const content = asString(
    item.content ?? item.principle ?? item.explanation ?? item.summary,
    'Knowledge principle recorded',
  )
  return {
    id: safeId(item.id, 'knowledge'),
    title,
    content,
    domain: asString(item.domain, 'general'),
    source: 'knowledge',
    createdAt: safeTimestamp(item.createdAt ?? item.updatedAt),
  }
}

export function adaptOutcomeRecord(raw: unknown): NormalizedOutcomeEvidence | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>

  if (item.prediction && typeof item.prediction === 'object') {
    const prediction = item.prediction as Record<string, unknown>
    const record = item.record && typeof item.record === 'object'
      ? item.record as Record<string, unknown>
      : null
    const completed = asString(record?.completed)
    const supports = completed === 'yes'
      ? true
      : completed === 'no' || completed === 'partial'
        ? false
        : asBoolean(item.success)
    return {
      id: safeId(prediction.id ?? item.id, 'outcome'),
      title: asString(prediction.decisionTitle ?? prediction.predictedAction, 'Outcome'),
      summary: asString(
        record?.actualResult ?? prediction.predictedAction ?? prediction.predictedBenefit,
        'Outcome recorded',
      ),
      supports,
      confidence: asNumber(prediction.confidenceAtDecision, 50),
      source: 'outcome',
      createdAt: safeTimestamp(record?.createdAt ?? prediction.createdAt),
    }
  }

  const completed = asString(item.completed)
  const supports = typeof item.success === 'boolean'
    ? item.success
    : completed === 'yes'
      ? true
      : completed === 'no' || completed === 'partial'
        ? false
        : asBoolean(item.supports)

  return {
    id: safeId(item.id ?? item.predictionId, 'outcome'),
    title: asString(item.title ?? item.decisionTitle ?? item.summary, 'Outcome'),
    summary: asString(
      item.summary ?? item.actualResult ?? item.predictedAction ?? item.reflection,
      'Outcome recorded',
    ),
    supports,
    confidence: asNumber(item.confidence ?? item.confidenceAtDecision, 50),
    source: 'outcome',
    createdAt: safeTimestamp(item.createdAt ?? item.date),
  }
}

export function adaptConversationBelief(raw: unknown): NormalizedConversationBelief | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const label = asString(item.label, 'Belief')
  const displayValue = asString(item.displayValue ?? item.value, 'unknown')
  return {
    key: asString(item.key, label.toLowerCase().replace(/\s+/g, '_')),
    label,
    displayValue,
    status: asString(item.status, 'unknown'),
    confidence: asNumber(item.confidence, 40),
  }
}

export function adaptFounderSnapshot(raw: unknown): NormalizedFounderSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  return {
    mainInsight: asString(item.mainInsight, 'Still forming an overall read on the company.'),
    mainBottleneck: asString(item.mainBottleneck, 'None'),
    momentumScore: asNumber(item.momentumScore, 50),
    validationScore: asNumber(item.validationScore, 50),
    architectureScore: asNumber(item.architectureScore, 50),
    executionScore: asNumber(item.executionScore, 50),
    currentStage: asString(item.currentStage, 'unknown'),
    topRecommendation: asString(item.topRecommendation, 'Continue gathering evidence.'),
    risks: asArray<unknown>(item.risks)
      .filter((risk) => risk && typeof risk === 'object')
      .map((risk) => {
        const r = risk as Record<string, unknown>
        return {
          title: asString(r.title, 'Risk'),
          description: asString(r.description, 'Risk identified'),
          severity: asString(r.severity, 'medium'),
        }
      }),
  }
}

export function normalizeCognitiveInput(
  input?: RawCognitiveInput | null,
): NormalizedCognitiveInput {
  const source = input ?? {}
  return {
    founderSnapshot: adaptFounderSnapshot(source.founderSnapshot),
    mission: asString(source.mission).trim(),
    memories: uniqueById(
      asArray<unknown>(source.memories)
        .map(adaptMemoryRecord)
        .filter((m): m is NormalizedMemoryEvidence => m !== null),
    ),
    signals: uniqueById(
      asArray<unknown>(source.signals)
        .map(adaptSignalRecord)
        .filter((s): s is NormalizedSignalEvidence => s !== null),
    ),
    outcomes: uniqueById(
      asArray<unknown>(source.outcomes)
        .map(adaptOutcomeRecord)
        .filter((o): o is NormalizedOutcomeEvidence => o !== null),
    ),
    knowledge: uniqueById(
      asArray<unknown>(source.knowledge)
        .map(adaptKnowledgeRecord)
        .filter((k): k is NormalizedKnowledgeEvidence => k !== null),
    ),
    conversationBeliefs: asArray<unknown>(source.conversationBeliefs)
      .map(adaptConversationBelief)
      .filter((b): b is NormalizedConversationBelief => b !== null),
    decisionSummary: asString(source.decisionSummary).trim(),
  }
}

export function isEmptyCognitiveInput(input: NormalizedCognitiveInput): boolean {
  return !input.founderSnapshot
    && !input.mission
    && !input.decisionSummary
    && input.memories.length === 0
    && input.signals.length === 0
    && input.outcomes.length === 0
    && input.knowledge.length === 0
    && input.conversationBeliefs.length === 0
}

export function summarizeNormalizedInput(input: NormalizedCognitiveInput): string {
  return truncateText(
    [
      input.mission,
      input.decisionSummary,
      input.founderSnapshot?.mainInsight ?? '',
    ].filter(Boolean).join(' · '),
    200,
  )
}
