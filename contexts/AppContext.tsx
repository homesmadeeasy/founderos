'use client'

/**
 * AppContext — Global app state with localStorage persistence.
 *
 * Architecture:
 *   AppProvider wraps app/(app)/layout.tsx so every page has access.
 *   State is initialised from localStorage on mount (falls back to mock data).
 *   Every mutation saves the full state to localStorage immediately.
 *
 * When Supabase is connected:
 *   Replace the useState + localStorage logic with SWR/React Query + Supabase calls.
 *   The context interface (createProject, addTask, etc.) stays the same.
 */

import {
  createContext, useContext, useState, useEffect, useCallback,
} from 'react'
import { getInitialAppState } from '@/lib/mock-data'
import type {
  AppState, Project, Task, Note, Decision, Risk, RoadmapItem, Message,
  ProjectStatus, ProjectPriority, TaskStatus, TaskPriority,
  RiskSeverity, RiskStatus, RoadmapStatus,
} from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

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
}

export type NewNote      = { projectId: string; title: string; content: string }
export type NewDecision  = { projectId: string; decision: string; reasoning: string }
export type NewRisk      = { projectId: string; title: string; description: string; severity: RiskSeverity; mitigation: string; status: RiskStatus }
export type NewRoadmapItem = { projectId: string; title: string; description: string; stage: string; status: RoadmapStatus; sortOrder: number }

interface AppContextValue {
  appState: AppState
  isHydrated: boolean

  // Projects
  createProject:    (data: NewProject) => Project
  updateProject:    (id: string, data: Partial<Omit<Project, 'id' | 'createdAt'>>) => void
  deleteProject:    (id: string) => void

  // Tasks
  addTask:          (data: NewTask) => Task
  updateTask:       (id: string, data: Partial<Task>) => void
  deleteTask:       (id: string) => void

  // Notes
  addNote:          (data: NewNote) => Note
  deleteNote:       (id: string) => void

  // Decisions
  addDecision:      (data: NewDecision) => Decision
  deleteDecision:   (id: string) => void

  // Risks
  addRisk:          (data: NewRisk) => Risk
  updateRisk:       (id: string, data: Partial<Risk>) => void
  deleteRisk:       (id: string) => void

  // Roadmap
  addRoadmapItem:   (data: NewRoadmapItem) => RoadmapItem
  updateRoadmapItem:(id: string, data: Partial<RoadmapItem>) => void
  deleteRoadmapItem:(id: string) => void

  // Chat
  addMessage:       (projectId: string, message: Message) => void
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'founderos_v1'

function loadFromStorage(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AppState) : null
  } catch {
    return null
  }
}

