'use client'

import type { GymSnapshot } from '@/lib/specialists/gym/gymTypes'
import { MUSCLE_GROUP_LABELS } from '@/lib/specialists/gym/gymTypes'
import GymCard from './GymCard'
import PrescriptionWhyPanel from './PrescriptionWhyPanel'

interface Props {
  snapshot: GymSnapshot
  onExplainPrescription?: (exerciseId: string) => void
}

export default function TodaysWorkoutCard({ snapshot, onExplainPrescription }: Props) {
  const w = snapshot.todaysWorkout
  return (
    <GymCard className="p-4 sm:p-5">
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-emerald-600/80 mb-2">Today&apos;s workout</p>
      <h3 className="text-lg font-semibold text-zinc-900">{w.title}</h3>
      <p className="text-xs text-zinc-500 mt-1">~{w.estimatedMinutes} min · {w.musclesTrained.map(m => MUSCLE_GROUP_LABELS[m]).join(', ')}</p>
      <ul className="mt-4 space-y-3">
        {w.exercises.map(ex => (
          <li key={ex.exerciseId} className="text-sm border-b border-zinc-50 pb-3 last:border-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-zinc-800 font-medium">{ex.exerciseName}</span>
                <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${ex.prescription.prescriptionMode === 'evidence_informed' ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                  {ex.prescription.prescriptionMode === 'evidence_informed' ? 'Evidence-informed' : 'Fallback'}
                </span>
              </div>
              <span className="text-zinc-500 text-xs shrink-0">{ex.sets}×{ex.reps} · RPE {ex.targetRpe}</span>
            </div>
            <PrescriptionWhyPanel
              exerciseName={ex.exerciseName}
              prescription={ex.prescription}
              onExplain={() => onExplainPrescription?.(ex.exerciseId)}
            />
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-zinc-500 mt-3 leading-relaxed">{w.rationale}</p>
    </GymCard>
  )
}
