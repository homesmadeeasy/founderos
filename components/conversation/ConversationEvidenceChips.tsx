'use client'

import type { ConversationEvidence } from '@/lib/conversation/conversationTypes'

interface ConversationEvidenceChipsProps {
  evidence: ConversationEvidence[]
  compact?: boolean
  max?: number
}

const SOURCE_COLORS: Record<string, string> = {
  memory: 'bg-violet-50 text-violet-700 border-violet-100',
  signal: 'bg-amber-50 text-amber-800 border-amber-100',
  outcome: 'bg-emerald-50 text-emerald-800 border-emerald-100',
  decision: 'bg-blue-50 text-blue-800 border-blue-100',
  domain: 'bg-indigo-50 text-indigo-800 border-indigo-100',
  knowledge: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-100',
  founder: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  object: 'bg-sky-50 text-sky-800 border-sky-100',
}

export default function ConversationEvidenceChips({
  evidence,
  compact = false,
  max = 6,
}: ConversationEvidenceChipsProps) {
  const items = evidence.slice(0, max)
  if (items.length === 0) return null

  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? 'mt-2.5' : 'mt-3'}`}>
      {items.map(e => (
        <span
          key={e.id}
          title={`${e.title}: ${e.summary}`}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium leading-tight ${
            SOURCE_COLORS[e.sourceType] ?? SOURCE_COLORS.founder
          }`}
        >
          {!e.supports && <span className="opacity-50">!</span>}
          {e.title}
        </span>
      ))}
    </div>
  )
}