function saveToStorage(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch { /* storage full or unavailable */ }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

function now(): string {
  return new Date().toISOString()
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextValue | null>(null)

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used inside <AppProvider>')
  return ctx
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [appState, setAppState] = useState<AppState>(getInitialAppState)
  const [isHydrated, setIsHydrated] = useState(false)

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    const stored = loadFromStorage()
    if (stored) setAppState(stored)
    setIsHydrated(true)
  }, [])

  // Persist every state change
  useEffect(() => {
    if (isHydrated) saveToStorage(appState)
  }, [appState, isHydrated])

  /** Immutably update state and persist */
  const update = useCallback((updater: (prev: AppState) => AppState) => {
    setAppState(updater)
  }, [])

  // ── Projects ──────────────────────────────────────────────────────────────

  const createProject = useCallback((data: NewProject): Project => {
    const project: Project = {
      id: `${slugify(data.title)}-${uid()}`,
      ...data,
      createdAt: now(),
      updatedAt: now(),
    }
    update(s => ({ ...s, projects: [project, ...s.projects] }))
    return project
  }, [update])

  const updateProject = useCallback((id: string, data: Partial<Omit<Project, 'id' | 'createdAt'>>) => {
    update(s => ({
      ...s,
      projects: s.projects.map(p =>
        p.id === id ? { ...p, ...data, updatedAt: now() } : p
      ),
    }))
  }, [update])

  const deleteProject = useCallback((id: string) => {
    update(s => ({
      ...s,
      projects:     s.projects.filter(p => p.id !== id),
      tasks:        s.tasks.filter(t => t.projectId !== id),
      notes:        s.notes.filter(n => n.projectId !== id),
      decisions:    s.decisions.filter(d => d.projectId !== id),
      risks:        s.risks.filter(r => r.projectId !== id),
      roadmapItems: s.roadmapItems.filter(r => r.projectId !== id),
      chatMessages: Object.fromEntries(
        Object.entries(s.chatMessages).filter(([k]) => k !== id)
      ),
    }))
  }, [update])

  // ── Tasks ──────────────────────────────────────────────────────────────────

  const addTask = useCallback((data: NewTask): Task => {
    const item: Task = { id: uid(), createdAt: now(), ...data }
    update(s => ({ ...s, tasks: [item, ...s.tasks] }))
    return item
  }, [update])

  const updateTask = useCallback((id: string, data: Partial<Task>) => {
    update(s => ({ ...s, tasks: s.tasks.map(t => t.id === id ? { ...t, ...data } : t) }))
  }, [update])

  const deleteTask = useCallback((id: string) => {
    update(s => ({ ...s, tasks: s.tasks.filter(t => t.id !== id) }))
  }, [update])

  // ── Notes ──────────────────────────────────────────────────────────────────

  const addNote = useCallback((data: NewNote): Note => {
    const item: Note = { id: uid(), createdAt: now(), ...data }
    update(s => ({ ...s, notes: [item, ...s.notes] }))
    return item
  }, [update])

  const deleteNote = useCallback((id: string) => {
    update(s => ({ ...s, notes: s.notes.filter(n => n.id !== id) }))
  }, [update])

  // ── Decisions ─────────────────────────────────────────────────────────────

  const addDecision = useCallback((data: NewDecision): Decision => {
    const item: Decision = { id: uid(), createdAt: now(), ...data }
    update(s => ({ ...s, decisions: [item, ...s.decisions] }))
    return item
  }, [update])

  const deleteDecision = useCallback((id: string) => {
    update(s => ({ ...s, decisions: s.decisions.filter(d => d.id !== id) }))
  }, [update])

  // ── Risks ──────────────────────────────────────────────────────────────────

  const addRisk = useCallback((data: NewRisk): Risk => {
    const item: Risk = { id: uid(), createdAt: now(), ...data }
    update(s => ({ ...s, risks: [item, ...s.risks] }))
    return item
  }, [update])

  const updateRisk = useCallback((id: string, data: Partial<Risk>) => {
    update(s => ({ ...s, risks: s.risks.map(r => r.id === id ? { ...r, ...data } : r) }))
  }, [update])

  const deleteRisk = useCallback((id: string) => {
    update(s => ({ ...s, risks: s.risks.filter(r => r.id !== id) }))
  }, [update])

  // ── Roadmap ───────────────────────────────────────────────────────────────

  const addRoadmapItem = useCallback((data: NewRoadmapItem): RoadmapItem => {
    const item: RoadmapItem = { id: uid(), createdAt: now(), ...data }
    update(s => ({ ...s, roadmapItems: [...s.roadmapItems, item] }))
    return item
  }, [update])

  const updateRoadmapItem = useCallback((id: string, data: Partial<RoadmapItem>) => {
    update(s => ({ ...s, roadmapItems: s.roadmapItems.map(r => r.id === id ? { ...r, ...data } : r) }))
  }, [update])

  const deleteRoadmapItem = useCallback((id: string) => {
    update(s => ({ ...s, roadmapItems: s.roadmapItems.filter(r => r.id !== id) }))
  }, [update])

  // ── Chat ──────────────────────────────────────────────────────────────────

  const addMessage = useCallback((projectId: string, message: Message) => {
    update(s => ({
      ...s,
      chatMessages: {
        ...s.chatMessages,
        [projectId]: [...(s.chatMessages[projectId] ?? []), message],
      },
    }))
  }, [update])

  return (
    <AppContext.Provider value={{
      appState, isHydrated,
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
