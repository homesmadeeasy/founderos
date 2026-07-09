import type { CaptureClassification, CaptureSignal, CaptureSource } from './captureTypes'
import { classifyCapture } from './captureClassifier'
import { parseCaptureInput } from './captureParser'
import { newCaptureId, nowISO } from './captureUtils'

export function createCaptureSignal(
  rawInput: string,
  source: CaptureSource = 'manual',
): CaptureSignal {
  const parsed = parseCaptureInput(rawInput)
  const classification = classifyCapture(parsed)

  return {
    id: newCaptureId('signal'),
    rawInput: parsed.rawInput,
    source,
    timestamp: nowISO(),
    processed: false,
    classification: classification.classification,
    confidence: classification.confidence,
    possibleActions: classification.possibleActions,
    knowledgeSuggestionPending: false,
    status: classification.classification === 'question' ? 'needs_review' : 'new',
    parsedTitle: parsed.title,
    parsedContent: parsed.content,
  }
}

export function shouldCreateObject(classification: CaptureClassification): boolean {
  return classification !== 'memory' && classification !== 'unknown'
}
