import type { FounderInput } from '@/lib/specialists/founder/founderTypes'
import type { ConversationSession } from '@/lib/conversation/conversationTypes'
import type { WorldModel } from '@/lib/cognitive-model/beliefTypes'
import { buildConversationContext } from '@/lib/conversation/conversationContext'
import { buildConversationEvidence } from '@/lib/conversation/conversationEvidence'
import { getConversationReasoner } from '@/lib/conversation/conversationEngine'
import { processAdaptiveAnswer } from '@/lib/conversation/conversationAdaptive'
import { newConversationId, nowISO } from '@/lib/conversation/conversationUtils'
import { buildCompactFounderContext } from './founderAI.context'
import type { CompactFounderContext, FounderAIResponse } from './founderAI.types'
import { validateFounderAIResponse } from './founderAI.validation'

export function buildDeterministicFounderAIResponse(params: {
  userMessage: string
  session: ConversationSession
  input: FounderInput
  userName: string
  worldModel: WorldModel
  userTurnId: string
  questionId?: string
}): { context: CompactFounderContext; response: FounderAIResponse } {
  const context = buildCompactFounderContext({
    userMessage: params.userMessage,
    session: params.session,
    input: params.input,
    userName: params.userName,
    worldModel: params.worldModel,
  })

  const ctx = buildConversationContext(params.input, params.userName)
  const reasoner = getConversationReasoner()
  const evidence = buildConversationEvidence(ctx, params.input)
  const { turn, adaptive } = reasoner.generateReply(
    ctx,
    params.session,
    params.userMessage,
    params.questionId,
    params.userTurnId,
  )

  const evidenceIds = turn.evidence.map((e) => e.id).slice(0, 6)
  const nextQuestion = adaptive.nextQuestion
    ? {
      text: adaptive.nextQuestion.title,
      purpose: adaptive.nextQuestion.reason,
      answerType: adaptive.nextQuestion.answerType === 'yes_no'
        ? 'yes_no' as const
        : 'open_text' as const,
      options: adaptive.nextQuestion.choices,
      targetBeliefId: undefined,
    }
    : undefined

  const beliefsToUpdate = (adaptive.beliefs ?? [])
    .filter((b) => b.updatedAt >= params.userTurnId || b.status === 'user_claimed')
    .slice(0, 3)
    .map((b) => ({
      proposition: `${b.label}: ${b.displayValue}`,
      operation: b.status === 'user_claimed' ? 'confirm' as const : 'update' as const,
      confidenceDelta: 5,
      rationale: 'Updated from conversation belief state',
      evidenceIds: b.evidenceIds.slice(0, 4),
    }))

  const suggestedActions = adaptive.actionCard
    ? [{
      id: adaptive.actionCard.id,
      type: 'create_sprint' as const,
      title: adaptive.actionCard.title,
      description: adaptive.actionCard.steps.join('; '),
      rationale: 'Validation sprint recommended from current evidence',
      confidence: params.session.confidence,
      domain: 'validation',
      reversible: true,
      requiresApproval: true as const,
      payload: { title: adaptive.actionCard.title, tasks: adaptive.actionCard.steps },
    }]
    : []

  const raw: FounderAIResponse = {
    message: turn.content,
    reasoningSummary: 'Used built-in deterministic reasoning because external AI was unavailable.',
    confidence: params.session.confidence,
    evidenceIds,
    beliefsToUpdate,
    contradictionsToCreate: [],
    nextQuestion,
    suggestedActions,
    memoryDrafts: [],
    knowledgeDrafts: [],
    usedDeterministicFallback: true,
  }

  return {
    context,
    response: {
      ...validateFounderAIResponse(raw, context),
      usedDeterministicFallback: true,
    },
  }
}

export function appendDeterministicNote(message: string): string {
  if (message.includes('deterministic')) return message
  return `${message}\n\n_Using built-in reasoning while external AI is unavailable._`
}

export function createUserTurn(content: string, session: ConversationSession, questionId?: string) {
  return {
    id: newConversationId(),
    role: 'user' as const,
    content,
    intent: 'reflect' as const,
    mood: 'calm' as const,
    topic: session.topic,
    evidence: [],
    questionId: questionId ?? session.activeQuestionId ?? session.nextQuestion?.id,
    createdAt: nowISO(),
  }
}

export function createAssistantTurnFromResponse(
  response: FounderAIResponse,
  session: ConversationSession,
  evidenceIds: string[],
  sessionEvidence: { id: string; title: string; summary: string; weight: number; supports: boolean; sourceType: string }[],
) {
  const evidence = sessionEvidence
    .filter((e) => evidenceIds.includes(e.id))
    .slice(0, 4)
    .map((e) => ({
      id: e.id,
      sourceType: e.sourceType as 'memory',
      title: e.title,
      summary: e.summary,
      weight: e.weight,
      supports: e.supports,
    }))

  return {
    id: newConversationId(),
    role: 'founder_ai' as const,
    content: response.usedDeterministicFallback
      ? appendDeterministicNote(response.message)
      : response.message,
    intent: 'question' as const,
    mood: 'strategic' as const,
    topic: session.topic,
    evidence,
    questionId: response.nextQuestion ? newConversationId() : undefined,
    createdAt: nowISO(),
  }
}
