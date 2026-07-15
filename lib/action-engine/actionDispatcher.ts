import type { ActionExecutionContext, ActionProposal, ActionType } from './actionTypes'
import { ACTION_TYPE_DEFINITIONS } from './actionTypes'
import { isRegisteredActionType } from './actionRegistry'
import { validateActionPayload, sanitizePayload } from './actionValidation'
import { createActionProposal } from './actionUtils'
import { buildActionPreview } from './actionProposal'
import {
  getActionProposal,
  upsertActionProposal,
  updateActionProposalStatus,
} from './actionProposal'
import { recordActionHistory, getLastReversibleAction, markActionUndone } from './actionHistory'
import { runActionHandler, undoAction } from './actionExecution'
import {
  actionProposedPayload,
  actionApprovedPayload,
  actionRejectedPayload,
} from './actionEvents'

export function isActionEngineType(type: string): type is ActionType {
  return type in ACTION_TYPE_DEFINITIONS
}

export async function proposeAction(
  params: {
    type: ActionType
    payload: Record<string, unknown>
    title?: string
    description?: string
    rationale?: string
    source: string
    sessionId?: string
    turnId?: string
  },
  ctx: ActionExecutionContext,
): Promise<ActionProposal | null> {
  const payload = sanitizePayload(params.type, params.payload)
  const validation = validateActionPayload(params.type, payload)
  if (!validation.valid) return null

  const proposal = createActionProposal({
    type: params.type,
    payload,
    title: params.title ?? params.type,
    description: params.description ?? buildActionPreview(params.type, payload),
    rationale: params.rationale ?? 'Proposed state change awaiting approval.',
    source: params.source,
    sessionId: params.sessionId,
    turnId: params.turnId,
  })

  upsertActionProposal(proposal)
  await ctx.publish({
    type: 'ActionProposed',
    source: params.source,
    payload: actionProposedPayload(proposal),
  })
  return proposal
}

export async function approveAndExecuteAction(
  proposalId: string,
  ctx: ActionExecutionContext & {
    deleteMemory?: (id: string) => void
    deleteObject?: (id: string) => void
  },
  editedPayload?: Record<string, unknown>,
): Promise<{ success: boolean; error?: string }> {
  const proposal = getActionProposal(proposalId)
  if (!proposal || proposal.status !== 'pending') {
    return { success: false, error: 'Proposal not found or already resolved' }
  }

  const payload = { ...proposal.payload, ...editedPayload }
  updateActionProposalStatus(proposalId, 'approved')

  await ctx.publish({
    type: 'ActionApproved',
    source: proposal.source,
    payload: actionApprovedPayload(proposalId, proposal.type),
  })

  const result = await runActionHandler(proposal.type, payload, ctx, {
    proposalId,
    source: proposal.source,
    preview: proposal.preview,
  })

  if (result.success) {
    updateActionProposalStatus(proposalId, 'executed')
    recordActionHistory({
      proposalId,
      type: proposal.type,
      status: 'executed',
      preview: proposal.preview,
      undoPayload: result.createdIds ? { ...result.createdIds } : undefined,
      createdIds: result.createdIds,
      source: proposal.source,
    })
    return { success: true }
  }

  updateActionProposalStatus(proposalId, 'failed')
  return { success: false, error: result.error }
}

export async function rejectAction(
  proposalId: string,
  ctx: ActionExecutionContext,
  reason?: string,
): Promise<void> {
  const proposal = getActionProposal(proposalId)
  if (!proposal) return
  updateActionProposalStatus(proposalId, 'rejected')
  await ctx.publish({
    type: 'ActionRejected',
    source: proposal.source,
    payload: actionRejectedPayload(proposalId, proposal.type, reason),
  })
}

export async function executeDirectAction(
  params: {
    type: ActionType
    payload: Record<string, unknown>
    source: string
    preview?: string
    proposalId?: string
  },
  ctx: ActionExecutionContext,
): Promise<{ success: boolean; error?: string }> {
  const proposalId = params.proposalId ?? `direct-${Date.now()}`
  const preview = params.preview ?? buildActionPreview(params.type, params.payload)

  await ctx.publish({
    type: 'ActionApproved',
    source: params.source,
    payload: actionApprovedPayload(proposalId, params.type),
  })

  const result = await runActionHandler(params.type, params.payload, ctx, {
    proposalId,
    source: params.source,
    preview,
  })

  if (result.success) {
    recordActionHistory({
      proposalId,
      type: params.type,
      status: 'executed',
      preview,
      undoPayload: result.createdIds ? { ...result.createdIds } : undefined,
      createdIds: result.createdIds,
      source: params.source,
    })
  }
  return { success: result.success, error: result.error }
}

export async function undoLastAction(
  ctx: ActionExecutionContext & {
    deleteMemory?: (id: string) => void
    deleteObject?: (id: string) => void
  },
): Promise<boolean> {
  const entry = getLastReversibleAction()
  if (!entry?.undoPayload) return false
  const ok = await undoAction(entry.type, entry.undoPayload, ctx)
  if (ok) markActionUndone(entry.id)
  return ok
}

export function canExecuteActionType(type: string): boolean {
  return isActionEngineType(type) && isRegisteredActionType(type)
}
