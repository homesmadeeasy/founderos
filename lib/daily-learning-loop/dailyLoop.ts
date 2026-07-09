import { buildEveningReviewMemories } from '@/lib/evening-review/eveningLearning'
import { newEveningId, nowISO } from '@/lib/evening-review/eveningUtils'
import type { DailyLearningLoopOutput, GenerateDailyLearningLoopInput } from './dailyLoopTypes'
import {
  extractKnowledgeSuggestionsFromLessons,
  extractLessonsFromReview,
} from './learningExtraction'

export function generateDailyLearningLoop(
  input: GenerateDailyLearningLoopInput,
): DailyLearningLoopOutput {
  const { morningPlan, eveningReview, executiveState } = input
  const lessons = extractLessonsFromReview(eveningReview)

  const whatWorked = [
    ...eveningReview.wins,
    ...eveningReview.completedPriorities.map(p => `Completed: ${p}`),
  ]

  const whatDidNotWork = [
    ...eveningReview.incompletePriorities.map(p => `Incomplete: ${p}`),
    ...eveningReview.blockers,
  ]

  const knowledgeSuggestions = extractKnowledgeSuggestionsFromLessons(
    lessons,
    eveningReview.date,
  )

  const carryOver = eveningReview.incompletePriorities.length > 0
    ? eveningReview.incompletePriorities
    : morningPlan?.topPriorities.filter(p => !p.completed).map(p => p.title) ?? []

  const warnings = [
    ...executiveState.warnings.slice(0, 2),
    ...eveningReview.blockers.slice(0, 2),
  ]

  const suggestedFocus = carryOver[0]
    ?? morningPlan?.primaryMission
    ?? executiveState.recommendations[0]?.title.replace(/^Primary focus:\s*/i, '')
    ?? 'Set tomorrow mission in Morning Execution'

  const recommendedMission = eveningReview.tomorrowNotes.trim()
    || (carryOver.length > 0 ? `Carry forward: ${carryOver[0]}` : undefined)

  const tomorrowContext = {
    recommendedMission,
    carryOverPriorities: carryOver.slice(0, 3),
    warnings: [...new Set(warnings)].slice(0, 4),
    suggestedFocus,
    notes: eveningReview.tomorrowNotes.trim() || eveningReview.reflection.trim() || undefined,
  }

  const summary = [
    `Evening loop for ${eveningReview.date}.`,
    `${eveningReview.completedPriorities.length} priorities completed, ${eveningReview.incompletePriorities.length} incomplete.`,
    lessons.length > 0 ? `${lessons.length} lesson(s) captured.` : null,
    carryOver.length > 0 ? `Tomorrow focus: ${suggestedFocus}.` : null,
  ].filter(Boolean).join(' ')

  return {
    id: newEveningId('loop'),
    date: eveningReview.date,
    summary,
    whatWorked,
    whatDidNotWork,
    lessons,
    generatedMemoryInputs: buildEveningReviewMemories(eveningReview),
    knowledgeSuggestions,
    tomorrowContext,
    createdAt: nowISO(),
  }
}
