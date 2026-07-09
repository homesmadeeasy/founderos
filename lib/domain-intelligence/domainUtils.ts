import type { CandidateAction } from '@/lib/decision-engine/decisionTypes'
import type { FounderObject } from '@/lib/object-engine/objectTypes'
import type { KnowledgeRecord } from '@/lib/knowledge-engine/knowledgeTypes'
import type { MemoryRecord } from '@/lib/memory-engine/memoryTypes'
import type { Signal } from '@/lib/signal-engine/signalTypes'
import type { DomainId, DomainPriority, DomainStatus } from './domainTypes'
import { DOMAIN_REGISTRY } from './domainRegistry'

export function nowISO(): string {
  return new Date().toISOString()
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function tomorrowISO(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

export function newDomainId(prefix = 'dom'): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}

export function textIncludesAny(text: string, terms: string[]): boolean {
  const lower = text.toLowerCase()
  return terms.some(t => lower.includes(t.toLowerCase()))
}

export function objectText(obj: FounderObject): string {
  return `${obj.title} ${obj.summary ?? ''} ${obj.content ?? ''} ${(obj.tags ?? []).join(' ')}`
}

export function memoryText(mem: MemoryRecord): string {
  return `${mem.title} ${mem.content} ${mem.summary ?? ''} ${(mem.tags ?? []).join(' ')}`
}

export function signalText(sig: Signal): string {
  return `${sig.title} ${sig.content} ${JSON.stringify(sig.metadata ?? {})}`
}

export function knowledgeText(k: KnowledgeRecord): string {
  return `${k.title} ${k.principle} ${k.explanation ?? ''}`
}

export function scoreToStatus(score: number, hasData: boolean): DomainStatus {
  if (!hasData) return 'unknown'
  if (score >= 80) return 'excellent'
  if (score >= 65) return 'good'
  if (score >= 45) return 'needs_attention'
  return 'at_risk'
}

export function scoreToPriority(score: number, hasUrgentSignals: boolean): DomainPriority {
  if (hasUrgentSignals || score <= 35) return 'critical'
  if (score <= 50) return 'high'
  if (score <= 65) return 'medium'
  return 'low'
}

export function matchesDomainKeywords(text: string, domainId: DomainId): boolean {
  const def = DOMAIN_REGISTRY[domainId]
  return textIncludesAny(text, def.keywords)
}

export function objectMatchesDomain(obj: FounderObject, domainId: DomainId): boolean {
  const def = DOMAIN_REGISTRY[domainId]
  if (obj.area && def.objectAreas.includes(obj.area)) {
    if (domainId === 'founder') {
      return textIncludesAny(objectText(obj), ['founderos', 'ascendos', 'cursor', 'product', 'startup', 'software', 'build', 'app'])
    }
    if (domainId === 'school') return obj.area === 'knowledge'
    if (domainId === 'systems' && textIncludesAny(objectText(obj), ['founderos', 'ascendos'])) return false
    return true
  }
  return matchesDomainKeywords(objectText(obj), domainId)
}

export function memoryMatchesDomain(mem: MemoryRecord, domainId: DomainId): boolean {
  if (mem.area && DOMAIN_REGISTRY[domainId].objectAreas.includes(mem.area)) {
    if (domainId === 'founder') return textIncludesAny(memoryText(mem), ['founderos', 'ascendos', 'product', 'coding'])
    if (domainId === 'school') return mem.area === 'knowledge'
    return true
  }
  if (domainId === 'relationships' && (mem.type === 'conversation' || mem.type === 'event')) {
    return matchesDomainKeywords(memoryText(mem), domainId)
  }
  return matchesDomainKeywords(memoryText(mem), domainId)
}

export function knowledgeMatchesDomain(k: KnowledgeRecord, domainId: DomainId): boolean {
  const def = DOMAIN_REGISTRY[domainId]
  if (k.domain && def.knowledgeDomains.includes(k.domain)) return true
  return matchesDomainKeywords(knowledgeText(k), domainId)
}

export function signalMatchesDomain(sig: Signal, domainId: DomainId): boolean {
  const def = DOMAIN_REGISTRY[domainId]
  if (def.signalTypes.includes(sig.type)) {
    if (domainId === 'founder') return sig.type === 'coding_session' || matchesDomainKeywords(signalText(sig), domainId)
    if (domainId === 'health') return ['health', 'workout'].includes(sig.type)
    return true
  }
  const metaDomain = (sig.metadata?.domain as string | undefined)?.toLowerCase()
  if (metaDomain === 'school' && domainId === 'school') return true
  if (metaDomain === 'finance' && domainId === 'finance') return true
  return matchesDomainKeywords(signalText(sig), domainId)
}

export function candidateToDomainId(candidate: CandidateAction): DomainId {
  const text = `${candidate.title} ${candidate.action} ${candidate.tags.join(' ')}`.toLowerCase()
  if (textIncludesAny(text, ['study', 'exam', 'economics', 'assignment', 'school', 'atar'])) return 'school'
  if (candidate.area === 'knowledge') return 'school'
  if (candidate.area === 'health' || candidate.tags.includes('workout') || candidate.tags.includes('recovery')) return 'health'
  if (candidate.area === 'inbox' || candidate.tags.includes('inbox')) return 'systems'
  if (candidate.area === 'growth') return 'personal_growth'
  if (candidate.area === 'career') return 'finance'
  if (textIncludesAny(text, ['family', 'friend', 'relationship', 'social'])) return 'relationships'
  if (textIncludesAny(text, ['read', 'journal', 'habit', 'reflection', 'discipline'])) return 'personal_growth'
  if (textIncludesAny(text, ['money', 'finance', 'income', 'savings', 'invest'])) return 'finance'
  if (textIncludesAny(text, ['founderos', 'ascendos', 'coding', 'product', 'startup'])) return 'founder'
  if (candidate.area === 'systems') return 'founder'
  return 'systems'
}

export function decisionAreaToDomain(area?: string, title?: string): DomainId | null {
  const text = (title ?? '').toLowerCase()
  if (textIncludesAny(text, ['study', 'exam', 'school', 'economics'])) return 'school'
  if (textIncludesAny(text, ['founderos', 'ascendos', 'coding'])) return 'founder'
  if (textIncludesAny(text, ['workout', 'gym', 'sleep', 'recover'])) return 'health'
  if (textIncludesAny(text, ['inbox', 'capture', 'review'])) return 'systems'
  switch (area) {
    case 'knowledge': return 'school'
    case 'health':
    case 'recovery': return 'health'
    case 'growth': return 'personal_growth'
    case 'career': return 'finance'
    case 'inbox':
    case 'planning': return 'systems'
    case 'systems': return textIncludesAny(text, ['founderos', 'ascendos']) ? 'founder' : 'systems'
    default: return null
  }
}

export const DOMAIN_STATUS_COLORS: Record<DomainStatus, string> = {
  excellent: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  good: 'text-blue-700 bg-blue-50 border-blue-200',
  needs_attention: 'text-amber-700 bg-amber-50 border-amber-200',
  at_risk: 'text-red-700 bg-red-50 border-red-200',
  unknown: 'text-zinc-500 bg-zinc-50 border-zinc-200',
}
