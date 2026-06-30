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
  AppState, Project, Task, Note, Decision, Risk, RoadmapItem, Message, Idea, Link, ProjectFile,
  ProjectStatus, ProjectPriority, TaskStatus, TaskPriority,
  RiskSeverity, RiskStatus, RoadmapStatus, MessageRole, IdeaStatus,
  EntityType, RelationshipType,
} from '@/lib/types'
export type {
  NewProject, NewTask, NewNote, NewDecision, NewRisk, NewRoadmapItem, NewIdea, NewLink, NewProjectFile,
} from '@/lib/db/input-types'
import type {
  NewProject, NewTask, NewNote, NewDecision, NewRisk, NewRoadmapItem, NewIdea, NewLink, NewProjectFile,
} from '@/lib/db/input-types'
import { queueMemoryIndex } from '@/lib/memory/routes'

// ─── Insert payload types (re-exported from lib/db/input-types) ─────────────

interface AppContextValue {
  appState: AppState
  isHydrated: boolean
  loadError: string | null
  reload: () => Promise<void>

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

  // Ideas
  createIdea:       (data: NewIdea) => Promise<Idea>
  updateIdea:       (id: string, data: Partial<Omit<Idea, 'id' | 'createdAt'>>) => Promise<void>
  deleteIdea:       (id: string) => Promise<void>

  // Links (Knowledge Graph)
  createLink:       (data: NewLink) => Promise<Link>
  deleteLink:       (id: string) => Promise<void>

  // Project files
  createProjectFile:  (data: NewProjectFile) => Promise<ProjectFile>
  updateProjectFile:  (id: string, data: Partial<Pick<ProjectFile, 'summary' | 'extractedText' | 'status'>>) => Promise<ProjectFile>
  deleteProjectFile:  (id: string, filePath: string) => Promise<void>

  // Chat
  addMessage:       (projectId: string, role: MessageRole, content: string) => Promise<Message>
}

// ─── Context ──────────────────────────────────────────────────────────────────

