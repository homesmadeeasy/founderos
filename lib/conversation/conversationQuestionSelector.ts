import type {
  ConversationBelief,
  ConversationContext,
  ConversationSession,
  TrackedQuestion,
} from './conversationTypes'
import {
  VALIDATION_BELIEF_KEYS,
  VALIDATION_QUESTION_DEFS,
  getBelief,
  getActiveTrackedQuestion,
  createTrackedQuestion,
} from './conversationBeliefs'

const VALIDATION_ORDER = [
  'q-validation-user-count',
  'q-validation-tested-surface',
  'q-validation-comprehension',
  'q-validation-value',
  'q-validation-confusion',
  'q-validation-repeat-use',
  'q-validation-wtp',
]

function beliefResolved(beliefs: ConversationBelief[], key?: string): boolean {
  if (!key) return false
  const b = getBelief(beliefs, key)
  if (!b) return false
  return b.status === 'confirmed'
}

function isQuestionAnswered(tracked: TrackedQuestion[], id: string): boolean {
  return tracked.find(q => q.id === id)?.status === 'answered'
}

export function selectNextFounderQuestion(input: {
  session: ConversationSession
  beliefs: ConversationBelief[]
  ctx: ConversationContext,
}): TrackedQuestion | null {
  const { session, beliefs } = input
  const tracked = session.trackedQuestions ?? []
  const usersTested = getBelief(beliefs, VALIDATION_BELIEF_KEYS.usersTested)

  if (usersTested?.status === 'confirmed' && usersTested.value === false) {
    return null
  }

  if (usersTested?.status === 'user_claimed' || (usersTested?.status === 'confirmed' && usersTested.value === true)) {
    for (const id of VALIDATION_ORDER) {
      if (isQuestionAnswered(tracked, id)) continue
      const def = VALIDATION_QUESTION_DEFS.find(q => q.id === id)
      if (!def) continue
      if (def.beliefKey && beliefResolved(beliefs, def.beliefKey)) continue
      return { ...def, status: 'unanswered' }
    }
    return null
  }

  const active = getActiveTrackedQuestion(tracked)
  if (active) return active

  const opening = tracked.find(q => q.id === 'q-validation-users' && q.status === 'unanswered')
  if (opening) return opening

  return null
}

export function shouldOfferValidationSprint(beliefs: ConversationBelief[]): boolean {
  const usersTested = getBelief(beliefs, VALIDATION_BELIEF_KEYS.usersTested)
  return usersTested?.value === false && usersTested.status === 'confirmed'
}

export function trackQuestionFromLegacyId(
  tracked: TrackedQuestion[],
  legacyId?: string,
): TrackedQuestion | null {
  if (!legacyId) return getActiveTrackedQuestion(tracked) ?? null
  const match = tracked.find(q => q.id === legacyId)
  if (match && match.status === 'unanswered') return match
  return getActiveTrackedQuestion(tracked) ?? null
}

export function registerAskedQuestion(
  tracked: TrackedQuestion[],
  question: TrackedQuestion,
): TrackedQuestion[] {
  const exists = tracked.some(q => q.id === question.id)
  if (exists) {
    return tracked.map(q =>
      q.id === question.id ? { ...q, askedAt: q.askedAt ?? new Date().toISOString() } : q,
    )
  }
  return [...tracked, { ...question, status: 'unanswered', askedAt: new Date().toISOString() }]
}

export function createGenericFollowUp(
  parentId: string,
  text: string,
  topic: TrackedQuestion['topic'] = 'founder',
): TrackedQuestion {
  return createTrackedQuestion(
    `q-followup-${parentId}-${Date.now()}`,
    topic,
    'open_text',
    text,
    { evidenceRequired: false },
  )
}
