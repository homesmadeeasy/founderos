import type { CaptureClassification } from './captureTypes'
import type { CCCaptureItem, CaptureType } from '@/lib/command-center/types'
import type { CreateObjectInput, FounderObjectType, LifeArea } from '@/lib/object-engine/objectTypes'

function classificationToObjectType(classification: CaptureClassification): FounderObjectType {
  const map: Partial<Record<CaptureClassification, FounderObjectType>> = {
    task: 'task',
    idea: 'idea',
    book: 'book',
    goal: 'goal',
    question: 'capture',
    memory: 'capture',
    reflection: 'note',
    decision: 'decision',
    person: 'person',
    meeting: 'event',
    meal: 'meal',
    workout: 'workout',
    note: 'note',
    unknown: 'capture',
  }
  return map[classification] ?? 'capture'
}

function classificationToCaptureType(classification: CaptureClassification): CaptureType {
  const map: Partial<Record<CaptureClassification, CaptureType>> = {
    task: 'task',
    idea: 'idea',
    decision: 'decision',
    question: 'question',
    note: 'note',
    reflection: 'note',
    memory: 'note',
  }
  return map[classification] ?? 'idea'
}

function inferArea(classification: CaptureClassification): LifeArea | undefined {
  if (['workout', 'meal'].includes(classification)) return 'health'
  if (['book', 'goal'].includes(classification)) return 'knowledge'
  if (['idea', 'decision', 'task'].includes(classification)) return 'systems'
  return undefined
}

export function buildObjectInputFromCapture(
  signalId: string,
  classification: CaptureClassification,
  title: string,
  content: string,
): CreateObjectInput {
  return {
    id: signalId,
    type: classificationToObjectType(classification),
    title: title.slice(0, 80) + (title.length > 80 ? '…' : ''),
    content,
    summary: content.length > 120 ? content.slice(0, 120) + '…' : content,
    area: inferArea(classification),
    status: 'inbox',
    priority: classification === 'task' || classification === 'decision' ? 'high' : 'medium',
    tags: ['capture', classification, 'universal-capture'],
    source: 'quick_capture',
    metadata: {
      captureClassification: classification,
      universalCapture: true,
      rawInput: content,
    },
  }
}

export function buildCommandCenterCapture(
  signalId: string,
  classification: CaptureClassification,
  content: string,
): CCCaptureItem {
  return {
    id: signalId,
    type: classificationToCaptureType(classification),
    content,
    status: 'inbox',
    createdAt: new Date().toISOString(),
  }
}

export function objectTypeForClassification(classification: CaptureClassification): FounderObjectType {
  return classificationToObjectType(classification)
}
