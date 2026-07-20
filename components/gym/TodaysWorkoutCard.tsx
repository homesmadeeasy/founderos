'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { GymSnapshot } from '@/lib/specialists/gym/gymTypes'
import { MUSCLE_GROUP_LABELS } from '@/lib/specialists/gym/gymTypes'
import { plannedExerciseListKey } from '@/lib/specialists/gym/gymPlannedExerciseUtils'
import {
  WORKOUT_SKIP_REASON_LABELS,
  WORKOUT_STATUS_LABELS,
  type WorkoutSkipReason,
} from '@/lib/specialists/gym/gymSessionStatus'
import { useGymData, buildWhyWorkoutSummary } from '@/contexts/GymDataContext'
import GymCard from './GymCard'

interface Props {
  snapshot: GymSnapshot
  onExplainPrescription?: (exerciseId: string) => void
}

const SKIP_REASONS = Object.keys(WORKOUT_SKIP_REASON_LABELS) as WorkoutSkipReason[]

export default function TodaysWorkoutCard({ snapshot, onExplainPrescription }: Props) {
  const router = useRouter()
  const {
    approvedPlan,
    approveWorkoutPlan,
    startWorkoutFromPlan,
    activeWorkout,
    todayStatus,
    skipWorkout,
    pendingReschedule,
    confirmReschedule,
    dismissReschedule,
    profile,
  } = useGymData()
  const [showWhy, setShowWhy] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showSkip, setShowSkip] = useState(false)
  const [skipReason, setSkipReason] = useState<WorkoutSkipReason>('busy')
  const [skipNote, setSkipNote] = useState('')
  const [skipAck, setSkipAck] = useState<string | null>(null)

  const w = snapshot.todaysWorkout
  const deferredTomorrow = profile?.firstSessionIntent === 'tomorrow' && todayStatus.status === 'not_started'
  const plannedTomorrow = todayStatus.status === 'not_started'
    && profile?.firstSessionIntent === 'tomorrow'

  const isApproved = approvedPlan?.title === w.title
    || approvedPlan?.workoutInstanceId === w.workoutInstanceId
  const whySummary = buildWhyWorkoutSummary(w, snapshot.hasStructuredHistory)

  const handleApprove = () => {
    approveWorkoutPlan(w, whySummary)
  }

  const handleStart = () => {
    if (!isApproved) approveWorkoutPlan(w, whySummary)
    startWorkoutFromPlan()
    router.push('/gym/workout')
  }

  const handleSkip = () => {
    const { rescheduled } = skipWorkout(skipReason, skipNote || undefined)
    setShowSkip(false)
    setSkipAck(
      rescheduled
        ? `Skipped — recorded as ${WORKOUT_SKIP_REASON_LABELS[skipReason]}. Nothing was logged as completed. Reschedule to ${rescheduled.scheduledFor}?`
        : `Skipped — recorded as ${WORKOUT_SKIP_REASON_LABELS[skipReason]}. No completed sets were invented.`,
    )
  }

  const statusLabel = deferredTomorrow
    ? 'Not Started'
    : todayStatus.status === 'not_started'
      ? 'Not Started'
      : WORKOUT_STATUS_LABELS[todayStatus.status]

  return (
    <GymCard className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-emerald-600/80">Today&apos;s workout</p>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
          {statusLabel}
        </span>
      </div>
      <h3 className="text-lg font-semibold text-zinc-900">{w.title}</h3>
      <p className="text-xs text-zinc-500 mt-1">
        ~{w.estimatedMinutes} min · {w.musclesTrained.map(m => MUSCLE_GROUP_LABELS[m]).join(', ')}
      </p>

      {plannedTomorrow && (
        <p className="text-xs text-zinc-600 bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-2 mt-3 leading-relaxed">
          Today is <span className="font-medium">Not Started</span>. Your first session is{' '}
          <span className="font-medium">Planned</span> for tomorrow — no sets have been completed.
        </p>
      )}

      {!snapshot.hasStructuredHistory && !plannedTomorrow && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-3">
          No completed workout history yet — approve and log real sets to unlock accurate volume and progression. Planned or skipped sessions do not count.
        </p>
      )}

      {skipAck && (
        <p className="text-xs text-zinc-600 bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-2 mt-3">{skipAck}</p>
      )}

      {pendingReschedule && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
          <p className="text-xs text-zinc-700">
            Reschedule this workout to <span className="font-medium">{pendingReschedule.scheduledFor}</span>?
          </p>
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={confirmReschedule}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white">Yes, plan it</button>
            <button type="button" onClick={() => { dismissReschedule(); setSkipAck(null) }}
              className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200">Not now</button>
          </div>
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {w.exercises.map((ex, index) => {
          const rowKey = plannedExerciseListKey(ex, index)
          return (
            <li key={rowKey} className="text-sm border-b border-zinc-50 pb-2 last:border-0">
              <button type="button" onClick={() => setExpanded(expanded === rowKey ? null : rowKey)}
                className="w-full text-left flex items-center justify-between gap-2">
                <span className="text-zinc-800 font-medium">{ex.exerciseName}</span>
                <span className="text-zinc-500 text-xs shrink-0">{ex.sets}×{ex.reps} · RPE {ex.targetRpe}</span>
              </button>
              {expanded === rowKey && (
                <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                  {ex.prescription.rationale}
                  <button type="button" onClick={() => onExplainPrescription?.(ex.exerciseId)}
                    className="ml-2 text-emerald-700 hover:underline">Why?</button>
                </p>
              )}
            </li>
          )
        })}
      </ul>

      <button type="button" onClick={() => setShowWhy(!showWhy)}
        className="text-xs text-emerald-700 mt-3 hover:underline">
        {showWhy ? 'Hide' : 'Why this workout?'}
      </button>
      {showWhy && <p className="text-xs text-zinc-600 mt-2 leading-relaxed">{whySummary}</p>}

      <div className="flex flex-wrap gap-2 mt-4">
        {activeWorkout ? (
          <Link href="/gym/workout"
            className="text-sm font-semibold px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
            Resume workout
          </Link>
        ) : todayStatus.status !== 'skipped' && todayStatus.status !== 'completed' && !plannedTomorrow ? (
          <>
            {!isApproved && (
              <button type="button" onClick={handleApprove}
                className="text-sm font-medium px-4 py-2 rounded-lg border border-emerald-200 text-emerald-800 bg-emerald-50">
                Approve workout
              </button>
            )}
            <button type="button" onClick={handleStart}
              className="text-sm font-semibold px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
              {isApproved ? 'Start workout' : 'Approve & start'}
            </button>
            <button type="button" onClick={() => setShowSkip(true)}
              className="text-sm px-4 py-2 rounded-lg border border-zinc-200 text-zinc-600">
              Skip workout
            </button>
          </>
        ) : null}
      </div>
      {isApproved && !activeWorkout && todayStatus.status === 'not_started' && !plannedTomorrow && (
        <p className="text-[10px] text-emerald-600 mt-2">Workout approved — ready to start</p>
      )}

      {showSkip && (
        <div className="mt-4 rounded-lg border border-zinc-200 p-3 space-y-2">
          <p className="text-xs font-medium text-zinc-800">Why are you skipping?</p>
          <p className="text-[10px] text-zinc-400">This is stored as real metadata. We will not mark exercises completed.</p>
          <div className="flex flex-wrap gap-1.5">
            {SKIP_REASONS.map(r => (
              <button key={r} type="button" onClick={() => setSkipReason(r)}
                className={`text-[10px] px-2 py-1 rounded-full border ${skipReason === r ? 'border-emerald-400 bg-emerald-50' : 'border-zinc-200'}`}>
                {WORKOUT_SKIP_REASON_LABELS[r]}
              </button>
            ))}
          </div>
          <input value={skipNote} onChange={e => setSkipNote(e.target.value)}
            placeholder="Optional note"
            className="w-full text-sm rounded-lg border border-zinc-200 px-3 py-2" />
          <div className="flex gap-2">
            <button type="button" onClick={handleSkip}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-zinc-900 text-white">Confirm skip</button>
            <button type="button" onClick={() => setShowSkip(false)}
              className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200">Cancel</button>
          </div>
        </div>
      )}
    </GymCard>
  )
}