const EMPTY_STATE: AppState = {
  projects: [], tasks: [], notes: [], decisions: [], risks: [], roadmapItems: [], ideas: [], projectFiles: [], links: [], chatMessages: {},
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
        console.error('[FounderOS] failed to load data from Supabase:', err)
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load your data.')
      } finally {
        if (!cancelled) setIsHydrated(true)
      }
    })()
    return () => { cancelled = true }
  }, [supabase, userId])

  const patch = useCallback((updater: (prev: AppState) => AppState) => setAppState(updater), [])

  /** Refetch everything from Supabase (used to resync after a failed mutation). */
  const reload = useCallback(async () => {
    try {
      const state = await db.loadAppState(supabase)
      setAppState(state)
      setLoadError(null)
    } catch (err) {
      console.error('[FounderOS] reload failed:', err)
    }
  }, [supabase])

  /**
   * Optimistic update/delete helper: apply the local change immediately, then
   * persist. If persistence fails, log it, resync from the DB to undo the
   * optimistic change, and rethrow so callers can surface a message.
   */
  const mutate = useCallback(async (
    optimistic: (prev: AppState) => AppState,
    persist: () => Promise<void>,
  ) => {
    patch(optimistic)
    try {
      await persist()
    } catch (err) {
      console.error('[FounderOS] mutation failed, resyncing:', err)
      await reload()
      throw err
    }
  }, [patch, reload])

  // ── Projects ──────────────────────────────────────────────────────────────

  const createProject = useCallback(async (data: NewProject): Promise<Project> => {
    try {
      const project = await db.createProject(supabase, userId, data)
      patch(s => ({ ...s, projects: [project, ...s.projects] }))
      queueMemoryIndex('project', project.id)
      return project
    } catch (err) {
      console.error('[FounderOS] createProject failed:', err)
      throw err
    }
  }, [supabase, userId, patch])

  const updateProject = useCallback((id: string, data: Partial<Omit<Project, 'id' | 'createdAt'>>) =>
    mutate(
      s => ({ ...s, projects: s.projects.map(p => p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p) }),
      async () => {
        await db.updateProject(supabase, id, data)
        queueMemoryIndex('project', id)
      },
    ), [supabase, mutate])

  const deleteProject = useCallback((id: string) =>
    mutate(
      s => ({
        ...s,
        projects:     s.projects.filter(p => p.id !== id),
        tasks:        s.tasks.filter(t => t.projectId !== id),
        notes:        s.notes.filter(n => n.projectId !== id),
        decisions:    s.decisions.filter(d => d.projectId !== id),
        risks:        s.risks.filter(r => r.projectId !== id),
        roadmapItems: s.roadmapItems.filter(r => r.projectId !== id),
        projectFiles: s.projectFiles.filter(f => f.projectId !== id),
        chatMessages: Object.fromEntries(Object.entries(s.chatMessages).filter(([k]) => k !== id)),
      }),
      () => db.deleteProject(supabase, id),
    ), [supabase, mutate])

  // ── Tasks ──────────────────────────────────────────────────────────────────

  const addTask = useCallback(async (data: NewTask): Promise<Task> => {
    try {
      const item = await db.createTask(supabase, userId, data)
      patch(s => ({ ...s, tasks: [item, ...s.tasks] }))
      queueMemoryIndex('task', item.id)
      return item
    } catch (err) {
      console.error('[FounderOS] addTask failed:', err)
      throw err
    }
  }, [supabase, userId, patch])

  const updateTask = useCallback((id: string, data: Partial<Task>) =>
    mutate(
      s => ({ ...s, tasks: s.tasks.map(t => t.id === id ? { ...t, ...data } : t) }),
      async () => {
        await db.updateTask(supabase, id, data)
        queueMemoryIndex('task', id)
      },
    ), [supabase, mutate])

  const deleteTask = useCallback((id: string) =>
    mutate(
      s => ({ ...s, tasks: s.tasks.filter(t => t.id !== id) }),
      () => db.deleteTask(supabase, id),
    ), [supabase, mutate])

  // ── Notes ──────────────────────────────────────────────────────────────────

  const addNote = useCallback(async (data: NewNote): Promise<Note> => {
    try {
      const item = await db.createNote(supabase, userId, data)
      patch(s => ({ ...s, notes: [item, ...s.notes] }))
      queueMemoryIndex('note', item.id)
      return item
    } catch (err) {
      console.error('[FounderOS] addNote failed:', err)
      throw err
    }
  }, [supabase, userId, patch])

  const deleteNote = useCallback((id: string) =>
    mutate(
      s => ({ ...s, notes: s.notes.filter(n => n.id !== id) }),
      () => db.deleteNote(supabase, id),
    ), [supabase, mutate])

  // ── Decisions ─────────────────────────────────────────────────────────────

  const addDecision = useCallback(async (data: NewDecision): Promise<Decision> => {
    try {
      const item = await db.createDecision(supabase, userId, data)
      patch(s => ({ ...s, decisions: [item, ...s.decisions] }))
      queueMemoryIndex('decision', item.id)
      return item
    } catch (err) {
      console.error('[FounderOS] addDecision failed:', err)
      throw err
    }
  }, [supabase, userId, patch])

  const deleteDecision = useCallback((id: string) =>
    mutate(
      s => ({ ...s, decisions: s.decisions.filter(d => d.id !== id) }),
      () => db.deleteDecision(supabase, id),
    ), [supabase, mutate])

  // ── Risks ──────────────────────────────────────────────────────────────────

  const addRisk = useCallback(async (data: NewRisk): Promise<Risk> => {
    try {
      const item = await db.createRisk(supabase, userId, data)
      patch(s => ({ ...s, risks: [item, ...s.risks] }))
      queueMemoryIndex('risk', item.id)
      return item
    } catch (err) {
      console.error('[FounderOS] addRisk failed:', err)
      throw err
    }
  }, [supabase, userId, patch])

  const updateRisk = useCallback((id: string, data: Partial<Risk>) =>
    mutate(
      s => ({ ...s, risks: s.risks.map(r => r.id === id ? { ...r, ...data } : r) }),
      async () => {
        await db.updateRisk(supabase, id, data)
        queueMemoryIndex('risk', id)
      },
    ), [supabase, mutate])

  const deleteRisk = useCallback((id: string) =>
    mutate(
      s => ({ ...s, risks: s.risks.filter(r => r.id !== id) }),
      () => db.deleteRisk(supabase, id),
    ), [supabase, mutate])

  // ── Roadmap ───────────────────────────────────────────────────────────────

  const addRoadmapItem = useCallback(async (data: NewRoadmapItem): Promise<RoadmapItem> => {
    try {
      const item = await db.createRoadmapItem(supabase, userId, data)
      patch(s => ({ ...s, roadmapItems: [...s.roadmapItems, item] }))
      queueMemoryIndex('roadmap_item', item.id)
      return item
    } catch (err) {
      console.error('[FounderOS] addRoadmapItem failed:', err)
      throw err
    }
  }, [supabase, userId, patch])

  const updateRoadmapItem = useCallback((id: string, data: Partial<RoadmapItem>) =>
    mutate(
      s => ({ ...s, roadmapItems: s.roadmapItems.map(r => r.id === id ? { ...r, ...data } : r) }),
      async () => {
        await db.updateRoadmapItem(supabase, id, data)
        queueMemoryIndex('roadmap_item', id)
      },
    ), [supabase, mutate])

  const deleteRoadmapItem = useCallback((id: string) =>
    mutate(
      s => ({ ...s, roadmapItems: s.roadmapItems.filter(r => r.id !== id) }),
      () => db.deleteRoadmapItem(supabase, id),
    ), [supabase, mutate])

  // ── Ideas ──────────────────────────────────────────────────────────────────

  const createIdea = useCallback(async (data: NewIdea): Promise<Idea> => {
    try {
      const item = await db.createIdea(supabase, userId, data)
      patch(s => ({ ...s, ideas: [item, ...s.ideas] }))
      queueMemoryIndex('idea', item.id)
      return item
    } catch (err) {
      console.error('[FounderOS] createIdea failed:', err)
      throw err
    }
  }, [supabase, userId, patch])

  const updateIdea = useCallback((id: string, data: Partial<Omit<Idea, 'id' | 'createdAt'>>) =>
    mutate(
      s => ({ ...s, ideas: s.ideas.map(i => i.id === id ? { ...i, ...data, updatedAt: new Date().toISOString() } : i) }),
      async () => {
        await db.updateIdea(supabase, id, data)
        queueMemoryIndex('idea', id)
      },
    ), [supabase, mutate])

  const deleteIdea = useCallback((id: string) =>
    mutate(
      s => ({ ...s, ideas: s.ideas.filter(i => i.id !== id) }),
      () => db.deleteIdea(supabase, id),
    ), [supabase, mutate])

  // ── Links ──────────────────────────────────────────────────────────────────

  const createLink = useCallback(async (data: NewLink): Promise<Link> => {
    try {
      const item = await db.createLink(supabase, userId, data)
      patch(s => ({ ...s, links: [item, ...s.links] }))
      queueMemoryIndex('link', item.id)
      return item
    } catch (err) {
      console.error('[FounderOS] createLink failed:', err)
      throw err
    }
  }, [supabase, userId, patch])

  const deleteLink = useCallback((id: string) =>
    mutate(
      s => ({ ...s, links: s.links.filter(l => l.id !== id) }),
      () => db.deleteLink(supabase, id),
    ), [supabase, mutate])

  // ── Project files ──────────────────────────────────────────────────────────

  const createProjectFile = useCallback(async (data: NewProjectFile): Promise<ProjectFile> => {
    try {
      const item = await db.createProjectFile(supabase, userId, data)
      patch(s => ({ ...s, projectFiles: [item, ...s.projectFiles] }))
      return item
    } catch (err) {
      console.error('[FounderOS] createProjectFile failed:', err)
      throw err
    }
  }, [supabase, userId, patch])

  const updateProjectFile = useCallback(async (
    id: string, data: Partial<Pick<ProjectFile, 'summary' | 'extractedText' | 'status'>>,
  ): Promise<ProjectFile> => {
    try {
      const item = await db.updateProjectFile(supabase, id, data)
      patch(s => ({ ...s, projectFiles: s.projectFiles.map(f => f.id === id ? item : f) }))
      if (item.summary || item.extractedText) queueMemoryIndex('project_file', item.id)
      return item
    } catch (err) {
      console.error('[FounderOS] updateProjectFile failed:', err)
      throw err
    }
  }, [supabase, patch])

  const deleteProjectFile = useCallback(async (id: string, filePath: string) => {
    patch(s => ({ ...s, projectFiles: s.projectFiles.filter(f => f.id !== id) }))
    try {
      await supabase.storage.from('project-files').remove([filePath])
      await db.deleteProjectFileRecord(supabase, id)
    } catch (err) {
      console.error('[FounderOS] deleteProjectFile failed:', err)
      await reload()
      throw err
    }
  }, [supabase, patch, reload])

  // ── Chat ──────────────────────────────────────────────────────────────────

  const addMessage = useCallback(async (projectId: string, role: MessageRole, content: string): Promise<Message> => {
    try {
      const message = await db.createMessage(supabase, userId, projectId, role, content)
      patch(s => ({
        ...s,
        chatMessages: { ...s.chatMessages, [projectId]: [...(s.chatMessages[projectId] ?? []), message] },
      }))
      return message
    } catch (err) {
      console.error('[FounderOS] addMessage failed:', err)
      throw err
    }
  }, [supabase, userId, patch])

  return (
    <AppContext.Provider value={{
      appState, isHydrated, loadError, reload,
      createProject, updateProject, deleteProject,
      addTask, updateTask, deleteTask,
      addNote, deleteNote,
      addDecision, deleteDecision,
      addRisk, updateRisk, deleteRisk,
      addRoadmapItem, updateRoadmapItem, deleteRoadmapItem,
      createIdea, updateIdea, deleteIdea,
      createLink, deleteLink,
      createProjectFile, updateProjectFile, deleteProjectFile,
      addMessage,
    }}>
      {children}
    </AppContext.Provider>
  )
}
