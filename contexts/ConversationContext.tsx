'use client'

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react'
import { useAppContext } from '@/contexts/AppContext'
import { useMemoryEngine } from '@/contexts/MemoryEngineContext'
import { useKnowledgeEngine } from '@/contexts/KnowledgeEngineContext'
import { useObjectEngine } from '@/contexts/ObjectEngineContext'
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
import { useIntelligencePipeline } from '@/contexts/IntelligencePipelineContext'
import { useIdentity } from '@/contexts/IdentityContext'
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
import { answerCognitiveQuery } from '@/lib/cognitive-model/cognitiveAssistant'
import { reconcileUserMessage, syncSessionBeliefsFromReconciliation } from '@/lib/cognitive-model/realityIntegration'
import type { FounderProposalBundle, FounderReasoningMode } from '@/lib/ai/founder/founderAI.types'
import type { ReconciliationResult } from '@/lib/cognitive-model/realityTypes'

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
  const { worldModel, hydrated, store: cognitiveStore, refresh: refreshCognitive } = useCognitiveModel()
  const { appState, createProject, addTask } = useAppContext()
  const { recordMemory } = useMemoryEngine()
  const { createObject } = useObjectEngine()
  const { createKnowledge } = useKnowledgeEngine()
  const { updatePrimaryMission } = useMorningExecution()
  const { publish } = useFounderKernel()
  const { run: runIntelligence } = useIntelligencePipeline()
  const { ingestSignals } = useIdentity()
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
    createObject: (input) => {
      const created = createObject(input as never)
      return { id: created.id }
    },
    addTask: async (input) => { await addTask(input as never) },
    createProject: (input) => createProject(input as never),
    updateMission: updatePrimaryMission,
    publish,
    startValidationSprint,
  }), [recordMemory, createKnowledge, createObject, addTask, createProject, updatePrimaryMission, publish, startValidationSprint])

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

    const trimmed = answer.trim()
    const cognitiveAnswer = answerCognitiveQuery(cognitiveStore, trimmed)
    if (cognitiveAnswer) {
      appendSystemTurn(cognitiveAnswer)
      return
    }

    if (/what changed/i.test(trimmed)) {
      const explanation = whatChangedSince(cognitiveStore, lastChangeBaselineRef.current)
      appendSystemTurn(explanation)
      lastChangeBaselineRef.current = new Date().toISOString()
      return
    }

    setIsTyping(true)
    setReasoningMode('thinking')

    const userTurnId = newConversationId()
    let reconciliation: ReconciliationResult | undefined
    let activeWorldModel = worldModel

    try {
      if (isMeaningfulUserAnswer(trimmed)) {
        reconciliation = reconcileUserMessage({
          userMessage: trimmed,
          sessionId: session.id,
          messageId: userTurnId,
        })
        activeWorldModel = reconciliation.store.worldModel
        refreshCognitive()

        if (reconciliation.changes.length) {
          lastChangeBaselineRef.current = new Date(Date.now() - 60_000).toISOString()
        }

        void publish({
          type: 'RealityModelReconciled',
          source: 'cognitive-model',
          payload: {
            sessionId: session.id,
            messageId: userTurnId,
            changeCount: reconciliation.changes.length,
            idempotent: reconciliation.idempotent,
          },
        })
        for (const change of reconciliation.changes.slice(0, 3)) {
          void publish({
            type: 'RealityBeliefUpdated',
            source: 'cognitive-model',
            payload: { beliefId: change.beliefId, sessionId: session.id },
          })
        }
      }

      void publish({
        type: 'FounderAIRequested',
        source: 'founder-ai',
        payload: { sessionId: session.id, questionId },
      })

      // Canonical intelligence pipeline — specialists must not fan out engines themselves.
      await runIntelligence(
        {
          specialistId: session.topic || 'founder',
          question: trimmed,
          conversationContext: `conversation:${session.topic}`,
        },
        {
          produceResponse: () => '',
          onIdentityObservation: async () => {
            await ingestSignals([{
              id: `founder-ask-${userTurnId}`,
              domain: session.topic || 'founder',
              signalType: 'conversation_turn',
              occurredAt: new Date().toISOString(),
              payload: { question: trimmed.slice(0, 120), sessionId: session.id },
            }])
          },
        },
      )

      const useLlm = session.topic === 'founder' && isFounderAILlmEnabled()

      if (useLlm) {
        const result = await processFounderAIMessage({
          sessionId: session.id,
          answer,
          questionId,
          founderInput,
          userName,
          worldModel: activeWorldModel,
          llmEnabled: true,
          reconciliation,
          userTurnId,
        })

        let updatedSession = reconciliation
          ? syncSessionBeliefsFromReconciliation(result.session, reconciliation, userTurnId)
          : result.session

        if (reconciliation?.changes.length) {
          const convStore = upsertSession(loadConversationStore(), updatedSession)
          saveConversationStore(convStore)
        }

        setSession(updatedSession)
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
        const result = await processFounderAIMessage({
          sessionId: session.id,
          answer,
          questionId,
          founderInput,
          userName,
          worldModel: activeWorldModel,
          llmEnabled: false,
          reconciliation,
          userTurnId,
        })

        let updatedSession = reconciliation
          ? syncSessionBeliefsFromReconciliation(result.session, reconciliation, userTurnId)
          : result.session

        if (reconciliation?.changes.length) {
          const convStore = upsertSession(loadConversationStore(), updatedSession)
          saveConversationStore(convStore)
        }

        setReasoningMode('deterministic')
        setSession(updatedSession)
        setStore(getConversationStore())
      }

      void publish({
        type: 'ConversationAnswered',
        source: 'conversation-engine',
        payload: {
          sessionId: session.id,
          questionId: questionId ?? session.nextQuestion?.id,
          answer: answer.slice(0, 200),
          realityReconciled: Boolean(reconciliation?.changes.length || reconciliation?.idempotent),
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
    publish, recordMemory, appendSystemTurn, refreshCognitive,
    runIntelligence, ingestSignals,
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
