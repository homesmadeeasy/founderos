import type { FounderEventType } from '@/lib/founder-kernel/kernelTypes'

export const ACTION_KERNEL_EVENTS = [
  'ActionProposed',
  'ActionApproved',
  'ActionRejected',
  'ActionExecuted',
  'ActionFailed',
] as const satisfies readonly FounderEventType[]

export type ActionKernelEventType = (typeof ACTION_KERNEL_EVENTS)[number]

export function actionProposedPayload(proposal: {
  id: string
  type: string
  preview: string
  source: string
}): Record<string, unknown> {
  return {
    actionId: proposal.id,
    actionType: proposal.type,
    preview: proposal.preview,
    source: proposal.source,
  }
}

export function actionApprovedPayload(proposalId: string, type: string): Record<string, unknown> {
  return { actionId: proposalId, actionType: type }
}

export function actionRejectedPayload(proposalId: string, type: string, reason?: string): Record<string, unknown> {
  return { actionId: proposalId, actionType: type, reason: reason ?? 'user_rejected' }
}

export function actionExecutedPayload(
  proposalId: string,
  type: string,
  createdIds?: Record<string, string>,
): Record<string, unknown> {
  return { actionId: proposalId, actionType: type, createdIds: createdIds ?? {} }
}

export function actionFailedPayload(proposalId: string, type: string, error: string): Record<string, unknown> {
  return { actionId: proposalId, actionType: type, error }
}
