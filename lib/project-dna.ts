/**
 * Project DNA config and helpers.
 *
 * Safe for the client — contains NO secrets.
 */

import type {
  Project, Task, Note, Decision, Risk, RoadmapItem, Message, ProjectFile,
  ProjectReview, Idea, ProjectDna, ProjectDnaSnapshot,
} from './types'
import { AI_MODEL } from './ai'

export { AI_MODEL }

export const MAX_DNA_MESSAGES = 15

export const PROJECT_DNA_SYSTEM_PROMPT = `You are the Project DNA Engine inside FounderOS.

FounderOS is a personal AI operating system for young builders, founders, coders and ambitious students.

Your job is to understand the long-term identity and evolution of a project.

Analyse:
- why the project started
- what the project is trying to achieve
- how the project has changed
- which decisions shaped it
- which risks keep appearing
- what patterns are forming
- what the user seems to be learning
- what the next strategic move should be

Be honest, practical and specific.

Do not invent information that is not in the project data.
If there is not enough data, say what is missing.
Treat this as a living project profile that becomes more useful over time.

Return only valid JSON in this exact shape:

{
  "origin": "why the project appears to have started",
  "core_goal": "the main goal of the project",
  "current_direction": "where the project seems to be heading now",
  "major_decisions": "important decisions that shaped the project",
  "recurring_risks": "risks or issues that appear repeatedly",
  "momentum_pattern": "whether the project is moving, stuck, scattered, focused, improving, etc.",
  "lessons_learned": "what the user appears to be learning from this project",
  "next_strategic_move": "the single most important next strategic move",
  "dna_summary": "short memorable summary of the project DNA",
  "confidence_score": 0
}

The confidence_score should be from 0 to 100.
Use a low score if there is not enough project history yet.`

// ─── Context input ────────────────────────────────────────────────────────────

export interface IdeaOriginContext {
  ideaTitle: string
  ideaDescription: string
  ideaStatus: string
  analysisSummary?: string
}

export interface ProjectDnaContextInput {
  project: Project
  tasks: Task[]
  notes: Note[]
  decisions: Decision[]
  risks: Risk[]
  roadmapItems: RoadmapItem[]
  messages: Message[]
  projectFiles: ProjectFile[]
  projectReviews: ProjectReview[]
  linkedMemory: string[]
  ideaOrigin?: IdeaOriginContext
  previousDna?: ProjectDna
}

export function renderProjectDnaContext(input: ProjectDnaContextInput): string {
  const {
    project, tasks, notes, decisions, risks, roadmapItems, messages,
    projectFiles, projectReviews, linkedMemory, ideaOrigin, previousDna,
  } = input

  const list = <T,>(items: T[], fmt: (item: T) => string, empty: string) =>
    items.length ? items.map(i => `  - ${fmt(i)}`).join('\n') : `  (${empty})`

  const openTasks = tasks.filter(t => t.status !== 'done')
  const doneTasks = tasks.filter(t => t.status === 'done')
  const recent = messages.slice(-MAX_DNA_MESSAGES)

  let text = `Generate a Project DNA profile. Use ONLY the information below.

PROJECT
  Title: ${project.title}
  Description: ${project.description || '(none)'}
  Goal: ${project.goal || '(none)'}
  Status: ${project.status}
  Priority: ${project.priority}
  Progress: ${project.progress}%
  Created: ${project.createdAt.slice(0, 10)}
  Updated: ${project.updatedAt.slice(0, 10)}
`

  if (ideaOrigin) {
    text += `
ORIGIN IDEA
  Title: ${ideaOrigin.ideaTitle}
  Description: ${ideaOrigin.ideaDescription || '(none)'}
  Status: ${ideaOrigin.ideaStatus}
${ideaOrigin.analysisSummary ? `  Analysis summary: ${ideaOrigin.analysisSummary.replace(/\s+/g, ' ').slice(0, 300)}` : ''}
`
  }

  if (previousDna) {
    text += `
PREVIOUS DNA (for evolution — do not copy blindly)
  Summary: ${previousDna.dnaSummary}
  Direction: ${previousDna.currentDirection}
  Momentum: ${previousDna.momentumPattern}
  Generated: ${previousDna.createdAt.slice(0, 10)}
`
  }

  text += `
COMPLETED TASKS (${doneTasks.length})
${list(doneTasks.slice(0, 20), t => `${t.title} [${t.priority}]`, 'none marked done')}

OPEN TASKS (${openTasks.length})
${list(openTasks.slice(0, 20), t => `${t.title} [${t.status}, ${t.priority}]`, 'no open tasks')}

NOTES (${notes.length})
${list(notes.slice(0, 12), n => n.title, 'no notes')}

DECISIONS (${decisions.length})
${list(decisions.slice(0, 12), d => d.decision, 'no decisions logged')}

RISKS (${risks.length})
${list(risks.slice(0, 12), r => `${r.title} [${r.severity}, ${r.status}]`, 'no risks')}

ROADMAP (${roadmapItems.length})
${list(roadmapItems.slice(0, 15), r => `${r.title} [${r.stage}, ${r.status}]`, 'no roadmap items')}

PROJECT REVIEWS (${projectReviews.length})
${list(projectReviews.slice(0, 5), r => r.summary.replace(/\s+/g, ' ').slice(0, 160), 'no project reviews yet')}

PROJECT FILES (${projectFiles.length})
${list(projectFiles.slice(0, 10), f => {
  const summary = f.summary?.trim()
  return summary ? `${f.fileName}: ${summary.replace(/\s+/g, ' ').slice(0, 120)}` : f.fileName
}, 'no files uploaded')}

RECENT CHAT (last ${recent.length} messages)
${list(recent, m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content.replace(/\s+/g, ' ').slice(0, 200)}`, 'no chat history')}

