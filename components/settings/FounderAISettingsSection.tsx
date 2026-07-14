'use client'

import { useState, useCallback, useMemo } from 'react'
import { Brain, Loader2, HardDriveDownload, Sparkles } from 'lucide-react'
import { loadFounderAIPrefs, saveFounderAIPrefs } from '@/lib/ai/founder/founderAI.prefs'
import { clearPendingProposals } from '@/lib/ai/founder/founderAI.proposals'
import { FOUNDER_AI_DEFAULT_MODEL } from '@/lib/ai/founder/founderAI.config'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

export default function FounderAISettingsSection() {
  const [prefs, setPrefs] = useState(() => loadFounderAIPrefs())
  const [message, setMessage] = useState<string | null>(null)
  const [clearing, setClearing] = useState(false)

  function toggleLlm(enabled: boolean) {
    const next = { llmEnabled: enabled }
    saveFounderAIPrefs(next)
    setPrefs(next)
    setMessage(enabled ? 'External AI enabled for Founder conversations.' : 'Deterministic reasoning only.')
  }

  async function handleClearProposals() {
    setClearing(true)
    try {
      clearPendingProposals()
      setMessage('Pending AI proposals cleared. Conversation and beliefs were not changed.')
    } finally {
      setClearing(false)
    }
  }

  return (
    <section className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-50 text-violet-600">
            <Sparkles size={15} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Founder AI</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Strategic conversation with approval-based actions</p>
          </div>
        </div>
      </div>
      <div className="px-5 py-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-zinc-100 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">Availability</p>
            <p className="text-zinc-700 mt-1">
              {prefs.llmEnabled
                ? 'LLM path enabled when server key is configured'
                : 'Deterministic reasoning only'}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-100 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">Server model</p>
            <p className="text-zinc-700 mt-1 font-mono text-xs">{FOUNDER_AI_DEFAULT_MODEL} (configurable server-side)</p>
          </div>
        </div>

        <label className="flex items-center justify-between gap-3 text-sm text-zinc-700">
          <span>Use external AI for Founder conversations</span>
          <input
            type="checkbox"
            checked={prefs.llmEnabled}
            onChange={(e) => toggleLlm(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-violet-600 focus:ring-violet-500"
          />
        </label>

        <button
          type="button"
          onClick={() => void handleClearProposals()}
          disabled={clearing}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border border-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-50 disabled:opacity-50"
        >
          {clearing ? <Loader2 size={14} className="animate-spin" /> : <HardDriveDownload size={14} />}
          Clear pending AI proposals
        </button>

        <p className="text-xs text-zinc-500 flex items-start gap-2">
          <Brain size={14} className="mt-0.5 shrink-0 text-zinc-400" />
          API keys are never stored in the browser. Proposal storage is bounded to about {formatBytes(48_000)}.
        </p>

        {message && <p className="text-xs text-zinc-500">{message}</p>}
      </div>
    </section>
  )
}
