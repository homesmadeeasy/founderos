import type {
  ConversationBelief,
  ConversationContext,
  TrackedQuestion,
  ConversationQuestionType,
} from './conversationTypes'
import { nowISO } from './conversationUtils'

export const VALIDATION_BELIEF_KEYS = {
  usersTested: 'validation.usersTested',
  userCount: 'validation.userCount',
  testedSurface: 'validation.testedSurface',
  comprehension: 'validation.comprehension',
  valuePerceived: 'validation.valuePerceived',
  confusion: 'validation.confusion',
  repeatUse: 'validation.repeatUse',
  willingnessToPay: 'validation.willingnessToPay',
} as const

export function initializeBeliefs(ctx: ConversationContext): ConversationBelief[] {
  const hasValidationEvidence = ctx.validationScore >= 45
  const now = nowISO()

  return [
    {
      key: VALIDATION_BELIEF_KEYS.usersTested,
      topic: 'validation',
      label: 'Real users tested product',
      value: hasValidationEvidence,
      displayValue: hasValidationEvidence
        ? 'Some validation signals stored'
        : 'No stored validation evidence',
      status: hasValidationEvidence ? 'inferred' : 'inferred',
      confidence: hasValidationEvidence ? 50 : 45,
      sourceTurnIds: [],
      evidenceIds: ['ev-system-no-users'],
      updatedAt: now,
    },
    {
      key: VALIDATION_BELIEF_KEYS.userCount,
      topic: 'validation',
      label: 'Number of testers',
      value: null,
      displayValue: 'unknown',
      status: 'unknown',
      confidence: 0,
      sourceTurnIds: [],
      evidenceIds: [],
      updatedAt: now,
    },
    {
      key: VALIDATION_BELIEF_KEYS.testedSurface,
      topic: 'validation',
      label: 'Tested surface',
      value: null,
      displayValue: 'unknown',
      status: 'unknown',
      confidence: 0,
      sourceTurnIds: [],
      evidenceIds: [],
      updatedAt: now,
    },
    {
      key: VALIDATION_BELIEF_KEYS.comprehension,
      topic: 'validation',
      label: 'Comprehension without help',
      value: null,
      displayValue: 'unknown',
      status: 'unknown',
      confidence: 0,
      sourceTurnIds: [],
      evidenceIds: [],
      updatedAt: now,
    },
    {
      key: VALIDATION_BELIEF_KEYS.valuePerceived,
      topic: 'validation',
      label: 'Value perceived',
      value: null,
      displayValue: 'unknown',
      status: 'unknown',
      confidence: 0,
      sourceTurnIds: [],
      evidenceIds: [],
      updatedAt: now,
    },
    {
      key: VALIDATION_BELIEF_KEYS.confusion,
      topic: 'validation',
      label: 'Confusion points',
      value: null,
      displayValue: 'unknown',
      status: 'unknown',
      confidence: 0,
      sourceTurnIds: [],
      evidenceIds: [],
      updatedAt: now,
    },
    {
      key: VALIDATION_BELIEF_KEYS.repeatUse,
      topic: 'validation',
      label: 'Repeat-use intent',
      value: null,
      displayValue: 'unknown',
      status: 'unknown',
      confidence: 0,
      sourceTurnIds: [],
      evidenceIds: [],
      updatedAt: now,
    },
    {
      key: VALIDATION_BELIEF_KEYS.willingnessToPay,
      topic: 'validation',
      label: 'Willingness to pay',
      value: null,
      displayValue: 'unknown',
      status: 'unknown',
      confidence: 0,
      sourceTurnIds: [],
      evidenceIds: [],
      updatedAt: now,
    },
  ]
}

export function getBelief(beliefs: ConversationBelief[], key: string): ConversationBelief | undefined {
  return beliefs.find(b => b.key === key)
}

export function updateBelief(
  beliefs: ConversationBelief[],
  key: string,
  patch: Partial<ConversationBelief> & { value?: unknown },
  turnId?: string,
): ConversationBelief[] {
  return beliefs.map(b => {
    if (b.key !== key) return b
    return {
      ...b,
      ...patch,
      sourceTurnIds: turnId ? [...new Set([...b.sourceTurnIds, turnId])] : b.sourceTurnIds,
      updatedAt: nowISO(),
    }
  })
}

