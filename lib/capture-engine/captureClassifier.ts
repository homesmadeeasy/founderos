import type { CaptureClassification, CaptureConfidence, ClassificationResult, ParsedCapture } from './captureTypes'

const QUESTION_STARTERS = ['should ', 'what ', 'how ', 'why ', 'when ', 'where ', 'who ', 'is ', 'are ', 'can ', 'could ', 'would ']
const REFLECTION_MARKERS = ['i felt', 'i procrastinated', 'today i', 'i learned', 'i noticed', 'i realized']
const MEMORY_MARKERS = ['felt amazing', 'felt exhausted', 'felt tired', 'remember that', 'note to self']
const WORKOUT_MARKERS = ['bench', 'squat', 'deadlift', 'kg', 'reps', 'x5', 'x8', 'workout', 'training']
const MEAL_MARKERS = ['chicken', 'rice', 'meal', 'ate', 'breakfast', 'lunch', 'dinner', 'protein']
const MEETING_MARKERS = ['meeting', 'call with', 'review', 'sync', 'standup']
const BOOK_MARKERS = ['atomic habits', 'deep work', 'book:', 'reading ']
const DECISION_MARKERS = ['should support', 'we should', 'decided', 'decision:', 'must support', 'will support']

export function classifyCapture(parsed: ParsedCapture): ClassificationResult {
  if (parsed.explicitPrefix) {
    return {
      classification: parsed.explicitPrefix,
      confidence: 'high',
      possibleActions: defaultActions(parsed.explicitPrefix),
      reason: `Explicit prefix: ${parsed.explicitPrefix}`,
    }
  }

  const lower = parsed.content.toLowerCase()

  if (lower.startsWith('call ') || /^call\s+\w+/i.test(parsed.content)) {
    return result('task', 'high', 'Starts with "call" — likely a task.')
  }

  if (QUESTION_STARTERS.some(q => lower.startsWith(q)) || lower.endsWith('?')) {
    return result('question', 'medium', 'Question pattern detected.')
  }

  if (DECISION_MARKERS.some(m => lower.includes(m))) {
    return result('decision', 'medium', 'Decision language detected.')
  }

  if (REFLECTION_MARKERS.some(m => lower.includes(m))) {
    return result('reflection', 'medium', 'Reflection language detected.')
  }

  if (MEMORY_MARKERS.some(m => lower.includes(m))) {
    return result('memory', 'medium', 'Memory/feeling language detected.')
  }

  if (WORKOUT_MARKERS.some(m => lower.includes(m))) {
    return result('workout', 'medium', 'Workout pattern detected.')
  }

  if (MEAL_MARKERS.some(m => lower.includes(m))) {
    return result('meal', 'low', 'Meal pattern detected.')
  }

  if (MEETING_MARKERS.some(m => lower.includes(m))) {
    return result('meeting', 'medium', 'Meeting pattern detected.')
  }

  if (BOOK_MARKERS.some(m => lower.includes(m))) {
    return result('book', 'medium', 'Book pattern detected.')
  }

  if (lower.includes('reach ') && (lower.includes('kg') || lower.includes('lean') || lower.includes('goal'))) {
    return result('goal', 'medium', 'Goal language detected.')
  }

  if (lower.startsWith('build ') || lower.includes(' forecasting') || lower.includes(' ai ')) {
    return result('idea', 'medium', 'Product/build language suggests idea.')
  }

  if (parsed.content.length < 60) {
    return result('note', 'low', 'Short input defaulting to note.')
  }

  return result('note', 'low', 'No strong pattern — captured as note.')
}

function result(
  classification: CaptureClassification,
  confidence: CaptureConfidence,
  reason: string,
): ClassificationResult {
  return {
    classification,
    confidence,
    possibleActions: defaultActions(classification),
    reason,
  }
}

function defaultActions(classification: CaptureClassification): string[] {
  switch (classification) {
    case 'task':
      return ['create_object', 'create_memory', 'add_inbox']
    case 'idea':
      return ['create_object', 'create_memory', 'add_inbox', 'executive_review']
    case 'decision':
      return ['create_object', 'create_memory', 'suggest_knowledge', 'add_inbox']
    case 'reflection':
    case 'memory':
      return ['create_memory', 'suggest_knowledge', 'add_inbox']
    case 'question':
      return ['create_object', 'create_memory', 'add_inbox', 'needs_review']
    case 'goal':
    case 'book':
    case 'person':
    case 'meeting':
    case 'meal':
    case 'workout':
      return ['create_object', 'create_memory', 'add_inbox']
    default:
      return ['create_memory', 'add_inbox']
  }
}
