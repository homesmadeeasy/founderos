'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { MessageCircle, Zap } from 'lucide-react'
import { useMorningExecution } from '@/contexts/MorningExecutionContext'
import { useMemoryEngine } from '@/contexts/MemoryEngineContext'
import { useKnowledgeEngine } from '@/contexts/KnowledgeEngineContext'
import { useSignalEngine } from '@/contexts/SignalEngineContext'
import { useCommandCenter } from '@/contexts/CommandCenterContext'
import { useUniversalCapture } from '@/contexts/UniversalCaptureContext'
import Card from './Card'

export default function FocusCard() {
  const { decisionOutput, getFirstAction, morningPlan } = useMorningExecution()
  const { memories } = useMemoryEngine()
  const { knowledge } = useKnowledgeEngine()
  const { todaySignals } = useSignalEngine()
  const { askAssistant } = useCommandCenter()
  const { openCapture } = useUniversalCapture()

  const focus = getFirstAction() ?? (decisionOutput ? {
    title: decisionOutput.primaryDecision.action,
    reason: decisionOutput.primaryDecision.reason,
    estimatedMinutes: decisionOutput.primaryDecision.estimatedMinutes,
  } : null)

  const relatedMemories = useMemo(() => memories.slice(0, 1), [memories])
  const relatedKnowledge = useMemo(() => knowledge.slice(0, 1), [knowledge])
  const relatedSignals = useMemo(() => todaySignals.slice(0, 1), [todaySignals])

  if (!focus) {
    return (
      <Card className="p-4 sm:p-5 text-center" delay={240}>
        <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-indigo-500/70 mb-2">Focus</p>
        <p className="text-xs text-zinc-500">Compiling focus…</p>
      </Card>
    )
  }

  const minutes = 'estimatedMinutes' in focus && focus.estimatedMinutes
    ? focus.estimatedMinutes
    : morningPlan?.scheduleBlocks[0]?.durationMinutes ?? 45

  return (
    <Card className="p-4 sm:p-5 relative overflow-hidden flex flex-col" delay={240}>
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.04] via-transparent to-violet-500/[0.06] pointer-events-none" />
      <div className="relative flex flex-col flex-1">
        <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-indigo-500/80 mb-2">Focus</p>
        <h2 className="text-lg sm:text-xl font-semibold text-zinc-900 tracking-tight leading-snug">
          {focus.title}
        </h2>
        {'reason' in focus && focus.reason && (
          <p className="text-xs text-zinc-500 mt-2 line-clamp-2">{focus.reason}</p>
        )}

        <div className="flex flex-wrap items-center gap-2.5 mt-4">
          <div className="px-3 py-2 rounded-xl bg-zinc-900 text-white">
            <p className="text-[9px] uppercase tracking-wider text-zinc-400">Est.</p>
            <p className="text-lg font-semibold tabular-nums leading-tight">{minutes}m</p>
          </div>
          <Link
            href="/morning"
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-500/20"
          >
            Begin
          </Link>
        </div>

        {(relatedMemories.length > 0 || relatedKnowledge.length > 0 || relatedSignals.length > 0) && (
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/60">
            {relatedMemories.length > 0 && (
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400 mb-0.5">Memory</p>
                <p className="text-[10px] text-zinc-600 line-clamp-2">{relatedMemories[0].title}</p>
              </div>
            )}
            {relatedKnowledge.length > 0 && (
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400 mb-0.5">Knowledge</p>
                <p className="text-[10px] text-zinc-600 line-clamp-2">{relatedKnowledge[0].title}</p>
              </div>
            )}
            {relatedSignals.length > 0 && (
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400 mb-0.5">Signal</p>
                <p className="text-[10px] text-zinc-600 line-clamp-2">{relatedSignals[0].title}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-auto pt-3">
          <button
            type="button"
            onClick={openCapture}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/80 bg-white/50 text-[11px] font-medium text-zinc-700 hover:bg-white/80 transition-colors"
          >
            <Zap size={12} className="text-amber-600" />
            Capture
          </button>
          <button
            type="button"
            onClick={() => askAssistant('What should I focus on right now?')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/80 bg-white/50 text-[11px] font-medium text-zinc-700 hover:bg-white/80 transition-colors"
          >
            <MessageCircle size={12} className="text-indigo-600" />
            Ask
          </button>
        </div>
      </div>
    </Card>
  )
}
