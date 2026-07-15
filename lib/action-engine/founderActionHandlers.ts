import { registerActionHandler } from './actionRegistry'
import type { ActionExecutionContext, ActionExecutionResult } from './actionTypes'
import { mapLegacyFounderType } from './actionUtils'

async function handleMemoryCreated(
  payload: Record<string, unknown>,
  ctx: ActionExecutionContext,
  meta?: { proposalId: string; source: string },
): Promise<ActionExecutionResult> {
  const memory = ctx.recordMemory({
    type: String(payload.type ?? 'conversation'),
    title: String(payload.title),
    content: String(payload.content),
    importance: 'medium',
    area: String(payload.area ?? 'systems'),
    source: 'assistant',
    relatedObjectIds: [],
    tags: Array.isArray(payload.tags) ? payload.tags : ['action-engine'],
  })
  if (memory?.id) {
    await ctx.publish({
      type: 'MemoryCreated',
      source: meta?.source ?? 'action-engine',
      payload: { memoryId: memory.id, title: payload.title },
    })
  }
  return {
    success: Boolean(memory),
    actionId: meta?.proposalId ?? '',
    type: 'MemoryCreated',
    createdIds: { memoryId: memory?.id ?? '' },
    error: memory ? undefined : 'Failed to create memory',
  }
}

async function handleKnowledgeCreated(
  payload: Record<string, unknown>,
  ctx: ActionExecutionContext,
  meta?: { proposalId: string; source: string },
): Promise<ActionExecutionResult> {
  const result = await ctx.createKnowledge({
    title: String(payload.title),
    principle: String(payload.principle),
    domain: String(payload.domain ?? 'founder'),
    source: 'assistant',
    tags: ['action-engine'],
  })
  if (result?.id) {
    await ctx.publish({
      type: 'KnowledgeCreated',
      source: meta?.source ?? 'action-engine',
      payload: { knowledgeId: result.id, title: payload.title },
    })
  }
  return {
    success: Boolean(result?.id),
    actionId: meta?.proposalId ?? '',
    type: 'KnowledgeCreated',
    createdIds: { knowledgeId: result?.id ?? '' },
  }
}

async function handleTaskCreated(
  payload: Record<string, unknown>,
  ctx: ActionExecutionContext,
  meta?: { proposalId: string; source: string },
): Promise<ActionExecutionResult> {
  await ctx.addTask({
    title: String(payload.title),
    description: String(payload.description ?? ''),
    priority: (payload.priority as 'low' | 'medium' | 'high') ?? 'medium',
    status: 'todo',
    dueDate: typeof payload.dueDate === 'string' ? payload.dueDate : undefined,
    projectId: typeof payload.projectId === 'string' ? payload.projectId : undefined,
  })
  await ctx.publish({
    type: 'DecisionGenerated',
    source: meta?.source ?? 'action-engine',
    payload: { action: 'task_created', title: payload.title },
  })
  return {
    success: true,
    actionId: meta?.proposalId ?? '',
    type: 'TaskCreated',
  }
}

async function handleMissionUpdated(
  payload: Record<string, unknown>,
  ctx: ActionExecutionContext,
  meta?: { proposalId: string; source: string },
): Promise<ActionExecutionResult> {
  const mission = String(payload.mission)
  ctx.updateMission(mission)
  await ctx.publish({
    type: 'CognitiveModelUpdated',
    source: meta?.source ?? 'action-engine',
    payload: { reason: 'mission_updated' },
  })
  return {
    success: true,
    actionId: meta?.proposalId ?? '',
    type: 'MissionUpdated',
  }
}

async function handleValidationLogged(
  payload: Record<string, unknown>,
  ctx: ActionExecutionContext,
  meta?: { proposalId: string; source: string },
): Promise<ActionExecutionResult> {
  await ctx.startValidationSprint()
  const memory = ctx.recordMemory({
    type: 'conversation',
    title: String(payload.title ?? 'Validation sprint started'),
    content: String(payload.notes ?? 'Validation sprint initiated via Action Engine.'),
    importance: 'high',
    area: 'validation',
    source: 'assistant',
    relatedObjectIds: [],
    tags: ['validation', 'sprint'],
  })
  return {
    success: true,
    actionId: meta?.proposalId ?? '',
    type: 'ValidationLogged',
    createdIds: { memoryId: memory?.id ?? '' },
  }
}

