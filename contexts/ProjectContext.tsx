'use client'

/**
 * ProjectContext — thin wrapper over AppContext for a single project.
 *
 * Provides:
 *  - All project-scoped data (tasks, notes, etc.) filtered by projectId
 *  - sendMessage (mock AI chat)
 *  - add* helpers with projectId pre-filled
 *
 * ProjectProvider is rendered by app/(app)/projects/[id]/layout.tsx.
 * Sub-pages call useProjectContext() and get everything they need.
 */

import { createContext, useContext, useState, useCallback } from 'react'
import { useAppContext } from './AppContext'
import { generateMockAiResponse } from '@/lib/mock-ai'
import type {
  Project, Task, Note, Decision, Risk, RoadmapItem, Message,
  TaskStatus, TaskPriority, RiskSeverity, RiskStatus, RoadmapStatus,
} from '@/lib/types'

// ─── Types (re-exported for convenience) ─────────────────────────────────────

export type NewTask        = { title: string; description: string; priority: TaskPriority; status: TaskStatus }
export type NewNote        = { title: string; content: string }
export type NewDecision    = { decision: string; reasoning: string }
export type NewRisk        = { title: string; description: string; severity: RiskSeverity; mitigation: string; status: RiskStatus }
export type NewRoadmapItem = { title: string; description: string; stage: string; status: RoadmapStatus; sortOrder: number }

interface ProjectContextValue {
  project:      Project
  tasks:        Task[]
  notes:        Note[]
  decisions:    Decision[]
  risks:        Risk[]
  roadmapItems: RoadmapItem[]
  messages:     Message[]
  isAiTyping:   boolean

  sendMessage:     (content: string) => void
  addTask:         (data: NewTask)        => Task
  addNote:         (data: NewNote)        => Note
  addDecision:     (data: NewDecision)    => Decision
  addRisk:         (data: NewRisk)        => Risk
  addRoadmapItem:  (data: NewRoadmapItem) => RoadmapItem
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export function useProjectContext(): ProjectContextValue {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProjectContext must be used inside <ProjectProvider>')
  return ctx
}

function uid() { return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}` }
function now() { return new Date().toISOString() }

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ProjectProvider({
  project,
  children,
}: {
  project: Project
  children: React.ReactNode
}) {
  const app = useAppContext()
  const pid = project.id
  const [isAiTyping, setIsAiTyping] = useState(false)

  // Derive data from global AppContext
  const tasks        = app.appState.tasks.filter(t => t.projectId === pid)
  const notes        = app.appState.notes.filter(n => n.projectId === pid)
  const decisions    = app.appState.decisions.filter(d => d.projectId === pid)
  const risks        = app.appState.risks.filter(r => r.projectId === pid)
  const roadmapItems = app.appState.roadmapItems
    .filter(r => r.projectId === pid)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const messages     = app.appState.chatMessages[pid] ?? []

  // ── Chat ────────────────────────────────────────────────────────────────────

  const sendMessage = useCallback((content: string) => {
    const userMsg: Message = { id: uid(), role: 'user', content, createdAt: now() }
    app.addMessage(pid, userMsg)
    setIsAiTyping(true)

    const delay = 600 + Math.random() * 600
    setTimeout(() => {
      const aiMsg: Message = {
        id: uid(),
        role: 'assistant',
        content: generateMockAiResponse(content, project),
        createdAt: now(),
      }
      app.addMessage(pid, aiMsg)
      setIsAiTyping(false)
    }, delay)
  }, [app, pid, project])

  // ── Converters (pre-fill projectId) ─────────────────────────────────────────

  const addTask        = useCallback((d: NewTask)        => app.addTask({ ...d, projectId: pid }), [app, pid])
  const addNote        = useCallback((d: NewNote)        => app.addNote({ ...d, projectId: pid }), [app, pid])
  const addDecision    = useCallback((d: NewDecision)    => app.addDecision({ ...d, projectId: pid }), [app, pid])
  const addRisk        = useCallback((d: NewRisk)        => app.addRisk({ ...d, projectId: pid }), [app, pid])
  const addRoadmapItem = useCallback((d: NewRoadmapItem) => app.addRoadmapItem({ ...d, projectId: pid }), [app, pid])

  return (
    <ProjectContext.Provider value={{
      project, tasks, notes, decisions, risks, roadmapItems, messages, isAiTyping,
      sendMessage, addTask, addNote, addDecision, addRisk, addRoadmapItem,
    }}>
      {children}
    </ProjectContext.Provider>
  )
}
