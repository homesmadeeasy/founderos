'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useGymData } from '@/contexts/GymDataContext'
import { useFounderKernel } from '@/contexts/FounderKernelContext'
import type { ActiveWorkout, SetPerformanceRecord } from '@/lib/specialists/gym/gymStorage/gymStorageTypes'
import type { WorkoutSummaryDetail } from '@/lib/specialists/gym/gymActiveWorkoutEngine'
import {
  adviseNextSet,
  computeLiveWorkoutMetrics,
  exerciseKey,
  findCurrentExerciseIndex,
  findCurrentSet,
  isExerciseFinished,
  restSecondsForExercise,
} from '@/lib/specialists/gym/gymActiveWorkoutEngine'
import {
  addSetToExercise,
  applySuggestedLoadToNextSet,
  clearRestTimer,
  finishExerciseInWorkout,
  pauseActiveWorkout,
  removeSet,
  resumeActiveWorkout,
  skipExerciseInWorkout,
  startRestTimer,
  updateSet,
  validateCompletedSetInput,
} from '@/lib/specialists/gym/gymStorage/gymWorkoutService'
import GymCard from './GymCard'

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
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
  const [completedDetail, setCompletedDetail] = useState<WorkoutSummaryDetail | null>(null)
  const [lastAdvice, setLastAdvice] = useState<ReturnType<typeof adviseNextSet> | null>(null)
  const [nowMs, setNowMs] = useState(0)
  const [draft, setDraft] = useState({ weight: '', reps: '', rpe: '', rir: '', notes: '' })
  const [setError, setSetError] = useState<string | null>(null)
  const [completionError, setCompletionError] = useState<string | null>(null)

  const workout = activeWorkout

  useEffect(() => {
    if (!workout?.restTimerEndsAt) return
    const updateClock = () => setNowMs(Date.now())
    const initialId = window.setTimeout(updateClock, 0)
    const id = window.setInterval(updateClock, 500)
    return () => {
      window.clearTimeout(initialId)
      window.clearInterval(id)
    }
  }, [workout?.restTimerEndsAt])

  const persist = useCallback((next: ActiveWorkout) => {
    saveActiveWorkout(next)
  }, [saveActiveWorkout])

  const currentIndex = workout ? findCurrentExerciseIndex(workout) : 0
  const current = workout?.exercises[currentIndex] ?? null
  const currentKey = current ? exerciseKey(current) : ''
  const currentSet = current ? findCurrentSet(current) : null
  const planRow = approvedPlan?.exercises.find(e =>
    (current?.plannedExerciseId && e.plannedExerciseId === current.plannedExerciseId)
    || e.exerciseId === current?.exerciseId,
  )
  const targetRepRange = planRow?.repRange ?? '8-10'
  const prescribedSets = planRow?.sets ?? current?.sets.filter(s => s.setType === 'working').length ?? 0
  const targetRpe = planRow?.targetRpe
  const suggestedLoad = planRow?.suggestedLoadKg
  const restSeconds = current ? restSecondsForExercise(current.exerciseId, approvedPlan) : 90
  const tracking = profile?.trackingMode ?? 'rpe'

  useEffect(() => {
    if (!currentSet) {
      // Repository-backed selection changed; reset the controlled form atomically.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft({ weight: '', reps: '', rpe: '', rir: '', notes: current?.notes ?? '' })
      return
    }
    setDraft({
      weight: currentSet.weight ? String(currentSet.weight) : '',
      reps: currentSet.reps ? String(currentSet.reps) : '',
      rpe: currentSet.rpe != null ? String(currentSet.rpe) : '',
      rir: currentSet.rir != null ? String(currentSet.rir) : '',
      notes: current?.notes ?? '',
    })
  }, [currentSet, current?.plannedExerciseId, current?.notes])

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

  const restMsLeft = workout?.restTimerEndsAt
    ? Date.parse(workout.restTimerEndsAt) - nowMs
    : 0
  const resting = Boolean(workout?.restTimerEndsAt && restMsLeft > 0)

  if (!workout) {
    return (
      <GymCard className="p-5 text-center">
        <p className="text-sm text-zinc-500">No active workout. Approve and start today&apos;s session from the Gym home screen.</p>
        <Link href="/gym" className="text-sm text-emerald-700 mt-2 inline-block hover:underline">← Back to Gym</Link>
      </GymCard>
    )
  }

  const paused = workout.status === 'paused'

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

    if (advice.suggestedWeight != null && (advice.action === 'increase' || advice.action === 'reduce')) {
      next = applySuggestedLoadToNextSet(next, currentKey, advice.suggestedWeight)
    }

    next = startRestTimer(next, restSeconds)
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

  const handleTogglePain = () => {
    if (!current || !currentSet) return
    persist(updateSet(workout, currentKey, currentSet.id, { painFlag: !currentSet.painFlag }))
  }

  const handleComplete = () => {
    const result = finishWorkout()
    if (result) {
      setCompletionError(null)
      setCompletedDetail(result.summaryDetail)
    } else {
      setCompletionError('Log at least one valid working set before finishing the workout.')
    }
  }

  if (completedDetail) {
    return (
      <div className="space-y-4 pb-10">
        <GymCard className="p-5">
          <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-emerald-600 mb-2">Workout complete</p>
          <h2 className="text-lg font-semibold text-zinc-900">{completedDetail.summaryText}</h2>
          <p className="text-sm text-zinc-600 mt-2">{completedDetail.recoveryPrediction}</p>
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
              <p key={pr.exerciseName} className="text-sm text-emerald-800">{pr.exerciseName}: {pr.detail}</p>
            ))}
          </GymCard>
        )}

        <GymCard className="p-5 space-y-2">
          <h3 className="text-sm font-semibold text-zinc-900">Progression</h3>
          {completedDetail.progression.map(p => (
            <div key={p.exerciseName}>
              <p className="text-sm font-medium text-zinc-800">{p.exerciseName} · {p.action}</p>
              <p className="text-xs text-zinc-500">{p.recommendation}</p>
            </div>
          ))}
          <p className="text-sm text-zinc-700 pt-2 border-t border-zinc-100">{completedDetail.suggestedNextSession}</p>
          <p className="text-xs text-zinc-500">Adherence {completedDetail.adherenceScore}% · {completedDetail.durationMinutes} min · {completedDetail.totalVolumeKg} kg</p>
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

        <Link href="/gym" className="inline-block text-sm font-semibold text-emerald-700 hover:underline">Back to Gym →</Link>
      </div>
    )
  }

  const progressLabel = `${metrics?.completedWorkingSets ?? 0}/${metrics?.prescribedWorkingSets ?? 0} working sets`
  const allDone = workout.exercises.every(ex => ex.skipped || isExerciseFinished(ex))

  return (
    <div className="space-y-4 pb-28 max-w-lg mx-auto">
      <GymCard className="p-4 sticky top-0 z-10 bg-white/95 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-zinc-400">
              {paused ? 'Paused' : 'Active workout'}
            </p>
            <h2 className="text-base font-semibold text-zinc-900">{workout.title}</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{progressLabel} · auto-saved</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            {paused ? (
              <button type="button" onClick={() => persist(resumeActiveWorkout(workout))}
                className="text-xs font-semibold px-3 py-2 rounded-lg bg-zinc-900 text-white min-h-11">Resume</button>
            ) : (
              <button type="button" onClick={() => persist(pauseActiveWorkout(workout))}
                className="text-xs px-3 py-2 rounded-lg border border-zinc-200 min-h-11">Pause</button>
            )}
            <button type="button" onClick={handleComplete}
              className="text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-600 text-white min-h-11">Finish</button>
          </div>
        </div>
      </GymCard>

      {completionError && <p role="alert" className="text-xs text-red-600 px-1">{completionError}</p>}

      {current && (
        <GymCard className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-zinc-400">
                Exercise {currentIndex + 1} of {workout.exercises.length}
              </p>
              <h3 className="text-xl font-semibold text-zinc-900 tracking-tight">{current.exerciseName}</h3>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-zinc-50 px-3 py-2">
              <p className="text-[10px] uppercase text-zinc-400">Prescribed</p>
              <p className="font-medium text-zinc-800">{prescribedSets} × {targetRepRange}</p>
            </div>
            <div className="rounded-xl bg-zinc-50 px-3 py-2">
              <p className="text-[10px] uppercase text-zinc-400">Suggested load</p>
              <p className="font-medium text-zinc-800">
                {suggestedLoad != null ? `${suggestedLoad} kg` : 'No history yet'}
              </p>
            </div>
            <div className="rounded-xl bg-zinc-50 px-3 py-2">
              <p className="text-[10px] uppercase text-zinc-400">RPE target</p>
              <p className="font-medium text-zinc-800">{targetRpe != null ? targetRpe : '—'}</p>
            </div>
            <div className="rounded-xl bg-zinc-50 px-3 py-2">
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
            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-4 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Rest timer</p>
              <p className="text-3xl font-semibold tabular-nums text-emerald-900 mt-1">{formatRemaining(restMsLeft)}</p>
              <button type="button" onClick={() => persist(clearRestTimer(workout))}
                className="mt-2 text-xs text-emerald-800 underline min-h-11 px-3">Skip rest</button>
            </div>
          )}

          {lastAdvice && (
            <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">Live recommendation</p>
              <p className="text-sm text-amber-950 mt-1">{lastAdvice.recommendation}</p>
              <p className="text-[11px] text-amber-800/80 mt-1">{lastAdvice.evidence}</p>
              {lastAdvice.estimatedE1RM != null && (
                <p className="text-[11px] text-amber-900 mt-1">Est. e1RM this set: {lastAdvice.estimatedE1RM} kg</p>
              )}
              {lastAdvice.assumptionNote && (
                <p className="text-[11px] text-amber-700 mt-1">{lastAdvice.assumptionNote}</p>
              )}
            </div>
          )}

          {currentSet && !paused ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-zinc-800">
                Log set #{currentSet.setNumber}
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
                    className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-3 text-base min-h-12"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase text-zinc-400">Reps</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={draft.reps}
                    onChange={e => setDraft(d => ({ ...d, reps: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-3 text-base min-h-12"
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
                      className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-3 text-base min-h-12"
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
                      className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-3 text-base min-h-12"
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
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-3 text-sm min-h-12"
                  placeholder="Form cues, energy…"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-amber-800 min-h-11">
                <input type="checkbox" checked={currentSet.painFlag ?? false} onChange={handleTogglePain} className="h-4 w-4" />
                Pain or discomfort on this set
              </label>
              <button
                type="button"
                onClick={handleLogSet}
                className="w-full rounded-xl bg-zinc-900 text-white font-semibold py-3.5 min-h-12 text-sm"
              >
                Complete set
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
              onClick={() => {
                const next = skipExerciseInWorkout(workout, currentKey)
                persist(next)
                setLastAdvice(null)
                void publish({ type: 'ExerciseCompleted', source: 'gym-ai', payload: { exerciseId: current.exerciseId, skipped: true } })
              }}
              className="text-xs px-3 py-2 rounded-lg border border-zinc-200 min-h-11 disabled:opacity-40">Skip exercise</button>
            <button type="button" disabled={paused}
              onClick={() => {
                const next = finishExerciseInWorkout(workout, currentKey)
                persist(next)
                setLastAdvice(null)
                void publish({ type: 'ExerciseCompleted', source: 'gym-ai', payload: { exerciseId: current.exerciseId, forcedComplete: true } })
              }}
              className="text-xs px-3 py-2 rounded-lg border border-zinc-200 min-h-11 disabled:opacity-40">Finish exercise</button>
            <button type="button" disabled={paused}
              onClick={() => persist(addSetToExercise(workout, currentKey))}
              className="text-xs px-3 py-2 rounded-lg border border-zinc-200 min-h-11 disabled:opacity-40">+ Add set</button>
            {currentSet && (
              <button type="button" disabled={paused}
                onClick={() => persist(removeSet(workout, currentKey, currentSet.id))}
                className="text-xs px-3 py-2 rounded-lg border border-zinc-200 text-zinc-500 min-h-11 disabled:opacity-40">Remove set</button>
            )}
          </div>
        </GymCard>
      )}

      <GymCard className="p-4 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Live session</p>
        <p className="text-sm text-zinc-800">{metrics?.sessionVolumeKg ?? 0} kg volume · fatigue {metrics?.fatigueScore ?? 0}/100</p>
        <p className="text-xs text-zinc-500">{metrics?.recoveryHint}</p>
        {metrics?.estimatedE1RMByExercise.filter(e => e.e1rm != null).slice(0, 3).map(row => (
          <p key={row.exerciseId} className="text-xs text-zinc-600">
            {row.exerciseName}: est. e1RM {row.e1rm} kg
          </p>
        ))}
      </GymCard>

      <GymCard className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-2">Session roadmap</p>
        <ol className="space-y-1.5">
          {workout.exercises.map((ex, i) => (
            <li key={exerciseKey(ex)} className={`text-sm flex justify-between gap-2 ${i === currentIndex ? 'font-semibold text-zinc-900' : 'text-zinc-500'}`}>
              <span>{ex.skipped ? `${ex.exerciseName} (skipped)` : ex.exerciseName}</span>
              <span className="tabular-nums text-xs">
                {ex.sets.filter(s => s.completed).length}/{ex.sets.length}
              </span>
            </li>
          ))}
        </ol>
      </GymCard>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 border-t border-zinc-100 flex gap-2 justify-center">
        <button type="button" onClick={() => { persist(workout); router.push('/gym') }}
          className="text-sm px-4 py-3 rounded-xl border border-zinc-200 min-h-12">Save & exit</button>
        <button type="button" onClick={() => setShowDiscard(true)}
          className="text-sm px-4 py-3 rounded-xl text-red-600 border border-red-100 min-h-12">Discard</button>
      </div>

      {showDiscard && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <GymCard className="p-5 max-w-sm w-full">
            <p className="text-sm font-medium text-zinc-900">Discard this workout?</p>
            <p className="text-xs text-zinc-500 mt-1">Logged sets on this device will be cleared from the active session.</p>
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => { discardActiveWorkout(); router.push('/gym') }}
                className="text-sm px-3 py-2 rounded-lg bg-red-600 text-white min-h-11">Discard</button>
              <button type="button" onClick={() => setShowDiscard(false)}
                className="text-sm px-3 py-2 rounded-lg border border-zinc-200 min-h-11">Cancel</button>
            </div>
          </GymCard>
        </div>
      )}
    </div>
  )
}
