import type { WorkoutExercisePrescription } from './gymEvidenceTypes'
import { getEvidenceClaim, getResearchSource } from './gymEvidenceRegistry'
import { formatCitationShort, citationFromSource } from './gymEvidenceCitations'

export interface GymKnowledgeReference {
  id: string
  title: string
  principle: string
  domain: 'gym'
  tags: string[]
  sourceRef: string
  claimRef?: string
}

export function buildKnowledgeReferencesFromPrescription(
  prescription: WorkoutExercisePrescription,
): GymKnowledgeReference[] {
  return prescription.researchClaimIds.map(claimId => {
    const claim = getEvidenceClaim(claimId)
    const source = claim ? getResearchSource(claim.sourceId) : undefined
    return {
      id: `gym-ref-${claimId}`,
      title: source?.title ?? `Research claim ${claimId}`,
      principle: claim?.claim ?? prescription.explanation.researchBasis.slice(0, 200),
      domain: 'gym' as const,
      tags: ['gym-evidence', 'research-reference', ...(claim?.tags ?? [])],
      sourceRef: claim?.sourceId ?? 'unknown',
      claimRef: claimId,
    }
  })
}

export function buildCognitiveEvidenceRefs(prescription: WorkoutExercisePrescription): {
  researchRefs: string[]
  personalRefs: string[]
  conflictNote?: string
} {
  const researchRefs = prescription.researchClaimIds.map(id => `gym-claim:${id}`)
  const personalRefs = prescription.userEvidenceIds.map(id => `gym-user:${id}`)

  let conflictNote: string | undefined
  if (personalRefs.length > 0 && prescription.contraindicationFlags.length > 0) {
    conflictNote = 'Personal pain or injury flags suggest a more conservative dose than general research defaults — both are retained.'
  }

  return { researchRefs, personalRefs, conflictNote }
}

export function formatPrescriptionForKnowledge(prescription: WorkoutExercisePrescription): string {
  const citations = prescription.researchClaimIds
    .map(id => getEvidenceClaim(id))
    .filter(Boolean)
    .map(c => {
      const source = getResearchSource(c!.sourceId)
      return source ? formatCitationShort(citationFromSource(source)) : c!.claim
    })
    .slice(0, 3)
  return [
    prescription.rationale,
    citations.length ? `Sources: ${citations.join('; ')}` : 'Fallback prescription — limited research match.',
  ].join(' ')
}
