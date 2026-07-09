import type { CreateMemoryInput } from '@/lib/memory-engine/memoryTypes'
import type { KnowledgeSuggestion } from '@/lib/knowledge-engine/knowledgeTypes'
import type {
  OutcomeEvaluation,
  OutcomePrediction,
  OutcomeRecord,
  RecordOutcomeInput,
} from './outcomeTypes'
import {
  computeAccuracyScore,
  computeConfidenceAdjustment,
  computeFutureWeightChange,
} from './outcomeScoring'
import { newOutcomeId, nowISO } from './outcomeUtils'

export function evaluateOutcome(
  prediction: OutcomePrediction,
  outcome: OutcomeRecord,
): OutcomeEvaluation {
  const accuracyScore = computeAccuracyScore(outcome.completed, outcome.outcomeQuality)
  const futureWeightChange = computeFutureWeightChange(outcome.completed, outcome.outcomeQuality)
  const confidenceAdjustment = computeConfidenceAdjustment(outcome.completed, outcome.outcomeQuality)

  let whatWorked = ''
  let whatDidNotWork = ''
  let adjustment = ''

  if (outcome.completed === 'yes') {
    if (outcome.outcomeQuality === 'good' || outcome.outcomeQuality === 'excellent') {
      whatWorked = `Following "${prediction.predictedAction}" produced a ${outcome.outcomeQuality} result.`
      adjustment = `Boost similar ${prediction.decisionArea ?? 'priority'} decisions in future scoring.`
    } else if (outcome.outcomeQuality === 'neutral') {
      whatWorked = 'You followed the recommendation but results were mixed.'
      whatDidNotWork = outcome.actualResult || 'Outcome did not clearly improve the day.'
      adjustment = 'Keep confidence moderate for similar decisions.'
    } else {
      whatDidNotWork = outcome.actualResult || `Poor outcome despite following: ${prediction.predictedAction}`
      adjustment = `Penalise similar "${prediction.decisionTitle}" recommendations.`
    }
  } else if (outcome.completed === 'partial') {
    whatWorked = 'Partial follow-through — some benefit captured.'
    whatDidNotWork = outcome.actualResult || 'Full decision was not completed.'
    adjustment = 'Allow partial-credit weighting for similar decisions.'
  } else {
    whatDidNotWork = outcome.actualResult || `Did not follow: ${prediction.predictedAction}`
    if (outcome.outcomeQuality === 'good' || outcome.outcomeQuality === 'excellent') {
      whatWorked = 'Skipping this decision did not hurt — day still went well.'
      adjustment = 'Lower urgency for ignored similar decisions.'
    } else {
      adjustment = 'Reinforce importance of similar decisions when skipped with poor results.'
    }
  }

  if (outcome.lessons.trim()) {
    adjustment = `${adjustment} Lesson: ${outcome.lessons.trim()}`.trim()
  }

  return {
    id: newOutcomeId('eval'),
    predictionId: prediction.id,
    date: prediction.date,
    accuracyScore,
    whatWorked,
    whatDidNotWork,
    adjustment,
    futureWeightChange,
    confidenceAdjustment,
    createdAt: nowISO(),
  }
}

export function memoryForOutcome(
  prediction: OutcomePrediction,
  outcome: OutcomeRecord,
  evaluation: OutcomeEvaluation,
): CreateMemoryInput {
  return {
    type: 'decision',
    title: `Decision outcome: ${prediction.decisionTitle}`,
    content: [
      `Predicted: ${prediction.predictedAction}`,
      `Followed: ${outcome.completed}`,
      `Quality: ${outcome.outcomeQuality}`,
      outcome.actualResult ? `Result: ${outcome.actualResult}` : null,
      outcome.lessons ? `Lesson: ${outcome.lessons}` : null,
      `Accuracy: ${evaluation.accuracyScore}%`,
      evaluation.whatWorked ? `Worked: ${evaluation.whatWorked}` : null,
    ].filter(Boolean).join(' · '),
    occurredAt: nowISO(),
    importance: outcome.outcomeQuality === 'poor' ? 'high' : 'medium',
    source: 'system',
    relatedObjectIds: [],
    tags: ['decision-outcome', `outcome:${outcome.outcomeQuality}`, prediction.date, `dedupe:outcome-${prediction.id}`],
  }
}

export function knowledgeSuggestionFromOutcome(
  prediction: OutcomePrediction,
  outcome: OutcomeRecord,
): KnowledgeSuggestion | null {
  const lesson = outcome.lessons.trim()
  if (!lesson) return null

  return {
    memoryId: prediction.id,
    suggestedType: 'lesson',
    suggestedTitle: `Decision lesson: ${prediction.decisionTitle.slice(0, 40)}`,
    suggestedPrinciple: lesson,
    suggestedExplanation: `Learned from outcome on ${prediction.date}. Followed: ${outcome.completed}, quality: ${outcome.outcomeQuality}.`,
    suggestedDomain: prediction.decisionArea === 'knowledge' ? 'school'
      : prediction.decisionArea === 'health' ? 'health'
        : prediction.decisionArea === 'systems' ? 'founder'
          : 'life',
    confidence: outcome.outcomeQuality === 'excellent' || outcome.outcomeQuality === 'good'
      ? 'high'
      : 'medium',
    reason: 'Lesson logged during evening decision outcome review.',
  }
}

export function buildRecordFromInput(
  predictionId: string,
  date: string,
  input: RecordOutcomeInput,
): OutcomeRecord {
  return {
    id: newOutcomeId('rec'),
    date,
    predictionId,
    completed: input.completed,
    outcomeQuality: input.outcomeQuality,
    actualResult: input.actualResult.trim(),
    reflection: input.reflection?.trim() ?? '',
    energyAfter: input.energyAfter,
    moodAfter: input.moodAfter?.trim(),
    lessons: input.lessons?.trim() ?? '',
    createdAt: nowISO(),
  }
}
