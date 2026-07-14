'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react'
import type { FounderProposalBundle } from '@/lib/ai/founder/founderAI.types'
import EvidenceChips from './EvidenceChips'
import FounderAIActionProposal from './FounderAIActionProposal'
import FounderAIBeliefProposal from './FounderAIBeliefProposal'

interface FounderAIMessageExtrasProps {
  proposal: FounderProposalBundle
  evidence: { id: string; title: string; summary: string; weight: number; supports: boolean; sourceType: string }[]
  onApproveAction: (proposalId: string, actionId: string, editedPayload?: Record<string, unknown>) => void
  onDismissAction: (proposalId: string, actionId: string) => void
  onApproveBeliefs: (proposalId: string) => void
  onDismissProposal: (proposalId: string) => void
}

export default function FounderAIMessageExtras({
  proposal,
  evidence,
  onApproveAction,
  onDismissAction,
  onApproveBeliefs,
  onDismissProposal,
}: FounderAIMessageExtrasProps) {
  const [whyOpen, setWhyOpen] = useState(false)
  const { response } = proposal
  const evidenceChips = evidence
    .filter((e) => response.evidenceIds.includes(e.id))
    .map((e) => ({
      id: e.id,
      sourceType: e.sourceType as 'memory',
      title: e.title,
      summary: e.summary,
      weight: e.weight,
      supports: e.supports,
    }))

  if (proposal.status !== 'pending') return null

  return (
    <div className="mt-3 space-y-3 border-t border-zinc-100/80 pt-3">
      <button
        type="button"
        onClick={() => setWhyOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 hover:text-zinc-700"
      >
        <Lightbulb size={12} />
        Why this?
        {whyOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {whyOpen && (
        <div className="rounded-lg bg-zinc-50/90 border border-zinc-100 px-3 py-2.5 space-y-2">
          <p className="text-xs text-zinc-600 leading-relaxed">{response.reasoningSummary}</p>
          <p className="text-[10px] text-zinc-400">Confidence: {response.confidence}%</p>
          {evidenceChips.length > 0 && <EvidenceChips evidence={evidenceChips} max={4} compact />}
        </div>
      )}

      {response.beliefsToUpdate.length > 0 && (
        <FounderAIBeliefProposal
          proposal={proposal}
          onApprove={() => onApproveBeliefs(proposal.id)}
          onDismiss={() => onDismissProposal(proposal.id)}
        />
      )}

      {response.suggestedActions.map((action) => (
        <FounderAIActionProposal
          key={action.id}
          proposal={proposal}
          action={action}
          onApprove={(edited) => onApproveAction(proposal.id, action.id, edited)}
          onDismiss={() => onDismissAction(proposal.id, action.id)}
        />
      ))}
    </div>
  )
}
