import type {
  ConversationActionCard,
  ConversationBelief,
  ConversationContext,
  ConversationEvidence,
  ConversationQuestion,
  ConversationSession,
  ConversationTurn,
  TrackedQuestion,
} from './conversationTypes'
import { VALIDATION_SPRINT_CARD } from './conversationActions'
import { answerFounderQuestion } from '@/lib/specialists/founder/founderQuestions'
import {
  VALIDATION_BELIEF_KEYS,
  applyParsedValidationFacts,
  ensureBeliefs,
  ensureTrackedQuestions,
  getBelief,
  markQuestionAnswered,
  markQuestionAsked,
  updateBelief,
  VALIDATION_QUESTION_DEFS,
} from './conversationBeliefs'
import { selectNextFounderQuestion } from './conversationQuestionSelector'
import { confidenceDeltaForAdaptiveAnswer } from './conversationConfidence'
import { buildReconciledEvidence, buildTurnEvidence } from './conversationEvidence'
import { dedupeConversationEvidence } from './conversationEvidenceDedupe'
import { newConversationId, nowISO } from './conversationUtils'

function normalize(answer: string): string {
  return answer.trim().toLowerCase()
}

function trackedToLegacyQuestion(q: TrackedQuestion): ConversationQuestion {
  const answerTypeMap: Record<string, ConversationQuestion['answerType']> = {
    boolean: 'yes_no',
    numeric: 'number',
    factual: 'short_text',
    open_text: 'paragraph',
    multiple_choice: 'multiple_choice',
    confirmation: 'yes_no',
    evidence_request: 'paragraph',
  }
  return {
    id: q.id,
    topic: q.topic,
    title: q.text,
    reason: q.followUpStrategy ?? 'Adaptive follow-up',
    importance: 'high',
    answerType: answerTypeMap[q.questionType] ?? 'paragraph',
    choices: q.answerOptions,
    relatedObjectIds: [],
    relatedMemoryIds: [],
    relatedSignalIds: [],
    relatedDomains: ['founder', 'validation'],
    suggestion: 'ask_now',
    confidence: 80,
  }
}

function buildAdaptiveTurn(
  session: ConversationSession,
  content: string,
  ctx: ConversationContext,
  opts: {
    questionId?: string
    intent?: ConversationTurn['intent']
    mood?: ConversationTurn['mood']
    nextTracked?: TrackedQuestion | null
    actionCard?: ConversationActionCard
    beliefs: ConversationBelief[]
    evidenceIds?: string[]
  },
): ConversationTurn {
  const evidence = buildTurnEvidence(ctx, opts.beliefs, session, 4, opts.evidenceIds)

  return {
    id: newConversationId(),
    role: 'founder_ai',
    content,
    intent: opts.intent ?? 'recommend',
    mood: opts.mood ?? 'direct',
    topic: session.topic,
    evidence,
    questionId: opts.questionId,
    followUpQuestion: opts.nextTracked ? trackedToLegacyQuestion(opts.nextTracked) : undefined,
    actionCard: opts.actionCard,
    createdAt: nowISO(),
  }
}

function formatBeliefChange(beliefs: ConversationBelief[], key: string): string {
  const b = getBelief(beliefs, key)
  if (!b) return ''
  return `**${b.label}** is now *${b.displayValue}* (${b.status.replace('_', ' ')}).`
}

function handleValidationUsersYes(
  beliefs: ConversationBelief[],
  turnId: string,
): ConversationBelief[] {
  return updateBelief(beliefs, VALIDATION_BELIEF_KEYS.usersTested, {
    value: true,
    status: 'user_claimed',
    confidence: 55,
    displayValue: 'User reports testing occurred',
  }, turnId)
}

function handleValidationUsersNo(
  beliefs: ConversationBelief[],
  turnId: string,
): ConversationBelief[] {
  let updated = updateBelief(beliefs, VALIDATION_BELIEF_KEYS.usersTested, {
    value: false,
    status: 'confirmed',
    confidence: 70,
    displayValue: 'No real-user testing confirmed',
  }, turnId)
  return updated
}

