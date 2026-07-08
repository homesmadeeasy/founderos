import type { CommandCenterState } from './types'
import { generateDailyBriefing } from './briefingLogic'
import { isDueToday, isOverdue, todayISO } from './utils'
import type { FounderObject } from '@/lib/object-engine/objectTypes'
import { OBJECT_TYPE_LABEL } from '@/lib/object-engine/objectTypes'
import {
  findObjectByTitle, getObjectsSupporting, getRelatedObjects,
} from '@/lib/object-engine/objectRelationships'
import { generateObjectSummary } from '@/lib/object-engine/objectSummaries'

export interface AssistantContext {
  commandCenter: CommandCenterState
  objects: FounderObject[]
}

const PROMPT_MATCHERS: { keywords: string[]; handler: (ctx: AssistantContext) => string }[] = [
  {
    keywords: ['focus', 'today', 'priority', 'priorities', 'should i'],
    handler: ({ commandCenter: s, objects }) => {
      const today = todayISO()
      const mission = s.missionDate === today ? s.mission.trim() : ''
      const open = s.tasks.filter(t => t.status !== 'done')
      const top = open.find(t => isDueToday(t.dueDate, today) && t.priority === 'high')
        ?? open.find(t => t.priority === 'high')
        ?? open[0]

      const lines = [generateDailyBriefing(s)]
      if (mission) lines.unshift(`Mission: ${mission}`)

      const highPriorityObjects = objects.filter(o => o.priority === 'high' && o.status === 'active')
      if (highPriorityObjects.length > 0) {
        lines.push(`High-priority objects: ${highPriorityObjects.slice(0, 3).map(o => o.title).join(', ')}.`)
      }
      if (top) lines.push(`I'd start with: "${top.title}".`)
      return lines.join('\n\n')
    },
  },
  {
    keywords: ['object', 'objects', 'what exist', 'what do i have'],
    handler: ({ objects }) => {
      if (objects.length === 0) return 'No objects in the Object Engine yet.'
      const byType = objects.reduce<Record<string, number>>((acc, o) => {
        acc[o.type] = (acc[o.type] ?? 0) + 1
        return acc
      }, {})
      const breakdown = Object.entries(byType)
        .map(([type, count]) => `${OBJECT_TYPE_LABEL[type as keyof typeof OBJECT_TYPE_LABEL] ?? type}: ${count}`)
        .join(', ')
      return `You have ${objects.length} objects. Breakdown: ${breakdown}. Open Object Engine to browse and filter them.`
    },
  },
  {
    keywords: ['project', 'projects', 'summar'],
    handler: ({ commandCenter: s, objects }) => {
      const activeProjects = objects.filter(o => o.type === 'project' && o.status === 'active')
      if (activeProjects.length > 0) {
        return activeProjects.map(p =>
          `• **${p.title}** (${p.area ?? 'general'}) — ${p.summary || 'No summary.'}`,
        ).join('\n')
      }
      const active = s.projects.filter(p => p.status === 'active')
      if (active.length === 0) return 'You have no active projects. Create one to organise your work.'
      return active.map(p =>
        `• **${p.name}** (${p.area}) — ${p.outcome || 'No outcome set.'} Next: ${p.nextAction || 'Define a next action.'}`,
      ).join('\n')
    },
  },
  {
    keywords: ['decision', 'decisions'],
    handler: ({ objects }) => {
      const decisions = objects.filter(o => o.type === 'decision')
      if (decisions.length === 0) return 'No decisions recorded in the Object Engine yet.'
      return decisions.map(d =>
        `• ${d.title}${d.summary ? ` — ${d.summary}` : ''}`,
      ).join('\n')
    },
  },
  {
    keywords: ['model physique', 'physique', 'supports my model', 'supports model'],
    handler: ({ objects }) => {
      const goal = findObjectByTitle(objects, 'model physique')
        ?? objects.find(o => o.type === 'goal' && o.title.toLowerCase().includes('physique'))
      if (!goal) return 'I could not find a Model Physique goal in your objects.'
      const supporters = getObjectsSupporting(goal, objects)
      if (supporters.length === 0) return `"${goal.title}" has no supporting objects linked yet.`
      return `"${goal.title}" is supported by:\n${supporters.map(o =>
        `• ${OBJECT_TYPE_LABEL[o.type]}: ${o.title}`,
      ).join('\n')}`
    },
  },
  {
    keywords: ['founderos', 'related to founder', 'about founder'],
    handler: ({ objects }) => {
      const founder = findObjectByTitle(objects, 'founderos')
      if (!founder) return 'FounderOS project not found in Object Engine.'
      const related = getRelatedObjects(founder, objects)
      const lines = [generateObjectSummary(founder, related, objects)]
      if (related.length > 0) {
        lines.push(`Related objects: ${related.map(o => o.title).join(', ')}.`)
      }
      return lines.join('\n\n')
    },
  },
  {
    keywords: ['block', 'stuck', 'overdue', 'behind'],
    handler: ({ commandCenter: s }) => {
      const today = todayISO()
      const overdue = s.tasks.filter(t => t.status !== 'done' && isOverdue(t.dueDate, today))
      const paused = s.projects.filter(p => p.status === 'paused')
      const parts: string[] = []

      if (overdue.length === 0 && paused.length === 0) {
        return 'Nothing obvious is blocking you right now. Pick your highest-priority open task and execute for 25 minutes.'
      }

      if (overdue.length > 0) {
        parts.push(`Overdue tasks (${overdue.length}): ${overdue.map(t => `"${t.title}"`).join(', ')}.`)
      }
      if (paused.length > 0) {
        parts.push(`Paused projects: ${paused.map(p => p.name).join(', ')}.`)
      }
      const inbox = s.captureItems.filter(c => c.status === 'inbox')
      if (inbox.length > 5) {
        parts.push(`${inbox.length} inbox captures may be adding mental clutter — process or archive a few.`)
      }
      parts.push('Clear one blocker before adding new commitments.')
      return parts.join(' ')
    },
  },
  {
    keywords: ['health', 'sleep', 'workout', 'protein', 'water', 'weight'],
    handler: ({ commandCenter: s }) => {
      const today = todayISO()
      const log = s.dailyLogs.find(l => l.date === today)
      if (!log) {
        return 'No health data logged today. Open the Health Snapshot card and record sleep, nutrition and movement.'
      }

      const parts: string[] = ['Today\'s health snapshot:']
      if (log.sleepHours != null) parts.push(`Sleep: ${log.sleepHours}h`)
      if (log.proteinGrams != null) parts.push(`Protein: ${log.proteinGrams}g`)
      if (log.waterLitres != null) parts.push(`Water: ${log.waterLitres}L`)
      if (log.weight != null) parts.push(`Weight: ${log.weight}kg`)
      parts.push(log.workoutCompleted ? 'Workout: completed ✓' : 'Workout: not yet completed')
      if (log.mood) parts.push(`Mood: ${log.mood}`)

      if (!log.workoutCompleted) {
        parts.push('Consider completing your workout to stay on track with Model Protocol.')
      }
      return parts.join('\n')
    },
  },
]

