'use client'

import {
  Dna, FileText, Target, GitFork, ShieldAlert, Activity, BookOpen, Compass,
} from 'lucide-react'
import type { ProjectDna } from '@/lib/types'

function Section({ icon: Icon, title, text }: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  text: string
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Icon size={13} className="text-zinc-400" />
        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{title}</h4>
      </div>
      <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">
        {text?.trim() || <span className="text-zinc-400">Not enough information yet.</span>}
      </p>
    </div>
  )
}

function ConfidenceBar({ score }: { score: number }) {
  const clamped = Math.min(100, Math.max(0, score))
  const color =
    clamped >= 70 ? 'bg-emerald-500' :
    clamped >= 40 ? 'bg-blue-500' : 'bg-orange-400'
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-zinc-500">Confidence</span>
        <span className="font-semibold text-zinc-700 tabular-nums">{clamped}/100</span>
      </div>
      <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${clamped}%` }} />
      </div>
      <p className="text-[11px] text-zinc-400">
        {clamped < 40 ? 'Limited history — DNA will improve as you add more project data.' :
         clamped < 70 ? 'Growing profile — more decisions and reviews will sharpen this.' :
         'Strong profile — based on substantial project history.'}
      </p>
    </div>
  )
}

export default function DnaCard({ dna, defaultExpanded = true }: {
  dna: ProjectDna
  defaultExpanded?: boolean
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dna size={14} className="text-violet-500" />
          <p className="text-xs font-medium text-zinc-500">
            Generated {new Date(dna.createdAt).toLocaleString()}
          </p>
        </div>
        <span className="text-[11px] font-semibold text-zinc-500 bg-zinc-100 rounded-full px-2 py-0.5 tabular-nums">
          {dna.confidenceScore}% confidence
        </span>
      </div>

      <div className="p-5 space-y-5">
        <Section icon={FileText} title="DNA Summary" text={dna.dnaSummary} />
        <ConfidenceBar score={dna.confidenceScore} />
        <Section icon={Compass} title="Origin" text={dna.origin} />
        <Section icon={Target} title="Core Goal" text={dna.coreGoal} />
        <Section icon={Activity} title="Current Direction" text={dna.currentDirection} />
        <Section icon={GitFork} title="Major Decisions" text={dna.majorDecisions} />
        <Section icon={ShieldAlert} title="Recurring Risks" text={dna.recurringRisks} />
        <Section icon={Activity} title="Momentum Pattern" text={dna.momentumPattern} />
        <Section icon={BookOpen} title="Lessons Learned" text={dna.lessonsLearned} />
        <Section icon={Target} title="Next Strategic Move" text={dna.nextStrategicMove} />
      </div>
    </div>
  )
}
