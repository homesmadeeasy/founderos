import type { CommandCenterState } from './types'
import { generateDailyBriefing } from './briefingLogic'
import { isDueToday, isOverdue, todayISO } from './utils'
import type { FounderObject } from '@/lib/object-engine/objectTypes'
import { OBJECT_TYPE_LABEL } from '@/lib/object-engine/objectTypes'
import {
  findObjectByTitle, getObjectsSupporting, getRelatedObjects,
} from '@/lib/object-engine/objectRelationships'
import { generateObjectSummary } from '@/lib/object-engine/objectSummaries'
import type { MemoryRecord } from '@/lib/memory-engine/memoryTypes'
import {
  generateRecentMemoryDigest, summarizeMemoriesByType,
} from '@/lib/memory-engine/memorySummaries'
import { sortMemoriesByOccurred } from '@/lib/memory-engine/memorySearch'
import type { ExecutiveBriefing, ExecutiveRecommendation } from '@/lib/executive-engine/executiveTypes'

export interface ExecutiveAssistantSnapshot {
  topFocus: { title: string; summary: string; score?: number }
  briefing: ExecutiveBriefing | null
  recommendations: ExecutiveRecommendation[]
  warnings: string[]
}

export interface AssistantContext {
  commandCenter: CommandCenterState
  objects: FounderObject[]
  memories: MemoryRecord[]
  executive?: ExecutiveAssistantSnapshot | null
}

function formatExecutiveFocusResponse(executive: ExecutiveAssistantSnapshot): string {
  const lines: string[] = ['**Executive Engine**']

  if (executive.briefing) {
    lines.push(executive.briefing.summary)
    if (executive.briefing.priorities.length > 0) {
      lines.push(`Priorities:\n${executive.briefing.priorities.map(p => `• ${p}`).join('\n')}`)
    }
  }

  lines.push(`**Top focus:** ${executive.topFocus.title}`)
  lines.push(executive.topFocus.summary)
  if (executive.topFocus.score != null) {
    lines.push(`Attention score: ${executive.topFocus.score}/100`)
  }

  const primary = executive.recommendations.find(r => r.priority === 'high')
  if (primary && !primary.title.includes(executive.topFocus.title)) {
    lines.push(`Recommendation: ${primary.title} — ${primary.rationale}`)
  }

  if (executive.warnings.length > 0) {
    lines.push(`Warnings:\n${executive.warnings.slice(0, 2).map(w => `• ${w}`).join('\n')}`)
  }

  lines.push('Open Executive Engine (/executive) for full attention scores and decisions.')
  return lines.join('\n\n')
}

