import type { CaptureResult } from '@/lib/capture-engine/captureTypes'

export function buildCaptureCreatedPayload(result: CaptureResult) {
  return {
    captureId: result.signal.id,
    signalId: result.signal.id,
    classification: result.classification,
    objectId: result.objectId,
    memoryId: result.memoryId,
    capture: {
      id: result.signal.id,
      rawInput: result.signal.rawInput,
      parsedTitle: result.signal.parsedTitle,
      parsedContent: result.signal.parsedContent,
      classification: result.signal.classification,
      createdObjectId: result.objectId,
      createdMemoryId: result.memoryId,
    },
  }
}
