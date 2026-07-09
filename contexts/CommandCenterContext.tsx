'use client'

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react'
import { generateDailyBriefing } from '@/lib/command-center/briefingLogic'
import { generateAssistantResponse } from '@/lib/command-center/assistantLogic'
import { loadCommandCenterState, saveCommandCenterState } from '@/lib/command-center/storage'
import { useObjectEngine } from '@/contexts/ObjectEngineContext'
import { useMemoryEngine } from '@/contexts/MemoryEngineContext'
import { useExecutiveEngine } from '@/contexts/ExecutiveEngineContext'
import { useKnowledgeEngine } from '@/contexts/KnowledgeEngineContext'
import { useMorningExecution } from '@/contexts/MorningExecutionContext'
import { useEveningReview } from '@/contexts/EveningReviewContext'
import { useUniversalCapture } from '@/contexts/UniversalCaptureContext'
import { useSignalEngine } from '@/contexts/SignalEngineContext'
import { useSyncEngine } from '@/contexts/SyncEngineContext'
import type { CaptureAssistantSnapshot, ExecutiveAssistantSnapshot, EveningAssistantSnapshot, MorningAssistantSnapshot, SignalAssistantSnapshot, SyncAssistantSnapshot } from '@/lib/command-center/assistantLogic'
import { getOutcomeStats, getYesterdayOutcome } from '@/lib/outcome-engine/outcomeEngine'
import { isSyncableStatus } from '@/lib/source-adapters/adapterRegistry'
import {
  memoryForCapture, memoryForHealthLog, memoryForMissionSet,
  memoryForProjectAdded, memoryForTaskAdded, memoryForTaskUpdated,
} from '@/lib/memory-engine/commandCenterMemoryBridge'
import type {
  CCAIMessage, CCCaptureItem, CCDailyLog, CCProject, CCTask,
  CaptureType, CommandCenterState, LifeArea, ProjectStatus, TaskPriority, TaskStatus,
} from '@/lib/command-center/types'
import { newId, nowISO, todayISO } from '@/lib/command-center/utils'

