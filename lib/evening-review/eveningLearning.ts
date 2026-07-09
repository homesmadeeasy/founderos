import type { CreateMemoryInput } from '@/lib/memory-engine/memoryTypes'
import { getMemories } from '@/lib/memory-engine/memoryStorage'
import type { EveningReview } from './eveningTypes'
import { eveningReviewSummary } from './eveningReview'

export function hasEveningReviewMemoriesForDate(date: string): boolean {
  return getMemories().some(m =>
    m.tags.includes(`evening-review:${date}`)
    || m.tags.includes(`dedupe:evening-review-${date}`),
  )
}

export function buildEveningReviewMemories(
  review: EveningReview,
): CreateMemoryInput[] {
  if (review.memoriesWritten || hasEveningReviewMemoriesForDate(review.date)) {
    return []
  }

  const memories: CreateMemoryInput[] = []
  const baseTags = ['evening-review', `evening-review:${review.date}`, `dedupe:evening-review-${review.date}`]

  memories.push({
    type: 'review',
    title: 'Evening Review Completed',
    content: eveningReviewSummary(review),
    summary: `Closed the loop for ${review.date}.`,
    importance: 'high',
    area: 'systems',
    source: 'system',
    relatedObjectIds: [],
    tags: [...baseTags, 'completion'],
  })

  for (const win of review.wins) {
    memories.push({
      type: 'reflection',
      title: `Win: ${win.slice(0, 60)}`,
      content: win,
      importance: 'medium',
      area: 'growth',
      source: 'system',
      relatedObjectIds: [],
      tags: [...baseTags, 'win'],
    })
  }

  for (const blocker of review.blockers) {
    memories.push({
      type: 'insight',
      title: `Blocker: ${blocker.slice(0, 60)}`,
      content: blocker,
      importance: 'high',
      area: 'systems',
      source: 'system',
      relatedObjectIds: [],
      tags: [...baseTags, 'blocker'],
    })
  }

  for (const lesson of review.lessons) {
    memories.push({
      type: 'learning',
      title: `Lesson: ${lesson.slice(0, 60)}`,
      content: lesson,
      importance: 'high',
      area: 'growth',
      source: 'system',
      relatedObjectIds: [],
      tags: [...baseTags, 'lesson'],
    })
  }

  return memories
}
