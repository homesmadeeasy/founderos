import type {
  ConversationQuestion,
  ConversationSuggestion,
  ConversationSuggestionAction,
  ConversationContext,
} from './conversationTypes'
import { newConversationId, clampConfidence } from './conversationUtils'

function suggestionFor(
  importance: ConversationQuestion['importance'],
  ctx: ConversationContext,
  questionId: string,
): ConversationSuggestion {
  let action: ConversationSuggestionAction = 'ask_now'
  let reason = 'Relevant to current state'
  let confidence = 70

  if (ctx.answeredToday.includes(questionId)) {
    action = 'already_answered'
    reason = 'Already discussed today'
    confidence = 95
  } else if (ctx.recentQuestionIds.includes(questionId)) {
    action = 'ask_tomorrow'
    reason = 'Asked recently — wait before repeating'
    confidence = 60
  } else if (importance === 'low') {
    action = 'ask_tonight'
    reason = 'Lower priority — can defer to evening'
    confidence = 45
  } else if (ctx.hour >= 20) {
    action = 'ask_tonight'
    reason = 'Better suited for evening reflection'
    confidence = 55
  }

  return {
    id: newConversationId(),
    questionId,
    action,
    reason,
    confidence: clampConfidence(confidence),
  }
}

export function evaluateQuestionSuggestion(
  question: ConversationQuestion,
  ctx: ConversationContext,
): ConversationSuggestion {
  return suggestionFor(question.importance, ctx, question.id)
}

export function filterAskableQuestions(
  questions: ConversationQuestion[],
  ctx: ConversationContext,
): ConversationQuestion[] {
  return questions
    .map(q => ({ ...q, suggestion: evaluateQuestionSuggestion(q, ctx).action }))
    .filter(q =>
      q.suggestion === 'ask_now'
      || (q.suggestion === 'ask_tonight' && ctx.hour >= 17),
    )
    .sort((a, b) => {
      const imp = { critical: 4, high: 3, medium: 2, low: 1 }
      return imp[b.importance] - imp[a.importance]
    })
}

export function generateConversationQuestions(ctx: ConversationContext): ConversationQuestion[] {
  const snap = ctx.founderSnapshot
  const questions: ConversationQuestion[] = []

  if (ctx.recoveryScore < 60) {
    const id = 'q-morning-recovery'
    questions.push({
      id,
      topic: 'health',
      title: 'I noticed your recovery is low. Should we reduce workload today?',
      reason: `Recovery indicators suggest lighter day (score ~${ctx.recoveryScore})`,
      importance: 'high',
      answerType: 'yes_no',
      relatedObjectIds: [],
      relatedMemoryIds: [],
      relatedSignalIds: [],
      relatedDomains: ['health'],
      suggestion: 'ask_now',
      confidence: 78,
    })
  }

  if (snap.architectureScore > 65 && snap.validationScore < 45) {
    const id = 'q-validation-users'
    questions.push({
      id,
      topic: 'validation',
      title: "You've built many features recently. Have real users tested any of them?",
      reason: `Architecture ${snap.architectureScore} vs validation ${snap.validationScore}`,
      importance: 'critical',
      answerType: 'yes_no',
      relatedObjectIds: [],
      relatedMemoryIds: [],
      relatedSignalIds: [],
      relatedDomains: ['founder'],
      suggestion: 'ask_now',
      confidence: 88,
    })
  }

  {
    const id = 'q-founder-obstacle'
    questions.push({
      id,
      topic: 'founder',
      title: 'What is the single biggest obstacle stopping FounderOS?',
      reason: `Current bottleneck: ${snap.mainBottleneck}`,
      importance: 'high',
      answerType: 'paragraph',
      relatedObjectIds: [],
      relatedMemoryIds: [],
      relatedSignalIds: [],
      relatedDomains: ['founder'],
      suggestion: 'ask_now',
      confidence: 82,
    })
  }

  if (snap.executionScore < 55) {
    const id = 'q-execution-ship'
    questions.push({
      id,
      topic: 'execution',
      title: 'You completed planning. Did you actually ship anything?',
      reason: `Execution score ${snap.executionScore}`,
      importance: 'high',
      answerType: 'yes_no',
      relatedObjectIds: [],
      relatedMemoryIds: [],
      relatedSignalIds: [],
      relatedDomains: ['founder'],
      suggestion: 'ask_now',
      confidence: 75,
    })
  }

  if (ctx.schoolPressure) {
    const id = 'q-school-prepared'
    questions.push({
      id,
      topic: 'school',
      title: 'You have exams approaching. Do you feel prepared?',
      reason: 'School domain is elevated today',
      importance: 'high',
      answerType: 'yes_no',
      relatedObjectIds: [],
      relatedMemoryIds: [],
      relatedSignalIds: [],
      relatedDomains: ['school'],
      suggestion: 'ask_now',
      confidence: 80,
    })
  }

  if (ctx.healthSlipping) {
    const id = 'q-health-recovery'
    questions.push({
      id,
      topic: 'health',
      title: 'You skipped workouts twice. Is recovery the issue?',
      reason: 'Health domain needs attention',
      importance: 'medium',
      answerType: 'yes_no',
      relatedObjectIds: [],
      relatedMemoryIds: [],
      relatedSignalIds: [],
      relatedDomains: ['health'],
      suggestion: 'ask_now',
      confidence: 68,
    })
  }

  if (ctx.hour >= 18) {
    const id = 'q-reflection-surprise'
    questions.push({
      id,
      topic: 'reflection',
      title: 'What surprised you today?',
      reason: 'Evening reflection window',
      importance: 'medium',
      answerType: 'paragraph',
      relatedObjectIds: [],
      relatedMemoryIds: [],
      relatedSignalIds: [],
      relatedDomains: ['reflection'],
      suggestion: 'ask_tonight',
      confidence: 65,
    })
  }

  const id = 'q-validation-interviews'
  if (snap.mainBottleneck === 'Validation' || snap.mainBottleneck === 'Overengineering') {
    questions.push({
      id,
      topic: 'validation',
      title: 'Should we spend ten minutes planning user interviews?',
      reason: snap.mainInsight,
      importance: 'critical',
      answerType: 'yes_no',
      relatedObjectIds: [],
      relatedMemoryIds: [],
      relatedSignalIds: [],
      relatedDomains: ['founder', 'validation'],
      suggestion: 'ask_now',
      confidence: 90,
    })
  }

  return filterAskableQuestions(questions, ctx).map(q => ({
    ...q,
    suggestion: evaluateQuestionSuggestion(q, ctx).action,
  }))
}
