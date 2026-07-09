import type { ConversationSuggestion, ConversationQuestion, ConversationContext } from './conversationTypes'
import { evaluateQuestionSuggestion } from './conversationQuestions'

export function buildSuggestionsForQuestions(
  questions: ConversationQuestion[],
  ctx: ConversationContext,
): ConversationSuggestion[] {
  return questions.map(q => evaluateQuestionSuggestion(q, ctx))
}

export function shouldAskNow(suggestion: ConversationSuggestion): boolean {
  return suggestion.action === 'ask_now'
}

export function shouldDeferToEvening(suggestion: ConversationSuggestion): boolean {
  return suggestion.action === 'ask_tonight'
}

export function isIgnorable(suggestion: ConversationSuggestion): boolean {
  return suggestion.action === 'ignore' || suggestion.action === 'already_answered'
}
