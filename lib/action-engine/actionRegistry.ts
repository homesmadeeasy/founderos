import type { ActionHandler, ActionType, ActionTypeDefinition } from './actionTypes'
import { ACTION_TYPE_DEFINITIONS } from './actionTypes'

const handlers = new Map<ActionType, ActionHandler>()

export function registerActionHandler(type: ActionType, handler: ActionHandler): void {
  handlers.set(type, handler)
}

export function getActionHandler(type: ActionType): ActionHandler | undefined {
  return handlers.get(type)
}

export function getActionDefinition(type: ActionType): ActionTypeDefinition {
  return ACTION_TYPE_DEFINITIONS[type]
}

export function isRegisteredActionType(type: string): type is ActionType {
  return type in ACTION_TYPE_DEFINITIONS && handlers.has(type as ActionType)
}

export function listRegisteredActionTypes(): ActionType[] {
  return [...handlers.keys()]
}