const PROMPT_MATCHERS: { keywords: string[]; handler: (ctx: AssistantContext) => string }[] = [
  {
    keywords: ['remember', 'what do you remember', 'memory', 'memories'],
    handler: ({ memories }) => {
      if (memories.length === 0) return 'No memories recorded yet. Use the Memory Engine or take actions in Command Center to build history.'
      return `${generateRecentMemoryDigest(memories, 6)}\n\nOpen Memory Engine for the full timeline.`
    },
  },
  {
    keywords: ['happened recently', 'recently', 'recent history', 'what happened'],
    handler: ({ memories }) => {
      const recent = sortMemoriesByOccurred(memories).slice(0, 6)
      if (recent.length === 0) return 'Nothing recorded recently.'
      return recent.map(m =>
        `• ${m.title}${m.summary ? ` — ${m.summary}` : ''}`,
      ).join('\n')
    },
  },
  {
    keywords: ['changed in founder', 'founderos progress', 'what changed'],
    handler: ({ memories }) => {
      const updates = memories.filter(m =>
        ['project_update', 'object_change', 'insight', 'event'].includes(m.type),
      ).slice(0, 6)
      if (updates.length === 0) return 'No recent FounderOS change memories found.'
      return updates.map(m => `• ${m.title}: ${m.summary || m.content}`).join('\n')
    },
  },
  {
    keywords: ['object-first', 'object first', 'why object'],
    handler: ({ memories }) => {
      const match = memories.find(m =>
        m.title.toLowerCase().includes('object-first')
        || m.content.toLowerCase().includes('object-first'),
      )
      if (match) {
        return `${match.title}\n\n${match.content}${match.summary ? `\n\n${match.summary}` : ''}`
      }
      return 'FounderOS became object-first so every meaningful entity is a FounderObject with relationships — the foundation for memory, reasoning and planning.'
    },
  },
  {
    keywords: ['focus', 'today', 'priority', 'priorities', 'should i'],
    handler: ({ commandCenter: s, objects, memories, executive }) => {
      if (executive?.topFocus?.title) {
        return formatExecutiveFocusResponse(executive)
      }

      const today = todayISO()
      const mission = s.missionDate === today ? s.mission.trim() : ''
      const open = s.tasks.filter(t => t.status !== 'done')
      const top = open.find(t => isDueToday(t.dueDate, today) && t.priority === 'high')
        ?? open.find(t => t.priority === 'high')
        ?? open[0]

      const lines = [generateDailyBriefing(s)]
      if (mission) lines.unshift(`Mission: ${mission}`)

      const missionMem = memories.find(m => m.tags.includes('mission') && m.occurredAt.slice(0, 10) === today)
      if (missionMem) lines.push(`Today's mission memory: "${missionMem.content}"`)

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
    handler: ({ objects, memories }) => {
      const memoryDecisions = memories.filter(m => m.type === 'decision')
      if (memoryDecisions.length > 0) {
        return summarizeMemoriesByType(memories, 'decision')
      }
      const decisions = objects.filter(o => o.type === 'decision')
      if (decisions.length === 0) return 'No decisions recorded yet.'
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
    handler: ({ objects, memories }) => {
      const founder = findObjectByTitle(objects, 'founderos')
      const founderMemories = memories.filter(m =>
        m.relatedObjectIds.some(id => founder?.id === id)
        || m.title.toLowerCase().includes('founderos'),
      ).slice(0, 3)

      const lines: string[] = []
      if (founder) {
        const related = getRelatedObjects(founder, objects)
        lines.push(generateObjectSummary(founder, related, objects))
        if (related.length > 0) lines.push(`Related objects: ${related.map(o => o.title).join(', ')}.`)
      }
      if (founderMemories.length > 0) {
        lines.push('Recent FounderOS memories:')
        founderMemories.forEach(m => lines.push(`• ${m.title}`))
      }
      if (lines.length === 0) return 'FounderOS project not found in Object Engine.'
      return lines.join('\n\n')
    },
  },
  {
    keywords: ['block', 'stuck', 'overdue', 'behind'],
    handler: ({ commandCenter: s, executive }) => {
      if (executive?.warnings?.length) {
        const lines = [
          '**Executive Engine blockers & warnings:**',
          ...executive.warnings.map(w => `• ${w}`),
        ]
        if (executive.topFocus.title) {
          lines.push(`\nSuggested focus instead: ${executive.topFocus.title}`)
        }
        return lines.join('\n')
      }

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
    handler: ({ commandCenter: s, memories }) => {
      const today = todayISO()
      const log = s.dailyLogs.find(l => l.date === today)
      const healthMem = memories.find(m => m.type === 'health_log' && m.occurredAt.slice(0, 10) === today)

      if (!log && !healthMem) {
        return 'No health data logged today. Open the Health Snapshot card and record sleep, nutrition and movement.'
      }

      const parts: string[] = ['Today\'s health snapshot:']
      if (log?.sleepHours != null) parts.push(`Sleep: ${log.sleepHours}h`)
      if (log?.proteinGrams != null) parts.push(`Protein: ${log.proteinGrams}g`)
      if (log?.waterLitres != null) parts.push(`Water: ${log.waterLitres}L`)
      if (log?.weight != null) parts.push(`Weight: ${log.weight}kg`)
      if (log) parts.push(log.workoutCompleted ? 'Workout: completed ✓' : 'Workout: not yet completed')
      if (log?.mood) parts.push(`Mood: ${log.mood}`)
      if (healthMem) parts.push(`Memory: ${healthMem.content}`)

      if (log && !log.workoutCompleted) {
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
  memories: MemoryRecord[] = [],
  executive?: ExecutiveAssistantSnapshot | null,
): string {
  const normalized = prompt.trim().toLowerCase()
  if (!normalized) return 'Ask me about your focus, projects, objects, memories, blockers or health today.'

  const ctx: AssistantContext = { commandCenter, objects, memories, executive }

  for (const { keywords, handler } of PROMPT_MATCHERS) {
    if (keywords.some(k => normalized.includes(k))) {
      return handler(ctx)
    }
  }

  return [
    'I can help with:',
    '• "What should I focus on today?"',
    '• "What do you remember?"',
    '• "What decisions have I made?"',
    '• "What happened recently?"',
    '• "Why did we choose object-first?"',
    '• "What is related to FounderOS?"',
    '• "What is blocking me?"',
    '',
    generateRecentMemoryDigest(memories, 3),
    '',
    generateDailyBriefing(commandCenter),
  ].join('\n')
}

/** Replace with OpenAI / Edge Function in a future sprint. */
export async function fetchAssistantResponse(
  commandCenter: CommandCenterState,
  prompt: string,
  objects: FounderObject[] = [],
  memories: MemoryRecord[] = [],
  executive?: ExecutiveAssistantSnapshot | null,
): Promise<string> {
  return generateAssistantResponse(commandCenter, prompt, objects, memories, executive)
}

export const SUGGESTED_PROMPTS = [
  'What should I focus on today?',
  'What do you remember?',
  'What decisions have I made?',
  'What happened recently?',
  'Why did we choose object-first?',
] as const
