import type { FounderInput } from '@/lib/specialists/founder/founderTypes'
import type { ConversationSession } from '@/lib/conversation/conversationTypes'
import type { WorldModel } from '@/lib/cognitive-model/beliefTypes'
import type { ReconciliationResult } from '@/lib/cognitive-model/realityTypes'
import { buildCompactFounderContext } from './founderAI.context'
import type { CompactFounderContext, FounderAIResponse } from './founderAI.types'
import { validateFounderAIResponse } from './founderAI.validation'
import { newConversationId, nowISO } from '@/lib/conversation/conversationUtils'
import { extractWorkoutFromMessage } from '@/lib/action-engine/actionUtils'
import { buildActionPreview, buildActionTitle } from '@/lib/action-engine/actionProposal'
import type { ProposedAction } from './founderAI.types'

export function buildDeterministicFounderAIResponse(params: {
  userMessage: string
  session: ConversationSession
  input: FounderInput
  userName: string
  worldModel: WorldModel
  userTurnId: string
  questionId?: string
  reconciliation?: ReconciliationResult
}): { context: CompactFounderContext; response: FounderAIResponse } {
  const context = buildCompactFounderContext({
    userMessage: params.userMessage,
    session: params.session,
    input: params.input,
    userName: params.userName,
    worldModel: params.worldModel,
  })

  const reconciliation = params.reconciliation

  const beliefsToUpdate = (reconciliation?.changes ?? []).slice(0, 4).map(c => ({
    beliefId: c.beliefId,
    proposition: c.newStatement,
    operation: 'update' as const,
    confidenceDelta: c.newConfidence - c.previousConfidence,
    rationale: c.reason,
    evidenceIds: c.evidenceIds.slice(0, 4),
  }))

  const suggestedActions: ProposedAction[] = []
  const workout = extractWorkoutFromMessage(params.userMessage)
  if (workout) {
    suggestedActions.push({
      id: newConversationId(),
      type: 'WorkoutLogged',
      title: buildActionTitle('WorkoutLogged', workout),
      description: buildActionPreview('WorkoutLogged', workout),
      rationale: 'Parsed workout from your message. Approve to log volume, progression, and recovery updates.',
      confidence: 85,
      domain: 'health',
      reversible: true,
      requiresApproval: true,
      payload: workout,
    })
  }

  const message = reconciliation?.responseMessage
    || (workout
      ? 'I parsed your workout. Review the action proposal below and approve to log it across FounderOS.'
      : 'I need a bit more detail before updating my view.')

  const nextQuestion = reconciliation?.nextQuestion
    ? {
      text: reconciliation.nextQuestion,
      purpose: reconciliation.nextQuestionPurpose,
      answerType: 'open_text' as const,
      options: undefined,
      targetBeliefId: undefined,
    }
    : undefined

  const raw: FounderAIResponse = {
    message,
    reasoningSummary: reconciliation?.reasoningSummary
      ?? 'Used built-in deterministic reasoning because external AI was unavailable.',
    confidence: params.session.confidence,
    evidenceIds: reconciliation?.changes.flatMap(c => c.evidenceIds).slice(0, 6) ?? [],
    beliefsToUpdate,
    contradictionsToCreate: [],
    nextQuestion,
    suggestedActions,
    memoryDrafts: [],
    knowledgeDrafts: [],
    usedDeterministicFallback: true,
    extractedClaims: reconciliation?.claims.map(c => ({
      predicate: c.predicate,
      value: c.value,
      confidence: c.confidence,
    })),
    proposedBeliefChanges: reconciliation?.changes.map(c => ({
      beliefId: c.beliefId,
      previous: c.previousStatement,
      next: c.newStatement,
    })),
    hypotheses: reconciliation?.hypotheses.map(h => h.statement),
    unknowns: reconciliation?.unknowns.map(u => u.statement),
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
