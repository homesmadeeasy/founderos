import { newConversationId, nowISO } from '@/lib/conversation/conversationUtils'
import type { ActionProposal, ActionType } from './actionTypes'
import { ACTION_TYPE_DEFINITIONS } from './actionTypes'
import { buildActionPreview, buildActionTitle } from './actionProposal'

export function newActionId(): string {
  return newConversationId()
}

export function mapLegacyFounderType(type: string): ActionType {
  const map: Record<string, ActionType> = {
    create_task: 'TaskCreated',
    create_memory_draft: 'MemoryCreated',
    create_knowledge_draft: 'KnowledgeCreated',
    update_mission: 'MissionUpdated',
    create_sprint: 'ValidationLogged',
  }
  return (map[type] ?? type) as ActionType
}

export function createActionProposal(params: {
  type: ActionType
  payload: Record<string, unknown>
  title: string
  description: string
  rationale: string
  source: string
  sessionId?: string
  turnId?: string
}): ActionProposal {
  const def = ACTION_TYPE_DEFINITIONS[params.type]
  const preview = buildActionPreview(params.type, params.payload)
  return {
    id: newActionId(),
    type: params.type,
    title: params.title || buildActionTitle(params.type, params.payload),
    preview,
    description: params.description,
    rationale: params.rationale,
    payload: params.payload,
    status: 'pending',
    source: params.source,
    sessionId: params.sessionId,
    turnId: params.turnId,
    createdAt: nowISO(),
    requiresApproval: true,
    reversible: def?.reversible ?? false,
    affectedEngines: def?.affectedEngines ?? ['kernel'],
  }
}

export function extractWorkoutFromMessage(message: string): {
  exerciseName: string
  weight: number
  reps: number
  sets: number
} | null {
  const lower = message.toLowerCase()
  if (!/bench|squat|deadlift|press|curl|row|lift|kg|lb|reps?/i.test(message)) return null

  const weightMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilos?)/i)
    || message.match(/(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds?)/i)
  const repsMatch = message.match(/(?:for|×|x)\s*(\d+)\s*reps?/i)
    || message.match(/(\d+)\s*reps?/i)
  const setsMatch = message.match(/(\d+)\s*sets?/i)

  const weight = weightMatch ? parseFloat(weightMatch[1]) : 0
  const reps = repsMatch ? parseInt(repsMatch[1], 10) : 0
  if (reps < 1 && weight <= 0) return null

  let exerciseName = 'Exercise'
  if (/bench/i.test(lower)) exerciseName = 'Bench Press'
  else if (/squat/i.test(lower)) exerciseName = 'Barbell Squat'
  else if (/deadlift/i.test(lower)) exerciseName = 'Romanian Deadlift'
  else if (/overhead|ohp/i.test(lower)) exerciseName = 'Overhead Press'
  else if (/row/i.test(lower)) exerciseName = 'Barbell Row'
  else if (/curl/i.test(lower)) exerciseName = 'Barbell Curl'

  return {
    exerciseName,
    weight,
    reps: reps || 8,
    sets: setsMatch ? parseInt(setsMatch[1], 10) : 3,
  }
}
