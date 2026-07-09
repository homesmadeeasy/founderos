'use client'

import { useMorningExecution } from '@/contexts/MorningExecutionContext'
import { useMemoryEngine } from '@/contexts/MemoryEngineContext'
import { useSignalEngine } from '@/contexts/SignalEngineContext'
import { useSyncEngine } from '@/contexts/SyncEngineContext'
import { isSyncableStatus } from '@/lib/source-adapters/adapterRegistry'

interface StatusDotProps {
  label: string
  ok: boolean
}

function StatusDot({ label, ok }: StatusDotProps) {
  return (
    <span className="inline-flex items-center gap-1 text-[9px] text-zinc-400/90">
      <span className={`w-1 h-1 rounded-full ${ok ? 'bg-emerald-500' : 'bg-amber-400'}`} />
      {label}
    </span>
  )
}

export default function FounderStatus() {
  const { ready: morningReady, decisionOutput } = useMorningExecution()
  const { ready: memoryReady } = useMemoryEngine()
  const { ready: signalReady } = useSignalEngine()
  const { adapters } = useSyncEngine()

  const calendarOk = adapters.some(
    a => (a.adapterId === 'google-calendar' || a.adapterId === 'calendar') && isSyncableStatus(a.status),
  )

  return (
    <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 py-4 text-center">
      <StatusDot label="Decision" ok={morningReady && !!decisionOutput} />
      <StatusDot label="Memory" ok={memoryReady} />
      <StatusDot label="Signals" ok={signalReady} />
      <StatusDot label="Calendar" ok={calendarOk} />
      <StatusDot label="Ready" ok={morningReady && memoryReady && signalReady} />
    </footer>
  )
}