LINKED MEMORY
${list(linkedMemory.slice(0, 12), s => s, 'no linked memory yet')}`

  return text
}

export function toDnaSnapshot(dna: ProjectDna): ProjectDnaSnapshot {
  return {
    dnaSummary: dna.dnaSummary,
    currentDirection: dna.currentDirection,
    recurringRisks: dna.recurringRisks,
    nextStrategicMove: dna.nextStrategicMove,
    momentumPattern: dna.momentumPattern,
    confidenceScore: dna.confidenceScore,
  }
}

export function renderDnaSnapshotPrompt(snapshot: ProjectDnaSnapshot): string {
  return `PROJECT DNA (living profile)
  Summary: ${snapshot.dnaSummary || '(none)'}
  Current direction: ${snapshot.currentDirection || '(none)'}
  Momentum: ${snapshot.momentumPattern || '(none)'}
  Recurring risks: ${snapshot.recurringRisks || '(none)'}
  Next strategic move: ${snapshot.nextStrategicMove || '(none)'}
  Confidence: ${snapshot.confidenceScore}/100`
}

// ─── Normalisation ────────────────────────────────────────────────────────────

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

function clampScore(v: unknown): number {
  const n = typeof v === 'number' ? v : parseInt(String(v ?? '50'), 10)
  if (Number.isNaN(n)) return 50
  return Math.min(100, Math.max(0, Math.round(n)))
}

export interface NormalizedProjectDnaFields {
  origin: string
  coreGoal: string
  currentDirection: string
  majorDecisions: string
  recurringRisks: string
  momentumPattern: string
  lessonsLearned: string
  nextStrategicMove: string
  dnaSummary: string
  confidenceScore: number
}

export function normalizeProjectDna(raw: unknown): NormalizedProjectDnaFields {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Project DNA did not return an object')
  }
  const o = raw as Record<string, unknown>
  return {
    origin:              str(o.origin),
    coreGoal:            str(o.core_goal),
    currentDirection:    str(o.current_direction),
    majorDecisions:      str(o.major_decisions),
    recurringRisks:      str(o.recurring_risks),
    momentumPattern:     str(o.momentum_pattern),
    lessonsLearned:      str(o.lessons_learned),
    nextStrategicMove:   str(o.next_strategic_move),
    dnaSummary:          str(o.dna_summary),
    confidenceScore:     clampScore(o.confidence_score),
  }
}

export interface ProjectDnaRequestBody {
  project_id: string
}
