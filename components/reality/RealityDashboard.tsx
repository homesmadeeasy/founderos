'use client'

import { useMemo, useState } from 'react'
import { useReality } from '@/contexts/RealityContext'
import { formatConfidencePercent } from '@/lib/reality/RealityConfidence'
import { REALITY_DOMAIN_LABELS, type RealityDomain, type RealityTimelineItem } from '@/lib/reality/RealityTypes'

const SPECIALIST_FILTERS: { id: string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'gym', label: 'Gym' },
  { id: 'founder', label: 'Founder' },
  { id: 'school', label: 'School' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'health', label: 'Health' },
  { id: 'memory', label: 'Memory' },
]

function AssumptionBadge({ item }: { item: RealityTimelineItem }) {
  if (!item.isAssumption) return null
  return (
    <span className="text-[10px] uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-1.5 py-0.5">
      Estimate
    </span>
  )
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-400">{label}</p>
      <p className="text-sm font-semibold text-zinc-900 mt-1 truncate">{value}</p>
      {hint && <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{hint}</p>}
    </div>
  )
}

export default function RealityDashboard() {
  const {
    ready,
    snapshot,
    getToday,
    getTimeline,
    getRecentEvents,
    store,
  } = useReality()
  const [filter, setFilter] = useState('all')
  const specialistId = filter === 'all' ? undefined : filter

  const today = useMemo(() => getToday(specialistId), [getToday, specialistId])
  const week = useMemo(() => getTimeline(specialistId).slice(0, 7), [getTimeline, specialistId])
  const recent = useMemo(() => getRecentEvents(12, specialistId), [getRecentEvents, specialistId])
  const viewSnapshot = useMemo(() => {
    if (!specialistId) return snapshot
    // Recompute via store-backed helpers already used above; use global snapshot fields filtered loosely.
    return {
      ...snapshot,
      currentProjects: snapshot.currentProjects.filter(p => !specialistId || p.domain === specialistId),
      risks: snapshot.risks.filter(r => !specialistId || r.domain === specialistId),
      outstandingTasks: snapshot.outstandingTasks.filter(t => !specialistId || t.domain === specialistId),
      recentWins: snapshot.recentWins.filter(w => !specialistId || w.domain === specialistId),
    }
  }, [snapshot, specialistId])

  if (!ready) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 text-sm text-zinc-500">
        Loading Reality…
      </div>
    )
  }

  const biggestWin = viewSnapshot.recentWins[0]
  const topRisk = viewSnapshot.risks[0]

  return (
    <div className="relative min-h-full">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 10% -10%, rgba(16,185,129,0.12), transparent 55%), radial-gradient(ellipse 60% 40% at 90% 0%, rgba(59,130,246,0.08), transparent 50%), linear-gradient(180deg, #fafafa 0%, #f4f4f5 100%)',
        }}
      />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <header className="space-y-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-700/80">FounderOS Reality</p>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-900">
            What is happening now
          </h1>
          <p className="text-sm text-zinc-600 max-w-2xl">
            Live operating state for every specialist — today, momentum, risks, and a unified timeline.
            Inferred items are marked as estimates, never presented as hard facts.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {SPECIALIST_FILTERS.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`min-h-11 px-3 rounded-xl text-sm border transition ${
                  filter === f.id
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'bg-white/70 border-zinc-200 text-zinc-700 hover:border-zinc-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </header>

        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-zinc-200/80 bg-white/70 backdrop-blur-xl p-4">
            <Metric
              label="Today"
              value={`${viewSnapshot.eventCountToday} items`}
              hint={today?.items[0]?.title ?? 'No events yet today'}
            />
          </div>
          <div className="rounded-2xl border border-zinc-200/80 bg-white/70 backdrop-blur-xl p-4">
            <Metric
              label="This week"
              value={`${viewSnapshot.eventCountWeek} items`}
              hint={viewSnapshot.habits[0]}
            />
          </div>
          <div className="rounded-2xl border border-zinc-200/80 bg-white/70 backdrop-blur-xl p-4">
            <Metric
              label="Momentum"
              value={`${viewSnapshot.momentum.label} · ${Math.round(viewSnapshot.momentum.score * 100)}%`}
              hint={`${formatConfidencePercent(viewSnapshot.momentum.confidence)} confidence · ${viewSnapshot.momentum.note}`}
            />
          </div>
          <div className="rounded-2xl border border-zinc-200/80 bg-white/70 backdrop-blur-xl p-4">
            <Metric
              label="Biggest win"
              value={biggestWin?.label ?? 'No wins logged'}
              hint={biggestWin ? REALITY_DOMAIN_LABELS[biggestWin.domain] : undefined}
            />
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-zinc-900">Current focus</h2>
            {viewSnapshot.currentProjects.length === 0 ? (
              <p className="text-sm text-zinc-500">No strong focus signals yet.</p>
            ) : (
              <ul className="space-y-2">
                {viewSnapshot.currentProjects.map(item => (
                  <li key={item.id} className="rounded-2xl border border-zinc-200/80 bg-white/70 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-400">
                      {REALITY_DOMAIN_LABELS[item.domain as RealityDomain] ?? item.domain}
                    </p>
                    <p className="text-sm font-medium text-zinc-900 mt-1">{item.label}</p>
                    <p className="text-xs text-zinc-500 mt-1">{item.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-zinc-900">Current risks</h2>
            {!topRisk ? (
              <p className="text-sm text-zinc-500">No risks flagged from recent events.</p>
            ) : (
              <ul className="space-y-2">
                {viewSnapshot.risks.map(risk => (
                  <li key={risk.id} className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                    <p className="text-sm font-medium text-zinc-900">{risk.label}</p>
                    <p className="text-xs text-zinc-600 mt-1">{risk.reason}</p>
                  </li>
                ))}
              </ul>
            )}

            <h2 className="text-sm font-semibold text-zinc-900 pt-4">Outstanding actions</h2>
            {viewSnapshot.outstandingTasks.length === 0 ? (
              <p className="text-sm text-zinc-500">No open actions in Reality yet.</p>
            ) : (
              <ul className="space-y-2">
                {viewSnapshot.outstandingTasks.map(task => (
                  <li key={task.id} className="rounded-xl border border-zinc-200 bg-white/70 px-4 py-3 text-sm text-zinc-800">
                    {task.label}
                    {task.dueHint && (
                      <span className="block text-xs text-zinc-500 mt-0.5">Due {task.dueHint}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-900">Latest events</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Reality is empty. Events will appear as Gym, Founder, tasks, and other specialists publish activity.
            </p>
          ) : (
            <ul className="space-y-2">
              {recent.map(item => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white/70 p-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-400">
                        {REALITY_DOMAIN_LABELS[item.domain]} · {item.eventType}
                      </p>
                      <AssumptionBadge item={item} />
                    </div>
                    <p className="text-sm font-medium text-zinc-900 mt-1">{item.title}</p>
                    {item.summary && <p className="text-xs text-zinc-500 mt-1">{item.summary}</p>}
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                    {formatConfidencePercent(item.confidence)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">Timeline</h2>
          {week.length === 0 ? (
            <p className="text-sm text-zinc-500">No timeline days yet.</p>
          ) : (
            week.map(day => (
              <div key={day.date} className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  {day.label}
                </h3>
                <ol className="relative border-l border-zinc-200 ml-2 space-y-3 pl-4">
                  {day.items.map(item => (
                    <li key={item.id} className="relative">
                      <span className="absolute -left-[1.3rem] top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500/80 ring-4 ring-zinc-50" />
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm text-zinc-900">{item.title}</p>
                        <AssumptionBadge item={item} />
                        {item.kind === 'aggregation' && (
                          <span className="text-[10px] uppercase tracking-wider text-sky-800 bg-sky-50 border border-sky-100 rounded-md px-1.5 py-0.5">
                            Summary
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {REALITY_DOMAIN_LABELS[item.domain]}
                        {item.summary ? ` · ${item.summary}` : ''}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            ))
          )}
        </section>

        <p className="text-xs text-zinc-400 pb-8">
          {store.events.length} raw events · {store.aggregations.length} aggregations · last updated{' '}
          {new Date(store.updatedAt).toLocaleString()}
        </p>
      </div>
    </div>
  )
}
