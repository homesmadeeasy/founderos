'use client'

import { useState } from 'react'
import { Brain, Loader2, HardDriveDownload } from 'lucide-react'
import { compactStoredCognitiveModel } from '@/lib/cognitive-model/cognitiveCompaction'
import { getCognitiveStore } from '@/lib/cognitive-model/cognitiveOrchestrator'
import { saveCognitiveStore } from '@/lib/cognitive-model/beliefStorage'
import { setActiveMemoryStore } from '@/lib/cognitive-model/cognitiveMemory'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function CognitiveStorageSection() {
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleCompact() {
    setRunning(true)
    setMessage(null)
    try {
      const report = compactStoredCognitiveModel(getCognitiveStore())
      setActiveMemoryStore(report.store)
      const result = saveCognitiveStore(report.store, { force: true })
      if (process.env.NODE_ENV === 'development') {
        console.info('[cognitive-model] Manual compaction', report)
      }
      setMessage(
        `Compacted cognitive storage: ${formatBytes(report.beforeBytes)} → ${formatBytes(report.afterBytes)}. `
        + `Beliefs ${report.stats.beliefs}, evidence ${report.stats.evidence}, timeline ${report.stats.timeline}. `
        + `${result.success ? 'Saved successfully.' : result.warning ?? 'Kept in memory only.'}`,
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Compaction failed.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <section className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600">
            <Brain size={15} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Cognitive storage</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Compact Founder AI&apos;s internal belief model without clearing your real data</p>
          </div>
        </div>
      </div>
      <div className="px-5 py-4 space-y-3">
        <p className="text-sm text-zinc-600">
          If Founder AI feels slow or you previously hit storage limits, compacting removes duplicate evidence and old derived history while keeping current beliefs.
        </p>
        <button
          type="button"
          onClick={() => void handleCompact()}
          disabled={running}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {running ? <Loader2 size={14} className="animate-spin" /> : <HardDriveDownload size={14} />}
          Compact cognitive storage
        </button>
        {process.env.NODE_ENV === 'development' && (
          <p className="text-[11px] text-zinc-400">Development builds log compaction details to the console.</p>
        )}
        {message && <p className="text-xs text-zinc-500">{message}</p>}
      </div>
    </section>
  )
}
