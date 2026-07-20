import type { PlannedExercise, TodaysWorkout } from './gymTypes'
import type { WorkoutExercisePrescription } from './evidence/gymEvidenceTypes'

/** Normalise exercise IDs for canonical comparison (lowercase, trimmed). */
export function normalizeExerciseId(exerciseId: string): string {
  return exerciseId.trim().toLowerCase()
}

export function buildWorkoutInstanceId(title: string, dateISO?: string): string {
  const day = (dateISO ?? new Date().toISOString()).slice(0, 10)
  const slug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'session'
  return `workout-${slug}-${day}`
}

/** Deterministic planned-exercise instance ID — stable across loads for the same workout + exercise + occurrence. */
export function buildPlannedExerciseInstanceId(
  workoutInstanceId: string,
  exerciseId: string,
  occurrence: number,
): string {
  return `${workoutInstanceId}::${normalizeExerciseId(exerciseId)}::${occurrence}`
}

function mergePrescription(
  primary: WorkoutExercisePrescription,
  duplicate: WorkoutExercisePrescription,
): WorkoutExercisePrescription {
  const claimIds = [...new Set([...primary.researchClaimIds, ...duplicate.researchClaimIds])]
  const userIds = [...new Set([...primary.userEvidenceIds, ...duplicate.userEvidenceIds])]
  const assumptions = [...new Set([...primary.assumptions, ...duplicate.assumptions])]
  const rationale = primary.rationale === duplicate.rationale
    ? primary.rationale
    : [primary.rationale, duplicate.rationale].filter(Boolean).join(' · ')
  const confidence = Math.max(primary.prescriptionConfidence, duplicate.prescriptionConfidence)
  const mode = primary.prescriptionMode === 'evidence_informed' || duplicate.prescriptionMode === 'evidence_informed'
    ? 'evidence_informed' as const
    : primary.prescriptionMode

  return {
    ...primary,
    prescriptionConfidence: confidence,
    prescriptionMode: mode,
    researchClaimIds: claimIds,
    userEvidenceIds: userIds,
    assumptions,
    rationale,
    explanation: {
      ...primary.explanation,
      personalReason: [primary.explanation.personalReason, duplicate.explanation.personalReason]
        .filter((v, i, arr) => v && arr.indexOf(v) === i).join(' · ') || primary.explanation.personalReason,
      missingDataForPersonalisation: [
        ...new Set([
          ...primary.explanation.missingDataForPersonalisation,
          ...duplicate.explanation.missingDataForPersonalisation,
        ]),
      ],
    },
  }
}

function mergePlannedExercise(keeper: PlannedExercise, duplicate: PlannedExercise): PlannedExercise {
  return {
    ...keeper,
    prescription: mergePrescription(keeper.prescription, duplicate.prescription),
    sets: Math.max(keeper.sets, duplicate.sets),
    targetRpe: Math.max(keeper.targetRpe, duplicate.targetRpe),
  }
}

export interface NormalizePlannedExercisesOptions {
  workoutInstanceId: string
  /** When true, repeated canonical IDs are kept (each gets its own occurrence index). */
  allowRepeatedExercise?: boolean
}

/**
 * Remove accidental duplicate canonical exercises, assign stable instance IDs, preserve order.
 * Does not mutate the input array.
 */
export function normalizePlannedExercises(
  exercises: PlannedExercise[],
  options: NormalizePlannedExercisesOptions,
): PlannedExercise[] {
  const { workoutInstanceId, allowRepeatedExercise = false } = options
  const occurrenceCount = new Map<string, number>()
  const result: PlannedExercise[] = []

  for (const ex of exercises) {
    const canonical = normalizeExerciseId(ex.exerciseId)
    const prevOccurrence = occurrenceCount.get(canonical) ?? 0

    if (prevOccurrence > 0 && !allowRepeatedExercise) {
      const keeperIdx = result.findIndex(
        r => normalizeExerciseId(r.exerciseId) === canonical,
      )
      if (keeperIdx >= 0) {
        result[keeperIdx] = mergePlannedExercise(result[keeperIdx], ex)
      }
      continue
    }

    const occurrence = prevOccurrence + 1
    occurrenceCount.set(canonical, occurrence)

    const plannedExerciseId = ex.plannedExerciseId
      && ex.plannedExerciseId.includes('::')
      ? ex.plannedExerciseId
      : buildPlannedExerciseInstanceId(workoutInstanceId, ex.exerciseId, occurrence)

    result.push({
      ...ex,
      plannedExerciseId,
      order: result.length + 1,
    })
  }

  return result
}

