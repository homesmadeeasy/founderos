import type {
  ConversationContext,
  ConversationQuestion,
  ConversationSession,
  ConversationTurn,
  ConversationActionCard,
} from './conversationTypes'
import { buildConversationEvidence } from './conversationEvidence'
import { answerFounderQuestion } from '@/lib/specialists/founder/founderQuestions'
import { VALIDATION_SPRINT_CARD } from './conversationActions'
import { newConversationId, nowISO, clampConfidence } from './conversationUtils'

const SHORT_ANSWERS = new Set([
  'yes', 'no', 'maybe', 'later', 'tell me more', "i don't know",
])

function normalize(answer: string): string {
  return answer.trim().toLowerCase()
}

function isShortAnswer(answer: string): boolean {
  return SHORT_ANSWERS.has(normalize(answer))
}

function findQuestion(session: ConversationSession, questionId?: string): ConversationQuestion | undefined {
  const id = questionId ?? session.nextQuestion?.id
  if (!id) return session.nextQuestion
  return session.activeQuestions.find(q => q.id === id)
    ?? session.nextQuestion
    ?? session.turns.find(t => t.followUpQuestion?.id === id)?.followUpQuestion
}

function followUp(
  id: string,
  topic: ConversationQuestion['topic'],
  title: string,
  reason: string,
  answerType: ConversationQuestion['answerType'] = 'paragraph',
): ConversationQuestion {
  return {
    id,
    topic,
    title,
    reason,
    importance: 'high',
    answerType,
    relatedObjectIds: [],
    relatedMemoryIds: [],
    relatedSignalIds: [],
    relatedDomains: ['founder', 'validation'],
    suggestion: 'ask_now',
    confidence: 80,
  }
}

function buildTurn(
  session: ConversationSession,
  content: string,
  ctx: ConversationContext,
  opts?: {
    questionId?: string
    intent?: ConversationTurn['intent']
    mood?: ConversationTurn['mood']
    followUpQuestion?: ConversationQuestion
    actionCard?: ConversationActionCard
    evidenceLimit?: number
  },
): ConversationTurn {
  const allEvidence = buildConversationEvidence(ctx)
  const evidence = allEvidence
    .sort((a, b) => b.weight - a.weight)
    .slice(0, opts?.evidenceLimit ?? 4)

  return {
    id: newConversationId(),
    role: 'founder_ai',
    content,
    intent: opts?.intent ?? 'recommend',
    mood: opts?.mood ?? 'direct',
    topic: session.topic,
    evidence,
    questionId: opts?.questionId,
    followUpQuestion: opts?.followUpQuestion,
    actionCard: opts?.actionCard,
    createdAt: nowISO(),
  }
}

