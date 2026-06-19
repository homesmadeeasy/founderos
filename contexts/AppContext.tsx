'use client'

/**
 * AppContext — Global app state backed by Supabase.
 *
 * Architecture:
 *   AppProvider wraps app/(app)/layout.tsx (which already guarantees a logged-in
 *   user) and receives that user's id.
 *
 *   On mount it loads all of the user's data from Supabase (RLS scopes it to
 *   them) into one in-memory AppState. Every mutation writes to Supabase and
 *   updates the in-memory state so the UI stays instant:
 *     - creates  → await the insert (we need the DB-generated id), then add
 *     - updates  → optimistic local update + persist
 *     - deletes  → optimistic local remove + persist
 *
 *   The public interface matches the old localStorage version, except mutations
 *   are now async (they return Promises).
 */

import {
  createContext, useContext, useState, useEffect, useCallback, useMemo,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import * as db from '@/lib/db'
import type {
  AppState, Project, Task, Note, Decision, Risk, RoadmapItem, Message,
  ProjectStatus, ProjectPriority, TaskStatus, TaskPriority,
  RiskSeverity, RiskStatus, RoadmapStatus, MessageRole,
} from '@/lib/types'

// ─── Insert payload types ───────────────────────────────────────────────────

export type NewProject = {
  title: string
  description: string
  goal: string
  status: ProjectStatus
  priority: ProjectPriority
  progress: number
}

export type NewTask = {
  projectId: string
  title: string
  description: string
  priority: TaskPriority
  status: TaskStatus
  dueDate?: string
  sourceMessageId?: string
}

export type NewNote      = { projectId: string; title: string; content: string; sourceMessageId?: string }
export type NewDecision  = { projectId: string; decision: string; reasoning: string; sourceMessageId?: string }
export type NewRisk      = { projectId: string; title: string; description: string; severity: RiskSeverity; mitigation: string; status: RiskStatus }
export type NewRoadmapItem = { projectId: string; title: string; description: string; stage: string; status: RoadmapStatus; sortOrder: number }

interface AppContextValue {
  appState: AppState
  isHydrated: boolean
  loadError: string | null

  // Projects
  createProject:    (data: NewProject) => Promise<Project>
  updateProject:    (id: string, data: Partial<Omit<Project, 'id' | 'createdAt'>>) => Promise<void>
  deleteProject:    (id: string) => Promise<void>

  // Tasks
  addTask:          (data: NewTask) => Promise<Task>
  updateTask:       (id: string, data: Partial<Task>) => Promise<void>
  deleteTask:       (id: string) => Promise<void>

  // Notes
  addNote:          (data: NewNote) => Promise<Note>
  deleteNote:       (id: string) => Promise<void>

  // Decisions
  addDecision:      (data: NewDecision) => Promise<Decision>
  deleteDecision:   (id: string) => Promise<void>

  // Risks
  addRisk:          (data: NewRisk) => Promise<Risk>
  updateRisk:       (id: string, data: Partial<Risk>) => Promise<void>
  deleteRisk:       (id: string) => Promise<void>

  // Roadmap
  addRoadmapItem:   (data: NewRoadmapItem) => Promise<RoadmapItem>
  updateRoadmapItem:(id: string, data: Partial<RoadmapItem>) => Promise<void>
  deleteRoadmapItem:(id: string) => Promise<void>

  // Chat
  addMessage:       (projectId: string, role: MessageRole, content: string) => Promise<Message>
}

// ─── Context ──────────────────────────────────────────────────────────────────

const EMPTY_STATE: AppState = {
  projects: [], tasks: [], notes: [], decisions: [], risks: [], roadmapItems: [], chatMessages: {},
}

const AppContext = createContext<AppContextValue | null>(null)

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used inside <AppProvider>')
  return ctx
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), [])
  const [appState, setAppState] = useState<AppState>(EMPTY_STATE)
  const [isHydrated, setIsHydrated] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Initial load
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const state = await db.loadAppState(supabase)
        if (!cancelled) setAppState(state)
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load your data.')
      } finally {
        if (!cancelled) setIsHydrated(true)
      }
    })()
    return () => { cancelled = true }
  }, [supabase, userId])

  const patch = useCallback((updater: (prev: AppState) => AppState) => setAppState(updater), [])

  // ── Projects ──────────────────────────────────────────────────────────────

  const createProject = useCallback(async (data: NewProject): Promise<Project> => {
    const project = await db.createProject(supabase, userId, data)
    patch(s => ({ ...s, projects: [project, ...s.projects] }))
    return project
  }, [supabase, userId, patch])

  const updateProject = useCallback(async (id: string, data: Partial<Omit<Project, 'id' | 'createdAt'>>) => {
    patch(s => ({ ...s, projects: s.projects.map(p => p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p) }))
    await db.updateProject(supabase, id, data)
  }, [supabase, patch])

  const deleteProject = useCallback(async (id: string) => {
    patch(s => ({
      ...s,
      projects:     s.projects.filter(p => p.id !== id),
      tasks:        s.tasks.filter(t => t.projectId !== id),
      notes:        s.notes.filter(n => n.projectId !== id),
      decisions:    s.decisions.filter(d => d.projectId !== id),
      risks:        s.risks.filter(r => r.projectId !== id),
      roadmapItems: s.roadmapItems.filter(r => r.projectId !== id),
      chatMessages: Object.fromEntries(Object.entries(s.chatMessages).filter(([k]) => k !== id)),
    }))
    await db.deleteProject(supabase, id)
  }, [supabase, patch])

  // ── Tasks ──────────────────────────────────────────────────────────────────

  const addTask = useCallback(async (data: NewTask): Promise<Task> => {
    const item = await db.createTask(supabase, userId, data)
    patch(s => ({ ...s, tasks: [item, ...s.tasks] }))
    return item
  }, [supabase, userId, patch])

  const updateTask = useCallback(async (id: string, data: Partial<Task>) => {
    patch(s => ({ ...s, tasks: s.tasks.map(t => t.id === id ? { ...t, ...data } : t) }))
    await db.updateTask(supabase, id, data)
  }, [supabase, patch])

  const deleteTask = useCallback(async (id: string) => {
    patch(s => ({ ...s, tasks: s.tasks.filter(t => t.id !== id) }))
    await db.deleteTask(supabase, id)
  }, [supabase, patch])

  // ── Notes ──────────────────────────────────────────────────────────────────

  const addNote = useCallback(async (data: NewNote): Promise<Note> => {
    const item = await db.createNote(supabase, userId, data)
    patch(s => ({ ...s, notes: [item, ...s.notes] }))
    return item
  }, [supabase, userId, patch])

  const deleteNote = useCallback(async (id: string) => {
    patch(s => ({ ...s, notes: s.notes.filter(n => n.id !== id) }))
    await db.deleteNote(supabase, id)
  }, [supabase, patch])

  // ── Decisions ─────────────────────────────────────────────────────────────

  const addDecision = useCallback(async (data: NewDecision): Promise<Decision> => {
    const item = await db.createDecision(supabase, userId, data)
    patch(s => ({ ...s, decisions: [item, ...s.decisions] }))
    return item
  }, [supabase, userId, patch])

  const deleteDecision = useCallback(async (id: string) => {
    patch(s => ({ ...s, decisions: s.decisions.filter(d => d.id !== id) }))
    await db.deleteDecision(supabase, id)
  }, [supabase, patch])

  // ── Risks ──────────────────────────────────────────────────────────────────

  const addRisk = useCallback(async (data: NewRisk): Promise<Risk> => {
    const item = await db.createRisk(supabase, userId, data)
    patch(s => ({ ...s, risks: [item, ...s.risks] }))
    return item
  }, [supabase, userId, patch])

  const updateRisk = useCallback(async (id: string, data: Partial<Risk>) => {
    patch(s => ({ ...s, risks: s.risks.map(r => r.id === id ? { ...r, ...data } : r) }))
    await db.updateRisk(supabase, id, data)
  }, [supabase, patch])

  const deleteRisk = useCallback(async (id: string) => {
    patch(s => ({ ...s, risks: s.risks.filter(r => r.id !== id) }))
    await db.deleteRisk(supabase, id)
  }, [supabase, patch])

  // ── Roadmap ───────────────────────────────────────────────────────────────

  const addRoadmapItem = useCallback(async (data: NewRoadmapItem): Promise<RoadmapItem> => {
    const item = await db.createRoadmapItem(supabase, userId, data)
    patch(s => ({ ...s, roadmapItems: [...s.roadmapItems, item] }))
    return item
  }, [supabase, userId, patch])

  const updateRoadmapItem = useCallback(async (id: string, data: Partial<RoadmapItem>) => {
    patch(s => ({ ...s, roadmapItems: s.roadmapItems.map(r => r.id === id ? { ...r, ...data } : r) }))
    await db.updateRoadmapItem(supabase, id, data)
  }, [supabase, patch])

  const deleteRoadmapItem = useCallback(async (id: string) => {
    patch(s => ({ ...s, roadmapItems: s.roadmapItems.filter(r => r.id !== id) }))
    await db.deleteRoadmapItem(supabase, id)
  }, [supabase, patch])

  // ── Chat ──────────────────────────────────────────────────────────────────

  const addMessage = useCallback(async (projectId: string, role: MessageRole, content: string): Promise<Message> => {
    const message = await db.createMessage(supabase, userId, projectId, role, content)
    patch(s => ({
      ...s,
      chatMessages: { ...s.chatMessages, [projectId]: [...(s.chatMessages[projectId] ?? []), message] },
    }))
    return message
  }, [supabase, userId, patch])

  return (
    <AppContext.Provider value={{
      appState, isHydrated, loadError,
      createProject, updateProject, deleteProject,
      addTask, updateTask, deleteTask,
      addNote, deleteNote,
      addDecision, deleteDecision,
      addRisk, updateRisk, deleteRisk,
      addRoadmapItem, updateRoadmapItem, deleteRoadmapItem,
      addMessage,
    }}>
      {children}
    </AppContext.Provider>
  )
}