function handleBooleanAnswer(
  beliefs: ConversationBelief[],
  key: string,
  answer: string,
  turnId: string,
): ConversationBelief[] {
  const n = normalize(answer)
  const value = n === 'yes' || n === 'maybe'
  const status = n === 'yes' ? 'confirmed' : n === 'no' ? 'confirmed' : 'user_claimed'
  return updateBelief(beliefs, key, {
    value,
    status,
    confidence: n === 'yes' ? 68 : n === 'no' ? 65 : 50,
    displayValue: n === 'yes' ? 'Yes' : n === 'no' ? 'No' : 'Uncertain',
  }, turnId)
}

export interface AdaptiveProcessResult {
  reply: ConversationTurn
  beliefs: ConversationBelief[]
  trackedQuestions: TrackedQuestion[]
  activeQuestionId?: string
  nextQuestion?: ConversationQuestion
  sessionEvidence: ConversationEvidence[]
  confidenceDelta: number
  actionCard?: ConversationActionCard
}

export function processAdaptiveAnswer(
  ctx: ConversationContext,
  session: ConversationSession,
  answer: string,
  questionId: string | undefined,
  userTurnId: string,
): AdaptiveProcessResult {
  let beliefs = ensureBeliefs(session, ctx)
  let tracked = ensureTrackedQuestions(session)
  const qid = questionId ?? session.activeQuestionId ?? session.nextQuestion?.id
  const activeQ = tracked.find(q => q.id === qid && q.status === 'unanswered')
    ?? tracked.find(q => q.status === 'unanswered')

  if (activeQ) {
    tracked = markQuestionAnswered(tracked, activeQ.id, userTurnId)
  }

  let nextTracked: TrackedQuestion | null = null
  let content: string[] = []
  let intent: ConversationTurn['intent'] = 'recommend'
  let mood: ConversationTurn['mood'] = 'direct'
  let actionCard: ConversationActionCard | undefined

  const n = normalize(answer)

  if (activeQ?.id === 'q-validation-users') {
    if (n === 'yes') {
      beliefs = handleValidationUsersYes(beliefs, userTurnId)
      content = [
        'Good. That changes the picture, but I need the actual evidence before treating validation as strong.',
        formatBeliefChange(beliefs, VALIDATION_BELIEF_KEYS.usersTested),
        'What remains unknown: how many people tested, what they saw, and what they understood.',
        'Approximately how many people tested FounderOS?',
      ]
      nextTracked = VALIDATION_QUESTION_DEFS.find(q => q.id === 'q-validation-user-count') ?? null
      intent = 'question'
      mood = 'curious'
    } else if (n === 'no') {
      beliefs = handleValidationUsersNo(beliefs, userTurnId)
      content = [
        'Then the system has no real validation evidence yet.',
        formatBeliefChange(beliefs, VALIDATION_BELIEF_KEYS.usersTested),
        'The next highest-value move is a small first-impression test, not another feature.',
      ]
      actionCard = VALIDATION_SPRINT_CARD
      mood = 'strategic'
    } else if (n === 'maybe') {
      beliefs = updateBelief(beliefs, VALIDATION_BELIEF_KEYS.usersTested, {
        value: true,
        status: 'user_claimed',
        confidence: 45,
        displayValue: 'Partial testing — unconfirmed',
      }, userTurnId)
      content = [
        'Some testing may have happened, but the evidence is incomplete.',
        'What exactly was tested?',
      ]
      nextTracked = VALIDATION_QUESTION_DEFS.find(q => q.id === 'q-validation-tested-surface') ?? null
      intent = 'question'
    } else if (n.includes("don't know") || n.includes('not sure')) {
      content = [
        'That uncertainty matters.',
        "Let's identify the last person outside the project who saw or used FounderOS.",
      ]
      nextTracked = {
        ...VALIDATION_QUESTION_DEFS.find(q => q.id === 'q-validation-tested-surface')!,
        text: 'Who was the last real person to see or use FounderOS, and what happened?',
        questionType: 'open_text',
        answerOptions: [],
      }
      intent = 'question'
    } else if (n === 'tell me more') {
      content = [
        `Validation score is **${ctx.validationScore}** now. Architecture is **${ctx.architectureScore}** now.`,
        'System inference: no stored validation signals confirm real-user testing.',
        'I need your report before updating the recommendation.',
      ]
      intent = 'observe'
      if (activeQ) tracked = tracked.map(q => q.id === activeQ.id ? { ...q, status: 'unanswered' as const, answeredAt: undefined, answerTurnId: undefined } : q)
    } else {
      beliefs = applyParsedValidationFacts(beliefs, answer, userTurnId)
      content = [
        `Noted: "${answer.slice(0, 80)}".`,
        formatBeliefChange(beliefs, VALIDATION_BELIEF_KEYS.usersTested),
      ]
    }
  } else if (activeQ?.id === 'q-validation-user-count') {
    beliefs = applyParsedValidationFacts(beliefs, answer, userTurnId)
    const count = getBelief(beliefs, VALIDATION_BELIEF_KEYS.userCount)
    if (count?.status === 'confirmed') {
      content = [
        `**${count.displayValue}** ${Number(count.value) === 1 ? 'person is' : 'people are'} enough to spot early comprehension problems, but not enough to prove repeat demand.`,
        formatBeliefChange(beliefs, VALIDATION_BELIEF_KEYS.userCount),
        'Which part of FounderOS did they test?',
      ]
      nextTracked = VALIDATION_QUESTION_DEFS.find(q => q.id === 'q-validation-tested-surface') ?? null
      intent = 'question'
    } else {
      content = [
        'I still need a clearer count before updating validation confidence.',
        'Approximately how many people tested FounderOS?',
      ]
      nextTracked = VALIDATION_QUESTION_DEFS.find(q => q.id === 'q-validation-user-count') ?? null
      if (activeQ) tracked = tracked.map(q => q.id === activeQ.id ? { ...q, status: 'unanswered' as const, answeredAt: undefined, answerTurnId: undefined } : q)
    }
  } else if (activeQ?.beliefKey && activeQ.questionType === 'boolean') {
    beliefs = handleBooleanAnswer(beliefs, activeQ.beliefKey, answer, userTurnId)
    content = [
      `Recorded your answer to: "${activeQ.text}"`,
      formatBeliefChange(beliefs, activeQ.beliefKey),
    ]
    const interim = { ...session, beliefs, trackedQuestions: tracked }
    nextTracked = selectNextFounderQuestion({ session: interim, beliefs, ctx })
    if (nextTracked) {
      content.push(`Still unknown: ${nextTracked.text}`)
      intent = 'question'
    }
  } else if (activeQ?.questionType === 'open_text' || activeQ?.questionType === 'factual') {
    beliefs = applyParsedValidationFacts(beliefs, answer, userTurnId)
    if (activeQ.beliefKey) {
      beliefs = updateBelief(beliefs, activeQ.beliefKey, {
        value: answer.slice(0, 200),
        displayValue: answer.slice(0, 80),
        status: 'confirmed',
        confidence: 72,
      }, userTurnId)
    }
    content = [
      `That clarifies **${activeQ.text.replace('?', '')}**.`,
      formatBeliefChange(beliefs, activeQ.beliefKey ?? ''),
      'What remains unknown will guide the next question.',
    ]
    const interim = { ...session, beliefs, trackedQuestions: tracked }
    nextTracked = selectNextFounderQuestion({ session: interim, beliefs, ctx })
    if (nextTracked) {
      content.push(nextTracked.text)
      intent = 'question'
    }
  } else {
    const isSuggested = /^(what|am i|how|why|should)/i.test(answer.trim()) || answer.includes('?')
    if (isSuggested && answer.trim().length > 8) {
      content = [answerFounderQuestion(ctx.founderSnapshot, answer)]
    } else if (answer.trim().length > 24) {
      beliefs = applyParsedValidationFacts(beliefs, answer, userTurnId)
      content = [
        'That is substantive — updating beliefs from your report.',
        answerFounderQuestion(ctx.founderSnapshot, `Given: ${answer.slice(0, 120)}. What is the next move?`),
      ]
    } else {
      content = [
        `You answered "${answer}" — I need more specifics before changing the recommendation.`,
        ctx.founderSnapshot.topRecommendation,
      ]
    }
    const interim = { ...session, beliefs, trackedQuestions: tracked }
    nextTracked = selectNextFounderQuestion({ session: interim, beliefs, ctx })
  }

  if (!nextTracked && !actionCard) {
    nextTracked = selectNextFounderQuestion({ session: { ...session, beliefs, trackedQuestions: tracked }, beliefs, ctx })
  }

  if (nextTracked) {
    tracked = markQuestionAsked(tracked, nextTracked.id)
    const exists = tracked.some(q => q.id === nextTracked!.id)
    if (!exists) tracked = [...tracked, { ...nextTracked, status: 'unanswered' }]
  }

  const sessionEvidence = buildReconciledEvidence(ctx, beliefs, session)
  const confidenceDelta = confidenceDeltaForAdaptiveAnswer(
    answer,
    activeQ?.questionType,
    activeQ?.beliefKey,
  )

  const reply = buildAdaptiveTurn(session, content.filter(Boolean).join('\n\n'), ctx, {
    questionId: activeQ?.id,
    intent,
    mood,
    nextTracked,
    actionCard,
    beliefs,
  })

  return {
    reply,
    beliefs,
    trackedQuestions: tracked,
    activeQuestionId: nextTracked?.id,
    nextQuestion: nextTracked ? trackedToLegacyQuestion(nextTracked) : undefined,
    sessionEvidence,
    confidenceDelta,
    actionCard,
  }
}