export function generateAssistantResponse(
  commandCenter: CommandCenterState,
  prompt: string,
  objects: FounderObject[] = [],
): string {
  const normalized = prompt.trim().toLowerCase()
  if (!normalized) return 'Ask me about your focus, projects, objects, blockers or health today.'

  const ctx: AssistantContext = { commandCenter, objects }

  for (const { keywords, handler } of PROMPT_MATCHERS) {
    if (keywords.some(k => normalized.includes(k))) {
      return handler(ctx)
    }
  }

  return [
    'I can help with:',
    '• "What should I focus on today?"',
    '• "What objects exist?"',
    '• "Summarise my current projects."',
    '• "What decisions have I made?"',
    '• "What supports my model physique goal?"',
    '• "What is related to FounderOS?"',
    '• "What is blocking me?"',
    '• "How is my health today?"',
    '',
    generateDailyBriefing(commandCenter),
  ].join('\n')
}

/** Replace with OpenAI / Edge Function in a future sprint. */
export async function fetchAssistantResponse(
  commandCenter: CommandCenterState,
  prompt: string,
  objects: FounderObject[] = [],
): Promise<string> {
  return generateAssistantResponse(commandCenter, prompt, objects)
}

export const SUGGESTED_PROMPTS = [
  'What should I focus on today?',
  'What objects exist?',
  'Summarise my current projects.',
  'What supports my model physique goal?',
  'What is related to FounderOS?',
] as const
