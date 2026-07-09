'use client'

import { useMemo, useState } from 'react'
import { Radio, Plus, Search, Filter, RefreshCw, Loader2, Link2 } from 'lucide-react'
import { useSignalEngine } from '@/contexts/SignalEngineContext'
import { useSyncEngine } from '@/contexts/SyncEngineContext'
import { isSyncableStatus } from '@/lib/source-adapters/adapterRegistry'
import {
  SIGNAL_SOURCE_LABEL,
  SIGNAL_TYPE_LABEL,
  type Signal,
  type SignalSource,
  type SignalType,
} from '@/lib/signal-engine/signalTypes'
import { formatSignalTimestamp } from '@/lib/signal-engine/signalFormat'

const inputClass =
  'w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10'

const SOURCES = Object.keys(SIGNAL_SOURCE_LABEL) as SignalSource[]
const TYPES = Object.keys(SIGNAL_TYPE_LABEL) as SignalType[]

export default function SignalsPage() {
  const { signals, summary, searchSignals, addMockSignal, processSignalById } = useSignalEngine()
  const {
    adapters,
    syncHistory,
    lastGlobalSyncLabel,
    syncing,
    syncAll,
  } = useSyncEngine()
  const [query, setQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState<SignalSource | ''>('')
  const [typeFilter, setTypeFilter] = useState<SignalType | ''>('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const connectedCount = adapters.filter(a => isSyncableStatus(a.status)).length

  const filtered = useMemo(
    () => searchSignals(query, {
      source: sourceFilter || null,
      type: typeFilter || null,
    }),
    [searchSignals, query, sourceFilter, typeFilter],
  )

  const selected = selectedId ? signals.find(s => s.id === selectedId) ?? null : filtered[0] ?? null

  return (
    <div className="min-h-full bg-zinc-50/80">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Connected Reality</p>
            <h1 className="text-2xl font-bold text-zinc-900 mt-0.5 flex items-center gap-2">
              <Radio size={24} className="text-sky-600" />
              Signals
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              {summary.total} signals · {summary.today} today · {connectedCount} source{connectedCount === 1 ? '' : 's'} connected
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">
              Last sync: {lastGlobalSyncLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={syncing || connectedCount === 0}
              onClick={() => void syncAll()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-50"
            >
              {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Sync all sources
            </button>
            <button
              type="button"
              onClick={addMockSignal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800"
            >
              <Plus size={16} />
              Add mock signal
            </button>
          </div>
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Link2 size={14} /> Source connections
          </h2>
          <div className="flex flex-wrap gap-2">
            {adapters.map(a => (
              <span
                key={a.adapterId}
                className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                  isSyncableStatus(a.status)
                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                    : 'bg-zinc-50 text-zinc-500 border-zinc-200'
                }`}
              >
                {a.adapterId}: {a.status}
                {a.lastSyncedAt ? ` · ${formatSignalTimestamp(a.lastSyncedAt)}` : ''}
              </span>
            ))}
          </div>
          {connectedCount === 0 && (
            <p className="text-xs text-zinc-400 mt-2">
              No sources connected. Open Settings → Connected Sources to connect mock adapters.
            </p>
          )}
        </section>

        {summary.highlights.length > 0 && (
          <section className="rounded-2xl border border-sky-200 bg-sky-50/50 p-5">
            <h2 className="text-sm font-semibold text-sky-800 uppercase tracking-wider mb-2">Highlights</h2>
            <ul className="text-sm text-sky-900 space-y-1">
              {summary.highlights.map((h, i) => (
                <li key={i}>• {h}</li>
              ))}
            </ul>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  className={`${inputClass} pl-9`}
                  placeholder="Search signals…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>
              <select className={inputClass} value={sourceFilter} onChange={e => setSourceFilter(e.target.value as SignalSource | '')}>
                <option value="">All sources</option>
                {SOURCES.map(s => (
                  <option key={s} value={s}>{SIGNAL_SOURCE_LABEL[s]}</option>
                ))}
              </select>
              <select className={inputClass} value={typeFilter} onChange={e => setTypeFilter(e.target.value as SignalType | '')}>
                <option value="">All types</option>
                {TYPES.map(t => (
                  <option key={t} value={t}>{SIGNAL_TYPE_LABEL[t]}</option>
                ))}
              </select>
            </div>

            <section className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
              <div className="px-5 py-3 border-b border-zinc-100 flex items-center gap-2">
                <Filter size={14} className="text-zinc-400" />
                <h2 className="text-sm font-semibold text-zinc-900">Recent signals ({filtered.length})</h2>
              </div>
              <ul className="divide-y divide-zinc-100 max-h-[28rem] overflow-y-auto">
                {filtered.length === 0 ? (
                  <li className="px-5 py-8 text-sm text-zinc-400 text-center">No signals match.</li>
                ) : filtered.map(signal => (
                  <SignalRow
                    key={signal.id}
                    signal={signal}
                    selected={selected?.id === signal.id}
                    onSelect={() => setSelectedId(signal.id)}
                  />
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-3">Sync history</h2>
              {syncHistory.length === 0 ? (
                <p className="text-sm text-zinc-400">No syncs yet. Connect sources in Settings and sync.</p>
              ) : (
                <ul className="space-y-2 text-sm max-h-48 overflow-y-auto">
                  {syncHistory.slice(0, 12).map(job => (
                    <li key={job.id} className="flex items-start justify-between gap-2 border-b border-zinc-50 pb-2">
                      <div>
                        <p className="font-medium text-zinc-800">{job.adapterId}</p>
                        <p className="text-xs text-zinc-500">
                          {job.status} · {job.signalsCreated} signal{job.signalsCreated === 1 ? '' : 's'}
                          {job.error ? ` · ${job.error}` : ''}
                        </p>
                      </div>
                      <span className="text-xs text-zinc-400 shrink-0">
                        {formatSignalTimestamp(job.completedAt ?? job.startedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 h-fit sticky top-4">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4">Signal detail</h2>
            {selected ? (
              <SignalDetail
                signal={selected}
                onProcess={() => processSignalById(selected.id)}
              />
            ) : (
              <p className="text-sm text-zinc-400">Select a signal to view details.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function SignalRow({
  signal, selected, onSelect,
}: {
  signal: Signal
  selected: boolean
  onSelect: () => void
}) {
  const synced = signal.metadata?.synced === true
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`w-full text-left px-5 py-3 hover:bg-zinc-50 transition-colors ${selected ? 'bg-sky-50' : ''}`}
      >
        <div className="flex items-start gap-2">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase w-16 shrink-0 pt-0.5">
            {SIGNAL_SOURCE_LABEL[signal.source]}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-900 truncate">{signal.title}</p>
            <p className="text-xs text-zinc-500 truncate">{signal.content}</p>
          </div>
          {synced && (
            <span className="text-[10px] text-sky-600 font-medium shrink-0">Synced</span>
          )}
          {signal.processed && (
            <span className="text-[10px] text-emerald-600 font-medium shrink-0">Processed</span>
          )}
        </div>
      </button>
    </li>
  )
}

function SignalDetail({ signal, onProcess }: { signal: Signal; onProcess: () => void }) {
  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="text-[10px] font-semibold text-zinc-400 uppercase">Title</p>
        <p className="font-medium text-zinc-900">{signal.title}</p>
      </div>
      <div>
        <p className="text-[10px] font-semibold text-zinc-400 uppercase">Content</p>
        <p className="text-zinc-700">{signal.content}</p>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div><dt className="text-zinc-400">Source</dt><dd className="font-medium">{SIGNAL_SOURCE_LABEL[signal.source]}</dd></div>
        <div><dt className="text-zinc-400">Type</dt><dd className="font-medium">{SIGNAL_TYPE_LABEL[signal.type]}</dd></div>
        <div><dt className="text-zinc-400">Confidence</dt><dd className="font-medium">{signal.confidence}</dd></div>
        <div><dt className="text-zinc-400">Processed</dt><dd className="font-medium">{signal.processed ? 'Yes' : 'No'}</dd></div>
      </dl>
      <p className="text-xs text-zinc-400">
        {formatSignalTimestamp(signal.timestamp)}
      </p>
      {!signal.processed && (
        <button
          type="button"
          onClick={onProcess}
          className="w-full py-2 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700"
        >
          Process signal → memory
        </button>
      )}
      {signal.relatedMemoryIds.length > 0 && (
        <p className="text-xs text-emerald-700">
          {signal.relatedMemoryIds.length} linked memor{signal.relatedMemoryIds.length === 1 ? 'y' : 'ies'}
        </p>
      )}
    </div>
  )
}
