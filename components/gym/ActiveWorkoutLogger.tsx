'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useGymData } from '@/contexts/GymDataContext'
import { useFounderKernel } from '@/contexts/FounderKernelContext'
import type {
  ActiveWorkout,
  ExerciseSkipReason,
  PersistStatus,
  SessionEnergyAfter,
  SetPerformanceRecord,
} from '@/lib/specialists/gym/gymStorage/gymStorageTypes'
import type { WorkoutSummaryDetail } from '@/lib/specialists/gym/gymActiveWorkoutEngine'
import {
  adviseNextSet,
  computeLiveWorkoutMetrics,
  exerciseKey,
  findCurrentExerciseIndex,
  findCurrentSet,
  findNextExercise,
  isExerciseFinished,
  restSecondsForExercise,
} from '@/lib/specialists/gym/gymActiveWorkoutEngine'
import {
  addExerciseToWorkout,
  addSetToExercise,
  adjustRestTimer,
  applySuggestedLoadToNextSet,
  clearRestTimer,
  finishExerciseInWorkout,
  focusExercise,
  listCompatibleSubstitutes,
  pauseActiveWorkout,
  remainingRestMs,
  removeSet,
  reorderExercise,
  resumeActiveWorkout,
  skipExerciseInWorkout,
  startRestTimer,
  substituteExercise,
  toggleSetWarmup,
  updateSet,
  validateCompletedSetInput,
  type PostWorkoutReview,
} from '@/lib/specialists/gym/gymStorage/gymWorkoutService'
import { EXERCISE_SKIP_REASON_LABELS } from '@/lib/specialists/gym/gymSessionStatus'
import { GYM_EXERCISE_LIBRARY } from '@/lib/specialists/gym/gymExerciseLibrary'
import GymCard from './GymCard'

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatElapsed(startedAt: string, nowMs: number): string {
  const start = Date.parse(startedAt)
  if (!Number.isFinite(start)) return '0:00'
  const total = Math.max(0, Math.floor((nowMs - start) / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

function syncLabel(status?: PersistStatus): string {
  if (status === 'syncing') return 'Syncing…'
  if (status === 'offline') return 'Offline · queued'
  if (status === 'failed') return 'Save failed · retrying'
  return 'Saved'
}

function maybeNotifyRestComplete() {
  if (typeof window === 'undefined') return
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Rest complete', { body: 'Time for your next set.', silent: false })
    }
  } catch {
    // Never block the workout for notifications.
  }
}

export default function ActiveWorkoutLogger() {
  const router = useRouter()
  const { publish } = useFounderKernel()
  const {
    activeWorkout,
    saveActiveWorkout,
    finishWorkout,
    discardActiveWorkout,
    profile,
    approvedPlan,
    completedSessions,
  } = useGymData()

  const [showDiscard, setShowDiscard] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [completedDetail, setCompletedDetail] = useState<WorkoutSummaryDetail | null>(null)
  const [lastAdvice, setLastAdvice] = useState<ReturnType<typeof adviseNextSet> | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [draft, setDraft] = useState({ weight: '', reps: '', rpe: '', rir: '', notes: '' })
  const [setError, setSetError] = useState<string | null>(null)
  const [completionError, setCompletionError] = useState<string | null>(null)
  const [listOpen, setListOpen] = useState(false)
  const [skipPanel, setSkipPanel] = useState(false)
  const [subPanel, setSubPanel] = useState(false)
  const [addPanel, setAddPanel] = useState(false)
  const [editingSetId, setEditingSetId] = useState<string | null>(null)
  const [review, setReview] = useState<PostWorkoutReview>({
    sessionRpe: undefined,
    energyAfter: 'ok',
    discomfortReported: false,
    bodyweightKg: undefined,
    sessionNotes: '',
  })
  const [notifiedRestEnd, setNotifiedRestEnd] = useState<string | null>(null)

  const workout = activeWorkout

  useEffect(() => {
    const tick = () => setNowMs(Date.now())
    const id = window.setInterval(tick, 500)
    tick()
    return () => window.clearInterval(id)
  }, [])

  const persist = useCallback((next: ActiveWorkout) => {
    saveActiveWorkout(next)
  }, [saveActiveWorkout])

  const currentIndexRaw = workout ? findCurrentExerciseIndex(workout) : 0
  const currentIndex = currentIndexRaw >= 0
    ? currentIndexRaw
    : Math.max(0, (workout?.exercises.length ?? 1) - 1)
  const current = workout?.exercises[currentIndex] ?? null
  const currentKey = current ? exerciseKey(current) : ''
  const nextExercise = workout && currentIndexRaw >= 0
    ? findNextExercise(workout, currentIndex)
    : null
  const currentSet = current
    ? (editingSetId ? current.sets.find(s => s.id === editingSetId) ?? findCurrentSet(current) : findCurrentSet(current))
    : null
  const planRow = approvedPlan?.exercises.find(e =>
    (current?.plannedExerciseId && e.plannedExerciseId === current.plannedExerciseId)
    || e.exerciseId === current?.exerciseId,
  )
  const prescription = current?.originalPrescription
  const targetRepRange = prescription?.repRange ?? planRow?.repRange ?? '8-10'
  const prescribedSets = prescription?.sets ?? planRow?.sets ?? current?.sets.filter(s => s.setType === 'working').length ?? 0
  const targetRpe = prescription?.targetRpe ?? planRow?.targetRpe
  const suggestedLoad = prescription?.suggestedLoadKg ?? planRow?.suggestedLoadKg
  const restSeconds = current ? restSecondsForExercise(current.exerciseId, approvedPlan) : 90
  const tracking = profile?.trackingMode ?? 'rpe'
  const substitutes = current ? listCompatibleSubstitutes(current.exerciseId) : []

  useEffect(() => {
    if (!currentSet) {
      // Repository-backed selection changed; reset the controlled form atomically.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft({ weight: '', reps: '', rpe: '', rir: '', notes: current?.notes ?? '' })
      return
    }
    const prevCompleted = current?.sets
      .filter(s => s.completed && s.setNumber < currentSet.setNumber)
      .at(-1)
    setDraft({
      weight: currentSet.weight
        ? String(currentSet.weight)
        : prevCompleted?.weight
          ? String(prevCompleted.weight)
          : suggestedLoad != null
            ? String(suggestedLoad)
            : '',
      reps: currentSet.reps
        ? String(currentSet.reps)
        : prevCompleted?.reps
          ? String(prevCompleted.reps)
          : '',
      rpe: currentSet.rpe != null
        ? String(currentSet.rpe)
        : prevCompleted?.rpe != null
          ? String(prevCompleted.rpe)
          : '',
      rir: currentSet.rir != null
        ? String(currentSet.rir)
        : prevCompleted?.rir != null
          ? String(prevCompleted.rir)
          : '',
      notes: current?.notes ?? '',
    })
  }, [currentSet?.id, current?.plannedExerciseId, current?.notes, suggestedLoad])

  const metrics = useMemo(() => {
    if (!workout || !current) return null
    return computeLiveWorkoutMetrics({
      workout,
      exercise: current,
      justCompletedSet: null,
      targetRepRange,
      profile,
      historySessions: completedSessions,
    })
  }, [workout, current, targetRepRange, profile, completedSessions])

  const restMsLeft = remainingRestMs(workout?.restTimerEndsAt, nowMs)
  const resting = Boolean(workout?.restTimerEndsAt && restMsLeft > 0)

  useEffect(() => {
    if (!workout?.restTimerEndsAt) return
    if (restMsLeft > 0) return
    if (notifiedRestEnd === workout.restTimerEndsAt) return
    setNotifiedRestEnd(workout.restTimerEndsAt)
    maybeNotifyRestComplete()
  }, [restMsLeft, workout?.restTimerEndsAt, notifiedRestEnd])

  if (!workout) {
    return (
      <GymCard className="p-5 text-center">
        <p className="text-sm text-zinc-500">No active workout. Approve and start today&apos;s session from the Gym home screen.</p>
        <Link href="/gym" className="text-sm text-emerald-700 mt-2 inline-block hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600">← Back to Gym</Link>
      </GymCard>
    )
  }

  const paused = workout.status === 'paused'
  const progressLabel = `${metrics?.completedWorkingSets ?? 0}/${metrics?.prescribedWorkingSets ?? 0} working sets`
  const allDone = workout.exercises.every(ex => ex.skipped || isExerciseFinished(ex))
  const incompleteCount = workout.exercises.filter(ex => !ex.skipped && !isExerciseFinished(ex)).length
  const skippedCount = workout.exercises.filter(ex => ex.skipped).length

  const handleLogSet = () => {
    if (!current || !currentSet || paused) return
    const weight = Number(draft.weight)
    const reps = Number(draft.reps)
    const rpe = tracking === 'rpe' && draft.rpe !== '' ? Number(draft.rpe) : undefined
    const rir = tracking === 'rir' && draft.rir !== '' ? Number(draft.rir) : undefined
    const validationError = validateCompletedSetInput({ weight, reps, rpe, rir })
    if (validationError) {
      setSetError(validationError)
      return
    }
    setSetError(null)
    const patch: Partial<SetPerformanceRecord> = {
      weight,
      reps,
      completed: true,
      completedAt: new Date().toISOString(),
      notes: draft.notes || undefined,
    }
    if (rpe != null) patch.rpe = rpe
    if (rir != null) patch.rir = rir

    let next = updateSet(workout, currentKey, currentSet.id, patch)
    const updatedEx = next.exercises.find(e => exerciseKey(e) === currentKey)!
    const logged = updatedEx.sets.find(s => s.id === currentSet.id)!
    const advice = adviseNextSet({
      exercise: updatedEx,
      justCompleted: logged,
      targetRepRange,
      profile,
      historySessions: completedSessions,
    })
    setLastAdvice(advice)
    setEditingSetId(null)

    if (advice.suggestedWeight != null && (advice.action === 'increase' || advice.action === 'reduce')) {
      next = applySuggestedLoadToNextSet(next, currentKey, advice.suggestedWeight)
    }

    if (logged.setType === 'working') {
      next = startRestTimer(next, restSeconds)
    }
    persist(next)

    void publish({
      type: 'SetLogged',
      source: 'gym-ai',
      payload: {
        exerciseId: current.exerciseId,
        setId: currentSet.id,
        weight,
        reps,
        e1rm: advice.estimatedE1RM,
      },
    })

    if (isExerciseFinished(updatedEx)) {
      void publish({
        type: 'ExerciseCompleted',
        source: 'gym-ai',
        payload: { exerciseId: current.exerciseId, exerciseName: current.exerciseName },
      })
    }
  }

  const openReview = () => {
    setCompletionError(null)
    setReviewOpen(true)
  }

  const confirmFinish = () => {
    const result = finishWorkout({
      ...review,
      sessionNotes: review.sessionNotes || workout.sessionNotes,
    })
    if (result) {
      setReviewOpen(false)
      setCompletedDetail(result.summaryDetail)
    } else {
      setCompletionError('Log at least one valid working set before finishing the workout.')
      setReviewOpen(false)
    }
  }

  if (completedDetail) {
    return (
      <div className="space-y-4 pb-10 max-w-lg mx-auto overflow-x-hidden">
        <GymCard className="p-5">
          <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-emerald-600 mb-2">Workout complete</p>
          <h2 className="text-lg font-semibold text-zinc-900">{completedDetail.summaryText}</h2>
          <p className="text-sm text-zinc-600 mt-2">{completedDetail.recoveryPrediction}</p>
          <p className="text-xs text-zinc-500 mt-2">
            {completedDetail.durationMinutes} min · {completedDetail.adherenceScore}% adherence · {completedDetail.totalVolumeKg} kg volume
          </p>
        </GymCard>

        <GymCard className="p-5 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-900">Volume by muscle</h3>
          {completedDetail.volumeByMuscle.length === 0 ? (
            <p className="text-xs text-zinc-500">No muscle volume from completed working sets.</p>
          ) : (
            <ul className="space-y-1">
              {completedDetail.volumeByMuscle.map(row => (
                <li key={row.muscle} className="flex justify-between text-sm text-zinc-700">
                  <span>{row.label}</span>
                  <span className="tabular-nums text-zinc-500">{row.sets} sets</span>
                </li>
              ))}
            </ul>
          )}
        </GymCard>

        {completedDetail.prs.length > 0 && (
          <GymCard className="p-5 space-y-2">
            <h3 className="text-sm font-semibold text-zinc-900">Personal records</h3>
            {completedDetail.prs.map(pr => (
              <p key={`${pr.exerciseName}-${pr.detail}`} className="text-sm text-emerald-800">{pr.exerciseName}: {pr.detail}</p>
            ))}
          </GymCard>
        )}

        <GymCard className="p-5 space-y-2">
          <h3 className="text-sm font-semibold text-zinc-900">Progression</h3>
          {completedDetail.progression.map(p => (
            <div key={`${p.exerciseName}-${p.action}`}>
              <p className="text-sm font-medium text-zinc-800">{p.exerciseName} · {p.action}</p>
              <p className="text-xs text-zinc-500">{p.recommendation}</p>
              <p className="text-[11px] text-emerald-800 mt-0.5">Why this adjustment? See evidence in recommendation above.</p>
            </div>
          ))}
          <p className="text-sm text-zinc-700 pt-2 border-t border-zinc-100">{completedDetail.suggestedNextSession}</p>
        </GymCard>

        {completedDetail.assumptions.length > 0 && (
          <GymCard className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-1">Assumptions</p>
            <ul className="space-y-1">
              {completedDetail.assumptions.map(a => (
                <li key={a} className="text-xs text-zinc-500">{a}</li>
              ))}
            </ul>
          </GymCard>
        )}

        <Link href="/gym" className="inline-block text-sm font-semibold text-emerald-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600">Back to Gym →</Link>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-28 max-w-lg mx-auto overflow-x-hidden w-full">
      <GymCard className="p-4 sticky top-0 z-10 bg-white/90 backdrop-blur-md border border-emerald-100/60 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-zinc-400">
              {paused ? 'Paused' : 'Active workout'}
            </p>
            <h2 className="text-base font-semibold text-zinc-900 truncate">{workout.title}</h2>
            <p className="text-xs text-zinc-500 mt-0.5 tabular-nums">
              {formatElapsed(workout.startedAt, nowMs)} · {progressLabel}
            </p>
            <p className="text-[11px] text-emerald-700 mt-0.5" aria-live="polite">
              {syncLabel(workout.persistStatus)}
              {workout.lastPersistError ? ` · ${workout.lastPersistError}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-end shrink-0">
            {paused ? (
              <button type="button" onClick={() => persist(resumeActiveWorkout(workout))}
                className="text-xs font-semibold px-3 py-2 rounded-lg bg-zinc-900 text-white min-h-11 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">Resume</button>
            ) : (
              <button type="button" onClick={() => persist(pauseActiveWorkout(workout))}
                className="text-xs px-3 py-2 rounded-lg border border-zinc-200 min-h-11 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">Pause</button>
            )}
            <button type="button" onClick={openReview}
              className="text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-600 text-white min-h-11 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">Finish</button>
          </div>
        </div>
      </GymCard>

      {completionError && <p role="alert" className="text-xs text-red-600 px-1">{completionError}</p>}

      {current && (
        <GymCard className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-zinc-400">
                Exercise {currentIndex + 1} of {workout.exercises.length}
              </p>
              <h3 className="text-xl font-semibold text-zinc-900 tracking-tight break-words">{current.exerciseName}</h3>
              {nextExercise && (
                <p className="text-xs text-zinc-500 mt-1">Next: {nextExercise.exerciseName}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-zinc-50/90 px-3 py-2">
              <p className="text-[10px] uppercase text-zinc-400">Prescribed</p>
              <p className="font-medium text-zinc-800">{prescribedSets} × {targetRepRange}</p>
            </div>
            <div className="rounded-xl bg-zinc-50/90 px-3 py-2">
              <p className="text-[10px] uppercase text-zinc-400">Suggested load</p>
              <p className="font-medium text-zinc-800">
                {suggestedLoad != null ? `${suggestedLoad} kg` : 'No history yet'}
              </p>
            </div>
            <div className="rounded-xl bg-zinc-50/90 px-3 py-2">
              <p className="text-[10px] uppercase text-zinc-400">RPE target</p>
              <p className="font-medium text-zinc-800">{targetRpe != null ? targetRpe : '—'}</p>
            </div>
            <div className="rounded-xl bg-zinc-50/90 px-3 py-2">
              <p className="text-[10px] uppercase text-zinc-400">Rest</p>
              <p className="font-medium text-zinc-800">{restSeconds}s</p>
            </div>
          </div>

          {metrics?.previousPerformance ? (
            <div className="rounded-xl border border-zinc-100 px-3 py-2">
              <p className="text-[10px] uppercase text-zinc-400">Previous performance</p>
              <p className="text-sm text-zinc-800">
                {metrics.previousPerformance.weight} kg × {metrics.previousPerformance.reps}
                {metrics.previousPerformance.rpe != null ? ` @ RPE ${metrics.previousPerformance.rpe}` : ''}
              </p>
              <p className="text-[11px] text-zinc-500">{metrics.previousPerformance.note}</p>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">No prior completed sets for this exercise — loads are not invented.</p>
          )}

          {resting && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-4 text-center" role="timer" aria-live="polite">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Rest timer</p>
              <p className="text-3xl font-semibold tabular-nums text-emerald-900 mt-1">{formatRemaining(restMsLeft)}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => persist(adjustRestTimer(workout, -15))}
                  className="text-xs px-3 py-2 rounded-lg border border-emerald-200 min-h-11" aria-label="Subtract 15 seconds">−15s</button>
                <button type="button" onClick={() => persist(adjustRestTimer(workout, 15))}
                  className="text-xs px-3 py-2 rounded-lg border border-emerald-200 min-h-11" aria-label="Add 15 seconds">+15s</button>
                <button type="button" onClick={() => persist(clearRestTimer(workout))}
                  className="text-xs px-3 py-2 rounded-lg border border-emerald-200 min-h-11">Skip rest</button>
              </div>
            </div>
          )}

          {lastAdvice && (
            <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">Why this adjustment?</p>
              <p className="text-sm text-amber-950 mt-1">{lastAdvice.recommendation}</p>
              <p className="text-[11px] text-amber-800/80 mt-1">{lastAdvice.evidence}</p>
              {lastAdvice.estimatedE1RM != null && (
                <p className="text-[11px] text-amber-900 mt-1">Est. e1RM (Epley): {lastAdvice.estimatedE1RM} kg</p>
              )}
              {lastAdvice.assumptionNote && (
                <p className="text-[11px] text-amber-700 mt-1">{lastAdvice.assumptionNote}</p>
              )}
            </div>
          )}

          {current.sets.some(s => s.completed) && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase text-zinc-400">Logged sets</p>
              {current.sets.filter(s => s.completed).map(s => (
                <div key={s.id} className="flex items-center justify-between gap-2 text-sm rounded-lg bg-zinc-50 px-3 py-2 min-h-11">
                  <span className="tabular-nums text-zinc-700">
                    #{s.setNumber} · {s.weight}kg × {s.reps}
                    {s.setType === 'warmup' ? ' · WU' : ''}
                    {s.failed ? ' · fail' : ''}
                  </span>
                  <button
                    type="button"
                    disabled={paused}
                    onClick={() => setEditingSetId(s.id)}
                    className="text-xs text-emerald-700 underline min-h-11 px-2 disabled:opacity-40"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          )}

          {currentSet && !paused ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-zinc-800">
                {editingSetId ? 'Edit' : 'Log'} set #{currentSet.setNumber}
                <span className="text-zinc-400 font-normal"> · {currentSet.setType}</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[10px] uppercase text-zinc-400">Weight (kg)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={draft.weight}
                    onChange={e => setDraft(d => ({ ...d, weight: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-3 text-base min-h-12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase text-zinc-400">Reps</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={draft.reps}
                    onChange={e => setDraft(d => ({ ...d, reps: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-3 text-base min-h-12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
                  />
                </label>
                {tracking === 'rpe' && (
                  <label className="block">
                    <span className="text-[10px] uppercase text-zinc-400">RPE</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={draft.rpe}
                      onChange={e => setDraft(d => ({ ...d, rpe: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-3 text-base min-h-12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
                    />
                  </label>
                )}
                {tracking === 'rir' && (
                  <label className="block">
                    <span className="text-[10px] uppercase text-zinc-400">RIR</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={draft.rir}
                      onChange={e => setDraft(d => ({ ...d, rir: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-3 text-base min-h-12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
                    />
                  </label>
                )}
              </div>
              <label className="block">
                <span className="text-[10px] uppercase text-zinc-400">Notes</span>
                <input
                  value={draft.notes}
                  onChange={e => {
                    const notes = e.target.value
                    setDraft(d => ({ ...d, notes }))
                    persist({
                      ...workout,
                      exercises: workout.exercises.map(ex =>
                        exerciseKey(ex) === currentKey ? { ...ex, notes } : ex,
                      ),
                    })
                  }}
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-3 text-sm min-h-12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
                  placeholder="Form cues, energy…"
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm text-amber-800 min-h-11">
                  <input type="checkbox" checked={currentSet.painFlag ?? false}
                    onChange={() => persist(updateSet(workout, currentKey, currentSet.id, { painFlag: !currentSet.painFlag }))}
                    className="h-4 w-4" />
                  Pain / discomfort
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-700 min-h-11">
                  <input type="checkbox" checked={currentSet.failed ?? false}
                    onChange={() => persist(updateSet(workout, currentKey, currentSet.id, { failed: !currentSet.failed }))}
                    className="h-4 w-4" />
                  Taken to failure
                </label>
              </div>
              <button
                type="button"
                onClick={handleLogSet}
                className="w-full rounded-xl bg-zinc-900 text-white font-semibold py-3.5 min-h-12 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
              >
                {editingSetId ? 'Save set' : 'Complete set'}
              </button>
              {setError && <p role="alert" className="text-xs text-red-600">{setError}</p>}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              {paused ? 'Workout paused — resume to continue logging.' : allDone ? 'All exercises finished — tap Finish when ready.' : 'Sets complete for this exercise.'}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" disabled={paused}
              onClick={() => setSkipPanel(v => !v)}
              className="text-xs px-3 py-2 rounded-lg border border-zinc-200 min-h-11 disabled:opacity-40">Skip…</button>
            <button type="button" disabled={paused}
              onClick={() => {
                const next = finishExerciseInWorkout(workout, currentKey)
                persist(next)
                setLastAdvice(null)
                void publish({ type: 'ExerciseCompleted', source: 'gym-ai', payload: { exerciseId: current.exerciseId, forcedComplete: true } })
              }}
              className="text-xs px-3 py-2 rounded-lg border border-zinc-200 min-h-11 disabled:opacity-40">Complete exercise</button>
            <button type="button" disabled={paused}
              onClick={() => setSubPanel(v => !v)}
              className="text-xs px-3 py-2 rounded-lg border border-zinc-200 min-h-11 disabled:opacity-40">Substitute</button>
            <button type="button" disabled={paused}
              onClick={() => persist(addSetToExercise(workout, currentKey))}
              className="text-xs px-3 py-2 rounded-lg border border-zinc-200 min-h-11 disabled:opacity-40">+ Set</button>
            {currentSet && (
              <>
                <button type="button" disabled={paused}
                  onClick={() => persist(toggleSetWarmup(workout, currentKey, currentSet.id))}
                  className="text-xs px-3 py-2 rounded-lg border border-zinc-200 min-h-11 disabled:opacity-40">
                  {currentSet.setType === 'warmup' ? 'Mark working' : 'Mark warmup'}
                </button>
                <button type="button" disabled={paused}
                  onClick={() => {
                    persist(removeSet(workout, currentKey, currentSet.id))
                    setEditingSetId(null)
                  }}
                  className="text-xs px-3 py-2 rounded-lg border border-zinc-200 text-zinc-500 min-h-11 disabled:opacity-40">Delete set</button>
              </>
            )}
            <button type="button" disabled={paused}
              onClick={() => persist(reorderExercise(workout, currentKey, 'up'))}
              className="text-xs px-3 py-2 rounded-lg border border-zinc-200 min-h-11 disabled:opacity-40" aria-label="Move exercise up">↑</button>
            <button type="button" disabled={paused}
              onClick={() => persist(reorderExercise(workout, currentKey, 'down'))}
              className="text-xs px-3 py-2 rounded-lg border border-zinc-200 min-h-11 disabled:opacity-40" aria-label="Move exercise down">↓</button>
            <button type="button" disabled={paused}
              onClick={() => setAddPanel(v => !v)}
              className="text-xs px-3 py-2 rounded-lg border border-zinc-200 min-h-11 disabled:opacity-40">+ Exercise</button>
          </div>

          {skipPanel && (
            <div className="rounded-xl border border-zinc-100 p-3 space-y-2">
              <p className="text-xs font-medium text-zinc-700">Skip reason</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(EXERCISE_SKIP_REASON_LABELS) as ExerciseSkipReason[]).map(reason => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => {
                      persist(skipExerciseInWorkout(workout, currentKey, reason))
                      setSkipPanel(false)
                      setLastAdvice(null)
                      void publish({ type: 'ExerciseCompleted', source: 'gym-ai', payload: { exerciseId: current.exerciseId, skipped: true, reason } })
                    }}
                    className="text-xs px-3 py-2 rounded-lg border border-zinc-200 min-h-11"
                  >
                    {EXERCISE_SKIP_REASON_LABELS[reason]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {subPanel && (
            <div className="rounded-xl border border-zinc-100 p-3 space-y-2">
              <p className="text-xs font-medium text-zinc-700">Compatible substitutes</p>
              {substitutes.length === 0 ? (
                <p className="text-xs text-zinc-500">No compatible movement-pattern substitutes in the library.</p>
              ) : (
                substitutes.slice(0, 8).map(ex => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => {
                      persist(substituteExercise(workout, currentKey, ex.id))
                      setSubPanel(false)
                    }}
                    className="block w-full text-left text-sm px-3 py-2 rounded-lg border border-zinc-200 min-h-11"
                  >
                    {ex.name}
                  </button>
                ))
              )}
            </div>
          )}

          {addPanel && (
            <div className="rounded-xl border border-zinc-100 p-3 space-y-2 max-h-48 overflow-y-auto">
              <p className="text-xs font-medium text-zinc-700">Add exercise</p>
              {GYM_EXERCISE_LIBRARY.slice(0, 20).map(ex => (
                <button
                  key={`add-${ex.id}`}
                  type="button"
                  onClick={() => {
                    persist(addExerciseToWorkout(workout, ex.id))
                    setAddPanel(false)
                  }}
                  className="block w-full text-left text-sm px-3 py-2 rounded-lg border border-zinc-200 min-h-11"
                >
                  {ex.name}
                </button>
              ))}
            </div>
          )}
        </GymCard>
      )}

      <GymCard className="p-4 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Live session</p>
        <p className="text-sm text-zinc-800">{metrics?.sessionVolumeKg ?? 0} kg volume · fatigue {metrics?.fatigueScore ?? 0}/100</p>
        <p className="text-xs text-zinc-500">{metrics?.recoveryHint}</p>
      </GymCard>

      <GymCard className="p-4">
        <button
          type="button"
          onClick={() => setListOpen(v => !v)}
          className="w-full flex items-center justify-between text-left min-h-11"
          aria-expanded={listOpen}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Exercise list</p>
          <span className="text-xs text-zinc-500">{listOpen ? 'Hide' : 'Show'}</span>
        </button>
        {listOpen && (
          <ol className="space-y-1.5 mt-2">
            {workout.exercises.map((ex, i) => {
              const key = exerciseKey(ex)
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => persist(focusExercise(workout, key))}
                    className={`w-full text-sm flex justify-between gap-2 px-2 py-2 rounded-lg min-h-11 text-left ${
                      i === currentIndex ? 'font-semibold text-zinc-900 bg-emerald-50' : 'text-zinc-500'
                    }`}
                  >
                    <span className="truncate">{ex.skipped ? `${ex.exerciseName} (skipped)` : ex.exerciseName}</span>
                    <span className="tabular-nums text-xs shrink-0">
                      {ex.sets.filter(s => s.completed).length}/{ex.sets.length}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        )}
      </GymCard>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 border-t border-zinc-100 flex gap-2 justify-center z-20">
        <button type="button" onClick={() => { persist(workout); router.push('/gym') }}
          className="text-sm px-4 py-3 rounded-xl border border-zinc-200 min-h-12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600">Save & exit</button>
        <button type="button" onClick={() => setShowDiscard(true)}
          className="text-sm px-4 py-3 rounded-xl text-red-600 border border-red-100 min-h-12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500">Discard</button>
      </div>

      {showDiscard && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="discard-title">
          <GymCard className="p-5 max-w-sm w-full">
            <p id="discard-title" className="text-sm font-medium text-zinc-900">Discard this workout?</p>
            <p className="text-xs text-zinc-500 mt-1">This cancels the active session. Incomplete drafts are not counted as completed training.</p>
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => { discardActiveWorkout(); router.push('/gym') }}
                className="text-sm px-3 py-2 rounded-lg bg-red-600 text-white min-h-11">Discard draft</button>
              <button type="button" onClick={() => setShowDiscard(false)}
                className="text-sm px-3 py-2 rounded-lg border border-zinc-200 min-h-11">Cancel</button>
            </div>
          </GymCard>
        </div>
      )}

      {reviewOpen && (
        <div className="fixed inset-0 bg-black/35 flex items-end sm:items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="review-title">
          <GymCard className="p-5 max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div>
              <p id="review-title" className="text-sm font-semibold text-zinc-900">Session review</p>
              <p className="text-xs text-zinc-500 mt-1">
                {formatElapsed(workout.startedAt, nowMs)} elapsed · {metrics?.completedWorkingSets ?? 0} working sets · {skippedCount} skipped · {incompleteCount} incomplete
              </p>
            </div>
            <label className="block">
              <span className="text-[10px] uppercase text-zinc-400">Session RPE (1–10)</span>
              <input
                type="number"
                inputMode="decimal"
                min={1}
                max={10}
                value={review.sessionRpe ?? ''}
                onChange={e => setReview(r => ({ ...r, sessionRpe: e.target.value === '' ? undefined : Number(e.target.value) }))}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-3 min-h-12"
              />
            </label>
            <fieldset>
              <legend className="text-[10px] uppercase text-zinc-400">Energy after training</legend>
              <div className="mt-2 flex gap-2">
                {(['low', 'ok', 'high'] as SessionEnergyAfter[]).map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setReview(r => ({ ...r, energyAfter: level }))}
                    className={`flex-1 text-xs px-3 py-2 rounded-lg border min-h-11 capitalize ${
                      review.energyAfter === level ? 'border-emerald-400 bg-emerald-50' : 'border-zinc-200'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="flex items-center gap-2 text-sm text-zinc-700 min-h-11">
              <input
                type="checkbox"
                checked={Boolean(review.discomfortReported)}
                onChange={e => setReview(r => ({ ...r, discomfortReported: e.target.checked }))}
                className="h-4 w-4"
              />
              Pain or discomfort this session
            </label>
            <label className="block">
              <span className="text-[10px] uppercase text-zinc-400">Bodyweight (kg, optional)</span>
              <input
                type="number"
                inputMode="decimal"
                value={review.bodyweightKg ?? ''}
                onChange={e => setReview(r => ({ ...r, bodyweightKg: e.target.value === '' ? undefined : Number(e.target.value) }))}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-3 min-h-12"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase text-zinc-400">Notes</span>
              <textarea
                value={review.sessionNotes ?? ''}
                onChange={e => setReview(r => ({ ...r, sessionNotes: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-3 text-sm min-h-20"
                rows={3}
              />
            </label>
            <p className="text-[11px] text-zinc-500">
              These inputs feed fatigue/exertion signals. Recovery interpretation is handled by the existing recovery engine — not a medical claim.
            </p>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={confirmFinish}
                className="w-full text-sm font-semibold px-3 py-3 rounded-xl bg-emerald-600 text-white min-h-12">Finish workout</button>
              <button type="button" onClick={() => setReviewOpen(false)}
                className="w-full text-sm px-3 py-3 rounded-xl border border-zinc-200 min-h-12">Continue logging</button>
              <button type="button" onClick={() => { setReviewOpen(false); setShowDiscard(true) }}
                className="w-full text-sm px-3 py-3 rounded-xl text-red-600 border border-red-100 min-h-12">Discard draft…</button>
            </div>
          </GymCard>
        </div>
      )}
    </div>
  )
}
