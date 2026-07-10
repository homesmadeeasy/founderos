import type { ConversationQuestionType } from './conversationTypes'

const SHORT_ANSWERS = new Set([
  'yes', 'no', 'maybe', 'later', 'tell me more', "i don't know", "i'm not sure", 'not sure',
])

function normalize(answer: string): string {
  return answer.trim().toLowerCase().replace(/maybe later/i, 'later')
}

export function isShortChipAnswer(answer: string): boolean {
  return SHORT_ANSWERS.has(normalize(answer))
}

export function confidenceDeltaForAdaptiveAnswer(
  answer: string,
  questionType: ConversationQuestionType | undefined,
  beliefKey?: string,
): number {
  const n = normalize(answer)

  if (n === 'yes' || n === 'no') return questionType === 'boolean' ? 3 : 2
  if (n === 'maybe' || n.includes("don't know") || n.includes('not sure')) return 0

  if (questionType === 'numeric') {
    if (/^\d+$/.test(answer.trim()) || n.includes('2-3') || n.includes('2–3') || n.includes('4-10')) return 5
    if (n.includes('more than 10')) return 6
  }

  if (answer.trim().length > 40) {
    if (beliefKey?.includes('confusion') || beliefKey?.includes('value')) return 8
    return 7
  }

  if (answer.trim().length > 20) return 5

  if (/pay|repeat|again|valuable|confus/i.test(answer)) {
    if (/pay|willing/i.test(answer)) return 12
    if (/again|repeat/i.test(answer)) return 10
    return 8
  }

  if (n === 'tell me more') return 1

  return 2
}
