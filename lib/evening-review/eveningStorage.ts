import type { CreateEveningReviewInput, EveningReview, EveningReviewStore, UpdateEveningReviewInput } from './eveningTypes'
import { newEveningId, nowISO, todayISO } from './eveningUtils'

const STORAGE_KEY = 'founderos-evening-review-v1'

function loadStore(): EveningReviewStore {
  if (typeof window === 'undefined') return { reviews: [] }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { reviews: [] }
    const parsed = JSON.parse(raw) as Partial<EveningReviewStore>
    return { reviews: parsed.reviews ?? [] }
  } catch {
    return { reviews: [] }
  }
}

function persistStore(store: EveningReviewStore): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function getEveningReview(date = todayISO()): EveningReview | null {
  return loadStore().reviews.find(r => r.date === date) ?? null
}

export function saveEveningReview(review: EveningReview): EveningReview {
  const store = loadStore()
  persistStore({
    reviews: [
      review,
      ...store.reviews.filter(r => r.date !== review.date),
    ].slice(0, 14),
  })
  return review
}

export function createEveningReview(input: CreateEveningReviewInput): EveningReview {
  const now = nowISO()
  const review: EveningReview = {
    ...input,
    id: input.id ?? newEveningId('review'),
    generatedMemories: input.generatedMemories ?? [],
    suggestedKnowledgeIds: input.suggestedKnowledgeIds ?? [],
    matteredSignalIds: input.matteredSignalIds ?? [],
    memoriesWritten: input.memoriesWritten ?? false,
    completed: input.completed ?? false,
    completedPriorities: input.completedPriorities ?? [],
    incompletePriorities: input.incompletePriorities ?? [],
    wins: input.wins ?? [],
    blockers: input.blockers ?? [],
    lessons: input.lessons ?? [],
    reflection: input.reflection ?? '',
    tomorrowNotes: input.tomorrowNotes ?? '',
    createdAt: now,
    updatedAt: now,
  }
  return saveEveningReview(review)
}

export function updateEveningReview(id: string, updates: UpdateEveningReviewInput): EveningReview | null {
  const store = loadStore()
  const idx = store.reviews.findIndex(r => r.id === id)
  if (idx === -1) return null
  const updated: EveningReview = {
    ...store.reviews[idx],
    ...updates,
    updatedAt: nowISO(),
  }
  const next = [...store.reviews]
  next[idx] = updated
  persistStore({ reviews: next })
  return updated
}

export function completeEveningReview(id: string): EveningReview | null {
  return updateEveningReview(id, { completed: true })
}

export function getRecentEveningReviews(limit = 7): EveningReview[] {
  return loadStore().reviews
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit)
}