function replyValidationUsers(
  ctx: ConversationContext,
  session: ConversationSession,
  answer: string,
  questionId?: string,
): ConversationTurn {
  const n = normalize(answer)
  const q = findQuestion(session, questionId)

  if (n === 'yes') {
    return buildTurn(session, [
      'You said real users have tested — I need the actual evidence before assuming validation is still weak.',
      'How many people tested it, and what did they say?',
    ].join('\n\n'), ctx, {
      questionId: q?.id,
      intent: 'question',
      mood: 'curious',
      followUpQuestion: followUp(
        'q-validation-evidence',
        'validation',
        'How many people tested FounderOS, and what did they say?',
        'Collecting validation evidence after Yes answer',
      ),
    })
  }

  if (n === 'no') {
    return buildTurn(session, [
      'Then validation is still an assumption.',
      'The highest-value next move is a small real-user test, not another feature.',
      'I can set up a focused validation sprint when you are ready.',
    ].join('\n\n'), ctx, {
      questionId: q?.id,
      intent: 'recommend',
      mood: 'strategic',
      actionCard: VALIDATION_SPRINT_CARD,
    })
  }

  if (n === 'maybe') {
    return buildTurn(session, [
      'Partial testing is useful, but it is not yet strong evidence.',
      'What was tested, and did the users understand the product without explanation?',
    ].join('\n\n'), ctx, {
      questionId: q?.id,
      intent: 'question',
      mood: 'curious',
      followUpQuestion: followUp(
        'q-validation-partial',
        'validation',
        'What was tested, and did users understand the product without explanation?',
        'Clarifying partial validation',
      ),
    })
  }

  if (n === 'later') {
    return buildTurn(session, [
      'Understood — we will defer validation for now.',
      `When you return, the bottleneck remains **${ctx.founderSnapshot.mainBottleneck}**.`,
      ctx.founderSnapshot.topRecommendation,
    ].join('\n\n'), ctx, { questionId: q?.id, mood: 'calm' })
  }

  if (n.includes("don't know")) {
    return buildTurn(session, [
      'That uncertainty is itself useful.',
      'FounderOS should make validation evidence visible.',
      "Let's identify the last real person who used it — even an informal walkthrough counts.",
    ].join('\n\n'), ctx, {
      questionId: q?.id,
      intent: 'question',
      followUpQuestion: followUp(
        'q-validation-last-user',
        'validation',
        'Who was the last real person to use FounderOS, and what happened?',
        'Identifying last validation touchpoint',
      ),
    })
  }

  if (n === 'tell me more') {
    const evidence = buildConversationEvidence(ctx)
    return buildTurn(session, [
      `Validation score is **${ctx.validationScore}** against architecture **${ctx.architectureScore}**.`,
      'Evidence:',
      ...evidence.slice(0, 5).map(e => `• ${e.title}: ${e.summary}`),
    ].join('\n\n'), ctx, { questionId: q?.id, intent: 'observe', evidenceLimit: 5 })
  }

  return buildTurn(session, answerFounderQuestion(ctx.founderSnapshot, answer), ctx, { questionId: q?.id })
}

function replyValidationInterviews(
  ctx: ConversationContext,
  session: ConversationSession,
  answer: string,
  questionId?: string,
): ConversationTurn {
  const n = normalize(answer)
  const q = findQuestion(session, questionId)

  if (n === 'yes') {
    return buildTurn(session, [
      "Good. I'll treat validation as this week's priority.",
      'The next move is not another feature. It is to test one complete experience with real people and record what they misunderstand, value, or ignore.',
    ].join('\n\n'), ctx, {
      questionId: q?.id,
      intent: 'recommend',
      mood: 'strategic',
      actionCard: VALIDATION_SPRINT_CARD,
    })
  }

  if (n === 'no' || n === 'later') {
    return buildTurn(session, [
      'Understood. Protecting focus elsewhere today.',
      `**Alternative:** ${ctx.founderSnapshot.ignoreToday[0] ?? 'Ship one small thing that moves the bottleneck.'}`,
    ].join('\n\n'), ctx, { questionId: q?.id, mood: 'calm' })
  }

  return replyValidationUsers(ctx, session, answer, questionId)
}

