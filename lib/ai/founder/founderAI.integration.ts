import type { FounderInput } from '@/lib/specialists/founder/founderTypes'
import type { ConversationSession } from '@/lib/conversation/conversationTypes'
import type { WorldModel } from '@/lib/cognitive-model/beliefTypes'
import { submitAnswer } from '@/lib/conversation/conversationEngine'
import { upsertSession, saveConversationStore, loadConversationStore, addTimelineEntry } from '@/lib/conversation/conversationSession'
import { newConversationId, nowISO, clampConfidence } from '@/lib/conversation/conversationUtils'
import { buildCompactFounderContext } from './founderAI.context'
import { buildDeterministicFounderAIResponse, createAssistantTurnFromResponse, createUserTurn } from './founderAI.fallback'
import { requestFounderAI } from './founderAI.client'
import { upsertProposal } from './founderAI.proposals'
import type { FounderAIResponseMode, FounderProposalBundle, FounderReasoningMode } from './founderAI.types'
import { isFounderAILlmEnabled } from './founderAI.prefs'

export interface ProcessFounderMessageInput {
  sessionId: string
  answer: string
  questionId?: string
  founderInput: FounderInput
  userName: string
  worldModel: WorldModel
  llmEnabled?: boolean
}

export interface ProcessFounderMessageResult {
  session: ConversationSession
  mode: FounderAIResponseMode
  reasoningMode: FounderReasoningMode
  proposal?: FounderProposalBundle
  usedFallback: boolean
}

function shouldUseLlmPath(session: ConversationSession, llmEnabled: boolean): boolean {
  return llmEnabled && session.topic === 'founder'
}

function applyTrackedQuestionFromResponse(
  session: ConversationSession,
  response: { nextQuestion?: { text: string; answerType: string; options?: string[] } },
): ConversationSession {
  if (!response.nextQuestion) return session
  const qId = newConversationId()
  return {
    ...session,
    activeQuestionId: qId,
    trackedQuestions: [
      ...(session.trackedQuestions ?? []),
      {
        id: qId,
        topic: session.topic,
        questionType: response.nextQuestion.answerType === 'yes_no' ? 'boolean' : 'open_text',
        text: response.nextQuestion.text,
        answerOptions: response.nextQuestion.options ?? [],
        status: 'unanswered',
        askedAt: nowISO(),
        evidenceRequired: true,
      },
    ],
    nextQuestion: {
      id: qId,
      topic: session.topic,
      title: response.nextQuestion.text,
      reason: 'Follow-up from Founder AI',
      importance: 'high',
      answerType: response.nextQuestion.answerType === 'yes_no' ? 'yes_no' : 'short_text',
      choices: response.nextQuestion.options,
      relatedObjectIds: [],
      relatedMemoryIds: [],
      relatedSignalIds: [],
      relatedDomains: [session.topic],
      suggestion: 'ask_now',
      confidence: 75,
    },
  }
}

function persistSession(session: ConversationSession, detail: string): ConversationSession {
  let store = loadConversationStore()
  store = upsertSession(store, session)
  store = addTimelineEntry(store, {
    sessionId: session.id,
    type: 'answer',
    title: 'founder-ai-reply',
    detail: detail.slice(0, 200),
    relatedIds: [session.id],
  })
  saveConversationStore(store)
  return session
}

export async function processFounderAIMessage(
  input: ProcessFounderMessageInput,
): Promise<ProcessFounderMessageResult> {
  const store = loadConversationStore()
  const session = store.sessions.find((s) => s.id === input.sessionId)
  if (!session || session.status !== 'active') {
    throw new Error('Active conversation session not found.')
  }

  const llmEnabled = input.llmEnabled ?? isFounderAILlmEnabled()
  const userTurn = createUserTurn(input.answer, session, input.questionId)
  let working: ConversationSession = {
    ...session,
    turns: [...session.turns, userTurn],
    updatedAt: nowISO(),
  }

  if (!shouldUseLlmPath(session, llmEnabled)) {
    const deterministic = submitAnswer(
      { sessionId: input.sessionId, answer: input.answer, questionId: input.questionId },
      input.founderInput,
      input.userName,
    )
    if (!deterministic) throw new Error('Failed to process message.')
    return {
      session: deterministic.session,
      mode: 'deterministic',
      reasoningMode: 'deterministic',
      usedFallback: true,
    }
  }

  const context = buildCompactFounderContext({
    userMessage: input.answer,
    session: working,
    input: input.founderInput,
    userName: input.userName,
    worldModel: input.worldModel,
  })

  try {
    const envelope = await requestFounderAI({
      context,
      sessionId: session.id,
      turnId: userTurn.id,
    })

    const assistantTurn = createAssistantTurnFromResponse(
      envelope.response,
      working,
      envelope.response.evidenceIds,
      context.evidence.map((e) => ({ ...e, sourceType: e.sourceType })),
    )

    let updated: ConversationSession = {
      ...working,
      turns: [...working.turns, assistantTurn],
      confidence: clampConfidence(envelope.response.confidence),
      updatedAt: nowISO(),
    }
    updated = applyTrackedQuestionFromResponse(updated, envelope.response)
    updated = persistSession(updated, envelope.response.message)

    const proposal: FounderProposalBundle = {
      id: newConversationId(),
      turnId: assistantTurn.id,
      sessionId: session.id,
      createdAt: nowISO(),
      status: 'pending',
      mode: envelope.mode,
      response: envelope.response,
    }
    upsertProposal(proposal)

    return {
      session: updated,
      mode: envelope.mode,
      reasoningMode: envelope.mode === 'llm' ? 'llm' : 'deterministic',
      proposal,
      usedFallback: envelope.mode === 'deterministic',
    }
  } catch {
    const { response } = buildDeterministicFounderAIResponse({
      userMessage: input.answer,
      session: working,
      input: input.founderInput,
      userName: input.userName,
      worldModel: input.worldModel,
      userTurnId: userTurn.id,
      questionId: input.questionId,
    })

    const assistantTurn = createAssistantTurnFromResponse(
      response,
      working,
      response.evidenceIds,
      context.evidence.map((e) => ({ ...e, sourceType: e.sourceType })),
    )

    let updated: ConversationSession = {
      ...working,
      turns: [...working.turns, assistantTurn],
      confidence: clampConfidence(response.confidence),
      updatedAt: nowISO(),
    }
    updated = applyTrackedQuestionFromResponse(updated, response)
    updated = persistSession(updated, response.message)

    const proposal: FounderProposalBundle = {
      id: newConversationId(),
      turnId: assistantTurn.id,
      sessionId: session.id,
      createdAt: nowISO(),
      status: 'pending',
      mode: 'deterministic',
      response,
    }
    upsertProposal(proposal)

    return {
      session: updated,
      mode: 'deterministic',
      reasoningMode: 'deterministic',
      proposal,
      usedFallback: true,
    }
  }
}
