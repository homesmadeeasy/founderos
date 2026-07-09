import type { CreateMemoryInput } from '@/lib/memory-engine/memoryTypes'
import { getMemories } from '@/lib/memory-engine/memoryStorage'
import type { MorningExecutionPlan, MorningStore } from './morningTypes'

export function newMorningId(prefix = 'morning'): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

const STORAGE_KEY = 'founderos-morning-execution-v1'

function loadStore(): MorningStore {
  if (typeof window === 'undefined') return { plans: [] }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { plans: [] }
    const parsed = JSON.parse(raw) as Partial<MorningStore>
    return { plans: parsed.plans ?? [] }
  } catch {
    return { plans: [] }
  }
}

function persistStore(store: MorningStore): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function getMorningPlan(date = todayISO()): MorningExecutionPlan | null {
  return loadStore().plans.find(p => p.date === date) ?? null
}

export function saveMorningPlan(plan: MorningExecutionPlan): MorningExecutionPlan {
  const store = loadStore()
  persistStore({
    plans: [
      plan,
      ...store.plans.filter(p => p.date !== plan.date),
    ].slice(0, 14),
  })
  return plan
}

export function clearMorningPlan(date = todayISO()): void {
  const store = loadStore()
  persistStore({ plans: store.plans.filter(p => p.date !== date) })
}

export function hasMorningPlanMemoryForDate(date: string): boolean {
  return getMemories().some(m =>
    m.tags.includes(`morning-plan:${date}`)
    || m.tags.includes(`dedupe:morning-plan-${date}`),
  )
}

export function memoryForMorningPlan(
  plan: MorningExecutionPlan,
  force = false,
): CreateMemoryInput | null {
  if (plan.memoryWritten && !force) return null
  if (!force && hasMorningPlanMemoryForDate(plan.date)) return null

  const relatedIds = plan.topPriorities.flatMap(p => p.relatedObjectIds)

  return {
    type: 'review',
    title: 'Morning execution plan generated',
    content: [
      plan.summary,
      `Primary: ${plan.primaryMission}`,
      `Priorities: ${plan.topPriorities.map(p => p.title).join(', ')}`,
    ].join('\n'),
    summary: plan.summary.slice(0, 200),
    importance: 'medium',
    area: 'systems',
    source: 'system',
    relatedObjectIds: [...new Set(relatedIds)],
    tags: ['morning-execution', `morning-plan:${plan.date}`, `dedupe:morning-plan-${plan.date}`],
  }
}
