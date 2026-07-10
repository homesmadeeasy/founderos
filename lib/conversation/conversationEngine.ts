import type { FounderInput } from '@/lib/specialists/founder/founderTypes'
import { answerFounderQuestion } from '@/lib/specialists/founder/founderQuestions'
import {
  processAdaptiveAnswer,
  initializeAdaptiveSession,
  migrateSession,
} from './conversationAdaptive'
import { confidenceDeltaForAdaptiveAnswer } from './conversationConfidence'
import type {
  ConversationContext,
  ConversationSession,
  ConversationTurn,
  ConversationTopic,
  ConversationRecommendation,
  SubmitAnswerInput,
  SubmitAnswerResult,
  ConversationStore,
} from './conversationTypes'
import { buildConversationContext } from './conversationContext'
import { buildConversationEvidence, evidenceForRecommendation } from './conversationEvidence'
import { generateConversationQuestions } from './conversationQuestions'
import { buildConversationSummary } from './conversationSummaries'
import { buildMemoryWriteFromSession, buildKnowledgeSuggestionFromSession } from './conversationMemory'
import { buildTimelineFromSession } from './conversationTimeline'
import {
  loadConversationStore,
  saveConversationStore,
  upsertSession,
  addTimelineEntry,
  dismissProactive,
  wasProactiveDismissedToday,
} from './conversationSession'
import { newConversationId, nowISO, clampConfidence, QUESTION_CHIPS } from './conversationUtils'

// ─── Reasoner interface (swap RuleReasoner → LLMReasoner later) ───────────────

export interface ConversationReasoner {
  generateOpening(ctx: ConversationContext, evidence: ReturnType<typeof buildConversationEvidence>): ConversationTurn
  generateReply(
    ctx: ConversationContext,
    session: ConversationSession,
    answer: string,
    questionId?: string,
    userTurnId?: string,
  ): { turn: ConversationTurn; adaptive: ReturnType<typeof processAdaptiveAnswer> }
  generateRecommendation(ctx: ConversationContext): ConversationRecommendation
  answerChipQuestion(ctx: ConversationContext, prompt: string): string
}

export const ruleReasoner: ConversationReasoner = {
  generateOpening(ctx, evidence) {
    const snap = ctx.founderSnapshot
    const paragraphs = [
      `${ctx.greeting} ${ctx.userName}.`,
      ctx.recoveryScore >= 70
        ? 'You recovered well.'
        : 'Recovery is lighter today — protect your energy.',
      ctx.topDomain === 'school'
        ? 'School matters today.'
        : ctx.topDomain === 'founder'
          ? 'FounderOS is the focus.'
          : 'Your day has competing priorities.',
      snap.mainInsight,
    ]

    const nextQ = generateConversationQuestions(ctx)[0]
    if (nextQ) {
      paragraphs.push(nextQ.title.endsWith('?') ? nextQ.title : `${nextQ.title}?`)
    }

    return {
      id: newConversationId(),
      role: 'founder_ai',
      content: paragraphs.join('\n\n'),
      intent: 'observe',
      mood: 'strategic',
      topic: nextQ?.topic ?? 'founder',
      evidence: evidence.slice(0, 4),
      questionId: nextQ?.id ?? 'q-validation-users',
      createdAt: nowISO(),
    }
  },

  generateReply(ctx, session, answer, questionId, userTurnId) {
    const adaptive = processAdaptiveAnswer(
      ctx,
      session,
      answer,
      questionId,
      userTurnId ?? newConversationId(),
    )
    return { turn: adaptive.reply, adaptive }
  },

  generateRecommendation(ctx) {
    const snap = ctx.founderSnapshot
    const evidence = evidenceForRecommendation(ctx)
    return {
      id: newConversationId(),
      action: snap.topRecommendation,
      reason: snap.mainInsight,
      evidence,
      confidence: clampConfidence(snap.momentumScore),
    }
  },

  answerChipQuestion(ctx, prompt) {
    return answerFounderQuestion(ctx.founderSnapshot, prompt)
  },
}

