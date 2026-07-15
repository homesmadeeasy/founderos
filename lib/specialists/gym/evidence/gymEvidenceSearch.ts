import type { GymEvidenceClaim, GymResearchSource, PrescriptionVariable, TrainingGoal } from './gymEvidenceTypes'
import { listApprovedClaims, listResearchSources } from './gymEvidenceRegistry'
import { mapGymGoalToTrainingGoal } from './gymEvidenceClaims'

export interface EvidenceSearchQuery {
  variable?: PrescriptionVariable
  goal?: TrainingGoal | string
  muscle?: string
  text?: string
  approvedOnly?: boolean
}

export function searchEvidenceClaims(query: EvidenceSearchQuery): GymEvidenceClaim[] {
  const goal = query.goal
    ? (typeof query.goal === 'string' ? mapGymGoalToTrainingGoal(query.goal) : query.goal)
    : undefined

  let results = query.approvedOnly === false
    ? listResearchSources().flatMap(s =>
      listApprovedClaims().filter(c => c.sourceId === s.id),
    )
    : listApprovedClaims()

  if (query.variable) results = results.filter(c => c.variable === query.variable)
  if (goal) results = results.filter(c => c.goals.includes(goal))
  if (query.muscle) results = results.filter(c => !c.muscles?.length || c.muscles.includes(query.muscle as never))
  if (query.text) {
    const t = query.text.toLowerCase()
    results = results.filter(c => c.claim.toLowerCase().includes(t) || c.tags.some(tag => tag.includes(t)))
  }
  return results
}

export function searchResearchSources(text?: string): GymResearchSource[] {
  const all = listResearchSources()
  if (!text) return all
  const t = text.toLowerCase()
  return all.filter(s =>
    s.title.toLowerCase().includes(t)
    || s.authorsOrOrganisation.toLowerCase().includes(t)
    || s.summary.toLowerCase().includes(t),
  )
}
