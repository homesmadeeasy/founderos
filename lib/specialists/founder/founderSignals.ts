import type { FounderInput } from './founderTypes'
import type { MemoryRecord } from '@/lib/memory-engine/memoryTypes'
import type { Signal } from '@/lib/signal-engine/signalTypes'
import type { FounderObject } from '@/lib/object-engine/objectTypes'
import type { KnowledgeRecord } from '@/lib/knowledge-engine/knowledgeTypes'

const FOUNDER_KEYWORDS = [
  'founderos', 'founder', 'startup', 'product', 'mvp', 'user', 'validation',
  'ship', 'build', 'code', 'cursor', 'engine', 'architecture', 'home',
  'domain', 'specialist', 'pmf', 'market', 'launch', 'feature',
]

const VALIDATION_KEYWORDS = [
  'user', 'feedback', 'interview', 'test', 'validate', 'customer', 'reaction',
  'demo', 'showed', 'asked', 'survey', 'usability', 'onboarding',
]

const ARCHITECTURE_KEYWORDS = [
  'engine', 'architecture', 'kernel', 'system', 'infrastructure', 'refactor',
  'milestone', 'layer', 'integration', 'pipeline', 'orchestration',
]

export function textMatchesFounder(text: string): boolean {
  const lower = text.toLowerCase()
  return FOUNDER_KEYWORDS.some(k => lower.includes(k))
}

export function textMatchesValidation(text: string): boolean {
  const lower = text.toLowerCase()
  return VALIDATION_KEYWORDS.some(k => lower.includes(k))
}

export function textMatchesArchitecture(text: string): boolean {
  const lower = text.toLowerCase()
  return ARCHITECTURE_KEYWORDS.some(k => lower.includes(k))
}

export interface FilteredFounderData {
  objects: FounderObject[]
  memories: MemoryRecord[]
  knowledge: KnowledgeRecord[]
  signals: Signal[]
  codingSignals: Signal[]
  validationMemories: MemoryRecord[]
  architectureMemories: MemoryRecord[]
  technicalMemories: MemoryRecord[]
  founderTasks: FounderObject[]
  founderProjects: FounderObject[]
  activeTasks: FounderObject[]
  completedTasks: FounderObject[]
  openAppTasks: number
  activeProjects: number
}

export function gatherFounderData(input: FounderInput): FilteredFounderData {
  const objects = input.objects.filter(o =>
    o.area === 'systems'
    || textMatchesFounder(`${o.title} ${o.summary ?? ''} ${o.content ?? ''} ${o.tags.join(' ')}`),
  )

  const memories = input.memories.filter(m =>
    m.area === 'systems' || m.area === 'career'
    || textMatchesFounder(`${m.title} ${m.content} ${m.summary ?? ''} ${m.tags.join(' ')}`),
  )

  const knowledge = input.knowledge.filter(k =>
    k.domain === 'founder' || k.domain === 'systems'
    || textMatchesFounder(`${k.title} ${k.principle} ${k.tags.join(' ')}`),
  )

  const signals = input.signals.filter(s =>
    s.type === 'coding_session' || s.type === 'task' || s.type === 'idea'
    || textMatchesFounder(`${s.title} ${s.content}`),
  )

  const codingSignals = signals.filter(s => s.type === 'coding_session')

  const validationMemories = memories.filter(m =>
    textMatchesValidation(`${m.title} ${m.content} ${m.summary ?? ''}`),
  )

  const architectureMemories = memories.filter(m =>
    textMatchesArchitecture(`${m.title} ${m.content} ${m.summary ?? ''}`),
  )

  const technicalMemories = memories.filter(m =>
    ['project_update', 'object_change', 'insight', 'event'].includes(m.type)
    && (textMatchesArchitecture(`${m.title} ${m.content}`) || textMatchesFounder(`${m.title} ${m.content}`)),
  ).slice(0, 12)

  const founderTasks = objects.filter(o => o.type === 'task')
  const founderProjects = objects.filter(o => o.type === 'project' || o.type === 'goal')
  const activeTasks = founderTasks.filter(o => o.status !== 'completed' && o.status !== 'archived')
  const completedTasks = founderTasks.filter(o => o.status === 'completed')

  const openAppTasks = input.openTaskCount ?? input.tasks.filter(t => t.status !== 'done').length
  const activeProjects = input.activeProjectCount
    ?? input.projects.filter(p => ['planning', 'building', 'testing', 'launched'].includes(p.status)).length

  return {
    objects,
    memories,
    knowledge,
    signals,
    codingSignals,
    validationMemories,
    architectureMemories,
    technicalMemories,
    founderTasks,
    founderProjects,
    activeTasks,
    completedTasks,
    openAppTasks,
    activeProjects,
  }
}