interface CommandCenterContextValue {
  ready: boolean
  state: CommandCenterState
  briefing: string
  todayLog: CCDailyLog | null
  setMission: (mission: string) => void
  addTask: (input: Omit<CCTask, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateTask: (id: string, patch: Partial<CCTask>) => void
  deleteTask: (id: string) => void
  addProject: (input: Omit<CCProject, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateProject: (id: string, patch: Partial<CCProject>) => void
  deleteProject: (id: string) => void
  upsertTodayLog: (patch: Partial<Omit<CCDailyLog, 'id' | 'date' | 'createdAt' | 'updatedAt'>>) => void
  addCapture: (type: CaptureType, content: string) => void
  updateCapture: (id: string, patch: Partial<CCCaptureItem>) => void
  deleteCapture: (id: string) => void
  askAssistant: (prompt: string) => Promise<void>
  clearAssistant: () => void
}

const CommandCenterContext = createContext<CommandCenterContextValue | null>(null)

function persist(state: CommandCenterState): CommandCenterState {
  saveCommandCenterState(state)
  return state
}

export function CommandCenterProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CommandCenterState | null>(null)
  const objectEngine = useObjectEngine()
  const memoryEngine = useMemoryEngine()
  const executiveEngine = useExecutiveEngine()
  const knowledgeEngine = useKnowledgeEngine()
  const morningExecution = useMorningExecution()
  const eveningReview = useEveningReview()
  const universalCapture = useUniversalCapture()
  const signalEngine = useSignalEngine()
  const syncEngine = useSyncEngine()

  useEffect(() => {
    setState(loadCommandCenterState())
  }, [])

  const update = useCallback((fn: (prev: CommandCenterState) => CommandCenterState) => {
    setState(prev => {
      if (!prev) return prev
      return persist(fn(prev))
    })
  }, [])

  const setMission = useCallback((mission: string) => {
    const today = todayISO()
    update(s => ({ ...s, mission, missionDate: today }))
    const mem = memoryForMissionSet(mission)
    if (mem) memoryEngine.recordMemory(mem)
  }, [update, memoryEngine])

  const addTask = useCallback((input: Omit<CCTask, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = nowISO()
    const task: CCTask = { ...input, id: newId(), createdAt: now, updatedAt: now }
    update(s => ({ ...s, tasks: [task, ...s.tasks] }))
    objectEngine.syncTaskFromCommandCenter(task)
    memoryEngine.recordMemory(memoryForTaskAdded(task))
  }, [update, objectEngine, memoryEngine])

  const updateTask = useCallback((id: string, patch: Partial<CCTask>) => {
    update(s => {
      const next = s.tasks.map(t => t.id === id ? { ...t, ...patch, updatedAt: nowISO() } : t)
      const task = next.find(t => t.id === id)
      if (task) {
        objectEngine.syncTaskFromCommandCenter(task)
        const mem = memoryForTaskUpdated(task, patch)
        if (mem) memoryEngine.recordMemory(mem)
      }
      return { ...s, tasks: next }
    })
  }, [update, objectEngine, memoryEngine])

  const deleteTask = useCallback((id: string) => {
    update(s => ({ ...s, tasks: s.tasks.filter(t => t.id !== id) }))
    objectEngine.syncDeleteFromCommandCenter(id)
  }, [update, objectEngine, memoryEngine])

  const addProject = useCallback((input: Omit<CCProject, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = nowISO()
    const project: CCProject = { ...input, id: newId(), createdAt: now, updatedAt: now }
    update(s => ({ ...s, projects: [project, ...s.projects] }))
    objectEngine.syncProjectFromCommandCenter(project)
    memoryEngine.recordMemory(memoryForProjectAdded(project))
  }, [update, objectEngine, memoryEngine])

  const updateProject = useCallback((id: string, patch: Partial<CCProject>) => {
    update(s => {
      const next = s.projects.map(p => p.id === id ? { ...p, ...patch, updatedAt: nowISO() } : p)
      const project = next.find(p => p.id === id)
      if (project) objectEngine.syncProjectFromCommandCenter(project)
      return { ...s, projects: next }
    })
  }, [update, objectEngine, memoryEngine])

  const deleteProject = useCallback((id: string) => {
    update(s => ({
      ...s,
      projects: s.projects.filter(p => p.id !== id),
      tasks: s.tasks.map(t => t.projectId === id ? { ...t, projectId: null, updatedAt: nowISO() } : t),
    }))
    objectEngine.syncDeleteFromCommandCenter(id)
  }, [update, objectEngine, memoryEngine])

  const upsertTodayLog = useCallback((patch: Partial<Omit<CCDailyLog, 'id' | 'date' | 'createdAt' | 'updatedAt'>>) => {
    const today = todayISO()
    const now = nowISO()
    const hasHealthData = (
      'sleepHours' in patch || 'weight' in patch || 'proteinGrams' in patch
      || 'waterLitres' in patch || 'workoutCompleted' in patch
    )
    update(s => {
      const existing = s.dailyLogs.find(l => l.date === today)
      let entry: CCDailyLog
      if (existing) {
        entry = { ...existing, ...patch, updatedAt: now }
        if (hasHealthData) memoryEngine.recordMemory(memoryForHealthLog(entry))
        return {
          ...s,
          dailyLogs: s.dailyLogs.map(l => l.date === today ? entry : l),
        }
      }
      entry = {
        id: newId(),
        date: today,
        sleepHours: null,
        weight: null,
        proteinGrams: null,
        waterLitres: null,
        workoutCompleted: false,
        mood: '',
        reflection: '',
        createdAt: now,
        updatedAt: now,
        ...patch,
      }
      if (hasHealthData) memoryEngine.recordMemory(memoryForHealthLog(entry))
      return { ...s, dailyLogs: [entry, ...s.dailyLogs] }
    })
  }, [update, memoryEngine])

  const addCapture = useCallback((type: CaptureType, content: string) => {
    const now = nowISO()
    const capture: CCCaptureItem = { id: newId(), type, content, status: 'inbox', createdAt: now }
    update(s => ({ ...s, captureItems: [capture, ...s.captureItems] }))
    objectEngine.syncCaptureFromCommandCenter(capture)
    memoryEngine.recordMemory(memoryForCapture(capture))
  }, [update, objectEngine, memoryEngine])

  const updateCapture = useCallback((id: string, patch: Partial<CCCaptureItem>) => {
    update(s => {
      const next = s.captureItems.map(c => c.id === id ? { ...c, ...patch } : c)
      const capture = next.find(c => c.id === id)
      if (capture) objectEngine.syncCaptureFromCommandCenter(capture)
      return { ...s, captureItems: next }
    })
  }, [update, objectEngine, memoryEngine])

  const deleteCapture = useCallback((id: string) => {
    update(s => ({ ...s, captureItems: s.captureItems.filter(c => c.id !== id) }))
    objectEngine.syncDeleteFromCommandCenter(id)
  }, [update, objectEngine, memoryEngine])

  const askAssistant = useCallback(async (prompt: string) => {
    const trimmed = prompt.trim()
    if (!trimmed) return

    const normalized = trimmed.toLowerCase()
    const shouldSyncAll = ['sync my signal', 'sync signals', 'sync sources', 'run sync']
      .some(k => normalized.includes(k))
    const shouldSyncCalendar = ['sync my calendar', 'sync calendar']
      .some(k => normalized.includes(k))
    if (shouldSyncAll) {
      await syncEngine.syncAll()
    } else if (shouldSyncCalendar) {
      const calendarIds = ['calendar', 'google-calendar'] as const
      for (const id of calendarIds) {
        const adapter = syncEngine.adapters.find(a => a.adapterId === id)
        if (adapter && (adapter.status === 'mock' || adapter.status === 'connected')) {
          await syncEngine.syncNow(id)
        }
      }
    }

    setState(prev => {
      if (!prev) return prev
      const userMsg: CCAIMessage = { id: newId(), role: 'user', content: trimmed, createdAt: nowISO() }
      const withUser = { ...prev, aiMessages: [...prev.aiMessages, userMsg] }
      const executiveSnapshot: ExecutiveAssistantSnapshot | null = executiveEngine.ready
        ? {
            topFocus: executiveEngine.getTopFocus(),
            briefing: executiveEngine.dailyBriefing,
            recommendations: executiveEngine.recommendations,
            warnings: executiveEngine.getWarnings(),
          }
        : null
      const morningSnapshot: MorningAssistantSnapshot = {
        morningPlan: morningExecution.morningPlan,
        reasoningOutput: morningExecution.reasoningOutput,
        firstAction: morningExecution.getFirstAction(),
        decisionOutput: morningExecution.decisionOutput,
        outcomeStats: getOutcomeStats(),
        yesterdayOutcome: getYesterdayOutcome(),
        regenerate: () => morningExecution.regenerateMorningPlan(true),
      }
      const eveningSnapshot: EveningAssistantSnapshot = {
        eveningReview: eveningReview.eveningReview,
        dailyLearningLoop: eveningReview.dailyLearningLoop,
        tomorrowContext: eveningReview.tomorrowContext,
      }
      const captureSnapshot: CaptureAssistantSnapshot = {
        todaySignals: universalCapture.todaySignals,
        unprocessedCount: universalCapture.unprocessedCount,
      }
      const signalSnapshot: SignalAssistantSnapshot = {
        signals: signalEngine.signals,
        todaySignals: signalEngine.todaySignals,
        morningNotes: signalEngine.morningNotes,
        summary: signalEngine.summary,
      }
      const syncSnapshot: SyncAssistantSnapshot = {
        adapters: syncEngine.adapters,
        lastGlobalSyncLabel: syncEngine.lastGlobalSyncLabel,
        connectedCount: syncEngine.adapters.filter(a => isSyncableStatus(a.status)).length,
      }
      if (!morningSnapshot.morningPlan && morningExecution.ready) {
        morningExecution.regenerateMorningPlan(true)
      }
      const reply = generateAssistantResponse(
        withUser,
        trimmed,
        objectEngine.objects,
        memoryEngine.memories,
        executiveSnapshot,
        knowledgeEngine.knowledge,
        morningSnapshot,
        eveningSnapshot,
        captureSnapshot,
        signalSnapshot,
        syncSnapshot,
      )
      const assistantMsg: CCAIMessage = { id: newId(), role: 'assistant', content: reply, createdAt: nowISO() }
      return persist({ ...withUser, aiMessages: [...withUser.aiMessages, assistantMsg] })
    })
  }, [objectEngine.objects, memoryEngine.memories, executiveEngine, knowledgeEngine.knowledge, morningExecution, eveningReview, universalCapture, signalEngine, syncEngine])

  const clearAssistant = useCallback(() => {
    update(s => ({ ...s, aiMessages: [] }))
  }, [update])

  const todayLog = useMemo(() => {
    if (!state) return null
    const today = todayISO()
    return state.dailyLogs.find(l => l.date === today) ?? null
  }, [state])

  const briefing = useMemo(() => {
    if (!state) return ''
    return generateDailyBriefing(state)
  }, [state])

  const value = useMemo<CommandCenterContextValue | null>(() => {
    if (!state) return null
    return {
      ready: true,
      state,
      briefing,
      todayLog,
      setMission,
      addTask,
      updateTask,
      deleteTask,
      addProject,
      updateProject,
      deleteProject,
      upsertTodayLog,
      addCapture,
      updateCapture,
      deleteCapture,
      askAssistant,
      clearAssistant,
    }
  }, [
    state, briefing, todayLog,
    setMission, addTask, updateTask, deleteTask,
    addProject, updateProject, deleteProject,
    upsertTodayLog, addCapture, updateCapture, deleteCapture,
    askAssistant, clearAssistant,
  ])

  if (!value) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-sm text-zinc-400">Loading command center…</p>
      </div>
    )
  }

  return (
    <CommandCenterContext.Provider value={value}>
      {children}
    </CommandCenterContext.Provider>
  )
}

export function useCommandCenter() {
  const ctx = useContext(CommandCenterContext)
  if (!ctx) throw new Error('useCommandCenter must be used within CommandCenterProvider')
  return ctx
}

export type {
  LifeArea, ProjectStatus, TaskPriority, TaskStatus,
}
