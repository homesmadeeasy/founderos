'use client'

import {
  createContext, useCallback, useContext, useEffect, useMemo,
} from 'react'
import { useAppContext } from '@/contexts/AppContext'
import { useMemoryEngine } from '@/contexts/MemoryEngineContext'
import { useKnowledgeEngine } from '@/contexts/KnowledgeEngineContext'
import { useObjectEngine } from '@/contexts/ObjectEngineContext'
import { useMorningExecution } from '@/contexts/MorningExecutionContext'
import { useFounderKernel } from '@/contexts/FounderKernelContext'
import type { ActionExecutionContext, ActionProposal, ActionType } from '@/lib/action-engine/actionTypes'
import type { FounderEventType } from '@/lib/founder-kernel/kernelTypes'
import {
  proposeAction,
  approveAndExecuteAction,
  rejectAction,
  undoLastAction,
} from '@/lib/action-engine/actionDispatcher'
import { ensureActionHandlersRegistered } from '@/lib/action-engine/registerActionHandlers'
import { listPendingActionProposals } from '@/lib/action-engine/actionProposal'
import { listActionHistory } from '@/lib/action-engine/actionHistory'
import type { ActionHistoryEntry } from '@/lib/action-engine/actionTypes'
import type { CreateMemoryInput } from '@/lib/memory-engine/memoryTypes'
import type { CreateObjectInput } from '@/lib/object-engine/objectTypes'

interface ActionEngineContextValue {
  proposeAction: (params: {
    type: ActionType
    payload: Record<string, unknown>
    title?: string
    description?: string
    rationale?: string
    source: string
    sessionId?: string
    turnId?: string
  }) => Promise<ActionProposal | null>
  approveAction: (proposalId: string, editedPayload?: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
  rejectActionProposal: (proposalId: string, reason?: string) => Promise<void>
  undoLastAction: () => Promise<boolean>
  pendingProposals: ActionProposal[]
  history: ActionHistoryEntry[]
  buildExecutionContext: () => ActionExecutionContext & {
    deleteMemory: (id: string) => void
    deleteObject: (id: string) => void
  }
}

const ActionEngineContext = createContext<ActionEngineContextValue | null>(null)

export function ActionEngineProvider({ children }: { children: React.ReactNode }) {
  const { createProject, addTask, appState } = useAppContext()
  const { recordMemory, deleteMemory } = useMemoryEngine()
  const { createKnowledge } = useKnowledgeEngine()
  const { createObject, deleteObject } = useObjectEngine()
  const { updatePrimaryMission } = useMorningExecution()
  const { publish } = useFounderKernel()

  useEffect(() => {
    ensureActionHandlersRegistered()
  }, [])

  const buildExecutionContext = useCallback(() => ({
    recordMemory: (input: Record<string, unknown>) => {
      const created = recordMemory(input as CreateMemoryInput)
      return created ? { id: created.id, title: created.title, memory: created } : null
    },
    createKnowledge: (input: Record<string, unknown>) => createKnowledge(input as never),
    createObject: (input: Record<string, unknown>) => {
      const created = createObject(input as CreateObjectInput)
      return { id: created.id, object: created }
    },
    addTask: async (input: Record<string, unknown>) => { await addTask(input as never) },
    createProject: (input: Record<string, unknown>) => createProject(input as never),
    updateMission: (mission: string) => updatePrimaryMission(mission),
    startValidationSprint: async () => {
      const {
        findValidationSprintProject,
        VALIDATION_SPRINT_TASKS,
        VALIDATION_SPRINT_PROJECT_TITLE,
      } = await import('@/lib/conversation/conversationActions')
      let project = findValidationSprintProject(appState.projects)
      if (!project) {
        const created = await createProject({
          title: VALIDATION_SPRINT_PROJECT_TITLE,
          description: 'Real-user validation sprint for FounderOS — first impressions, confusion, value, and willingness to pay.',
          goal: 'Validate FounderOS with 3 real users and record actionable findings.',
          status: 'building',
          priority: 'high',
          progress: 0,
          worldType: 'Business',
          worldPurpose: 'Validate product-market fit signals',
          lifeArea: 'systems',
        })
        project = { id: created.id, title: created.title }
      }
      const existingTitles = new Set(
        appState.tasks.filter(t => t.projectId === project!.id).map(t => t.title.toLowerCase()),
      )
      for (const title of VALIDATION_SPRINT_TASKS) {
        if (existingTitles.has(title.toLowerCase())) continue
        await addTask({
          projectId: project.id,
          title,
          description: `Validation sprint: ${title}`,
          priority: 'high',
          status: 'todo',
        })
      }
    },
    publish: (event: { type: FounderEventType; source: string; payload: Record<string, unknown> }) =>
      publish({ type: event.type, source: event.source, payload: event.payload }),
    deleteMemory,
    deleteObject,
  }), [recordMemory, createKnowledge, createObject, addTask, createProject, updatePrimaryMission, publish, deleteMemory, deleteObject, appState.projects, appState.tasks])

  const propose = useCallback(async (params: Parameters<ActionEngineContextValue['proposeAction']>[0]) => {
    return proposeAction(params, buildExecutionContext())
  }, [buildExecutionContext])

  const approve = useCallback(async (proposalId: string, editedPayload?: Record<string, unknown>) => {
    return approveAndExecuteAction(proposalId, buildExecutionContext(), editedPayload)
  }, [buildExecutionContext])

  const reject = useCallback(async (proposalId: string, reason?: string) => {
    await rejectAction(proposalId, buildExecutionContext(), reason)
  }, [buildExecutionContext])

  const undo = useCallback(async () => {
    return undoLastAction(buildExecutionContext())
  }, [buildExecutionContext])

  const value = useMemo<ActionEngineContextValue>(() => ({
    proposeAction: propose,
    approveAction: approve,
    rejectActionProposal: reject,
    undoLastAction: undo,
    pendingProposals: listPendingActionProposals(),
    history: listActionHistory(),
    buildExecutionContext,
  }), [propose, approve, reject, undo, buildExecutionContext])

  return (
    <ActionEngineContext.Provider value={value}>
      {children}
    </ActionEngineContext.Provider>
  )
}

export function useActionEngine(): ActionEngineContextValue {
  const ctx = useContext(ActionEngineContext)
  if (!ctx) throw new Error('useActionEngine must be used within ActionEngineProvider')
  return ctx
}

export function buildActionEngineDepsFromContext(ctx: ActionEngineContextValue): ActionExecutionContext & {
  deleteMemory: (id: string) => void
  deleteObject: (id: string) => void
} {
  return ctx.buildExecutionContext()
}