// ─── Engine API ───────────────────────────────────────────────────────────────

let activeReasoner: ConversationReasoner = ruleReasoner

export function setConversationReasoner(reasoner: ConversationReasoner): void {
  activeReasoner = reasoner
}

export function getConversationReasoner(): ConversationReasoner {
  return activeReasoner
}

export function getProactiveHomeMessage(input: FounderInput, userName = 'there'): {
  message: string
  question: string
  evidence: ReturnType<typeof buildConversationEvidence>
  dismissed: boolean
} {
  const store = loadConversationStore()
  const ctx = buildConversationContext(input, userName)
  const evidence = buildConversationEvidence(ctx, input)
  const opening = activeReasoner.generateOpening(ctx, evidence)
  const lines = opening.content.split('\n\n')
  const question = lines[lines.length - 1] ?? ''

  return {
    message: opening.content,
    question,
    evidence,
    dismissed: wasProactiveDismissedToday(store),
  }
}

export function startConversation(
  input: FounderInput,
  userName = 'there',
  topic: ConversationTopic = 'founder',
): ConversationSession {
  const ctx = buildConversationContext(input, userName)
  const evidence = buildConversationEvidence(ctx, input)
  const questions = generateConversationQuestions(ctx)
  const opening = activeReasoner.generateOpening(ctx, evidence)
  const recommendation = activeReasoner.generateRecommendation(ctx)

  let session: ConversationSession = {
    id: newConversationId(),
    startedAt: nowISO(),
    updatedAt: nowISO(),
    topic,
    status: 'active',
    turns: [opening],
    evidence,
    activeQuestions: questions,
    confidence: recommendation.confidence,
    memoryWrites: [],
    knowledgeSuggestions: [],
    nextQuestion: questions[0],
    recommendation,
  }

  session = initializeAdaptiveSession(ctx, session)
  session.nextQuestion = session.trackedQuestions?.find(q => q.status === 'unanswered')
    ? {
      id: 'q-validation-users',
      topic: 'validation',
      title: session.trackedQuestions!.find(q => q.id === 'q-validation-users')!.text,
      reason: 'Opening validation question',
      importance: 'critical',
      answerType: 'yes_no',
      relatedObjectIds: [],
      relatedMemoryIds: [],
      relatedSignalIds: [],
      relatedDomains: ['founder', 'validation'],
      suggestion: 'ask_now',
      confidence: 88,
    }
    : questions[0]

  let store = loadConversationStore()
  store = upsertSession(store, session)
  store = addTimelineEntry(store, {
    sessionId: session.id,
    type: 'question',
    title: 'ConversationStarted',
    detail: opening.content.slice(0, 120),
    relatedIds: [session.id],
  })
  saveConversationStore(store)

  return session
}

