import type { TrainingGoal } from './gymEvidenceTypes'
import { mapGymGoalToTrainingGoal } from './gymEvidenceClaims'

export function goalToTrainingGoal(goal: string): TrainingGoal {
  return mapGymGoalToTrainingGoal(goal)
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)))
}

export function midpoint(min: number, max: number): number {
  return Math.round((min + max) / 2)
}

export function parseRepRange(text: string): { min: number; max: number } {
  const parts = text.split('-').map(p => parseInt(p.trim(), 10)).filter(n => Number.isFinite(n))
  if (parts.length >= 2) return { min: parts[0], max: parts[1] }
  if (parts.length === 1) return { min: parts[0], max: parts[0] }
  return { min: 8, max: 12 }
}

export function stablePrescriptionKey(parts: (string | number | boolean | undefined | null)[]): string {
  return parts.map(p => String(p ?? '')).join('|')
}