export function beliefSummaryLabel(belief: ConversationBelief): string {
  const statusLabel: Record<string, string> = {
    inferred: 'system inferred',
    user_claimed: 'user reported',
    confirmed: 'confirmed',
    contradicted: 'contradicted',
    unknown: 'unknown',
  }
  return `${belief.label} — ${belief.displayValue} (${statusLabel[belief.status] ?? belief.status})`
}

export function parseUserCount(answer: string): number | null {
  const n = answer.trim().toLowerCase()
  if (n === '1' || n === 'one') return 1
  if (n.includes('2-3') || n.includes('2–3') || n === '2' || n === '3') return 3
  if (n.includes('4-10') || n.includes('4–10')) return 7
  if (n.includes('more than 10') || n.includes('10+')) return 12
  const match = answer.match(/(\d+)\s*(people|users|students|testers|person)/i)
    ?? answer.match(/^(\d+)$/)
    ?? answer.match(/(\d+)/)
  if (match) return parseInt(match[1], 10)
  const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 }
  for (const [word, num] of Object.entries(words)) {
    if (n.includes(word)) return num
  }
  return null
}

export function parseTestedSurface(answer: string): string | null {
  const surfaces = ['home', 'founder', 'domains', 'morning', 'evening', 'capture', 'memory', 'dashboard']
  const lower = answer.toLowerCase()
  for (const s of surfaces) {
    if (lower.includes(s)) return s.charAt(0).toUpperCase() + s.slice(1)
  }
  return null
}

export function applyParsedValidationFacts(
  beliefs: ConversationBelief[],
  answer: string,
  turnId: string,
): ConversationBelief[] {
  let updated = beliefs
  const count = parseUserCount(answer)
  const surface = parseTestedSurface(answer)

  if (count !== null) {
    updated = updateBelief(updated, VALIDATION_BELIEF_KEYS.userCount, {
      value: count,
      displayValue: String(count),
      status: 'confirmed',
      confidence: 75,
    }, turnId)
    if (getBelief(updated, VALIDATION_BELIEF_KEYS.usersTested)?.status === 'user_claimed') {
      updated = updateBelief(updated, VALIDATION_BELIEF_KEYS.usersTested, {
        status: 'confirmed',
        confidence: 75,
        displayValue: 'Yes — count confirmed',
      }, turnId)
    }
  }

  if (surface) {
    updated = updateBelief(updated, VALIDATION_BELIEF_KEYS.testedSurface, {
      value: surface,
      displayValue: surface,
      status: 'confirmed',
      confidence: 72,
    }, turnId)
  }

  if (answer.trim().length > 20 && !count && !surface) {
    if (/confus|didn't understand|unclear/i.test(answer)) {
      updated = updateBelief(updated, VALIDATION_BELIEF_KEYS.confusion, {
        value: answer.slice(0, 120),
        displayValue: answer.slice(0, 60),
        status: 'confirmed',
        confidence: 70,
      }, turnId)
    }
    if (/valuable|useful|love|liked|selected/i.test(answer)) {
      updated = updateBelief(updated, VALIDATION_BELIEF_KEYS.valuePerceived, {
        value: answer.slice(0, 120),
        displayValue: answer.slice(0, 60),
        status: 'confirmed',
        confidence: 72,
      }, turnId)
    }
  }

  return updated
}

export const ANSWER_OPTIONS_BY_TYPE: Record<ConversationQuestionType, string[]> = {
  boolean: ['Yes', 'No', 'Maybe', "I'm not sure", 'Tell me more'],
  numeric: ['1', '2–3', '4–10', 'More than 10', "I'm not sure"],
  factual: [],
  multiple_choice: [],
  open_text: [],
  confirmation: ['Yes', 'No'],
  evidence_request: [],
}

export function defaultAnswerOptions(type: ConversationQuestionType): string[] {
  return [...ANSWER_OPTIONS_BY_TYPE[type]]
}

