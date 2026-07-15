import { updateBelief, createBelief } from '@/lib/cognitive-model/beliefUpdates'
import { createEvidence } from '@/lib/cognitive-model/beliefEvidence'
import { getCognitiveStore, persistCognitiveStore, setCognitiveStore } from '@/lib/cognitive-model/cognitiveOrchestrator'
import type { BeliefTopic } from '@/lib/cognitive-model/beliefTypes'
import type {
  FounderProposalBundle,
  ProposedAction,
  ProposedBeliefUpdate,
} from './founderAI.types'
import { resolveProposal } from './founderAI.proposals'
import type { FounderEvent } from '@/lib/founder-kernel/kernelTypes'
import { ensureActionHandlersRegistered } from '@/lib/action-engine/registerActionHandlers'
import { canExecuteActionType } from '@/lib/action-engine/actionDispatcher'
import { runActionHandler } from '@/lib/action-engine/actionExecution'
import type { ActionExecutionContext } from '@/lib/action-engine/actionTypes'
import { recordActionHistory } from '@/lib/action-engine/actionHistory'
import { buildActionPreview } from '@/lib/action-engine/actionProposal'

export interface FounderApprovalDeps {
  recordMemory: (input: Record<string, unknown>) => { id: string; title: string } | null
  createKnowledge: (input: Record<string, unknown>) => Promise<{ id: string } | null> | { id: string } | null
  createObject: (input: Record<string, unknown>) => { id: string } | null
  addTask: (input: Record<string, unknown>) => Promise<void> | void
  createProject: (input: Record<string, unknown>) => Promise<{ id: string }>
  updateMission: (mission: string) => void
  publish: (event: Omit<FounderEvent, 'id' | 'timestamp' | 'status'>) => Promise<unknown> | unknown
  startValidationSprint: () => Promise<void>
}

function toActionContext(deps: FounderApprovalDeps): ActionExecutionContext {
  return {
    recordMemory: deps.recordMemory,
    createKnowledge: deps.createKnowledge,
    createObject: deps.createObject,
    addTask: deps.addTask,
    createProject: deps.createProject,
    updateMission: deps.updateMission,
    startValidationSprint: deps.startValidationSprint,
    publish: (event) => deps.publish({ type: event.type, source: event.source, payload: event.payload }),
  }
}

function topicFromDomain(domain: string): BeliefTopic {
  const map: Record<string, BeliefTopic> = {
    validation: 'validation',
    product: 'product',
    execution: 'execution',
    strategy: 'strategy',
    founder: 'founder',
    mission: 'mission',
  }
  return map[domain] ?? 'founder'
}

export function applyBeliefUpdates(updates: ProposedBeliefUpdate[]): void {
  const store = getCognitiveStore()
  let beliefs = [...store.worldModel.beliefs]

  for (const update of updates) {
    const evidence = update.evidenceIds.map((id) =>
      createEvidence('conversation', 'Approved evidence', `Reference ${id}`, true, 0.6, id),
    )
    const existing = update.beliefId
      ? beliefs.find((b) => b.id === update.beliefId)
      : beliefs.find((b) => b.statement.toLowerCase() === update.proposition.toLowerCase())

    if (existing) {
      const primaryEvidence = evidence[0]
      const result = updateBelief(existing, {
        evidence: primaryEvidence,
        reason: update.rationale,
        triggerEvent: 'FounderProposalApproved',
        confidence: Math.max(0, Math.min(100, existing.confidence + update.confidenceDelta)),
      })
      beliefs = beliefs.map((b) => (b.id === result.belief.id ? result.belief : b))
    } else if (update.operation === 'create' || update.operation === 'confirm') {
      beliefs.push(createBelief(update.proposition, topicFromDomain('founder'), 'conversation', 55 + update.confidenceDelta))
    }
  }

  const next = {
    ...store,
    worldModel: { ...store.worldModel, beliefs },
  }
  setCognitiveStore(next)
  persistCognitiveStore(next)
}