function replyGenericYesNo(
  ctx: ConversationContext,
  session: ConversationSession,
  answer: string,
  questionId?: string,
): ConversationTurn {
  const n = normalize(answer)
  const q = findQuestion(session, questionId)
  const questionText = q?.title ?? 'that question'
  const snap = ctx.founderSnapshot

  if (n === 'yes') {
    return buildTurn(session, [
      `You answered **Yes** to: "${questionText}"`,
      'I am updating my read — but I still need specifics before treating this as settled evidence.',
      'What exactly happened, and what should change in your plan because of it?',
    ].join('\n\n'), ctx, {
      questionId: q?.id,
      intent: 'question',
      mood: 'curious',
      followUpQuestion: followUp(
        `q-followup-${q?.id ?? 'generic'}`,
        q?.topic ?? session.topic,
        'What exactly happened, and what should change in your plan?',
        'Clarifying Yes answer',
      ),
    })
  }

  if (n === 'no') {
    return buildTurn(session, [
      `You answered **No** to: "${questionText}"`,
      `That reinforces **${snap.mainBottleneck}** as the constraint.`,
      snap.topRecommendation,
    ].join('\n\n'), ctx, { questionId: q?.id, mood: 'direct' })
  }

  if (n === 'maybe') {
    return buildTurn(session, [
      `Partial agreement on: "${questionText}"`,
      'What part is uncertain, and what would make this a clear Yes or No?',
    ].join('\n\n'), ctx, {
      questionId: q?.id,
      intent: 'question',
      followUpQuestion: followUp(
        `q-maybe-${q?.id ?? 'generic'}`,
        q?.topic ?? session.topic,
        'What part is uncertain, and what would make this a clear Yes or No?',
        'Clarifying Maybe answer',
      ),
    })
  }

  if (n === 'later') {
    return buildTurn(session, [
      'Deferred. I will surface this again when timing is better.',
      snap.ignoreToday[0] ? `For now: ${snap.ignoreToday[0]}` : snap.topRecommendation,
    ].join('\n\n'), ctx, { questionId: q?.id, mood: 'calm' })
  }

  if (n.includes("don't know")) {
    return buildTurn(session, [
      `Honest uncertainty about: "${questionText}"`,
      `Based on evidence, start with **${snap.mainBottleneck}**.`,
      snap.topRecommendation,
    ].join('\n\n'), ctx, { questionId: q?.id, mood: 'supportive' })
  }

  if (n === 'tell me more') {
    const evidence = buildConversationEvidence(ctx)
    return buildTurn(session, [
      snap.narrative,
      'Evidence:',
      ...evidence.slice(0, 4).map(e => `• ${e.title}: ${e.summary}`),
    ].join('\n\n'), ctx, { questionId: q?.id, intent: 'observe', evidenceLimit: 4 })
  }

  return buildTurn(session, answerFounderQuestion(snap, answer), ctx, { questionId: q?.id })
}

export function generateContextualReply(
  ctx: ConversationContext,
  session: ConversationSession,
  answer: string,
  questionId?: string,
): ConversationTurn {
  const qId = questionId ?? session.nextQuestion?.id

  if (qId === 'q-validation-users') {
    return replyValidationUsers(ctx, session, answer, questionId)
  }
  if (qId === 'q-validation-interviews') {
    return replyValidationInterviews(ctx, session, answer, questionId)
  }

  if (isShortAnswer(answer) && session.nextQuestion?.answerType === 'yes_no') {
    return replyGenericYesNo(ctx, session, answer, questionId)
  }

  const q = findQuestion(session, questionId)
  const snap = ctx.founderSnapshot

  const isSuggestedQuestion = /^(what|am i|how|why|should)/i.test(answer.trim()) || answer.includes('?')
  if (isSuggestedQuestion && answer.trim().length > 8) {
    return buildTurn(session, answerFounderQuestion(snap, answer), ctx, {
      questionId: q?.id,
      intent: 'recommend',
      mood: 'strategic',
    })
  }

  if (!isShortAnswer(answer) && answer.trim().length > 24) {
    return buildTurn(session, [
      'That is useful — I am treating this as real evidence.',
      answerFounderQuestion(snap, `Given: ${answer.slice(0, 120)}. What is the next move?`),
    ].join('\n\n'), ctx, {
      questionId: q?.id,
      intent: 'recommend',
      mood: 'strategic',
    })
  }

  return replyGenericYesNo(ctx, session, answer, questionId)
}

export function confidenceDeltaForAnswer(answer: string, hadFollowUp: boolean): number {
  const n = normalize(answer)
  if (isShortAnswer(answer)) return hadFollowUp ? 2 : 1
  if (answer.trim().length > 40) return 8
  if (answer.trim().length > 15) return 5
  if (n === 'yes' || n === 'no') return 2
  return 3
}
