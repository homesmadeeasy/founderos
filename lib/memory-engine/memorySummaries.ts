import type { MemoryRecord } from './memoryTypes'
import { MEMORY_TYPE_LABEL } from './memoryTypes'
import { isSameDay, todayISO } from './memoryUtils'

export function generateMemorySummary(memory: MemoryRecord): string {
  const type = MEMORY_TYPE_LABEL[memory.type].toLowerCase()
  const when = new Date(memory.occurredAt).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
  const body = memory.summary || memory.content
  return `On ${when}, a ${type} was recorded: "${memory.title}". ${body}`
}

export function generateDailyMemoryDigest(memories: MemoryRecord[], date = todayISO()): string {
  const dayMemories = memories.filter(m => isSameDay(m.occurredAt, date))
  if (dayMemories.length === 0) {
    return `No memories recorded for ${date}.`
  }
  const highlights = dayMemories.slice(0, 5).map(m => m.title).join('; ')
  return `On this day (${date}), ${dayMemories.length} memory record${dayMemories.length === 1 ? '' : 's'}: ${highlights}.`
}

export function generateRecentMemoryDigest(memories: MemoryRecord[], limit = 5): string {
  const sorted = [...memories].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  )
  const recent = sorted.slice(0, limit)
  if (recent.length === 0) return 'No memories recorded yet.'
  const parts = recent.map(m => {
    const type = MEMORY_TYPE_LABEL[m.type].toLowerCase()
    return `${type}: ${m.title}`
  })
  return `Recently, you ${parts.join('; ')}.`
}

export function summarizeMemoriesByType(
  memories: MemoryRecord[],
  type: MemoryRecord['type'],
  limit = 5,
): string {
  const filtered = memories.filter(m => m.type === type).slice(0, limit)
  if (filtered.length === 0) return `No ${MEMORY_TYPE_LABEL[type].toLowerCase()} memories found.`
  return filtered.map(m => `• ${m.title}${m.summary ? ` — ${m.summary}` : ''}`).join('\n')
}
