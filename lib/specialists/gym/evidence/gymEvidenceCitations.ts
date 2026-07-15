import type { GymResearchCitation, GymResearchSource } from './gymEvidenceTypes'
import { EVIDENCE_REVIEW_STALE_MONTHS } from './gymEvidenceTypes'
import { getResearchSource } from './gymEvidenceRegistry'

export function buildCitation(sourceId: string): GymResearchCitation | null {
  const source = getResearchSource(sourceId)
  if (!source) return null
  return citationFromSource(source)
}

export function citationsFromClaimIds(claimIds: string[], getClaimSource: (claimId: string) => string | undefined): GymResearchCitation[] {
  const seen = new Set<string>()
  const out: GymResearchCitation[] = []
  for (const claimId of claimIds) {
    const sourceId = getClaimSource(claimId)
    if (!sourceId || seen.has(sourceId)) continue
    seen.add(sourceId)
    const citation = buildCitation(sourceId)
    if (citation) out.push(citation)
  }
  return out
}

export function citationFromSource(source: GymResearchSource): GymResearchCitation {
  return {
    sourceId: source.id,
    title: source.title,
    authorsOrOrganisation: source.authorsOrOrganisation,
    year: source.year,
    url: source.url,
    doi: source.doi,
    status: source.status,
    reviewedAt: source.reviewedAt,
    isOutdated: isSourceOutdated(source),
  }
}

export function isSourceOutdated(source: GymResearchSource, now = new Date()): boolean {
  if (source.status === 'outdated') return true
  const reviewed = new Date(source.reviewedAt)
  const months = (now.getTime() - reviewed.getTime()) / (1000 * 60 * 60 * 24 * 30)
  return months > EVIDENCE_REVIEW_STALE_MONTHS
}

export function formatCitationShort(citation: GymResearchCitation): string {
  const id = citation.doi ? `doi:${citation.doi}` : citation.url ?? citation.sourceId
  return `${citation.authorsOrOrganisation} (${citation.year}). ${citation.title} [${id}]`
}
