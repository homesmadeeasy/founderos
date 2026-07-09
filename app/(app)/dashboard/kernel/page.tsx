'use client'

import Link from 'next/link'
import { Activity, ArrowLeft } from 'lucide-react'
import { useFounderKernel } from '@/contexts/FounderKernelContext'
import { EVENT_TYPE_LABELS } from '@/lib/founder-kernel/kernelEvents'

export default function KernelDebugPage() {
  const { history, lastExecution, refreshTick } = useFounderKernel()

  return (
    <div className="min-h-full bg-zinc-50/80">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <header>
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 mb-3">
            <ArrowLeft size={12} /> Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <Activity size={24} className="text-emerald-600" />
            Kernel Debug
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Event bus orchestration — last refresh tick {refreshTick}
          </p>
        </header>

        {lastExecution && (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 space-y-2">
            <h2 className="text-sm font-semibold text-emerald-900 uppercase tracking-wider">Last execution</h2>
            <p className="text-sm text-emerald-900">
              {EVENT_TYPE_LABELS[lastExecution.eventType]} · {lastExecution.durationMs}ms ·
              {lastExecution.subscriberCount} subscribers ·
              {lastExecution.success ? ' success' : ` ${lastExecution.failureCount} failure(s)`}
            </p>
            {lastExecution.subscriberResults.length > 0 && (
              <ul className="text-xs text-emerald-800 space-y-1">
                {lastExecution.subscriberResults.map(r => (
                  <li key={r.subscriberId}>
                    {r.subscriberName}: {r.status} ({r.durationMs}ms){r.error ? ` — ${r.error}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-3">Recent events</h2>
          {history.length === 0 ? (
            <p className="text-sm text-zinc-400">No kernel events yet. Capture something or open Morning to generate events.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-zinc-400 border-b border-zinc-100">
                    <th className="py-2 pr-3">Time</th>
                    <th className="py-2 pr-3">Event</th>
                    <th className="py-2 pr-3">Source</th>
                    <th className="py-2 pr-3">Subs</th>
                    <th className="py-2 pr-3">Duration</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2">Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(entry => (
                    <tr key={entry.id} className="border-b border-zinc-50">
                      <td className="py-2 pr-3 text-zinc-500 whitespace-nowrap">{entry.timestamp.slice(11, 19)}</td>
                      <td className="py-2 pr-3 font-medium text-zinc-800">{EVENT_TYPE_LABELS[entry.eventType]}</td>
                      <td className="py-2 pr-3 text-zinc-600">{entry.source}</td>
                      <td className="py-2 pr-3">{entry.subscriberCount}</td>
                      <td className="py-2 pr-3">{entry.durationMs}ms</td>
                      <td className="py-2 pr-3">
                        <span className={entry.success ? 'text-emerald-700' : 'text-red-600'}>
                          {entry.success ? 'ok' : `${entry.failureCount} fail`}
                        </span>
                      </td>
                      <td className="py-2 text-zinc-500">{entry.payloadSummary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