export async function approveProposalAction(
  proposal: FounderProposalBundle,
  action: ProposedAction,
  deps: FounderApprovalDeps,
  editedPayload?: Record<string, unknown>,
): Promise<void> {
  const payload = { ...action.payload, ...editedPayload }
  ensureActionHandlersRegistered()

  if (canExecuteActionType(action.type)) {
    await deps.publish({
      type: 'ActionApproved',
      source: 'founder-ai',
      payload: { actionId: action.id, actionType: action.type, proposalId: proposal.id },
    })
    const result = await runActionHandler(
      action.type as import('@/lib/action-engine/actionTypes').ActionType,
      payload,
      toActionContext(deps),
      {
        proposalId: action.id,
        source: 'founder-ai',
        preview: action.description || buildActionPreview(action.type as import('@/lib/action-engine/actionTypes').ActionType, payload),
      },
    )
    if (result.success) {
      recordActionHistory({
        proposalId: proposal.id,
        type: action.type as import('@/lib/action-engine/actionTypes').ActionType,
        status: 'executed',
        preview: action.description,
        undoPayload: result.createdIds,
        createdIds: result.createdIds,
        source: 'founder-ai',
      })
    }
    resolveProposal(proposal.id, 'approved')
    await deps.publish({
      type: 'FounderProposalApproved',
      source: 'founder-ai',
      payload: { proposalId: proposal.id, actionId: action.id, actionType: action.type },
    })
    return
  }

  switch (action.type) {
    case 'create_memory_draft': {
      const draft = proposal.response.memoryDrafts[0]
      if (draft) {
        deps.recordMemory({
          type: 'conversation',
          title: String(payload.title ?? draft.title),
          content: String(payload.content ?? draft.content),
          importance: 'medium',
          area: 'systems',
          source: 'assistant',
          relatedObjectIds: [],
          tags: ['founder-ai', 'approved', ...(draft.tags ?? [])],
        })
      }
      break
    }
    case 'create_knowledge_draft': {
      const draft = proposal.response.knowledgeDrafts[0]
      if (draft) {
        await deps.createKnowledge({
          title: String(payload.title ?? draft.title),
          principle: String(payload.principle ?? draft.principle),
          domain: String(payload.domain ?? draft.domain),
          source: 'assistant',
          tags: ['founder-ai', 'approved'],
        })
      }
      break
    }
    case 'create_task': {
      await deps.addTask({
        title: String(payload.title ?? action.title),
        description: String(payload.description ?? action.description),
        priority: (payload.priority as 'low' | 'medium' | 'high') ?? 'medium',
        status: 'todo',
        dueDate: typeof payload.dueDate === 'string' ? payload.dueDate : undefined,
        projectId: typeof payload.projectId === 'string' ? payload.projectId : undefined,
      })
      break
    }
    case 'create_sprint': {
      await deps.startValidationSprint()
      break
    }
    case 'update_mission': {
      deps.updateMission(String(payload.mission ?? action.description))
      break
    }
    case 'defer_item': {
      await deps.publish({
        type: 'FounderProposalApproved',
        source: 'founder-ai',
        payload: {
          proposalId: proposal.id,
          actionType: 'defer_item',
          itemTitle: payload.itemTitle ?? action.title,
          reason: payload.reason ?? action.rationale,
        },
      })
      break
    }
    case 'create_capture':
    case 'schedule_placeholder': {
      await deps.publish({
        type: 'FounderProposalApproved',
        source: 'founder-ai',
        payload: {
          proposalId: proposal.id,
          actionType: action.type,
          payload,
        },
      })
      break
    }
    default:
      break
  }

  resolveProposal(proposal.id, 'approved')
  await deps.publish({
    type: 'FounderProposalApproved',
    source: 'founder-ai',
    payload: { proposalId: proposal.id, actionId: action.id, actionType: action.type },
  })
}

export async function approveBeliefProposal(
  proposal: FounderProposalBundle,
  deps: FounderApprovalDeps,
): Promise<void> {
  if (proposal.response.beliefsToUpdate.length > 0) {
    applyBeliefUpdates(proposal.response.beliefsToUpdate)
  }
  resolveProposal(proposal.id, 'approved')
  await deps.publish({
    type: 'FounderProposalApproved',
    source: 'founder-ai',
    payload: {
      proposalId: proposal.id,
      beliefUpdates: proposal.response.beliefsToUpdate.length,
    },
  })
}

export function dismissProposal(proposalId: string, publish?: FounderApprovalDeps['publish']): void {
  resolveProposal(proposalId, 'dismissed')
  void publish?.({
    type: 'FounderProposalDismissed',
    source: 'founder-ai',
    payload: { proposalId },
  })
}
