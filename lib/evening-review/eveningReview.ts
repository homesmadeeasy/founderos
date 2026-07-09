import type { MorningExecutionPlan } from '@/lib/morning-execution/morningTypes'
import type { CreateEveningReviewInput, EveningReview } from './eveningTypes'
import { createEveningReview, getEveningReview } from './eveningStorage'
import { newEveningId, todayISO } from './eveningUtils'

export function buildEveningReviewDraft(
  morningPlan: MorningExecutionPlan | null,
  date = todayISO(),
): CreateEveningReviewInput {
  const priorityTitles = morningPlan?.topPriorities.map(p => p.title) ?? []

  return {
    date,
    morningPlanId: morningPlan?.id,
    completedPriorities: morningPlan
      ? morningPlan.topPriorities.filter(p => p.completed).map(p => p.title)
      : [],
    incompletePriorities: morningPlan
      ? morningPlan.topPriorities.filter(p => !p.completed).map(p => p.title)
      : priorityTitles,
    wins: [],
    blockers: morningPlan?.warnings.slice(0, 2) ?? [],
    lessons: [],
    reflection: '',
    tomorrowNotes: '',
  }
}

export function getOrCreateEveningReview(
  morningPlan: MorningExecutionPlan | null,
  date = todayISO(),
): EveningReview {
  const existing = getEveningReview(date)
  if (existing) return existing
  return createEveningReview(buildEveningReviewDraft(morningPlan, date))
}

export function syncPrioritiesFromMorning(
  review: EveningReview,
  morningPlan: MorningExecutionPlan | null,
): EveningReview {
  if (!morningPlan) return review

  const completed = morningPlan.topPriorities.filter(p => p.completed).map(p => p.title)
  const incomplete = morningPlan.topPriorities.filter(p => !p.completed).map(p => p.title)

  return {
    ...review,
    morningPlanId: morningPlan.id,
    completedPriorities: completed.length > 0 ? completed : review.completedPriorities,
    incompletePriorities: incomplete.length > 0 ? incomplete : review.incompletePriorities,
  }
}

export function togglePriorityCompletion(
  review: EveningReview,
  priorityTitle: string,
  completed: boolean,
): EveningReview {
  const completedSet = new Set(review.completedPriorities)
  const incompleteSet = new Set(review.incompletePriorities)

  if (completed) {
    completedSet.add(priorityTitle)
    incompleteSet.delete(priorityTitle)
  } else {
    incompleteSet.add(priorityTitle)
    completedSet.delete(priorityTitle)
  }

  return {
    ...review,
    completedPriorities: [...completedSet],
    incompletePriorities: [...incompleteSet],
  }
}

export function addListItem(
  review: EveningReview,
  field: 'wins' | 'blockers' | 'lessons',
  value: string,
): EveningReview {
  const trimmed = value.trim()
  if (!trimmed) return review
  return {
    ...review,
    [field]: [...review[field], trimmed],
  }
}

export function removeListItem(
  review: EveningReview,
  field: 'wins' | 'blockers' | 'lessons',
  index: number,
): EveningReview {
  return {
    ...review,
    [field]: review[field].filter((_, i) => i !== index),
  }
}

export function eveningReviewSummary(review: EveningReview): string {
  return [
    `Completed: ${review.completedPriorities.length}`,
    `Incomplete: ${review.incompletePriorities.length}`,
    review.wins.length > 0 ? `Wins: ${review.wins.join(', ')}` : null,
    review.lessons.length > 0 ? `Lessons: ${review.lessons.join(', ')}` : null,
    review.reflection ? `Reflection: ${review.reflection}` : null,
  ].filter(Boolean).join('. ')
}
