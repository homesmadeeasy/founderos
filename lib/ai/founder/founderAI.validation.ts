import { FOUNDER_AI_LIMITS } from './founderAI.config'
import type {
  CompactFounderContext,
  FounderAIResponse,
  ProposedAction,
  ProposedBeliefUpdate,
} from './founderAI.types'
import type { FounderActionType } from './founderAI.types'

const ALLOWED_ACTION_TYPES = new Set<string>([
  'create_task',
  'create_sprint',
  'defer_item',
  'create_capture',
  'create_memory_draft',
  'create_knowledge_draft',
  'update_mission',
  'schedule_placeholder',
])

const SAFE_PAYLOAD_KEYS: Record<string, Set<string>> = {
  create_task: new Set(['title', 'description', 'dueDate', 'priority', 'projectId']),
  create_sprint: new Set(['title', 'tasks', 'goal']),
  defer_item: new Set(['itemTitle', 'reason', 'deferUntil']),
  create_capture: new Set(['text', 'area']),
  create_memory_draft: new Set(['title', 'content', 'tags']),
  create_knowledge_draft: new Set(['title', 'principle', 'domain']),
  update_mission: new Set(['mission']),
  schedule_placeholder: new Set(['title', 'startAt', 'durationMinutes', 'note']),
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)))
}

function stableKey(parts: string[]): string {
  return parts.join('|').toLowerCase()
}

function sanitizePayload(type: string, payload: Record<string, unknown>): Record<string, unknown> {
  const allowed = SAFE_PAYLOAD_KEYS[type]
  if (!allowed) return {}
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(payload)) {
    if (allowed.has(k)) out[k] = v
  }
  return out
}

function filterEvidenceIds(ids: string[], context: CompactFounderContext): string[] {
  const valid = new Set(context.evidence.map((e) => e.id))
  return [...new Set(ids.filter((id) => valid.has(id)))]
}

function protectConfirmedBeliefs(
  updates: ProposedBeliefUpdate[],
  context: CompactFounderContext,
): ProposedBeliefUpdate[] {
  const beliefs = new Map(context.activeBeliefs.map((b) => [b.id, b]))
  return updates.map((u) => {
    if (!u.beliefId) return u
    const existing = beliefs.get(u.beliefId)
    if (!existing) return u
    const isUserReported = existing.source === 'conversation' || existing.status === 'confirmed'
    const hasContradictionEvidence = u.operation === 'challenge' && u.evidenceIds.length > 0
    if (isUserReported && u.operation === 'update' && !hasContradictionEvidence) {
      return {
        ...u,
        operation: 'confirm' as const,
        confidenceDelta: Math.min(u.confidenceDelta, 10),
        rationale: `${u.rationale} (downgraded: confirmed belief requires explicit contradictory evidence to overwrite)`,
      }
    }
    return u
  })
}

function dedupeBeliefUpdates(items: ProposedBeliefUpdate[]): ProposedBeliefUpdate[] {
  const seen = new Set<string>()
  const out: ProposedBeliefUpdate[] = []
  for (const item of items) {
    const key = stableKey([item.beliefId ?? '', item.proposition, item.operation])
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out.slice(0, FOUNDER_AI_LIMITS.MAX_BELIEF_UPDATES)
}

function dedupeActions(items: ProposedAction[]): ProposedAction[] {
  const seen = new Set<string>()
  const out: ProposedAction[] = []
  for (const item of items) {
    const key = stableKey([item.type, item.title])
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out.slice(0, FOUNDER_AI_LIMITS.MAX_ACTIONS)
}

export function validateFounderAIResponse(
  raw: FounderAIResponse,
  context: CompactFounderContext,
): FounderAIResponse {
  const evidenceIds = filterEvidenceIds(raw.evidenceIds ?? [], context)

  let beliefsToUpdate = protectConfirmedBeliefs(raw.beliefsToUpdate ?? [], context)
  beliefsToUpdate = dedupeBeliefUpdates(
    beliefsToUpdate.map((b) => ({
      ...b,
      proposition: b.proposition.slice(0, FOUNDER_AI_LIMITS.MAX_STATEMENT_CHARS),
      rationale: b.rationale.slice(0, 400),
      evidenceIds: filterEvidenceIds(b.evidenceIds ?? [], context),
      confidenceDelta: clamp(b.confidenceDelta ?? 0, -50, 50),
    })),
  )

  const suggestedActions = dedupeActions(
    (raw.suggestedActions ?? [])
      .filter((a) => ALLOWED_ACTION_TYPES.has(a.type))
      .map((a) => ({
        ...a,
        id: a.id || `action-${a.type}`,
        type: a.type as FounderActionType,
        title: a.title.slice(0, 120),
        description: a.description.slice(0, 400),
        rationale: a.rationale.slice(0, 400),
        confidence: clamp(a.confidence ?? 50, 0, 100),
        domain: a.domain.slice(0, 40),
        reversible: a.reversible ?? true,
        requiresApproval: true as const,
        payload: sanitizePayload(a.type, a.payload ?? {}),
      })),
  )

  const memoryDrafts = (raw.memoryDrafts ?? []).slice(0, FOUNDER_AI_LIMITS.MAX_MEMORY_DRAFTS).map((d) => ({
    ...d,
    title: d.title.slice(0, 120),
    content: d.content.slice(0, 600),
  }))

  const knowledgeDrafts = (raw.knowledgeDrafts ?? []).slice(0, FOUNDER_AI_LIMITS.MAX_KNOWLEDGE_DRAFTS).map((d) => ({
    ...d,
    title: d.title.slice(0, 120),
    principle: d.principle.slice(0, 400),
  }))

  const contradictionsToCreate = (raw.contradictionsToCreate ?? [])
    .slice(0, FOUNDER_AI_LIMITS.MAX_CONTRADICTIONS)
    .filter((c) => c.beliefAId && c.beliefBId && c.beliefAId !== c.beliefBId)

  const nextQuestion = raw.nextQuestion
    ? {
      ...raw.nextQuestion,
      text: raw.nextQuestion.text.slice(0, 280),
      purpose: raw.nextQuestion.purpose.slice(0, 200),
      options: raw.nextQuestion.options?.slice(0, 6),
    }
    : undefined

  return {
    message: raw.message.slice(0, 2_500),
    reasoningSummary: raw.reasoningSummary.slice(0, 600),
    confidence: clamp(raw.confidence ?? 50, 0, 100),
    evidenceIds,
    beliefsToUpdate,
    contradictionsToCreate,
    nextQuestion,
    suggestedActions,
    memoryDrafts,
    knowledgeDrafts,
  }
}
