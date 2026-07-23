/**
 * SupabaseGymRepository — authenticated hosted persistence via anon key + RLS.
 * Does not use the service-role key. Maps domain records to gym_* tables.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { GymRepository } from './gymRepository'
import type {
  ActiveWorkout,
  ApprovedWorkoutPlan,
  ExercisePerformanceRecord,
  GymProfile,
  ProgressionRecord,
  SetPerformanceRecord,
  WorkoutSessionRecord,
} from './gymStorageTypes'
import { exerciseKey } from '../gymActiveWorkoutEngine'

function asUuidOrNull(id: string): string | null {
  // Domain IDs may be conv-* strings; cloud rows use UUID PKs.
  // When the id is not a UUID, callers should treat it as client-only until mapped.
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ? id
    : null
}

export function createSupabaseGymRepository(client: SupabaseClient, userId: string): GymRepository {
  async function requireUser() {
    if (!userId) throw new Error('SupabaseGymRepository requires an authenticated user id')
  }

  async function upsertSessionTree(session: WorkoutSessionRecord) {
    await requireUser()
    const sessionId = asUuidOrNull(session.id)
    if (!sessionId) {
      throw new Error('Cloud session persistence requires UUID session ids')
    }

    const { error: sessionError } = await client.from('gym_workout_sessions').upsert({
      id: sessionId,
      user_id: userId,
      title: session.title,
      planned_date: session.scheduledFor?.slice(0, 10) ?? null,
      started_at: session.startedAt || null,
      completed_at: session.completedAt || null,
      status: session.status === 'paused' ? 'in_progress' : session.status,
      logger_status: session.status === 'paused' ? 'paused' : session.status === 'in_progress' ? 'active' : null,
      completed: session.completed,
      duration_minutes: session.durationMinutes ?? null,
      skip_reason: session.skipReason ?? null,
      skip_note: session.skipNote ?? null,
      notes: session.sessionNotes ?? null,
      session_notes: session.sessionNotes ?? null,
      pain_flags: session.painFlags ?? [],
      adherence_score: session.adherenceScore ?? null,
      total_volume_kg: session.totalVolumeKg ?? null,
      source: session.source,
      session_rpe: session.sessionRpe ?? null,
      energy_after: session.energyAfter ?? null,
      discomfort_reported: session.discomfortReported ?? false,
      bodyweight_kg: session.bodyweightKg ?? null,
      summary: {},
      updated_at: session.updatedAt ?? new Date().toISOString(),
    }, { onConflict: 'id' })
    if (sessionError) throw sessionError

    // Replace exercise/set trees idempotently for this session.
    await client.from('gym_exercise_performances').delete().eq('session_id', sessionId)

    for (const ex of session.exercises) {
      const { data: perf, error: perfError } = await client.from('gym_exercise_performances').insert({
        session_id: sessionId,
        exercise_id: ex.exerciseId,
        exercise_name: ex.exerciseName,
        planned_exercise_id: ex.plannedExerciseId ?? null,
        exercise_order: ex.order,
        status: ex.skipped ? 'skipped' : ex.finished ? 'completed' : 'pending',
        notes: ex.notes ?? null,
        pain_flag: ex.sets.some(s => s.painFlag) ?? false,
        skipped: Boolean(ex.skipped),
        finished: Boolean(ex.finished),
        skip_reason: ex.skipReason ?? null,
        substituted_from_id: ex.substitutedFromId ?? null,
        original_prescription: ex.originalPrescription ?? null,
      }).select('id').single()
      if (perfError) throw perfError

      if (ex.sets.length > 0) {
        const { error: setError } = await client.from('gym_set_performances').insert(
          ex.sets.map(set => ({
            exercise_performance_id: perf.id,
            set_number: set.setNumber,
            set_type: set.setType,
            weight: set.weight,
            reps: set.reps,
            rpe: set.rpe ?? null,
            rir: set.rir ?? null,
            completed: Boolean(set.completed),
            completed_at: set.completedAt ?? null,
            notes: set.notes ?? null,
            pain_flag: Boolean(set.painFlag),
            failed: Boolean(set.failed),
            discomfort_note: set.discomfortNote ?? null,
          })),
        )
        if (setError) throw setError
      }
    }
  }

  return {
    async getProfile() {
      await requireUser()
      const { data, error } = await client.from('gym_profiles').select('*').eq('user_id', userId).maybeSingle()
      if (error) throw error
      if (!data) return null
      return mapProfile(data)
    },
    async saveProfile(profile: GymProfile) {
      await requireUser()
      const row = {
        id: asUuidOrNull(profile.id) ?? undefined,
        user_id: userId,
        complete: profile.complete,
        first_session_choice_complete: Boolean(profile.firstSessionChoiceComplete),
        first_session_intent: profile.firstSessionIntent ?? null,
        primary_goal: profile.primaryGoal,
        experience: profile.experience,
        age: profile.age ?? null,
        height_cm: profile.heightCm ?? null,
        weight_kg: profile.weightKg ?? null,
        training_days_per_week: profile.trainingDaysPerWeek,
        session_duration_minutes: profile.sessionDurationMinutes,
        preferred_split: profile.preferredSplit,
        tracking_mode: profile.trackingMode,
        smallest_load_increment_kg: profile.smallestLoadIncrementKg,
        equipment: profile.equipment,
        exercises_enjoy: profile.exercisesEnjoy,
        exercises_dislike: profile.exercisesDislike,
        injury_limitations: profile.injuryLimitations,
        target_muscles: profile.targetMuscles,
        body_measurements: profile.bodyMeasurements ?? null,
        estimated_one_rep_maxes: profile.estimatedOneRepMaxes,
        updated_at: new Date().toISOString(),
      }
      const { data, error } = await client.from('gym_profiles').upsert(row, { onConflict: 'user_id' }).select('*').single()
      if (error) throw error
      return mapProfile(data)
    },
    async getActiveWorkout() {
      await requireUser()
      const { data, error } = await client
        .from('gym_workout_sessions')
        .select('id, title, started_at, updated_at, logger_status, rest_timer_ends_at, paused_rest_remaining_ms, current_exercise_key, based_on_snapshot_title, approved_at, session_notes')
        .eq('user_id', userId)
        .eq('status', 'in_progress')
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      const exercises = await loadExercises(client, data.id)
      return {
        id: data.id,
        title: data.title,
        startedAt: data.started_at ?? new Date().toISOString(),
        updatedAt: data.updated_at ?? new Date().toISOString(),
        status: data.logger_status === 'paused' ? 'paused' : 'active',
        exercises,
        sessionNotes: data.session_notes ?? '',
        restTimerEndsAt: data.rest_timer_ends_at,
        pausedRestRemainingMs: data.paused_rest_remaining_ms ?? null,
        currentExerciseKey: data.current_exercise_key ?? null,
        basedOnSnapshotTitle: data.based_on_snapshot_title ?? undefined,
        approvedAt: data.approved_at ?? undefined,
        persistStatus: 'saved',
      } satisfies ActiveWorkout
    },
    async saveActiveWorkout(workout: ActiveWorkout | null) {
      await requireUser()
      if (!workout) {
        // Clearing active is handled by complete/cancel flows; no-op here if none.
        return
      }
      const session: WorkoutSessionRecord = {
        id: workout.id,
        date: workout.startedAt,
        scheduledFor: workout.startedAt.slice(0, 10),
        startedAt: workout.startedAt,
        completedAt: '',
        updatedAt: workout.updatedAt,
        title: workout.title,
        exercises: workout.exercises,
        completed: false,
        status: workout.status === 'paused' ? 'paused' : 'in_progress',
        sessionNotes: workout.sessionNotes,
        painFlags: [],
        source: 'gym_logger',
      }
      await upsertSessionTree(session)
      await client.from('gym_workout_sessions').update({
        rest_timer_ends_at: workout.restTimerEndsAt ?? null,
        paused_rest_remaining_ms: workout.pausedRestRemainingMs ?? null,
        current_exercise_key: workout.currentExerciseKey ?? null,
        logger_status: workout.status,
        session_notes: workout.sessionNotes,
      }).eq('id', workout.id).eq('user_id', userId)
    },
    async getApprovedPlan() {
      await requireUser()
      const { data, error } = await client.from('gym_user_state').select('approved_plan').eq('user_id', userId).maybeSingle()
      if (error) throw error
      return (data?.approved_plan as ApprovedWorkoutPlan | null) ?? null
    },
    async saveApprovedPlan(plan: ApprovedWorkoutPlan | null) {
      await requireUser()
      const { error } = await client.from('gym_user_state').upsert({
        user_id: userId,
        approved_plan: plan,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      if (error) throw error
    },
    async getWorkoutHistory() {
      await requireUser()
      const { data, error } = await client
        .from('gym_workout_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('planned_date', { ascending: false })
      if (error) throw error
      const sessions: WorkoutSessionRecord[] = []
      for (const row of data ?? []) {
        sessions.push({
          id: row.id,
          date: row.started_at ?? row.planned_date,
          scheduledFor: row.planned_date,
          startedAt: row.started_at ?? '',
          completedAt: row.completed_at ?? '',
          updatedAt: row.updated_at,
          title: row.title,
          exercises: await loadExercises(client, row.id),
          durationMinutes: row.duration_minutes ?? undefined,
          completed: Boolean(row.completed),
          status: row.status,
          skipReason: row.skip_reason ?? undefined,
          skipNote: row.skip_note ?? undefined,
          sessionNotes: row.session_notes ?? undefined,
          painFlags: row.pain_flags ?? [],
          adherenceScore: row.adherence_score ?? undefined,
          totalVolumeKg: row.total_volume_kg ?? undefined,
          source: 'gym_logger',
          sessionRpe: row.session_rpe ?? undefined,
          energyAfter: row.energy_after ?? undefined,
          discomfortReported: row.discomfort_reported ?? undefined,
          bodyweightKg: row.bodyweight_kg ?? undefined,
        })
      }
      return sessions
    },
    async createWorkoutSession(session) {
      await upsertSessionTree(session)
    },
    async updateWorkoutSession(session) {
      await upsertSessionTree(session)
    },
    async completeWorkoutSession(session) {
      await upsertSessionTree({ ...session, completed: true, status: 'completed' })
    },
    async createOrUpdateSet(sessionId, exerciseKeyValue, set) {
      // Prefer active-tree rewrite for consistency with LocalGymRepository.
      const active = await this.getActiveWorkout()
      if (active && active.id === sessionId) {
        const exercises = active.exercises.map(ex => {
          if (exerciseKey(ex) !== exerciseKeyValue && ex.exerciseId !== exerciseKeyValue) return ex
          const without = ex.sets.filter(s => s.id !== set.id)
          return { ...ex, sets: [...without, set].sort((a, b) => a.setNumber - b.setNumber) }
        })
        await this.saveActiveWorkout({ ...active, exercises, updatedAt: new Date().toISOString() })
        return set
      }
      throw new Error('createOrUpdateSet currently requires an active in-progress session in cloud mode')
    },
    async deleteSet(sessionId, exerciseKeyValue, setId) {
      const active = await this.getActiveWorkout()
      if (active && active.id === sessionId) {
        const exercises = active.exercises.map(ex => {
          if (exerciseKey(ex) !== exerciseKeyValue && ex.exerciseId !== exerciseKeyValue) return ex
          return {
            ...ex,
            sets: ex.sets.filter(s => s.id !== setId).map((s, i) => ({ ...s, setNumber: i + 1 })),
          }
        })
        await this.saveActiveWorkout({ ...active, exercises, updatedAt: new Date().toISOString() })
      }
    },
    async getExerciseHistory(exerciseId) {
      const all = await this.getWorkoutHistory()
      return all.filter(s => s.exercises.some(e => e.exerciseId === exerciseId))
    },
    async saveProgressionRecord(record) {
      await requireUser()
      const { error } = await client.from('gym_progression_records').insert({
        id: asUuidOrNull(record.id) ?? undefined,
        user_id: userId,
        exercise_id: record.exerciseId,
        exercise_name: record.exerciseName,
        recorded_on: record.date.slice(0, 10),
        action: record.action,
        recommendation: record.recommendation,
        evidence: record.evidence,
        research_claim_ids: record.researchClaimIds,
        last_weight: record.lastWeight ?? null,
        last_reps: record.lastReps ?? null,
        target_rep_range: record.targetRepRange ?? null,
      })
      if (error) throw error
    },
    async listProgressionRecords() {
      await requireUser()
      const { data, error } = await client
        .from('gym_progression_records')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map((row): ProgressionRecord => ({
        id: row.id,
        exerciseId: row.exercise_id,
        exerciseName: row.exercise_name,
        date: row.recorded_on,
        action: row.action,
        recommendation: row.recommendation,
        evidence: row.evidence,
        researchClaimIds: row.research_claim_ids ?? [],
        lastWeight: row.last_weight ?? undefined,
        lastReps: row.last_reps ?? undefined,
        targetRepRange: row.target_rep_range ?? undefined,
      }))
    },
  }
}

async function loadExercises(client: SupabaseClient, sessionId: string): Promise<ExercisePerformanceRecord[]> {
  const { data: perfs, error } = await client
    .from('gym_exercise_performances')
    .select('*')
    .eq('session_id', sessionId)
    .order('exercise_order', { ascending: true })
  if (error) throw error
  const exercises: ExercisePerformanceRecord[] = []
  for (const perf of perfs ?? []) {
    const { data: sets, error: setError } = await client
      .from('gym_set_performances')
      .select('*')
      .eq('exercise_performance_id', perf.id)
      .order('set_number', { ascending: true })
    if (setError) throw setError
    exercises.push({
      plannedExerciseId: perf.planned_exercise_id ?? undefined,
      exerciseId: perf.exercise_id,
      exerciseName: perf.exercise_name,
      order: perf.exercise_order,
      notes: perf.notes ?? undefined,
      skipped: Boolean(perf.skipped),
      finished: Boolean(perf.finished),
      skipReason: perf.skip_reason ?? undefined,
      substitutedFromId: perf.substituted_from_id ?? undefined,
      originalPrescription: perf.original_prescription ?? undefined,
      sets: (sets ?? []).map((s): SetPerformanceRecord => ({
        id: s.id,
        setNumber: s.set_number,
        setType: s.set_type,
        weight: Number(s.weight ?? 0),
        reps: Number(s.reps ?? 0),
        rpe: s.rpe ?? undefined,
        rir: s.rir ?? undefined,
        completed: Boolean(s.completed),
        completedAt: s.completed_at ?? undefined,
        notes: s.notes ?? undefined,
        painFlag: Boolean(s.pain_flag),
        failed: Boolean(s.failed),
        discomfortNote: s.discomfort_note ?? undefined,
      })),
    })
  }
  return exercises
}

function mapProfile(data: Record<string, unknown>): GymProfile {
  return {
    id: String(data.id),
    userId: String(data.user_id),
    complete: Boolean(data.complete),
    firstSessionChoiceComplete: Boolean(data.first_session_choice_complete),
    firstSessionIntent: (data.first_session_intent as GymProfile['firstSessionIntent']) ?? undefined,
    primaryGoal: data.primary_goal as GymProfile['primaryGoal'],
    experience: data.experience as GymProfile['experience'],
    age: (data.age as number | null) ?? undefined,
    heightCm: (data.height_cm as number | null) ?? undefined,
    weightKg: (data.weight_kg as number | null) ?? undefined,
    trainingDaysPerWeek: Number(data.training_days_per_week),
    sessionDurationMinutes: Number(data.session_duration_minutes),
    preferredSplit: data.preferred_split as GymProfile['preferredSplit'],
    trackingMode: data.tracking_mode as GymProfile['trackingMode'],
    smallestLoadIncrementKg: Number(data.smallest_load_increment_kg),
    equipment: (data.equipment as GymProfile['equipment']) ?? [],
    exercisesEnjoy: (data.exercises_enjoy as string[]) ?? [],
    exercisesDislike: (data.exercises_dislike as string[]) ?? [],
    injuryLimitations: (data.injury_limitations as string[]) ?? [],
    targetMuscles: (data.target_muscles as GymProfile['targetMuscles']) ?? [],
    bodyMeasurements: (data.body_measurements as Record<string, number> | null) ?? undefined,
    estimatedOneRepMaxes: (data.estimated_one_rep_maxes as Record<string, number>) ?? {},
    createdAt: String(data.created_at),
    updatedAt: String(data.updated_at),
  }
}
