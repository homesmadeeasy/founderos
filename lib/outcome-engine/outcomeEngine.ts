import type { DecisionOutput } from '@/lib/decision-engine/decisionTypes'
import type {
  OutcomeEvaluation,
  OutcomeHistoryEntry,
  OutcomePrediction,
  OutcomeRecord,
  OutcomeStats,
  RecordOutcomeInput,
  SimilarOutcomeMatch,
} from './outcomeTypes'
import {
  evaluateOutcome,
  buildRecordFromInput,
  knowledgeSuggestionFromOutcome,
  memoryForOutcome,
} from './outcomeEvaluation'
import { computeSuccessRate } from './outcomeScoring'
import type { CreateMemoryInput } from '@/lib/memory-engine/memoryTypes'
import type { KnowledgeSuggestion } from '@/lib/knowledge-engine/knowledgeTypes'
import {
  getEvaluationForPrediction,
  getOutcomeRecordForPrediction,
  getOutcomeStore,
  getPredictionById,
  getPredictionForDate,
  getPredictionForDateAndTitle,
  hasOutcomeForPrediction,
  saveOutcomeEvaluation,
  saveOutcomeRecord,
  savePrediction,
} from './outcomeStorage'
import {
  extractDecisionKeywords,
  newOutcomeId,
  normalizeDecisionTitle,
  nowISO,
  predictionKey,
  todayISO,
  titlesMatch,
  yesterdayISO,
} from './outcomeUtils'

export function createPredictionFromDecision(decision: DecisionOutput): OutcomePrediction {
  const date = todayISO()
  const title = decision.primaryDecision.title
  const key = predictionKey(date, title)
  const store = getOutcomeStore()

  const existing = store.predictions.find(
    p => predictionKey(p.date, p.decisionTitle) === key,
  )
  if (existing) return existing

  const sameDay = getPredictionForDate(date)
  if (sameDay && normalizeDecisionTitle(sameDay.decisionTitle) === normalizeDecisionTitle(title)) {
    return sameDay
  }

  const prediction: OutcomePrediction = {
    id: newOutcomeId('pred'),
    date,
    decisionId: decision.id,
    decisionTitle: title,
    predictedAction: decision.primaryDecision.action,
    predictedBenefit: decision.primaryDecision.reason,
    confidenceAtDecision: decision.confidence,
    decisionArea: decision.primaryDecision.area,
    evidenceIds: decision.evidence.map(e => `${e.sourceType}:${e.sourceId}`),
    createdAt: nowISO(),
  }

  if (sameDay) {
    return savePrediction({ ...prediction, id: sameDay.id, createdAt: sameDay.createdAt })
  }

  return savePrediction(prediction)
}

export function recordOutcome(
  predictionId: string,
  input: RecordOutcomeInput,
): { record: OutcomeRecord; evaluation: OutcomeEvaluation } | null {
  const prediction = getPredictionById(predictionId)
  if (!prediction) return null
  if (hasOutcomeForPrediction(predictionId)) {
    const existing = getOutcomeRecordForPrediction(predictionId)!
    const evaluation = getEvaluationForPrediction(predictionId)
      ?? evaluateOutcome(prediction, existing)
    return { record: existing, evaluation }
  }

  const record = buildRecordFromInput(predictionId, prediction.date, input)
  const evaluation = evaluateOutcome(prediction, record)
  saveOutcomeRecord(record)
  saveOutcomeEvaluation(evaluation)
  return { record, evaluation }
}

export { evaluateOutcome } from './outcomeEvaluation'

export function getOutcomeHistory(limit = 30): OutcomeHistoryEntry[] {
  const store = getOutcomeStore()
  return store.predictions.slice(0, limit).map(prediction => ({
    prediction,
    record: store.records.find(r => r.predictionId === prediction.id),
    evaluation: store.evaluations.find(e => e.predictionId === prediction.id),
  }))
}

export function getOutcomeStats(): OutcomeStats {
  const store = getOutcomeStore()
  const evaluations = store.evaluations
  const records = store.records
  const averageAccuracy = evaluations.length > 0
    ? Math.round(evaluations.reduce((s, e) => s + e.accuracyScore, 0) / evaluations.length)
    : 0
  const { wins, total } = computeSuccessRate(records)
  const followRate = records.length > 0
    ? Math.round((records.filter(r => r.completed === 'yes').length / records.length) * 100)
    : 0

  return {
    totalPredictions: store.predictions.length,
    totalOutcomes: records.length,
    evaluatedCount: evaluations.length,
    averageAccuracy,
    successRate: total > 0 ? Math.round((wins / total) * 100) : 0,
    followRate,
  }
}

export function getSimilarPastOutcomes(
  decisionTitle: string,
  area?: string,
  limit = 8,
): SimilarOutcomeMatch[] {
  const keywords = extractDecisionKeywords(decisionTitle, area)
  const store = getOutcomeStore()

  const matches = store.predictions
    .filter(p => {
      if (titlesMatch(p.decisionTitle, decisionTitle)) return true
      const pk = extractDecisionKeywords(p.decisionTitle, p.decisionArea)
      return keywords.some(k => pk.includes(k))
    })
    .slice(0, limit)
    .map(prediction => ({
      prediction,
      record: store.records.find(r => r.predictionId === prediction.id),
      evaluation: store.evaluations.find(e => e.predictionId === prediction.id),
    }))
    .filter(m => m.record && m.evaluation)

  return matches
}

export function getSuccessRateForDecision(decisionTitle: string, area?: string): {
  wins: number
  total: number
  label: string
} {
  const similar = getSimilarPastOutcomes(decisionTitle, area, 20)
  const records = similar.map(s => s.record!).filter(Boolean)
  const { wins, total } = computeSuccessRate(records)
  return {
    wins,
    total,
    label: total > 0 ? `${wins}/${total}` : '0/0',
  }
}

export function getYesterdayOutcome(): OutcomeHistoryEntry | null {
  const date = yesterdayISO()
  const prediction = getPredictionForDate(date)
  if (!prediction) return null
  return {
    prediction,
    record: getOutcomeRecordForPrediction(prediction.id) ?? undefined,
    evaluation: getEvaluationForPrediction(prediction.id) ?? undefined,
  }
}

export function buildOutcomeCompletionPayload(
  predictionId: string,
  input: RecordOutcomeInput,
): {
  record: OutcomeRecord
  evaluation: OutcomeEvaluation
  memory: CreateMemoryInput
  knowledgeSuggestion: KnowledgeSuggestion | null
} | null {
  const result = recordOutcome(predictionId, input)
  if (!result) return null
  const prediction = getPredictionById(predictionId)!
  return {
    ...result,
    memory: memoryForOutcome(prediction, result.record, result.evaluation),
    knowledgeSuggestion: knowledgeSuggestionFromOutcome(prediction, result.record),
  }
}

export function isPredictionTracked(date = todayISO()): boolean {
  return Boolean(getPredictionForDate(date))
}

export {
  getPredictionForDate,
  getPredictionForDateAndTitle,
  getPredictionById,
  hasOutcomeForPrediction,
}
