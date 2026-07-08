import type { MemoryRecord } from './memoryTypes'
import { MEMORY_TYPE_LABEL } from './memoryTypes'
import { todayISO } from './memoryUtils'

export interface MemoryTimelineGroup {
  date: string
  label: string
  memories: MemoryRecord[]
}

export function buildMemoryTimeline(memories: MemoryRecord[]): MemoryTimelineGroup[] {
  const sorted = [...memories].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  )
  const groups = new Map<string, MemoryRecord[]>()
  for (const m of sorted) {
    const date = m.occurredAt.slice(0, 10)
    const list = groups.get(date) ?? []
    list.push(m)
    groups.set(date, list)
  }
  return [...groups.entries()].map(([date, items]) => ({
    date,
    label: formatTimelineDate(date),
    memories: items,
  }))
}

function formatTimelineDate(date: string): string {
  const today = todayISO()
  if (date === today) return 'Today'
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (date === yesterday.toISOString().slice(0, 10)) return 'Yesterday'
  return new Date(date).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

export function groupMemoriesByType(memories: MemoryRecord[]): Record<string, number> {
  return memories.reduce<Record<string, number>>((acc, m) => {
    const label = MEMORY_TYPE_LABEL[m.type]
    acc[label] = (acc[label] ?? 0) + 1
    return acc
  }, {})
}
