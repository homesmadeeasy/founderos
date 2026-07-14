'use client'

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react'
import { useAppContext } from '@/contexts/AppContext'
import { useMemoryEngine } from '@/contexts/MemoryEngineContext'
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

interface ConversationContextValue {
  ready: boolean
  session: ConversationSession | null
  store: ConversationStore
  proactiveMessage: string
  proactiveEvidence: ReturnType<typeof getProactiveHomeMessage>['evidence']
  proactiveDismissed: boolean
  questionChips: readonly string[]
  isTyping: boolean
  composerFocusRef: React.RefObject<HTMLTextAreaElement | null>
  start: (topic?: ConversationTopic) => ConversationSession
  continueSession: () => ConversationSession
  reply: (answer: string, questionId?: string) => Promise<void>
  dismissProactive: () => void
  refresh: () => void
  handleActionCard: (action: string, turnId: string) => void
  startValidationSprint: () => Promise<void>
}

const ConversationContext = createContext<ConversationContextValue | null>(null)

export function ConversationProvider({ children }: { children: React.ReactNode }) {
  const founderInput = useFounderInput()
  const userName = useUserDisplayName()
  const { worldModel, hydrated } = useCognitiveModel()
  const { appState, createProject, addTask } = useAppContext()
  const { recordMemory } = useMemoryEngine()
  const { publish } = useFounderKernel()
  const [session, setSession] = useState<ConversationSession | null>(null)
  const [store, setStore] = useState<ConversationStore>(() => loadConversationStore())
  const [isTyping, setIsTyping] = useState(false)
  const [ready, setReady] = useState(false)
  const composerFocusRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    setStore(loadConversationStore())
    const active = loadConversationStore().sessions.find(s => s.status === 'active')
    setSession(active ?? null)
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
    setIsTyping(true)
    await new Promise(r => setTimeout(r, 450))
    const result = submitAnswer(
      { sessionId: session.id, answer, questionId },
      founderInput,
      userName,
    )
    setIsTyping(false)
    if (!result) return

    setSession(result.session)
    setStore(getConversationStore())

    void publish({
      type: 'ConversationAnswered',
      source: 'conversation-engine',
      payload: {
        sessionId: result.session.id,
        questionId: questionId ?? result.session.nextQuestion?.id,
        answer: answer.slice(0, 200),
      },
    })

    const meaningful = isMeaningfulUserAnswer(answer)
    if (result.memoryWrite && result.memoryWrite.confidence >= 65 && meaningful) {
      const mem = recordMemory({
        type: 'conversation',
        title: result.memoryWrite.title,
        content: result.memoryWrite.content,
        importance: 'medium',
        area: 'systems',
        source: 'assistant',
        relatedObjectIds: [],
        tags: ['founder-ai', 'conversation', `dedupe:conv-${result.session.id}`],
      })
      if (mem) {
        void publish({
          type: 'ConversationMemoryCreated',
          source: 'conversation-engine',
          payload: { sessionId: result.session.id, memoryId: mem.id, title: mem.title },
        })
      }
    }

    if (result.knowledgeSuggestion && meaningful) {
      void publish({
        type: 'ConversationKnowledgeSuggested',
        source: 'conversation-engine',
        payload: { sessionId: result.session.id, suggestion: result.knowledgeSuggestion },
      })
    }

    if (result.session.status === 'finished' && result.session.summary) {
      void publish({
        type: 'ConversationFinished',
        source: 'conversation-engine',
        payload: { sessionId: result.session.id },
      })
      void publish({
        type: 'ConversationSummaryCreated',
        source: 'conversation-engine',
        payload: { sessionId: result.session.id, summaryId: result.session.summary.id },
      })
    }
  }, [session, founderInput, userName, publish, recordMemory])

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

  const value = useMemo<ConversationContextValue>(() => ({
    ready,
    session,
    store,
    proactiveMessage: proactive.message,
    proactiveEvidence: proactive.evidence,
    proactiveDismissed: proactive.dismissed,
    questionChips: getQuestionChips(),
    isTyping,
    composerFocusRef,
    start,
    continueSession,
    reply,
    dismissProactive: dismissProactiveFn,
    refresh,
    handleActionCard: handleActionCardFn,
    startValidationSprint,
  }), [
    ready, session, store, proactive, isTyping,
    start, continueSession, reply, dismissProactiveFn, refresh,
    handleActionCardFn, startValidationSprint,
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
