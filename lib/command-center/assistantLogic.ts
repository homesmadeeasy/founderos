import type { CommandCenterState } from './types'
import { generateDailyBriefing } from './briefingLogic'
import { isDueToday, isOverdue, todayISO } from './utils'

const PROMPT_MATCHERS: { keywords: string[]; handler: (s: CommandCenterState) => string }[] = [
  {
    keywords: ['focus', 'today', 'priority', 'priorities', 'should i'],
    handler: (s) => {
      const today = todayISO()
      const mission = s.missionDate === today ? s.mission.trim() : ''
      const open = s.tasks.filter(t => t.status !== 'done')
      const top = open.find(t => isDueToday(t.dueDate, today) && t.priority === 'high')
        ?? open.find(t => t.priority === 'high')
        ?? open[0]

      const lines = [generateDailyBriefing(s)]
      if (mission) lines.unshift(`Mission: ${mission}`)
      if (top) lines.push(`I'd start with: "${top.title}".`)
      return lines.join('\n\n')
    },
  },
  {
    keywords: ['project', 'projects', 'summar'],
    handler: (s) => {
      const active = s.projects.filter(p => p.status === 'active')
      if (active.length === 0) return 'You have no active projects. Create one to organise your work.'
      return active.map(p =>
        `• **${p.name}** (${p.area}) — ${p.outcome || 'No outcome set.'} Next: ${p.nextAction || 'Define a next action.'}`,
      ).join('\n')
    },
  },
  {
    keywords: ['block', 'stuck', 'overdue', 'behind'],
    handler: (s) => {
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
    handler: (s) => {
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

export function generateAssistantResponse(state: CommandCenterState, prompt: string): string {
  const normalized = prompt.trim().toLowerCase()
  if (!normalized) return 'Ask me about your focus, projects, blockers or health today.'

  for (const { keywords, handler } of PROMPT_MATCHERS) {
    if (keywords.some(k => normalized.includes(k))) {
      return handler(state)
    }
  }

  return [
    'I can help with:',
    '• "What should I focus on today?"',
    '• "Summarise my current projects."',
    '• "What is blocking me?"',
    '• "How is my health today?"',
    '',
    generateDailyBriefing(state),
  ].join('\n')
}

/** Replace with OpenAI / Edge Function in a future sprint. */
export async function fetchAssistantResponse(
  state: CommandCenterState,
  prompt: string,
): Promise<string> {
  return generateAssistantResponse(state, prompt)
}

export const SUGGESTED_PROMPTS = [
  'What should I focus on today?',
  'Summarise my current projects.',
  'What is blocking me?',
  'How is my health today?',
] as const