export interface PlannedWorkoutValidationResult {
  valid: boolean
  duplicateExerciseIds: string[]
  warning?: string
}

export function validatePlannedWorkout(
  workout: Pick<TodaysWorkout, 'workoutInstanceId' | 'title' | 'exercises'>,
  options?: { allowRepeatedExercise?: boolean },
): PlannedWorkoutValidationResult {
  const allowRepeated = options?.allowRepeatedExercise ?? false
  const seen = new Map<string, number>()
  const duplicates: string[] = []

  for (const ex of workout.exercises) {
    const canonical = normalizeExerciseId(ex.exerciseId)
    const count = (seen.get(canonical) ?? 0) + 1
    seen.set(canonical, count)
    if (count === 2) duplicates.push(canonical)
  }

  const valid = allowRepeated || duplicates.length === 0
  const warning = !valid
    ? `[Gym] Workout "${workout.title}" (${workout.workoutInstanceId}) contains duplicate exercise IDs: ${duplicates.join(', ')}`
    : undefined

  if (warning && typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.warn(warning)
  }

  return { valid, duplicateExerciseIds: duplicates, warning }
}

/** Finalise a generated workout: dedupe, assign IDs, validate. */
export function finalizeTodaysWorkout(
  workout: Omit<TodaysWorkout, 'workoutInstanceId'> & { workoutInstanceId?: string },
  dateISO?: string,
): TodaysWorkout {
  const workoutInstanceId = workout.workoutInstanceId ?? buildWorkoutInstanceId(workout.title, dateISO)
  const normalised = normalizePlannedExercises(workout.exercises, { workoutInstanceId })
  const finalWorkout: TodaysWorkout = {
    ...workout,
    workoutInstanceId,
    exercises: normalised,
  }
  validatePlannedWorkout(finalWorkout)
  return finalWorkout
}

/** React list key — prefers stable plannedExerciseId; index fallback only for malformed legacy rows. */
export function plannedExerciseListKey(
  ex: PlannedExercise,
  index: number,
): string {
  if (ex.plannedExerciseId) return ex.plannedExerciseId
  return `legacy-planned-exercise-${index}`
}

export interface ApprovedPlanExercise {
  plannedExerciseId?: string
  exerciseId: string
  exerciseName: string
  sets: number
  repRange: string
  targetReps: number
  targetRpe?: number
  targetRir?: number
  suggestedLoadKg?: number | null
  prescriptionConfidence: number
}

export function normalizeApprovedPlanExercises(
  exercises: ApprovedPlanExercise[],
  planId: string,
): ApprovedPlanExercise[] {
  const occurrenceCount = new Map<string, number>()
  const result: ApprovedPlanExercise[] = []

  for (const ex of exercises) {
    const canonical = normalizeExerciseId(ex.exerciseId)
    if (occurrenceCount.has(canonical)) continue

    const occurrence = (occurrenceCount.get(canonical) ?? 0) + 1
    occurrenceCount.set(canonical, occurrence)

    result.push({
      ...ex,
      plannedExerciseId: ex.plannedExerciseId
        ?? buildPlannedExerciseInstanceId(planId, ex.exerciseId, occurrence),
    })
  }

  return result
}

export interface ActiveExerciseRow {
  plannedExerciseId?: string
  exerciseId: string
  exerciseName: string
  order: number
}

export function normalizeActiveWorkoutExercises<T extends ActiveExerciseRow>(
  exercises: T[],
  workoutId: string,
): T[] {
  const occurrenceCount = new Map<string, number>()
  const result: T[] = []

  for (const ex of exercises) {
    const canonical = normalizeExerciseId(ex.exerciseId)
    if (occurrenceCount.has(canonical)) continue

    const occurrence = (occurrenceCount.get(canonical) ?? 0) + 1
    occurrenceCount.set(canonical, occurrence)

    result.push({
      ...ex,
      plannedExerciseId: ex.plannedExerciseId
        ?? buildPlannedExerciseInstanceId(workoutId, ex.exerciseId, occurrence),
      order: result.length + 1,
    })
  }

  return result
}

export function activeExerciseListKey(
  ex: { plannedExerciseId?: string; exerciseId: string },
  index: number,
): string {
  if (ex.plannedExerciseId) return ex.plannedExerciseId
  return `legacy-active-exercise-${ex.exerciseId}-${index}`
}
