/**
 * AI World Setup — prompts and normalizers (client-safe).
 */

export const WORLD_SETUP_SYSTEM_PROMPT = `You are the World Setup Engine inside FounderOS.

FounderOS is an AI operating system that turns goals, ideas, responsibilities and life areas into living AI worlds.

A World is a structured AI environment with memory, goals, actions, decisions, risks, reviews and simulations.

Your job is to help initialise a new World based on the user's goal and world type.

Be practical, specific and not overly complex.
Do not overpromise.
Do not invent details that were not provided.
Create a useful starting structure the user can act on immediately.

Return only valid JSON in this shape:

{
  "world_summary": "short summary of what this world is for",
  "success_criteria": "how the user could know this world is working",
  "first_actions": [
    {
      "title": "action title",
      "description": "action description",
      "priority": "Low | Medium | High"
    }
  ],
  "initial_risks": [
    {
      "title": "risk/obstacle title",
      "description": "risk/obstacle description",
      "severity": "Low | Medium | High",
      "mitigation": "how to reduce it"
    }
  ],
  "decisions_to_clarify": [
    {
      "decision": "decision that needs to be made",
      "reasoning": "why this matters"
    }
  ],
  "path_items": [
    {
      "title": "path/roadmap item",
      "description": "description",
      "stage": "Now | Next | Later"
    }
  ],
  "review_rhythm": "suggested review rhythm",
  "next_best_step": "single best immediate next step"
}`

export interface WorldSetupAction {
  title: string
  description: string
  priority: 'Low' | 'Medium' | 'High'
}

export interface WorldSetupRisk {
  title: string
  description: string
  severity: 'Low' | 'Medium' | 'High'
  mitigation: string
}

export interface WorldSetupDecision {
  decision: string
  reasoning: string
}

export interface WorldSetupPathItem {
  title: string
  description: string
  stage: string
}

export interface NormalizedWorldSetup {
  worldSummary: string
  successCriteria: string
  firstActions: WorldSetupAction[]
  initialRisks: WorldSetupRisk[]
  decisionsToClarify: WorldSetupDecision[]
  pathItems: WorldSetupPathItem[]
  reviewRhythm: string
  nextBestStep: string
}

export interface WorldSetupRequestBody {
  project_id: string
  title?: string
  description?: string
  world_type?: string
  world_purpose?: string
  goal?: string
  life_area?: string
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
const PRIORITIES = ['Low', 'Medium', 'High'] as const
const SEVERITIES = ['Low', 'Medium', 'High'] as const

function pickPriority(raw: string): WorldSetupAction['priority'] {
  return (PRIORITIES as readonly string[]).includes(raw) ? raw as WorldSetupAction['priority'] : 'Medium'
}

function pickSeverity(raw: string): WorldSetupRisk['severity'] {
  return (SEVERITIES as readonly string[]).includes(raw) ? raw as WorldSetupRisk['severity'] : 'Medium'
}

function mapSeverityToRisk(severity: WorldSetupRisk['severity']): 'low' | 'medium' | 'high' {
  return severity === 'High' ? 'high' : severity === 'Low' ? 'low' : 'medium'
}

export function mapSetupPriorityToTask(priority: WorldSetupAction['priority']): 'low' | 'medium' | 'high' {
  return priority === 'High' ? 'high' : priority === 'Low' ? 'low' : 'medium'
}

export { mapSeverityToRisk }

export function renderWorldSetupContext(input: {
  title: string
  description: string
  worldType: string
  worldPurpose: string
  goal: string
  lifeArea: string
}): string {
  return `Initialise a new FounderOS World with this information:

Title: ${input.title}
World type: ${input.worldType}
Life area: ${input.lifeArea || '(not specified)'}
Purpose: ${input.worldPurpose || '(not specified)'}
Description: ${input.description || '(none)'}
Goal: ${input.goal || '(none)'}`
}

export function normalizeWorldSetup(raw: unknown): NormalizedWorldSetup {
  if (!raw || typeof raw !== 'object') throw new Error('World setup did not return an object')
  const o = raw as Record<string, unknown>

  const firstActions = Array.isArray(o.first_actions)
    ? o.first_actions.map((item): WorldSetupAction | null => {
        if (!item || typeof item !== 'object') return null
        const a = item as Record<string, unknown>
        const title = str(a.title)
        if (!title) return null
        return { title, description: str(a.description), priority: pickPriority(str(a.priority)) }
      }).filter((x): x is WorldSetupAction => x !== null).slice(0, 8)
    : []

  const initialRisks = Array.isArray(o.initial_risks)
    ? o.initial_risks.map((item): WorldSetupRisk | null => {
        if (!item || typeof item !== 'object') return null
        const r = item as Record<string, unknown>
        const title = str(r.title)
        if (!title) return null
        return {
          title,
          description: str(r.description),
          severity: pickSeverity(str(r.severity)),
          mitigation: str(r.mitigation),
        }
      }).filter((x): x is WorldSetupRisk => x !== null).slice(0, 6)
    : []

  const decisionsToClarify = Array.isArray(o.decisions_to_clarify)
    ? o.decisions_to_clarify.map((item): WorldSetupDecision | null => {
        if (!item || typeof item !== 'object') return null
        const d = item as Record<string, unknown>
        const decision = str(d.decision)
        if (!decision) return null
        return { decision, reasoning: str(d.reasoning) }
      }).filter((x): x is WorldSetupDecision => x !== null).slice(0, 5)
    : []

  const pathItems = Array.isArray(o.path_items)
    ? o.path_items.map((item): WorldSetupPathItem | null => {
        if (!item || typeof item !== 'object') return null
        const p = item as Record<string, unknown>
        const title = str(p.title)
        if (!title) return null
        return { title, description: str(p.description), stage: str(p.stage) || 'Next' }
      }).filter((x): x is WorldSetupPathItem => x !== null).slice(0, 8)
    : []

  return {
    worldSummary: str(o.world_summary),
    successCriteria: str(o.success_criteria),
    firstActions,
    initialRisks,
    decisionsToClarify,
    pathItems,
    reviewRhythm: str(o.review_rhythm),
    nextBestStep: str(o.next_best_step),
  }
}
