import type { ActionProposal, ActionType } from './actionTypes'
import { ACTION_TYPE_DEFINITIONS } from './actionTypes'

export interface ActionValidationResult {
  valid: boolean
  errors: string[]
}

export function validateActionPayload(type: ActionType, payload: Record<string, unknown>): ActionValidationResult {
  const def = ACTION_TYPE_DEFINITIONS[type]
  if (!def) {
    return { valid: false, errors: [`Unknown action type: ${type}`] }
  }

  const errors: string[] = []
  for (const field of def.requiredFields) {
    const value = payload[field]
    if (value === undefined || value === null || value === '') {
      errors.push(`Missing required field: ${field}`)
    }
  }

  if (type === 'WorkoutLogged') {
    const weight = Number(payload.weight)
    const reps = Number(payload.reps)
    if (!Number.isFinite(weight) || weight < 0) errors.push('weight must be a non-negative number')
    if (!Number.isFinite(reps) || reps < 1) errors.push('reps must be at least 1')
  }

  return { valid: errors.length === 0, errors }
}

export function validateActionProposal(proposal: ActionProposal): ActionValidationResult {
  const base = validateActionPayload(proposal.type, proposal.payload)
  if (!proposal.preview?.trim()) {
    base.errors.push('Preview text is required')
    base.valid = false
  }
  return base
}

export function sanitizePayload(type: ActionType, payload: Record<string, unknown>): Record<string, unknown> {
  const def = ACTION_TYPE_DEFINITIONS[type]
  const allowed = new Set([...def.requiredFields, ...(def.optionalFields ?? [])])
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(payload)) {
    if (allowed.has(k)) out[k] = v
  }
  return out
}
