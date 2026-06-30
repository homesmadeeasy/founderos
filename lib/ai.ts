/**
 * Shared AI config and helpers.
 *
 * This file is safe for the client — it contains NO secrets.
 * The OpenAI API key is only ever read server-side in app/api/chat/route.ts.
 *
 * - AI_MODEL is defined here in one place so it's easy to change later.
 * - buildChatContext() turns the current project's localStorage state into a
 *   concise payload that gets sent to the API route.
 */

import type {
  Project, Task, Note, Decision, Risk, RoadmapItem, Message, ProjectFile, ProjectDnaSnapshot, PatternAnalysisSnapshot,
} from './types'
import { summarizeProjectFiles } from './file'
import { renderDnaSnapshotPrompt } from './project-dna'
import { renderPatternSnapshotPrompt } from './pattern-analysis'

// ─── Model config ─────────────────────────────────────────────────────────────
// Change the model in this single place. gpt-4o-mini is a current, fast and
// inexpensive OpenAI chat model that's well-suited to this assistant use case.
export const AI_MODEL = 'gpt-4o-mini'

// How many recent chat turns to send for continuity (keeps requests concise).
export const MAX_HISTORY_MESSAGES = 10

// ─── System prompt ────────────────────────────────────────────────────────────

export const SYSTEM_PROMPT = `You are the AI project assistant inside FounderOS.

FounderOS is a personal AI operating system for young builders, founders, coders and ambitious students.

Your job is to help the user turn ideas, notes and conversations into structured project progress.

You should help with:
- planning projects
- breaking ideas into tasks
- identifying risks
- making decisions clear
- building roadmaps
- reviewing progress
- suggesting next steps

Always be practical, specific and action-oriented.

When useful, clearly label suggestions in sections such as:
TASKS:
NOTES:
DECISIONS:
RISKS:
ROADMAP:

This helps the user convert your response into structured FounderOS objects.

Do not pretend to have done work outside the app.
Do not claim to access files, emails, websites, calendars or external tools unless they are provided in the current project context.
Ask clarifying questions only when necessary.`

// ─── Request / response payload types ───────────────────────────────────────────

export interface ChatContext {
  title: string
  description: string
  goal: string
  status: string
  progress: number
  tasks:        { title: string; status: string; priority: string }[]
  notes:        { title: string }[]
  decisions:    { decision: string }[]
  risks:        { title: string; severity: string; status: string }[]
  roadmapItems: { title: string; stage: string; status: string }[]
  linkedMemory?: string[]
  projectFiles?: string[]
  projectDna?: ProjectDnaSnapshot
  patternAnalysis?: PatternAnalysisSnapshot
}

export interface ChatHistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequestBody {
  message: string
  context: ChatContext
  history: ChatHistoryMessage[]
}

export interface ChatResponseBody {
  reply: string
}

// ─── Context builder (client-side) ──────────────────────────────────────────────

/**
 * Build a concise context payload from the project's local state.
 * Lists are capped so we don't send excessive data to the model.
 */
export function buildChatContext(
  project: Project,
  tasks: Task[],
  notes: Note[],
  decisions: Decision[],
  risks: Risk[],
  roadmapItems: RoadmapItem[],
  linkedMemory: string[] = [],
  projectFiles: ProjectFile[] = [],
  projectDna?: ProjectDnaSnapshot,
  patternAnalysis?: PatternAnalysisSnapshot,
): ChatContext {
  return {
    title:       project.title,
    description: project.description,
    goal:        project.goal,
    status:      project.status,
    progress:    project.progress,
    tasks:        tasks.slice(0, 20).map(t => ({ title: t.title, status: t.status, priority: t.priority })),
    notes:        notes.slice(0, 10).map(n => ({ title: n.title })),
    decisions:    decisions.slice(0, 10).map(d => ({ decision: d.decision })),
    risks:        risks.slice(0, 10).map(r => ({ title: r.title, severity: r.severity, status: r.status })),
    roadmapItems: roadmapItems.slice(0, 15).map(r => ({ title: r.title, stage: r.stage, status: r.status })),
    linkedMemory: linkedMemory.slice(0, 15),
    projectFiles: summarizeProjectFiles(projectFiles, 10),
    projectDna,
    patternAnalysis,
  }
}

/** Take the last N messages for conversational continuity. */
export function buildChatHistory(messages: Message[], limit = MAX_HISTORY_MESSAGES): ChatHistoryMessage[] {
  return messages
    .slice(-limit)
    .map(m => ({ role: m.role, content: m.content }))
}

// ─── Context → prompt text (server-side) ────────────────────────────────────────

/**
 * Render the structured context into a compact text block for the model.
 * Used inside the API route to prime the assistant with project state.
 */
export function renderContextPrompt(ctx: ChatContext): string {
  const list = <T,>(items: T[], fmt: (item: T) => string, empty: string) =>
    items.length ? items.map(i => `  - ${fmt(i)}`).join('\n') : `  (${empty})`

  return `Here is the current context for the project you are assisting with. Use it to give specific, relevant help.

PROJECT
  Title: ${ctx.title}
  Description: ${ctx.description || '(none)'}
  Goal: ${ctx.goal || '(none)'}
  Status: ${ctx.status}
  Progress: ${ctx.progress}%

EXISTING TASKS
${list(ctx.tasks, t => `${t.title} [${t.status}, ${t.priority}]`, 'no tasks yet')}

EXISTING NOTES
${list(ctx.notes, n => n.title, 'no notes yet')}

EXISTING DECISIONS
${list(ctx.decisions, d => d.decision, 'no decisions yet')}

EXISTING RISKS
${list(ctx.risks, r => `${r.title} [${r.severity}, ${r.status}]`, 'no risks yet')}

EXISTING ROADMAP ITEMS
${list(ctx.roadmapItems, r => `${r.title} [${r.stage}, ${r.status}]`, 'no roadmap items yet')}

LINKED MEMORY (how items in this project connect)
${list(ctx.linkedMemory ?? [], s => s, 'no linked memory yet')}

UPLOADED PROJECT FILES (summaries only)
${list(ctx.projectFiles ?? [], s => s, 'no files uploaded yet')}${ctx.projectDna ? `

PROJECT DNA (living profile — use for long-term direction)
${renderDnaSnapshotPrompt(ctx.projectDna)}` : ''}${ctx.patternAnalysis ? `

CROSS-PROJECT PATTERNS (user-level habits — keep in mind briefly)
${renderPatternSnapshotPrompt(ctx.patternAnalysis)}` : ''}`
}
