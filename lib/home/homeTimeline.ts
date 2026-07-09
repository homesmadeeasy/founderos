import { todayISO } from '@/lib/command-center/utils'
import type { DecisionOutput } from '@/lib/decision-engine/decisionTypes'
import type { MorningExecutionPlan } from '@/lib/morning-execution/morningTypes'
import type { Signal } from '@/lib/signal-engine/signalTypes'
import type { RecommendedPlanItem } from '@/lib/reasoning-engine/reasoningTypes'

export type TimelineItemKind = 'calendar' | 'task' | 'workout' | 'deep-work' | 'study' | 'meeting' | 'recommendation'

export interface TimelineItem {
  id: string
  time: string
  sortKey: number
  kind: TimelineItemKind
  title: string
  subtitle?: string
  accent: string
}

const KIND_ACCENTS: Record<TimelineItemKind, string> = {
  calendar: 'bg-sky-500',
  task: 'bg-zinc-400',
  workout: 'bg-emerald-500',
  'deep-work': 'bg-indigo-500',
  study: 'bg-amber-500',
  meeting: 'bg-violet-500',
  recommendation: 'bg-rose-500',
}

export function buildTodayTimeline(input: {
  signals: Signal[]
  morningPlan?: MorningExecutionPlan | null
  decision?: DecisionOutput | null
}): TimelineItem[] {
  const today = todayISO()
  const items: TimelineItem[] = []

  for (const signal of input.signals) {
    const start = (signal.metadata?.start as string | undefined) ?? signal.timestamp
    if (!start.slice(0, 10).startsWith(today)) continue
    const text = `${signal.title} ${signal.content}`.toLowerCase()
    let kind: TimelineItemKind = 'calendar'
    if (text.includes('study') || text.includes('exam') || text.includes('class')) kind = 'study'
    else if (text.includes('workout') || text.includes('gym')) kind = 'workout'
    else if (text.includes('meeting') || signal.type === 'event') kind = 'meeting'
    const time = start.length > 10 ? start.slice(11, 16) : '—'
    items.push({
      id: `sig-${signal.id}`,
      time: time || 'All day',
      sortKey: parseTimeSort(time),
      kind,
      title: signal.title,
      subtitle: signal.content.slice(0, 80),
      accent: KIND_ACCENTS[kind],
    })
  }

  const priorities = input.morningPlan?.topPriorities ?? []
  for (const item of priorities.filter(p => !p.completed).slice(0, 4)) {
    const kind = inferPlanKind(item)
    items.push({
      id: `plan-${item.id}`,
      time: 'Today',
      sortKey: 500 + priorities.indexOf(item),
      kind,
      title: item.title,
      subtitle: item.reason,
      accent: KIND_ACCENTS[kind],
    })
  }

  for (const block of input.morningPlan?.scheduleBlocks ?? []) {
    const kind = block.type === 'Deep Work' ? 'deep-work'
      : block.type === 'Health' ? 'workout'
        : block.type === 'Learning' ? 'study'
          : 'task'
    items.push({
      id: `block-${block.id}`,
      time: `${block.durationMinutes}m`,
      sortKey: 400 + block.durationMinutes,
      kind,
      title: block.label,
      subtitle: block.type,
      accent: KIND_ACCENTS[kind],
    })
  }

  if (input.decision) {
    items.push({
      id: `decision-${input.decision.id}`,
      time: 'Now',
      sortKey: 0,
      kind: 'recommendation',
      title: input.decision.primaryDecision.action,
      subtitle: input.decision.primaryDecision.reason,
      accent: KIND_ACCENTS.recommendation,
    })
  }

  return items
    .sort((a, b) => a.sortKey - b.sortKey)
    .slice(0, 12)
}

function inferPlanKind(item: RecommendedPlanItem): TimelineItemKind {
  const text = `${item.title} ${item.area ?? ''}`.toLowerCase()
  if (text.includes('study') || text.includes('exam') || item.area === 'knowledge') return 'study'
  if (text.includes('workout') || text.includes('gym') || item.area === 'health') return 'workout'
  if (text.includes('founderos') || text.includes('build')) return 'deep-work'
  return 'task'
}

function parseTimeSort(time: string): number {
  if (!time || time === '—' || time === 'All day') return 600
  const [h, m] = time.split(':').map(Number)
  if (Number.isNaN(h)) return 600
  return h * 60 + (m || 0)
}
