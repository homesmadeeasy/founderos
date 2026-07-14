'use client'

import { Check, X } from 'lucide-react'
import type { FounderProposalBundle } from '@/lib/ai/founder/founderAI.types'

interface FounderAIBeliefProposalProps {
  proposal: FounderProposalBundle
  onApprove: () => void
  onDismiss: () => void
}

export default function FounderAIBeliefProposal({
  proposal,
  onApprove,
  onDismiss,
}: FounderAIBeliefProposalProps) {
  const updates = proposal.response.beliefsToUpdate
  if (updates.length === 0) return null

  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3.5">
      <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-amber-700 mb-2">Proposed belief updates</p>
      <ul className="space-y-2">
        {updates.map((u, i) => (
          <li key={`${u.beliefId ?? u.proposition}-${i}`} className="text-xs text-zinc-700">
            <span className="font-medium capitalize">{u.operation}</span>
            {' — '}
            {u.proposition}
            {u.confidenceDelta !== 0 && (
              <span className="text-zinc-500"> ({u.confidenceDelta > 0 ? '+' : ''}{u.confidenceDelta}% confidence)</span>
            )}
            <p className="text-[10px] text-zinc-500 mt-0.5">{u.rationale}</p>
          </li>
        ))}
      </ul>
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={onApprove}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700"
        >
          <Check size={12} /> Approve beliefs
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 text-zinc-500 hover:bg-white"
        >
          <X size={12} /> Dismiss
        </button>
      </div>
    </div>
  )
}
