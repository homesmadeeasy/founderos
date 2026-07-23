import type { IdentityEvidence, IdentitySource } from './identityTypes'
import { newIdentityId, nowISO } from './identityUtils'

export function createEvidence(input: {
  summary: string
  detail?: string
  source: IdentitySource
  observedAt?: string
  weight?: number
  factId?: string
  metadata?: Record<string, unknown>
}): IdentityEvidence {
  const now = nowISO()
  return {
    id: newIdentityId(),
    factId: input.factId,
    source: input.source,
    summary: input.summary.trim(),
    detail: input.detail?.trim() || undefined,
    observedAt: input.observedAt ?? now,
    weight: clampWeight(input.weight ?? 0.7),
    metadata: input.metadata,
    createdAt: now,
  }
}

export function averageEvidenceWeight(evidence: IdentityEvidence[]): number {
  if (evidence.length === 0) return 0
  return evidence.reduce((s, e) => s + e.weight, 0) / evidence.length
}

export function newestEvidenceAt(evidence: IdentityEvidence[]): string | null {
  if (evidence.length === 0) return null
  return [...evidence].sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0].observedAt
}

function clampWeight(n: number): number {
  if (!Number.isFinite(n)) return 0.5
  return Math.max(0, Math.min(1, n))
}
