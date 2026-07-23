import type { RecordRealityEventInput } from './RealityTypes'

export function validateRecordEventInput(input: RecordRealityEventInput): string | null {
  if (!input.domain) return 'domain is required'
  if (!input.eventType?.trim()) return 'eventType is required'
  if (!input.title?.trim()) return 'title is required'
  if (!input.source?.kind || !input.source?.label) return 'source.kind and source.label are required'
  if (input.importance !== undefined && (input.importance < 0 || input.importance > 1)) {
    return 'importance must be between 0 and 1'
  }
  if (input.confidence !== undefined && (input.confidence < 0 || input.confidence > 1)) {
    return 'confidence must be between 0 and 1'
  }
  return null
}
