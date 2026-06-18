'use client'

/**
 * ProjectContext — shared local state for a single project.
 *
 * Why this exists:
 *   All project sub-pages (Chat, Tasks, Notes, Decisions, Risks, Roadmap) need
 *   to share live data so that items created in Chat appear immediately on the
 *   other tabs — without a database round-trip.
 *
 *   When Supabase is connected, replace the useState initialisers with real
 *   queries and replace the add* functions with API/DB mutations.
 *
 * How it works:
 *   1. The server layout (projects/[id]/layout.tsx) loads initial data from
 *      mock-data.ts and passes it to <ProjectProvider initialData={...}>.
 *   2. ProjectProvider stores everything in useState.
 *   3. Every sub-page (client component) calls useProjectContext() to read
 *      and mutate data — no props drilling required.
 */

import { createContext, useContext, useState, useCallback } from 'react'
import { generateMockAiResponse } from '@/lib/mock-ai'
import type {
  Project, Task, Note, Decision, Risk, RoadmapItem, Message,
  TaskStatus, TaskPriority, RiskSeverity, RiskStatus, RoadmapStatus,
} from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export type NewTask = {
  title: string
  description: string
  priority: TaskPriority
  status: TaskStatus
}

export type NewNote = {
  title: string
  content: string
}

export type NewDecision = {
  decision: string
  reasoning: string
}

export type NewRisk = {
  title: string
  description: string
  severity: RiskSeverity
  mitigation: string
  status: RiskStatus
}

export type NewRoadmapItem = {
  title: string
  description: string
  stage: string
  status: RoadmapStatus
  sortOrder: number
}

export interface InitialProjectData {
  project: Project
  tasks: Task[]
  notes: Note[]
  decisions: Decision[]
  risks: Risk[]
  roadmapItems: RoadmapItem[]
  messages: Message[]
}

interface ProjectContextValue extends InitialProjectData {
  isAiTyping: boolean
  sendMessage: (content: string) => void
  addTask: (data: NewTask) => Task
  addNote: (data: NewNote) => Note
  addDecision: (data: NewDecision) => Decision
  addRisk: (data: NewRisk) => Risk
  addRoadmapItem: (data: NewRoadmapItem) => RoadmapItem
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ProjectContext = createContext<ProjectContextValue | null>(null)

export function useProjectContext(): ProjectContextValue {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProjectContext must be used inside <ProjectProvider>')
  return ctx
}

// ─── Helper: generate a unique-enough ID for mock data ───────────────────────

function uid() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function now() {
  return new Date().toISOString()
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ProjectProvider({
  initialData,
  children,
}: {
  initialData: InitialProjectData
  children: React.ReactNode
}) {
  const [project]      = useState<Project>(initialData.project)
  const [messages,      setMessages]      = useState<Message[]>(initialData.messages)
  const [tasks,         setTasks]         = useState<Task[]>(initialData.tasks)
  const [notes,         setNotes]         = useState<Note[]>(initialData.notes)
  const [decisions,     setDecisions]     = useState<Decision[]>(initialData.decisions)
  const [risks,         setRisks]         = useState<Risk[]>(initialData.risks)
  const [roadmapItems,  setRoadmapItems]  = useState<RoadmapItem[]>(initialData.roadmapItems)
  const [isAiTyping,    setIsAiTyping]    = useState(false)

  // ── Chat ────────────────────────────────────────────────────────────────────

  const sendMessage = useCallback((content: string) => {
    const userMsg: Message = {
      id: uid(),
      role: 'user',
      content,
      createdAt: now(),
    }
    setMessages((prev) => [...prev, userMsg])
    setIsAiTyping(true)

    // Simulate AI latency (600–1200ms)
    const delay = 600 + Math.random() * 600
    setTimeout(() => {
      const aiMsg: Message = {
        id: uid(),
        role: 'assistant',
        content: generateMockAiResponse(content, project),
        createdAt: now(),
      }
      setMessages((prev) => [...prev, aiMsg])
      setIsAiTyping(false)
    }, delay)
  }, [project])

  // ── Converters ──────────────────────────────────────────────────────────────

  const addTask = useCallback((data: NewTask): Task => {
    const item: Task = { id: uid(), projectId: project.id, createdAt: now(), ...data }
    setTasks((prev) => [item, ...prev])
    return item
  }, [project.id])

  const addNote = useCallback((data: NewNote): Note => {
    const item: Note = { id: uid(), projectId: project.id, createdAt: now(), ...data }
    setNotes((prev) => [item, ...prev])
    return item
  }, [project.id])

  const addDecision = useCallback((data: NewDecision): Decision => {
    const item: Decision = { id: uid(), projectId: project.id, createdAt: now(), ...data }
    setDecisions((prev) => [item, ...prev])
    return item
  }, [project.id])

  const addRisk = useCallback((data: NewRisk): Risk => {
    const item: Risk = { id: uid(), projectId: project.id, createdAt: now(), ...data }
    setRisks((prev) => [item, ...prev])
    return item
  }, [project.id])

  const addRoadmapItem = useCallback((data: NewRoadmapItem): RoadmapItem => {
    const item: RoadmapItem = { id: uid(), projectId: project.id, createdAt: now(), ...data }
    setRoadmapItems((prev) => [...prev, item])
    return item
  }, [project.id])

  return (
    <ProjectContext.Provider value={{
      project, messages, tasks, notes, decisions, risks, roadmapItems, isAiTyping,
      sendMessage, addTask, addNote, addDecision, addRisk, addRoadmapItem,
    }}>
      {children}
    </ProjectContext.Provider>
  )
}
