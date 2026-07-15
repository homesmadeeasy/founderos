import type { GymEvidenceClaim, GymResearchSource, SourceStatus } from './gymEvidenceTypes'
import { GYM_EVIDENCE_SEED_CLAIMS, GYM_EVIDENCE_SEED_SOURCES } from './gymEvidenceSeed'

const sources = new Map<string, GymResearchSource>()
const claims = new Map<string, GymEvidenceClaim>()

function loadSeed(): void {
  if (sources.size > 0) return
  for (const s of GYM_EVIDENCE_SEED_SOURCES) sources.set(s.id, s)
  for (const c of GYM_EVIDENCE_SEED_CLAIMS) claims.set(c.id, c)
}

export function getResearchSource(id: string): GymResearchSource | undefined {
  loadSeed()
  return sources.get(id)
}

export function listResearchSources(status?: SourceStatus): GymResearchSource[] {
  loadSeed()
  const all = [...sources.values()]
  return status ? all.filter(s => s.status === status) : all
}

export function getEvidenceClaim(id: string): GymEvidenceClaim | undefined {
  loadSeed()
  return claims.get(id)
}

export function listEvidenceClaims(filter?: {
  status?: SourceStatus
  variable?: GymEvidenceClaim['variable']
  sourceId?: string
}): GymEvidenceClaim[] {
  loadSeed()
  let result = [...claims.values()]
  if (filter?.status) result = result.filter(c => c.status === filter.status)
  if (filter?.variable) result = result.filter(c => c.variable === filter.variable)
  if (filter?.sourceId) result = result.filter(c => c.sourceId === filter.sourceId)
  return result
}

export function listApprovedClaims(): GymEvidenceClaim[] {
  return listEvidenceClaims({ status: 'approved' })
}

export function registerResearchSource(source: GymResearchSource): void {
  loadSeed()
  sources.set(source.id, source)
}

export function registerEvidenceClaim(claim: GymEvidenceClaim): void {
  loadSeed()
  claims.set(claim.id, claim)
}

export function resetEvidenceRegistryForTests(): void {
  sources.clear()
  claims.clear()
}
