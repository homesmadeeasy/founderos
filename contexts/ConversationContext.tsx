'use client'

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react'
import { useAppContext } from '@/contexts/AppContext'
import { useMemoryEngine } from '@/contexts/MemoryEngineContext'
import { useKnowledgeEngine } from '@/contexts/KnowledgeEngineContext'
import { useMorningExecution } from '@/contexts/MorningExecutionContext'
import { useFounderKernel } from '@/contexts/FounderKernelContext'
import type { ConversationSession, ConversationStore, ConversationTopic } from '@/lib/conversation/conversationTypes'
import {
  startConversation,
  submitAnswer,
  continueOrStartSession,
  dismissProactivePrompt,
  getProactiveHomeMessage,
  getConversationStore,
  getQuestionChips,
} from '@/lib/conversation/conversationEngine'
import { buildConversationContext } from '@/lib/conversation/conversationContext'
import { loadConversationStore, saveConversationStore, upsertSession } from '@/lib/conversation/conversationSession'
import { isMeaningfulUserAnswer } from '@/lib/conversation/conversationMemory'
import {
  findValidationSprintProject,
  sprintConfirmationMessage,
  VALIDATION_SPRINT_TASKS,
  VALIDATION_SPRINT_PROJECT_TITLE,
} from '@/lib/conversation/conversationActions'
import { newConversationId, nowISO } from '@/lib/conversation/conversationUtils'
import { useFounderInput, useUserDisplayName } from '@/components/founder/useFounderInput'
import { useCognitiveModel } from '@/contexts/CognitiveModelContext'
import { processFounderAIMessage } from '@/lib/ai/founder/founderAI.integration'
import {
  getPendingProposals,
  getProposalByTurnId,
  loadProposalStore,
} from '@/lib/ai/founder/founderAI.proposals'
import {
  approveProposalAction,
  approveBeliefProposal,
  dismissProposal,
  type FounderApprovalDeps,
} from '@/lib/ai/founder/founderAI.approvals'
import { isFounderAILlmEnabled } from '@/lib/ai/founder/founderAI.prefs'
import { whatChangedSince } from '@/lib/cognitive-model/cognitiveSummary'
import type { FounderProposalBundle, FounderReasoningMode } from '@/lib/ai/founder/founderAI.types'

interface ConversationContextValue {
  ready: boolean
  session: ConversationSession | null
  store: ConversationStore
  proactiveMessage: string
  proactiveEvidence: ReturnType<typeof getProactiveHomeMessage>['evidence']
  proactiveDismissed: boolean
  questionChips: readonly string[]
  isTyping: boolean
  reasoningMode: FounderReasoningMode
  pendingProposals: FounderProposalBundle[]
  getProposalForTurn: (turnId: string) => FounderProposalBundle | null
  composerFocusRef: React.RefObject<HTMLTextAreaElement | null>
  start: (topic?: ConversationTopic) => ConversationSession
  continueSession: () => ConversationSession
  reply: (answer: string, questionId?: string) => Promise<void>
  dismissProactive: () => void
  refresh: () => void
  handleActionCard: (action: string, turnId: string) => void
  startValidationSprint: () => Promise<void>
  approveActionProposal: (proposalId: string, actionId: string, editedPayload?: Record<string, unknown>) => Promise<void>
  approveBeliefProposal: (proposalId: string) => Promise<void>
  dismissAIProposal: (proposalId: string) => void
}

const ConversationContext = createContext<ConversationContextValue | null>(null)