export function submitAnswer(
  input: SubmitAnswerInput,
  founderInput: FounderInput,
  userName = 'there',
): SubmitAnswerResult | null {
  const store = loadConversationStore()
  let session = store.sessions.find(s => s.id === input.sessionId)
  if (!session || session.status !== 'active') return null

  const ctx = buildConversationContext(founderInput, userName)
  session = migrateSession(session, ctx)

  const userTurn: ConversationTurn = {
    id: newConversationId(),
    role: 'user',
    content: input.answer,
    intent: 'reflect',
    mood: 'calm',
    topic: session.topic,
    evidence: [],
    questionId: input.questionId ?? session.activeQuestionId ?? session.nextQuestion?.id,
    createdAt: nowISO(),
  }

  const answeredQuestionId = input.questionId ?? session.activeQuestionId ?? session.nextQuestion?.id
  const { turn: reply, adaptive } = activeReasoner.generateReply(
    ctx, session, input.answer, answeredQuestionId, userTurn.id,
  )

  const updatedQuestions = session.activeQuestions.filter(q => q.id !== answeredQuestionId)

  let updated: ConversationSession = {
    ...session,
    updatedAt: nowISO(),
    turns: [...session.turns, userTurn, reply],
    activeQuestions: adaptive.nextQuestion
      ? [adaptive.nextQuestion, ...updatedQuestions.filter(q => q.id !== adaptive.nextQuestion!.id)]
      : updatedQuestions,
    nextQuestion: adaptive.nextQuestion,
    activeQuestionId: adaptive.activeQuestionId,
    beliefs: adaptive.beliefs,
    trackedQuestions: adaptive.trackedQuestions,
    evidence: adaptive.sessionEvidence,
    confidence: clampConfidence(session.confidence + adaptive.confidenceDelta),
  }

  const userAnswerCount = updated.turns.filter(t => t.role === 'user').length
  if (!adaptive.nextQuestion && !adaptive.actionCard && userAnswerCount >= 3) {
    updated = finishConversationSession(updated)
  }

  let newStore = upsertSession(store, updated)
  newStore = addTimelineEntry(newStore, {
    sessionId: updated.id,
    type: 'answer',
    title: answeredQuestionId ?? 'user-reply',
    detail: input.answer.slice(0, 200),
    relatedIds: answeredQuestionId ? [answeredQuestionId] : [],
  })
  saveConversationStore(newStore)

  const memoryDraft = buildMemoryWriteFromSession(updated)
  const knowledgeSuggestion = buildKnowledgeSuggestionFromSession(updated)

  return {
    session: updated,
    reply,
    memoryWrite: memoryDraft ?? undefined,
    knowledgeSuggestion: knowledgeSuggestion ?? undefined,
  }
}

export function finishConversationSession(session: ConversationSession): ConversationSession {
  const summary = buildConversationSummary(session)
  const memoryWrite = buildMemoryWriteFromSession({ ...session, summary })
  const knowledgeSuggestion = buildKnowledgeSuggestionFromSession({ ...session, summary })

  return {
    ...session,
    status: 'finished',
    summary,
    memoryWrites: memoryWrite ? [...session.memoryWrites, memoryWrite] : session.memoryWrites,
    knowledgeSuggestions: knowledgeSuggestion
      ? [...session.knowledgeSuggestions, knowledgeSuggestion]
      : session.knowledgeSuggestions,
    updatedAt: nowISO(),
  }
}

export function abandonConversation(sessionId: string): void {
  const store = loadConversationStore()
  const session = store.sessions.find(s => s.id === sessionId)
  if (!session) return
  const updated = { ...session, status: 'abandoned' as const, updatedAt: nowISO() }
  saveConversationStore(upsertSession(store, updated))
}

export function dismissProactivePrompt(): void {
  const store = loadConversationStore()
  saveConversationStore(dismissProactive(store))
}

export function getConversationStore(): ConversationStore {
  return loadConversationStore()
}

export function getQuestionChips(): readonly string[] {
  return QUESTION_CHIPS
}

export function continueOrStartSession(
  input: FounderInput,
  userName = 'there',
): ConversationSession {
  const store = loadConversationStore()
  const active = store.sessions.find(s => s.status === 'active')
  if (active) {
    const ctx = buildConversationContext(input, userName)
    const migrated = migrateSession(active, ctx)
    if (migrated !== active) {
      saveConversationStore(upsertSession(store, migrated))
    }
    return migrated
  }
  const yesterday = store.sessions.find(s =>
    s.status === 'finished'
    && s.updatedAt.slice(0, 10) !== new Date().toISOString().slice(0, 10),
  )
  if (yesterday) {
    return startConversation(input, userName, yesterday.topic)
  }
  return startConversation(input, userName)
}

export function appendTimelineForSession(session: ConversationSession): void {
  const store = loadConversationStore()
  const entries = buildTimelineFromSession(session)
  let updated = store
  for (const e of entries) {
    updated = addTimelineEntry(updated, e)
  }
  saveConversationStore(updated)
}
