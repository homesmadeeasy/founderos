import type { ActionExecutionContext, ActionExecutionResult, ActionType } from './actionTypes'
import { getActionHandler } from './actionRegistry'
import { validateActionPayload } from './actionValidation'
import {
  actionExecutedPayload,
  actionFailedPayload,
} from './actionEvents'

export async function runActionHandler(
  type: ActionType,
  payload: Record<string, unknown>,
  ctx: ActionExecutionContext,
  meta: { proposalId: string; source: string; preview: string },
): Promise<ActionExecutionResult> {
  const validation = validateActionPayload(type, payload)
  if (!validation.valid) {
    return {
      success: false,
      actionId: meta.proposalId,
      type,
      error: validation.errors.join('; '),
    }
  }

  const handler = getActionHandler(type)
  if (!handler) {
    return {
      success: false,
      actionId: meta.proposalId,
      type,
      error: `No handler registered for ${type}`,
    }
  }

  try {
    const result = await handler(payload, ctx, meta)
    if (result.success) {
      await ctx.publish({
        type: 'ActionExecuted',
        source: meta.source,
        payload: actionExecutedPayload(meta.proposalId, type, result.createdIds),
      })
    } else {
      await ctx.publish({
        type: 'ActionFailed',
        source: meta.source,
        payload: actionFailedPayload(meta.proposalId, type, result.error ?? 'execution_failed'),
      })
    }
    return result
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown execution error'
    await ctx.publish({
      type: 'ActionFailed',
      source: meta.source,
      payload: actionFailedPayload(meta.proposalId, type, message),
    })
    return {
      success: false,
      actionId: meta.proposalId,
      type,
      error: message,
    }
  }
}

export async function undoAction(
  type: ActionType,
  undoPayload: Record<string, unknown>,
  ctx: ActionExecutionContext & {
    deleteMemory?: (id: string) => void
    deleteObject?: (id: string) => void
  },
): Promise<boolean> {
  if (type === 'WorkoutLogged' || type === 'MemoryCreated' || type === 'create_memory_draft') {
    const memoryId = undoPayload.memoryId as string | undefined
    if (memoryId && ctx.deleteMemory) ctx.deleteMemory(memoryId)
  }
  if (type === 'WorkoutLogged') {
    const objectId = undoPayload.objectId as string | undefined
    if (objectId && ctx.deleteObject) ctx.deleteObject(objectId)
  }
  await ctx.publish({
    type: 'ActionExecuted',
    source: 'action-engine',
    payload: { undone: true, actionType: type, undoPayload },
  })
  return true
}
