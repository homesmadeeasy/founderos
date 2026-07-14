import type { BeliefStatus } from './beliefTypes'

export function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value == null) return []
  return []
}

export function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return fallback
}

export function asBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (value === 'yes' || value === 'true' || value === 1) return true
  if (value === 'no' || value === 'false' || value === 0) return false
  return false
}

export function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

export function safeId(value: unknown, prefix: string): string {
  const id = asString(value).trim()
  return id || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function safeTimestamp(value: unknown): string {
  const ts = asString(value).trim()
  if (!ts) return nowISO()
  const parsed = Date.parse(ts)
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : nowISO()
}

export function truncateText(value: string, max: number): string {
  const text = asString(value)
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}

export function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  const result: T[] = []
  for (const item of items) {
    const id = asString(item?.id).trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    result.push(item)
  }
  return result
}

export function newBeliefId(): string {
  return `belief-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function newCognitiveId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function clampConfidence(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

export function statusFromConfidence(confidence: number): BeliefStatus {
  if (confidence >= 80) return 'confirmed'
  if (confidence >= 60) return 'likely'
  if (confidence >= 35) return 'possible'
  if (confidence >= 15) return 'unknown'
  return 'unknown'
}

export function confidenceLabel(confidence: number): string {
  if (confidence >= 80) return 'high confidence'
  if (confidence >= 60) return 'moderate confidence'
  if (confidence >= 35) return 'low confidence'
  return 'uncertain'
}

export function epistemicPhrase(status: BeliefStatus, confidence: number): string {
  if (status === 'confirmed') return 'I believe'
  if (status === 'likely') return 'I think'
  if (status === 'possible') return 'I suspect'
  if (status === 'contradicted') return "I'm uncertain because of conflicting evidence —"
  return "I don't yet have enough information, but"
}

export function daysSince(iso: string): number {
  const then = new Date(iso).getTime()
  const now = Date.now()
  return Math.floor((now - then) / (1000 * 60 * 60 * 24))
}

export function normalizeStatement(s: string): string {
  return asString(s).trim().replace(/\s+/g, ' ').toLowerCase()
}

export function cognitiveInputFingerprint(input: {
  mission: string
  decisionSummary: string
  founderSnapshot: { mainInsight: string; mainBottleneck: string; currentStage: string } | null
  memories: { id: string }[]
  signals: { id: string }[]
  outcomes: { id: string }[]
  knowledge: { id: string }[]
  conversationBeliefs: { key: string; displayValue: string }[]
}): string {
  const snap = input.founderSnapshot
  return [
    input.mission,
    input.decisionSummary,
    snap?.mainInsight ?? '',
    snap?.mainBottleneck ?? '',
    snap?.currentStage ?? '',
    input.memories.map((m) => m.id).join(','),
    input.signals.map((s) => s.id).join(','),
    input.outcomes.map((o) => o.id).join(','),
    input.knowledge.map((k) => k.id).join(','),
    input.conversationBeliefs.map((b) => `${b.key}:${b.displayValue}`).join(','),
  ].join('|')
}
