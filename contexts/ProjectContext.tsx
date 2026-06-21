'use client'

/**
 * ProjectContext — thin wrapper over AppContext for a single project.
 *
 * Provides:
 *  - All project-scoped data (tasks, notes, etc.) filtered by projectId
 *  - sendMessage: persists the user message to Supabase, calls /api/chat with
 *    project context, then persists the assistant reply to Supabase
 *  - aiError + retryLastMessage for graceful failure handling
 *  - add* converters with projectId (and optional source message link) pre-filled
 */

import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { useAppContext } from './AppContext'
import { createClient } from '@/lib/supabase/client'
import * as db from '@/lib/db'
import { buildChatContext, buildChatHistory } from '@/lib/ai'
import { collectProjectEntityIds, getProjectLinks, buildLabelResolver, summarizeLinks } from '@/lib/links'
import type {
  Project, Task, Note, Decision, Risk, RoadmapItem, Message, ProjectReview,
  TaskStatus, TaskPriority, RiskSeverity, RiskStatus, RoadmapStatus,
} from '@/lib/types'

// ─── Converter payload types ─────────────────────────────────────────────────

export type NewTask        = { title: string; description: string; priority: TaskPriority; status: TaskStatus; sourceMessageId?: string }
export type NewNote        = { title: string; content: string; sourceMessageId?: string }
export type NewDecision    = { decision: string; reasoning: string; sourceMessageId?: string }
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

  // Project reviews
  reviews:        ProjectReview[]
  reviewsLoading: boolean
  reviewsError:   string | null
  prependReview:  (review: ProjectReview) => void
  reloadReviews:  () => Promise<void>

  sendMessage:     (content: string) => void
  retryLastMessage:() => void
  dismissError:    () => void
  addTask:         (data: NewTask)        => Promise<Task>
  addNote:         (data: NewNote)        => Promise<Note>
  addDecision:     (data: NewDecision)    => Promise<Decision>
  addRisk:         (data: NewRisk)        => Promise<Risk>
  addRoadmapItem:  (data: NewRoadmapItem) => Promise<RoadmapItem>
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export function useProjectContext(): ProjectContextValue {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProjectContext must be used inside <ProjectProvider>')
  return ctx
}

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
  const supabase = useMemo(() => createClient(), [])
  const [isAiTyping, setIsAiTyping]           = useState(false)
  const [aiError, setAiError]                 = useState<string | null>(null)
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null)

  // ── Project reviews ──────────────────────────────────────────────────────────
  const [reviews, setReviews]               = useState<ProjectReview[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [reviewsError, setReviewsError]     = useState<string | null>(null)

  const reloadReviews = useCallback(async () => {
    setReviewsLoading(true)
    setReviewsError(null)
    try {
      setReviews(await db.loadProjectReviews(supabase, pid))
    } catch (err) {
      console.error('[FounderOS] failed to load project reviews:', err)
      setReviewsError(err instanceof Error ? err.message : 'Failed to load reviews.')
    } finally {
      setReviewsLoading(false)
    }
  }, [supabase, pid])

  useEffect(() => { void reloadReviews() }, [reloadReviews])

  const prependReview = useCallback((review: ProjectReview) => {
    setReviews(prev => [review, ...prev])
  }, [])

  // Derive data from global AppContext
  const tasks        = app.appState.tasks.filter(t => t.projectId === pid)
  const notes        = app.appState.notes.filter(n => n.projectId === pid)
  const decisions    = app.appState.decisions.filter(d => d.projectId === pid)
  const risks        = app.appState.risks.filter(r => r.projectId === pid)
  const roadmapItems = app.appState.roadmapItems
    .filter(r => r.projectId === pid)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const projectFiles = app.appState.projectFiles.filter(f => f.projectId === pid)
  const messages     = app.appState.chatMessages[pid] ?? []

  // ── AI request ──────────────────────────────────────────────────────────────

  /** Call /api/chat for an answer to `userText`, given prior `history`. */
  const requestAssistant = useCallback(async (userText: string, history: Message[]) => {
    setIsAiTyping(true)
    setAiError(null)
    try {
      const linkedMemory = summarizeLinks(
        getProjectLinks(app.appState.links, collectProjectEntityIds(app.appState, pid)),
        buildLabelResolver(app.appState),
      )
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          context: buildChatContext(project, tasks, notes, decisions, risks, roadmapItems, linkedMemory, projectFiles),
          history: buildChatHistory(history),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'The AI request failed. Please try again.')
      }
      const data = await res.json() as { reply: string }
      await app.addMessage(pid, 'assistant', data.reply)
      setLastFailedMessage(null)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setLastFailedMessage(userText)
    } finally {
      setIsAiTyping(false)
    }
  }, [app, pid, project, tasks, notes, decisions, risks, roadmapItems, projectFiles])

  const sendMessage = useCallback((content: string) => {
    const historyBefore = messages
    void (async () => {
      try {
        await app.addMessage(pid, 'user', content)
      } catch {
        setAiError('Could not save your message. Please try again.')
        setLastFailedMessage(content)
        return
      }
      await requestAssistant(content, historyBefore)
    })()
  }, [app, pid, messages, requestAssistant])

  const retryLastMessage = useCallback(() => {
    if (!lastFailedMessage) return
    // The failed user message is already persisted — exclude it from history.
    const history = messages[messages.length - 1]?.role === 'user'
      ? messages.slice(0, -1)
      : messages
    void requestAssistant(lastFailedMessage, history)
  }, [lastFailedMessage, messages, requestAssistant])

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
      reviews, reviewsLoading, reviewsError, prependReview, reloadReviews,
      sendMessage, retryLastMessage, dismissError,
      addTask, addNote, addDecision, addRisk, addRoadmapItem,
    }}>
      {children}
    </ProjectContext.Provider>
  )
}
