'use client'

import { useState } from 'react'
import type { WorkoutExercisePrescription } from '@/lib/specialists/gym/evidence/gymEvidenceTypes'
import { getEvidenceClaim } from '@/lib/specialists/gym/evidence/gymEvidenceRegistry'
import { formatCitationShort } from '@/lib/specialists/gym/evidence/gymEvidenceCitations'
import { getResearchSource } from '@/lib/specialists/gym/evidence/gymEvidenceRegistry'
import { citationFromSource } from '@/lib/specialists/gym/evidence/gymEvidenceCitations'

interface Props {
  exerciseName: string
  prescription: WorkoutExercisePrescription
  onExplain?: () => void
}

export default function PrescriptionWhyPanel({ exerciseName, prescription, onExplain }: Props) {
  const [open, setOpen] = useState(false)
  const exp = prescription.explanation

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => { setOpen(v => !v); onExplain?.() }}
        className="text-[10px] font-medium text-emerald-700 hover:underline"
      >
        {open ? 'Hide why' : 'Why this?'}
      </button>
      {open && (
        <div className="mt-2 rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 text-[11px] text-zinc-600 space-y-2 leading-relaxed">
          <p><span className="font-semibold text-zinc-800">Personal:</span> {exp.personalReason}</p>
          <p><span className="font-semibold text-zinc-800">Research:</span> {exp.researchBasis}</p>
          {exp.assumptions.length > 0 && (
            <p><span className="font-semibold text-zinc-800">Assumptions:</span> {exp.assumptions.join(' ')}</p>
          )}
          <p><span className="font-semibold text-zinc-800">Confidence:</span> {prescription.prescriptionConfidence}% — {prescription.prescriptionMode === 'evidence_informed' ? 'Evidence-informed personalised prescription' : 'Fallback prescription — insufficient history'}</p>
          <p><span className="font-semibold text-zinc-800">Progression:</span> {exp.progressionRule}</p>
          {exp.missingDataForPersonalisation.length > 0 && (
            <p><span className="font-semibold text-zinc-800">Missing for better personalisation:</span> {exp.missingDataForPersonalisation.join(', ')}</p>
          )}
          {exp.safetyNotes.length > 0 && (
            <p className="text-amber-800"><span className="font-semibold">Safety:</span> {exp.safetyNotes.join(' ')}</p>
          )}
          {prescription.researchClaimIds.length > 0 && (
            <div>
              <p className="font-semibold text-zinc-800 mb-1">Linked sources</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {prescription.researchClaimIds.map(claimId => {
                  const claim = getEvidenceClaim(claimId)
                  const source = claim ? getResearchSource(claim.sourceId) : undefined
                  if (!source) return null
                  return (
                    <li key={claimId}>
                      {formatCitationShort(citationFromSource(source))}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
          <p className="text-zinc-500 italic">Recommended starting point for {exerciseName}, not a definitive optimum.</p>
        </div>
      )}
    </div>
  )
}
