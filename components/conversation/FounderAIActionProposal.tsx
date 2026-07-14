'use client'

import { useState } from 'react'
import { Check, X, Pencil } from 'lucide-react'
import type { FounderProposalBundle, ProposedAction } from '@/lib/ai/founder/founderAI.types'

interface FounderAIActionProposalProps {
  proposal: FounderProposalBundle
  action: ProposedAction
  onApprove: (editedPayload?: Record<string, unknown>) => void
  onDismiss: () => void
}

export default function FounderAIActionProposal({
  action,
  onApprove,
  onDismiss,
}: FounderAIActionProposalProps) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(action.title)
  const [description, setDescription] = useState(action.description)
  const [dueDate, setDueDate] = useState(
    typeof action.payload.dueDate === 'string' ? action.payload.dueDate : '',
  )
  const [mission, setMission] = useState(
    typeof action.payload.mission === 'string' ? action.payload.mission : action.description,
  )

  function handleApprove() {
    const edited: Record<string, unknown> = {}
    if (title !== action.title) edited.title = title
    if (description !== action.description) edited.description = description
    if (dueDate) edited.dueDate = dueDate
    if (action.type === 'update_mission' && mission) edited.mission = mission
    onApprove(Object.keys(edited).length ? edited : undefined)
  }

  return (
    <div className="rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/60 to-white p-3.5">
      <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-violet-500 mb-1">Proposed action</p>
      {editing ? (
        <div className="space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-sm border border-zinc-200 rounded-lg px-2.5 py-1.5"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full text-sm border border-zinc-200 rounded-lg px-2.5 py-1.5"
          />
          {action.type === 'create_task' && (
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="text-sm border border-zinc-200 rounded-lg px-2.5 py-1.5"
            />
          )}
          {action.type === 'update_mission' && (
            <textarea
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              rows={2}
              className="w-full text-sm border border-zinc-200 rounded-lg px-2.5 py-1.5"
            />
          )}
        </div>
      ) : (
        <>
          <p className="text-sm font-medium text-zinc-900">{title}</p>
          <p className="text-xs text-zinc-600 mt-1 leading-relaxed">{description}</p>
          <p className="text-[10px] text-zinc-400 mt-2">{action.rationale}</p>
        </>
      )}
      <div className="flex flex-wrap gap-2 mt-3">
        <button
          type="button"
          onClick={handleApprove}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700"
        >
          <Check size={12} /> Approve
        </button>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
        >
          <Pencil size={12} /> Edit
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50"
        >
          <X size={12} /> Dismiss
        </button>
      </div>
    </div>
  )
}