export function initializeAdaptiveSession(
  ctx: ConversationContext,
  session: ConversationSession,
): ConversationSession {
  const beliefs = initializeBeliefs(ctx)
  const tracked = VALIDATION_QUESTION_DEFS.map(q => ({ ...q }))
  const first = tracked.find(q => q.id === 'q-validation-users')
  if (first) {
    first.askedAt = nowISO()
  }
  return {
    ...session,
    beliefs,
    trackedQuestions: tracked,
    activeQuestionId: first?.id,
    evidence: buildReconciledEvidence(ctx, beliefs, session),
  }
}

function initializeBeliefs(ctx: ConversationContext): ConversationBelief[] {
  return ensureBeliefs({}, ctx)
}

export function migrateSession(session: ConversationSession, ctx: ConversationContext): ConversationSession {
  const beliefs = ensureBeliefs(session, ctx)
  const tracked = ensureTrackedQuestions(session)
  const active = tracked.find(q => q.status === 'unanswered')
  return {
    ...session,
    beliefs,
    trackedQuestions: tracked,
    activeQuestionId: session.activeQuestionId ?? active?.id,
    evidence: buildReconciledEvidence(ctx, beliefs, session),
  }
}

export function getActiveAnswerOptions(session: ConversationSession): string[] {
  const tracked = session.trackedQuestions ?? []
  if (session.activeQuestionId) {
    const q = tracked.find(t => t.id === session.activeQuestionId)
    if (q?.status === 'answered') return []
    if (q?.status === 'unanswered') return q.answerOptions
  }
  const fallback = tracked.find(q => q.status === 'unanswered')
  return fallback?.answerOptions ?? []
}

export function sortTurnsChronologically(turns: ConversationTurn[]): ConversationTurn[] {
  return [...turns].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export { dedupeConversationEvidence }