export function createTrackedQuestion(
  id: string,
  topic: TrackedQuestion['topic'],
  questionType: ConversationQuestionType,
  text: string,
  opts?: Partial<TrackedQuestion>,
): TrackedQuestion {
  return {
    id,
    topic,
    questionType,
    text,
    answerOptions: opts?.answerOptions ?? defaultAnswerOptions(questionType),
    status: 'unanswered',
    evidenceRequired: opts?.evidenceRequired ?? false,
    followUpStrategy: opts?.followUpStrategy,
    beliefKey: opts?.beliefKey,
    ...opts,
  }
}

export const VALIDATION_QUESTION_DEFS: TrackedQuestion[] = [
  createTrackedQuestion(
    'q-validation-users',
    'validation',
    'boolean',
    "You've built many features recently. Have real users tested any of them?",
    { evidenceRequired: true, beliefKey: VALIDATION_BELIEF_KEYS.usersTested },
  ),
  createTrackedQuestion(
    'q-validation-user-count',
    'validation',
    'numeric',
    'Approximately how many people tested FounderOS?',
    { evidenceRequired: true, beliefKey: VALIDATION_BELIEF_KEYS.userCount },
  ),
  createTrackedQuestion(
    'q-validation-tested-surface',
    'validation',
    'factual',
    'Which part of FounderOS did they test?',
    { beliefKey: VALIDATION_BELIEF_KEYS.testedSurface },
  ),
  createTrackedQuestion(
    'q-validation-comprehension',
    'validation',
    'boolean',
    'Could they explain what the product does without your help?',
    { beliefKey: VALIDATION_BELIEF_KEYS.comprehension },
  ),
  createTrackedQuestion(
    'q-validation-value',
    'validation',
    'open_text',
    'What did they find most valuable?',
    { beliefKey: VALIDATION_BELIEF_KEYS.valuePerceived },
  ),
  createTrackedQuestion(
    'q-validation-confusion',
    'validation',
    'open_text',
    'What confused them?',
    { beliefKey: VALIDATION_BELIEF_KEYS.confusion },
  ),
  createTrackedQuestion(
    'q-validation-repeat-use',
    'validation',
    'boolean',
    'Did any of them ask to use it again?',
    { beliefKey: VALIDATION_BELIEF_KEYS.repeatUse },
  ),
  createTrackedQuestion(
    'q-validation-wtp',
    'validation',
    'boolean',
    'Did anyone indicate willingness to pay?',
    { beliefKey: VALIDATION_BELIEF_KEYS.willingnessToPay },
  ),
]

export function getTrackedQuestion(id: string, tracked: TrackedQuestion[]): TrackedQuestion | undefined {
  return tracked.find(q => q.id === id)
}

export function getActiveTrackedQuestion(tracked: TrackedQuestion[]): TrackedQuestion | undefined {
  return tracked.find(q => q.status === 'unanswered')
}

export function markQuestionAnswered(
  tracked: TrackedQuestion[],
  questionId: string,
  answerTurnId: string,
): TrackedQuestion[] {
  const now = nowISO()
  return tracked.map(q =>
    q.id === questionId
      ? { ...q, status: 'answered' as const, answeredAt: now, answerTurnId }
      : q,
  )
}

export function markQuestionAsked(tracked: TrackedQuestion[], questionId: string): TrackedQuestion[] {
  const now = nowISO()
  return tracked.map(q =>
    q.id === questionId && !q.askedAt
      ? { ...q, askedAt: now }
      : q,
  )
}

export function ensureTrackedQuestions(session: { trackedQuestions?: TrackedQuestion[] }): TrackedQuestion[] {
  if (session.trackedQuestions && session.trackedQuestions.length > 0) {
    return session.trackedQuestions
  }
  return VALIDATION_QUESTION_DEFS.map(q => ({ ...q }))
}

export function ensureBeliefs(
  session: { beliefs?: ConversationBelief[] },
  ctx: ConversationContext,
): ConversationBelief[] {
  if (session.beliefs && session.beliefs.length > 0) return session.beliefs
  return initializeBeliefs(ctx)
}
