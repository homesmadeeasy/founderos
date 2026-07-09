'use client'

import { RefreshCw, Radio, Link2, Unlink, Loader2 } from 'lucide-react'
import { useSyncEngine } from '@/contexts/SyncEngineContext'
import type { AdapterConnectionState } from '@/lib/source-adapters/adapterTypes'
import { isSyncableStatus } from '@/lib/source-adapters/adapterRegistry'
import { formatSignalTimestamp } from '@/lib/signal-engine/signalFormat'

function statusLabel(status: AdapterConnectionState['status']): string {
  switch (status) {
    case 'mock': return 'Mock connected'
    case 'connected': return 'Connected'
    case 'error': return 'Error'
    default: return 'Disconnected'
  }
}

function statusColor(status: AdapterConnectionState['status']): string {
  switch (status) {
    case 'mock': return 'text-sky-700 bg-sky-50 border-sky-200'
    case 'connected': return 'text-emerald-700 bg-emerald-50 border-emerald-200'
    case 'error': return 'text-red-700 bg-red-50 border-red-200'
    default: return 'text-zinc-500 bg-zinc-50 border-zinc-200'
  }
}

export default function ConnectedSourcesSection() {
  const {
    adapterCards,
    adapters,
    syncing,
    connectMock,
    disconnect,
    syncNow,
  } = useSyncEngine()

  function statesForCard(adapterIds: string[]): AdapterConnectionState[] {
    return adapterIds.map(id => adapters.find(a => a.adapterId === id) ?? { adapterId: id, status: 'disconnected' })
  }

  function cardStatus(adapterIds: string[]): AdapterConnectionState['status'] {
    const states = statesForCard(adapterIds)
    if (states.some(s => s.status === 'error')) return 'error'
    if (states.some(s => isSyncableStatus(s.status))) return 'mock'
    return 'disconnected'
  }

  function lastSynced(adapterIds: string[]): string {
    const times = statesForCard(adapterIds)
      .map(s => s.lastSyncedAt)
      .filter(Boolean) as string[]
    if (times.length === 0) return 'Never'
    const latest = times.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
    return formatSignalTimestamp(latest)
  }

  return (
    <section className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-sky-100 text-sky-600">
            <Radio size={15} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Connected Sources</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Mock adapters — no OAuth required yet</p>
          </div>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 gap-4">
        {adapterCards.map(card => {
          const status = cardStatus(card.adapterIds)
          const connected = isSyncableStatus(status)

          return (
            <div key={card.id} className="rounded-xl border border-zinc-100 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">{card.name}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">{card.description}</p>
                </div>
                <span className={`text-[10px] font-semibold uppercase px-2 py-1 rounded-full border shrink-0 ${statusColor(status)}`}>
                  {statusLabel(status)}
                </span>
              </div>

              <p className="text-xs text-zinc-400">
                Last synced: {lastSynced(card.adapterIds)}
              </p>

              <div className="flex flex-wrap gap-2">
                {!connected ? (
                  card.adapterIds.map(id => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => connectMock(id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800"
                    >
                      <Link2 size={12} />
                      Connect mock ({id})
                    </button>
                  ))
                ) : (
                  <>
                    {card.adapterIds.map(id => (
                      <button
                        key={`sync-${id}`}
                        type="button"
                        disabled={syncing}
                        onClick={() => void syncNow(id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 disabled:opacity-50"
                      >
                        {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        Sync {id}
                      </button>
                    ))}
                    {card.adapterIds.map(id => (
                      <button
                        key={`disc-${id}`}
                        type="button"
                        onClick={() => disconnect(id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 text-xs font-semibold hover:bg-zinc-50"
                      >
                        <Unlink size={12} />
                        Disconnect {id}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
