import type { KnowledgeSuggestion } from '@/lib/knowledge-engine/knowledgeTypes'
import type { EveningReview } from '@/lib/evening-review/eveningTypes'

const TRAINING_PATTERNS = ['training', 'workout', 'gym', 'before training', 'before workout']
const OVERLOAD_PATTERNS = ['too much', 'overloaded', 'too many', 'spread thin', 'diluted']

export function extractKnowledgeSuggestionsFromLessons(
  lessons: string[],
  reviewDate: string,
): KnowledgeSuggestion[] {
  const suggestions: KnowledgeSuggestion[] = []

  for (const lesson of lessons) {
    const lower = lesson.toLowerCase()
    let suggestion: KnowledgeSuggestion | null = null

    if (TRAINING_PATTERNS.some(p => lower.includes(p)) && OVERLOAD_PATTERNS.some(p => lower.includes(p))) {
      suggestion = {
        memoryId: `evening-lesson-${reviewDate}`,
        suggestedType: 'rule',
        suggestedTitle: 'Protect training energy',
        suggestedPrinciple: 'Avoid overloading deep work immediately before high-intensity training.',
        suggestedDomain: 'gym',
        suggestedExplanation: `From evening lesson: "${lesson}"`,
        confidence: 'high',
        reason: 'Lesson mentions training overload pattern.',
      }
    } else if (OVERLOAD_PATTERNS.some(p => lower.includes(p))) {
      suggestion = {
        memoryId: `evening-lesson-${reviewDate}`,
        suggestedType: 'principle',
        suggestedTitle: 'One primary focus per day',
        suggestedPrinciple: 'When the day felt overloaded, reduce to a single primary outcome tomorrow.',
        suggestedDomain: 'founder',
        suggestedExplanation: `From evening lesson: "${lesson}"`,
        confidence: 'medium',
        reason: 'Overload lesson detected.',
      }
    } else if (lower.includes('sleep') || lower.includes('tired') || lower.includes('energy')) {
      suggestion = {
        memoryId: `evening-lesson-${reviewDate}`,
        suggestedType: 'rule',
        suggestedTitle: 'Recovery before intensity',
        suggestedPrinciple: 'Protect sleep and recovery before stacking high-intensity work.',
        suggestedDomain: 'health',
        suggestedExplanation: `From evening lesson: "${lesson}"`,
        confidence: 'medium',
        reason: 'Energy/sleep lesson detected.',
      }
    } else if (lesson.trim().length > 10) {
      suggestion = {
        memoryId: `evening-lesson-${reviewDate}`,
        suggestedType: 'lesson',
        suggestedTitle: `Lesson: ${lesson.slice(0, 50)}`,
        suggestedPrinciple: lesson,
        suggestedDomain: 'life',
        suggestedExplanation: 'Captured from evening review.',
        confidence: 'medium',
        reason: 'General lesson from evening review.',
      }
    }

    if (suggestion) suggestions.push(suggestion)
  }

  return suggestions
}

export function extractLessonsFromReview(review: EveningReview): string[] {
  const lessons = [...review.lessons]
  if (review.completedPriorities.length > 0 && review.incompletePriorities.length > 0) {
    lessons.push('Partial completion — carry incomplete priorities forward with intention.')
  }
  if (review.energyLevel === 'low') {
    lessons.push('Low energy day — protect recovery before stacking commitments tomorrow.')
  }
  return [...new Set(lessons)]
}
