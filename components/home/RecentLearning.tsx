'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useMemoryEngine } from '@/contexts/MemoryEngineContext'
import { useKnowledgeEngine } from '@/contexts/KnowledgeEngineContext'
import { getOutcomeHistory } from '@/lib/outcome-engine/outcomeEngine'
import Card from './Card'

export default function RecentLearning() {
  const { memories } = useMemoryEngine()
  const { knowledge } = useKnowledgeEngine()
  const outcomes = useMemo(() => getOutcomeHistory(5), [])

  const items = useMemo(() => {
    const list: { id: string; label: string; detail: string; kind: string }[] = []
    for (const m of memories.slice(0, 3)) {
      list.push({ id: m.id, label: m.title, detail: m.content.slice(0, 80), kind: 'memory' })
    }
    for (const k of knowledge.slice(0, 2)) {
      list.push({ id: k.id, label: k.title, detail: k.principle.slice(0, 80), kind: 'knowledge' })
    }
    for (const o of outcomes.filter(x => x.record).slice(0, 2)) {
      list.push({
        id: o.prediction.id,
        label: o.prediction.decisionTitle,
        detail: `Followed: ${o.record!.completed} · ${o.record!.outcomeQuality}`,
        kind: 'outcome',
      })
    }
    return list.slice(0, 5)
  }, [memories, knowledge, outcomes])

  if (items.length === 0) return null

  return (
    <Card className="p-4 sm:p-5" delay={420}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-zinc-400">Recent learning</p>
        <Link href="/memory" className="text-[10px] text-indigo-600/70 hover:text-indigo-700">Memory</Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
        {items.map(item => (
          <div key={item.id} className="flex gap-2 min-w-0">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-zinc-800 truncate">{item.label}</p>
              <p className="text-[10px] text-zinc-500 line-clamp-1">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
