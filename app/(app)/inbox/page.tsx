'use client'

import { useMemo, useState } from 'react'
import {
  Inbox, Search, Sparkles, Brain, Boxes, Filter,
} from 'lucide-react'
import Link from 'next/link'
import { useUniversalCapture } from '@/contexts/UniversalCaptureContext'
import { useKnowledgeEngine } from '@/contexts/KnowledgeEngineContext'
import { useMemoryEngine } from '@/contexts/MemoryEngineContext'
import { useObjectEngine } from '@/contexts/ObjectEngineContext'
import { suggestKnowledgeFromCapture } from '@/lib/capture-engine/captureSuggestions'
import UniversalCaptureInput from '@/components/capture/UniversalCaptureInput'
import {
  CAPTURE_CLASSIFICATION_LABEL,
  CAPTURE_SOURCE_LABEL,
} from '@/lib/capture-engine/captureTypes'
import type { CaptureSignal } from '@/lib/capture-engine/captureTypes'
import { todayISO } from '@/lib/capture-engine/captureUtils'

const inputClass =
  'w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10'

function SignalRow({
  signal,
  onProcess,
}: {
  signal: CaptureSignal
  onProcess: (id: string) => void
}) {
  return (
    <li className="flex items-start gap-3 border border-zinc-100 rounded-xl p-4 bg-white">
      <span className="shrink-0 px-2 py-0.5 rounded-full bg-zinc-100 text-[10px] font-semibold text-zinc-600 uppercase">
        {CAPTURE_CLASSIFICATION_LABEL[signal.classification]}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-800">{signal.parsedContent}</p>
        <p className="text-[10px] text-zinc-400 mt-1">
          {CAPTURE_SOURCE_LABEL[signal.source]} · {new Date(signal.timestamp).toLocaleTimeString()}
        </p>
      </div>
      {signal.status !== 'processed' && (
        <button
          type="button"
          onClick={() => onProcess(signal.id)}
          className="text-xs text-emerald-600 font-medium shrink-0"
        >
          Process
        </button>
      )}
    </li>
  )
}

export default function InboxPage() {
  const {
    signals, todaySignals, unprocessedCount, markProcessed, search, saveKnowledgeSuggestion,
  } = useUniversalCapture()
  const { objects } = useObjectEngine()
  const { memories } = useMemoryEngine()
  const { knowledge } = useKnowledgeEngine()

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'new' | 'processed' | 'needs_review'>('all')

  const searchResults = useMemo(() => (query ? search(query) : []), [query, search])

  const newSignals = signals.filter(s => s.status === 'new')
  const processedToday = todaySignals.filter(s => s.status === 'processed')
  const needsReview = signals.filter(s => s.status === 'needs_review')
  const captureObjects = objects.filter(o => o.tags.includes('universal-capture') || o.metadata?.universalCapture)
  const recentCaptureMemories = memories.filter(m => m.tags.includes('universal-capture')).slice(0, 10)
  const pendingSuggestions = signals
    .filter(s => s.knowledgeSuggestionPending && s.createdMemoryId)
    .map(s => {
      const mem = memories.find(m => m.id === s.createdMemoryId)
      return mem ? { signal: s, memory: mem } : null
    })
    .filter(Boolean)

  const filtered = useMemo(() => {
    let list = signals
    if (filter === 'new') list = newSignals
    else if (filter === 'processed') list = processedToday
    else if (filter === 'needs_review') list = needsReview
    return list.slice(0, 30)
  }, [signals, filter, newSignals, processedToday, needsReview])

  return (
    <div className="min-h-full bg-zinc-50/80">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <header>
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Milestone 3</p>
          <h1 className="text-2xl font-bold text-zinc-900 mt-0.5 flex items-center gap-2">
            <Inbox size={24} className="text-indigo-600" />
            Inbox
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Reality waiting to be processed — {unprocessedCount} unprocessed
          </p>
        </header>

        <section className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/60 to-white p-5 shadow-sm">
          <UniversalCaptureInput variant="inline" />
        </section>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              className={`${inputClass} pl-9`}
              placeholder="Search objects, memories, knowledge, captures…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <select
            className={inputClass}
            value={filter}
            onChange={e => setFilter(e.target.value as typeof filter)}
          >
            <option value="all">All signals</option>
            <option value="new">New</option>
            <option value="processed">Processed today</option>
            <option value="needs_review">Needs review</option>
          </select>
        </div>

        {query && searchResults.length > 0 && (
          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-zinc-900 mb-3">Search results</h2>
            <ul className="space-y-2">
              {searchResults.map(r => (
                <li key={`${r.kind}-${r.id}`} className="flex items-center gap-2 text-sm">
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase w-16">{r.badge}</span>
                  <Link href={r.href} className="text-zinc-800 hover:text-indigo-600 truncate">{r.title}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Filter size={14} /> New Signals ({newSignals.length})
            </h2>
            <ul className="space-y-2 max-h-80 overflow-y-auto">
              {newSignals.length === 0 ? (
                <li className="text-sm text-zinc-400">No new signals.</li>
              ) : newSignals.map(s => (
                <SignalRow key={s.id} signal={s} onProcess={markProcessed} />
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-3">
              Processed Today ({processedToday.length})
            </h2>
            <ul className="space-y-2 max-h-80 overflow-y-auto">
              {processedToday.length === 0 ? (
                <li className="text-sm text-zinc-400">Nothing processed yet today.</li>
              ) : processedToday.map(s => (
                <SignalRow key={s.id} signal={s} onProcess={markProcessed} />
              ))}
            </ul>
          </section>
        </div>

        <section className="rounded-2xl border border-amber-100 bg-amber-50/40 p-5">
          <h2 className="text-sm font-semibold text-amber-800 uppercase tracking-wider mb-3">
            Needs Review ({needsReview.length})
          </h2>
          <ul className="space-y-2">
            {needsReview.length === 0 ? (
              <li className="text-sm text-zinc-500">No signals need review.</li>
            ) : needsReview.map(s => (
              <SignalRow key={s.id} signal={s} onProcess={markProcessed} />
            ))}
          </ul>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5">
            <h2 className="text-sm font-semibold text-indigo-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Sparkles size={14} /> Knowledge Suggestions
            </h2>
            {pendingSuggestions.length === 0 ? (
              <p className="text-sm text-zinc-500">No pending suggestions from captures.</p>
            ) : (
              <ul className="space-y-3">
                {pendingSuggestions.map(item => item && (
                  <li key={item.signal.id} className="rounded-xl bg-white border border-indigo-100 p-3">
                    <p className="text-sm font-medium text-zinc-900">{item.memory.title}</p>
                    <p className="text-xs text-zinc-500 mt-1">{item.signal.parsedContent.slice(0, 80)}</p>
                    <button
                      type="button"
                      onClick={() => {
                        const suggestion = suggestKnowledgeFromCapture(item.memory, item.signal.classification, memories)
                        if (suggestion) saveKnowledgeSuggestion(suggestion)
                      }}
                      className="mt-2 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold"
                    >
                      Save as knowledge
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Boxes size={14} /> Objects Created ({captureObjects.length})
            </h2>
            <ul className="text-sm space-y-1 max-h-48 overflow-y-auto">
              {captureObjects.slice(0, 12).map(o => (
                <li key={o.id} className="text-zinc-700 truncate">{o.title}</li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Brain size={14} /> Recent Memories
            </h2>
            <ul className="text-sm space-y-1 max-h-48 overflow-y-auto">
              {recentCaptureMemories.map(m => (
                <li key={m.id} className="text-zinc-700 truncate">{m.title}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