export function ConversationProvider({ children }: { children: React.ReactNode }) {
  const founderInput = useFounderInput()
  const userName = useUserDisplayName()
  const { worldModel, hydrated, store: cognitiveStore } = useCognitiveModel()
  const { appState, createProject, addTask } = useAppContext()
  const { recordMemory } = useMemoryEngine()
  const { createKnowledge } = useKnowledgeEngine()
  const { updatePrimaryMission } = useMorningExecution()
  const { publish } = useFounderKernel()
  const [session, setSession] = useState<ConversationSession | null>(null)
  const [store, setStore] = useState<ConversationStore>(() => loadConversationStore())
  const [isTyping, setIsTyping] = useState(false)
  const [reasoningMode, setReasoningMode] = useState<FounderReasoningMode>('idle')
  const [pendingProposals, setPendingProposals] = useState<FounderProposalBundle[]>(() => getPendingProposals())
  const [ready, setReady] = useState(false)
  const composerFocusRef = useRef<HTMLTextAreaElement | null>(null)
  const lastChangeBaselineRef = useRef<string>(new Date().toISOString())

  useEffect(() => {
    setStore(loadConversationStore())
    const active = loadConversationStore().sessions.find(s => s.status === 'active')
    setSession(active ?? null)
    setPendingProposals(loadProposalStore().pending)
    setReady(true)
  }, [])

  const proactive = useMemo(
    () => getProactiveHomeMessage(founderInput, userName, hydrated ? worldModel : null),
    [founderInput, userName, hydrated, worldModel.updatedAt, worldModel.beliefs.length],
  )

  const refresh = useCallback(() => {
    setStore(getConversationStore())
    const active = getConversationStore().sessions.find(s => s.status === 'active')
    setSession(active ?? null)
    setPendingProposals(loadProposalStore().pending)
  }, [])

  const appendSystemTurn = useCallback((content: string) => {
    if (!session) return
    const turn = {
      id: newConversationId(),
      role: 'founder_ai' as const,
      content,
      intent: 'recommend' as const,
      mood: 'strategic' as const,
      topic: session.topic,
      evidence: session.evidence.slice(0, 3),
      createdAt: nowISO(),
    }
    const updated = {
      ...session,
      turns: [...session.turns, turn],
      updatedAt: nowISO(),
    }
    const newStore = upsertSession(loadConversationStore(), updated)
    saveConversationStore(newStore)
    setSession(updated)
    setStore(newStore)
  }, [session])

  const startValidationSprint = useCallback(async () => {
    let project = findValidationSprintProject(appState.projects)
    let reused = Boolean(project)

    if (!project) {
      project = await createProject({
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
      reused = false
    }

    const existingTitles = new Set(
      appState.tasks.filter(t => t.projectId === project!.id).map(t => t.title.toLowerCase()),
    )

    let tasksCreated = 0
    for (const title of VALIDATION_SPRINT_TASKS) {
      if (existingTitles.has(title.toLowerCase())) continue
      await addTask({
        projectId: project.id,
        title,
        description: `Validation sprint: ${title}`,
        priority: 'high',
        status: 'todo',
      })
      tasksCreated++
    }

    appendSystemTurn(sprintConfirmationMessage(tasksCreated, reused && tasksCreated === 0))

    void publish({
      type: 'ConversationDecisionUpdated',
      source: 'conversation-engine',
      payload: {
        sessionId: session?.id,
        action: 'validation_sprint_started',
        projectId: project.id,
        tasksCreated,
      },
    })
  }, [appState.projects, appState.tasks, createProject, addTask, appendSystemTurn, publish, session?.id])

  const approvalDeps = useMemo<FounderApprovalDeps>(() => ({
    recordMemory: (input) => recordMemory(input as never),
    createKnowledge: (input) => createKnowledge(input as never),
    addTask: async (input) => { await addTask(input as never) },
    createProject: (input) => createProject(input as never),
    updateMission: updatePrimaryMission,
    publish,
    startValidationSprint,
  }), [recordMemory, createKnowledge, addTask, createProject, updatePrimaryMission, publish, startValidationSprint])

  const start = useCallback((topic?: ConversationTopic) => {
    const s = startConversation(founderInput, userName, topic ?? 'founder')
    setSession(s)
    setStore(getConversationStore())
    void publish({
      type: 'ConversationStarted',
      source: 'conversation-engine',
      payload: { sessionId: s.id, topic: s.topic },
    })
    return s
  }, [founderInput, userName, publish])

  const continueSession = useCallback(() => {
    const s = continueOrStartSession(founderInput, userName)
    setSession(s)
    setStore(getConversationStore())
    return s
  }, [founderInput, userName])

  const reply = useCallback(async (answer: string, questionId?: string) => {
    if (!session) return

    if (/what changed/i.test(answer.trim())) {
      const explanation = whatChangedSince(cognitiveStore, lastChangeBaselineRef.current)
      appendSystemTurn(explanation)
      lastChangeBaselineRef.current = new Date().toISOString()
      return
    }

    setIsTyping(true)
    setReasoningMode('thinking')

    try {
      void publish({
        type: 'FounderAIRequested',
        source: 'founder-ai',
        payload: { sessionId: session.id, questionId },
      })

      const useLlm = session.topic === 'founder' && isFounderAILlmEnabled()

      if (useLlm) {
        const result = await processFounderAIMessage({
          sessionId: session.id,
          answer,
          questionId,
          founderInput,
          userName,
          worldModel,
          llmEnabled: true,
        })

        setSession(result.session)
        setStore(getConversationStore())
        setReasoningMode(result.reasoningMode)
        if (result.proposal) {
          setPendingProposals(loadProposalStore().pending)
          void publish({
            type: 'FounderProposalCreated',
            source: 'founder-ai',
            payload: { proposalId: result.proposal.id, sessionId: session.id, mode: result.mode },
          })
        }
        void publish({
          type: 'FounderAIResponded',
          source: 'founder-ai',
          payload: { sessionId: session.id, mode: result.mode, usedFallback: result.usedFallback },
        })
      } else {
        await new Promise(r => setTimeout(r, 300))
        const deterministic = submitAnswer(
          { sessionId: session.id, answer, questionId },
          founderInput,
          userName,
        )
        setReasoningMode('deterministic')
        if (!deterministic) return
        setSession(deterministic.session)
        setStore(getConversationStore())

        const meaningful = isMeaningfulUserAnswer(answer)
        if (deterministic.memoryWrite && deterministic.memoryWrite.confidence >= 65 && meaningful) {
          const mem = recordMemory({
            type: 'conversation',
            title: deterministic.memoryWrite.title,
            content: deterministic.memoryWrite.content,
            importance: 'medium',
            area: 'systems',
            source: 'assistant',
            relatedObjectIds: [],
            tags: ['founder-ai', 'conversation', `dedupe:conv-${deterministic.session.id}`],
          })
          if (mem) {
            void publish({
              type: 'ConversationMemoryCreated',
              source: 'conversation-engine',
              payload: { sessionId: deterministic.session.id, memoryId: mem.id, title: mem.title },
            })
          }
        }
        if (deterministic.knowledgeSuggestion && meaningful) {
          void publish({
            type: 'ConversationKnowledgeSuggested',
            source: 'conversation-engine',
            payload: { sessionId: deterministic.session.id, suggestion: deterministic.knowledgeSuggestion },
          })
        }
      }

      void publish({
        type: 'ConversationAnswered',
        source: 'conversation-engine',
        payload: {
          sessionId: session.id,
          questionId: questionId ?? session.nextQuestion?.id,
          answer: answer.slice(0, 200),
        },
      })
    } catch {
      setReasoningMode('deterministic')
      void publish({
        type: 'FounderAIResponseFailed',
        source: 'founder-ai',
        payload: { sessionId: session.id },
      })
      const fallback = submitAnswer(
        { sessionId: session.id, answer, questionId },
        founderInput,
        userName,
      )
      if (fallback) {
        setSession(fallback.session)
        setStore(getConversationStore())
      }
    } finally {
      setIsTyping(false)
      setTimeout(() => setReasoningMode('idle'), 400)
    }
  }, [
    session, founderInput, userName, worldModel, cognitiveStore,
    publish, recordMemory, appendSystemTurn,
  ])

  const approveActionProposalFn = useCallback(async (
    proposalId: string,
    actionId: string,
    editedPayload?: Record<string, unknown>,
  ) => {
    const proposal = pendingProposals.find((p) => p.id === proposalId)
      ?? loadProposalStore().pending.find((p) => p.id === proposalId)
    if (!proposal) return
    const action = proposal.response.suggestedActions.find((a) => a.id === actionId)
    if (!action) return
    await approveProposalAction(proposal, action, approvalDeps, editedPayload)
    setPendingProposals(loadProposalStore().pending)
    void publish({
      type: 'FounderProposalEdited',
      source: 'founder-ai',
      payload: { proposalId, actionId, edited: Boolean(editedPayload) },
    })
  }, [pendingProposals, approvalDeps, publish])

  const approveBeliefProposalFn = useCallback(async (proposalId: string) => {
    const proposal = pendingProposals.find((p) => p.id === proposalId)
      ?? loadProposalStore().pending.find((p) => p.id === proposalId)
    if (!proposal) return
    await approveBeliefProposal(proposal, approvalDeps)
    lastChangeBaselineRef.current = new Date(Date.now() - 60_000).toISOString()
    setPendingProposals(loadProposalStore().pending)
  }, [pendingProposals, approvalDeps])

  const dismissAIProposalFn = useCallback((proposalId: string) => {
    dismissProposal(proposalId, publish)
    setPendingProposals(loadProposalStore().pending)
  }, [publish])

  const handleActionCardFn = useCallback((action: string, turnId: string) => {
    if (action === 'start_sprint' || action === 'add_tasks') {
      void startValidationSprint()
      return
    }
    if (action === 'defer') {
      void reply('Maybe later')
      return
    }
    if (action === 'why') {
      void reply('Tell me more')
    }
  }, [startValidationSprint, reply])

  const dismissProactiveFn = useCallback(() => {
    dismissProactivePrompt()
    setStore(getConversationStore())
  }, [])

  const getProposalForTurn = useCallback((turnId: string) => getProposalByTurnId(turnId), [])

  const value = useMemo<ConversationContextValue>(() => ({
    ready,
    session,
    store,
    proactiveMessage: proactive.message,
    proactiveEvidence: proactive.evidence,
    proactiveDismissed: proactive.dismissed,
    questionChips: getQuestionChips(),
    isTyping,
    reasoningMode,
    pendingProposals,
    getProposalForTurn,
    composerFocusRef,
    start,
    continueSession,
    reply,
    dismissProactive: dismissProactiveFn,
    refresh,
    handleActionCard: handleActionCardFn,
    startValidationSprint,
    approveActionProposal: approveActionProposalFn,
    approveBeliefProposal: approveBeliefProposalFn,
    dismissAIProposal: dismissAIProposalFn,
  }), [
    ready, session, store, proactive, isTyping, reasoningMode, pendingProposals,
    getProposalForTurn, start, continueSession, reply, dismissProactiveFn, refresh,
    handleActionCardFn, startValidationSprint,
    approveActionProposalFn, approveBeliefProposalFn, dismissAIProposalFn,
  ])

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  )
}

export function useConversation(): ConversationContextValue {
  const ctx = useContext(ConversationContext)
  if (!ctx) throw new Error('useConversation must be used within ConversationProvider')
  return ctx
}

export function useConversationContext() {
  const founderInput = useFounderInput()
  const userName = useUserDisplayName()
  return useMemo(
    () => buildConversationContext(founderInput, userName),
    [founderInput, userName],
  )
}
