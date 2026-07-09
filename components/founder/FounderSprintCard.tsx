'use client'

import type { FounderSnapshot } from '@/lib/specialists/founder/founderTypes'
import FounderCard from './FounderCard'

interface FounderSprintCardProps {
  snapshot: FounderSnapshot
}

export default function FounderSprintCard({ snapshot }: FounderSprintCardProps) {
  const sprint = snapshot.suggestedSprint

  return (
    <FounderCard className="p-4 sm:p-5" delay={320}>
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-indigo-500/80 mb-2">Recommended sprint</p>
      <h3 className="text-lg font-semibold text-zinc-900">{sprint.title}</h3>
      <p className="text-xs text-zinc-600 mt-2 leading-relaxed">{sprint.why}</p>

      <ul className="mt-4 space-y-1.5">
        {sprint.tasks.map((task, i) => (
          <li key={i} className="text-xs text-zinc-700 flex gap-2">
            <span className="text-indigo-400 font-medium tabular-nums">{i + 1}.</span>
            <span>{task}</span>
          </li>
        ))}
      </ul>

      {sprint.ignore.length > 0 && (
        <p className="text-[10px] text-amber-800/90 mt-4 bg-amber-50/50 rounded-lg px-3 py-2 border border-amber-100/60">
          Ignore: {sprint.ignore.join(' · ')}
        </p>
      )}

      <p className="text-[10px] text-violet-700/80 mt-3 italic">
        Done when: {sprint.definitionOfDone}
      </p>
    </FounderCard>
  )
}
