'use client'

/**
 * ProjectContext — thin wrapper over AppContext for a single project.
 *
 * Provides:
 *  - All project-scoped data (tasks, notes, etc.) filtered by projectId
 *  - sendMessage (real OpenAI chat via /api/chat)
 *  - aiError + retryLastMessage for graceful failure handling
 *  - add* helpers with projectId pre-filled
 *
 * ProjectProvider is rendered by app/(app)/projects/[id]/layout.tsx.
 */

import { createContext, useContext, useState, useCallback } from 'react'
import { useAppContext } from './AppContext'
import { buildChatContext, buildChatHistory } from '@/lib/ai'
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
  aiError:      string | null

  sendMessage:     (content: string) => void
  retryLastMessage:() => void
  dismissError:    () => void
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
  const [isAiTyping, setIsAiTyping]           = useState(false)
  const [aiError, setAiError]                 = useState<string | null>(null)
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null)

  // Derive data from global AppContext
  const tasks        = app.appState.tasks.filter(t => t.projectId === pid)
  const notes        = app.appState.notes.filter(n => n.projectId === pid)
  const decisions    = app.appState.decisions.filter(d => d.projectId === pid)
  const risks        = app.appState.risks.filter(r => r.projectId === pid)
  const roadmapItems = app.appState.roadmapItems
    .filter(r => r.projectId === pid)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const messages     = app.appState.chatMessages[pid] ?? []

  // ── AI call ─────────────────────────────────────────────────────────────────

  /**
   * Calls /api/chat with the user's message + project context + recent history.
   * `history` should be the conversation BEFORE the message being answered.
   */
  const callAi = useCallback(async (userText: string, history: Message[]) => {
    setIsAiTyping(true)
    setAiError(null)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          context: buildChatContext(project, tasks, notes, decisions, risks, roadmapItems),
          history: buildChatHistory(history),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'The AI request failed. Please try again.')
      }

      const data = await res.json() as { reply: string }
      app.addMessage(pid, { id: uid(), role: 'assistant', content: data.reply, createdAt: now() })
      setLastFailedMessage(null)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setLastFailedMessage(userText)
    } finally {
      setIsAiTyping(false)
    }
  }, [app, pid, project, tasks, notes, decisions, risks, roadmapItems])

  const sendMessage = useCallback((content: string) => {
    const userMsg: Message = { id: uid(), role: 'user', content, createdAt: now() }
    app.addMessage(pid, userMsg)
    // history = conversation so far (before this new message)
    callAi(content, messages)
  }, [app, pid, messages, callAi])

  const retryLastMessage = useCallback(() => {
    if (!lastFailedMessage) return
    // The failed user message is already the last item in state — exclude it from history.
    const history = messages[messages.length - 1]?.role === 'user'
      ? messages.slice(0, -1)
      : messages
    callAi(lastFailedMessage, history)
  }, [lastFailedMessage, messages, callAi])

  const dismissError = useCallback(() => setAiError(null), [])

  // ── Converters (pre-fill projectId) ─────────────────────────────────────────

  const addTask        = useCallback((d: NewTask)        => app.addTask({ ...d, projectId: pid }), [app, pid])
  const addNote        = useCallback((d: NewNote)        => app.addNote({ ...d, projectId: pid }), [app, pid])
  const addDecision    = useCallback((d: NewDecision)    => app.addDecision({ ...d, projectId: pid }), [app, pid])
  const addRisk        = useCallback((d: NewRisk)        => app.addRisk({ ...d, projectId: pid }), [app, pid])
  const addRoadmapItem = useCallback((d: NewRoadmapItem) => app.addRoadmapItem({ ...d, projectId: pid }), [app, pid])

  return (
    <ProjectContext.Provider value={{
      project, tasks, notes, decisions, risks, roadmapItems, messages, isAiTyping, aiError,
      sendMessage, retryLastMessage, dismissError,
      addTask, addNote, addDecision, addRisk, addRoadmapItem,
    }}>
      {children}
    </ProjectContext.Provider>
  )
}
