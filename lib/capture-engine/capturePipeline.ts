import { loadCommandCenterState, saveCommandCenterState } from '@/lib/command-center/storage'
import { createObject as storageCreateObject } from '@/lib/object-engine/objectStorage'
import { classifyCapture } from './captureClassifier'
import { buildMemoryFromCapture } from './captureMemoryBridge'
import {
  buildCommandCenterCapture,
  buildObjectInputFromCapture,
  objectTypeForClassification,
} from './captureObjectBridge'
import { parseCaptureInput } from './captureParser'
import { saveSignal } from './captureStorage'
import { createCaptureSignal, shouldCreateObject } from './captureSignals'
import {
  isRepeatedMemoryPattern,
  shouldSuggestKnowledge,
  suggestKnowledgeFromCapture,
} from './captureSuggestions'
import type {
  CapturePipelineDeps,
  CapturePipelineInput,
  CaptureResult,
} from './captureTypes'
import { CAPTURE_CLASSIFICATION_LABEL } from './captureTypes'

function syncToCommandCenter(signalId: string, classification: ReturnType<typeof classifyCapture>['classification'], content: string) {
  const state = loadCommandCenterState()
  const item = buildCommandCenterCapture(signalId, classification, content)
  saveCommandCenterState({
    ...state,
    captureItems: [item, ...state.captureItems.filter(c => c.id !== signalId)].slice(0, 200),
  })
}

export function runCapturePipeline(
  input: CapturePipelineInput,
  deps: CapturePipelineDeps,
): CaptureResult {
  const parsed = parseCaptureInput(input.rawInput)
  const classification = classifyCapture(parsed)
  let signal = createCaptureSignal(input.rawInput, input.source ?? 'manual')

  signal = {
    ...signal,
    classification: classification.classification,
    confidence: classification.confidence,
    possibleActions: classification.possibleActions,
    status: classification.classification === 'question' ? 'needs_review' : 'new',
    parsedTitle: parsed.title,
    parsedContent: parsed.content,
  }

  let objectCreated = false
  let objectId: string | undefined
  let memoryCreated = false
  let memoryId: string | undefined
  let knowledgeSuggestion = null as CaptureResult['knowledgeSuggestion']

  const needsObject = shouldCreateObject(classification.classification)

  if (needsObject) {
    const objectInput = buildObjectInputFromCapture(
      signal.id,
      classification.classification,
      parsed.title,
      parsed.content,
    )
    const created = deps.createObjectSync(objectInput)
    objectCreated = true
    objectId = created.id
    signal.createdObjectId = created.id
  }

  const memInput = buildMemoryFromCapture(
    signal.id,
    classification.classification,
    parsed.content,
    classification.confidence,
  )
  const memory = deps.recordMemory(memInput)
  if (memory) {
    memoryCreated = true
    memoryId = memory.id
    signal.createdMemoryId = memory.id
  }

  if (
    shouldSuggestKnowledge(classification.classification)
    || isRepeatedMemoryPattern(parsed.content, classification.classification, deps.memories)
  ) {
    knowledgeSuggestion = suggestKnowledgeFromCapture(
      memory,
      classification.classification,
      deps.memories,
    )
    signal.knowledgeSuggestionPending = !!knowledgeSuggestion
  }

  signal.processed = true
  signal.status = knowledgeSuggestion ? 'needs_review' : 'processed'
  saveSignal(signal)

  syncToCommandCenter(signal.id, classification.classification, parsed.content)
  deps.syncCommandCenterCapture?.(buildCommandCenterCapture(signal.id, classification.classification, parsed.content))

  const objectType = objectCreated ? objectTypeForClassification(classification.classification) : undefined
  const typeLabel = CAPTURE_CLASSIFICATION_LABEL[classification.classification]

  const message = [
    '✓ Captured',
    `Type: ${typeLabel}`,
    objectCreated ? `Object created (${objectType})` : null,
    memoryCreated ? 'Memory created' : null,
    knowledgeSuggestion ? 'Knowledge suggestion: Pending' : null,
  ].filter(Boolean).join('\n')

  return {
    signal,
    classification: classification.classification,
    confidence: classification.confidence,
    objectCreated,
    objectId,
    objectType,
    memoryCreated,
    memoryId,
    knowledgeSuggestion,
    message,
  }
}
