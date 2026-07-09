import type { CaptureClassification, ParsedCapture } from './captureTypes'

const PREFIX_PATTERN = /^(task|idea|book|goal|question|memory|reflection|decision|person|meeting|meal|workout|note)\s*:\s*/i

const PREFIX_MAP: Record<string, CaptureClassification> = {
  task: 'task',
  idea: 'idea',
  book: 'book',
  goal: 'goal',
  question: 'question',
  memory: 'memory',
  reflection: 'reflection',
  decision: 'decision',
  person: 'person',
  meeting: 'meeting',
  meal: 'meal',
  workout: 'workout',
  note: 'note',
}

export function parseCaptureInput(rawInput: string): ParsedCapture {
  const trimmed = rawInput.trim()
  const match = trimmed.match(PREFIX_PATTERN)

  if (match) {
    const key = match[1].toLowerCase()
    const content = trimmed.slice(match[0].length).trim()
    return {
      rawInput: trimmed,
      title: content.slice(0, 80) || trimmed.slice(0, 80),
      content: content || trimmed,
      explicitPrefix: PREFIX_MAP[key],
    }
  }

  return {
    rawInput: trimmed,
    title: trimmed.slice(0, 80),
    content: trimmed,
  }
}

export function hasExplicitPrefix(rawInput: string): boolean {
  return PREFIX_PATTERN.test(rawInput.trim())
}
