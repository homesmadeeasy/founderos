'use client'

import Link from 'next/link'
import { useSignalEngine } from '@/contexts/SignalEngineContext'
import Card from './Card'

export default function ConnectedReality() {
  const { todaySignals } = useSignalEngine()
  const latest = todaySignals.slice(0, 5)

  if (latest.length === 0) {
    return (
      <Card className="p-4 sm:p-5 h-full" delay={360}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-zinc-400">Connected reality</p>
          <Link href="/signals" className="text-[10px] text-indigo-600/70 hover:text-indigo-700">All signals</Link>
        </div>
        <p className="text-xs text-zinc-500">No signals yet today.</p>
      </Card>
    )
  }

  return (
    <Card className="p-4 sm:p-5 h-full" delay={360}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-zinc-400">Connected reality</p>
        <Link href="/signals" className="text-[10px] text-indigo-600/70 hover:text-indigo-700">All signals</Link>
      </div>
      <ul className="space-y-2">
        {latest.map(signal => (
          <li key={signal.id} className="flex items-start gap-2 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
            <span className="text-zinc-700 leading-snug">{signal.title || signal.content.slice(0, 60)}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
