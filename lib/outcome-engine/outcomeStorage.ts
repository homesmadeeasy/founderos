import type {
  OutcomeEvaluation,
  OutcomePrediction,
  OutcomeRecord,
  OutcomeStore,
} from './outcomeTypes'
import { normalizeDecisionTitle, nowISO, predictionKey } from './outcomeUtils'

const STORAGE_KEY = 'founderos-outcome-engine-v1'

function emptyStore(): OutcomeStore {
  return { predictions: [], records: [], evaluations: [] }
}

function loadStore(): OutcomeStore {
  if (typeof window === 'undefined') return emptyStore()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw) as Partial<OutcomeStore>
    return {
      predictions: parsed.predictions ?? [],
      records: parsed.records ?? [],
      evaluations: parsed.evaluations ?? [],
    }
  } catch {
    return emptyStore()
  }
}

function persistStore(store: OutcomeStore): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function reloadOutcomeStore(): OutcomeStore {
  return loadStore()
}

export function getOutcomeStore(): OutcomeStore {
  return loadStore()
}

export function savePrediction(prediction: OutcomePrediction): OutcomePrediction {
  const store = loadStore()
  const key = predictionKey(prediction.date, prediction.decisionTitle)
  const existingIdx = store.predictions.findIndex(
    p => predictionKey(p.date, p.decisionTitle) === key,
  )
  const next = existingIdx >= 0
    ? store.predictions.map((p, i) => (i === existingIdx ? prediction : p))
    : [prediction, ...store.predictions]
  persistStore({ ...store, predictions: next.slice(0, 200) })
  return prediction
}

export function getPredictionById(id: string): OutcomePrediction | null {
  return loadStore().predictions.find(p => p.id === id) ?? null
}

export function getPredictionForDate(date: string): OutcomePrediction | null {
  return loadStore().predictions.find(p => p.date === date) ?? null
}

export function getPredictionForDateAndTitle(date: string, title: string): OutcomePrediction | null {
  const key = predictionKey(date, title)
  return loadStore().predictions.find(
    p => predictionKey(p.date, p.decisionTitle) === key,
  ) ?? null
}

export function saveOutcomeRecord(record: OutcomeRecord): OutcomeRecord {
  const store = loadStore()
  const next = [
    record,
    ...store.records.filter(r => r.predictionId !== record.predictionId),
  ]
  persistStore({ ...store, records: next.slice(0, 200) })
  return record
}

export function getOutcomeRecordForPrediction(predictionId: string): OutcomeRecord | null {
  return loadStore().records.find(r => r.predictionId === predictionId) ?? null
}

export function saveOutcomeEvaluation(evaluation: OutcomeEvaluation): OutcomeEvaluation {
  const store = loadStore()
  const next = [
    evaluation,
    ...store.evaluations.filter(e => e.predictionId !== evaluation.predictionId),
  ]
  persistStore({ ...store, evaluations: next.slice(0, 200) })
  return evaluation
}

export function getEvaluationForPrediction(predictionId: string): OutcomeEvaluation | null {
  return loadStore().evaluations.find(e => e.predictionId === predictionId) ?? null
}

export function hasOutcomeForPrediction(predictionId: string): boolean {
  return loadStore().records.some(r => r.predictionId === predictionId)
}