async function handleGoalUpdated(
  payload: Record<string, unknown>,
  ctx: ActionExecutionContext,
  meta?: { proposalId: string; source: string },
): Promise<ActionExecutionResult> {
  const object = ctx.createObject({
    type: 'goal',
    title: String(payload.title),
    summary: typeof payload.description === 'string' ? payload.description : undefined,
    area: 'founder',
    status: 'active',
    tags: ['goal'],
    source: 'manual',
    metadata: { goalId: payload.goalId },
    relationships: [],
  })
  await ctx.publish({
    type: 'GoalChanged',
    source: meta?.source ?? 'action-engine',
    payload: { title: payload.title, objectId: object?.id },
  })
  return {
    success: true,
    actionId: meta?.proposalId ?? '',
    type: 'GoalUpdated',
    createdIds: { objectId: object?.id ?? '' },
  }
}

async function handleProjectCreated(
  payload: Record<string, unknown>,
  ctx: ActionExecutionContext,
  meta?: { proposalId: string; source: string },
): Promise<ActionExecutionResult> {
  const project = await ctx.createProject({
    title: String(payload.title),
    description: typeof payload.description === 'string' ? payload.description : '',
  })
  await ctx.publish({
    type: 'ObjectCreated',
    source: meta?.source ?? 'action-engine',
    payload: { projectId: project.id, title: payload.title },
  })
  return {
    success: true,
    actionId: meta?.proposalId ?? '',
    type: 'ProjectCreated',
    createdIds: { projectId: project.id },
  }
}

async function handleUserFeedbackAdded(
  payload: Record<string, unknown>,
  ctx: ActionExecutionContext,
  meta?: { proposalId: string; source: string },
): Promise<ActionExecutionResult> {
  const memory = ctx.recordMemory({
    type: 'conversation',
    title: String(payload.title ?? 'User feedback'),
    content: String(payload.content),
    importance: 'medium',
    area: 'systems',
    source: 'user',
    relatedObjectIds: [],
    tags: ['feedback'],
  })
  return {
    success: Boolean(memory),
    actionId: meta?.proposalId ?? '',
    type: 'UserFeedbackAdded',
    createdIds: { memoryId: memory?.id ?? '' },
  }
}

async function handleDeferItem(
  payload: Record<string, unknown>,
  ctx: ActionExecutionContext,
  meta?: { proposalId: string; source: string },
): Promise<ActionExecutionResult> {
  await ctx.publish({
    type: 'FounderProposalApproved',
    source: meta?.source ?? 'action-engine',
    payload: {
      actionType: 'defer_item',
      itemTitle: payload.itemTitle,
      reason: payload.reason,
    },
  })
  return {
    success: true,
    actionId: meta?.proposalId ?? '',
    type: 'defer_item',
  }
}

async function handlePlaceholder(
  payload: Record<string, unknown>,
  ctx: ActionExecutionContext,
  meta?: { proposalId: string; source: string },
  actionType: 'create_capture' | 'schedule_placeholder' = 'create_capture',
): Promise<ActionExecutionResult> {
  await ctx.publish({
    type: 'FounderProposalApproved',
    source: meta?.source ?? 'action-engine',
    payload: { actionType, payload },
  })
  return {
    success: true,
    actionId: meta?.proposalId ?? '',
    type: actionType,
  }
}

export function registerFounderActionHandlers(): void {
  registerActionHandler('MemoryCreated', handleMemoryCreated)
  registerActionHandler('create_memory_draft', handleMemoryCreated)
  registerActionHandler('KnowledgeCreated', handleKnowledgeCreated)
  registerActionHandler('create_knowledge_draft', handleKnowledgeCreated)
  registerActionHandler('TaskCreated', handleTaskCreated)
  registerActionHandler('create_task', handleTaskCreated)
  registerActionHandler('MissionUpdated', handleMissionUpdated)
  registerActionHandler('update_mission', handleMissionUpdated)
  registerActionHandler('ValidationLogged', handleValidationLogged)
  registerActionHandler('create_sprint', handleValidationLogged)
  registerActionHandler('GoalUpdated', handleGoalUpdated)
  registerActionHandler('ProjectCreated', handleProjectCreated)
  registerActionHandler('UserFeedbackAdded', handleUserFeedbackAdded)
  registerActionHandler('defer_item', handleDeferItem)
  registerActionHandler('create_capture', (p, c, m) => handlePlaceholder(p, c, m, 'create_capture'))
  registerActionHandler('schedule_placeholder', (p, c, m) => handlePlaceholder(p, c, m, 'schedule_placeholder'))
}

export function resolveCanonicalActionType(type: string): string {
  return mapLegacyFounderType(type)
}
