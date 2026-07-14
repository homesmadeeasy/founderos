import type { FounderInput } from '@/lib/specialists/founder/founderTypes'
import type { ConversationSession } from '@/lib/conversation/conversationTypes'
import type { WorldModel, CognitiveStore } from '@/lib/cognitive-model/beliefTypes'
import { buildConversationContext } from '@/lib/conversation/conversationContext'
import { buildConversationEvidence } from '@/lib/conversation/conversationEvidence'
import { buildConversationSummary } from '@/lib/conversation/conversationSummaries'
import { dedupeEvidence } from '@/lib/cognitive-model/beliefEvidence'
import { FOUNDER_AI_LIMITS } from './founderAI.config'
import type {
  CompactFounderContext,
  CompactEvidenceRef,
  FounderActionType,
} from './founderAI.types'

const ALLOWED_ACTIONS: FounderActionType[] = [
  'create_task',
  'create_sprint',
  'defer_item',
  'create_capture',
  'create_memory_draft',
  'create_knowledge_draft',
  'update_mission',
  'schedule_placeholder',
]

function truncate(text: string, max: number): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function evidenceFromSession(
  session: ConversationSession,
  input: FounderInput,
  userName: string,
): CompactEvidenceRef[] {
  const ctx = buildConversationContext(input, userName)
  const items = [...session.evidence, ...buildConversationEvidence(ctx, input)]
  const seen = new Set<string>()
  const result: CompactEvidenceRef[] = []

  for (const e of items.sort((a, b) => b.weight - a.weight)) {
    const key = `${e.sourceType}:${e.sourceId ?? e.id}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push({
      id: e.id,
      sourceType: e.sourceType,
      sourceId: e.sourceId,
      title: truncate(e.title, 80),
      summary: truncate(e.summary, FOUNDER_AI_LIMITS.MAX_SUMMARY_CHARS),
      weight: e.weight,
      supports: e.supports,
      evidenceKind: e.evidenceKind,
    })
    if (result.length >= FOUNDER_AI_LIMITS.MAX_EVIDENCE) break
  }
  return result
}

function beliefsFromWorld(world: WorldModel): CompactFounderContext['activeBeliefs'] {
  return [...world.beliefs]
    .sort((a, b) => b.confidence - a.confidence || b.importance.localeCompare(a.importance))
    .slice(0, FOUNDER_AI_LIMITS.MAX_BELIEFS)
    .map((b) => ({
      id: b.id,
      statement: truncate(b.statement, FOUNDER_AI_LIMITS.MAX_STATEMENT_CHARS),
      topic: b.topic,
      status: b.status,
      confidence: b.confidence,
      source: b.source,
      importance: b.importance,
    }))
}

export function buildCompactFounderContext(params: {
  userMessage: string
  session: ConversationSession
  input: FounderInput
  userName: string
  worldModel: WorldModel
  store?: CognitiveStore
}): CompactFounderContext {
  const { userMessage, session, input, userName, worldModel } = params
  const snap = buildConversationContext(input, userName).founderSnapshot
  const summary = session.summary
    ? session.summary.summary
    : buildConversationSummary(session).summary

  const recentTurns = session.turns.slice(-FOUNDER_AI_LIMITS.MAX_RECENT_TURNS).map((t) => ({
    id: t.id,
    role: t.role,
    content: truncate(t.content, 500),
    questionId: t.questionId,
    createdAt: t.createdAt,
  }))

  const activeQ = session.trackedQuestions?.find((q) => q.status === 'unanswered')
    ?? (session.nextQuestion ? {
      id: session.nextQuestion.id,
      text: session.nextQuestion.title,
      topic: session.nextQuestion.topic,
    } : undefined)

  const activeQuestion = activeQ
    ? {
      id: 'id' in activeQ ? activeQ.id : session.nextQuestion!.id,
      text: 'text' in activeQ ? activeQ.text : session.nextQuestion!.title,
      topic: 'topic' in activeQ ? activeQ.topic : session.nextQuestion!.topic,
    }
    : undefined

  const overall = worldModel.beliefs.length
    ? Math.round(worldModel.beliefs.reduce((s, b) => s + b.confidence, 0) / worldModel.beliefs.length)
    : worldModel.confidenceLevels.overall ?? 40

  const evidence = dedupeEvidence(
    worldModel.beliefs.flatMap((b) => [...b.supportingEvidence, ...b.contradictingEvidence]),
  ).slice(0, FOUNDER_AI_LIMITS.MAX_EVIDENCE).map((e) => ({
    id: e.id,
    sourceType: e.sourceType,
    sourceId: e.sourceId,
    title: truncate(e.title, 80),
    summary: truncate(e.summary, FOUNDER_AI_LIMITS.MAX_SUMMARY_CHARS),
    weight: e.weight,
    supports: e.supports,
  }))

  const sessionEvidence = evidenceFromSession(session, input, userName)
  const mergedEvidence = new Map<string, CompactEvidenceRef>()
  for (const e of [...evidence, ...sessionEvidence]) {
    const key = `${e.sourceType}:${e.sourceId ?? e.id}`
    if (!mergedEvidence.has(key)) mergedEvidence.set(key, e)
  }

  return {
    userMessage: truncate(userMessage, FOUNDER_AI_LIMITS.MAX_MESSAGE_CHARS),
    conversationSummary: truncate(summary, FOUNDER_AI_LIMITS.MAX_SUMMARY_CHARS),
    worldModel: {
      mission: truncate(worldModel.mission, 200),
      currentStage: worldModel.currentStage,
      overallConfidence: overall,
      mainBottleneck: worldModel.currentBottlenecks[0] ?? snap.mainBottleneck,
      topRisks: worldModel.currentRisks.slice(0, 4).map((r) => truncate(r, 120)),
      hypotheses: worldModel.currentHypotheses
        .filter((h) => h.status === 'open')
        .slice(0, FOUNDER_AI_LIMITS.MAX_HYPOTHESES)
        .map((h) => truncate(h.statement, 200)),
    },
    founderSnapshot: {
      currentStage: snap.currentStage,
      mainInsight: truncate(snap.mainInsight, 300),
      mainBottleneck: snap.mainBottleneck,
      momentumScore: snap.momentumScore,
      validationScore: snap.validationScore,
      executionScore: snap.executionScore,
      topRecommendation: truncate(snap.topRecommendation, 300),
      risks: (snap.risks ?? []).slice(0, 4).map((r) => truncate(r.title, 120)),
    },
    activeBeliefs: beliefsFromWorld(worldModel),
    unknowns: worldModel.unknowns
      .slice(0, FOUNDER_AI_LIMITS.MAX_UNKNOWNS)
      .map((u) => ({
        id: u.id,
        statement: truncate(u.statement, 200),
        topic: u.topic,
        importance: u.importance,
      })),
    contradictions: worldModel.contradictions
      .filter((c) => !c.resolved)
      .slice(0, FOUNDER_AI_LIMITS.MAX_CONTRADICTIONS)
      .map((c) => ({
        id: c.id,
        description: truncate(c.description, 200),
        beliefAId: c.beliefAId,
        beliefBId: c.beliefBId,
        resolved: c.resolved,
      })),
    activeQuestion,
    recentTurns,
    evidence: Array.from(mergedEvidence.values()).slice(0, FOUNDER_AI_LIMITS.MAX_EVIDENCE),
    availableActionTypes: ALLOWED_ACTIONS,
  }
}
